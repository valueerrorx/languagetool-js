// org.languagetool.rules.en.AvsAnRule
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { getUrl } from '../../../core/Tools.js';
import { isAllUppercase, isEmpty, isMixedCase, lowercaseFirstCharIfCapitalized, startsWithUppercase } from '../../../core/text/StringTools.js';
import { Character } from '../../../lib/java/Character.js';
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, toLowerCase } from '../../../lib/java/strings.js';
import { getWordsRequiringA, getWordsRequiringAn } from './AvsAnData.js';

const cleanupPattern = Pattern.compile('[^αa-zA-Z0-9.;,:\']');
const delimPattern = Pattern.compile('[-"“\'‘()\\[\\]]+');
const dashQuotePattern = Pattern.compile('[-\']');
const anPrefixes = Pattern.compile('^(unidentif|uni[mn])[a-z]+$', Pattern.CASE_INSENSITIVE);
const anExceptionPrefixes = Pattern.compile('^(eu|one|uni|u[rst][aeiou])[a-z]*$', Pattern.CASE_INSENSITIVE);

// Java: AvsAnRule.Determiner
export class Determiner extends JavaEnum {
  static FQCN = 'org.languagetool.rules.en.AvsAnRule.Determiner';
  static A = new Determiner('A', 0);
  static AN = new Determiner('AN', 1);
  static A_OR_AN = new Determiner('A_OR_AN', 2);
  static UNKNOWN = new Determiner('UNKNOWN', 3);
}

// Java: AvsAnRule#isVowel(char)
function isVowel(c) {
  const lc = Character.toLowerCase(c);
  return lc === 0x61 || lc === 0x65 || lc === 0x69 || lc === 0x6f || lc === 0x75;
}

// Java: AvsAnRule
export class AvsAnRule extends Rule {
  static FQCN = 'org.languagetool.rules.en.AvsAnRule';
  static Determiner = Determiner;

  // Java: AvsAnRule#AvsAnRule(ResourceBundle)
  constructor(messages) {
    super();
    this.setCategory(Categories.MISC.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.setUrl(getUrl('https://languagetool.org/insights/post/indefinite-articles/'));
    this.addExamplePair(Example.wrong('The train arrived <marker>a hour</marker> ago.'),
      Example.fixed('The train arrived <marker>an hour</marker> ago.'));
  }

  // Java: AvsAnRule#getId()
  getId() {
    return 'EN_A_VS_AN';
  }

  // Java: AvsAnRule#getDescription()
  getDescription() {
    return "Use of 'a' vs. 'an'";
  }

  // Java: AvsAnRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 1;
  }

  // Java: AvsAnRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let prevTokenIndex = 0;
    let isSentenceStart;
    let equalsA;
    let equalsAn;
    for (let i = 1; i < tokens.length; i++) { // ignoring token 0, i.e., SENT_START
      const token = tokens[i];
      const prevTokenStr = prevTokenIndex > 0 ? tokens[prevTokenIndex].getToken() : null;
      isSentenceStart = prevTokenIndex === 1;
      if (!isSentenceStart) {
        equalsA = prevTokenStr === 'a';
        equalsAn = prevTokenStr === 'an';
      } else {
        equalsA = prevTokenStr !== null && equalsIgnoreCase('a', prevTokenStr);
        equalsAn = prevTokenStr !== null && equalsIgnoreCase('an', prevTokenStr);
      }
      if (equalsA || equalsAn) {
        const determiner = AvsAnRule.getCorrectDeterminerFor(token);
        let msg = null;
        if (equalsA && determiner === Determiner.AN) {
          const replacement = startsWithUppercase(prevTokenStr) ? 'An' : 'an';
          msg = `Use <suggestion>${replacement}</suggestion> instead of '${prevTokenStr}' if the following ` +
            "word starts with a vowel sound, e.g. 'an article', 'an hour'.";
        } else if (equalsAn && determiner === Determiner.A) {
          const replacement = startsWithUppercase(prevTokenStr) ? 'A' : 'a';
          msg = `Use <suggestion>${replacement}</suggestion> instead of '${prevTokenStr}' if the following ` +
            "word doesn't start with a vowel sound, e.g. 'a sentence', 'a university'.";
        }
        if (msg !== null) {
          const match = new RuleMatch(
            this, sentence, tokens[prevTokenIndex].getStartPos(), tokens[prevTokenIndex].getEndPos(),
            tokens[prevTokenIndex].getStartPos(), token.getEndPos(), msg, 'Wrong article');
          ruleMatches.push(match);
        }
      }
      let nextToken = '';
      if (i + 1 < tokens.length) {
        nextToken = tokens[i + 1].getToken();
      }
      if (token.hasPosTag('DT')) {
        prevTokenIndex = i;
      } else if (nextToken.length > 1 && delimPattern.matcher(token.getToken()).matches()) {
        // skip e.g. the quote in >>an "industry party"<<
      } else {
        prevTokenIndex = 0;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  /**
   * Adds "a" or "an" to the English noun (suggestion of the proper indefinite article).
   */
  // Java: AvsAnRule#suggestAorAn(String)
  suggestAorAn(origWord) {
    const token = new AnalyzedTokenReadings(new AnalyzedToken(origWord, null, null), 0);
    const determiner = AvsAnRule.getCorrectDeterminerFor(token);
    if (determiner === Determiner.A || determiner === Determiner.A_OR_AN) {
      return `a ${lowercaseFirstCharIfCapitalized(origWord)}`;
    } else if (determiner === Determiner.AN) {
      return `an ${lowercaseFirstCharIfCapitalized(origWord)}`;
    }
    return origWord;
  }

  // Java: AvsAnRule#getCorrectDeterminerFor(AnalyzedTokenReadings)
  static getCorrectDeterminerFor(token) {
    if (token === null || token === undefined) {
      throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedTokenReadings.getToken()" because "token" is null');
    }
    let word = token.getToken();
    let determiner = Determiner.UNKNOWN;
    const parts = dashQuotePattern.split(word); // for example, in "one-way" only "one" is relevant
    const anPrefix = anPrefixes.matcher(token.getToken());
    const anExceptionPrefix = anExceptionPrefixes.matcher(token.getToken());
    if (parts.length >= 1 && !equalsIgnoreCase(parts[0], 'a')) { // avoid false alarm on "A-levels are..."
      word = parts[0];
    }
    if (token.isWhitespaceBefore() || word !== '-') { // e.g., 'a- or anti- are prefixes'
      word = cleanupPattern.matcher(word).replaceAll(''); // e.g. >>an "industry party"<<
      if (isEmpty(word)) {
        return Determiner.UNKNOWN;
      }
    }
    if (getWordsRequiringA().has(toLowerCase(word)) || getWordsRequiringA().has(word)) {
      determiner = Determiner.A;
    }
    if (getWordsRequiringAn().has(toLowerCase(word)) || getWordsRequiringAn().has(word)) {
      if (determiner === Determiner.A) {
        determiner = Determiner.A_OR_AN; // e.g. for 'historical'
      } else {
        determiner = Determiner.AN;
      }
    }
    if (determiner === Determiner.UNKNOWN) {
      const tokenFirstChar = word.charCodeAt(0);
      if (isAllUppercase(word) || isMixedCase(word)) {
        // we don't know how all-uppercase words (often abbreviations) are pronounced,
        // so never complain about these
        determiner = Determiner.UNKNOWN;
      } else if (anPrefix.find()) {
        determiner = Determiner.AN;
      } else if (isVowel(tokenFirstChar) && !anExceptionPrefix.find()) {
        determiner = Determiner.AN;
      } else {
        determiner = Determiner.A;
      }
    }
    return determiner;
  }
}
