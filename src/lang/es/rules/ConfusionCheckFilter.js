// Java: org.languagetool.rules.es.ConfusionCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { Integer } from '../../../lib/java/int.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { arrayGet, listGet } from '../../../lib/java/arrays.js';
import { javaReplace, toLowerCase, toUpperCase } from '../../../lib/java/strings.js';
import { hasDiacritics, isAllUppercase, isCapitalizedWord, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { ConfusionPairsDataLoader } from './ConfusionPairsDataLoader.js';

const MS = Pattern.compile('NC[MC][SN]000|A..[MC][SN].|V.P..SM');
const FS = Pattern.compile('NC[FC][SN]000|A..[FC][SN].|V.P..SF');
const MP = Pattern.compile('NC[MC][PN]000|A..[MC][PN].|V.P..PM');
const FP = Pattern.compile('NC[FC][PN]000|A..[FC][PN].|V.P..PF');
const CP = Pattern.compile('NC[MFC][PN]000|A..[MFC][PN].|V.P..P.');
const CS = Pattern.compile('NC[MFC][SN]000|A..[MFC][SN].|V.P..S.');

let relevantWords = null; // Java: ConfusionCheckFilter#relevantWords (static, loaded on class init)

// Java: ConfusionCheckFilter
export class ConfusionCheckFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.es.ConfusionCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.ConfusionCheckFilter()' }];

  constructor() {
    super();
    if (relevantWords === null) {
      relevantWords = new ConfusionPairsDataLoader().loadWords('/es/confusion_pairs.txt');
    }
  }

  // Java: ConfusionCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    let desiredGenderNumberPattern = null;
    let replacement = null;
    const postag = this.getRequired('postag', arguments_);
    const originalForm = this.getRequired('form', arguments_);
    const isAllUpper = isAllUppercase(originalForm);
    const isCapitalized = isCapitalizedWord(originalForm);
    const form = toLowerCase(originalForm);
    const gendernumberFrom = this.getOptional('gendernumberFrom', arguments_);
    if (gendernumberFrom !== null) {
      const i = Integer.parseInt(gendernumberFrom);
      if (i < 1 || i > patternTokens.length) {
        throw new IllegalArgumentException(
          'ConfusionCheckFilter: Index out of bounds in ' + match.getRule().getFullId() + ', value: ' + i);
      }
      const atr = arrayGet(patternTokens, i - 1);
      if (atr.matchesPosTagRegex('[NAPD].+MS.*|V.P..SM')) { desiredGenderNumberPattern = MS; }
      else if (atr.matchesPosTagRegex('[NAPD].+MP.*|V.P..PM')) { desiredGenderNumberPattern = MP; }
      else if (atr.matchesPosTagRegex('[NAPD].+FS.*|V.P..SF')) { desiredGenderNumberPattern = FS; }
      else if (atr.matchesPosTagRegex('[NAPD].+FP.*|V.P..PF')) { desiredGenderNumberPattern = FP; }
      else if (atr.matchesPosTagRegex('[NAPD].+CP.*|V.P..P.')) { desiredGenderNumberPattern = CP; }
      else if (atr.matchesPosTagRegex('[NAPD].+CS.*|V.P..S.')) { desiredGenderNumberPattern = CS; }
    }

    if (relevantWords.has(form)) {
      if (relevantWords.get(form).matchesPosTagRegex(postag)) {
        if (desiredGenderNumberPattern !== null) {
          const m = desiredGenderNumberPattern.matcher(relevantWords.get(form).getReadings()[0].getPOSTag());
          if (!m.matches()) {
            return null;
          }
          replacement = relevantWords.get(form).getToken();
        } else if (gendernumberFrom === null) {
          // there is no desired gender number defined
          replacement = relevantWords.get(form).getToken();
        }
      }
    }
    if (replacement !== null) {
      let message = match.getMessage();
      // Change the message if the replacement has no diacritic
      if (!(hasDiacritics(replacement) && !hasDiacritics(form))) {
        message = javaReplace(message, 'se escribe con tilde', 'se escribe de otra manera');
      }
      const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(),
        message, match.getShortMessage());
      ruleMatch.setType(match.getType());
      if (isAllUpper) {
        replacement = toUpperCase(replacement);
      }
      if (isCapitalized) {
        replacement = uppercaseFirstChar(replacement);
      }
      let suggestion = javaReplace(listGet(match.getSuggestedReplacements(), 0), '{suggestion}', replacement);
      suggestion = javaReplace(suggestion, '{Suggestion}', uppercaseFirstChar(replacement));
      suggestion = javaReplace(suggestion, '{SUGGESTION}', toUpperCase(replacement));
      ruleMatch.setSuggestedReplacement(suggestion);
      return ruleMatch;
    }
    return null;
  }
}

registerClass(ConfusionCheckFilter.FQCN, ConfusionCheckFilter);
