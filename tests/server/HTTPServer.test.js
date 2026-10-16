// In-process HTTP server: start/stop output, dispatch order and texts (SRV-0016, 0020, 0070..0074, 0080, 0090, 0091), parameter parsing (SRV-0072/0073), /v2/check flow (SRV-0097, 0110, 0140, 0142).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import net from 'node:net';
import { HTTPServer } from '../../src/server/HTTPServer.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';

const RULES = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,UPPERCASE_SENTENCE_START,WHITESPACE_RULE';
const freePort = () => new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function start(args) {
  const port = await freePort();
  const lines = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((c) => { lines.push(String(c)); return true; });
  const server = await HTTPServer.create(new HTTPServerConfig(['--port', String(port), ...args]));
  server.run();
  spy.mockRestore();
  return { server, base: `http://127.0.0.1:${port}`, lines, port };
}

const text = async (r) => ({ status: r.status, ct: (r.headers.get('content-type') ?? ''), body: await r.text() });

describe('HTTPServer', () => {
  let s;
  beforeAll(async () => { s = await start(['--allow-origin', 'https://a.example']); });
  afterAll(async () => { await s.server.stop(); });

  it('startup lines', () => {
    const l = s.lines.map((x) => x.replace(/^\S+ \S+ \S+ /, ''));
    expect(l[0]).toBe('Setting up thread pool with 10 threads\n');
    expect(l[1]).toMatch(new RegExp(`^Starting LanguageTool .* server on http://localhost:${s.port}\\.\\.\\.\\n$`));
    expect(l[2]).toBe('Server started\n');
    expect(s.server.isRunning()).toBe(true);
  });

  it('dispatch texts', async () => {
    const api = 'https://languagetool.org/http-api/swagger-ui/#/default';
    const t = async (p, init) => text(await fetch(s.base + p, init));
    expect(await t('/')).toMatchObject({ status: 400, body: `Error: Missing arguments for LanguageTool API. Please see ${api}` });
    expect(await t('/Languages')).toMatchObject({ status: 400, body: `Error: You're using an old version of our API that's not supported anymore. Please see ${api}` });
    expect(await t('/x/v2/check')).toMatchObject({ status: 400, body: "Error: You have '/v2/' in your path, but not at the root. Try an URL like 'http://server/v2/...' " });
    expect(await t('/foo')).toMatchObject({ status: 400, body: `Error: This is the LanguageTool API. You have not specified any parameters. Please see ${api}` });
    expect(await t('/favicon.ico')).toMatchObject({ status: 404, body: 'Not found' });
    expect(await t('/v2/foo')).toMatchObject({ status: 404, body: `Error: Unsupported action: 'foo'. Please see ${api}` });
    expect(await t('/v2/%63heck')).toMatchObject({ status: 404, body: `Error: Unsupported action: '%63heck'. Please see ${api}` });
    expect(await t('/v2/stop')).toMatchObject({ status: 404 });
    expect(await t('/v2/healthcheck')).toMatchObject({ status: 200, ct: 'text/plain', body: 'OK' });
    expect(await t('/v2/healthcheck', { method: 'HEAD' })).toMatchObject({ status: 200, body: '' });
    expect(await t('/v2/maxtextlength')).toMatchObject({ status: 200, ct: 'text/plain', body: '2147483647' });
  });

  it('error responses carry the allow-origin header and no content type', async () => {
    const r = await fetch(`${s.base}/foo`);
    expect(r.headers.get('access-control-allow-origin')).toBe('https://a.example');
    expect(r.headers.get('content-type')).toBeNull();
  });

  it('bad request URI (JDK HttpServer)', async () => {
    const r = await fetch(`${s.base}/v2/check?language=en-US&text=%ZZ`);
    expect(await text(r)).toEqual({ status: 400, ct: 'text/html', body: '<h1>400 Bad Request</h1>Bad request URI' });
  });

  it('parameter parsing errors', async () => {
    const post = async (body, q = '') => text(await fetch(`${s.base}/v2/check${q}`, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
    expect(await post('language=en-US&text=100%+sure')).toMatchObject({ status: 400, body: 'Error: Could not decode query. Query length: 29 Request method: POST' });
    expect(await post('%ZZ=1&language=en-US&text=x')).toMatchObject({ status: 500, body: 'Error: Internal Error: URLDecoder: Illegal hex characters in escape (%) pattern - Error at index 0 in: "ZZ"' });
    expect(await post('%=1')).toMatchObject({ status: 500, body: 'Error: Internal Error: URLDecoder: Incomplete trailing escape (%) pattern' });
    expect(await post('justtext')).toMatchObject({ status: 400, body: "Error: Missing 'text' or 'data' parameter" });
  });

  it('/v2/check validation order and flow', async () => {
    const post = async (params) => text(await fetch(`${s.base}/v2/check`, { method: 'POST', body: new URLSearchParams(params) }));
    expect(await post({ language: 'en-US' })).toMatchObject({ status: 400, body: "Error: Missing 'text' or 'data' parameter" });
    expect(await post({ text: 'x' })).toMatchObject({ status: 400, body: expect.stringContaining("Error: Missing 'language' parameter") });
    expect(await post({ text: 'x', language: 'en-US', enabled: 'A' })).toMatchObject({ status: 400, body: "Error: You specified 'enabled' but the parameter is now called 'enabledRules' in v2 of the API" });
    expect(await post({ text: 'x', language: 'xx' })).toMatchObject({ status: 400, body: expect.stringMatching(/^Error: 'xx' is not a language code known to LanguageTool\. Supported language codes are: .*\. The list of languages is read from /) });
    expect(await post({ text: 'x', language: 'en-US', enabledOnly: 'true' })).toMatchObject({ status: 400, body: 'Error: You must specify enabled rules or categories when using enabledOnly=true' });
    expect(await post({ text: 'x', language: 'en-US', enabledOnly: 'true', enabledRules: 'A', disabledRules: 'B' })).toMatchObject({ status: 400, body: 'Error: You cannot specify disabled rules or categories using enabledOnly=true' });
    expect(await post({ text: 'x', language: 'en-US', enabledRules: RULES, enabledOnly: 'true', c: 'abc' })).toMatchObject({ status: 500, body: 'Error: Internal Error: For input string: "abc"' });
    const ok = await post({ text: 'This is a test,, ok.', language: 'en-US', enabledRules: RULES, enabledOnly: 'true' });
    expect(ok.status).toBe(200);
    expect(ok.ct).toBe('application/json');
    const json = JSON.parse(ok.body);
    expect(json.matches.map((m) => m.rule.id)).toEqual(['DOUBLE_PUNCTUATION']);
    expect(json.language).toMatchObject({ code: 'en-US', detectedLanguage: { code: 'en-US' } });
  });

  it('JSONP callback', async () => {
    const r = await text(await fetch(`${s.base}/v2/check?callback=cb&language=en-US&text=Hi.&enabledRules=${RULES}&enabledOnly=true`));
    expect(r.body.startsWith('cb({"software"')).toBe(true);
    expect(r.body.endsWith(');')).toBe(true);
    const bad = await text(await fetch(`${s.base}/v2/check?callback=1&language=en-US&text=Hi.`));
    expect(bad).toMatchObject({ status: 400, body: "Error: 'callback' value must match [a-zA-Z]+: '1'" });
  });
});

describe('HTTPServer limits and stop', () => {
  it('text limits and the hard limit of the POST body', async () => {
    const dir = (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'ltjs-srv-'));
    const f = `${dir}/s.properties`;
    (await import('node:fs')).writeFileSync(f, 'maxTextLength=30\nmaxTextHardLength=40\n');
    const s = await start(['--config', f]);
    try {
      const post = async (params) => text(await fetch(`${s.base}/v2/check`, { method: 'POST', body: new URLSearchParams(params) }));
      expect(await post({ language: 'en-US', text: 'x'.repeat(41) })).toMatchObject({ status: 413, body: "Error: Your text exceeds the limit of 30 characters (it's 41 characters). Please submit a shorter text." });
      expect(await post({ language: 'en-US', text: `${'x'.repeat(4000)} ${'y'.repeat(100)}` })).toMatchObject({ status: 413, body: "Error: Your text's length exceeds this server's hard limit of 400 characters." });
      expect(await text(await fetch(`${s.base}/v2/maxtextlength`))).toMatchObject({ body: '30' });
    } finally {
      await s.server.stop();
    }
  });

  it('--stoppable: /v2/stop closes the connection without a response', async () => {
    const s = await start(['--stoppable']);
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await expect(fetch(`${s.base}/v2/stop`)).rejects.toThrow();
    await vi.waitFor(() => expect(s.server.isRunning()).toBe(false));
    expect(out.mock.calls.map((c) => c[0]).join('')).toContain('Server stopped');
    out.mockRestore();
  });

  it('unusable port -> PortBindingException wrapped by main', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    let e;
    try {
      await HTTPServer.main(['--port', '99999']);
    } catch (x) {
      e = x;
    }
    out.mockRestore();
    expect(e.toString()).toBe('java.lang.RuntimeException: Could not start LanguageTool HTTP server on localhost, port 99999');
    expect(e.getCause().toString()).toMatch(/^org\.languagetool\.server\.PortBindingException: LanguageTool HTTP server could not be started on host "localhost", port 99999\./);
    expect(e.getCause().getCause().toString()).toBe('java.lang.IllegalArgumentException: port out of range:99999');
  });
});
