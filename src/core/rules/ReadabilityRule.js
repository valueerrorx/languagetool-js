// org.languagetool.rules.ReadabilityRule
import { castToIntAt, d2i } from '../../lib/java/casts.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { RuleOption } from './model/RuleOption.js';
import { Category, CategoryId, Location } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { isParagraphEnd } from '../Tools.js';

const MARK_WORDS = 3;
const MIN_WORDS = 10;

// Java: ReadabilityRule#isVowel(char)
function isVowel(c) {
  return (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u' || c === 'y'
    || c === 'A' || c === 'E' || c === 'I' || c === 'O' || c === 'U' || c === 'Y');
}

// Java: ReadabilityRule
export class ReadabilityRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.ReadabilityRule';

  // Java: ReadabilityRule(ResourceBundle,Language,UserConfig,boolean[,int|boolean[,int,boolean]]); (…,tooEasyTest,boolean) = defaultOn with level -1
  constructor(messages, lang, userConfig, tooEasyTest, level = -1, defaultOn = false) {
    super(messages);
    if (typeof level === 'boolean') {
      defaultOn = level;
      level = -1;
    }
    this.nAllSentences = 0;
    this.nAllWords = 0;
    this.nAllSyllables = 0;
    this.setCategory(new Category(new CategoryId('TEXT_ANALYSIS'), 'Text Analysis', Location.INTERNAL, false));
    this.setLocQualityIssueType(ITSIssueType.Style);
    if (!defaultOn) {
      this.setDefaultOff();
    }
    this.lang = lang;
    this.tooEasyTest = tooEasyTest;
    let tmpLevel = -1;
    if (userConfig !== null && userConfig !== undefined) {
      this.linguServices = userConfig.getLinguServices();
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        tmpLevel = castToIntAt(cf, 0);
      }
    } else {
      this.linguServices = null;
    }
    if (tmpLevel >= 0) {
      this.level = tmpLevel;
    } else if (level >= 0) {
      this.level = level;
    } else {
      this.level = 3;
    }
  }

  // Java: ReadabilityRule#getId() / getId(boolean)
  getId(tooEasyTest = this.tooEasyTest) {
    if (tooEasyTest) {
      return 'READABILITY_RULE_SIMPLE';
    }
    return 'READABILITY_RULE_DIFFICULT';
  }

  // Java: ReadabilityRule#getDescription()
  getDescription() {
    if (this.tooEasyTest) {
      return 'Readability: Too easy text';
    }
    return 'Readability: Too difficult text';
  }

  // Java: ReadabilityRule#getConfigureText()
  getConfigureText() {
    return 'Level of readability 0 (very difficult) to 6 (very easy):';
  }

  // Java: ReadabilityRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(3, this.getConfigureText(), 0, 6)];
  }

  // Java: ReadabilityRule#getAllSentences()
  getAllSentences() {
    return this.nAllSentences;
  }

  // Java: ReadabilityRule#getAllWords()
  getAllWords() {
    return this.nAllWords;
  }

  // Java: ReadabilityRule#getAllSyllables()
  getAllSyllables() {
    return this.nAllSyllables;
  }

  // Java: ReadabilityRule#printMessageLevel(int)
  printMessageLevel(level) {
    let sLevel = null;
    if (level === 0) {
      sLevel = 'Very difficult';
    } else if (level === 1) {
      sLevel = 'Difficult';
    } else if (level === 2) {
      sLevel = 'Fairly difficult';
    } else if (level === 3) {
      sLevel = 'Medium';
    } else if (level === 4) {
      sLevel = 'Fairly easy';
    } else if (level === 5) {
      sLevel = 'Easy';
    } else if (level === 6) {
      sLevel = 'Very easy';
    }
    if (sLevel !== null) {
      return ' {Level ' + level + ': ' + sLevel + '}';
    }
    return '';
  }

  // Java: ReadabilityRule#getMessage(int,int,int,int)
  getMessage(level) {
    let simple;
    let few;
    if (this.tooEasyTest) {
      simple = 'simple';
      few = 'few';
    } else {
      simple = 'difficult';
      few = 'many';
    }
    return 'Readability: The text of this paragraph is too ' + simple + this.printMessageLevel(level) + '. Too '
      + few + ' words per sentence and too ' + few + ' syllables per word.';
  }

  // Java: ReadabilityRule#getReadabilityLevel(double)
  getReadabilityLevel(fre) {
    if (fre < 30) {
      return 0;
    } else if (fre < 50) {
      return 1;
    } else if (fre < 60) {
      return 2;
    } else if (fre < 70) {
      return 3;
    } else if (fre < 80) {
      return 4;
    } else if (fre < 90) {
      return 5;
    }
    return 6;
  }

  // Java: ReadabilityRule#getFleschReadingEase(double,double)
  getFleschReadingEase(asl, asw) {
    return 206.835 - (1.015 * asl) - (84.6 * asw);
  }

  // Java: ReadabilityRule#simpleSyllablesCount(String)
  simpleSyllablesCount(word) {
    if (word.length === 0) {
      return 0;
    }
    if (word.length === 1) {
      return 1;
    }
    let nSyllables = 0;
    let lastDouble = false;
    for (let i = 0; i < word.length - 1; i++) {
      const c = word[i];
      if (isVowel(c)) {
        const cn = word[i + 1];
        if (lastDouble) {
          nSyllables++;
          lastDouble = false;
        } else if (((c === 'e' || c === 'E') && (cn === 'a' || cn === 'o' || cn === 'e' || cn === 'i' || cn === 'y'))
          || ((c === 'a' || c === 'A') && (cn === 'e' || cn === 'i' || cn === 'u'))
          || ((c === 'o' || c === 'O') && (cn === 'o' || cn === 'i' || cn === 'u' || cn === 'a'))
          || ((c === 'u' || c === 'U') && (cn === 'i' || cn === 'a'))
          || ((c === 'i' || c === 'I') && (cn === 'e' || cn === 'o'))) {
          lastDouble = true;
        } else {
          nSyllables++;
          lastDouble = false;
        }
      } else {
        lastDouble = false;
      }
    }
    const c = word[word.length - 1];
    const cl = word[word.length - 2];
    if ((cl === 'e' && (c === 's' || c === 'd')) || (cl === 'u' && c === 'e')) {
      nSyllables--;
    } else if (isVowel(c) && c !== 'e') {
      nSyllables++;
    }
    return nSyllables <= 0 ? 1 : nSyllables;
  }

  // Java: ReadabilityRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let nParagraph = 0;
    this.nAllSentences = 0;
    this.nAllWords = 0;
    this.nAllSyllables = 0;
    let nSentences = 0;
    let nWords = 0;
    let nSyllables = 0;
    let pos = 0;
    let startPos = -1;
    let endPos = -1;
    for (let n = 0; n < sentences.length; n++) {
      const sentence = sentences[n];
      const tokens = sentence.getTokensWithoutWhitespace();
      if (startPos < 0 && tokens.length > 1) {
        startPos = pos + tokens[1].getStartPos();
      }
      if (endPos < 0 && tokens.length > MARK_WORDS) {
        endPos = pos + tokens[MARK_WORDS].getEndPos();
      }
      nSentences++;
      for (const token of tokens) {
        const sToken = token.getToken();
        if (!token.isWhitespace() && !token.isNonWord()) {
          nWords++;
          if (this.linguServices === null) {
            nSyllables += this.simpleSyllablesCount(sToken);
          } else {
            nSyllables += this.linguServices.getNumberOfSyllables(sToken, this.lang.getDefaultLanguageVariant());
          }
        }
      }
      if (isParagraphEnd(sentences, n, this.lang)) {
        if (nWords >= MIN_WORDS) {
          const asl = nWords / nSentences;
          const asw = nSyllables / nWords;
          const fre = this.getFleschReadingEase(asl, asw);
          const rLevel = this.getReadabilityLevel(fre);
          if ((this.tooEasyTest && rLevel > this.level) || (!this.tooEasyTest && rLevel < this.level)) {
            const msg = this.getMessage(rLevel, d2i(fre), d2i(asl), d2i(asw));
            const ruleMatch = new RuleMatch(this, sentence, startPos, endPos, msg);
            ruleMatches.push(ruleMatch);
          }
        }
        this.nAllSentences += nSentences;
        this.nAllWords += nWords;
        this.nAllSyllables += nSyllables;
        nSentences = 0;
        nWords = 0;
        nSyllables = 0;
        startPos = -1;
        endPos = -1;
        nParagraph++;
      }
      pos += sentence.getCorrectedTextLength();
    }
    const asl = this.nAllWords / this.nAllSentences;
    const asw = this.nAllSyllables / this.nAllWords;
    const fre = this.getFleschReadingEase(asl, asw);
    const rLevel = this.getReadabilityLevel(fre);
    if ((nParagraph > 1 && this.tooEasyTest && rLevel > this.level) || (!this.tooEasyTest && rLevel < this.level)) {
      return this.toRuleMatchArray(ruleMatches);
    }
    return this.toRuleMatchArray([]);
  }

  // Java: ReadabilityRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
