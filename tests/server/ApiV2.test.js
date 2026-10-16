// Ports of ApiV2Test#testInvalidRequest and #testInvalidJsonRequest (SRV-0090, 0097) plus /v2/check input validation.
import { describe, it, expect } from 'vitest';
import { ApiV2 } from '../../src/server/ApiV2.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { PathNotFoundException } from '../../src/server/exceptions.js';
import { BadRequestException } from '../../src/server/BadRequestException.js';

const fakeExchange = { getResponseHeaders: () => ({ set() {} }), sendResponseHeaders() {}, write() {} };

describe('ApiV2', () => {
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
