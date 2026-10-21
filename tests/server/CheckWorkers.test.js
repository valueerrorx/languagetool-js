// Text checker pool on worker threads (no Java test): timeouts, queue limits, error mapping and equality with the in-thread backend.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'node:net';
import { HTTPServer } from '../../src/server/HTTPServer.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';

const freePort = () => new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function start(backend, args) {
  const port = await freePort();
  const previous = process.env.LTJS_CHECK_BACKEND;
  process.env.LTJS_CHECK_BACKEND = backend;
  process.env.LTJS_MAX_WORKERS = '2';
  try {
    const server = await HTTPServer.create(new HTTPServerConfig(['--port', String(port), ...args]));
    server.run();
    return { server, base: `http://127.0.0.1:${port}` };
  } finally {
    process.env.LTJS_CHECK_BACKEND = previous;
  }
}

const check = async (base, params) => {
  const r = await fetch(`${base}/v2/check`, { method: 'POST', body: new URLSearchParams({ language: 'en-US', ...params }) });
  return { status: r.status, body: await r.text() };
};
const TEXT = 'This is a test,, ok. The the cat sat on teh mat.';
const normalize = (b) => b.replace(/"buildDate":"[^"]*"/, '"buildDate":"x"');

describe('check workers', () => {
  let workers;
  let inline;
  beforeAll(async () => {
    workers = await start('worker', []);
    inline = await start('inline', []);
  }, 120000);
  afterAll(async () => {
    await workers.server.stop();
    await inline.server.stop();
  });

  it('worker results equal in-thread results', async () => {
    for (const params of [{ text: TEXT }, { text: TEXT, level: 'picky', enabledRules: 'ENGLISH_WORD_REPEAT_RULE' }, { text: TEXT, mode: 'textLevelOnly' },
      { data: JSON.stringify({ annotation: [{ text: 'This is ' }, { markup: '<b>' }, { text: 'a test,, ok.' }, { markup: '</b>' }] }) }]) {
      const a = await check(workers.base, params);
      const b = await check(inline.base, params);
      expect(a.status).toBe(200);
      expect(normalize(a.body)).toBe(normalize(b.body));
    }
  }, 120000);

  it('errors of a worker are mapped like errors of the pool thread', async () => {
    const r = await check(workers.base, { text: TEXT, sourceText: 'x' });
    expect(r).toEqual({ status: 400, body: "Error: org.languagetool.server.BadRequestException: 'sourceLanguage' parameter missing - must be set when 'sourceText' is set, detected: en-US" });
  }, 120000);
});

describe('check workers: limits', () => {
  it('timeouts cancel the task; allowIncompleteResults returns an empty result', async () => {
    const s = await start('worker', ['--config', '/dev/null']);
    try {
      s.server.httpHandler.config.maxCheckTimeMillisAnonymous = 0;
      const a = await check(s.base, { text: TEXT });
      expect(a.status).toBe(500);
      expect(a.body).toBe("Error: Checking took longer than 0.0 seconds, which is this server's limit. Please make sure you have selected the proper language or consider submitting a shorter text.");
      const b = await check(s.base, { text: TEXT, allowIncompleteResults: 'true' });
      expect(b.status).toBe(200);
      expect(JSON.parse(b.body).warnings).toEqual({ incompleteResults: true, incompleteResultsReason: 'Results are incomplete: text checking took longer than allowed maximum of 0.00 seconds' });
    } finally {
      await s.server.stop();
    }
  }, 120000);

  it('a full queue answers 503 Server overloaded', async () => {
    const s = await start('worker', []);
    try {
      const tc = s.server.httpHandler.textCheckerV2;
      await check(s.base, { text: 'Warm up.' });
      // one thread and no queue: the second concurrent request is refused
      tc.executorService.corePoolSize = 1;
      tc.executorService.maximumPoolSize = 1;
      tc.executorService.workQueue.capacity = 0;
      const slow = 'The quick brown fox jumps over the lazy dog near the river bank. '.repeat(400);
      const first = check(s.base, { text: slow });
      await new Promise((r) => setTimeout(r, 300));
      const second = await check(s.base, { text: 'After.' });
      expect(second).toEqual({ status: 503, body: 'Error: Server overloaded, please try again later' });
      expect((await first).status).toBe(200);
    } finally {
      await s.server.stop();
    }
  }, 120000);
});
