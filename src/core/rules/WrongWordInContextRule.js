// org.languagetool.rules.WrongWordInContextRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Category, CategoryIds } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { SpecificIdRule } from './SpecificIdRule.js';
import { Pattern, Matcher } from '../../lib/java/regex/index.js';
import { Locale } from '../../lib/java/Locale.js';
import { decodeUtf8, scannerLines } from '../../lib/java/io.js';
import { javaReplace, javaReplaceFirst, javaSplit, javaTrim, toLowerCase } from '../../lib/java/strings.js';
import { JLanguageTool } from '../JLanguageTool.js';
import { preserveCase, toId } from '../text/StringTools.js';

// Java: WrongWordInContextRule#cache (LoadingCache by path; the 30 minute expiry is not observable: resources never change)
const cache = new Map();

// Java: WrongWordInContextRule (abstract: getFilename, getMessageString, getShortMessageString, getLongMessageString)
export class WrongWordInContextRule extends Rule {
  static FQCN = 'org.languagetool.rules.WrongWordInContextRule';

  // Java: WrongWordInContextRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super();
    this.matchLemmas = false;
    super.setCategory(new Category(CategoryIds.CONFUSED_WORDS, this.getCategoryString()));
    const path = this.getFilename();
    if (!cache.has(path)) cache.set(path, WrongWordInContextRule.loadContextWords(path));
    this.contextWordsSet = cache.get(path);
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.lang = lang;
  }

  // Java: WrongWordInContextRule#getCategoryString()
  getCategoryString() {
    return this.messages.getString('category_misc');
  }

  // Java: WrongWordInContextRule#getId()
  getId() {
    return 'WRONG_WORD_IN_CONTEXT';
  }

  // Java: WrongWordInContextRule#getDescription()
  getDescription() {
    return 'Confusion of words';
  }

  // Java: WrongWordInContextRule#setMatchLemmmas()
  setMatchLemmmas() {
    this.matchLemmas = true;
  }

  // Java: WrongWordInContextRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    const sentenceLower = toLowerCase(sentence.getText(), Locale.ROOT);
    for (const contextWords of this.contextWordsSet) {
      if (!contextWords.couldMatchSentence(sentenceLower)) {
        continue;
      }
      const matchedWord = [false, false];
      const matchers = [contextWords.words[0].matcher(''), contextWords.words[1].matcher('')];
      let matchedPos0 = -1;
      let matchedPos1 = -1;
      let token1 = '';
      let token2 = '';
      // search for word1 and word2 in a single pass, ignoring token 0 (SENT_START)
      for (let k = 1; k < tokens.length && (!matchedWord[0] || !matchedWord[1]); k++) {
        if (!tokens[k].hasPartialPosTag('IS_URL')) {
          const t = tokens[k].getToken();
          if (!matchedWord[0] && matchers[0].reset(t).find()) {
            matchedWord[0] = true;
            matchedPos0 = k;
            token1 = t;
          }
          if (!matchedWord[1] && matchers[1].reset(t).find()) {
            matchedWord[1] = true;
            matchedPos1 = k;
            token2 = t;
          }
        }
      }
      let foundWord = -1;
      let notFoundWord = -1;
      let startPos = 0;
      let endPos = 0;
      let matchedToken = '';
      // when both words have been found, we cannot determine if one of them is wrong
      if (matchedWord[0] && !matchedWord[1]) {
        foundWord = 0;
        notFoundWord = 1;
        startPos = tokens[matchedPos0].getStartPos();
        endPos = tokens[matchedPos0].getStartPos() + token1.length;
        matchedToken = token1;
      } else if (matchedWord[1] && !matchedWord[0]) {
        foundWord = 1;
        notFoundWord = 0;
        startPos = tokens[matchedPos1].getStartPos();
        endPos = tokens[matchedPos1].getStartPos() + token2.length;
        matchedToken = token2;
      }

      if (foundWord !== -1) {
        const matchedContext = [false, false];
        matchers[foundWord] = contextWords.contexts[foundWord].matcher('');
        matchers[notFoundWord] = contextWords.contexts[notFoundWord].matcher('');
        // search for both context patterns in a single pass, ignoring token 0 (SENT_START)
        for (let k = 1; k < tokens.length && (!matchedContext[foundWord] || !matchedContext[notFoundWord]); k++) {
          if (this.matchLemmas) {
            for (let j = 0; j < tokens[k].getReadingsLength() && (!matchedContext[foundWord] || !matchedContext[notFoundWord]); j++) {
              const lemma = tokens[k].getAnalyzedToken(j).getLemma();
              if (lemma !== null && lemma.length > 0) {
                if (!matchedContext[foundWord]) {
                  matchedContext[foundWord] = matchers[foundWord].reset(lemma).find();
                }
                if (!matchedContext[notFoundWord]) {
                  matchedContext[notFoundWord] = matchers[notFoundWord].reset(lemma).find();
                }
              }
            }
          } else {
            const token = tokens[k].getToken();
            if (!matchedContext[foundWord]) {
              matchedContext[foundWord] = matchers[foundWord].reset(token).find();
            }
            if (!matchedContext[notFoundWord]) {
              matchedContext[notFoundWord] = matchers[notFoundWord].reset(token).find();
            }
          }
        }
        if (matchedContext[notFoundWord] && !matchedContext[foundWord]) {
          const originalStr = contextWords.matches[foundWord];
          const replacementStr = contextWords.matches[notFoundWord];
          const repl = preserveCase(javaReplaceFirst(matchedToken, '(?i)' + originalStr, replacementStr), matchedToken);
          const msg = this.getMessage(matchedToken, repl, contextWords.explanations[notFoundWord], contextWords.explanations[foundWord]);
          const id = toId(this.getId() + '_' + matchedToken + '_' + repl, this.lang);
          const desc = javaReplace(this.getDescription(), '$match', matchedToken + '/' + repl);
          const specificIdRule = new SpecificIdRule(id, desc, this.isPremium(), this.getCategory(), this.getLocQualityIssueType(), this.getTags());
          const ruleMatch = new RuleMatch(specificIdRule, sentence, startPos, endPos, msg, this.getShortMessageString());
          ruleMatches.push(ruleMatch);
        }
      } // if foundWord != -1
    } // for each contextWords in contextWordsSet
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: WrongWordInContextRule#getMessage(String,String,String,String)
  getMessage(wrongWord, suggestion, explanationSuggestion, explanationWrongWord) {
    const quotedSuggestion = Matcher.quoteReplacement(suggestion);
    const quotedWrongWord = Matcher.quoteReplacement(wrongWord);
    const quotedExplanationSuggestion = Matcher.quoteReplacement(explanationSuggestion);
    const quotedExplanationWrongWord = Matcher.quoteReplacement(explanationWrongWord);
    if (explanationSuggestion.length === 0 || explanationWrongWord.length === 0) {
      return javaReplaceFirst(javaReplaceFirst(this.getMessageString(), '\\$SUGGESTION', quotedSuggestion),
        '\\$WRONGWORD', quotedWrongWord);
    }
    return javaReplaceFirst(javaReplaceFirst(javaReplaceFirst(javaReplaceFirst(this.getLongMessageString(),
      '\\$SUGGESTION', quotedSuggestion),
    '\\$WRONGWORD', quotedWrongWord),
    '\\$EXPLANATION_SUGGESTION', quotedExplanationSuggestion),
    '\\$EXPLANATION_WRONGWORD', quotedExplanationWrongWord);
  }

  // Java: WrongWordInContextRule#loadContextWords(String)
  static loadContextWords(path) {
    const set = [];
    const stream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
    for (const line of scannerLines(decodeUtf8(stream))) {
      if (javaTrim(line).length === 0 || line.charAt(0) === '#') {
        continue;
      }
      const column = javaSplit(line, '\t');
      if (column.length >= 6) {
        const contextWords = new ContextWords();
        contextWords.setWord(0, column[0]);
        contextWords.setWord(1, column[1]);
        contextWords.matches[0] = column[2];
        contextWords.matches[1] = column[3];
        contextWords.setContext(0, column[4]);
        contextWords.setContext(1, column[5]);
        if (column.length > 6) {
          contextWords.explanations[0] = column[6];
          if (column.length > 7) {
            contextWords.explanations[1] = column[7];
          }
        }
        set.push(contextWords);
      } // if (column.length >= 6)
    }
    return Object.freeze(set);
  }
}

const MIN_PREFIX_LENGTH = 3; // Java: ContextWords#MIN_PREFIX_LENGTH

// Java: WrongWordInContextRule.ContextWords
class ContextWords {
  // Java: ContextWords()
  constructor() {
    this.matches = ['', ''];
    this.explanations = ['', ''];
    this.words = [null, null];
    this.contexts = [null, null];
    this.wordPrefixes = ['', ''];
  }

  // Java: ContextWords#addBoundaries(String)
  addBoundaries(str) {
    let ignoreCase = '';
    if (str.startsWith('(?i)')) {
      str = str.substring(4);
      ignoreCase = '(?i)';
    }
    return ignoreCase + '\\b(' + str + ')\\b';
  }

  // Java: ContextWords#setWord(int,String)
  setWord(i, word) {
    this.words[i] = Pattern.compile(this.addBoundaries(word));
    let pattern = word;
    if (pattern.startsWith('(?i)')) {
      pattern = pattern.substring(4);
    } else if (pattern.startsWith('(?-i)')) {
      pattern = pattern.substring(5);
    }
    this.wordPrefixes[i] = ContextWords.extractWordPrefix(pattern);
  }

  // Java: ContextWords#setContext(int,String)
  setContext(i, context) {
    this.contexts[i] = Pattern.compile(this.addBoundaries(context));
  }

  // Java: ContextWords#couldMatchSentence(String)
  couldMatchSentence(sentenceLower) {
    const word0Could = this.wordPrefixes[0].length === 0 || sentenceLower.includes(this.wordPrefixes[0]);
    const word1Could = this.wordPrefixes[1].length === 0 || sentenceLower.includes(this.wordPrefixes[1]);
    return word0Could || word1Could;
  }

  // Java: ContextWords#extractWordPrefix(String)
  static extractWordPrefix(pattern) {
    const alternatives = ContextWords.splitTopLevelAlternatives(pattern);
    const prefixes = [];
    for (const alt of alternatives) {
      const p = ContextWords.extractSimplePrefix(alt);
      if (p.length < MIN_PREFIX_LENGTH) {
        return '';
      }
      prefixes.push(toLowerCase(p, Locale.ROOT));
    }
    if (prefixes.length === 0) {
      return '';
    }
    let common = prefixes[0];
    for (let i = 1; i < prefixes.length; i++) {
      common = ContextWords.commonPrefix(common, prefixes[i]);
      if (common.length < MIN_PREFIX_LENGTH) {
        return '';
      }
    }
    return common;
  }

  // Java: ContextWords#splitTopLevelAlternatives(String)
  static splitTopLevelAlternatives(pattern) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern.charAt(i);
      if (c === '\\') { i++; continue; }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === '|' && depth === 0) {
        parts.push(pattern.substring(start, i));
        start = i + 1;
      }
    }
    parts.push(pattern.substring(start));
    return parts;
  }

  // Java: ContextWords#extractSimplePrefix(String)
  static extractSimplePrefix(alt) {
    let sb = '';
    for (let i = 0; i < alt.length; i++) {
      const c = alt.charAt(i);
      if (c === '\\' && i + 1 < alt.length) {
        i++;
        const escaped = alt.charAt(i);
        if (i + 1 < alt.length && (alt.charAt(i + 1) === '?' || alt.charAt(i + 1) === '*')) {
          break; // escaped char is optional
        }
        sb += escaped;
        if (i + 1 < alt.length && alt.charAt(i + 1) === '+') {
          i++; // skip quantifier
        }
      } else if ('[(|.^$\\{'.indexOf(c) >= 0) {
        break;
      } else if (c === '?' || c === '*') {
        if (sb.length > 0) sb = sb.substring(0, sb.length - 1); // preceding char was optional
        break;
      } else if (c === '+') {
        break;
      } else {
        if (i + 1 < alt.length && (alt.charAt(i + 1) === '?' || alt.charAt(i + 1) === '*')) {
          break; // this char is optional
        }
        sb += c;
      }
    }
    return sb;
  }

  // Java: ContextWords#commonPrefix(String,String)
  static commonPrefix(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a.charAt(i) !== b.charAt(i)) return a.substring(0, i);
    }
    return a.substring(0, len);
  }
}
