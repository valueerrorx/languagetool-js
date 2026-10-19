// org.languagetool.rules.AbstractRepeatedWordsRule
import { Pattern, javaMatches, javaSplit } from '../../lib/java/regex/index.js';
import { RuntimeException } from '../../lib/java/errors.js';
import { javaTrim, toUpperCase } from '../../lib/java/strings.js';
import { decodeUtf8, scannerLines } from '../../lib/java/io.js';
import { TextLevelRule } from './model/TextLevelRule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { SynonymsData } from './SynonymsData.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { JLanguageTool } from '../JLanguageTool.js';
import { isCapitalizedWord, isAllUppercase, toId, uppercaseFirstChar } from '../text/StringTools.js';

const PUNCT_PATTERN = Pattern.compile('\\p{P}');
const HASH_PATTERN = Pattern.compile('#.*');

// Java: AbstractRepeatedWordsRule (abstract: getWordsToCheck, getSynthesizer, getMessage, getShortMessage, getDescription, isException)
export class AbstractRepeatedWordsRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.AbstractRepeatedWordsRule';

  // Java: AbstractRepeatedWordsRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages);
    this.setCategory(Categories.REPETITIONS_STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.ruleId = toUpperCase(language.getShortCode()) + '_' + 'REPEATEDWORDS';
    this.language = language;
  }

  // Java: AbstractRepeatedWordsRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 1;
  }

  // Java: AbstractRepeatedWordsRule#maxWordsDistance()
  maxWordsDistance() {
    return 150;
  }

  // Java: AbstractRepeatedWordsRule#getId()
  getId() {
    return this.ruleId;
  }

  // Java: AbstractRepeatedWordsRule#adjustPostag(String)
  adjustPostag(postag) {
    return postag;
  }

  // Java: AbstractRepeatedWordsRule#match(List)
  match(sentences) {
    const matches = [];
    let wordNumber = 0;
    const wordsLastSeen = new Map();
    let pos = 0;
    let prevSentenceLength = 0;
    for (const sentence of sentences) {
      const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
      pos += prevSentenceLength;
      prevSentenceLength = sentence.getText().length;
      // ignore sentences not ending in period
      const lastToken = tokens[tokens.length - 1].getToken();
      if (lastToken !== '.' && lastToken !== '!' && lastToken !== '?') {
        continue;
      }
      let sentStart = true;
      const lemmasInSentece = [];
      let i = -1;
      for (const atrs of tokens) {
        if (atrs.isImmunized()) {
          continue;
        }
        const token = atrs.getToken();
        if (token.length > 0) {
          wordNumber++;
        }
        const isCapitalized = isCapitalizedWord(token);
        const isAllUpper = isAllUppercase(token);
        i++;
        const isException = token.length === 0 || this.isException(tokens, i, sentStart, isCapitalized, isAllUpper);
        if (sentStart && token.length > 0 && !PUNCT_PATTERN.matcher(token).matches()) {
          sentStart = false;
        }
        if (isException) {
          continue;
        }
        const lemmas = [];
        for (const atr of atrs.getReadings()) {
          const lemma = atr.getLemma();
          lemmas.push(lemma);
          const seenInWordPosition = wordsLastSeen.has(lemma) ? wordsLastSeen.get(lemma) : null;
          if (seenInWordPosition !== null && !lemmasInSentece.includes(lemma)
            && (wordNumber - seenInWordPosition) <= this.maxWordsDistance()) {
            let createMatch = true;
            const postag = this.getWordsToCheck().get(lemma).getPostag();
            if (postag !== null && !javaMatches(atr.getPOSTag(), postag)) {
              createMatch = false;
            }
            const chunk = this.getWordsToCheck().get(lemma).getChunk();
            if (chunk !== null && !atrs.matchesChunkRegex(chunk)) {
              createMatch = false;
            }
            // create match
            if (createMatch) {
              const rulematch = new RuleMatch(this, sentence, pos + atrs.getStartPos(), pos + atrs.getEndPos(),
                this.getMessage(), this.getShortMessage());
              rulematch.setSpecificRuleId(this.ruleId + '_' + toId(lemma, this.language));
              const replacementLemmas = this.getWordsToCheck().get(lemma).getSynonyms();
              for (const replacementLemma of replacementLemmas) {
                let replacements = this.getSynthesizer().synthesize(
                  new AnalyzedToken(token, atr.getPOSTag(), replacementLemma), this.adjustPostag(atr.getPOSTag()), true);
                // if there is no result from the synthesizer, use the lemma as it is (it can be a multiword)
                if (replacements.length === 0) {
                  replacements = [replacementLemma];
                }
                for (let r of replacements) {
                  if (isAllUpper) {
                    r = toUpperCase(r);
                  } else if (isCapitalized) {
                    r = uppercaseFirstChar(r);
                  }
                  rulematch.addSuggestedReplacement(r);
                }
              }
              matches.push(rulematch);
              break;
            }
          }
        }
        // count even if postag/chunk don't match
        for (const lemma of lemmas) {
          if (this.getWordsToCheck().has(lemma)) {
            wordsLastSeen.set(lemma, wordNumber);
            lemmasInSentece.push(lemma);
          }
        }
      }
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: AbstractRepeatedWordsRule#loadWords(String)
  static loadWords(path) {
    const inputStream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
    const map = new Map();
    for (const rawLine of scannerLines(decodeUtf8(inputStream))) {
      const line = javaTrim(HASH_PATTERN.matcher(rawLine).replaceFirst(''));
      if (line.length === 0) {
        continue;
      }
      const mainParts = javaSplit(line, '=');
      let parts = null;
      let postag = null;
      let chunk = null;
      let word;
      if (mainParts.length === 2) {
        parts = javaSplit(mainParts[1], ';');
        word = mainParts[0];
        const wordPosChunk = javaSplit(word, '/');
        word = wordPosChunk[0];
        if (wordPosChunk.length > 1) {
          postag = wordPosChunk[1];
        }
        if (wordPosChunk.length > 2) {
          chunk = wordPosChunk[2];
        }
      } else if (mainParts.length === 1) {
        parts = javaSplit(line, ';');
        word = '';
      } else {
        throw new RuntimeException('Format error in file ' + path + ', line: ' + line);
      }
      if ((word.length === 0 && parts.length < 2) || (word.length > 0 && parts.length < 1)) {
        throw new RuntimeException('Format error in file ' + path + ', line: ' + line);
      }
      if (word.length > 0) {
        if (!map.has(word)) {
          map.set(word, new SynonymsData([...parts], postag, chunk));
        } else {
          throw new RuntimeException('Word found in more than one line. "' + word + '" in line: ' + line);
        }
      } else {
        for (const key of parts) {
          const values = [];
          for (const value of parts) {
            if (value !== key) {
              values.push(value);
            }
          }
          if (!map.has(key)) {
            map.set(key, new SynonymsData(values, postag, chunk));
          } else {
            throw new RuntimeException('Word found in more than one line. "' + key + '" in line: ' + line);
          }
        }
      }
    }
    return map;
  }
}
