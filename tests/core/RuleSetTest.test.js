// RuleSetTest (languagetool-core): textHintsAreHonored / lemmaHintsAreHonored need PatternRule (F25); block tests use a fake token-based rule class.
import { describe, it, expect, afterEach } from 'vitest';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleSet } from '../../src/core/patterns/RuleSet.js';

// Java: RuleSetTest#sampleSentence
const sampleSentence = new AnalyzedSentence([new AnalyzedTokenReadings(new AnalyzedToken('token', 'pos', 'lemma'))]);

class PlainRule extends Rule {
  getId() { return 'PLAIN'; }

  getDescription() { return ''; }
}

// stands in for AbstractTokenBasedRule with TokenHint {inflected, lowerCaseValues}
class HintedRule extends PlainRule {
  constructor(hints) {
    super();
    this.tokenHints = hints;
  }
}
const hint = (inflected, ...values) => ({ inflected, lowerCaseValues: values });

describe('RuleSetTest', () => {
  afterEach(() => { RuleSet.abstractTokenBasedRuleClass = null; });

  it('plain returns all rules', () => {
    const r = [new PlainRule(), new PlainRule()];
    expect(RuleSet.plain(r).rulesForSentence(sampleSentence)).toEqual(r);
    expect([...RuleSet.plain(r).allRuleIds()]).toEqual(['PLAIN']);
  });

  it('text hints are honored (token-based rules)', () => {
    RuleSet.abstractTokenBasedRuleClass = HintedRule;
    const suitable = new HintedRule([hint(false, 'token', 'another')]);
    const unsuitable = new HintedRule([hint(false, 'unsuitable')]);
    expect(RuleSet.textHinted([suitable]).rulesForSentence(sampleSentence)).toEqual([suitable]);
    expect(RuleSet.textHinted([unsuitable]).rulesForSentence(sampleSentence)).toEqual([]);
    // textHinted ignores inflected hints and takes the first non-inflected one
    const lemmaOnly = new HintedRule([hint(true, 'lemma')]);
    expect(RuleSet.textHinted([lemmaOnly]).rulesForSentence(sampleSentence)).toEqual([lemmaOnly]);
  });

  it('lemma hints are honored and order is kept', () => {
    RuleSet.abstractTokenBasedRuleClass = HintedRule;
    const suitable = new HintedRule([hint(true, 'lemma'), hint(false, 'nope')]);
    const unsuitable = new HintedRule([hint(true, 'unsuitable')]);
    const unrelated = new PlainRule();
    expect(RuleSet.textLemmaHinted([suitable]).rulesForSentence(sampleSentence)).toEqual([suitable]);
    expect(RuleSet.textLemmaHinted([unsuitable, unrelated, suitable]).rulesForSentence(sampleSentence)).toEqual([unrelated, suitable]);
  });
});
