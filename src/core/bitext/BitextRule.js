// org.languagetool.rules.bitext.BitextRule (abstract base of rules that compare a source and a target sentence)
import { unmodifiableList } from '../../lib/java/collections/Collections.js';
import { Rule } from '../rules/model/Rule.js';

// Java: BitextRule
export class BitextRule extends Rule {
  static FQCN = 'org.languagetool.rules.bitext.BitextRule';
  // set by bitextRules.js (DifferentLengthRule, SameTranslationRule, DifferentPunctuationRule); avoids an import cycle with the subclasses
  static relevantRules = [];

  #correctExamples = null;
  #incorrectExamples = null;
  #sourceLanguage = null;

  // Java: BitextRule#getRelevantRules()
  static getRelevantRules() {
    return BitextRule.relevantRules;
  }

  // Java: BitextRule#match(AnalyzedSentence) / match(AnalyzedSentence,AnalyzedSentence); subclasses implement the two-argument form
  match(sentence, targetText) {
    if (targetText === undefined) return null;
    throw new Error('abstract');
  }

  // Java: BitextRule#setSourceLanguage(Language)
  setSourceLanguage(lang) {
    this.#sourceLanguage = lang;
  }

  // Java: BitextRule#getSourceLanguage()
  getSourceLanguage() {
    return this.#sourceLanguage;
  }

  // Java: BitextRule#setCorrectBitextExamples(List)
  setCorrectBitextExamples(correctExamples) {
    this.#correctExamples = correctExamples;
  }

  // Java: BitextRule#getCorrectBitextExamples()
  getCorrectBitextExamples() {
    return this.#correctExamples;
  }

  // Java: BitextRule#setIncorrectBitextExamples(List)
  setIncorrectBitextExamples(incorrectExamples) {
    this.#incorrectExamples = unmodifiableList(incorrectExamples);
  }

  // Java: BitextRule#getIncorrectBitextExamples()
  getIncorrectBitextExamples() {
    return this.#incorrectExamples;
  }
}
