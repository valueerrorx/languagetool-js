// org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule (rule model only; replace() comes with F32)
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { NullPointerException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { unmodifiableList } from '../../lib/java/collections/Collections.js';
import { notPortedYet } from '../language/components.js';
import { AbstractTokenBasedRule } from '../patterns/AbstractTokenBasedRule.js';
import { Rule } from '../rules/model/Rule.js';

// Java: DisambiguationPatternRule.DisambiguatorAction
export class DisambiguatorAction extends JavaEnum {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule.DisambiguatorAction';
}
['ADD', 'FILTER', 'REMOVE', 'REPLACE', 'UNIFY', 'IMMUNIZE', 'IGNORE_SPELLING', 'FILTERALL', 'ADDCHUNK']
  .forEach((n, i) => { DisambiguatorAction[n] = new DisambiguatorAction(n, i); });

// Java: DisambiguationPatternRule
export class DisambiguationPatternRule extends AbstractTokenBasedRule {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule';
  static DisambiguatorAction = DisambiguatorAction;

  // Java: DisambiguationPatternRule(String,String,Language,List,String,Match,DisambiguatorAction)
  constructor(id, description, language, patternTokens, disambiguatedPOS, posSelect, disambAction) {
    super(id, description, language, patternTokens, true);
    if (disambiguatedPOS === null && posSelect === null
        && disambAction !== DisambiguatorAction.UNIFY
        && disambAction !== DisambiguatorAction.ADD
        && disambAction !== DisambiguatorAction.REMOVE
        && disambAction !== DisambiguatorAction.IMMUNIZE
        && disambAction !== DisambiguatorAction.REPLACE
        && disambAction !== DisambiguatorAction.FILTERALL
        && disambAction !== DisambiguatorAction.IGNORE_SPELLING
        && disambAction !== DisambiguatorAction.ADDCHUNK) {
      throw new NullPointerException('disambiguated POS cannot be null with posSelect == null and ' + disambAction);
    }
    this.disambiguatedPOS = disambiguatedPOS;
    this.matchElement = posSelect;
    this.disAction = Objects.requireNonNull(disambAction);
    this.newTokenReadings = null;
    this.examples = [];
    this.untouchedExamples = [];
    this.setMessage('');
    this.suggestionsOutMsg = '';
  }

  /**
   * Used to add new interpretations.
   */
  // Java: DisambiguationPatternRule#setNewInterpretations(AnalyzedToken[])
  setNewInterpretations(newReadings) {
    this.newTokenReadings = newReadings.slice();
  }

  // Java: DisambiguationPatternRule#replace(AnalyzedSentence)
  replace(sentence) {
    if (this.canBeIgnoredFor(sentence)) return sentence;
    throw notPortedYet('DisambiguationPatternRuleReplacer (F32)');
  }

  // Java: DisambiguationPatternRule#setExamples(List)
  setExamples(examples) {
    this.examples = Objects.requireNonNull(examples);
  }

  // Java: DisambiguationPatternRule#getExamples()
  getExamples() {
    return unmodifiableList(this.examples);
  }

  // Java: DisambiguationPatternRule#setUntouchedExamples(List)
  setUntouchedExamples(untouchedExamples) {
    this.untouchedExamples = Objects.requireNonNull(untouchedExamples);
  }

  // Java: DisambiguationPatternRule#getUntouchedExamples()
  getUntouchedExamples() {
    return unmodifiableList(this.untouchedExamples);
  }

  // Java: DisambiguationPatternRule#getAction()
  getAction() {
    return this.disAction;
  }

  // Java: DisambiguationPatternRule#getNewTokenReadings()
  getNewTokenReadings() {
    return this.newTokenReadings;
  }

  // Java: DisambiguationPatternRule#getMatchElement()
  getMatchElement() {
    return this.matchElement;
  }

  // Java: DisambiguationPatternRule#getDisambiguatedPOS()
  getDisambiguatedPOS() {
    return this.disambiguatedPOS;
  }
}

Rule.disambiguationPatternRuleClass = DisambiguationPatternRule;
