// Unit tests of the fixed Java bugs without a CLI/server process: DEV-016, DEV-022, DEV-025, DEV-026, DEV-027 (CB-04, CB-10, CB-13, CB-14, CB-15).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { ApiV2 } from '../../src/server/ApiV2.js';
import { RuleOption } from '../../src/core/rules/model/RuleOption.js';
import { typedHash } from '../../src/lib/java/hash.js';
import { ShortenedYearRangeChecker } from '../../src/core/rules/ShortenedYearRangeChecker.js';
import { LongSentenceRule } from '../../src/core/rules/LongSentenceRule.js';
import { LongParagraphRule } from '../../src/core/rules/LongParagraphRule.js';
import { GermanStyleRepeatedWordRule } from '../../src/lang/de/rules/GermanStyleRepeatedWordRule.js';

import { DisambiguationRuleLoader } from '../../src/core/disambiguation/DisambiguationRuleLoader.js';

describe('Java bug fixes (unit)', () => {
  // DEV-016
  it('disambiguation example without type is a clean load error (CB-04)', () => {
    const xml = '<rules lang="en"><rule id="R1" name="r"><pattern><token>a</token></pattern><disambig action="remove"><wd pos="NN" lemma="a">a</wd></disambig><example>no type</example></rule></rules>';
    const lang = Languages.getLanguageForShortCode('en-US');
    expect(() => new DisambiguationRuleLoader().getRules(Buffer.from(xml, 'utf8'), lang, 'inline.xml')).toThrow('<example> without type attribute in rule R1');
  });

  // DEV-026
  it('null language model gives no model rules (CB-14)', () => {
    for (const code of ['de-DE', 'en-US', 'fr']) {
      const lang = Languages.getLanguageForShortCode(code);
      expect(lang.getRelevantLanguageModelRules(JLanguageTool.getMessageBundle(lang), null, new UserConfig())).toEqual([]);
    }
  });

  // DEV-027
  it('ShortenedYearRangeChecker with a one-character x ignores the match (CB-15)', () => {
    const args = new Map([['x', '5'], ['y', '6']]);
    expect(new ShortenedYearRangeChecker().acceptRuleMatch('match', args)).toBeNull();
  });

  // DEV-022
  it('wrongly typed or empty rule values keep the defaults (CB-10)', () => {
    const lang = Languages.getLanguageForShortCode('en-US');
    const messages = JLanguageTool.getMessageBundle(lang);
    const config = (id, values) => new UserConfig([], new Map([[id, values]]));
    expect(new LongSentenceRule(messages, config('TOO_LONG_SENTENCE', []), 50).maxWords).toBe(50);
    expect(new LongSentenceRule(messages, config('TOO_LONG_SENTENCE', [true]), 50).maxWords).toBe(50);
    expect(new LongSentenceRule(messages, config('TOO_LONG_SENTENCE', [7]), 50).maxWords).toBe(7);
    expect(new LongParagraphRule(messages, lang, config('TOO_LONG_PARAGRAPH', ['x']), 80).maxWords).toBe(80);
    const de = Languages.getLanguageForShortCode('de-DE');
    const rule = new GermanStyleRepeatedWordRule(JLanguageTool.getMessageBundle(de), de, config('STYLE_REPEATED_WORD_RULE_DE', [1, 1, 'x']));
    expect(typeof rule.testCompoundWords).toBe('boolean');
  });

  // DEV-025
  it('configinfo with empty rule options and Integer min/max for a Float option (CB-13)', () => {
    class Opt extends RuleOption {}
    const lang = Languages.getLanguageForShortCode('en-US');
    const lt0 = new JLanguageTool(lang);
    const all = lt0.getAllRules();
    const [r1, r2] = [all[0], all[1]];
    const origGet = JLanguageTool.prototype.getAllRules;
    r1.getRuleOptions = () => [];
    r2.getRuleOptions = () => [new Opt(typedHash.Float(1.5), 'text')];
    JLanguageTool.prototype.getAllRules = () => [r1, r2];
    try {
      const api = Object.create(ApiV2.prototype);
      api.textChecker = { config: { languageModelDir: null } };
      const json = JSON.parse(api.getConfigurationInfo(lang, new HTTPServerConfig([])));
      const rules = json.rules;
      expect(rules[0].ruleOptions).toBeUndefined();
      expect(rules[1].ruleOptions[0].minConfigurableValue ?? rules[1].ruleOptions[0][RuleOption.MIN_CONF_VALUE]).toBe(0);
    } finally {
      JLanguageTool.prototype.getAllRules = origGet;
      delete r1.getRuleOptions;
      delete r2.getRuleOptions;
    }
  });
});
