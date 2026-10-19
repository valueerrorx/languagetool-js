// org.languagetool.rules.ConvertToSentenceCaseFilter
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace, javaSplit, StringBuilder, toLowerCase, toUpperCase } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { isCapitalizedWord, isNotAllLowercase, uppercaseFirstChar } from '../text/StringTools.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: ConvertToSentenceCaseFilter
export class ConvertToSentenceCaseFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.ConvertToSentenceCaseFilter';

  // Java: ConvertToSentenceCaseFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const ruleMatch = match;
    let firstDone = false;
    const replacement = new StringBuilder();
    const originalStr = new StringBuilder();
    for (let i = patternTokenPos; i < patternTokens.length; i++) {
      if (patternTokens[i].getStartPos() < match.getFromPos() || patternTokens[i].getEndPos() > match.getToPos()) {
        continue;
      }
      let normalizedCase = this.normalizedCase(patternTokens[i]);
      if (i + 1 < patternTokens.length && patternTokens[i + 1].getToken() === '.') {
        if (normalizedCase.length === 1) {
          normalizedCase = toUpperCase(normalizedCase);
        } else if (normalizedCase === 'corp') {
          normalizedCase = 'Corp';
        }
      }
      const tokenString = patternTokens[i].getToken();
      const tokenCapitalized = uppercaseFirstChar(normalizedCase);
      const notFirstDone = !firstDone;
      const notPunctuation = !this.isPunctuation(tokenString); // non-short-circuit & in Java
      if ((notFirstDone && notPunctuation) && tokenString.length !== 0) {
        firstDone = true;
        replacement.append(tokenCapitalized);
        originalStr.append(tokenString);
      } else {
        if (patternTokens[i].isWhitespaceBefore()) {
          replacement.append(' ');
          originalStr.append(' ');
        }
        replacement.append(normalizedCase);
        originalStr.append(tokenString);
      }
    }
    if (replacement.toString() === originalStr.toString()) {
      return null;
    }
    ruleMatch.setSuggestedReplacement(replacement.toString());
    return ruleMatch;
  }

  // Java: ConvertToSentenceCaseFilter#isPunctuation(String) (private)
  isPunctuation(s) {
    return Pattern.matches('\\p{IsPunctuation}', s);
  }

  // Java: ConvertToSentenceCaseFilter#normalizedCase(AnalyzedTokenReadings) (private)
  normalizedCase(atr) {
    let tokenLowercase = toLowerCase(atr.getToken());
    if (atr.hasTypographicApostrophe()) {
      tokenLowercase = javaReplace(tokenLowercase, "'", '’');
    }
    if (this.tokenIsException(tokenLowercase)) {
      // exception: the lemma is "I"
      return tokenLowercase;
    }
    const tokenCapitalized = uppercaseFirstChar(tokenLowercase);
    let lemmaIsCapitalized = false;
    let lemmaIsLowercase = false;
    for (const at of atr) {
      if (at.hasNoTag() || at.getLemma() === null || at.getLemma() === undefined) {
        return tokenCapitalized;
      }
      // for multi-words lemmas, take the first word
      const lemma = arrayGet(javaSplit(at.getLemma(), ' '), 0);
      lemmaIsCapitalized = lemmaIsCapitalized || isCapitalizedWord(lemma);
      lemmaIsLowercase = lemmaIsLowercase || !isNotAllLowercase(lemma);
    }
    if (lemmaIsLowercase) {
      return tokenLowercase;
    }
    if (lemmaIsCapitalized) {
      return tokenCapitalized;
    }
    return atr.getToken();
  }

  // Java: ConvertToSentenceCaseFilter#tokenIsException(String)
  tokenIsException() {
    return false;
  }
}
