// Java: org.languagetool.rules.es.SpanishRepeatedWordsRule
import { AbstractRepeatedWordsRule } from '../../../core/rules/AbstractRepeatedWordsRule.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { token, csRegex } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { getClassBroker } from '../../../core/resources/LtStatics.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';
import { SpanishSynthesizer } from '../synthesis/SpanishSynthesizer.js';

let wordsToCheck = null; // Java: static wordsToCheck = loadWords("/es/synonyms.txt")

// Java: SpanishRepeatedWordsRule#ANTI_PATTERNS (static field, built here on first use)
function antiPatternList() {
  return [
    [token('también'), csRegex('.+')],
    [csRegex('.+'), token('también')],
    [csRegex('[Aa]ntes|[Dd]espués'), csRegex('de|del')],
    [csRegex('[Tt]ema|TEMA'), csRegex('\\d+|[IXVC]+')],
    [csRegex('[Aa]sí'), token('que')],
  ];
}

// Java: SpanishRepeatedWordsRule
export class SpanishRepeatedWordsRule extends AbstractRepeatedWordsRule {
  static FQCN = 'org.languagetool.rules.es.SpanishRepeatedWordsRule';

  // Java: SpanishRepeatedWordsRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: SpanishRepeatedWordsRule(ResourceBundle)
  constructor(messages) {
    const spanish = getClassBroker().forName('org.languagetool.language.Spanish').getInstance();
    super(messages, spanish);
    if (wordsToCheck === null) wordsToCheck = AbstractRepeatedWordsRule.loadWords('/es/synonyms.txt');
    this.antiPatterns = Rule.cacheAntiPatterns(spanish, antiPatternList());
    super.setTags([Tag.picky]);
    // super.setDefaultTempOff();
  }

  // Java: SpanishRepeatedWordsRule#getMessage()
  getMessage() {
    return 'Esta palabra ya ha aparecido en una de las frases inmediatamente anteriores. Puede usar un sinónimo para hacer más interesante el texto, excepto si la repetición es intencionada.';
  }

  // Java: SpanishRepeatedWordsRule#getDescription()
  getDescription() {
    return 'Sinónimos para palabras repetidas.';
  }

  // Java: SpanishRepeatedWordsRule#getWordsToCheck()
  getWordsToCheck() {
    return wordsToCheck;
  }

  // Java: SpanishRepeatedWordsRule#getShortMessage()
  getShortMessage() {
    return 'Estilo: palabra repetida';
  }

  // Java: SpanishRepeatedWordsRule#getSynthesizer()
  getSynthesizer() {
    return SpanishSynthesizer.INSTANCE;
  }

  // Java: SpanishRepeatedWordsRule#adjustPostag(String)
  adjustPostag(postag) {
    if (postag.includes('CN')) {
      return replaceOnce(postag, 'CN', '..');
    } else if (postag.includes('MS')) {
      return replaceOnce(postag, 'MS', '[MC][SN]');
    } else if (postag.includes('FS')) {
      return replaceOnce(postag, 'FS', '[FC][SN]');
    } else if (postag.includes('MP')) {
      return replaceOnce(postag, 'MP', '[MC][PN]');
    } else if (postag.includes('FP')) {
      return replaceOnce(postag, 'FP', '[FC][PN]');
    } else if (postag.includes('CS')) {
      return replaceOnce(postag, 'CS', '[MC][SN]'); // also F ?
    } else if (postag.includes('CP')) {
      return replaceOnce(postag, 'CP', '[MC][PN]'); // also F ?
    } else if (postag.includes('MN')) {
      return replaceOnce(postag, 'MN', '[MC][SPN]');
    } else if (postag.includes('FN')) {
      return replaceOnce(postag, 'FN', '[FC][SPN]');
    }
    return postag;
  }

  // Java: SpanishRepeatedWordsRule#isException(AnalyzedTokenReadings[],int,boolean,boolean,boolean)
  isException(tokens, i, sentStart, isCapitalized, isAllUppercase) {
    if (isAllUppercase || (isCapitalized && !sentStart)) {
      return true;
    }
    return tokens[i].hasPosTagStartingWith('NP') || tokens[i].hasPosTag('_english_ignore_');
  }
}
