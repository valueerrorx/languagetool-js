// org.languagetool.rules.de.StyleRepeatedSentenceBeginning
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Category, CategoryId, Location } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';

const MIN_REPEATED = 3;

// Java: StyleRepeatedSentenceBeginning
export class StyleRepeatedSentenceBeginning extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.StyleRepeatedSentenceBeginning';

  // Java: StyleRepeatedSentenceBeginning(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(new Category(new CategoryId('CREATIVE_WRITING'),
      messages.getString('category_creative_writing'), Location.INTERNAL, false));
    this.setDefaultOff();
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.addExamplePair(Example.wrong('<marker>Das Auto</marker> kam näher. <marker>Der Hund</marker> lief langsam über die Straße. <marker>Die Reifen</marker> quietschten.'),
      Example.fixed('Das Auto kam näher. Langsam lief der Hund über die Straße. Die Reifen quietschten.'));
  }

  // Java: StyleRepeatedSentenceBeginning#match(List)
  match(sentences) {
    const ruleMatches = [];
    if (sentences.length < MIN_REPEATED) {
      return this.toRuleMatchArray(ruleMatches);
    }
    const startPos = [];
    const endPos = [];
    const repeatedSentences = [];
    let pos = 0;
    let nRepeated = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      if (tokens[1].hasPosTagStartingWith('ART:DEF:NOM') || tokens[1].hasPosTagStartingWith('ART:IND:NOM')) {
        let noSub = true;
        for (let i = 2; i < tokens.length && !tokens[i].hasPosTagStartingWith('VER'); i++) {
          if (tokens[i].hasPosTagStartingWith('SUB')) {
            noSub = false;
            endPos.push(tokens[i].getEndPos() + pos);
            break;
          }
        }
        if (noSub) {
          endPos.push(tokens[1].getEndPos() + pos);
        }
        repeatedSentences.push(sentence);
        startPos.push(tokens[1].getStartPos() + pos);
        nRepeated++;
      } else if (tokens[1].hasPosTagStartingWith('PRO:PER:NOM')) {
        repeatedSentences.push(sentence);
        startPos.push(tokens[1].getStartPos() + pos);
        endPos.push(tokens[1].getEndPos() + pos);
        nRepeated++;
      } else {
        if (nRepeated >= MIN_REPEATED) {
          for (let i = 0; i < repeatedSentences.length; i++) {
            const ruleMatch = new RuleMatch(this, repeatedSentences[i], startPos[i], endPos[i], this.getDescription());
            ruleMatches.push(ruleMatch);
          }
        }
        repeatedSentences.length = 0;
        startPos.length = 0;
        endPos.length = 0;
        nRepeated = 0;
      }
      pos += sentence.getCorrectedTextLength();
    }
    if (nRepeated >= MIN_REPEATED) {
      for (let i = 0; i < repeatedSentences.length; i++) {
        const ruleMatch = new RuleMatch(this, repeatedSentences[i], startPos[i], endPos[i], this.getDescription());
        ruleMatches.push(ruleMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: StyleRepeatedSentenceBeginning#minToCheckParagraph()
  minToCheckParagraph() {
    return MIN_REPEATED;
  }

  // Java: StyleRepeatedSentenceBeginning#getId()
  getId() {
    return 'STYLE_REPEATED_SENTENCE_BEGINNING';
  }

  // Java: StyleRepeatedSentenceBeginning#getDescription()
  getDescription() {
    return 'Subjekt als wiederholter Satzanfang';
  }
}
