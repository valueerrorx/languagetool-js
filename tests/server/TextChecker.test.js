// Port of TextCheckerTest (JSONP, max text length, altLanguages, language detection request side, preferredVariants) plus /v2/check parameter units.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { V2TextChecker } from '../../src/server/TextChecker.js';
import { RequestCounter } from '../../src/server/LanguageToolHttpHandler.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { BadRequestException } from '../../src/server/BadRequestException.js';
import { TextTooLongException } from '../../src/server/exceptions.js';
import { detectLanguageOfString } from '../../src/server/detectLanguageOfString.js';
import { Headers } from '../../src/server/HttpExchange.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { computeTextSessionID } from '../../src/server/TextChecker.js';

const english = 'This is clearly an English text, should be easy to detect.';
const unsupportedCzech = 'V současné době je označením Linux míněno nejen jádro operačního systému, ale zahrnuje do něj též veškeré programové vybavení';

// Java: FakeHttpExchange
function fakeExchange() {
  const e = { out: '', requestHeaders: new Headers(), responseHeaders: new Headers() };
  e.getRequestHeaders = () => e.requestHeaders;
  e.getResponseHeaders = () => e.responseHeaders;
  e.sendResponseHeaders = () => {};
  e.write = (b) => { e.out += Buffer.from(b).toString('utf8'); };
  e.getOutput = () => e.out;
  return e;
}
const text = (t) => new AnnotatedTextBuilder().addText(t).build();
const newChecker = (cfg = new HTTPServerConfig(8081)) => new V2TextChecker(cfg, false, null, new RequestCounter());

describe('TextChecker', () => {
  // Java: TextCheckerTest#testJSONP
  it('testJSONP', async () => {
    const params = new Map([['text', 'not used'], ['language', 'en'], ['callback', 'myCallback']]);
    const ex = fakeExchange();
    await newChecker().checkText(text('some random text'), ex, params, null, null);
    expect(ex.getOutput().startsWith('myCallback(')).toBe(true);
    expect(ex.getOutput().endsWith(');')).toBe(true);
  });

  // Java: TextCheckerTest#testMaxTextLength
  it('testMaxTextLength', async () => {
    const params = new Map([['text', 'not used'], ['language', 'en']]);
    const config1 = new HTTPServerConfig(8081);
    config1.setMaxTextLengthAnonymous(10);
    const checker = newChecker(config1);
    await expect(checker.checkText(text('longer than 10 chars'), fakeExchange(), params, null, null)).rejects.toBeInstanceOf(TextTooLongException);
    params.set('token', 'invalid');
    await expect(checker.checkText(text('longer than 10 chars'), fakeExchange(), params, null, null)).rejects.toBeTruthy();
    params.set('token', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczpcL1wvbGFuZ3VhZ2V0b29scGx1cy5jb20iLCJpYXQiOjE1MDQ4NTY4NTQsInVpZCI6MSwibWF4VGV4dExlbmd0aCI6MTAwfQ._-8qpa99IWJiP_Zx5o-yVU11neW8lrxmLym1DdwPtIc');
    await expect(checker.checkText(text('longer than 10 chars'), fakeExchange(), params, null, null)).rejects.toBeTruthy();
    await expect(checker.checkText(text("now it's even longer than 30 chars"), fakeExchange(), params, null, null)).rejects.toBeInstanceOf(TextTooLongException);
  });

  // Java: TextCheckerTest#testInvalidAltLanguages
  it('testInvalidAltLanguages', async () => {
    const params = new Map([['text', 'not used'], ['language', 'en']]);
    const checker = newChecker();
    params.set('altLanguages', 'en');
    await expect(checker.checkText(text('something'), fakeExchange(), params, null, null)).rejects.toBeInstanceOf(BadRequestException);
    params.set('altLanguages', 'xy');
    await expect(checker.checkText(text('something'), fakeExchange(), params, null, null)).rejects.toBeInstanceOf(BadRequestException);
    params.set('language', 'en');
    params.set('altLanguages', 'de-DE');
    await checker.checkText(text('something'), fakeExchange(), params, null, null);
    params.set('language', 'en-US');
    params.set('altLanguages', 'en-US'); // not useful, but not forbidden
    await checker.checkText(text('something'), fakeExchange(), params, null, null);
  });

  // Java: TextCheckerTest#testDetectLanguageOfString
  it('testDetectLanguageOfString', () => {
    const li = newChecker().languageIdentifier;
    const e = [];
    const code = (t, fb, variants) => detectLanguageOfString(li, t, fb, variants, e, e).getDetectedLanguage().getShortCodeWithCountryAndVariant();
    expect(code('', 'en', ['en-GB'])).toBe('en-GB');
    expect(code('X', 'en', ['en-GB'])).toBe('ca-ES');
    expect(detectLanguageOfString(li, 'X', 'en', ['en-GB'], e, e).getDetectionConfidence()).toBeLessThan(0.5);
    expect(code(english, 'de', ['en-GB', 'de-AT'])).toBe('en-GB');
    expect(code(english, 'de', [])).toBe('en-US');
    expect(code(english, 'de', ['de-AT', 'en-ZA'])).toBe('en-ZA');
    const german = 'Das hier ist klar ein deutscher Text, sollte gut zu erkennen sein.';
    expect(code(german, 'fr', ['de-AT', 'en-ZA'])).toBe('de-AT');
    expect(code(german, 'fr', ['de-at', 'en-ZA'])).toBe('de-AT');
    expect(code(german, 'fr', [])).toBe('de-DE');
    expect(code(unsupportedCzech, 'en', [])).toBe('sk-SK'); // misdetected because it's not supported
  });

  // Java: TextCheckerTest#testInvalidPreferredVariant
  it('testInvalidPreferredVariant', () => {
    const li = newChecker().languageIdentifier;
    expect(() => detectLanguageOfString(li, english, 'de', ['en'], [], [])).toThrow();
  });

  // Java: TextCheckerTest#testInvalidPreferredVariant2
  it('testInvalidPreferredVariant2', () => {
    const li = newChecker().languageIdentifier;
    expect(() => detectLanguageOfString(li, english, 'de', ['en-YY'], [], [])).toThrow();
  });

  // Java: TextChecker#computeTextSessionID(String,String)
  it('computeTextSessionID', () => {
    expect(computeTextSessionID(null, null)).toBe(null);
    expect(computeTextSessionID('a', 'b')).toBe(computeTextSessionID('a', null));
    expect(typeof computeTextSessionID(null, '127.0.0.1')).toBe('bigint');
  });

  // Java: TextChecker#getRuleValues(Map) (ArrayIndexOutOfBounds without ':')
  it('ruleValues', () => {
    const c = newChecker();
    const v = c.getRuleValues(new Map([['ruleValues', 'A:i5;sx,B:b true']]));
    expect(v.get('A')).toEqual([5, 'x']);
    expect(() => c.getRuleValues(new Map([['ruleValues', 'A']]))).toThrow('Index 1 out of bounds for length 1');
  });

  // Java: TextChecker#checkText premium status check text
  it('premium status check text', async () => {
    const ex = fakeExchange();
    await newChecker().checkText(text('languagetool testrule 8634756'), ex, new Map([['text', 'x'], ['language', 'de']]), null, null);
    const j = JSON.parse(ex.getOutput());
    expect(j.language.code).toBe('en-US');
    expect(j.matches).toEqual([]);
  });
});
