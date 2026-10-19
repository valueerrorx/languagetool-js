// org.languagetool.rules.PunctuationMarkAtParagraphEnd
import { Pattern } from '../../lib/java/regex/index.js';
import { Character } from '../../lib/java/Character.js';
import { charAt, javaTrim, toLowerCase, startsWith, equalsIgnoreCase } from '../../lib/java/strings.js';
import { NullPointerException } from '../../lib/java/errors.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { Tag } from './model/Tag.js';
import { isParagraphEnd } from '../Tools.js';
import { WordTokenizer } from '../text/tokenizers/WordTokenizer.js';

const PUNCTUATION_MARKS = ['.', '!', '?', ':', ',', ';'];
const QUOTATION_MARKS = ['„', '»', '«', '"', '”', '″', '’', '‚', '‘', '›', '‹', '′', "'"];
const P_NUMERIC = Pattern.compile('[0-9.]+');
const MAX_URL_LENGTH = 30; // Do not add punctuation after long URLs

// Java: PunctuationMarkAtParagraphEnd#stringEqualsAny(String,String[])
function stringEqualsAny(token, any) {
  for (const s of any) {
    if (token === s) {
      return true;
    }
  }
  return false;
}

// Java: PunctuationMarkAtParagraphEnd#isQuotationMark(AnalyzedTokenReadings)
function isQuotationMark(tk) {
  return stringEqualsAny(tk.getToken(), QUOTATION_MARKS);
}

// Java: PunctuationMarkAtParagraphEnd#isPunctuationMark(AnalyzedTokenReadings)
function isPunctuationMark(tk) {
  return stringEqualsAny(tk.getToken(), PUNCTUATION_MARKS);
}

// Java: PunctuationMarkAtParagraphEnd#isWord(AnalyzedTokenReadings)
function isWord(tk) {
  return Character.isLetter(charAt(tk.getToken(), 0));
}

// Java: PunctuationMarkAtParagraphEnd#isNumeric(String)
function isNumeric(s) {
  return P_NUMERIC.matcher(javaTrim(s)).matches();
}

// Java: PunctuationMarkAtParagraphEnd
export class PunctuationMarkAtParagraphEnd extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.PunctuationMarkAtParagraphEnd';

  // Java: PunctuationMarkAtParagraphEnd(ResourceBundle,Language[,boolean])
  constructor(messages, lang, defaultActive = true) {
    super(messages);
    if (lang === null || lang === undefined) throw new NullPointerException();
    this.lang = lang;
    this.setCategory(Categories.PUNCTUATION.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.setTags([Tag.picky]);
    if (!defaultActive) {
      this.setDefaultOff();
    }
  }

  // Java: PunctuationMarkAtParagraphEnd#getId()
  getId() {
    return 'PUNCTUATION_PARAGRAPH_END';
  }

  // Java: PunctuationMarkAtParagraphEnd#getDescription()
  getDescription() {
    return this.messages.getString('punctuation_mark_paragraph_end_desc');
  }

  // Java: PunctuationMarkAtParagraphEnd#isIgnoredParagraph(AnalyzedSentence)
  isIgnoredParagraph() {
    return false;
  }

  // Java: PunctuationMarkAtParagraphEnd#match(List)
  match(sentences) {
    const ruleMatches = [];
    let lastPara = -1;
    let pos = 0;
    let isFirstWord;
    for (let n = 0; n < sentences.length; n++) {
      const sentence = sentences[n];
      if (isParagraphEnd(sentences, n, this.lang)) {
        const tokens = sentence.getTokensWithoutWhitespace();
        if (tokens.length > 2) {
          isFirstWord = (isWord(tokens[1]) && !isPunctuationMark(tokens[2]))
            || (tokens.length > 3 && isQuotationMark(tokens[1]) && isWord(tokens[2]) && !isPunctuationMark(tokens[3]));
          // ignore sentences like "2.2.2. This is an item" (two sentences, first sentence only numbers)
          let ignoreSentence = false;
          if (n === 1 && isNumeric(sentences[0].getText())) {
            ignoreSentence = true;
          }
          if (n > 0 && isNumeric(sentences[n - 1].getText())) {
            ignoreSentence = true;
          }
          // paragraphs containing less than two sentences (e.g. headlines, listings) are excluded from rule
          if (n - lastPara > 1 && isFirstWord && !ignoreSentence && !this.isIgnoredParagraph(sentences[lastPara + 1])) {
            let lastNWToken = tokens.length - 1;
            while (tokens[lastNWToken].isLinebreak()) {
              lastNWToken--;
            }
            if (equalsIgnoreCase(tokens[tokens.length - 2].getToken(), ':')
              && WordTokenizer.isUrl(tokens[tokens.length - 1].getToken())) {
              // e.g. "find it at: http://example.com" should not be an error
              lastPara = n;
              pos += sentence.getText().length;
              continue;
            }
            const lastToken = tokens[lastNWToken].getToken();
            if ((lastToken.length > MAX_URL_LENGTH && startsWith(toLowerCase(lastToken), 'http')) || startsWith(toLowerCase(lastToken), 'ftp')) {
              continue;
            }
            if (isWord(tokens[lastNWToken])
              || (isQuotationMark(tokens[lastNWToken]) && isWord(tokens[lastNWToken - 1]))) {
              const fromPos = pos + tokens[lastNWToken].getStartPos();
              const toPos = pos + tokens[lastNWToken].getEndPos();
              const ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, this.messages.getString('punctuation_mark_paragraph_end_msg'));
              const replacements = [];
              for (const mark of PUNCTUATION_MARKS) {
                replacements.push(tokens[lastNWToken].getToken() + mark);
              }
              ruleMatch.setSuggestedReplacements(replacements);
              ruleMatches.push(ruleMatch);
            }
          }
        }
        lastPara = n;
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: PunctuationMarkAtParagraphEnd#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
