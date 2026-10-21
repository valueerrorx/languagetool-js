// Ports of ApiV2Test#testInvalidRequest and #testInvalidJsonRequest (SRV-0090, 0097) plus /v2/check input validation.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { ApiV2 } from '../../src/server/ApiV2.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { PathNotFoundException } from '../../src/server/exceptions.js';
import { BadRequestException } from '../../src/server/BadRequestException.js';
import { AuthException } from '../../src/server/exceptions.js';
import { DatabaseAccess } from '../../src/server/DatabaseAccess.js';
import { IllegalStateException } from '../../src/lib/java/errors.js';
import { Headers } from '../../src/server/HttpExchange.js';

const fakeExchange = { getResponseHeaders: () => ({ set() {} }), sendResponseHeaders() {}, write() {}, getLocalAddressText: () => '/127.0.0.1:8081' };

// records the response like the JDK exchange (method and request headers are settable)
function exchange(method, requestHeaders = {}) {
  const e = { out: '', code: null, requestHeaders: new Headers(), responseHeaders: new Headers() };
  for (const [k, v] of Object.entries(requestHeaders)) e.requestHeaders.add(k, v);
  e.getRequestMethod = () => method;
  e.getRequestHeaders = () => e.requestHeaders;
  e.getResponseHeaders = () => e.responseHeaders;
  e.sendResponseHeaders = (c) => { e.code = c; };
  e.write = (b) => { e.out += Buffer.from(b).toString('utf8'); };
  return e;
}

describe('ApiV2', () => {
  // Java: ApiV2Test#testLanguages (name count: only the in-scope languages exist, DEV-006)
  it('testLanguages', () => {
    const json = new ApiV2(null, null).getLanguages();
    expect(json).toContain('"German (Germany)"');
    expect(json).toContain('"de"');
    expect(json).toContain('"de-DE"');
    expect(json).toContain('"fr"');
    expect(json).toContain('"fr-FR"');
    expect(json.split('"name"').length - 1).toBeGreaterThanOrEqual(13);
  });

  it('maxtextlength, info and languages responses', async () => {
    const api = new ApiV2(null, '*');
    const cfg = new HTTPServerConfig();
    const e1 = exchange('GET');
    await api.handleRequest('maxtextlength', e1, new Map(), null, null, cfg);
    expect(e1.out).toBe(String(cfg.getMaxTextLengthAnonymous()));
    expect(e1.responseHeaders.getFirst('Access-Control-Allow-Origin')).toBe('*');
    const e2 = exchange('GET');
    await api.handleRequest('info', e2, new Map(), null, null, cfg);
    expect(JSON.parse(e2.out).software).toMatchObject({ name: 'LanguageTool', premium: false });
    const e3 = exchange('GET');
    await api.handleRequest('languages', e3, new Map(), null, null, cfg);
    expect(JSON.parse(e3.out)[0]).toEqual({ name: 'German', code: 'de', longCode: 'de' });
  });

  it('configinfo', async () => {
    const api = new ApiV2({ config: new HTTPServerConfig() }, null);
    const run = (m) => api.handleRequest('configinfo', exchange('GET'), new Map(Object.entries(m)), null, null, new HTTPServerConfig());
    await expect(run({})).rejects.toThrow("'language' parameter missing");
    await expect(run({ language: 'xx-yy' })).rejects.toThrow("'xx-yy' is not a language code known to LanguageTool.");
    const e = exchange('GET');
    await api.handleRequest('configinfo', e, new Map([['language', 'en-US']]), null, null, new HTTPServerConfig());
    const json = JSON.parse(e.out);
    expect(json.parameter.maxTextLength).toBe(new HTTPServerConfig().getMaxTextHardLength());
    expect(json.rules.length).toBeGreaterThan(100);
  });

  describe('endpoints without database', () => {
    const api = new ApiV2(null, null);
    const cfg = new HTTPServerConfig();
    const call = (path, method, params = {}, headers = {}) => {
      const e = exchange(method, headers);
      return api.handleRequest(path, e, new Map(Object.entries(params)), null, null, cfg).then(() => e);
    };

    it('need DatabaseAccess.init()', async () => {
      DatabaseAccess.reset();
      await expect(call('words', 'GET', { username: 'u', apiKey: 'k' })).rejects.toBeInstanceOf(IllegalStateException);
      DatabaseAccess.init(cfg);
    });

    it('words, words/add, words/delete, admin/refreshUser', async () => {
      DatabaseAccess.init(cfg);
      await expect(call('words', 'POST')).rejects.toThrow('/words needs to be called with GET');
      await expect(call('words/add', 'GET')).rejects.toThrow('/words/add needs to be called with POST');
      await expect(call('words/delete', 'GET')).rejects.toThrow('/words/delete needs to be called with POST');
      await expect(call('admin/refreshUser', 'GET')).rejects.toThrow('/admin/refreshUser needs to be called with POST');
      await expect(call('words', 'GET')).rejects.toThrow('This end point needs a user id');
      await expect(call('words', 'get', { username: 'u', apiKey: 'k' })).rejects.toBeInstanceOf(AuthException);
      await expect(call('words', 'GET', { username: ' ', apiKey: 'k' })).rejects.toThrow('username must be set');
      await expect(call('words', 'GET', { username: 'u', apiKey: ' ' })).rejects.toThrow('apiKey must be set');
      await expect(call('words/add', 'POST', { username: 'u', password: 'p' })).rejects.toThrow('This server does not support username/password');
    });

    it('premiumAlways reaches the DB-less access', async () => {
      const c = new HTTPServerConfig();
      c.premiumAlways = true;
      const run = (path, method, params = {}) => {
        const e = exchange(method);
        return api.handleRequest(path, e, new Map(Object.entries(params)), null, null, c).then(() => e.out);
      };
      expect(await run('words', 'GET')).toBe('{"words":[]}');
      expect(await run('words/add', 'POST', { word: 'abc' })).toBe('{"added":false}');
      expect(await run('words/add', 'POST', { mode: 'batch', words: 'a b' })).toBe('{"added":true}');
      expect(await run('words/delete', 'POST', { word: 'abc' })).toBe('{"deleted":false}');
      expect(await run('admin/refreshUser', 'POST')).toBe('{"success":false}');
      await expect(run('words/add', 'POST', { word: ' ' })).rejects.toThrow('Invalid word, cannot be empty or whitespace only');
      await expect(run('words/add', 'POST', { word: 'a b' })).rejects.toThrow("Invalid word, you can only add words that don't contain spaces: 'a b'");
      await expect(run('words/add', 'POST', { mode: 'batch' })).rejects.toThrow(/NullPointer|null/);
      await expect(run('words', 'GET', { dict: 'x' })).rejects.toThrow("Use parameter 'dicts', not 'dict' in GET /words API method.");
    });

    it('users/me', async () => {
      DatabaseAccess.init(cfg);
      const o = await call('users/me', 'OPTIONS', {}, { 'Access-Control-Request-Headers': 'x-a' });
      expect(o.code).toBe(204);
      expect(o.responseHeaders.getFirst('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(o.responseHeaders.getFirst('Access-Control-Allow-Headers')).toBe('x-a');
      await expect(call('users/me', 'POST')).rejects.toThrow('/users/me needs to be called with GET');
      await expect(call('users/me', 'GET')).rejects.toThrow('Expected Basic Authentication');
      const auth = { Authorization: `Basic ${Buffer.from('u:p').toString('base64')}` };
      await expect(call('users/me', 'GET', { authMethod: 'x' }, auth)).rejects.toThrow('Unknown authMethod: x');
      await expect(call('users/me', 'GET', {}, auth)).rejects.toThrow('This server does not support username/password');
      await expect(call('users/me', 'GET', { authMethod: 'apiKey' }, auth)).rejects.toBeInstanceOf(AuthException);
      await expect(call('users/me', 'GET', {}, { Authorization: 'Basic ***' })).rejects.toThrow('Illegal base64 character 2a');
    });
  });

  it('testInvalidRequest', async () => {
    const apiV2 = new ApiV2(null, null);
    await expect(apiV2.handleRequest('unknown', fakeExchange, null, null, null, new HTTPServerConfig())).rejects.toBeInstanceOf(PathNotFoundException);
    await expect(apiV2.handleRequest('unknown', fakeExchange, null, null, null, new HTTPServerConfig()))
      .rejects.toThrow("Unsupported action: 'unknown'. Please see https://languagetool.org/http-api/swagger-ui/#/default");
  });

  it('testInvalidJsonRequest', async () => {
    const apiV2 = new ApiV2({ checkText: async () => {} }, null);
    const params = new Map([['data', '{"annotation":{"text": "A "}]}']]);
    await expect(apiV2.handleRequest('check', fakeExchange, params, null, null, new HTTPServerConfig())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('text/data input errors', async () => {
    const apiV2 = new ApiV2({ checkText: async () => {} }, null);
    const run = (m) => apiV2.handleRequest('check', fakeExchange, new Map(Object.entries(m)), null, null, new HTTPServerConfig());
    await expect(run({ text: 'a', data: '{}' })).rejects.toThrow("Set only 'text' or 'data' parameter, not both");
    await expect(run({})).rejects.toThrow("Missing 'text' or 'data' parameter");
    await expect(run({ data: 'not json' })).rejects.toThrow("Could not parse JSON from 'data' parameter");
    await expect(run({ data: '{}' })).rejects.toThrow("'data' key in JSON requires 'text' or 'annotation' key");
    await expect(run({ data: '' })).rejects.toThrow("'data' key in JSON requires 'text' or 'annotation' key");
    await expect(run({ data: '{"text":"a","annotation":[]}' })).rejects.toThrow("'data' key in JSON requires either 'text' or 'annotation' key, not both");
    await expect(run({ data: '{"annotation":[{"text":"a","markup":"b"}]}' })).rejects.toThrow('not both: {"text":"a","markup":"b"}');
    await expect(run({ data: '{"annotation":[{"text":"a","interpretAs":"b"}]}' })).rejects.toThrow("'text' cannot be used with 'interpretAs' (only 'markup' can): ");
    await expect(run({ data: '{"annotation":[{"x":1}]}' })).rejects.toThrow("Only 'text' and 'markup' are supported in 'annotation' list: {\"x\":1}");
  });

  it('valid data reaches the checker (trailing content after the first JSON value is ignored)', async () => {
    const seen = [];
    const apiV2 = new ApiV2({ checkText: async (aText) => seen.push(aText.getPlainText()) }, null);
    const run = (m) => apiV2.handleRequest('check', fakeExchange, new Map(Object.entries(m)), null, null, new HTTPServerConfig());
    await run({ data: '{"text":"Hello"} trailing garbage' });
    await run({ data: '{"annotation":[{"text":"A "},{"markup":"<b>"},{"text":"b"}]}' });
    await run({ text: '__logIPNowForLanguageTool__' }); // log-my-IP text: no check
    expect(seen).toEqual(['Hello', 'A b']);
  });
});
