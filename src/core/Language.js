// Java: org.languagetool.Language (abstract base class of all languages; later steps fill the component hooks via src/core/language/components.js)
import { existsSync, readFileSync } from 'node:fs';
import { AbstractMethodError, FileNotFoundException, IOException, MissingResourceException } from '../lib/java/errors.js';
import { Locale } from '../lib/java/Locale.js';
import { Pattern } from '../lib/java/regex/index.js';
import { equalsIgnoreCase, javaReplace, stringHashCode } from '../lib/java/strings.js';
import { replaceOnce } from '../lib/java/StringUtils.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { getDataBroker } from './resources/LtStatics.js';
import { getMessageBundleForLanguage } from './resources/ResourceBundleTools.js';
import { CUSTOM_PATTERN_FILE, PATTERN_FILE, STYLE_FILE } from './JLanguageToolConstants.js';
import { LanguageMaintainedState } from './LanguageMaintainedState.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.Language');
import { createComponent, sharedComponent } from './language/components.js';
import { languages } from './languagesRef.js';
import './patterns/UnifierConfiguration.js';
import './tagging/xx/DemoTagger.js';
import './tagging/disambiguation/xx/DemoDisambiguator.js';

const INSIDE_SUGGESTION = Pattern.compile('<suggestion>(.+?)</suggestion>');
const APOSTROPHE = Pattern.compile("([\\p{L}\\d-])'([\\p{L}«])", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

const SUGGESTION_OPEN_TAG = '<suggestion>';
const SUGGESTION_CLOSE_TAG = '</suggestion>';

const NBSPACE1 = Pattern.compile('\\b([a-zA-Z]\\.) ([a-zA-Z]\\.)');
const NBSPACE2 = Pattern.compile('\\b([a-zA-Z]\\.) ');

const languagetoolInstances = new Map(); // Java: Language#languagetoolInstances (keyed by class)
const QUOTED_CHAR_PATTERN = Pattern.compile(" '(.)'");
const TYPOGRAPHY_PATTERN_1 = Pattern.compile("([\\u202f\\u00a0 «\"\\(])'");
const TYPOGRAPHY_PATTERN_2 = Pattern.compile("'([   !\\?,\\.;:\"\\)])");
const TYPOGRAPHY_PATTERN_3 = Pattern.compile('‘s\\b([^’])');
const TYPOGRAPHY_PATTERN_4 = Pattern.compile('([ \\(])"');
const TYPOGRAPHY_PATTERN_5 = Pattern.compile('"([\\u202f\\u00a0 !\\?,\\.;:\\)])');

const spellingRules = new Map(); // Java: Language#spellingRules (keyed by class)

// test/oracle support: a fresh JVM starts with an empty Language#spellingRules
export function clearDefaultSpellingRules() {
  spellingRules.clear();
}

// Java: Class#isAssignableFrom(Class) (a.isAssignableFrom(b))
export function isAssignableFrom(a, b) {
  return a === b || b.prototype instanceof a;
}

// Java: Language
export class Language {
  static FQCN = 'org.languagetool.Language';

  // Java: Language#Language()
  constructor() {
    this.unifierConfig = createComponent('org.languagetool.rules.patterns.UnifierConfiguration');
    this.disambiguationUnifierConfig = createComponent('org.languagetool.rules.patterns.UnifierConfiguration');
    this.ignoredCharactersRegex = Pattern.compile('[­]'); // soft hyphen
    this.patternRules = null;
    this.disambiguator = null;
    this.tagger = null;
    this.sentenceTokenizer = null;
    this.wordTokenizer = null;
    this.chunker = null;
    this.postDisambiguationChunker = null;
    this.synthesizer = null;
    this.shortCodeWithCountryAndVariant = null;
  }

  // Java: Language#getShortCode()
  getShortCode() {
    throw new AbstractMethodError('org.languagetool.Language.getShortCode()');
  }

  // Java: Language#getName()
  getName() {
    throw new AbstractMethodError('org.languagetool.Language.getName()');
  }

  // Java: Language#getCountries()
  getCountries() {
    throw new AbstractMethodError('org.languagetool.Language.getCountries()');
  }

  // Java: Language#getMaintainers()
  getMaintainers() {
    throw new AbstractMethodError('org.languagetool.Language.getMaintainers()');
  }

  // Java: Language#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw new AbstractMethodError('org.languagetool.Language.getRelevantRules()');
  }

  // Java: Language#getCommonWordsPath()
  getCommonWordsPath() {
    return `${this.getShortCode()}/common_words.txt`;
  }

  // Java: Language#getVariant()
  getVariant() {
    return null;
  }

  // Java: Language#getDefaultEnabledRulesForVariant()
  getDefaultEnabledRulesForVariant() {
    return [];
  }

  // Java: Language#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return [];
  }

  // Java: Language#getLanguageModel(File)
  getLanguageModel() {
    return null;
  }

  // Java: Language#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
    return [];
  }

  // Java: Language#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    return [];
  }

  // Java: Language#getRelevantRemoteRules(ResourceBundle,List,GlobalConfig,UserConfig,Language,List,boolean); GRPC rules are not available (DEV-001)
  getRelevantRemoteRules(messageBundle, configs, globalConfig, userConfig, motherTongue, altLanguages, inputLogging) {
    const rules = [];
    for (const config of configs) {
      if (config.getRuleId().startsWith('TEST')) rules.push(createComponent('org.languagetool.rules.TestRemoteRule', this, config));
    }
    return rules;
  }

  // Java: Language#getRemoteEnhancedRules(ResourceBundle,List,UserConfig,Language,List,boolean)
  getRemoteEnhancedRules() {
    return (rule) => rule;
  }

  // Java: Language#getRelevantRulesGlobalConfig(ResourceBundle,GlobalConfig,UserConfig,Language,List)
  getRelevantRulesGlobalConfig() {
    return [];
  }

  // Java: Language#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule() {
    return null;
  }

  // Java: Language#getDefaultSpellingRule()
  getDefaultSpellingRule() {
    const c = this.constructor;
    if (!spellingRules.has(c)) {
      let rule;
      try {
        rule = this.createDefaultSpellingRule(getMessageBundleForLanguage(this));
      } catch (e) {
        if (!(e instanceof IOException)) throw e;
        logger.warn('Failed to create default spelling rule', e);
        rule = null;
      }
      if (rule !== null && rule !== undefined) spellingRules.set(c, rule);
      return rule ?? null;
    }
    return spellingRules.get(c);
  }

  // Java: Language#getLocale()
  getLocale() {
    return new Locale(this.getShortCode());
  }

  // Java: Language#getLocaleWithCountryAndVariant()
  getLocaleWithCountryAndVariant() {
    if (this.getCountries().length > 0) {
      if (this.getVariant() !== null) {
        return new Locale(this.getShortCode(), this.getCountries()[0], this.getVariant());
      }
      return new Locale(this.getShortCode(), this.getCountries()[0]);
    }
    return this.getLocale();
  }

  // Java: Language#getRuleFileNames()
  getRuleFileNames() {
    const ruleFiles = [];
    const dataBroker = getDataBroker();
    ruleFiles.push(`${dataBroker.getRulesDir()}/${this.getShortCode()}/${PATTERN_FILE}`);
    if (dataBroker.ruleFileExists(`${this.getShortCode()}/${STYLE_FILE}`)) {
      const customFile = `${dataBroker.getRulesDir()}/${this.getShortCode()}/${STYLE_FILE}`;
      ruleFiles.push(customFile);
    }
    if (dataBroker.ruleFileExists(`${this.getShortCode()}/${CUSTOM_PATTERN_FILE}`)) {
      const customFile = `${dataBroker.getRulesDir()}/${this.getShortCode()}/${CUSTOM_PATTERN_FILE}`;
      ruleFiles.push(customFile);
    }
    if (this.getShortCodeWithCountryAndVariant().length > 2) {
      const fileName = `${this.getShortCode()}/${this.getShortCodeWithCountryAndVariant()}/${PATTERN_FILE}`;
      if (dataBroker.ruleFileExists(fileName)) {
        ruleFiles.push(`${dataBroker.getRulesDir()}/${fileName}`);
      }
      const styleFileName = `${this.getShortCode()}/${this.getShortCodeWithCountryAndVariant()}/${STYLE_FILE}`;
      if (dataBroker.ruleFileExists(styleFileName)) {
        ruleFiles.push(`${dataBroker.getRulesDir()}/${styleFileName}`);
      }
      const premiumFileName = `${this.getShortCode()}/${this.getShortCodeWithCountryAndVariant()}/grammar-premium.xml`;
      if (dataBroker.ruleFileExists(premiumFileName)) {
        ruleFiles.push(`${dataBroker.getRulesDir()}/${premiumFileName}`);
      }
    }
    return ruleFiles;
  }

  // Java: Language#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return this;
  }

  // Java: Language#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return sharedComponent('org.languagetool.tagging.disambiguation.xx.DemoDisambiguator');
  }

  // Java: Language#getDisambiguator()
  getDisambiguator() {
    if (this.disambiguator === null) {
      this.disambiguator = this.createDefaultDisambiguator();
    }
    return this.disambiguator;
  }

  // Java: Language#setDisambiguator(Disambiguator)
  setDisambiguator(disambiguator) {
    this.disambiguator = disambiguator;
  }

  // Java: Language#createDefaultTagger()
  createDefaultTagger() {
    return sharedComponent('org.languagetool.tagging.xx.DemoTagger');
  }

  // Java: Language#getTagger()
  getTagger() {
    if (this.tagger === null) {
      this.tagger = this.createDefaultTagger();
    }
    return this.tagger;
  }

  // Java: Language#setTagger(Tagger)
  setTagger(tagger) {
    this.tagger = tagger;
  }

  // Java: Language#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return sharedComponent('org.languagetool.tokenizers.SimpleSentenceTokenizer');
  }

  // Java: Language#getSentenceTokenizer()
  getSentenceTokenizer() {
    if (this.sentenceTokenizer === null) {
      this.sentenceTokenizer = this.createDefaultSentenceTokenizer();
    }
    return this.sentenceTokenizer;
  }

  // Java: Language#setSentenceTokenizer(SentenceTokenizer)
  setSentenceTokenizer(tokenizer) {
    this.sentenceTokenizer = tokenizer;
  }

  // Java: Language#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return sharedComponent('org.languagetool.tokenizers.WordTokenizer');
  }

  // Java: Language#getWordTokenizer()
  getWordTokenizer() {
    if (this.wordTokenizer === null) {
      this.wordTokenizer = this.createDefaultWordTokenizer();
    }
    return this.wordTokenizer;
  }

  // Java: Language#setWordTokenizer(Tokenizer)
  setWordTokenizer(tokenizer) {
    this.wordTokenizer = tokenizer;
  }

  // Java: Language#createDefaultChunker()
  createDefaultChunker() {
    return null;
  }

  // Java: Language#getChunker()
  getChunker() {
    if (this.chunker === null) {
      this.chunker = this.createDefaultChunker();
    }
    return this.chunker;
  }

  // Java: Language#setChunker(Chunker)
  setChunker(chunker) {
    this.chunker = chunker;
  }

  // Java: Language#createDefaultPostDisambiguationChunker()
  createDefaultPostDisambiguationChunker() {
    return null;
  }

  // Java: Language#getPostDisambiguationChunker()
  getPostDisambiguationChunker() {
    if (this.postDisambiguationChunker === null) {
      this.postDisambiguationChunker = this.createDefaultPostDisambiguationChunker();
    }
    return this.postDisambiguationChunker;
  }

  // Java: Language#setPostDisambiguationChunker(Chunker)
  setPostDisambiguationChunker(chunker) {
    this.postDisambiguationChunker = chunker;
  }

  // Java: Language#createDefaultJLanguageTool()
  createDefaultJLanguageTool() {
    const clazz = this.constructor;
    if (!languagetoolInstances.has(clazz)) languagetoolInstances.set(clazz, createComponent('org.languagetool.JLanguageTool', this));
    return languagetoolInstances.get(clazz);
  }

  // Java: Language#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return null;
  }

  // Java: Language#getSynthesizer()
  getSynthesizer() {
    if (this.synthesizer === null) {
      this.synthesizer = this.createDefaultSynthesizer();
    }
    return this.synthesizer;
  }

  // Java: Language#setSynthesizer(Synthesizer)
  setSynthesizer(synthesizer) {
    this.synthesizer = synthesizer;
  }

  // Java: Language#getUnifier()
  getUnifier() {
    return this.unifierConfig.createUnifier();
  }

  // Java: Language#getDisambiguationUnifier()
  getDisambiguationUnifier() {
    return this.disambiguationUnifierConfig.createUnifier();
  }

  // Java: Language#getUnifierConfiguration()
  getUnifierConfiguration() {
    return this.unifierConfig;
  }

  // Java: Language#getDisambiguationUnifierConfiguration()
  getDisambiguationUnifierConfiguration() {
    return this.disambiguationUnifierConfig;
  }

  // Java: Language#getTranslatedName(ResourceBundle)
  getTranslatedName(messages) {
    try {
      return messages.getString(this.getShortCodeWithCountryAndVariant());
    } catch (e) {
      if (!(e instanceof MissingResourceException)) throw e;
      try {
        return messages.getString(this.getShortCode());
      } catch (e1) {
        if (!(e1 instanceof MissingResourceException)) throw e1;
        return this.getName();
      }
    }
  }

  // Java: Language#getShortCodeWithCountryAndVariant()
  getShortCodeWithCountryAndVariant() {
    if (this.shortCodeWithCountryAndVariant === null) {
      this.shortCodeWithCountryAndVariant = this.buildShortCodeWithCountryAndVariant();
    }
    return this.shortCodeWithCountryAndVariant;
  }

  // Java: Language#buildShortCodeWithCountryAndVariant()
  buildShortCodeWithCountryAndVariant() {
    let name = this.getShortCode();
    if (this.getCountries().length === 1 && !name.includes('-x-')) { // e.g. "de-DE-x-simple-language"
      name += `-${this.getCountries()[0]}`;
      if (this.getVariant() !== null) { // e.g. "ca-ES-valencia"
        name += `-${this.getVariant()}`;
      }
    }
    return name;
  }

  // Java: Language#getPatternRules()
  getPatternRules() {
    // use lazy loading to speed up server use case and start of stand-alone LT, where all the languages get initialized:
    if (this.patternRules === null) {
      this.patternRules = this.initializePatternRules();
    }
    return this.patternRules;
  }

  // Java: Language#initializePatternRules()
  initializePatternRules() {
    const rules = [];
    const ruleLoader = createComponent('org.languagetool.rules.patterns.PatternRuleLoader');
    for (const fileName of this.getRuleFileNames()) {
      let is = getDataBroker().getAsStream(fileName);
      let ignore = false;
      if (is === null) { // files loaded via the dialog
        if (existsSync(fileName)) {
          is = readFileSync(fileName);
        } else if (fileName.includes('-test-')) {
          // ignore, used for testing
          ignore = true;
        } else {
          throw new FileNotFoundException(`${fileName} (No such file or directory)`);
        }
      }
      if (!ignore) {
        for (const r of ruleLoader.getRules(is, fileName, this)) rules.push(r);
      }
    }
    return Object.freeze(rules);
  }

  // Java: Language#toString()
  toString() {
    return this.getName();
  }

  // Java: Language#isVariant()
  isVariant() {
    for (const language of languages().get()) {
      const skip = language.getShortCodeWithCountryAndVariant() === this.getShortCodeWithCountryAndVariant();
      if (!skip && isAssignableFrom(language.constructor, this.constructor)) {
        return true;
      }
    }
    return false;
  }

  // Java: Language#hasVariant()
  hasVariant() {
    for (const language of languages().get()) {
      const skip = language.getShortCodeWithCountryAndVariant() === this.getShortCodeWithCountryAndVariant();
      if (!skip && isAssignableFrom(this.constructor, language.constructor)) {
        return true;
      }
    }
    return false;
  }

  // Java: Language#isExternal()
  isExternal() {
    return false;
  }

  // Java: Language#equalsConsiderVariantsIfSpecified(Language)
  equalsConsiderVariantsIfSpecified(otherLanguage) {
    if (this.getShortCode() === otherLanguage.getShortCode()) {
      const thisHasCountry = this.hasCountry();
      const otherHasCountry = otherLanguage.hasCountry();
      return !(thisHasCountry && otherHasCountry)
        || this.getShortCodeWithCountryAndVariant() === otherLanguage.getShortCodeWithCountryAndVariant();
    }
    return false;
  }

  // Java: Language#hasCountry()
  hasCountry() {
    return this.getCountries().length === 1;
  }

  // Java: Language#getIgnoredCharactersRegex()
  getIgnoredCharactersRegex() {
    return this.ignoredCharactersRegex;
  }

  // Java: Language#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.LookingForNewMaintainer;
  }

  // Java: Language#isHiddenFromGui()
  isHiddenFromGui() {
    return this.hasVariant() && !this.isVariant() && !this.isTheDefaultVariant();
  }

  // Java: Language#isTheDefaultVariant()
  isTheDefaultVariant() {
    if (this.getDefaultLanguageVariant() !== null) {
      return this.constructor === this.getDefaultLanguageVariant().constructor;
    }
    return false;
  }

  // Java: Language#getPriorityForId(String)
  getPriorityForId(id) {
    if (equalsIgnoreCase(id, 'TOO_LONG_SENTENCE')) {
      return -101; // don't hide spelling errors
    }
    if (id === 'REPETITIONS_STYLE') { // category
      return -55; // don't let style issues hide more important errors
    }
    if (id.includes('STYLE')) { // category
      return -50; // don't let style issues hide more important errors
    }
    return 0;
  }

  // Java: Language#getRulePriority(Rule)
  getRulePriority(rule) {
    const categoryPriority = this.getPriorityForId(rule.getCategory().getId().toString());
    const rulePriority = this.getPriorityForId(rule.getId());
    const rulePriorityFromRule = rule.getPriority();
    // if there is a priority defined for rule it takes precedence over category priority
    if (rulePriority !== 0) {
      return rulePriority;
    } else if (rulePriorityFromRule !== 0) {
      return rulePriorityFromRule;
    } else if (categoryPriority !== 0) {
      return categoryPriority;
    } else if (this.getDefaultRulePriorityForStyle() !== 0 && rule.getLocQualityIssueType().name() === 'Style') {
      return this.getDefaultRulePriorityForStyle();
    }
    return 0;
  }

  // Java: Language#getDefaultRulePriorityForStyle()
  getDefaultRulePriorityForStyle() {
    return 0;
  }

  // Java: Language#isSpellcheckOnlyLanguage()
  isSpellcheckOnlyLanguage() {
    return false;
  }

  // Java: Language#hasNGramFalseFriendRule(Language)
  hasNGramFalseFriendRule() {
    return false;
  }

  // Java: Language#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '"';
  }

  // Java: Language#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '"';
  }

  // Java: Language#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return "'";
  }

  // Java: Language#getClosingSingleQuote()
  getClosingSingleQuote() {
    return "'";
  }

  // Java: Language#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return false;
  }

  // Java: Language#toAdvancedTypography(String)
  toAdvancedTypography(input) {
    if (!this.isAdvancedTypographyEnabled()) {
      return javaReplace(javaReplace(input, SUGGESTION_OPEN_TAG, this.getOpeningDoubleQuote()), SUGGESTION_CLOSE_TAG, this.getClosingDoubleQuote());
    }
    let output = input;

    // Preserve content inside <suggestion></suggestion>
    const preservedStrings = [];
    let countPreserved = 0;
    const m = INSIDE_SUGGESTION.matcher(output);
    let offset = 0;
    while (m.find(offset)) {
      const group = m.group(1);
      preservedStrings.push(group);
      output = replaceOnce(output, `<suggestion>${group}</suggestion>`, `\\${countPreserved}`);
      countPreserved++;
      offset = m.end();
    }

    // Ellipsis (for all languages?)
    output = javaReplace(output, '...', '…');

    // non-breaking space
    output = NBSPACE1.matcher(output).replaceAll('$1 $2');
    output = NBSPACE2.matcher(output).replaceAll('$1 ');

    const matcher = APOSTROPHE.matcher(output);
    output = matcher.replaceAll('$1’$2');

    // single quotes
    if (output.startsWith("'")) {
      output = this.getOpeningSingleQuote() + output.substring(1);
    }
    if (output.endsWith("'")) {
      output = output.substring(0, output.length - 1) + this.getClosingSingleQuote();
    }
    output = QUOTED_CHAR_PATTERN.matcher(output).replaceAll(` ${this.getOpeningSingleQuote()}$1${this.getClosingSingleQuote()}`); // exception single character
    output = TYPOGRAPHY_PATTERN_1.matcher(output).replaceAll(`$1${this.getOpeningSingleQuote()}`);
    output = TYPOGRAPHY_PATTERN_2.matcher(output).replaceAll(`${this.getClosingSingleQuote()}$1`);
    output = TYPOGRAPHY_PATTERN_3.matcher(output).replaceAll('’s$1'); // exception genitive

    // double quotes
    if (output.startsWith('"')) {
      output = this.getOpeningDoubleQuote() + output.substring(1);
    }
    if (output.endsWith('"')) {
      output = output.substring(0, output.length - 1) + this.getClosingDoubleQuote();
    }
    output = TYPOGRAPHY_PATTERN_4.matcher(output).replaceAll(`$1${this.getOpeningDoubleQuote()}`);
    output = TYPOGRAPHY_PATTERN_5.matcher(output).replaceAll(`${this.getClosingDoubleQuote()}$1`);

    // restore suggestions
    for (let i = 0; i < preservedStrings.length; i++) {
      output = replaceOnce(output, `\\${i}`, this.getOpeningDoubleQuote() + preservedStrings[i] + this.getClosingDoubleQuote());
    }

    return javaReplace(javaReplace(output, SUGGESTION_OPEN_TAG, this.getOpeningDoubleQuote()), SUGGESTION_CLOSE_TAG, this.getClosingDoubleQuote());
  }

  // Java: Language#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.getShortCodeWithCountryAndVariant() === o.getShortCodeWithCountryAndVariant();
  }

  // Java: Language#hashCode()
  hashCode() {
    return stringHashCode(this.getShortCodeWithCountryAndVariant());
  }

  // Java: Language#hasMinMatchesRules()
  hasMinMatchesRules() {
    return false;
  }

  // Java: Language#adaptSuggestion(String,String)
  adaptSuggestion(s) {
    return s;
  }

  // Java: Language#adaptSuggestionsList(List,String)
  adaptSuggestionsList(suggestions, originalErrorStr) {
    const newSuggestions = [];
    for (const s of suggestions) {
      newSuggestions.push(this.adaptSuggestion(s, originalErrorStr));
    }
    return newSuggestions;
  }

  // Java: Language#getConsistencyRulePrefix()
  getConsistencyRulePrefix() {
    return 'PREFIXFORCONSISTENCYRULES_';
  }

  // Java: Language#adjustMatch(RuleMatch,List)
  adjustMatch(rm) {
    return rm;
  }

  // Java: Language#prepareLineForSpeller(String)
  prepareLineForSpeller(s) {
    return [s];
  }

  // Java: Language#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches) {
    return ruleMatches;
  }

  // Java: Language#filterRuleMatchesAfterOverlapping(List)
  filterRuleMatchesAfterOverlapping(ruleMatches) {
    return ruleMatches;
  }

  // Java: Language#getMultitokenSpeller()
  getMultitokenSpeller() {
    return null;
  }

  // Java: Language#getPriorityMap()
  getPriorityMap() {
    return new JavaHashMap();
  }

  // Java: Language#getAllPossibleTags()
  getAllPossibleTags() {
    return [];
  }
}
