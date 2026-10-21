// Port of PipelinePoolTest (the interactive prewarming test and the database test are not ported); Mockito spies become call counters.
// The Java class is @Ignore'd: its expected UserConfig is new UserConfig() (filterDictionaryMatches=false, trustedSource=false) while checkText builds filterDictionaryMatches=true, trustedSource=true, so the expected settings use that user config here.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { GlobalConfig } from '../../src/core/rules/model/GlobalConfig.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { Level, Mode } from '../../src/core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { V2TextChecker } from '../../src/server/TextChecker.js';
import { QueryParams } from '../../src/server/QueryParams.js';
import { PipelineSettings } from '../../src/server/PipelineSettings.js';
import { Pipeline, IllegalPipelineMutationException } from '../../src/server/Pipeline.js';
import { Headers } from '../../src/server/HttpExchange.js';

// Java: FakeHttpExchange
function fakeExchange() {
  const e = { out: '', requestHeaders: new Headers(), responseHeaders: new Headers() };
  e.getRequestHeaders = () => e.requestHeaders;
  e.getResponseHeaders = () => e.responseHeaders;
  e.sendResponseHeaders = () => {};
  e.write = (b) => { e.out += Buffer.from(b).toString('utf8'); };
  return e;
}
const text = (t) => new AnnotatedTextBuilder().addText(t).build();
const gConfig = new GlobalConfig();
const newUser = () => new UserConfig([], [], new Map(), 0, null, null, null, null, true, null, null, false, [], true, false, false, UserConfig.TokenType.NO_TOKEN);

// Mockito spy(pool): records the arguments of getPipeline/returnPipeline
function spy(pool) {
  const gets = [];
  const returns = [];
  const get = pool.getPipeline.bind(pool);
  const ret = pool.returnPipeline.bind(pool);
  pool.getPipeline = (s) => { gets.push(s); return get(s); };
  pool.returnPipeline = (s, p) => { returns.push([s, p]); return ret(s, p); };
  return {
    gets,
    getCount: (s) => gets.filter((x) => x.equals(s)).length,
    returnCount: (s) => returns.filter(([x, p]) => x.equals(s) && p !== null).length,
  };
}
const queryParams = (disabledRules = [], useQuerySettings = false) => new QueryParams([], [], disabledRules, [], [], false, useQuerySettings, false, false, false, false, Mode.ALL, Level.DEFAULT, null, null);
const newChecker = (size) => {
  const config1 = new HTTPServerConfig(8081);
  config1.setPipelineCaching(true);
  config1.setPipelineExpireTime(10);
  config1.setMaxPipelinePoolSize(size);
  return new V2TextChecker(config1, false, null, {});
};
const check = (checker, t, params) => checker.checkText(text(t), fakeExchange(), params, null, null);
const p = (language, extra = {}) => new Map([['text', 'not used'], ['language', language], ...Object.entries(extra)]);

describe('PipelinePool', () => {
  // Java: PipelinePoolTest#testPipelineCreatedAndUsed
  it('testPipelineCreatedAndUsed', async () => {
    const checker = newChecker(10);
    const s = spy(checker.pipelinePool);
    await check(checker, 'Hello World.', p('en-US'));
    const settings1 = new PipelineSettings(Languages.getLanguageForShortCode('en-US'), null, queryParams(), gConfig, newUser());
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    await check(checker, 'Hello World, second time around.', p('en-US'));
    expect(s.getCount(settings1)).toBe(2);
    expect(s.returnCount(settings1)).toBe(2);
  });

  // Java: PipelinePoolTest#testDifferentPipelineSettings
  it('testDifferentPipelineSettings', async () => {
    const checker = newChecker(10);
    const s = spy(checker.pipelinePool);
    await check(checker, 'Hello World.', p('en-US'));
    const lang1 = Languages.getLanguageForShortCode('en-US');
    const lang2 = Languages.getLanguageForShortCode('de-DE');
    const user1 = newUser();
    const settings1 = new PipelineSettings(lang1, null, queryParams(), gConfig, user1);
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    const settings2 = new PipelineSettings(lang2, null, queryParams(), gConfig, user1);
    await check(checker, 'Hallo Welt!', p('de-DE'));
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    expect(s.getCount(settings2)).toBe(1);
    expect(s.returnCount(settings2)).toBe(1);
    const settings3 = new PipelineSettings(lang2, null, queryParams(['DE_CASE'], true), gConfig, user1);
    await check(checker, 'Hallo Welt!', p('de-DE', { disabledRules: 'DE_CASE' }));
    expect(s.getCount(settings3)).toBe(1);
    expect(s.returnCount(settings3)).toBe(1);
  });

  // Java: PipelinePoolTest#testMaxPipelinePoolSize
  it('testMaxPipelinePoolSize', async () => {
    const lang1 = Languages.getLanguageForShortCode('en-US');
    const lang2 = Languages.getLanguageForShortCode('de-DE');
    const user1 = newUser();
    const checker = newChecker(1);
    const s = spy(checker.pipelinePool);
    // size = 1 -> needs to create new pipeline when language changes
    await check(checker, 'Hello World.', p('en-US'));
    const settings1 = new PipelineSettings(lang1, null, queryParams(), gConfig, user1);
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    await check(checker, 'Hallo Welt!', p('de-DE'));
    const settings2 = new PipelineSettings(lang2, null, queryParams(), gConfig, user1);
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    expect(s.getCount(settings2)).toBe(1);
    expect(s.returnCount(settings2)).toBe(1);
    await check(checker, 'Hello World.', p('en-US'));
    expect(s.getCount(settings1)).toBe(2);
    expect(s.returnCount(settings1)).toBe(2);
    await check(checker, 'Hallo Welt!', p('de-DE'));
    expect(s.getCount(settings2)).toBe(2);
    expect(s.returnCount(settings2)).toBe(2);
  });

  // Java: PipelinePoolTest#testPipelinePoolExpireTime
  it('testPipelinePoolExpireTime', async () => {
    const checker = newChecker(10);
    const s = spy(checker.pipelinePool);
    await check(checker, 'Hello World.', p('en-US'));
    const settings1 = new PipelineSettings(Languages.getLanguageForShortCode('en-US'), null, queryParams(), gConfig, newUser());
    expect(s.getCount(settings1)).toBe(1);
    expect(s.returnCount(settings1)).toBe(1);
    await new Promise((r) => setTimeout(r, 2000));
    await check(checker, 'Hello World, second time around.', p('en-US'));
    expect(s.getCount(settings1)).toBe(2);
    expect(s.returnCount(settings1)).toBe(2);
  });

  // Java: PipelinePoolTest#testPipelineMutation
  it('testPipelineMutation', () => {
    const pipeline = new Pipeline(Languages.getLanguageForShortCode('en-US'), [], null, null, gConfig, null, true);
    pipeline.addRule(null);
    pipeline.setupFinished();
    expect(() => pipeline.addRule(null)).toThrow(IllegalPipelineMutationException);
  });
});
