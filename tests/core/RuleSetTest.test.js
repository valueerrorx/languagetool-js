// Ported from RuleSetTest (languagetool-core); FakeLanguage replaced by en-US; plain() test is an extra
import { describe, it, expect } from 'vitest';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { PatternTokenBuilder } from '../../src/core/patterns/PatternTokenBuilder.js';
import { csToken, token, tokenRegex, pos } from '../../src/core/patterns/PatternRuleBuilderHelper.js';
import { RuleSet } from '../../src/core/patterns/RuleSet.js';
import { EN } from '../support/ruleTestSupport.js';

// Java: RuleSetTest#sampleSentence
const sampleSentence = new AnalyzedSentence([new AnalyzedTokenReadings(new AnalyzedToken('token', 'pos', 'lemma'))]);

class PlainRule extends Rule {
  getId() { return 'PLAIN'; }

  getDescription() { return ''; }
}

// Java: RuleSetTest#ruleOf(PatternToken)
const ruleOf = (t) => new PatternRule('', EN, [t], '', '', '');

// Java: RuleSetTest#assertRulesForSentence(RuleSet,PatternRule...)
const assertRulesForSentence = (ruleSet, ...expected) => {
  expect(ruleSet.rulesForSentence(sampleSentence)).toEqual(expected);
  const actual = ruleSet.rulesForSentence(sampleSentence);
  expected.forEach((e, i) => expect(actual[i]).toBe(e));
};

describe('RuleSetTest', () => {
  it('plain returns all rules', () => {
    const r = [new PlainRule(), new PlainRule()];
    expect(RuleSet.plain(r).rulesForSentence(sampleSentence)).toEqual(r);
    expect([...RuleSet.plain(r).allRuleIds()]).toEqual(['PLAIN']);
  });

  // Java: RuleSetTest#textHintsAreHonored
  it('textHintsAreHonored', () => {
    let suitable = ruleOf(csToken('token'));
    assertRulesForSentence(RuleSet.textHinted([suitable]), suitable);

    suitable = ruleOf(token('Token'));
    assertRulesForSentence(RuleSet.textHinted([suitable]), suitable);

    suitable = ruleOf(tokenRegex('token|another'));
    assertRulesForSentence(RuleSet.textHinted([suitable]), suitable);

    assertRulesForSentence(RuleSet.textHinted([ruleOf(csToken('unsuitable'))]));
  });

  // Java: RuleSetTest#lemmaHintsAreHonored
  it('lemmaHintsAreHonored', () => {
    let suitable = ruleOf(new PatternTokenBuilder().token('lemma').matchInflectedForms().build());
    assertRulesForSentence(RuleSet.textLemmaHinted([suitable]), suitable);

    suitable = ruleOf(new PatternTokenBuilder().token('Lemma').matchInflectedForms().build());
    assertRulesForSentence(RuleSet.textLemmaHinted([suitable]), suitable);

    suitable = ruleOf(new PatternTokenBuilder().csTokenRegex('lemm[ab]').matchInflectedForms().build());
    assertRulesForSentence(RuleSet.textLemmaHinted([suitable]), suitable);

    const unsuitable = new PatternTokenBuilder().csToken('unsuitable').matchInflectedForms().build();
    assertRulesForSentence(RuleSet.textLemmaHinted([ruleOf(unsuitable)]));

    const unrelated = ruleOf(pos('somePos'));
    assertRulesForSentence(RuleSet.textLemmaHinted([ruleOf(unsuitable), unrelated]), unrelated);
  });

  // Java: RuleSet#hinted(List,boolean) when every rule is classified as hinted but only an unsuitable one: nothing is returned
  it('unsuitable hinted rule is excluded even when it is the only hinted one', () => {
    const unsuitable = ruleOf(csToken('unsuitable'));
    const plain = new PlainRule();
    expect(RuleSet.textHinted([unsuitable, plain]).rulesForSentence(sampleSentence)).toEqual([plain]);
  });
});
