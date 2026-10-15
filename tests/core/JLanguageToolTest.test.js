// JLanguageToolTest / ToolsTest#selectRules / MultiThreadedJLanguageToolTest#testTextAnalysis / MorfologikTaggerTest#testPositionWithIgnoredChars
// adapted: the Demo language (xx) and its pattern rules are not ported, so en-US with a small test rule and no-op disambiguator/chunker is used.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { TextLevelRule } from '../../src/core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { Category, CategoryId, CategoryIds } from '../../src/core/rules/model/Category.js';
import { ToneTag } from '../../src/core/rules/model/Tag.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';

const LANG = Languages.getLanguageForShortCode('en-US');
let saved;
beforeAll(() => {
  saved = [LANG.getDisambiguator(), LANG.getChunker()];
  LANG.setDisambiguator(new NoopDisambiguator());
  LANG.setChunker(new NoopChunker());
});
afterAll(() => {
  LANG.setDisambiguator(saved[0]);
  LANG.setChunker(saved[1]);
});

// test rule: one match per token equal to `word` (stands in for the Demo pattern rules)
class WordRule extends Rule {
  constructor(id, word, opts = {}) {
    super();
    this.id = id;
    this.word = word;
    this.subId = opts.subId ?? null;
    if (opts.category) this.setCategory(opts.category);
    if (opts.defaultOff) this.setDefaultOff();
    if (opts.tempOff) this.setDefaultTempOff();
  }

  getId() { return this.id; }

  getSubId() { return this.subId; }

  getDescription() { return `desc ${this.id}`; }

  match(sentence) {
    return sentence.getTokensWithoutWhitespace().filter((t) => t.getToken() === this.word)
      .map((t) => new RuleMatch(this, sentence, t.getStartPos(), t.getEndPos(), `msg ${this.id}`));
  }
}

// text-level test rule: one match per occurrence of `word` in the whole text
class TextWordRule extends TextLevelRule {
  constructor(id, word) {
    super();
    this.id = id;
    this.word = word;
  }

  getId() { return this.id; }

  getDescription() { return 'text'; }

  minToCheckParagraph() { return 0; }

  match(sentences) {
    const out = [];
    let all = '';
    const starts = [];
    for (const s of sentences) { starts.push(all.length); all += s.getText(); }
    for (let p = all.indexOf(this.word); p !== -1; p = all.indexOf(this.word, p + 1)) {
      let k = 0;
      while (k + 1 < starts.length && starts[k + 1] <= p) k++;
      out.push(new RuleMatch(this, sentences[k], p, p + this.word.length, 'text msg'));
    }
    return out;
  }
}

const custom = (rules) => new JLanguageTool(LANG, [], null, null, null, null, true, false, rules);
const activeIds = (lt) => lt.getAllActiveRules().map((r) => r.getId());

describe('JLanguageToolTest (adapted)', () => {
  // Java: JLanguageToolTest#testCheckString
  it('testCheckString', () => {
    expect(custom([new WordRule('MY_TEST', 'test')]).check('This is my test.').length).toBe(1);
  });

  // Java: JLanguageToolTest#testCheckStringWithCallbackReturnsTrue
  it('testCheckStringWithCallbackReturnsTrue', () => {
    const lt = custom([new WordRule('MY_TEST', 'test')]);
    lt.setCheckCancelledCallback({ checkCancelled: () => true });
    expect(lt.check('This is my test.').length).toBe(0);
  });

  // Java: JLanguageToolTest#testCheckStringWithCallbackReturnsFalse
  it('testCheckStringWithCallbackReturnsFalse', () => {
    const lt = custom([new WordRule('MY_TEST', 'test')]);
    lt.setCheckCancelledCallback({ checkCancelled: () => false });
    expect(lt.check('This is my test.').length).toBe(1);
  });

  // Java: JLanguageToolTest#testUserConfig (user rules from UserConfig are checked per sentence)
  it('testUserConfig', () => {
    const lt1 = custom([]);
    expect(lt1.check('This is my test').length).toBe(0);
    const userConfig = new UserConfig([], [new WordRule('MY_TEST', 'test')], new Map(), -1, 1n, 'fake', null, null, false, null, null, false, null);
    const lt2 = new JLanguageTool(LANG, [], null, null, null, userConfig, true, false, []);
    expect(lt2.check('This is my test').length).toBe(1);
  });

  // Java: MultiThreadedJLanguageToolTest#testTextAnalysis
  it('testTextAnalysis', () => {
    const analyzedSentences = custom([]).analyzeText('This is a sentence. And another one.');
    expect(analyzedSentences.length).toBe(2);
    expect(analyzedSentences[0].getTokens().length).toBe(10);
    expect(analyzedSentences[0].getTokensWithoutWhitespace().length).toBe(6); // sentence start has its own token
    expect(analyzedSentences[1].getTokens().length).toBe(7);
    expect(analyzedSentences[1].getTokensWithoutWhitespace().length).toBe(5);
    expect(analyzedSentences[1].getTokens()[6].isParagraphEnd()).toBe(true);
  });

  // Java: MorfologikTaggerTest#testPositionWithIgnoredChars
  it('testPositionWithIgnoredChars', () => {
    const text = 't­ox te­stx';
    const analyzedSent = custom([]).getRawAnalyzedSentence(text);
    expect(analyzedSent.getTokens()[3].getToken()).not.toBeNull();
    expect(analyzedSent.getTokens()[3].isSentenceEnd()).toBe(true);
    expect(analyzedSent.getTokens()[3].getStartPos()).toBe(text.indexOf('te­st'));
    expect(analyzedSent.getTokens()[3].getEndPos()).toBe(text.length);
    expect(analyzedSent.getTokens()[3].getCleanToken()).toBe('testx');
  });
});

describe('ToolsTest#selectRules (adapted)', () => {
  const demo = () => custom([new WordRule('DEMO_RULE', 'x', { category: new Category(CategoryIds.MISC, 'Miscellaneous') })]);
  const has = (dc, ec, dr, er, only) => {
    const lt = demo();
    selectRules(lt, dc, ec, new Set(dr), new Set(er), only, false);
    return activeIds(lt).includes('DEMO_RULE');
  };

  // Java: ToolsTest#testSelectRules
  it('testSelectRules', () => {
    expect(has([], [], [], [], false)).toBe(true);
    expect(has([], [], ['DEMO_RULE'], [], false)).toBe(false);
    expect(has([CategoryIds.MISC], [], [], [], false)).toBe(false);
    expect(has([CategoryIds.MISC], [], [], ['DEMO_RULE'], false)).toBe(true);
    expect(has([], [], [], [], true)).toBe(true);
    expect(has([], [], ['DEMO_RULE'], [], true)).toBe(false);
    expect(has([CategoryIds.MISC], [], [], [], true)).toBe(false);
    expect(has([], [CategoryIds.MISC], [], [], true)).toBe(true);
    expect(has([], [CategoryIds.CASING], [], [], true)).toBe(false);
  });

  // Java: ToolsTest#testSelectRulesWithEnabledOnlyAndBothRulesAndCategories
  it('testSelectRulesWithEnabledOnlyAndBothRulesAndCategories', () => {
    const minmax = new Category(new CategoryId('MINMAX'), 'MinMax');
    const misc = new Category(CategoryIds.MISC, 'Misc');
    const lt = custom([
      new WordRule('DEMO_RULE', 'a', { category: misc }),
      new WordRule('test_matching_tokens', 'b', { subId: '1', category: misc }),
      new WordRule('TEST_MIN_OCCURRENCE', 'c', { category: minmax }),
      new WordRule('TEST_GO', 'd', { category: misc }),
      new WordRule('DEMO_RULE_ANTIPATTERN', 'e', { category: misc }),
      new WordRule('DEMO_RULE_OFF', 'f', { category: minmax, defaultOff: true }),
      new WordRule('IN_MINMAX', 'g', { category: minmax }),
    ]);
    lt.disableRule('TEST_MIN_OCCURRENCE');
    selectRules(lt, [], [new CategoryId('MINMAX')], new Set(), new Set(['DEMO_RULE', 'test_matching_tokens']), true, false);
    const ids = activeIds(lt);
    expect(ids).toContain('DEMO_RULE');
    expect(ids).toContain('test_matching_tokens');
    expect(ids).not.toContain('TEST_MIN_OCCURRENCE');
    expect(ids).not.toContain('TEST_GO');
    expect(ids).not.toContain('DEMO_RULE_ANTIPATTERN');
    expect(ids).not.toContain('DEMO_RULE_OFF');
    expect(ids).toContain('IN_MINMAX');
  });

  it('enableTempOff prints the activation line', () => {
    const lt = custom([new WordRule('T', 'x', { tempOff: true })]);
    let out = '';
    const old = process.stdout.write;
    process.stdout.write = (c) => { out += c; return true; };
    try {
      selectRules(lt, [], [], new Set(), new Set(), false, true);
    } finally {
      process.stdout.write = old;
    }
    expect(out).toBe("Activating T, which is default='temp_off'\n");
    expect(activeIds(lt)).toEqual(['T']);
  });
});

describe('JLanguageTool block tests', () => {
  it('constructor null checks', () => {
    expect(() => new JLanguageTool(null)).toThrow('language cannot be null');
    expect(() => new JLanguageTool(LANG, null, null, null, null, null, true, false, null)).toThrow('altLanguages cannot be null (but empty)');
  });

  it('countLineBreaks', () => {
    expect(JLanguageTool.countLineBreaks('')).toBe(0);
    expect(JLanguageTool.countLineBreaks('\n')).toBe(1);
    expect(JLanguageTool.countLineBreaks('a\nb\n\nc')).toBe(3);
    expect(JLanguageTool.countLineBreaks('a\r\nb\r')).toBe(1);
  });

  it('positions, line and column (sentence and text-level rules)', () => {
    const lt = custom([new TextWordRule('TXT', 'foo'), new WordRule('W', 'bar')]);
    const m = lt.check('Hello bar.\nfoo bar here. 😀 bar');
    expect(m.map((x) => [x.getRule().getId(), x.getFromPos(), x.getToPos(), x.getLine(), x.getColumn(), x.getEndLine(), x.getEndColumn()])).toEqual([
      ['W', 6, 9, 0, 7, 0, 10], ['TXT', 11, 14, 1, 1, 1, 4], ['W', 15, 18, 1, 5, 1, 8], ['W', 28, 31, 1, 18, 1, 21],
    ]);
  });

  it('U+FEFF becomes markup (positions map to the original text)', () => {
    const lt = custom([new WordRule('W', 'bar')]);
    const m = lt.check('﻿foo bar﻿ bar');
    expect(m.map((x) => [x.getFromPos(), x.getToPos()])).toEqual([[5, 8], [10, 13]]);
  });

  it('AnnotatedText markup with interpretAs', () => {
    const lt = custom([new WordRule('W', 'bar')]);
    const at = new AnnotatedTextBuilder().addMarkup('<p>').addText('foo').addMarkup('<br/>', '\n').addText('bar').build();
    const m = lt.check(at);
    expect(m.map((x) => [x.getFromPos(), x.getToPos(), x.getLine()])).toEqual([[11, 14, 1]]);
  });

  it('modes and paragraph handling', () => {
    const lt = custom([new TextWordRule('TXT', 'foo'), new WordRule('W', 'foo')]);
    const ids = (ph, mode) => {
      const at = new AnnotatedTextBuilder().addText('foo').build();
      const r = mode === undefined ? lt.check(at, true, ph) : lt.check(at, true, ph, null, mode, Level.DEFAULT);
      return r.map((x) => x.getRule().getId());
    };
    expect(ids(ParagraphHandling.NORMAL)).toEqual(['TXT', 'W']);
    expect(ids(ParagraphHandling.ONLYPARA)).toEqual(['TXT']);
    expect(ids(ParagraphHandling.ONLYNONPARA)).toEqual(['W']);
    expect(ids(ParagraphHandling.NORMAL, Mode.TEXTLEVEL_ONLY)).toEqual(['TXT']);
    expect(ids(ParagraphHandling.NORMAL, Mode.ALL_BUT_TEXTLEVEL_ONLY)).toEqual(['W']);
    expect(ids(ParagraphHandling.ONLYPARA, Mode.ALL_BUT_TEXTLEVEL_ONLY)).toEqual([]);
  });

  it('cancel during analysis: IndexOutOfBoundsException quirk', () => {
    const lt = custom([new WordRule('W', 'one')]);
    let n = 0;
    lt.setCheckCancelledCallback({ checkCancelled: () => ++n > 1 });
    expect(() => lt.check('First one. Second one. Third one.')).toThrow('Index 1 out of bounds for length 1');
  });

  it('rule set cache is invalidated by mutations', () => {
    const lt = custom([new WordRule('W', 'x')]);
    expect(lt.check('x').length).toBe(1);
    lt.disableRule('W');
    expect(lt.check('x').length).toBe(0);
    lt.enableRule('W');
    expect(lt.check('x').length).toBe(1);
    lt.addRule(new WordRule('V', 'x'));
    expect(lt.check('x').length).toBe(2);
    lt.setRules([]);
    expect(lt.check('x').length).toBe(0);
  });

  it('setRules(null) clears the lists, throws and keeps the stale rule set cache (quirk)', () => {
    const lt = custom([new WordRule('W', 'x')]);
    expect(lt.check('x').length).toBe(1);
    expect(() => lt.setRules(null)).toThrow('because "c" is null');
    expect(lt.getAllRules()).toEqual([]);
    expect(lt.check('x').length).toBe(1);
  });

  it('level and tone tag activity', () => {
    const r = new WordRule('T', 'x');
    r.addToneTags(['formal']);
    const goal = new WordRule('G', 'x');
    goal.addToneTags(['persuasive']);
    goal.setGoalSpecific(true);
    const picky = new WordRule('P', 'x');
    picky.addTags(['picky']);
    const act = (rule, level, tags) => JLanguageTool.isRuleActiveForLevelAndToneTags(rule, level, new Set(tags.map((t) => ToneTag.valueOf(t))));
    expect(act(picky, Level.DEFAULT, [])).toBe(false);
    expect(act(picky, Level.PICKY, [])).toBe(true);
    expect(act(r, Level.DEFAULT, [])).toBe(true);
    expect(act(goal, Level.DEFAULT, [])).toBe(false);
    expect(act(goal, Level.DEFAULT, ['ALL_TONE_RULES'])).toBe(true);
    expect(act(r, Level.DEFAULT, ['NO_TONE_RULE'])).toBe(false);
    expect(act(r, Level.DEFAULT, ['clarity'])).toBe(false);
    expect(act(goal, Level.DEFAULT, ['persuasive'])).toBe(true);
    expect(act(new WordRule('N', 'x'), Level.DEFAULT, ['NO_TONE_RULE'])).toBe(true);
  });

  it('ignoreRule: category and rule states', () => {
    const offCat = new Category(new CategoryId('OFFCAT'), 'off', Category.Location.INTERNAL, false);
    const lt = custom([new WordRule('A', 'x', { category: offCat }), new WordRule('B', 'x', { defaultOff: true }), new WordRule('C', 'x', { subId: '1' })]);
    expect(activeIds(lt)).toEqual(['C']);
    lt.enableRule('A');
    lt.enableRule('B');
    lt.disableRule('C[1]');
    expect(activeIds(lt)).toEqual(['A', 'B']);
    lt.disableCategory(CategoryIds.MISC);
    expect(lt.isCategoryDisabled(CategoryIds.MISC)).toBe(true);
    expect(activeIds(lt)).toEqual(['A', 'B']);
    lt.disableRule('B');
    expect(activeIds(lt)).toEqual(['A']);
  });
});
