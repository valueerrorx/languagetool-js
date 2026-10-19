// org.languagetool.rules.AbstractWordCoherencyRule
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { equalsIgnoreCase, javaReplaceFirst } from '../../lib/java/strings.js';
import { startsWithUppercase, uppercaseFirstChar } from '../text/StringTools.js';

// Java: AbstractWordCoherencyRule (abstract: getWordMap, getMessage)
export class AbstractWordCoherencyRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractWordCoherencyRule';

  // Java: AbstractWordCoherencyRule#getShortMessage()
  getShortMessage() {
    return null;
  }

  // Java: AbstractWordCoherencyRule(ResourceBundle)
  constructor(messages) {
    super();
    super.setCategory(Categories.MISC.getCategory(messages));
  }

  // Java: AbstractWordCoherencyRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    const shouldNotAppearWord = new Map(); // e.g. aufwändig -> aufwendig
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (const tmpToken of tokens) {
        let token = tmpToken.getToken();
        const readings = tmpToken.getReadings();
        if (readings.length > 0) {
          const baseforms = new JavaHashSet(); // Java: Collectors.toSet() (HashSet iteration order)
          for (const r of readings) baseforms.add(r.getLemma());
          for (const baseform of baseforms) {
            if (baseform !== null) {
              token = baseform;
            }
            const fromPos = pos + tmpToken.getStartPos();
            const toPos = pos + tmpToken.getEndPos();
            if (shouldNotAppearWord.has(token)) {
              const otherSpelling = shouldNotAppearWord.get(token);
              const msg = this.getMessage(token, otherSpelling);
              const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg);
              const marked = sentence.getText().substring(tmpToken.getStartPos(), tmpToken.getEndPos());
              let replacement = this.createReplacement(marked, token, otherSpelling, tmpToken);
              if (startsWithUppercase(tmpToken.getToken())) {
                replacement = uppercaseFirstChar(replacement);
              }
              if (!equalsIgnoreCase(marked, replacement)) { // see https://github.com/languagetool-org/languagetool/issues/3493
                ruleMatch.setSuggestedReplacement(replacement);
                ruleMatches.push(ruleMatch);
              }
              ruleMatch.setShortMessage(this.getShortMessage());
              break;
            } else if (this.getWordMap().has(token)) {
              const shouldNotAppearSet = this.getWordMap().get(token);
              for (const shouldNotAppear of shouldNotAppearSet) {
                shouldNotAppearWord.set(shouldNotAppear, token);
              }
            }
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractWordCoherencyRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }

  // Java: AbstractWordCoherencyRule#createReplacement(String,String,String,AnalyzedTokenReadings)
  createReplacement(marked, token, otherSpelling) {
    return javaReplaceFirst(marked, '(?i)' + token, otherSpelling);
  }
}
