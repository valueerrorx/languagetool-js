// Ported from EnglishPatternRuleTest (en module); testRules runs the English variants only (Java also runs the core test language xx, covered by DemoPatternRuleTest)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { AmericanEnglish } from '../../../src/lang/en/language/AmericanEnglish.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';

const LONG = 3600000;

// Java: EnglishPatternRuleTest.L2GermanRulesOnlyEnglish
class L2GermanRulesOnlyEnglish extends AmericanEnglish {
  // Java: L2GermanRulesOnlyEnglish() (super(true))
  constructor() {
    super(true);
  }

  // Java: L2GermanRulesOnlyEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    return [];
  }

  // Java: L2GermanRulesOnlyEnglish#getRuleFileNames()
  getRuleFileNames() {
    return ['/org/languagetool/rules/en/grammar-l2-de.xml'];
  }
}

// Java: EnglishPatternRuleTest.L2FrenchRulesOnlyEnglish
class L2FrenchRulesOnlyEnglish extends AmericanEnglish {
  // Java: L2FrenchRulesOnlyEnglish() (super(true))
  constructor() {
    super(true);
  }

  // Java: L2FrenchRulesOnlyEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    return [];
  }

  // Java: L2FrenchRulesOnlyEnglish#getRuleFileNames()
  getRuleFileNames() {
    return ['/org/languagetool/rules/en/grammar-l2-fr.xml'];
  }
}

describe('EnglishPatternRuleTest', () => {
  // Java: EnglishPatternRuleTest#testRules (PatternRuleTest#runGrammarRulesFromXmlTest restricted to the English languages)
  it('testRules', async () => {
    const t = new PatternRuleTest();
    for (const lang of Languages.get()) {
      if (lang.getShortCode() === 'en') await t.runGrammarRuleForLanguage(lang);
      await new Promise((resolve) => setImmediate(resolve)); // lets the vitest worker answer its RPC calls between the long synchronous runs
    }
    t.ruleErrors.verify();
  }, LONG);

  // Java: EnglishPatternRuleTest#testL2Languages
  it('testL2Languages', async () => {
    const t = new PatternRuleTest();
    t.validatePatternFileNames(['en/grammar-l2-de.xml']);
    t.validatePatternFileNames(['en/grammar-l2-fr.xml']);
    await t.runTestForLanguage(new L2GermanRulesOnlyEnglish());
    await t.runTestForLanguage(new L2FrenchRulesOnlyEnglish());
    t.ruleErrors.verify();
  }, LONG);

  // Java: EnglishPatternRuleTest#testBug; used to cause an ArrayIndexOutOfBoundsException in MatchState.setToken()
  it('testBug', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('en'));
    lt.check('Alexander between 369 and 358 BC\n\nAlexander');
  }, LONG);
});
