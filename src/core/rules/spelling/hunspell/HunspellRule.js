// org.languagetool.rules.spelling.hunspell.HunspellRule (hunspell-based spellchecking rule)
import { SpellingCheckRule, HIGH_CONFIDENCE, LANGUAGETOOL, LANGUAGETOOLER } from '../SpellingCheckRule.js';
import { ForeignLanguageChecker } from '../ForeignLanguageChecker.js';
import { VagueSpellChecker } from '../VagueSpellChecker.js';
import { RuleWithLanguage } from '../RuleWithLanguage.js';
import { Hunspell, dictionaryResourcePath } from './Hunspell.js';
import { RuleMatch } from '../../model/RuleMatch.js';
import { SuggestedReplacement } from '../../model/SuggestedReplacement.js';
import { Categories } from '../../model/Category.js';
import { AnalyzedToken } from '../../../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../../AnalyzedSentence.js';
import { SENTENCE_START_TAGNAME } from '../../../JLanguageToolConstants.js';
import { Languages } from '../../../Languages.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { getResourceAsStream } from '../../../resources/ResourceDataBroker.js';
import { stringForSpeller } from '../../../text/StringTools.js';
import * as Tools from '../../../Tools.js';
import { Pattern } from '../../../../lib/java/regex/index.js';
import { Character } from '../../../../lib/java/Character.js';
import { System } from '../../../../lib/java/System.js';
import { decodeUtf8Java } from '../../../../lib/java/charset.js';
import { scannerLines } from '../../../../lib/java/io.js';
import { IOException, IllegalArgumentException, RuntimeException } from '../../../../lib/java/errors.js';
import { isAllUpperCase } from '../../../../lib/java/StringUtils.js';
import { equalsIgnoreCase, javaReplace, toLowerCase } from '../../../../lib/java/strings.js';
import { LoggerFactory } from '../../../../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.rules.spelling.hunspell.HunspellRule');

const FILE_EXTENSION = '.dic'; // Java: HunspellRule#FILE_EXTENSION
const NON_ALPHABETIC = '[^\\p{L}]'; // Java: HunspellRule#NON_ALPHABETIC
const NON_ALPHABETIC_PATTERN = Pattern.compile(NON_ALPHABETIC); // Java: HunspellRule#NON_ALPHABETIC_PATTERN
const STARTS_WITH_TWO_UPPERCASE_CHARS = Pattern.compile('[A-Z][A-Z]\\p{javaLowerCase}+'); // Java: HunspellRule#STARTS_WITH_TWO_UPPERCASE_CHARS

const monitorRules = System.getProperty('monitorActiveRules') !== null; // Java: HunspellRule#monitorRules (read once)
const activeChecks = []; // Java: HunspellRule#activeChecks (ConcurrentLinkedQueue)

// 300 most common Portuguese words. They are used to avoid wrong split suggestions
const commonPortugueseWords = ['eu', 'ja', 'so', 'de', 'e', 'a', 'o', 'da', 'do', 'em', 'que', 'uma', 'um', 'com', 'no', 'se', 'na', 'para', 'por', 'os', 'foi', 'como', 'dos', 'as', 'ao', 'mais', 'sua', 'das', 'não', 'ou', 'km', 'seu', 'pela', 'ser', 'pelo', 'são', 'também', 'anos', 'cidade', 'entre', 'era', 'tem', 'mas', 'habitantes', 'nos', 'seus', 'área', 'até', 'ele', 'onde', 'foram', 'população', 'região', 'sobre', 'nas', 'nome', 'parte', 'quando', 'ano', 'aos', 'grande', 'mesmo', 'pode', 'primeiro', 'segundo', 'sendo', 'suas', 'ainda', 'dois', 'estado', 'está', 'família', 'já', 'muito', 'outros', 'americano', 'depois', 'durante', 'maior', 'primeira', 'forma', 'apenas', 'banda', 'densidade', 'dia', 'então', 'município', 'norte', 'tempo', 'após', 'duas', 'num', 'pelos', 'qual', 'século', 'ter', 'todos', 'três', 'vez', 'água', 'acordo', 'cobertos', 'comuna', 'contra', 'ela', 'grupo', 'principal', 'quais', 'sem', 'tendo', 'às', 'álbum', 'alguns', 'assim', 'asteróide', 'bem', 'brasileiro', 'cerca', 'desde', 'este', 'localizada', 'mundo', 'outras', 'período', 'seguinte', 'sido', 'vida', 'através', 'cada', 'conhecido', 'final', 'história', 'partir', 'país', 'pessoas', 'sistema', 'terra', 'teve', 'tinha', 'época', 'administrativa', 'censo', 'departamento', 'dias', 'esta', 'filme', 'francesa', 'música', 'província', 'série', 'vezes', 'além', 'antes', 'eles', 'eram', 'espécie', 'governo', 'podem', 'vários', 'censos', 'distrito', 'estão', 'exemplo', 'hoje', 'início', 'jogo', 'lhe', 'lugar', 'muitos', 'média', 'novo', 'numa', 'número', 'pois', 'possui', 'sob', 'só', 'todo', 'tornou', 'trabalho', 'algumas', 'devido', 'estava', 'fez', 'filho', 'fim', 'grandes', 'há', 'isso', 'lado', 'local', 'morte', 'orbital', 'outro', 'passou', 'países', 'quatro', 'representa', 'seja', 'sempre', 'sul', 'várias', 'capital', 'chamado', 'começou', ' enquanto', 'fazer', 'lançado', 'meio', 'nova', 'nível', 'pelas', 'poder', 'presidente', 'redor', 'rio', 'tarde', 'todas', 'carreira', 'casa', 'década', 'estimada', 'guerra', 'havia', 'livro', 'localidades', 'maioria', 'muitas', 'obra', 'origem', 'pai', 'pouco', 'principais', 'produção', 'programa', 'qualquer', 'raio', 'seguintes', 'sucesso', 'título', 'aproximadamente', 'caso', 'centro', 'conhecida', 'construção', 'desta', 'diagrama', 'faz', 'ilha', 'importante', 'mar', 'melhor', 'menos', 'mesma', 'metros', 'mil', 'nacional', 'populacional', 'quase', 'rei', 'sede', 'segunda', 'tipo', 'toda', 'uso', 'velocidade', 'vizinhança', 'volta', 'base', 'brasileira', 'clube', 'desenvolvimento', 'deste', 'diferentes', 'diversos', 'empresa', 'entanto', 'futebol', 'geral', 'junto', 'longo', 'obras', 'outra', 'pertencente', 'política', 'português', 'principalmente', 'processo', 'quem', 'seria', 'têm', 'versão', 'TV', 'acima', 'atual', 'bairro', 'chamada', 'cinco', 'conta', 'corpo', 'dentro', 'deve'];
const commonGermanWords = ['-', 'das', 'sein', 'mein', 'meine', 'meinen', 'meines', 'meiner', 'haben', 'kein', 'keine', 'keinen', 'keinem', 'keines', 'keiner', 'ein', 'eines', 'eins', 'einen', 'einem', 'eine', 'einer', 'rund', 'sehr', 'mach', 'noch', 'nein', 'ja', 'hallo', 'hi', 'das', 'die', 'der', 'den', 'dem', 'des', 'nacht', 'diesen', 'dieser', 'dies', 'dieses', 'diesem', 'zum', 'zur', 'beim', 'noch', 'nichts', 'aufs', 'aufm', 'aufn', 'ausn', 'ausm', 'aus', 'fürs', 'für', 'osten', 'rein', 'raus', 'namen', 'shippen', 'amt', 'wir'];
const MINUS_PLUS = Pattern.compile('-+'); // Java: HunspellRule#MINUS_PLUS

const ignoreFileContents = new Map(); // Java: HunspellRule#ignoreFileContents (key: resource URL = resource path)
const nonWordPatterns = new Map(); // Java: HunspellRule#nonWordPatterns

// Java: HunspellRule#cutOffDot(String)
function cutOffDot(s) {
  return s.endsWith('.') ? s.substring(0, s.length - 1) : s;
}

// Java: HunspellRule#computeNonWordPattern(InputStream)
function computeNonWordPattern(stream) {
  for (const line of scannerLines(decodeUtf8Java(stream))) {
    if (line.startsWith('WORDCHARS ')) {
      const wordCharsFromAff = line.substring('WORDCHARS '.length);
      return Pattern.compile(`(?![${javaReplace(wordCharsFromAff, '-', '\\-')}])${NON_ALPHABETIC}`);
    }
  }
  return NON_ALPHABETIC_PATTERN;
}

// Java: HunspellRule#nonWordPatternFromPath(Path)
function nonWordPatternFromPath(affPath) {
  if (!nonWordPatterns.has(affPath)) {
    let p;
    const aff = getResourceAsStream(dictionaryResourcePath(affPath));
    if (aff === null) {
      logger.error(`Could not read aff file: ${affPath}`);
      p = Pattern.compile(NON_ALPHABETIC);
    } else {
      p = computeNonWordPattern(aff);
    }
    nonWordPatterns.set(affPath, p);
  }
  return nonWordPatterns.get(affPath);
}

// Java: HunspellRule (the rule is a base class: HUNSPELL_RULE)
export class HunspellRule extends SpellingCheckRule {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.HunspellRule';
  static RULE_ID = 'HUNSPELL_RULE';
  static FILE_EXTENSION = FILE_EXTENSION;

  // test hook: each oracle case file is its own JVM (static caches start empty)
  static clearStaticCaches() {
    ignoreFileContents.clear();
    nonWordPatterns.clear();
  }

  // Java: HunspellRule#getActiveChecks()
  static getActiveChecks() {
    return activeChecks;
  }

  // Java: HunspellRule(ResourceBundle,Language,UserConfig[,List[,LanguageModel]])
  constructor(messages, language, userConfig, altLanguages = [], languageModel = null) {
    super(messages, language, userConfig, altLanguages, languageModel);
    super.setCategory(Categories.TYPOS.getCategory(messages));
    this.needsInit = true;
    this.hunspell = null;
    this.nonWordPattern = null;
    this.userConfig = userConfig === undefined ? null : userConfig;
    // Java: enSpellRules = getEnglishSpellingRules() - only read by the never called isEnglish(String), so it is created on first use there
    this.enSpellRules = null;
  }

  // Java: HunspellRule#getEnglishSpellingRules()
  getEnglishSpellingRules() {
    const spellingRules = [];
    let en;
    try {
      en = Languages.getLanguageForShortCode('en-US');
    } catch (e) {
      if (!(e instanceof IllegalArgumentException)) throw e;
      logger.warn('Could not create en-US language for spell-check fallback, multi-lingual spell checking is not available');
      return spellingRules;
    }
    let rules;
    try {
      rules = [...en.getRelevantRules(this.messages, this.userConfig, null, [])];
      rules.push(...en.getRelevantLanguageModelCapableRules(this.messages, null, null, this.userConfig, null, []));
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
    for (const rule of rules) {
      if (rule.isDictionaryBasedSpellingRule()) {
        spellingRules.push(new RuleWithLanguage(rule, en));
      }
    }
    return spellingRules;
  }

  // Java: HunspellRule#getId()
  getId() {
    return HunspellRule.RULE_ID;
  }

  // Java: HunspellRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_spelling');
  }

  // Java: HunspellRule#isQuotedCompound(AnalyzedSentence,int,String)
  isQuotedCompound() {
    return false;
  }

  // Java: HunspellRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    this.ensureInitialized();
    if (this.hunspell === null) {
      // some languages might not have a dictionary, be silent about it
      return this.toRuleMatchArray(ruleMatches);
    }
    const monitoringText = `${this.constructor.FQCN}:${this.getId()}:${sentence.getText()}`;
    try {
      if (monitorRules) {
        activeChecks.push(monitoringText);
      }
      const tokens = this.tokenizeText(this.getSentenceTextWithoutUrlsAndImmunizedTokens(sentence));

      // starting with the first token to skip the zero-length START_SENT
      let len;
      if (sentence.getTokens().length > 1) { // if fixes exception in SuggestionsChangesTest
        len = sentence.getTokens()[1].getStartPos();
      } else {
        len = sentence.getTokens()[0].getStartPos();
      }
      let prevStartPos = -1;
      let gotResultsFromForeignLanguageChecker = false;
      const sentenceLength = sentence.getTokensWithoutWhitespace().filter((k) => !k.isNonWord()).length - 1;
      let foreignLanguageChecker = null;
      if (this.userConfig !== null && this.userConfig.getPreferredLanguages().length !== 0 && this.userConfig.getPreferredLanguages().length >= 2) { // only create instance if user has 2 or more preferredLanguages
        foreignLanguageChecker = new ForeignLanguageChecker(this.language.getShortCode(), sentence.getText(), sentenceLength, this.userConfig.getPreferredLanguages());
      }
      for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        let dashCorr = 0;
        if ((this.ignoreWordAt(tokens, i) || this.ignoreWord(word)) && !this.isProhibited(cutOffDot(word))) {
          prevStartPos = len;
          len += word.length + 1;
          continue;
        }
        if (this.isMisspelled(word)) {
          if (this.ignorePotentiallyMisspelledWord(word)) {
            prevStartPos = len;
            len += word.length + 1;
            continue;
          }
          const cleanWord = word.endsWith('.') ? word.substring(0, word.length - 1) : word;
          if (word.startsWith('-')) {
            if (!this.isMisspelled(cleanWord.substring(1)) || MINUS_PLUS.matcher(cleanWord).matches()) {
              len += word.length + 1;
              continue;
            } else {
              dashCorr++;
            }
          }
          if (i > 0 && prevStartPos !== -1) {
            const prevWord = tokens[i - 1];
            let ignoreSplitting = false;
            if (this.language.getShortCode() === 'pt' && (commonPortugueseWords.includes(toLowerCase(prevWord))
              || commonPortugueseWords.includes(toLowerCase(word)))) {
              ignoreSplitting = true;
            }
            if (this.language.getShortCode() === 'de' && (commonGermanWords.includes(toLowerCase(prevWord))
              || commonGermanWords.includes(toLowerCase(word)))) {
              ignoreSplitting = true;
            }
            if (!ignoreSplitting && prevWord.length > 0) {
              // "thanky ou" -> "thank you"
              const sugg1a = prevWord.substring(0, prevWord.length - 1);
              const sugg1b = cutOffDot(prevWord.substring(prevWord.length - 1) + word);
              if (!this.isMisspelled(sugg1a) && !this.isMisspelled(sugg1b) && this.acceptSuggestion(`${sugg1a} ${sugg1b}`)) {
                const rm = this.createWrongSplitMatch(sentence, ruleMatches, len, cleanWord, sugg1a, sugg1b, prevStartPos);
                if (rm !== null) {
                  ruleMatches.push(rm);
                }
              }
              // "than kyou" -> "thank you"
              const sugg2a = prevWord + word.charAt(0);
              const sugg2b = cutOffDot(word.substring(1));
              if (!this.isMisspelled(sugg2a) && !this.isMisspelled(sugg2b) && this.acceptSuggestion(`${sugg2a} ${sugg2b}`)) {
                const rm = this.createWrongSplitMatch(sentence, ruleMatches, len, cleanWord, sugg2a, sugg2b, prevStartPos);
                if (rm !== null) {
                  ruleMatches.push(rm);
                }
              }
            }
          }

          const ruleMatch = new RuleMatch(this, sentence,
            len + dashCorr, len + cleanWord.length,
            this.messages.getString('spelling'),
            this.messages.getString('desc_spelling_short'));
          ruleMatch.setType(RuleMatch.Type.UnknownWord);
          const cleanWord2 = cleanWord.substring(dashCorr);
          if (this.userConfig !== null && !this.userConfig.isSuggestionsEnabled()) {
            ruleMatch.setSuggestedReplacements([]);
          } else if (this.userConfig === null || this.userConfig.getMaxSpellingSuggestions() === 0 || ruleMatches.length <= this.userConfig.getMaxSpellingSuggestions()) {
            const sugg = this.calcSuggestions(word, cleanWord2);
            if (this.isFirstItemHighConfidenceSuggestion(word, sugg)) {
              sugg[0].setConfidence(HIGH_CONFIDENCE);
            }
            if (sugg.length > 0) {
              ruleMatch.setMessage(this.getMessage(cleanWord2, sugg[0]));
            }
            ruleMatch.setSuggestedReplacementObjects(sugg);
          } else {
            // limited to save CPU
            ruleMatch.setSuggestedReplacement(this.messages.getString('too_many_errors'));
          }
          ruleMatches.push(ruleMatch);
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
        prevStartPos = len + dashCorr;
        len += word.length + 1;
      }
    } finally {
      if (monitorRules) {
        const i = activeChecks.indexOf(monitoringText);
        if (i >= 0) activeChecks.splice(i, 1);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: HunspellRule#getMessage(String,SuggestedReplacement)
  getMessage() {
    return this.messages.getString('spelling');
  }

  // Java: HunspellRule#getShortMessage(String,SuggestedReplacement)
  getShortMessage() {
    return this.messages.getString('desc_spelling_short');
  }

  // Java: HunspellRule#acceptSuggestion(String)
  acceptSuggestion() {
    return true;
  }

  // Java: HunspellRule#isFirstItemHighConfidenceSuggestion(String,List)
  isFirstItemHighConfidenceSuggestion(word, sugg) {
    // finds cases like "HAus", where "Haus" is surely the proper suggestion:
    if (sugg.length > 0
      && word !== 'IPs'
      && equalsIgnoreCase(word, sugg[0].getReplacement())
      && STARTS_WITH_TWO_UPPERCASE_CHARS.matcher(word).matches()
      && this.language.getShortCode() === 'de') {
      if (word.endsWith('s') && isAllUpperCase(sugg[0].getReplacement())) {
        // e.g. "DMs" could mean plural of "DM"
        return false;
      }
      return true;
    }
    return false;
  }

  // Java: HunspellRule#isEnglish(String)
  isEnglish(word) {
    if (this.enSpellRules === null) this.enSpellRules = this.getEnglishSpellingRules();
    for (const altRule of this.enSpellRules) {
      const token = new AnalyzedToken(word, null, null);
      const sentenceStartToken = new AnalyzedToken('', SENTENCE_START_TAGNAME, null);
      const startTokenReadings = new AnalyzedTokenReadings(sentenceStartToken, 0);
      const atr = new AnalyzedTokenReadings(token, 0);
      const matches = altRule.getRule().match(new AnalyzedSentence([startTokenReadings, atr]));
      if (matches.length === 0) {
        return true;
      } else if (word.endsWith('.')) {
        return this.isEnglish(word.substring(0, word.length - 1));
      }
    }
    return false;
  }

  // Java: HunspellRule#calcSuggestions(String,String)
  calcSuggestions(word, cleanWord) {
    const onlySuggestions = this.getOnlySuggestions(cleanWord);
    if (onlySuggestions.length !== 0) {
      return onlySuggestions;
    }
    let suggestions = SuggestedReplacement.convert(this.getSuggestions(cleanWord));
    if (word.endsWith('.')) {
      let pos = 1;
      for (const suggestion of this.getSuggestions(word)) {
        if (suggestions.every((sr) => suggestion !== sr.getReplacement())) {
          suggestions.splice(Math.min(pos, suggestions.length), 0, new SuggestedReplacement(suggestion.substring(0, suggestion.length - 1)));
          pos += 2; // we mix the lists, as we don't know which one is the better one
        }
      }
    }
    let additionalTopSuggestions = this.getAdditionalTopSuggestions(suggestions, cleanWord);
    if (additionalTopSuggestions.length === 0 && word.endsWith('.')) {
      additionalTopSuggestions = this.getAdditionalTopSuggestions(suggestions, word)
        .map((sugg) => {
          if (sugg.getReplacement().endsWith('.')) {
            return sugg;
          } else {
            const newSugg = new SuggestedReplacement(sugg);
            newSugg.setReplacement(`${sugg.getReplacement()}.`);
            return newSugg;
          }
        });
    }
    additionalTopSuggestions.reverse();
    for (const additionalTopSuggestion of additionalTopSuggestions) {
      if (cleanWord !== additionalTopSuggestion.getReplacement()) {
        suggestions.unshift(additionalTopSuggestion);
      }
    }
    const additionalSuggestions = this.getAdditionalSuggestions(suggestions, cleanWord);
    for (const additionalSuggestion of additionalSuggestions) {
      if (cleanWord !== additionalSuggestion.getReplacement()) {
        suggestions.push(...additionalSuggestions);
      }
    }
    suggestions = suggestions.filter((k) => this.acceptSuggestion(k.getReplacement()));
    suggestions = this.filterDupes(this.filterSuggestions(suggestions));
    // TODO user suggestions
    return suggestions;
  }

  // Java: HunspellRule#isMisspelled(String)
  isMisspelled(word) {
    if (!Tools.isExternSpeller()) { // use of external speller for OO extension (32-bit)
      this.ensureInitialized();
    }
    let isAlphabetic = true;
    if (word.length === 1) { // hunspell dictionaries usually do not contain punctuation
      isAlphabetic = Character.isAlphabetic(word.charCodeAt(0));
    }
    return (
      isAlphabetic && word !== '--'
      && ((this.hunspell !== null && !this.hunspell.spell(word))
        || (Tools.isExternSpeller() && Tools.getLinguisticServices().isCorrectSpell(word, this.language)))
      // use of external speller for OO extension (32-bit)
      && !this.ignoreWord(word)
    )
      || this.isProhibited(cutOffDot(word));
  }

  // Java: HunspellRule#getSuggestions(String)
  getSuggestions(word) {
    this.ensureInitialized();
    return this.hunspell.suggest(word);
  }

  // Java: HunspellRule#sortSuggestionByQuality(String,List)
  sortSuggestionByQuality(misspelling, suggestions) {
    return suggestions;
  }

  // Java: HunspellRule#tokenizeText(String)
  tokenizeText(sentence) {
    return this.nonWordPattern.split(sentence);
  }

  // Java: HunspellRule#getSentenceTextWithoutUrlsAndImmunizedTokens(AnalyzedSentence)
  getSentenceTextWithoutUrlsAndImmunizedTokens(sentence) {
    let sb = '';
    const sentenceTokens = this.getSentenceWithImmunization(sentence).getTokens();
    for (let i = 1; i < sentenceTokens.length; i++) {
      let token = sentenceTokens[i].getToken();
      if (sentenceTokens[i].isImmunized() || sentenceTokens[i].isIgnoredBySpeller() || this.isUrl(token) || this.isEMail(token)
        || this.isQuotedCompound(sentence, i, token) || sentenceTokens[i].hasPosTag('_english_ignore_')) {
        if (this.isQuotedCompound(sentence, i, token)) {
          sb += ` ${token.substring(1)}`;
        } else {
          // replace URLs and immunized tokens with whitespace to ignore them for spell checking:
          sb += ' '.repeat(token.length);
        }
      } else {
        token = stringForSpeller(token);
        sb += token;
      }
    }
    return sb;
  }

  // Java: HunspellRule#ensureInitialized()
  ensureInitialized() {
    if (this.needsInit) {
      try {
        this.init();
      } finally {
        this.needsInit = false;
      }
    }
  }

  // Java: HunspellRule#init()
  init() {
    super.init();
    let langCountry = this.language.getShortCode();
    if (this.language.getCountries().length > 0) {
      langCountry += `_${this.language.getCountries()[0]}`;
    }
    const shortDicPath = this.getDictFilenameInResources(langCountry);
    // set dictionary only if there are dictionary files:
    if (!Tools.isExternSpeller()) { // use of external speller for OO extension (32-bit); hunspell doesn't support 32-bit java
      if (getDataBroker().resourceExists(shortDicPath)) {
        const aff = `${shortDicPath.substring(0, shortDicPath.length - 3)}aff`;
        this.hunspell = Hunspell.forDictionaryInResources(langCountry, shortDicPath, aff);
        this.addIgnoreWordsFromIgnoreFile();
        const key = `resource:${shortDicPath}`;
        if (!nonWordPatterns.has(key)) {
          nonWordPatterns.set(key, computeNonWordPattern(getDataBroker().getFromResourceDirAsStream(aff)));
        }
        this.nonWordPattern = nonWordPatterns.get(key);
      } else if (getResourceAsStream(dictionaryResourcePath(`${shortDicPath}.dic`)) !== null) {
        // for dynamic languages
        const affPath = `${shortDicPath}.aff`;
        this.hunspell = Hunspell.getDictionary(`${shortDicPath}.dic`, affPath);
        this.nonWordPattern = nonWordPatternFromPath(affPath);
      }
    }

    if (this.nonWordPattern === null) {
      this.nonWordPattern = NON_ALPHABETIC_PATTERN;
    }
  }

  // Java: HunspellRule#getDictFilenameInResources(String)
  getDictFilenameInResources(langCountry) {
    return `/${this.language.getShortCode()}/hunspell/${langCountry}${FILE_EXTENSION}`;
  }

  // Java: HunspellRule#addIgnoreWords() (private, no argument)
  addIgnoreWordsFromIgnoreFile() {
    const ignoreUrl = getDataBroker().getFromResourceDirAsUrl(this.getIgnoreFileName());
    const key = String(ignoreUrl);
    if (!ignoreFileContents.has(key)) {
      let lines;
      try {
        lines = getDataBroker().getFromResourceDirAsLines(this.getIgnoreFileName()).filter((line) => !line.startsWith('#'));
      } catch (e) {
        if (!(e instanceof IOException)) throw e;
        logger.error(`Could not read ignore file: ${ignoreUrl}`);
        lines = [];
      }
      ignoreFileContents.set(key, lines);
    }
    const lines = ignoreFileContents.get(key);
    this.applyIgnorePlan(this.ignorePlanFor(lines, 'direct', (addWord, addCompound, addSingle) => { for (const w of lines) addSingle(w); })); // JS: plan of adding the lines unchanged
  }

  // Java: HunspellRule#isInIgnoredSet(String)
  isInIgnoredSet(word) {
    return super.isInIgnoredSet(word)
      // We don't add these words to the main set to prevent startsWithIgnoredWord honoring them,
      // and thus to avoid the bogus "LanguageToolaccount" suggestion in AgreementRuleTest.
      // A better way might be nice.
      || LANGUAGETOOL === word || LANGUAGETOOLER === word;
  }
}

VagueSpellChecker.hunspellRuleClass = HunspellRule; // Java: r instanceof HunspellRule in VagueSpellChecker
