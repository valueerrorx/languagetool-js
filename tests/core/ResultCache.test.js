// Port of ResultCacheTest (languagetool-standalone), InputSentenceTest, plus Guava cache semantics checked against the weights/eviction rules of ResultCache.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { InputSentence } from '../../src/core/InputSentence.js';
import { SimpleInputSentence } from '../../src/core/SimpleInputSentence.js';
import { ResultCache } from '../../src/core/ResultCache.js';
import { JLanguageTool, Level, Mode } from '../../src/core/JLanguageTool.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { ToneTag, Tag } from '../../src/core/rules/model/Tag.js';
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { TimeUnit } from '../../src/lib/java/TimeUnit.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { DemoLanguage, useXxTestResources } from '../support/DemoLanguage.js';

// Java: org.languagetool.rules.FakeRule
class FakeRule extends Rule {
  constructor(id = 'FAKE-RULE', tag = null) {
    super();
    this.ruleId = id;
    if (tag !== null) this.setTags([tag]);
  }

  getId() { return this.ruleId; }

  getDescription() { return '<none>'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

const sets = () => new Set();
const noop = (lt) => lt;

describe('ResultCache', () => {
  // Java: ResultCacheTest#testSimpleInputSentenceCache
  it('testSimpleInputSentenceCache', () => {
    const cache = new ResultCache(100);
    expect(cache.hitCount()).toBe(0);
    expect(cache.hitRate()).toBe(1.0);
    cache.put(new SimpleInputSentence('foo', Languages.getLanguageForShortCode('de')), new AnalyzedSentence([]));
    expect(cache.getIfPresent(new SimpleInputSentence('foo', Languages.getLanguageForShortCode('de')))).not.toBeNull();
    expect(cache.getIfPresent(new SimpleInputSentence('foo', Languages.getLanguageForShortCode('de-DE')))).toBeNull();
    expect(cache.getIfPresent(new SimpleInputSentence('foo', Languages.getLanguageForShortCode('en')))).toBeNull();
    expect(cache.getIfPresent(new SimpleInputSentence('foo bar', Languages.getLanguageForShortCode('de')))).toBeNull();
  });

  // Java: ResultCacheTest#testInputSentenceCache
  it('testInputSentenceCache', () => {
    const langDE = Languages.getLanguageForShortCode('de');
    const langEN = Languages.getLanguageForShortCode('en');
    const ltDe = new JLanguageTool(langDE, [], null, null, null, null, true, false, []);
    const ltEn = new JLanguageTool(langEN, [], null, null, null, null, true, false, []);
    const cache = new ResultCache(100);
    expect(cache.hitCount()).toBe(0);
    expect(cache.hitRate()).toBe(1.0);
    const userConfig1 = new UserConfig(['word1']);
    const mode = Mode.ALL;
    const level = Level.DEFAULT;
    const el = [];
    const input = (lt, text, lang, mt, dis, uc, alt, ...rest) => new InputSentence(lt.getAnalyzedSentence(text), lang, mt, dis, sets(), sets(), sets(), uc, alt, mode, level, ...rest);
    const input1a = input(ltDe, 'foo', langDE, null, sets(), userConfig1, el);
    const input1b = input(ltDe, 'foo', langDE, null, sets(), userConfig1, el);
    cache.put(input1a, []);
    expect(cache.getIfPresent(input1a)).not.toBeNull();
    expect(cache.getIfPresent(input1b)).not.toBeNull();
    const input2a = input(ltDe, 'foo bar', langDE, null, sets(), userConfig1, el);
    const input2b = input(ltEn, 'foo', langEN, null, sets(), userConfig1, el);
    const input2c = input(ltDe, 'foo', langDE, Languages.getLanguageForShortCode('en'), sets(), userConfig1, el);
    const input2d = input(ltDe, 'foo', langDE, null, new Set(['ID1']), userConfig1, el);
    expect(cache.getIfPresent(input2a)).toBeNull();
    expect(cache.getIfPresent(input2b)).toBeNull();
    expect(cache.getIfPresent(input2c)).toBeNull();
    expect(cache.getIfPresent(input2d)).toBeNull();

    const userConfig2 = new UserConfig(['word2']);
    const input1aUc1 = input(ltDe, 'foo', langDE, null, sets(), userConfig1, el);
    expect(cache.getIfPresent(input1aUc1)).not.toBeNull();
    const input1aUc2 = input(ltDe, 'foo', langDE, null, sets(), userConfig2, el);
    expect(cache.getIfPresent(input1aUc2)).toBeNull();
    const input1aUc2Alt = input(ltDe, 'foo', langDE, null, sets(), userConfig2, [langEN]);
    expect(cache.getIfPresent(input1aUc2Alt)).toBeNull();

    // put in cache for next tests
    cache.put(input1aUc2Alt, []);

    const toneTagSet1 = new Set([ToneTag.positive, ToneTag.clarity]);
    const toneTagSet2 = new Set([ToneTag.general, ToneTag.clarity]);
    const toneTagSet3 = new Set();
    const inputWithTonetagSet1 = input(ltDe, 'foo', langDE, null, sets(), userConfig2, [langEN], toneTagSet1);
    const inputWithTonetagSet2 = input(ltDe, 'foo', langDE, null, sets(), userConfig2, [langEN], toneTagSet2);
    const inputWithTonetagSet3 = input(ltDe, 'foo', langDE, null, sets(), userConfig2, [langEN], toneTagSet3);
    const inputWithTonetagSetNull = input(ltDe, 'foo', langDE, null, sets(), userConfig2, [langEN], null);

    expect(cache.getIfPresent(inputWithTonetagSet1)).toBeNull();
    cache.put(inputWithTonetagSet1, [new RuleMatch(new FakeRule('FAKE1'), 0, 1, 'Fake message 1')]);
    expect(cache.getIfPresent(inputWithTonetagSet1)).not.toBeNull();

    expect(cache.getIfPresent(inputWithTonetagSet2)).toBeNull();
    cache.put(inputWithTonetagSet2, [new RuleMatch(new FakeRule('FAKE2'), 0, 1, 'Fake message 1')]);
    expect(cache.getIfPresent(inputWithTonetagSet2)).not.toBeNull();

    expect(cache.getIfPresent(inputWithTonetagSet3)).not.toBeNull(); // same as input1aUc2Alt
    expect(cache.getIfPresent(inputWithTonetagSetNull)).not.toBeNull(); // same as input1aUc2Alt

    // matches are restored from their serialised form: every read returns a new list
    expect(cache.getIfPresent(inputWithTonetagSet1)).not.toBe(cache.getIfPresent(inputWithTonetagSet2));
    expect(cache.getIfPresent(inputWithTonetagSet1)[0].getRule().getId()).toBe('FAKE1');
    expect(cache.getIfPresent(inputWithTonetagSet2)[0].getRule().getId()).toBe('FAKE2');
    expect(cache.getIfPresent(inputWithTonetagSet3)).toEqual([]);
    expect(cache.getIfPresent(inputWithTonetagSetNull)).toEqual([]);
  });

  it('constructor rejects negative sizes', () => {
    expect(() => new ResultCache(-1)).toThrow(IllegalArgumentException);
    expect(() => new ResultCache(-1)).toThrow('Result cache size must be >= 0: -1');
  });

  it('weights evict by least recent access (cache 4 = weight 2 per cache, one segment)', () => {
    const cache = new ResultCache(4);
    const lang = Languages.getLanguageForShortCode('en-US');
    const put = (t) => cache.put(new SimpleInputSentence(t, lang), new AnalyzedSentence([]));
    put('a');
    put('b');
    expect(cache.getSentenceCache().size()).toBe(2);
    expect(cache.getIfPresent(new SimpleInputSentence('a', lang))).not.toBeNull(); // a is now the most recent
    put('c');
    expect(cache.getSentenceCache().size()).toBe(2);
    expect(cache.getIfPresent(new SimpleInputSentence('b', lang))).toBeNull(); // b was evicted
    expect(cache.getIfPresent(new SimpleInputSentence('a', lang))).not.toBeNull();
    expect(cache.hitCount()).toBe(2);
    expect(cache.requestCount()).toBe(3);
  });

  it('cache size 1 evicts everything (maximumWeight 0) but counts requests', () => {
    const cache = new ResultCache(1);
    const lang = Languages.getLanguageForShortCode('en-US');
    cache.put(new SimpleInputSentence('a', lang), new AnalyzedSentence([]));
    expect(cache.getSentenceCache().size()).toBe(0);
    expect(cache.getIfPresent(new SimpleInputSentence('a', lang))).toBeNull();
    expect(cache.requestCount()).toBe(1);
    expect(cache.hitRate()).toBe(0.5); // (matches cache without requests: 1.0 + sentence cache: 0.0) / 2
  });

  it('entries expire after the last read access', async () => {
    const cache = new ResultCache(100, 1, TimeUnit.SECONDS);
    const lang = Languages.getLanguageForShortCode('en-US');
    cache.put(new SimpleInputSentence('a', lang), new AnalyzedSentence([]));
    expect(cache.getIfPresent(new SimpleInputSentence('a', lang))).not.toBeNull();
    await new Promise((r) => setTimeout(r, 1100));
    expect(cache.getIfPresent(new SimpleInputSentence('a', lang))).toBeNull();
    expect(cache.getSentenceCache().size()).toBe(0);
  });

  it('serialised matches keep the data the JSON serializer reads', () => {
    const cache = new ResultCache(100);
    const lang = Languages.getLanguageForShortCode('en-US');
    const lt = new JLanguageTool(lang, [], null, null, null, null, true, false, []);
    const rule = new FakeRule('R1', Tag.picky);
    const m = new RuleMatch(rule, lt.getAnalyzedSentence('foo bar'), 0, 3, 'msg <suggestion>baz</suggestion>', 'short');
    const key = new InputSentence(lt.getAnalyzedSentence('foo bar'), lang, null, new Set(), new Map(), new Set(), new Map(), new UserConfig(), [], Mode.ALL, Level.DEFAULT, new Set());
    cache.put(key, [m]);
    const back = cache.getIfPresent(key)[0];
    expect(back.getRule().getId()).toBe('R1');
    expect(back.getRule().getTags().map((t) => t.name())).toEqual(['picky']);
    expect(back.getMessage()).toBe('msg <suggestion>baz</suggestion>');
    expect(back.getShortMessage()).toBe('short');
    expect(back.getSuggestedReplacements()).toEqual(['baz']);
    expect([back.getFromPos(), back.getToPos()]).toEqual([0, 3]);
    void noop;
  });
});

describe('InputSentence', () => {
  useXxTestResources();

  // Java: InputSentenceTest#test (Demo language xx-XX / xx)
  it('InputSentenceTest', () => {
    const lang = new DemoLanguage();
    const lt = new JLanguageTool(lang, [], null, null, null, null, true, false, []);
    const userConfig1 = new UserConfig(['foo1', 'foo2']);
    const mode = Mode.ALL;
    const level = Level.DEFAULT;
    const mk = (mt, uc, alt, m = mode) => new InputSentence(lt.getAnalyzedSentence('foo'), lang, mt, new Set(['ID1']), new Map([['C1', new CategoryId('C1')]]),
      new Set(['ID2']), new Map([['C2', new CategoryId('C2')]]), uc, alt, m, level);
    const inputSentence1a = mk(lang, userConfig1, []);
    const inputSentence1b = mk(lang, userConfig1, []);
    expect(inputSentence1a.equals(inputSentence1b)).toBe(true);
    expect(inputSentence1a.hashCode()).toBe(inputSentence1b.hashCode());
    const inputSentence2 = mk(null, userConfig1, []);
    expect(inputSentence1a.equals(inputSentence2)).toBe(false);
    expect(inputSentence1b.equals(inputSentence2)).toBe(false);
    const userConfig2 = new UserConfig(['foo1', 'foo2']);
    expect(inputSentence1a.equals(mk(lang, userConfig2, []))).toBe(true);
    expect(inputSentence1a.equals(mk(lang, userConfig1, [], Mode.TEXTLEVEL_ONLY))).toBe(false);
    expect(inputSentence1a.equals(mk(lang, userConfig1, []))).toBe(true);
    expect(inputSentence1a.equals(mk(lang, userConfig1, [new DemoLanguage()]))).toBe(false);
  });
});
