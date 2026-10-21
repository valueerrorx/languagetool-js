// org.languagetool.rules.de.StyleRepeatedVeryShortSentences
import { Pattern } from '../../../lib/java/regex/index.js';
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { RuleOption } from '../../../core/rules/model/RuleOption.js';
import { Category, CategoryId, Location } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { isParagraphEnd } from '../../../core/Tools.js';

const MIN_REPEATED = 3;
const MIN_WORDS = 4;
const EXCLUDE_DIRECT_SPEECH = true;

const OPENING_QUOTES = Pattern.compile('["“„»«]');
const ENDING_QUOTES = Pattern.compile('["“”»«]');

// Java: StyleRepeatedVeryShortSentences
export class StyleRepeatedVeryShortSentences extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.StyleRepeatedVeryShortSentences';

  // Java: StyleRepeatedVeryShortSentences(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages);
    this.lang = lang;
    this.minWords = MIN_WORDS;
    this.minRepeated = MIN_REPEATED;
    this.excludeDirectSpeech = EXCLUDE_DIRECT_SPEECH;
    super.setCategory(new Category(new CategoryId('CREATIVE_WRITING'),
      messages.getString('category_creative_writing'), Location.INTERNAL, false));
    this.setDefaultOff();
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.addExamplePair(Example.wrong('Das Auto kam <marker>näher.</marker> Der Hund <marker>schlief.</marker> Die Reifen <marker>quietschten.</marker>'),
      Example.fixed('Das Auto kam näher. Tief und fest schlief der Hund. Die Reifen quietschten.'));
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null) {
        if (cf.length > 0 && cf[0] !== null && cf[0] !== undefined && typeof cf[0] === 'number') {
          this.minRepeated = cf[0];
        }
        if (cf.length > 1 && cf[1] !== null && cf[1] !== undefined && typeof cf[1] === 'number') {
          this.minWords = cf[1];
        }
        if (cf.length > 2 && cf[2] !== null && cf[2] !== undefined && typeof cf[2] === 'boolean') {
          this.excludeDirectSpeech = cf[2];
        }
      }
    }
  }

  // Java: StyleRepeatedVeryShortSentences#match(List)
  match(sentences) {
    const ruleMatches = [];
    if (sentences.length < this.minRepeated) {
      return this.toRuleMatchArray(ruleMatches);
    }
    let pos = 0;
    let nRepeated = 0;
    const startPos = [];
    const endPos = [];
    const repeatedSentences = [];
    let tokens = null;
    let n = -1;
    let nPara = -1;
    let beginnsWithDirectSpeech = false;
    let endsWithDirectSpeech = false;
    for (const sentence of sentences) {
      n++;
      nPara++;
      tokens = sentence.getTokensWithoutWhitespace();
      if (this.excludeDirectSpeech) {
        if (endsWithDirectSpeech) {
          beginnsWithDirectSpeech = true;
        } else {
          beginnsWithDirectSpeech = false;
        }
        for (let i = 0; i < tokens.length; i++) {
          if (!beginnsWithDirectSpeech && OPENING_QUOTES.matcher(tokens[i].getToken()).matches()
              && i < tokens.length - 1 && !tokens[i + 1].isWhitespaceBefore()) {
            beginnsWithDirectSpeech = true;
            endsWithDirectSpeech = true;
          } else if (beginnsWithDirectSpeech && ENDING_QUOTES.matcher(tokens[i].getToken()).matches()
              && i > 1 && !tokens[i].isWhitespaceBefore()) {
            endsWithDirectSpeech = false;
          }
        }
      }
      const paragraphEnd = isParagraphEnd(sentences, n, this.lang);
      if (!beginnsWithDirectSpeech && (!paragraphEnd || nPara > 0) && tokens.length > 3 && tokens.length <= this.minWords + 2) {
        // 3 -> skip one word sentences
        // max tokens: minWords + SENT_START + punctuation mark
        repeatedSentences.push(sentence);
        startPos.push(tokens[tokens.length - 2].getStartPos() + pos);
        endPos.push(tokens[tokens.length - 1].getEndPos() + pos);
        nRepeated++;
      } else {
        if (nRepeated >= this.minRepeated) {
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
      if (paragraphEnd) {
        nPara = -1;
      }
    }
    if (nRepeated >= this.minRepeated) {
      for (let i = 0; i < repeatedSentences.length; i++) {
        const ruleMatch = new RuleMatch(this, repeatedSentences[i], startPos[i], endPos[i], this.getDescription());
        ruleMatches.push(ruleMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: StyleRepeatedVeryShortSentences#minToCheckParagraph()
  minToCheckParagraph() {
    return this.minRepeated;
  }

  // Java: StyleRepeatedVeryShortSentences#getId()
  getId() {
    return 'STYLE_REPEATED_SHORT_SENTENCES';
  }

  // Java: StyleRepeatedVeryShortSentences#getDescription()
  getDescription() {
    return 'Stakkato-Sätze';
  }

  // Java: StyleRepeatedVeryShortSentences#getRuleOptions()
  getRuleOptions() {
    return [
      new RuleOption(MIN_REPEATED, 'Anzahl von kurzen Sätzen hintereinander', 0, 10),
      new RuleOption(MIN_WORDS, 'Maximale Länge eines kurzen Satzes', 0, 10),
      new RuleOption(EXCLUDE_DIRECT_SPEECH, 'Direkte Rede und Zitate ausschließen'),
    ];
  }
}
