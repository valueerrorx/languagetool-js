// Ported from EnglishTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Languages } from '../../../src/core/Languages.js';
import { English } from '../../../src/lang/en/language/English.js';
import { Pattern } from '../../../src/lib/java/regex/index.js';
import { AbstractPatternRule } from '../../../src/core/patterns/AbstractPatternRule.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';

const LONG = 3600000;
const METRE = Pattern.compile('.*(kilo|centi|milli)?(me|li)tres?.*');

describe('EnglishTest', () => {
  const base = new LanguageSpecificTest();

  // Java: EnglishTest#testLanguage
  it('testLanguage', () => {
    // NOTE: this text needs to be kept in sync with config.ts -> DEMO_TEXTS:
    const s = 'Write or paste your text here too have it checked continuously. Errors will be underlined in different colours: we will mark seplling errors with red underilnes. Furthermore grammar error\'s are highlighted in yellow. LanguageTool also marks style issues in a reliable manner by underlining them in blue. did you know that you can sea synonyms by double clicking a word? Its a impressively versatile tool, e.g. if youd like to tell a colleague from over sea\'s about what happened at 5 PM in the afternoon on Monday, 27 May 2007.';
    const lang = Languages.getLanguageForShortCode('en-US');
    base.testDemoText(lang, s,
      ['TOO_TO', 'MORFOLOGIK_RULE_EN_US', 'MORFOLOGIK_RULE_EN_US', 'MORFOLOGIK_RULE_EN_US', 'SENT_START_CONJUNCTIVE_LINKING_ADVERB_COMMA', 'APOS_ARE', 'IN_A_X_MANNER', 'UPPERCASE_SENTENCE_START', 'DOUBLE_HYPHEN', 'IT_IS', 'EN_A_VS_AN', 'EN_CONTRACTION_SPELLING', 'OVER_SEAS', 'PM_IN_THE_EVENING', 'EN_DATE_WEEKDAY']);
    base.runTests(lang, null, 'ÆæāýÅåøšùçıčćö');
  }, LONG);

  // Java: EnglishTest#testRepeatedPatternRules
  it('testRepeatedPatternRules', () => {
    const lang = new English();
    const lt = new JLanguageTool(lang);

    let matches = lt.check('Thank you for all your help. Here is another sentence. Thank you so much for all the fish.');
    expect(matches.length, 'Matches when close together').toBe(1);

    matches = lt.check("Thank you for all your help. This is filler. Here are more words. There needs to be a certain distance between sentences so that this doesn't match again. How long does it need to be? The default setting is 350 characters. That's quite a lot. Here are some more words to fill up this text. Here are some more words to fill up this text. Now here are some more words to fill up this text. Thank you so much for all the fish.");
    expect(matches.length, 'No matches when further apart').toBe(0);
  }, LONG);

  // Java: EnglishTest#testMessages
  it('testMessages', () => {
    const lang = Languages.getLanguageForShortCode('en-US');
    const lt = new JLanguageTool(lang);
    for (const rule of lt.getAllRules()) {
      if (rule instanceof AbstractPatternRule) {
        const patternRule = rule;
        const message = patternRule.getMessage();
        let origWord = null;
        let suggWord = null;
        if (message.includes('full stop')) {
          origWord = 'full stop';
          suggWord = 'period';
        }
        if (message.includes('pound sign')) {
          origWord = 'pound sign';
          suggWord = '(ambiguous in en-US, see https://en.wikipedia.org/wiki/Pound_sign)';
        }
        if (message.includes('colour')) {
          origWord = 'colour';
          suggWord = 'color';
        }
        if (message.includes('flavour')) {
          origWord = 'flavour';
          suggWord = 'flavor';
        }
        if (message.includes('theatre')) {
          origWord = 'theatre';
          suggWord = 'theater';
        }
        if (message.includes('centre')) {
          origWord = 'centre';
          suggWord = 'center';
        }
        if (METRE.matcher(message).matches()) {
          origWord = 'metre';
          suggWord = 'meter';
        }
        if (origWord !== null) {
          console.error(`WARNING: Instead of '${origWord}' (en-GB) consider using words that work in all locales (or '${suggWord}' (en-US) if you can't find those) for rule ${patternRule.getFullId()}, message: '${message}'`);
        }
      }
    }
  });
});
