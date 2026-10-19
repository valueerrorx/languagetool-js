// org.languagetool.rules.AbstractSimpleReplaceRule2
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { SpecificIdRule } from './SpecificIdRule.js';
import { SuggestionWithMessage } from './SuggestionWithMessage.js';
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Objects } from '../../lib/java/Objects.js';
import { RuntimeException, IOException } from '../../lib/java/errors.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { decodeUtf8, readerLines } from '../../lib/java/io.js';
import { getDigits, substringBefore } from '../../lib/java/StringUtils.js';
import { javaReplace, javaReplaceFirst, javaSplit, javaTrim, toLowerCase, toUpperCase } from '../../lib/java/strings.js';
import { JLanguageTool } from '../JLanguageTool.js';
import {
  isAllUppercase, isCamelCase, isCapitalizedWord, isNotWordCharacter, isPunctuationMark, lowercaseFirstChar, toId,
  uppercaseFirstChar,
} from '../text/StringTools.js';

const MAX_TOKENS_IN_MULTIWORD = 20; // Java: AbstractSimpleReplaceRule2#MAX_TOKENS_IN_MULTIWORD

// Java: AbstractSimpleReplaceRule2.CaseSensitivy
export class CaseSensitivy extends JavaEnum {
  static FQCN = 'org.languagetool.rules.AbstractSimpleReplaceRule2.CaseSensitivy';
}
CaseSensitivy.CS = new CaseSensitivy('CS', 0);
CaseSensitivy.CI = new CaseSensitivy('CI', 1);
CaseSensitivy.CSExceptAtSentenceStart = new CaseSensitivy('CSExceptAtSentenceStart', 2);

// Java: AbstractSimpleReplaceRule2 (abstract: getFileNames, getId, getDescription, getShort, getMessage, getLocale)
export class AbstractSimpleReplaceRule2 extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractSimpleReplaceRule2';
  static CaseSensitivy = CaseSensitivy;

  // Java: AbstractSimpleReplaceRule2(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages);
    this.initialized = false;
    this.mStartSpace = null;
    this.mStartNoSpace = null;
    this.mFullSpace = null;
    this.mFullNoSpace = null;
    this.ignoreShortUppercaseWords = true; // only for CheckCaseRule
    this.MAX_LENGTH_SHORT_WORDS = 4; // only for CheckCaseRule
    this.ruleHasSuggestions = true;
    this.subRuleSpecificIds = false;
    this.language = Objects.requireNonNull(language);
    super.setCategory(Categories.MISC.getCategory(messages));
  }

  // Java: AbstractSimpleReplaceRule2#isCheckingCase()
  isCheckingCase() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#getFilePaths()
  getFilePaths() {
    return null;
  }

  // Java: AbstractSimpleReplaceRule2#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ', ';
  }

  // Java: AbstractSimpleReplaceRule2#useSubRuleSpecificIds()
  useSubRuleSpecificIds() {
    this.subRuleSpecificIds = true;
  }

  // Java: AbstractSimpleReplaceRule2#getCaseSensitivy()
  getCaseSensitivy() {
    return CaseSensitivy.CI;
  }

  // Java: AbstractSimpleReplaceRule2#getDescription(String)
  getDescriptionDetails() {
    return null;
  }

  // Java: AbstractSimpleReplaceRule2#match(AnalyzedSentence)
  match(sentence) {
    this.lazyInit();
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let sentStart = 1;
    while (sentStart < tokens.length && this.isPunctuationStart(tokens[sentStart].getToken())) {
      sentStart++;
    }
    const checkCaseCoveredUpto = [0];
    for (let startIndex = sentStart; startIndex < tokens.length; startIndex++) {
      if (this.isTokenException(tokens[startIndex])) {
        continue;
      }
      let tok = tokens[startIndex].getToken();
      if (tok.length < 1) {
        continue;
      }
      // If there is no whitespace to the next token, concatenate the next token
      let k = startIndex + 1;
      while (k < tokens.length && !tokens[k].isWhitespaceBefore()) {
        tok = tok + tokens[k].getToken();
        k++;
      }
      const ci = this.getCaseSensitivy() === CaseSensitivy.CI;
      if (ci) {
        tok = toLowerCase(tok);
      }
      const maxTokenLenBoxed = this.mStartSpace.get(tok);
      if (maxTokenLenBoxed !== undefined) {
        const maxTokenLen = maxTokenLenBoxed;
        let keyBuilder = '';
        let numberOfSpaces = 0;
        let endIndex = startIndex;
        while (endIndex < tokens.length && endIndex - startIndex < MAX_TOKENS_IN_MULTIWORD) {
          if (endIndex > startIndex && tokens[endIndex].isWhitespaceBefore()) {
            keyBuilder += ' ';
            numberOfSpaces++;
          }
          keyBuilder += tokens[endIndex].getToken();
          if (numberOfSpaces + 1 > maxTokenLen) {
            break;
          }
          if (numberOfSpaces > 0) {
            const originalStr = keyBuilder;
            let keyStr = ci ? toLowerCase(originalStr) : originalStr;
            let suggestionWithMessage = this.mFullSpace.get(keyStr) ?? null;
            this.createMatch(ruleMatches, suggestionWithMessage, startIndex, endIndex, originalStr, tokens, sentence,
              sentStart, checkCaseCoveredUpto);
            // No language uses this. It could be removed.
            if (suggestionWithMessage === null && sentStart === startIndex && this.getCaseSensitivy() === CaseSensitivy.CSExceptAtSentenceStart
              && keyStr !== lowercaseFirstChar(keyStr)) {
              keyStr = lowercaseFirstChar(keyStr);
              suggestionWithMessage = this.mFullSpace.get(keyStr) ?? null;
              this.createMatch(ruleMatches, suggestionWithMessage, startIndex, endIndex, originalStr, tokens, sentence,
                sentStart, checkCaseCoveredUpto);
            }
          }
          endIndex++;
        }
      }
      if (this.mStartNoSpace.size > 0 && this.mStartNoSpace.has(tok.charAt(0))) {
        let endIndex = startIndex;
        let keyBuilder = '';
        while (endIndex < tokens.length && endIndex - startIndex < MAX_TOKENS_IN_MULTIWORD) {
          if (endIndex > startIndex && tokens[endIndex].isWhitespaceBefore()) {
            break;
          }
          keyBuilder += tokens[endIndex].getToken();
          const originalStr = keyBuilder;
          let keyStr = ci ? toLowerCase(originalStr) : originalStr;
          let suggestionWithMessage = this.mFullNoSpace.get(keyStr) ?? null;
          this.createMatch(ruleMatches, suggestionWithMessage, startIndex, endIndex, originalStr, tokens, sentence,
            sentStart, checkCaseCoveredUpto);
          // No language uses this. It could be removed.
          if (suggestionWithMessage === null && sentStart === startIndex && this.getCaseSensitivy() === CaseSensitivy.CSExceptAtSentenceStart
            && keyStr !== lowercaseFirstChar(keyStr)) {
            keyStr = lowercaseFirstChar(keyStr);
            suggestionWithMessage = this.mFullNoSpace.get(keyStr) ?? null;
            this.createMatch(ruleMatches, suggestionWithMessage, startIndex, endIndex, originalStr, tokens, sentence,
              sentStart, checkCaseCoveredUpto);
          }
          endIndex++;
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractSimpleReplaceRule2#createMatch(List,SuggestionWithMessage,int,int,String,AnalyzedTokenReadings[],AnalyzedSentence,int,int[])
  createMatch(ruleMatches, suggestionWithMessage, startIndex, endIndex, originalStr, tokens, sentence, sentStart, checkCaseCoveredUpto) {
    if (suggestionWithMessage === null || this.isException(originalStr)) {
      return;
    }
    const replacements = javaSplit(suggestionWithMessage.getSuggestion(), '\\|');
    const fromPos = tokens[startIndex].getStartPos();
    const toPos = tokens[endIndex].getEndPos();
    // keep only the longest match
    if (ruleMatches.length > 0) {
      const lastRuleMatch = ruleMatches[ruleMatches.length - 1];
      if (lastRuleMatch.getFromPos() <= fromPos
        && lastRuleMatch.getToPos() >= toPos) {
        return;
      }
    }
    const firstWordInSuggIsCamelCase = replacements.some((k) => isCamelCase(arrayGet(javaSplit(k, ' '), 0)));
    const allUppercase = isAllUppercase(originalStr);
    const isCapitalized = isCapitalizedWord(arrayGet(javaSplit(originalStr, ' '), 0));
    // exceptions for checking case
    if (this.isCheckingCase()) {
      if (endIndex <= checkCaseCoveredUpto[0]) {
        return;
      }
      const replacementCheckCase = replacements[0];
      if ((sentStart === startIndex && originalStr === uppercaseFirstChar(replacementCheckCase))
        || originalStr === replacementCheckCase) {
        if (ruleMatches.length > 0) {
          // remove last match if is contained in a correct phrase
          const lastRuleMatch = ruleMatches[ruleMatches.length - 1];
          if (lastRuleMatch.getToPos() > fromPos) {
            ruleMatches.pop();
          }
        }
        checkCaseCoveredUpto[0] = endIndex;
        return;
      }
      // Allow all-upper case, except for CamelCase and short words in Dutch (length<MAX_LENGTH_SHORT_WORDS)
      if (!firstWordInSuggIsCamelCase && originalStr === toUpperCase(originalStr)) {
        if (this.ignoreShortUppercaseWords || originalStr.length > this.MAX_LENGTH_SHORT_WORDS) {
          checkCaseCoveredUpto[0] = endIndex;
          return;
        }
      }
    }
    const finalReplacements = [];
    // adjust casing of suggestions
    for (const repl of replacements) {
      let finalRepl = repl;
      if (!firstWordInSuggIsCamelCase && (sentStart === startIndex || (isCapitalized && !this.isCheckingCase()))) {
        finalRepl = uppercaseFirstChar(repl);
      }
      if (!this.isCheckingCase() && allUppercase) {
        finalRepl = toUpperCase(repl);
      }
      if (repl !== originalStr && finalRepl !== originalStr && !finalReplacements.includes(finalRepl)) {
        finalReplacements.push(finalRepl);
      }
      if (finalRepl === originalStr) {
        // the original is correct, so there is no need to fix anything
        finalReplacements.length = 0;
        break;
      }
    }
    if (this.ruleHasSuggestions && finalReplacements.length === 0) {
      return;
    }
    // Begin of match creation
    let msg = suggestionWithMessage.getMessage();
    // Java: url = msg runs after msg = null, so url is always null and setUrl is never reached
    if (msg !== null && (msg.startsWith('http://') || msg.startsWith('https://'))) {
      msg = null;
    }
    if (msg === null) {
      let msgSuggestions = '';
      for (let k = 0; k < replacements.length; k++) {
        if (k > 0) {
          msgSuggestions += (k === replacements.length - 1 ? this.getSuggestionsSeparator() : ', ');
        }
        msgSuggestions += '<suggestion>' + replacements[k] + '</suggestion>';
      }
      msg = javaReplaceFirst(javaReplaceFirst(this.getMessage(), '\\$match', originalStr), '\\$suggestions', msgSuggestions);
    }
    let ruleMatch = new RuleMatch(this, sentence, fromPos, toPos, msg, this.getShort());
    if (this.subRuleSpecificIds) {
      const id = toId(this.getId() + '_' + originalStr, this.language);
      const desc = javaReplace(this.getDescription(), '$match', originalStr);
      const specificIdRule = new SpecificIdRule(id, desc, this.isPremium(), this.getCategory(),
        this.getLocQualityIssueType(), this.getTags());
      ruleMatch = new RuleMatch(specificIdRule, sentence, fromPos, toPos, msg, this.getShort());
    }
    if (this.ruleHasSuggestions) {
      ruleMatch.setSuggestedReplacements(finalReplacements);
    }
    // End of match creation
    if (this.isRuleMatchException(ruleMatch)) {
      return;
    }
    // keep only the longest match
    if (ruleMatches.length > 0) {
      const lastRuleMatch = ruleMatches[ruleMatches.length - 1];
      if (lastRuleMatch.getFromPos() >= fromPos
        && lastRuleMatch.getToPos() <= toPos) {
        ruleMatches.pop();
      }
    }
    ruleMatches.push(ruleMatch);
  }

  // Java: AbstractSimpleReplaceRule2#isRuleMatchException(RuleMatch)
  isRuleMatchException() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#isException(String)
  isException() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#isTokenException(AnalyzedTokenReadings)
  isTokenException() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#checkKeyWordsAreKnownToSpeller()
  checkKeyWordsAreKnownToSpeller() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#checkKeyWordsAreUnknownToSpeller()
  checkKeyWordsAreUnknownToSpeller() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#separateKeyWordsBySpeller()
  separateKeyWordsBySpeller() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule2#isPunctuationStart(String)
  isPunctuationStart(word) {
    return getDigits(word).length > 0 // e.g. postal codes
      || isPunctuationMark(word) || isNotWordCharacter(word);
  }

  // Java: AbstractSimpleReplaceRule2#lazyInit()
  lazyInit() {
    if (this.initialized) {
      return;
    }
    const mStartSpace = new Map();
    const mStartNoSpace = new Map();
    const mFullSpace = new Map();
    const mFullNoSpace = new Map();
    this.fillMaps(mStartSpace, mStartNoSpace, mFullSpace, mFullNoSpace);
    this.mStartSpace = mStartSpace;
    this.mStartNoSpace = mStartNoSpace;
    this.mFullSpace = mFullSpace;
    this.mFullNoSpace = mFullNoSpace;
    this.initialized = true;
  }

  // Java: AbstractSimpleReplaceRule2#fillMaps(Map,Map,Map,Map)
  fillMaps(mStartSpace, mStartNoSpace, mFullSpace, mFullNoSpace) {
    try {
      for (const filePath of this.getAllFilePaths()) {
        for (let line of readerLines(decodeUtf8(filePath.openStream()))) {
          line = javaTrim(line);
          if (line.length === 0 || line.charAt(0) === '#') { // ignore comments
            continue;
          }
          if (line.includes('  ') && this.language.getShortCode() !== 'ar') {
            throw new RuntimeException('More than one consecutive space in ' + filePath + ' - use a tab character as ' +
              'a delimiter for the message: ' + line);
          }
          line = javaTrim(substringBefore(line, '#'));
          if (this.isCheckingCase()) {
            // It is a rule for checking chase
            const parts = javaSplit(line, '=');
            line = javaTrim(toLowerCase(arrayGet(parts, 0))) + '=' + javaTrim(parts[0]);
            if (parts.length === 2) {
              line = line + '\t' + javaTrim(parts[1]);
            }
          }
          const parts = javaSplit(line, '\t');
          const confPair = arrayGet(parts, 0);
          let msg;
          if (parts.length === 1) {
            msg = null;
          } else if (parts.length === 2) {
            msg = parts[1];
          } else {
            throw new IOException('Format error in file ' + filePath + ". Expected at most 1 '=' character and at " +
              'most 1 tab character. Line: ' + line);
          }
          const confPairParts = javaSplit(confPair, '=');
          let suggestion = '';
          if (this.ruleHasSuggestions) {
            if (confPairParts.length < 2) {
              throw new IOException('Format error in file ' + filePath
                + ". Missing suggestion after character '='. Line: " + line);
            }
            suggestion = confPairParts[1];
          }
          const wrongForms = javaSplit(arrayGet(confPairParts, 0), '\\|'); // multiple incorrect forms
          for (const wrongForm of wrongForms) {
            const searchKey = this.getCaseSensitivy() === CaseSensitivy.CI ? toLowerCase(wrongForm) : wrongForm;
            if (!this.isCheckingCase() && searchKey === suggestion) {
              throw new IOException('Format error in file ' + filePath
                + ". Found same word on left and right side of '='. Line: " + line);
            }
            const suggestionWithMessage = new SuggestionWithMessage(suggestion, msg);
            const containsSpace = wrongForm.indexOf(' ') > 0;
            if (!containsSpace) {
              const firstChar = searchKey.charAt(0);
              if (mStartNoSpace.has(firstChar)) {
                if (mStartNoSpace.get(firstChar) < searchKey.length) {
                  mStartNoSpace.set(firstChar, searchKey.length);
                }
              } else {
                mStartNoSpace.set(firstChar, searchKey.length);
              }
              mFullNoSpace.set(searchKey, suggestionWithMessage);
            } else {
              const tokens = javaSplit(searchKey, ' ');
              const firstToken = tokens[0];
              if (mStartSpace.has(firstToken)) {
                if (mStartSpace.get(firstToken) < tokens.length) {
                  mStartSpace.set(firstToken, tokens.length);
                }
              } else {
                mStartSpace.set(firstToken, tokens.length);
              }
              mFullSpace.set(searchKey, suggestionWithMessage);
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // Java: AbstractSimpleReplaceRule2#getAllFilePaths()
  getAllFilePaths() {
    const filePaths = [];
    if (this.getFilePaths() !== null) {
      filePaths.push(...this.getFilePaths());
    }
    for (const fileName of this.getFileNames()) {
      filePaths.push(JLanguageTool.getDataBroker().getFromRulesDirAsUrl(fileName));
    }
    return filePaths;
  }

  // Java: AbstractSimpleReplaceRule2#getWrongWords()
  getWrongWords() {
    this.lazyInit();
    return [this.mFullSpace, this.mFullNoSpace];
  }

  // Java: AbstractSimpleReplaceRule2#isIgnoreShortUppercaseWords()
  isIgnoreShortUppercaseWords() {
    return this.ignoreShortUppercaseWords;
  }

  // Java: AbstractSimpleReplaceRule2#setIgnoreShortUppercaseWords(boolean)
  setIgnoreShortUppercaseWords(value) {
    this.ignoreShortUppercaseWords = value;
  }

  // Java: AbstractSimpleReplaceRule2#setRuleHasSuggestions(boolean)
  setRuleHasSuggestions(value) {
    this.ruleHasSuggestions = value;
  }

  // Java: AbstractSimpleReplaceRule2#getLanguage()
  getLanguage() {
    return this.language;
  }
}
