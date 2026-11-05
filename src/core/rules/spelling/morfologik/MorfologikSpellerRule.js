// org.languagetool.rules.spelling.morfologik.MorfologikSpellerRule (abstract rule; subclasses provide getFileName/getId)
import { SpellingCheckRule } from '../SpellingCheckRule.js';
import { MorfologikMultiSpeller } from './MorfologikMultiSpeller.js';
import { ForeignLanguageChecker } from '../ForeignLanguageChecker.js';
import { RuleMatch } from '../../model/RuleMatch.js';
import { SuggestedReplacement } from '../../model/SuggestedReplacement.js';
import { Categories } from '../../model/Category.js';
import { ITSIssueType } from '../../model/ITSIssueType.js';
import { AnalyzedToken } from '../../../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../../AnalyzedSentence.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { isEmoji, isPunctuationMark, uppercaseFirstChar } from '../../../text/StringTools.js';
import * as Tools from '../../../Tools.js';
import { Pattern } from '../../../../lib/java/regex/index.js';
import { Locale } from '../../../../lib/java/Locale.js';
import { AbstractMethodError, IOException, RuntimeException } from '../../../../lib/java/errors.js';
import { containsAny } from '../../../../lib/java/StringUtils.js';
import { charAt, equalsIgnoreCase, javaSplit, javaTrim, substring, toLowerCase } from '../../../../lib/java/strings.js';

// do not use very frequent words in split word suggestions ex. to *thow != tot how
const MAX_FREQUENCY_FOR_SPLITTING = 21; // 0..21

const pStartsWithNumbersBullets = Pattern.compile('^(\\d[\\.,\\d]*|\\P{L}+)(.*)$'); // Java: MorfologikSpellerRule#pStartsWithNumbersBullets
const pStartsWithNumbersBulletsExceptions = Pattern.compile('^([\\p{C}\\-\\$%&]+)(.*)$'); // Java: MorfologikSpellerRule#pStartsWithNumbersBulletsExceptions
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Java: MorfologikSpellerRule#convertWeighted(List)
function convertWeighted(suggestions) {
  return suggestions.map((ws) => {
    const sr = new SuggestedReplacement(ws.getWord());
    sr.setWeight(ws.getWeight());
    return sr;
  });
}

// Java: MorfologikSpellerRule#joinBeforeAfterSuggestions(List,String,String)
function joinBeforeAfterSuggestions(suggestionsList, beforeSuggestionStr, afterSuggestionStr) {
  const newSuggestionsList = [];
  for (const suggestion of suggestionsList) {
    const str = suggestion.getReplacement();
    const newSuggestion = new SuggestedReplacement(suggestion);
    newSuggestion.setReplacement(beforeSuggestionStr + str + afterSuggestionStr);
    newSuggestionsList.push(newSuggestion);
  }
  return newSuggestionsList;
}

// Java: MorfologikSpellerRule#mergeSuggestionsWithSameTranslation(List)
function mergeSuggestionsWithSameTranslation(l) {
  const mergedRepl = [];
  const handledReplacements = new Set();
  for (const repl of l) {
    const sameRepl = l
      .filter((k) => k.getReplacement() === repl.getReplacement())
      .filter((k) => k.getSuffix() === null || (k.getSuffix() !== null && k.getSuffix() === repl.getSuffix()));
    if (sameRepl.length > 1) {
      if (!handledReplacements.has(repl.getReplacement())) {
        const joinedRepls = [];
        for (const r of sameRepl) {
          joinedRepls.push(`* ${r.getShortDescription()}`);
        }
        mergedRepl.push(new SuggestedReplacement(repl.getReplacement(), joinedRepls.join('\n'), repl.getSuffix()));
        handledReplacements.add(repl.getReplacement());
      }
    } else {
      mergedRepl.push(repl);
    }
  }
  return mergedRepl;
}

// Java: MorfologikSpellerRule (abstract: getFileName, getId)
export class MorfologikSpellerRule extends SpellingCheckRule {
  static FQCN = 'org.languagetool.rules.spelling.morfologik.MorfologikSpellerRule';
  static JAVA_ABSTRACT = true;
  static MAX_FREQUENCY_FOR_SPLITTING = MAX_FREQUENCY_FOR_SPLITTING;

  // Java: MorfologikSpellerRule(ResourceBundle,Language[,UserConfig[,List]]) / (ResourceBundle,Language,GlobalConfig,UserConfig,List,LanguageModel,Language)
  constructor(messages, language, ...rest) {
    let globalConfig = null;
    let userConfig = null;
    let altLanguages = [];
    let languageModel = null;
    let motherTongue = null;
    if (rest.length === 5) {
      [globalConfig, userConfig, altLanguages, languageModel, motherTongue] = rest;
    } else if (rest.length >= 1) {
      [userConfig, altLanguages = []] = rest;
    }
    super(messages, language, userConfig, altLanguages, languageModel);
    this.speller1 = null;
    this.speller2 = null;
    this.speller3 = null;
    this.conversionLocale = null;
    this.ignoreTaggedWords = false;
    this.checkCompound = false;
    this.compoundRegex = Pattern.compile('-');
    this.spellersInitialized = false;
    this.globalConfig = globalConfig;
    this.userConfig = userConfig;
    this.motherTongue = motherTongue;
    super.setCategory(Categories.TYPOS.getCategory(messages));
    this.conversionLocale = this.conversionLocale !== null ? this.conversionLocale : Locale.getDefault();
    this.init();
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
  }

  // Java: MorfologikSpellerRule#getFileName() (abstract)
  getFileName() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.morfologik.MorfologikSpellerRule.getFileName()');
  }

  // Java: MorfologikSpellerRule#getId() (abstract)
  getId() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.morfologik.MorfologikSpellerRule.getId()');
  }

  // Java: MorfologikSpellerRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_spelling');
  }

  // Java: MorfologikSpellerRule#setLocale(Locale)
  setLocale(locale) {
    this.conversionLocale = locale;
  }

  // Java: MorfologikSpellerRule#setIgnoreTaggedWords()
  setIgnoreTaggedWords() {
    this.ignoreTaggedWords = true;
  }

  // Java: MorfologikSpellerRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    this.initSpellers();

    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    let idx = -1;
    let isFirstWord = true;
    let gotResultsFromForeignLanguageChecker = false;
    const sentenceLength = sentence.getTokensWithoutWhitespace().filter((k) => !k.isNonWord()).length - 1;
    let foreignLanguageChecker = null;
    if (this.userConfig !== null && this.userConfig.getPreferredLanguages().length !== 0 && this.userConfig.getPreferredLanguages().length >= 2) { // only create instance if user has 2 or more preferredLanguages
      foreignLanguageChecker = new ForeignLanguageChecker(this.language.getShortCode(), sentence.getText(), sentenceLength, this.userConfig.getPreferredLanguages());
    }
    for (const token of tokens) {
      idx++;
      if (this.canBeIgnored(tokens, idx, token)) {
        if (idx > 0 && isFirstWord && !isPunctuationMark(token.getToken())) {
          isFirstWord = false;
        }
        continue;
      }
      const startPos = token.getStartPos();
      // if we use token.getToken() we'll get ignored characters inside and speller will choke
      const word = token.getAnalyzedToken(0).getToken();

      const newRuleIdx = ruleMatches.length;
      const pattern = this.tokenizingPattern();
      if (pattern === null) {
        ruleMatches.push(...this.getRuleMatches(word, startPos, sentence, ruleMatches, idx, tokens));
      } else {
        let index = 0;
        const m = pattern.matcher(word);
        while (m.find()) {
          const match = substring(word, index, m.start());
          ruleMatches.push(...this.getRuleMatches(match, startPos + index, sentence, ruleMatches, idx, tokens));
          index = m.end();
        }
        if (index === 0) { // tokenizing char not found
          ruleMatches.push(...this.getRuleMatches(word, startPos, sentence, ruleMatches, idx, tokens));
        } else {
          ruleMatches.push(...this.getRuleMatches(substring(word, index, word.length), startPos + index, sentence, ruleMatches, idx, tokens));
        }
      }

      if (ruleMatches.length > newRuleIdx) {
        // matches added for current token - need to adjust for hidden characters
        const hiddenCharOffset = token.getToken().length - word.length;
        if (hiddenCharOffset > 0) {
          for (let i = newRuleIdx; i < ruleMatches.length; i++) {
            const ruleMatch = ruleMatches[i];
            if (token.getEndPos() < ruleMatch.getToPos()) { // done by multi-token speller, no need to adjust
              continue;
            }
            ruleMatch.setOffsetPosition(ruleMatch.getFromPos(), ruleMatch.getToPos() + hiddenCharOffset);
          }
        }
      }

      // Capitalize word at the sentence start
      // if it is not the last token in the sentence, similarly to UPPERCASE_SENTENCE_START
      if (isFirstWord && ruleMatches.length > 0 && idx < tokens.length - 1) {
        const ruleMatch = ruleMatches[0];
        const currentSuggestions = ruleMatch.getLazySuggestedReplacements();
        ruleMatch.setLazySuggestedReplacements(() => {
          const newReplacements = [];
          for (const suggestedReplacement of currentSuggestions()) {
            // only if the replacement is all lower case
            const replacement = suggestedReplacement.getReplacement();
            if (replacement === toLowerCase(replacement)) {
              const capitalizedReplacement = uppercaseFirstChar(replacement);
              if (!newReplacements.includes(capitalizedReplacement)) {
                newReplacements.push(capitalizedReplacement);
              }
            } else if (!newReplacements.includes(replacement)) {
              newReplacements.push(replacement);
            }
          }
          return newReplacements.map((r) => new SuggestedReplacement(r));
        });
      }
      if (idx > 0 && isFirstWord && !isPunctuationMark(token.getToken())) {
        isFirstWord = false;
      }
      if (foreignLanguageChecker !== null && !gotResultsFromForeignLanguageChecker) {
        const langCodesScoring = foreignLanguageChecker.check(ruleMatches.length);
        if (langCodesScoring.size !== 0) {
          if (!langCodesScoring.has(ForeignLanguageChecker.NO_FOREIGN_LANG_DETECTED)) {
            ruleMatches[0].setNewLanguageMatches(langCodesScoring);
          }
          gotResultsFromForeignLanguageChecker = true;
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: MorfologikSpellerRule#getTranslator(GlobalConfig)
  getTranslator() {
    return null;
  }

  // Java: MorfologikSpellerRule#initSpellers()
  initSpellers() {
    if (this.spellersInitialized) {
      return;
    }
    let binaryDict = null;
    if (getDataBroker().resourceExists(this.getFileName())) {
      binaryDict = this.getFileName();
    }
    if (binaryDict === null) {
      // should not happen, as we only configure this rule (or rather its subclasses)
      // when we have the resources:
      throw new RuntimeException(`Cannot find dictionary file ${this.getFileName()}`);
    }
    this.initSpeller(binaryDict);
    this.spellersInitialized = true;
  }

  // Java: MorfologikSpellerRule#initSpeller(String)
  initSpeller(binaryDict) {
    const plainTextDicts = [];
    let languageVariantPlainTextDict = null;
    if (this.getSpellingFileName() !== null && getDataBroker().resourceExists(this.getSpellingFileName())) {
      plainTextDicts.push(this.getSpellingFileName());
    }
    for (const fileName of this.getAdditionalSpellingFileNames()) {
      if (getDataBroker().resourceExists(fileName)) {
        plainTextDicts.push(fileName);
      }
    }
    if (this.getLanguageVariantSpellingFileName() !== null && getDataBroker().resourceExists(this.getLanguageVariantSpellingFileName())) {
      languageVariantPlainTextDict = this.getLanguageVariantSpellingFileName();
    }
    this.speller1 = new MorfologikMultiSpeller(binaryDict, plainTextDicts, languageVariantPlainTextDict, this.userConfig, 1, this.language);
    this.speller2 = new MorfologikMultiSpeller(binaryDict, plainTextDicts, languageVariantPlainTextDict, this.userConfig, 2, this.language);
    this.speller3 = new MorfologikMultiSpeller(binaryDict, plainTextDicts, languageVariantPlainTextDict, this.userConfig, 3, this.language);
    this.setConvertsCase(this.speller1.convertsCase());
  }

  // Java: MorfologikSpellerRule#canBeIgnored(AnalyzedTokenReadings[],int,AnalyzedTokenReadings)
  canBeIgnored(tokens, idx, token) {
    return token.isSentenceStart()
      || token.isImmunized()
      || token.isIgnoredBySpeller()
      || this.isUrl(token.getToken())
      || this.isEMail(token.getToken())
      || (this.ignoreTaggedWords && token.isTagged() && !this.isProhibited(token.getToken()))
      || this.ignoreToken(tokens, idx);
  }

  // Java: MorfologikSpellerRule#isMisspelled(String) (public) and #isMisspelled(MorfologikMultiSpeller,String) (protected)
  isMisspelled(...args) {
    if (args.length === 1) {
      this.initSpellers();
      return this.isMisspelled(this.speller1, args[0]);
    }
    const [speller, word] = args;
    if (Tools.isExternSpeller()) { // use of external speller for OO extension (32-bit)
      if (Tools.getLinguisticServices().isCorrectSpell(word, this.language)) {
        return false;
      }
    } else if (!speller.isMisspelled(word)) {
      return false;
    }
    if (this.checkCompound && this.compoundRegex.matcher(word).find()) {
      const words = this.compoundRegex.split(word);
      for (const singleWord of words) {
        if (Tools.isExternSpeller()) { // use of external speller for OO extension (32-bit)
          if (!Tools.getLinguisticServices().isCorrectSpell(singleWord, this.language)) {
            return true;
          }
        } else if (speller.isMisspelled(singleWord)) {
          return true;
        }
      }
      return false;
    }
    return true;
  }

  // Java: MorfologikSpellerRule#getFrequency(MorfologikMultiSpeller,String) (private static)
  static getFrequency(speller, word) {
    return speller.getFrequency(word);
  }

  // Java: MorfologikSpellerRule#getRuleMatches(String,int,AnalyzedSentence,List,int,AnalyzedTokenReadings[])
  getRuleMatches(word, startPos, sentence, ruleMatchesSoFar, idx, tokens) {
    const getFrequency = MorfologikSpellerRule.getFrequency;
    const speller1 = this.speller1;
    // We create only one rule match.
    // Several rule matches on the same word or words can not be shown to the user.
    const ruleMatches = [];
    let ruleMatch = null;

    if (!this.isMisspelled(speller1, word) && !this.isProhibited(word)) {
      return ruleMatches;
    }

    if (this.ignorePotentiallyMisspelledWord(word)) {
      return ruleMatches;
    }

    // the current word is already dealt with in the previous match, so do nothing
    if (ruleMatchesSoFar.length > 0 && ruleMatchesSoFar[ruleMatchesSoFar.length - 1].getToPos() > startPos) {
      return ruleMatches;
    }

    let beforeSuggestionStr = ''; // to be added before the suggestion if there is a suggestion for a split word
    let afterSuggestionStr = ''; // to be added after

    // Check for split word with previous word
    if (idx > 0 && tokens[idx].isWhitespaceBefore()) {
      const prevWord = tokens[idx - 1].getToken();
      if (prevWord.length > 0 && !containsAny(prevWord, ...DIGITS)
          && getFrequency(speller1, prevWord) < MAX_FREQUENCY_FOR_SPLITTING) {
        const prevStartPos = tokens[idx - 1].getStartPos();
        // "thanky ou" -> "thank you"
        const sugg1a = prevWord.substring(0, prevWord.length - 1);
        const sugg1b = prevWord.substring(prevWord.length - 1) + word;
        if (sugg1a.length > 1 && sugg1b.length > 2 && !this.isMisspelled(speller1, sugg1a)
            && !this.isMisspelled(speller1, sugg1b)
            && getFrequency(speller1, sugg1a) + getFrequency(speller1, sugg1b) > getFrequency(speller1, prevWord)) {
          ruleMatch = this.createWrongSplitMatch(sentence, ruleMatchesSoFar, startPos, word, sugg1a, sugg1b, prevStartPos);
          beforeSuggestionStr = `${prevWord} `;
        }
        // "than kyou" -> "thank you" ; but not "She awaked" -> "Shea waked"
        const sugg2a = prevWord + String.fromCharCode(charAt(word, 0));
        const sugg2b = substring(word, 1);
        if (sugg2b.length > 2 && !this.isMisspelled(speller1, sugg2a) && !this.isMisspelled(speller1, sugg2b)) {
          if (ruleMatch === null) {
            if (getFrequency(speller1, sugg2a) + getFrequency(speller1, sugg2b) > getFrequency(speller1, prevWord)) {
              ruleMatch = this.createWrongSplitMatch(sentence, ruleMatchesSoFar, startPos, word, sugg2a, sugg2b,
                prevStartPos);
              beforeSuggestionStr = `${prevWord} `;
            }
          } else {
            ruleMatch.addSuggestedReplacement(javaTrim(`${sugg2a} ${sugg2b}`));
          }
        }
        // "g oing-> "going"
        const sugg = prevWord + word;
        if (word === toLowerCase(word) && !this.isMisspelled(speller1, sugg)) {
          if (ruleMatch === null) {
            if (getFrequency(speller1, sugg) >= getFrequency(speller1, prevWord)) {
              ruleMatch = new RuleMatch(this, sentence, prevStartPos, startPos + word.length,
                this.messages.getString('spelling'), this.messages.getString('desc_spelling_short'));
              ruleMatch.setType(RuleMatch.Type.UnknownWord);
              beforeSuggestionStr = `${prevWord} `;
              ruleMatch.setSuggestedReplacement(sugg);
            }
          } else {
            ruleMatch.addSuggestedReplacement(sugg);
          }
        }
        if (ruleMatch !== null && this.isMisspelled(speller1, prevWord)) {
          ruleMatches.push(ruleMatch);
          return ruleMatches;
        }
      }
    }

    // Check for split word with next word
    if (ruleMatch === null && idx < tokens.length - 1 && tokens[idx + 1].isWhitespaceBefore()) {
      const nextWord = tokens[idx + 1].getToken();
      if (nextWord.length > 0 && !containsAny(nextWord, ...DIGITS)
          && getFrequency(speller1, nextWord) < MAX_FREQUENCY_FOR_SPLITTING) {
        const nextStartPos = tokens[idx + 1].getStartPos();
        const sugg1a = substring(word, 0, word.length - 1);
        const sugg1b = substring(word, word.length - 1) + nextWord;
        if (sugg1a.length > 1 && sugg1b.length > 2 && !this.isMisspelled(speller1, sugg1a) && !this.isMisspelled(speller1, sugg1b)
            && getFrequency(speller1, sugg1a) + getFrequency(speller1, sugg1b) > getFrequency(speller1, nextWord)) {
          ruleMatch = this.createWrongSplitMatch(sentence, ruleMatchesSoFar, nextStartPos, nextWord, sugg1a, sugg1b, startPos);
          afterSuggestionStr = ` ${nextWord}`;
        }
        const sugg2a = word + String.fromCharCode(charAt(nextWord, 0));
        const sugg2b = substring(nextWord, 1);
        if (sugg2b.length > 2 && !this.isMisspelled(speller1, sugg2a) && !this.isMisspelled(speller1, sugg2b)) {
          if (ruleMatch === null) {
            if (getFrequency(speller1, sugg2a) + getFrequency(speller1, sugg2b) > getFrequency(speller1, nextWord)) {
              ruleMatch = this.createWrongSplitMatch(sentence, ruleMatchesSoFar, nextStartPos, nextWord, sugg2a, sugg2b, startPos);
              afterSuggestionStr = ` ${nextWord}`;
            }
          } else {
            ruleMatch.addSuggestedReplacement(javaTrim(`${sugg2a} ${sugg2b}`));
          }
        }
        const sugg = word + nextWord;
        if (nextWord === toLowerCase(nextWord) && !this.isMisspelled(speller1, sugg)) {
          if (ruleMatch === null) {
            if (getFrequency(speller1, sugg) >= getFrequency(speller1, nextWord)) {
              ruleMatch = new RuleMatch(this, sentence, startPos, nextStartPos + nextWord.length,
                this.messages.getString('spelling'), this.messages.getString('desc_spelling_short'));
              ruleMatch.setType(RuleMatch.Type.UnknownWord);
              afterSuggestionStr = ` ${nextWord}`;
              ruleMatch.setSuggestedReplacement(sugg);
            }
          } else {
            ruleMatch.addSuggestedReplacement(sugg);
          }
        }
        if (ruleMatch !== null && this.isMisspelled(speller1, nextWord)) {
          ruleMatches.push(ruleMatch);
          return ruleMatches;
        }
      }
    }

    let translationSuggestionCount = 0;
    let preventFurtherSuggestions = false;

    // Java: Translator translator = getTranslator(globalConfig) is commented out, "Translator translator = null;" (D-019)
    const translator = this.translatorDisabled();
    if (translator !== null && ruleMatch === null && this.motherTongue !== null
        && this.language.getShortCode() === 'en' && this.motherTongue.getShortCode() === 'de') {
      const phrasesToTranslate = [];
      if (idx + 1 < tokens.length) {
        const nextWord = tokens[idx + 1].getToken();
        if (this.isMisspelled(nextWord)) {
          phrasesToTranslate.push({ phrase: `${word} ${nextWord}`, endPos: tokens[idx + 1].getEndPos() });
        }
      }
      phrasesToTranslate.push({ phrase: word, endPos: startPos + word.length });
      for (const phraseToTranslate of phrasesToTranslate) {
        const translations = translator.translate(phraseToTranslate.phrase, this.motherTongue.getShortCode(), this.language.getShortCode());
        if (translations.length !== 0) {
          ruleMatch = new RuleMatch(this, sentence, startPos, phraseToTranslate.endPos, translator.getMessage());
          ruleMatch.setType(RuleMatch.Type.Hint);
          ruleMatch.setSuggestedReplacements([]);
          const l = [];
          const prevWord = idx > 0 ? tokens[idx - 1].getToken() : null;
          for (const translation of translations) {
            for (const s of translation.getL2()) {
              const suffix = translator.getTranslationSuffix(s);
              const repl = new SuggestedReplacement(translator.cleanTranslationForReplace(s, prevWord), translation.getL1().join(', '), suffix.length === 0 ? null : suffix);
              repl.setType(SuggestedReplacement.SuggestionType.Translation);
              if (repl.getReplacement() !== word) {
                l.push(repl);
              }
            }
          }
          const mergedRepl = mergeSuggestionsWithSameTranslation(l);
          if (mergedRepl.length !== 0) {
            ruleMatch.setSuggestedReplacementObjects(mergedRepl);
            translationSuggestionCount = mergedRepl.length;
            if (phraseToTranslate.phrase.includes(' ')) {
              preventFurtherSuggestions = true; // mark gets extended, so suggestions for the original marker won't make sense
            }
            break; // let's assume the first phrase is the best because it's longer
          }
        }
      }
    }

    if (ruleMatch === null) {
      ruleMatch = new RuleMatch(this, sentence, startPos, startPos + word.length, this.messages.getString('spelling'),
        this.messages.getString('desc_spelling_short'));
      ruleMatch.setType(RuleMatch.Type.UnknownWord);
    }

    if (this.userConfig !== null && !this.userConfig.isSuggestionsEnabled()) {
      ruleMatches.push(ruleMatch);
      return ruleMatches;
    }

    // word starting with numbers or bullets
    let cleanWord = word;
    let firstPart = '';
    let secondPart = '';
    const mStartsWithNumbersBullets = pStartsWithNumbersBullets.matcher(word);
    if (mStartsWithNumbersBullets.matches()) {
      const mStartsWithNumbersBulletsExceptions = pStartsWithNumbersBulletsExceptions.matcher(word);
      if (!mStartsWithNumbersBulletsExceptions.matches()) {
        firstPart = mStartsWithNumbersBullets.group(1);
        secondPart = mStartsWithNumbersBullets.group(2);
        const secondPartTokens = this.language.getWordTokenizer().tokenize(secondPart);
        const multitokenIsMisspeled = secondPartTokens.some((str) => this.isMisspelled(speller1, str));
        if ((!multitokenIsMisspeled || this.isIgnoredNoCase(secondPart)) && !this.isProhibited(secondPart)) {
          ruleMatch.addSuggestedReplacement(`${firstPart} ${secondPart}`);
          preventFurtherSuggestions = true;
        } else {
          beforeSuggestionStr = `${firstPart} `;
          cleanWord = secondPart;
        }
      }
    }

    // Java: SuggestionsChanges.getInstance() is null outside of ML experiments (init is package-private, CORE-0233 open)
    const fullResults = false;

    if (this.userConfig === null || this.userConfig.getMaxSpellingSuggestions() === 0
        || ruleMatchesSoFar.length <= this.userConfig.getMaxSpellingSuggestions()) {
      if (translationSuggestionCount > 0) {
        const prev = ruleMatch.getSuggestedReplacementObjects();
        ruleMatch = new RuleMatch(ruleMatch.getRule(), ruleMatch.getSentence(), ruleMatch.getFromPos(), ruleMatch.getToPos(),
          `${this.messages.getString('spelling')} Translations to English are also offered.`);
        ruleMatch.setSuggestedReplacementObjects(prev);
      }

      if (!preventFurtherSuggestions) {
        ruleMatch.setLazySuggestedReplacements(this.appendLazySuggestions(cleanWord, beforeSuggestionStr, afterSuggestionStr,
          fullResults, ruleMatch.getSuggestedReplacementObjects()));
      }
    } else {
      // limited to save CPU
      ruleMatch.setSuggestedReplacement(this.messages.getString('too_many_errors'));
    }

    ruleMatches.push(ruleMatch);
    return ruleMatches;
  }

  // Java: "Translator translator = null" in getRuleMatches (translation path is dead, D-019)
  translatorDisabled() {
    return null;
  }

  // Java: MorfologikSpellerRule#appendLazySuggestions(String,String,String,boolean,List)
  appendLazySuggestions(word, beforeSuggestionStr, afterSuggestionStr, fullResults, prev) {
    return () => {
      let joined;
      try {
        const fromSpeller = this.calcSpellerSuggestions(word, fullResults);
        joined = joinBeforeAfterSuggestions(fromSpeller, beforeSuggestionStr, afterSuggestionStr);
      } catch (e) {
        if (e instanceof IOException) throw new RuntimeException(e);
        throw e;
      }
      return [...prev, ...joined];
    };
  }

  // Java: MorfologikSpellerRule#calcSpellerSuggestions(String,boolean)
  calcSpellerSuggestions(word, fullResults) {
    const onlySuggestions = this.getOnlySuggestions(word);
    if (onlySuggestions.length !== 0) {
      return onlySuggestions;
    }
    let defaultSuggestions = convertWeighted(this.speller1.getWeightedSuggestionsFromDefaultDicts(word));
    let userSuggestions = convertWeighted(this.speller1.getWeightedSuggestionsFromUserDicts(word));
    let onlyCaseDiffers = false;
    if (defaultSuggestions.length > 0 && equalsIgnoreCase(word, defaultSuggestions[0].getReplacement())) {
      // We have no good concept yet for showing both translations and standard suggestions, so
      // use a hack to fix e.g. "muslims" not suggesting "Muslims" (https://github.com/languagetool-org/languagetool/issues/3333)
      onlyCaseDiffers = true;
    }
    if (word.length >= 3 && (onlyCaseDiffers || fullResults || defaultSuggestions.length === 0)) {
      // speller1 uses a maximum edit distance of 1, it won't find suggestion for "garentee", "greatful" etc.
      defaultSuggestions.push(...convertWeighted(this.speller2.getWeightedSuggestionsFromDefaultDicts(word)));
      userSuggestions.push(...convertWeighted(this.speller2.getWeightedSuggestionsFromUserDicts(word)));
      if (word.length >= 5 && (fullResults || defaultSuggestions.length === 0)) {
        defaultSuggestions.push(...convertWeighted(this.speller3.getWeightedSuggestionsFromDefaultDicts(word)));
        userSuggestions.push(...convertWeighted(this.speller3.getWeightedSuggestionsFromUserDicts(word)));
      }
    }
    const topSuggestions = [];
    if (defaultSuggestions.length === 0 && userSuggestions.length === 0 && word.includes('-')) {
      this.addHyphenSuggestions(javaSplit(word, '-'), topSuggestions);
    }
    topSuggestions.push(...this.getAdditionalTopSuggestions(defaultSuggestions, word));
    topSuggestions.forEach((s) => s.setType(SuggestedReplacement.SuggestionType.Curated));
    defaultSuggestions.splice(0, 0, ...topSuggestions);
    defaultSuggestions.push(...this.getAdditionalSuggestions(defaultSuggestions, word));

    if (defaultSuggestions.length === 0 && userSuggestions.length === 0) {
      return [];
    }

    defaultSuggestions = this.filterSuggestions(defaultSuggestions);
    userSuggestions = this.filterDupes(userSuggestions);
    defaultSuggestions = this.orderSuggestions(defaultSuggestions, word);

    if (word.length > 4) {
      return [...userSuggestions, ...defaultSuggestions];
    }
    // Don't use short words from user dictionaries because they usually hide the best suggestions
    return [...defaultSuggestions, ...userSuggestions];
  }

  // Java: MorfologikSpellerRule#addHyphenSuggestions(String[],List)
  addHyphenSuggestions() {
  }

  // Java: MorfologikSpellerRule#tokenizingPattern()
  tokenizingPattern() {
    return null;
  }

  // Java: MorfologikSpellerRule#orderSuggestions(List,String)
  orderSuggestions(suggestions) {
    return suggestions;
  }

  // Java: MorfologikSpellerRule#setCheckCompound(boolean)
  setCheckCompound(checkCompound) {
    this.checkCompound = checkCompound;
  }

  // Java: MorfologikSpellerRule#setCompoundRegex(String)
  setCompoundRegex(compoundRegex) {
    this.compoundRegex = Pattern.compile(compoundRegex);
  }

  // Java: MorfologikSpellerRule#ignoreWord(String)
  ignoreWord(word) {
    return super.ignoreWord(word) || isEmoji(word);
  }

  // Java: MorfologikSpellerRule#getSpellingSuggestions(String)
  getSpellingSuggestions(w) {
    const suggestions = [];
    const atk = [];
    const token = new AnalyzedToken(w, null, null);
    atk.push(new AnalyzedTokenReadings(token));
    const sentence = new AnalyzedSentence(atk);
    const matches = this.match(sentence);
    if (matches.length > 0) {
      suggestions.push(...matches[0].getSuggestedReplacements());
    }
    return suggestions;
  }
}
