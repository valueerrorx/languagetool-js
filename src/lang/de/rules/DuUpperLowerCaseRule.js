// org.languagetool.rules.de.DuUpperLowerCaseRule
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';
import { equalsAny, isAllUpperCase } from '../../../lib/java/StringUtils.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { startsWithUppercase, uppercaseFirstChar, lowercaseFirstChar } from '../../../core/text/StringTools.js';

// Java: DuUpperLowerCaseRule#lowerWords
const lowerWords = new Set(['du', 'dir', 'dich', 'dein', 'deine', 'deines', 'deins', 'deiner', 'deinen', 'deinem',
  'euch', 'euer', 'eure', 'euere', 'euren', 'eueren', 'euern', 'eurer', 'euerer',
  'eurem', 'euerem', 'eures', 'eueres']);

// Java: DuUpperLowerCaseRule
export class DuUpperLowerCaseRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.DuUpperLowerCaseRule';

  // Java: DuUpperLowerCaseRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.CASING.getCategory(messages));
    this.addExamplePair(Example.wrong('Wie geht es Dir? Bist <marker>du</marker> wieder gesund?'),
      Example.fixed('Wie geht es Dir? Bist <marker>Du</marker> wieder gesund?'));
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/duzen-grossgeschrieben/'));
  }

  // Java: DuUpperLowerCaseRule#getId()
  getId() {
    return 'DE_DU_UPPER_LOWER';
  }

  // Java: DuUpperLowerCaseRule#getDescription()
  getDescription() {
    return 'Einheitliche Verwendung von Du/du, Dir/dir etc.';
  }

  // Java: DuUpperLowerCaseRule#match(List)
  match(sentences) {
    let firstUse = null;
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (let i = 0; i < tokens.length; i++) {
        if (i > 0 && (tokens[i - 1].isSentenceStart() || equalsAny(tokens[i - 1].getToken(), '"', '„', '‚', ':', '»', '«', '“', '-', '–', '*', '•', '\\u2063', '\\u25E6', '\\u00B7'))) {
          continue;
        }
        const token = tokens[i];
        const word = token.getToken();
        const lcWord = toLowerCase(word);
        if (lowerWords.has(lcWord)) {
          if (firstUse === null) {
            firstUse = word;
          } else {
            const firstUseIsUpper = startsWithUppercase(firstUse);
            let msg = null;
            let replacement = null;
            if (firstUseIsUpper && !startsWithUppercase(word)) {
              replacement = uppercaseFirstChar(word);
              msg = "Vorher wurde bereits '" + firstUse + "' großgeschrieben. "
                + "Aus Gründen der Einheitlichkeit '" + replacement + "' hier auch großschreiben?";
            } else if (!firstUseIsUpper && startsWithUppercase(word) && !isAllUpperCase(word)) {
              replacement = lowercaseFirstChar(word);
              msg = "Vorher wurde bereits '" + firstUse + "' kleingeschrieben. "
                + "Aus Gründen der Einheitlichkeit '" + replacement + "' hier auch kleinschreiben?";
            }
            if (msg !== null) {
              const ruleMatch = new RuleMatch(this, sentence, pos + token.getStartPos(), pos + token.getEndPos(), msg);
              ruleMatch.setSuggestedReplacement(replacement);
              ruleMatches.push(ruleMatch);
            }
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: DuUpperLowerCaseRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
