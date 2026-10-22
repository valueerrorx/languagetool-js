// Java: org.languagetool.rules.es.QuestionMarkRule
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { isPunctuationMark } from '../../../core/text/StringTools.js';

// Java: QuestionMarkRule
export class QuestionMarkRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.es.QuestionMarkRule';

  // Java: QuestionMarkRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Typographical);
    this.addExamplePair(Example.wrong('<marker>Qué</marker> pasa?'), Example.fixed('<marker>¿Qué</marker> pasa?'));
  }

  // Java: QuestionMarkRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 1;
  }

  // Java: QuestionMarkRule#getId()
  getId() {
    return 'ES_QUESTION_MARK';
  }

  // Java: QuestionMarkRule#getDescription()
  getDescription() {
    return 'Signos de exclamación / interrogación desparejados';
  }

  // Java: QuestionMarkRule#match(List)
  match(sentences) {
    const matches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      const needsInvQuestionMarkAt = this.hasTokenAtPos('?', tokens);
      const needsInvExclMarkAt = this.hasTokenAtPos('!', tokens);
      if (needsInvQuestionMarkAt > 1 || needsInvExclMarkAt > 1) {
        let hasInvQuestionMark = false;
        let hasInvExlcMark = false;
        let firstToken = null;
        for (let i = 0; i < tokens.length; i++) {
          if (firstToken === null && !tokens[i].isSentenceStart()
              && !isPunctuationMark(tokens[i].getToken())) {
            firstToken = tokens[i];
          }
          if (tokens[i].getToken() === '¿' && i < needsInvQuestionMarkAt) {
            hasInvQuestionMark = true;
          } else if (tokens[i].getToken() === '¡' && i < needsInvExclMarkAt) {
            hasInvExlcMark = true;
          }
          // possibly a sentence end
          if (!tokens[i].isSentenceEnd()
            && ((tokens[i].getToken() === '?' && i > needsInvQuestionMarkAt)
            || (tokens[i].getToken() === '!' && i > needsInvExclMarkAt))) {
            firstToken = null;
          }
          // put the question mark in: ¿de qué... ¿para cuál... ¿cómo...
          if (i > 2 && i + 2 < tokens.length) {
            if (tokens[i - 1].getToken() === ',' && tokens[i].hasPosTag('CC') && tokens[i + 1].hasPosTag('SPS00')
              && (tokens[i + 2].hasPosTagStartingWith('PT') || tokens[i + 2].hasPosTagStartingWith('DT'))) {
              firstToken = tokens[i];
            }
            if (tokens[i - 1].getToken() === ',' && tokens[i].hasPosTag('SPS00')
              && (tokens[i + 1].hasPosTagStartingWith('PT') || tokens[i + 1].hasPosTagStartingWith('DT'))) {
              firstToken = tokens[i];
            }
            if (tokens[i - 1].getToken() === ',' && tokens[i].hasPosTag('CC')
              && (tokens[i + 1].hasPosTagStartingWith('PT') || tokens[i + 1].hasPosTagStartingWith('DT'))) {
              firstToken = tokens[i];
            }
            if (tokens[i - 1].getToken() === ','
              && (tokens[i].hasPosTagStartingWith('PT') || tokens[i].hasPosTagStartingWith('DT'))) {
              firstToken = tokens[i];
            }
            if (tokens[i - 1].getToken() === ',' && tokens[i].hasPosTag('CC')
              && (tokens[i + 1].getToken() === 'no' || tokens[i + 1].getToken() === 'sí')) {
              firstToken = tokens[i];
            }
          }
          if (i > 2 && i < tokens.length) {
            if (tokens[i - 1].getToken() === ','
              && (tokens[i].getToken() === 'no' || tokens[i].getToken() === 'sí'
              || tokens[i].getToken() === 'eh')) {
              firstToken = tokens[i];
            }
          }
        }
        if (firstToken !== null && !firstToken.hasPosTag('_english_ignore_')) {
          let s = null;
          if (needsInvQuestionMarkAt > 1 && needsInvExclMarkAt > 1) {
            // ignore for now, e.g. "¡¿Nunca tienes clases o qué?!"
          } else if (needsInvQuestionMarkAt > 1 && !hasInvQuestionMark) {
            s = '¿';
          } else if (needsInvExclMarkAt > 1 && !hasInvExlcMark) {
            s = '¡';
          }
          if (s !== null) {
            const message = "Símbolo desparejado: Parece que falta un '" + s + "'";
            const match = new RuleMatch(this, sentence, pos + firstToken.getStartPos(),
              pos + firstToken.getEndPos(), message);
            match.setSuggestedReplacement(s + firstToken.getToken());
            matches.push(match);
          }
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: QuestionMarkRule#hasTokenAtPos(String,AnalyzedTokenReadings[])
  hasTokenAtPos(ch, tokens) {
    let i = tokens.length - 1;
    while (i > 0) {
      if (tokens[i].getToken() === ch) {
        if (i < tokens.length - 1 && !tokens[i + 1].isWhitespaceBefore()
          && !isPunctuationMark(tokens[i + 1].getToken())
          && !tokens[i + 1].isWhitespace()) {
          // ignore question marks joined to the next word, as in URLs
        } else {
          return i;
        }
      }
      i--;
    }
    return -1;
  }
}
