// org.languagetool.rules.LongSentenceRule
import { Pattern } from '../../lib/java/regex/index.js';
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { castToIntAt } from '../../lib/java/casts.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { Tag } from './model/Tag.js';
import { isNotWordCharacter } from '../text/StringTools.js';

const QUOTED_SENT_END = Pattern.compile('[?!.]["“”„»«]', Pattern.DOTALL);
const SENT_END = Pattern.compile('[?!.]');

const OPENING_QUOTES = ['"', '“', '„', '«', '(', '[', '{', '—'];
const CLOSING_QUOTES = ['"', '”', '“', '»', ')', ']', '}', '—'];

// Java: LongSentenceRule
export class LongSentenceRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.LongSentenceRule';
  static RULE_ID = 'TOO_LONG_SENTENCE';

  // Java: LongSentenceRule(ResourceBundle,UserConfig,int); Java does not call super(messages) here, the class keeps its own messages field
  constructor(messages, userConfig, maxWords) {
    super();
    this.messages = messages;
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setTags([Tag.picky]);
    let tmpMaxWords = maxWords;
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        tmpMaxWords = castToIntAt(cf, 0);
      }
    }
    this.maxWords = tmpMaxWords;
  }

  // Java: LongSentenceRule#getDescription()
  getDescription() {
    return MessageFormat.format(this.messages.getString('long_sentence_rule_desc'), this.maxWords);
  }

  // Java: LongSentenceRule#getId()
  getId() {
    return LongSentenceRule.RULE_ID;
  }

  // Java: LongSentenceRule#isWordCount(String)
  isWordCount(tokenText) {
    if (tokenText.length > 0) {
      return !isNotWordCharacter(tokenText.substring(0, 1));
    }
    return false;
  }

  // Java: LongSentenceRule#getMessage()
  getMessage() {
    return MessageFormat.format(this.messages.getString('long_sentence_rule_msg2'), this.maxWords);
  }

  // Java: LongSentenceRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      if (tokens.length < this.maxWords) { // just a short-circuit
        pos += sentence.getCorrectedTextLength();
        continue;
      }
      if (QUOTED_SENT_END.matcher(sentence.getText()).find()) {
        pos += sentence.getCorrectedTextLength();
        continue;
      }
      const msg = this.getMessage();
      let i = 0;
      const fromPos = [];
      const toPos = [];

      let fromPosToken = null;
      let toPosToken = null;
      let indexOfQuote = -1;
      while (i < tokens.length) {
        let numWords = 0;
        while (i < tokens.length && tokens[i].getToken() !== ':' && tokens[i].getToken() !== ';'
          && tokens[i].getToken() !== '\n' && tokens[i].getToken() !== '\r\n'
          && tokens[i].getToken() !== '\n\r') {
          const token = tokens[i].getToken();
          if (indexOfQuote === -1 && OPENING_QUOTES.includes(token)) {
            indexOfQuote = OPENING_QUOTES.indexOf(token);
          } else if (indexOfQuote > -1 && CLOSING_QUOTES.indexOf(token) === indexOfQuote) {
            indexOfQuote = -1;
          }
          if (this.isWordCount(token) && indexOfQuote === -1) {
            // Get first word token
            if (fromPosToken === null) {
              fromPosToken = tokens[i];
            }
            if (numWords === this.maxWords) {
              // Get last word token
              if (toPosToken === null) {
                for (let j = tokens.length - 1; j >= 0; j--) {
                  if (this.isWordCount(tokens[j].getToken())) {
                    if (tokens.length > j + 1 && SENT_END.matcher(tokens[j + 1].getToken()).matches()) {
                      toPosToken = tokens[j + 1];
                    } else {
                      toPosToken = tokens[j];
                    }
                    break;
                  }
                }
              }
              if (fromPosToken !== null && toPosToken !== null) {
                fromPos.push(fromPosToken.getStartPos());
                toPos.push(toPosToken.getEndPos());
              } else {
                // keep old logic if we could not find word tokens
                fromPos.push(tokens[0].getStartPos());
                toPos.push(tokens[tokens.length - 1].getEndPos());
              }
              break;
            }
            numWords++;
          }
          i++;
        }
        i++;
      }
      for (let j = 0; j < fromPos.length; j++) {
        const ruleMatch = new RuleMatch(this, sentence, pos + fromPos[j], pos + toPos[j], msg);
        ruleMatches.push(ruleMatch);
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: LongSentenceRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }

  // Java: LongSentenceRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(this.maxWords, this.messages.getString('guiLongSentencesText'), 5, 100)];
  }
}
