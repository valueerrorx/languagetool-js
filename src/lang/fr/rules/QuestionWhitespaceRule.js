// org.languagetool.rules.fr.QuestionWhitespaceRule
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { isEmpty } from '../../../core/text/StringTools.js';
import { Pattern } from '../../../lib/java/regex/index.js';

// Java: QuestionWhitespaceRule#urlPattern
const urlPattern = Pattern.compile(
  '^(file|s?ftp|finger|git|gopher|hdl|https?|shttp|imap|mailto|mms|nntp|s?news(post|reply)?|prospero|rsync|rtspu|sips?|svn|svn\\+ssh|telnet|wais)$');

const ESPACE_FINE_INSECABLE = ' ';
const NBSP = ' ';

let antiPatternList = null; // Java: static ANTI_PATTERNS (built here on first use)

// Java: QuestionWhitespaceRule#ANTI_PATTERNS
function ANTI_PATTERNS() {
  if (antiPatternList === null) {
    antiPatternList = [[
      // ignore smileys, such as :-)
      new PatternTokenBuilder().tokenRegex('[:;]').build(),
      new PatternTokenBuilder().csToken('-').setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().tokenRegex('[\\(\\)D]').setIsWhiteSpaceBefore(false).build()],
    [ // ignore smileys, such as :)
      new PatternTokenBuilder().tokenRegex('[:;]').build(),
      new PatternTokenBuilder().tokenRegex('[\\(\\)D]').setIsWhiteSpaceBefore(false).build()],
    [ // times like 23:20
      new PatternTokenBuilder().tokenRegex('.*\\d{1,2}').build(), new PatternTokenBuilder().token(':').build(),
      new PatternTokenBuilder().tokenRegex('\\d{1,2}').build()],
    [ // "??"
      new PatternTokenBuilder().tokenRegex('[?!]').build(), new PatternTokenBuilder().tokenRegex('[?!]').build()],
    [ // mac address
      new PatternTokenBuilder().tokenRegex('[a-z0-9]{2}').build(), new PatternTokenBuilder().token(':').build(),
      new PatternTokenBuilder().tokenRegex('[a-z0-9]{2}').build(), new PatternTokenBuilder().token(':').build(),
      new PatternTokenBuilder().tokenRegex('[a-z0-9]{2}').build()],
    [ // csv markup (not sure why we need this, but there were a lot of users ignoring this specific case)
      new PatternTokenBuilder().token(';').build(),
      new PatternTokenBuilder().tokenRegex('.+').setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().token(';').setIsWhiteSpaceBefore(false).build()],
    [ // csv markup (not sure why we need this, but there were a lot of users ignoring this specific case)
      new PatternTokenBuilder().tokenRegex('.+').setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().token(';').setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().tokenRegex('.+').setIsWhiteSpaceBefore(false).build()]];
  }
  return antiPatternList;
}

// Java: QuestionWhitespaceRule
export class QuestionWhitespaceRule extends Rule {
  static FQCN = 'org.languagetool.rules.fr.QuestionWhitespaceRule';

  // Java: QuestionWhitespaceRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: QuestionWhitespaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super();
    super.setCategory(Categories.MISC.getCategory(messages));
    this.antiPatterns = Rule.cacheAntiPatterns(language, ANTI_PATTERNS());
  }

  // Java: QuestionWhitespaceRule#getId()
  getId() {
    return 'FRENCH_WHITESPACE';
  }

  // Java: QuestionWhitespaceRule#getDescription()
  getDescription() {
    return 'Insertion des espaces fines insécables';
  }

  // Java: QuestionWhitespaceRule#isAllowedWhitespaceChar(AnalyzedTokenReadings[],int)
  isAllowedWhitespaceChar(tokens, i) {
    return i >= 0 ? tokens[i].isWhitespace() : false;
  }

  // Java: QuestionWhitespaceRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokens();
    let prevPrevToken = '';
    let prevToken = '';
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      if (tokens[i].isImmunized() || prevToken === '(' || prevToken === '[') {
        prevPrevToken = prevToken;
        prevToken = token;
        continue;
      }
      let msg = null;
      let suggestionText = null;
      let iFrom = i - 1;
      let iTo = i;
      const isPreviousWhitespace = i > 0 ? tokens[i - 1].isWhitespace() : false;
      let prevTokenToChange = prevToken;
      if (isPreviousWhitespace) {
        prevTokenToChange = '';
      }
      if (!this.isAllowedWhitespaceChar(tokens, i - 1)) {
        // Strictly speaking, the character before ?!; should be an "espace fine
        // insécable" (U+202f). In practise, an "espace insécable" (U+00a0) is also
        // often used - or even a common space. Let's accept all - use
        // QuestionWhitespaceStrictRule if this is not strict enough.
        if (token === '?' && prevToken !== '!') {
          msg = "Le point d'interrogation est précédé d'une espace fine insécable.";
          suggestionText = prevTokenToChange + ESPACE_FINE_INSECABLE + '?';
        } else if (token === '!' && prevToken !== '?') {
          msg = "Le point d'exclamation est précédé d'une espace fine insécable.";
          suggestionText = prevTokenToChange + ESPACE_FINE_INSECABLE + '!';
        } else if (token === ';') {
          msg = "Le point-virgule est précédé d'une espace fine insécable.";
          suggestionText = prevTokenToChange + ESPACE_FINE_INSECABLE + ';';
        } else if (token === ':') {
          // Avoid false positive for URL like http://www.languagetool.org.
          const matcherUrl = urlPattern.matcher(prevToken);
          if (!matcherUrl.find()) {
            msg = "Les deux-points sont précédés d'une espace insécable.";
            suggestionText = prevTokenToChange + NBSP + ':';
          }
        } else if (token === '»') {
          if (prevPrevToken === '«') {
            msg = 'Les guillemets sont toujours accompagnés d\'une espace insécable.';
            suggestionText = '«' + NBSP + prevTokenToChange + NBSP + '»';
            iFrom = i - 2;
          } else {
            msg = 'Le guillemet fermant est précédé d\'une espace insécable.';
            suggestionText = prevTokenToChange + NBSP + '»';
          }
        }
      }

      if (prevToken === '«') {
        if (isEmpty(token)) {
          msg = "Le guillemet ouvrant est suivi d'une espace insécable.";
          suggestionText = '«' + NBSP;
          iTo = i - 1;
        } else if (!this.isAllowedWhitespaceChar(tokens, i)) {
          let nextToken = '';
          if (i + 1 < tokens.length) {
            nextToken = tokens[i + 1].getToken();
          }
          if (nextToken !== '»') {
            msg = "Le guillemet ouvrant est suivi d'une espace insécable.";
            if (!tokens[i].isWhitespace()) {
              suggestionText = '«' + NBSP + token;
            } else {
              suggestionText = '«' + NBSP;
            }
          }
        }
      }

      if (msg !== null) {
        const fromPos = tokens[iFrom].getStartPos();
        const toPos = tokens[iTo].getEndPos();
        const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg, 'Insérer une espace insécable');
        ruleMatch.setSuggestedReplacement(suggestionText);
        ruleMatches.push(ruleMatch);
      }
      prevPrevToken = prevToken;
      prevToken = token;
    }

    return this.toRuleMatchArray(ruleMatches);
  }
}
