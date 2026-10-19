// Ported from EnglishWrongWordInContextRuleTest (en-US, no-op disambiguation: F32 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../src/core/Languages.js';
import { EnglishWrongWordInContextRule } from '../../../src/lang/en/rules/EnglishWrongWordInContextRule.js';
import { newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('EnglishWrongWordInContextRuleTest', () => {
  const lang = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(lang);
  const lt = newLt(lang);
  const rule = new EnglishWrongWordInContextRule(null, lang);
  const assertGood = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(0);
  const assertBad = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(1);

  // Java: EnglishWrongWordInContextRuleTest#testRule
  it('testRule', () => {
    // prescribe/proscribe
    assertBad("I have proscribed you a course of antibiotics.");
    assertGood("I have prescribed you a course of antibiotics.");
    assertGood("Name one country that does not proscribe theft.");
    assertBad("Name one country that does not prescribe theft.");
    expect(rule.match(lt.getAnalyzedSentence("I have proscribed you a course of antibiotics."))[0].getSuggestedReplacements()[0]).toBe("prescribed");
    // herion/heroine
    assertBad("We know that heroine is highly addictive.");
    assertGood("He wrote about his addiction to heroin.");
    assertGood("A heroine is the principal female character in a novel.");
    assertBad("A heroin is the principal female character in a novel.");
    // bizarre/bazaar
    assertBad("What a bazaar behavior!");
    assertGood("I bought these books at the church bazaar.");
    assertGood("She has a bizarre haircut.");
    assertBad("The Saturday morning bizarre is worth seeing even if you buy nothing.");
    // bridal/bridle
    assertBad("The bridle party waited on the lawn.");
    assertGood("Forgo the champagne treatment a bridal boutique often provides.");
    assertGood("He sat there holding his horse by the bridle.");
    assertBad("Each rider used his own bridal.");
    // desert/dessert
    assertBad("They have some great deserts on this menu.");
    assertGood("They have some great desserts on this menu.");
    // statute/statue
    assertBad("They have some great marble statutes.");
    assertGood("They have a great marble statue.");
    // neutron/neuron
    assertGood("Protons and neutrons");
    assertBad("Protons and neurons");
    // hangar / hanger
    // neutron/neuron
    assertBad("The plane taxied to the hanger.");
    assertGood("The plane taxied to the hangar.");
  });
});
