// org.languagetool.rules.AbstractCompoundRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { SpecificIdRule } from './SpecificIdRule.js';
import { MAX_TERMS } from './compoundConstants.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { isNumeric, uncapitalize } from '../../lib/java/StringUtils.js';
import { javaReplace, javaSplit, javaTrim, toLowerCase } from '../../lib/java/strings.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { SENTENCE_START_TAGNAME } from '../JLanguageToolConstants.js';
import { isAllUppercase, toId } from '../text/StringTools.js';

const DIGIT = Pattern.compile('\\d+'); // Java: AbstractCompoundRule#DIGIT
const WHITESPACE = Pattern.compile('\\s+'); // Java: AbstractCompoundRule#WHITESPACE
const DASHES = Pattern.compile('--+'); // Java: AbstractCompoundRule#DASHES

// Java: AbstractCompoundRule (abstract: getId, getDescription, getCompoundRuleData)
export class AbstractCompoundRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractCompoundRule';
  static MAX_TERMS = MAX_TERMS;

  // Java: AbstractCompoundRule(ResourceBundle,Language,UserConfig,String,String,String) / (..., String shortMessage)
  constructor(messages, lang, userConfig, withHyphenMessage, withoutHyphenMessage, withOrWithoutHyphenMessage, shortMessage = null) {
    super();
    // if true, the first word will be uncapitalized before compared to the entries in CompoundRuleData
    this.sentenceStartsWithUpperCase = true;
    this.subRuleSpecificIds = false;
    super.setCategory(Categories.MISC.getCategory(messages));
    this.withHyphenMessage = withHyphenMessage;
    this.withoutHyphenMessage = withoutHyphenMessage;
    this.withOrWithoutHyphenMessage = withOrWithoutHyphenMessage;
    this.shortDesc = shortMessage;
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.lang = lang;
    if (userConfig !== null && userConfig !== undefined) {
      this.linguServices = userConfig.getLinguServices();
    } else {
      this.linguServices = null;
    }
  }

  // Java: AbstractCompoundRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 1;
  }

  // Java: AbstractCompoundRule#useSubRuleSpecificIds()
  useSubRuleSpecificIds() {
    this.subRuleSpecificIds = true;
  }

  // Java: AbstractCompoundRule#match(AnalyzedSentence)
  match(sentence) {
    const data = this.getCompoundRuleData();
    const hasDigitPatterns = data.hasDigitPatterns();
    // When there are digit patterns we can't reliably pre-filter by first word, so skip the optimization then.
    const firstWords = hasDigitPatterns ? null : data.getFirstWords();
    if (firstWords !== null && !this.sentenceMayContainCompound(sentence, firstWords)) {
      return RuleMatch.EMPTY_ARRAY;
    }
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();

    let prevRuleMatch = null;
    const prevTokens = []; // Java: ArrayDeque, head = index 0
    const stringsToCheck = [];
    const origStringsToCheck = [];
    const stringToToken = new Map();
    for (let i = 0; i < tokens.length + MAX_TERMS; i++) {
      let token;
      // we need to extend the token list so we find matches at the end of the original list:
      if (i >= tokens.length) {
        token = new AnalyzedTokenReadings(new AnalyzedToken('', '', null), prevTokens[0].getStartPos());
      } else {
        token = tokens[i];
      }
      if (i === 0) {
        this.addToQueue(token, prevTokens);
        continue;
      } else if (token.isImmunized()) {
        continue;
      }

      const firstMatchToken = prevTokens[0];
      // quickly skip positions where no known compound can start
      if (firstWords !== null && !this.couldStartCompound(prevTokens, firstWords)) {
        this.addToQueue(token, prevTokens);
        continue;
      }
      stringsToCheck.length = 0; // no hyphens spelling
      origStringsToCheck.length = 0; // original upper/lowercase and hyphens spelling
      stringToToken.clear();
      this.getStringToTokenMap(prevTokens, stringsToCheck, origStringsToCheck, stringToToken);
      // iterate backwards over all potentially incorrect strings to make
      // sure we match longer strings first:
      for (let k = stringsToCheck.length - 1; k >= 0; k--) {
        const stringToCheck = stringsToCheck[k];
        const origStringToCheck = origStringsToCheck[k];
        let digitsRegexp = null;
        const containsDigits = hasDigitPatterns && javaSplit(stringToCheck, ' ').some((s) => isNumeric(s));
        if (data.getIncorrectCompounds().has(stringToCheck) ||
            (containsDigits && data.getIncorrectCompounds().has(digitsRegexp = DIGIT.matcher(stringToCheck).replaceAll('\\\\d+')))) {
          const atr = stringToToken.get(stringToCheck);
          let msg = null;
          let replacement = [];
          if (data.getDashSuggestion().has(stringToCheck) && !origStringToCheck.includes(' ')) {
            // It is already joined
            break;
          }
          if (data.getDashSuggestion().has(stringToCheck) ||
              (containsDigits && data.getIncorrectCompounds().has(digitsRegexp))) {
            replacement.push(origStringToCheck.replaceAll(' ', '-'));
            msg = this.withHyphenMessage;
          }
          if (this.isNotAllUppercase(origStringToCheck) && data.getJoinedSuggestion().has(stringToCheck)) {
            replacement.push(this.mergeCompound(origStringToCheck, [...data.getJoinedLowerCaseSuggestion()].some((s) => stringToCheck.includes(s))));
            msg = this.withoutHyphenMessage;
          }
          const parts = javaSplit(stringToCheck, ' ');
          if (parts.length > 0 && parts[0].length === 1) {
            replacement.length = 0;
            replacement.push(origStringToCheck.replaceAll(' ', '-'));
            msg = this.withHyphenMessage;
          } else if (replacement.length === 0 || replacement.length === 2) { // isEmpty shouldn't happen
            msg = this.withOrWithoutHyphenMessage;
          }
          replacement = this.filterReplacements(replacement,
            sentence.getText().substring(firstMatchToken.getStartPos(), atr.getEndPos()));
          if (replacement.length === 0) {
            break;
          }
          const startPos = firstMatchToken.getStartPos();
          const endPos = atr.getEndPos();
          let ruleMatch = new RuleMatch(this, sentence, startPos, endPos, msg, this.shortDesc);
          if (this.subRuleSpecificIds) {
            const id = toId(this.getId() + '_' + stringToCheck, this.lang);
            const description = javaReplace(this.getDescription(), '$match', origStringToCheck);
            const subRuleId = new SpecificIdRule(id, description, this.isPremium(), this.getCategory(),
              this.getLocQualityIssueType(), this.getTags());
            ruleMatch = new RuleMatch(subRuleId, sentence, startPos, endPos, msg, this.shortDesc);
          }
          ruleMatch.setSuggestedReplacements(replacement);
          // avoid duplicate matches:
          if (prevRuleMatch !== null && prevRuleMatch.getFromPos() === ruleMatch.getFromPos()) {
            prevRuleMatch = ruleMatch;
            break;
          }
          prevRuleMatch = ruleMatch;
          ruleMatches.push(ruleMatch);
          break;
        }
      }
      this.addToQueue(token, prevTokens);
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractCompoundRule#filterReplacements(List,String)
  filterReplacements(replacements, original) {
    const newReplacements = [];
    for (const replacement of replacements) {
      const newReplacement = DASHES.matcher(replacement).replaceAll('-');
      if (newReplacement !== original && this.isCorrectSpell(newReplacement)) {
        newReplacements.push(newReplacement);
      }
    }
    return newReplacements;
  }

  // Java: AbstractCompoundRule#getStringToTokenMap(Queue,List,List,Map)
  getStringToTokenMap(prevTokens, stringsToCheck, origStringsToCheck, stringToToken) {
    let sb = '';
    let j = 0;
    let isFirstSentStart = false;
    for (const atr of prevTokens) {
      if (atr.isWhitespaceBefore()) {
        sb += ' ';
      }
      sb += atr.getToken();
      if (j === 0) {
        isFirstSentStart = atr.hasPosTag(SENTENCE_START_TAGNAME);
      }
      if (j >= 1 || (j === 0 && !isFirstSentStart)) {
        let stringToCheck = this.normalize(sb);
        if (this.sentenceStartsWithUpperCase && isFirstSentStart) {
          stringToCheck = uncapitalize(stringToCheck);
        }
        stringsToCheck.push(stringToCheck);
        origStringsToCheck.push(javaTrim(sb));
        if (!stringToToken.has(stringToCheck)) {
          stringToToken.set(stringToCheck, atr);
        }
      }
      j++;
    }
  }

  // Java: AbstractCompoundRule#couldStartCompound(Queue,Set)
  couldStartCompound(prevTokens, firstWords) {
    for (const atr of prevTokens) {
      const token = atr.getToken();
      if (token.length === 0) {
        continue; // e.g. SENT_START
      }
      const normalized = (token.indexOf('-') < 0 && token.indexOf(' ') < 0) ? token : this.normalize(token);
      if (normalized.length === 0 || normalized.indexOf(' ') >= 0) {
        return true; // hyphenated/multi-word token: don't risk a wrong decision
      }
      return firstWords.has(toLowerCase(normalized));
    }
    return true;
  }

  // Java: AbstractCompoundRule#sentenceMayContainCompound(AnalyzedSentence,Set)
  sentenceMayContainCompound(sentence, firstWords) {
    for (const token of sentence.getTokenSet()) {
      if (token.length === 0) {
        continue;
      }
      let normalized = token.indexOf('-') < 0 ? token : this.normalize(token);
      const spaceIndex = normalized.indexOf(' ');
      if (spaceIndex > 0) {
        normalized = normalized.substring(0, spaceIndex);
      }
      if (normalized.length > 0 && firstWords.has(toLowerCase(normalized))) {
        return true;
      }
    }
    return false;
  }

  // Java: AbstractCompoundRule#normalize(String)
  normalize(inStr) {
    let str = javaTrim(inStr);
    str = javaReplace(str, ' - ', ' ');
    str = str.replaceAll('-', ' ');
    str = WHITESPACE.matcher(str).replaceAll(' ');
    return str;
  }

  // Java: AbstractCompoundRule#isNotAllUppercase(String)
  isNotAllUppercase(str) {
    const parts = javaSplit(str, ' ');
    for (const part of parts) {
      if (part !== '-') { // do not treat '-' as an upper-case word
        if (isAllUppercase(part)) {
          return false;
        }
      }
    }
    return true;
  }

  // Java: AbstractCompoundRule#mergeCompound(String,boolean)
  mergeCompound(str, uncapitalizeMidWords) {
    const stringParts = javaSplit(javaReplace(str, '-', ' '), ' ');
    let sb = '';
    for (let k = 0; k < stringParts.length; k++) {
      if (k === 0) {
        sb += stringParts[0];
      } else {
        sb += uncapitalizeMidWords ? uncapitalize(stringParts[k]) : stringParts[k];
      }
    }
    return sb;
  }

  // Java: AbstractCompoundRule#addToQueue(AnalyzedTokenReadings,ArrayDeque)
  addToQueue(token, prevTokens) {
    if (prevTokens.length === MAX_TERMS) {
      prevTokens.shift();
    }
    prevTokens.push(token);
  }

  // Java: AbstractCompoundRule#isCorrectSpell(String)
  isCorrectSpell(word) {
    if (this.linguServices === null) {
      return !this.isMisspelled(word);
    }
    return this.linguServices.isCorrectSpell(word, this.lang);
  }

  // Java: AbstractCompoundRule#isMisspelled(String)
  isMisspelled() {
    return false;
  }
}
