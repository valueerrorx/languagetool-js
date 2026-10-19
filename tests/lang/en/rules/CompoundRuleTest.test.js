// Ported from CompoundRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundRule } from '../../../../src/lang/en/rules/CompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { englishMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('CompoundRuleTest (en)', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language);
  const t = new AbstractCompoundRuleTest();

  // Java: CompoundRuleTest#setUp (@Before)
  beforeEach(() => {
    t.lt = newLt(language);
    t.rule = new CompoundRule(englishMessages(), language, null);
  });

  // Java: CompoundRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    t.check(0, "The software supports case-sensitive search.");
    t.check(0, "He is one-year-old.");
    t.check(0, "If they're educated people, they will know.");
    t.check(0, "Tiffany & Co chairman has to say something important");
    t.check(0, "Another one bites the dust");
    t.check(0, "We well received your email"); 
    t.check(0, "air-to-air");
    t.check(0, "non-party");
    t.check(0, "age-old");
    t.check(0, "able-bodied");
    t.check(0, "non-scientific");
    t.check(0, "This is the first ever green bond by a municipality.");
    t.check(0, "Semi Automatic"); // desired?
    t.check(0, "Night Mare"); // desired?
    t.check(0, "This is a multi-module project."); // #9502
    
    // incorrect sentences:
    t.check(1, "case sensitive", "case-sensitive");
    t.check(1, "Young criminals must be re educated.");
    t.check(1, "And an other one bites the dust");
    t.check(1, "An other one bites the dust");
        
    t.check(1, "good-bye", "goodbye"); //?
    t.check(1, "back-fire", "backfire"); //+
    t.check(1, "back fire", "backfire");
    t.check(1, "air-to air", "air-to-air");
    t.check(1, "air to air", "air-to-air");
    t.check(1, "air to-air", "air-to-air");
    t.check(1, "air to -air", "air-to-air");
    t.check(1, "age old", "age-old");
    t.check(1, "able bodied", "able-bodied");
    t.check(1, "non scientific", "non-scientific", "nonscientific");
    t.check(1, "night-mare", "nightmare");
    t.check(1, "Night-mare", "Nightmare");
    t.check(1, "Night mare", "Nightmare");
    t.check(1, "semi automatic", "semi-automatic", "semiautomatic");
    t.check(1, "Semi automatic", "Semi-automatic", "Semiautomatic");
    t.check(1, "Dev-Ops", "DevOps");
    t.check(1, "Dev Ops", "DevOps");
    t.check(1, "Night-mare", "Nightmare");
    t.check(1, "Play Station", "PlayStation");
    t.check(1, "Play-Station", "PlayStation");
  });
});
