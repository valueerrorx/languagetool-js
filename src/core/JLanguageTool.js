// org.languagetool.JLanguageTool (check pipeline: rule assembly, selection, sentence analysis, checking, position mapping)
import { JavaEnum } from '../lib/java/JavaEnum.js';
import {
  Exception, IOException, IllegalArgumentException, IllegalStateException, NullPointerException, RuntimeException,
  StackOverflowError, isThrowable,
} from '../lib/java/errors.js';
import { Objects } from '../lib/java/Objects.js';
import { Pattern, javaMatches } from '../lib/java/regex/index.js';
import { javaCompare, javaTrim, stripLeading, substring } from '../lib/java/strings.js';
import { abbreviate } from '../lib/java/StringUtils.js';
import { fdiv, fsub } from '../lib/java/float.js';
import { floatToString } from '../lib/java/toString.js';
import { File } from '../lib/java/io/File.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { AnalyzedSentence } from './AnalyzedSentence.js';
import { AnalyzedToken } from './AnalyzedToken.js';
import { AnalyzedTokenReadings } from './AnalyzedTokenReadings.js';
import { ShortDescriptionProvider } from './ShortDescriptionProvider.js';
import { FALSE_FRIEND_FILE, SENTENCE_START_TAGNAME } from './JLanguageToolConstants.js';
import { AnnotatedTextBuilder } from './text/AnnotatedTextBuilder.js';
import { TextPart } from './text/TextPart.js';
import { RuleMatch } from './rules/model/RuleMatch.js';
import { SuggestedReplacement } from './rules/model/SuggestedReplacement.js';
import { TextLevelRule } from './rules/model/TextLevelRule.js';
import { UserConfig } from './rules/model/UserConfig.js';
import { GlobalConfig } from './rules/model/GlobalConfig.js';
import { CheckResults } from './rules/model/CheckResults.js';
import { SentenceRange } from './rules/model/SentenceRange.js';
import { Tag, ToneTag } from './rules/model/Tag.js';
import { SameRuleGroupFilter } from './rules/SameRuleGroupFilter.js';
import { RuleSet } from './patterns/RuleSet.js';
import { AbstractPatternRule } from './patterns/AbstractPatternRule.js';
import { RepeatedPatternRuleTransformer, RepeatedPatternRule } from './patterns/RepeatedPatternRuleTransformer.js';
import { ConsistencyPatternRuleTransformer, ConsistencyPatternRule } from './patterns/ConsistencyPatternRuleTransformer.js';
import { Range } from './check/Range.js';
import { ExtendedSentenceRange } from './check/ExtendedSentenceRange.js';
import { ErrorRateTooHighException } from './check/ErrorRateTooHighException.js';
import { postFilterHooks } from './check/postFilters.js';
import { createComponent, notPortedYet, registerComponent, sharedComponent } from './language/components.js';
import { getMessageBundle as bundleDefault, getMessageBundleForLanguage } from './resources/ResourceBundleTools.js';
import {
  addTemporaryFile, getClassBroker, getDataBroker, isCustomPasswordAuthenticatorUsed, removeTemporaryFiles,
  setClassBrokerBroker, setDataBroker, setUseCustomPasswordAuthenticator,
} from './resources/LtStatics.js';

export * from './JLanguageToolConstants.js';

const ZERO_WIDTH_NBSP = Pattern.compile('(?<=﻿)|(?=﻿)');

// Java: JLanguageTool.ParagraphHandling
export class ParagraphHandling extends JavaEnum {
  static FQCN = 'org.languagetool.JLanguageTool.ParagraphHandling';
}
['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].forEach((n, i) => { ParagraphHandling[n] = new ParagraphHandling(n, i); });

// Java: JLanguageTool.Mode
export class Mode extends JavaEnum {
  static FQCN = 'org.languagetool.JLanguageTool.Mode';
}
['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].forEach((n, i) => { Mode[n] = new Mode(n, i); });

// Java: JLanguageTool.Level
export class Level extends JavaEnum {
  static FQCN = 'org.languagetool.JLanguageTool.Level';
}
['DEFAULT', 'PICKY', 'ACADEMIC', 'CLARITY', 'PROFESSIONAL', 'CREATIVE', 'CUSTOMER', 'JOBAPP', 'OBJECTIVE', 'ELEGANT']
  .forEach((n, i) => { Level[n] = new Level(n, i); });

// Java: LevelToneTagCacheKey (level + TreeSet of tone tags) as a string key with the same equality
function levelToneTagCacheKey(level, toneTags) {
  Objects.requireNonNull(level);
  const ords = [...toneTags].map((t) => t.ordinal()).sort((a, b) => a - b);
  return `${level.name()}|${[...new Set(ords)].join(',')}`;
}

// JS: Java language objects are duck-typed here (constructor dispatch)
const isLanguage = (o) => o !== null && o !== undefined && typeof o.getShortCode === 'function' && typeof o.getSentenceTokenizer === 'function';

// JS: errors that must pass Java `catch (Exception e)` unchanged (notPorted markers and java.lang.Error subclasses)
const passesExceptionCatch = (e) => (e !== null && typeof e === 'object' && e.notPorted === true) || (isThrowable(e) && !(e instanceof Exception));

// Java: String#equals on a possibly null receiver
function strEquals(a, b) {
  if (a === null || a === undefined) throw new NullPointerException();
  return a === b;
}

// Java: Rule#getFullId() etc. on a null rule (NPE text as JDK 17 prints it)
function requireRule(rule, method, variable) {
  if (rule === null || rule === undefined) {
    throw new NullPointerException(`Cannot invoke "org.languagetool.rules.Rule.${method}()" because "${variable}" is null`);
  }
  return rule;
}

// Java: JLanguageTool.CleanToken
class CleanToken {
  // Java: CleanToken#CleanToken(String,String)
  constructor(origToken, cleanToken) {
    this.origToken = origToken;
    this.cleanToken = cleanToken;
  }
}

// Java: JLanguageTool.SentenceData
export class SentenceData {
  // Java: SentenceData#SentenceData(AnalyzedSentence,String,int,int,int)
  constructor(analyzed, text, startOffset, startLine, startColumn) {
    this.analyzed = analyzed;
    this.text = text;
    this.startOffset = startOffset;
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.wordCount = analyzed.getNonWhitespaceTokenCount(); // = getTokensWithoutWhitespace().length
  }
}

export class JLanguageTool {
  static FQCN = 'org.languagetool.JLanguageTool';
  static ParagraphHandling = ParagraphHandling;
  static Mode = Mode;
  static Level = Level;
  // class hooks set by later ports (null = class not ported, `instanceof` is false)
  static remoteRuleClass = null; // org.languagetool.rules.RemoteRule (DEV-001)
  static spellingCheckRuleClass = null; // org.languagetool.rules.spelling.SpellingCheckRule (F42)
  static abstractPatternRuleClass = AbstractPatternRule; // org.languagetool.rules.patterns.AbstractPatternRule
  static repeatedPatternRuleClass = RepeatedPatternRule; // RepeatedPatternRuleTransformer.RepeatedPatternRule
  static consistencyPatternRuleClass = ConsistencyPatternRule; // ConsistencyPatternRuleTransformer.ConsistencyPatternRule

  maxErrorsPerWordRate = 0;
  userRules = []; // rules added via addRule() method
  // rules fetched via getRelevantLanguageModelCapableRules()
  optionalLanguageModelRules = new Set();
  disabledRules = new Set();
  disabledRuleCategories = new Map(); // Set<CategoryId>: id string -> CategoryId
  enabledRules = new Set();
  enabledRuleCategories = new Map(); // Set<CategoryId>: id string -> CategoryId
  matchFilters = [];
  checkCancelledCallback = null;
  printStream = null;
  listUnknownWords = false;
  unknownWords = new Set();
  cleanOverlappingMatches = false;
  ruleSetCache = new Map(); // LevelToneTagCacheKey -> RuleSet

  // Java: all JLanguageTool constructors, dispatched on argument count/types:
  // (Language) (Language,Language) (Language,Language,ResultCache) (Language,ResultCache,UserConfig) (Language,Language,ResultCache,UserConfig)
  // (Language,List,Language,ResultCache,GlobalConfig,UserConfig[,boolean[,boolean[,List]]])
  constructor(...a) {
    switch (a.length) {
      case 1: this.#init(a[0], [], null, null, null, null, true, false, null); break;
      case 2: this.#init(a[0], [], a[1], null, null, null, true, false, null); break;
      case 3:
        if (a[2] instanceof UserConfig || (a[1] !== null && a[1] !== undefined && !isLanguage(a[1]))) {
          this.#init(a[0], [], null, a[1], null, a[2], true, false, null); // (Language,ResultCache,UserConfig)
        } else {
          this.#init(a[0], [], a[1], a[2], null, null, true, false, null); // (Language,Language,ResultCache)
        }
        break;
      case 4: this.#init(a[0], [], a[1], a[2], null, a[3], true, false, null); break;
      case 6: this.#init(a[0], a[1], a[2], a[3], a[4], a[5], true, false, null); break;
      case 7: this.#init(a[0], a[1], a[2], a[3], a[4], a[5], true, false, null); break; // Java quirk: inputLogging argument ignored (passes true)
      case 8: this.#init(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], null); break;
      case 9: this.#init(...a); break;
      default: throw new IllegalArgumentException(`no JLanguageTool constructor with ${a.length} arguments`);
    }
  }

  // Java: JLanguageTool#JLanguageTool(Language,List,Language,ResultCache,GlobalConfig,UserConfig,boolean,boolean,List)
  #init(language, altLanguages, motherTongue, cache, globalConfig, userConfig, inputLogging, withLanguageModel, customRules) {
    this.language = Objects.requireNonNull(language, 'language cannot be null');
    this.altLanguages = Objects.requireNonNull(altLanguages, 'altLanguages cannot be null (but empty)');
    this.motherTongue = motherTongue ?? null;
    this.userConfig = Objects.requireNonNullElseGet(userConfig, () => new UserConfig());
    this.globalConfig = globalConfig ?? null;
    this.cleanOverlappingMatches = true;
    const messages = getMessageBundleForLanguage(language);
    if (customRules !== null && customRules !== undefined) {
      this.builtinRules = customRules.slice();
    } else {
      this.builtinRules = this.getAllBuiltinRules(language, messages, userConfig ?? null, globalConfig ?? null);
      try {
        this.activateDefaultPatternRules();
        if (!language.hasNGramFalseFriendRule(motherTongue ?? null)) {
          // use the old false friends, which always match, not depending on context
          this.activateDefaultFalseFriendRules();
        }
        if (!withLanguageModel) {
          this.updateOptionalLanguageModelRules(null); // start out with rules without language model
        }
      } catch (e) {
        if (passesExceptionCatch(e)) throw e;
        throw new RuntimeException('Could not activate rules', e);
      }
    }
    this.cache = cache ?? null;
    this.descProvider = new ShortDescriptionProvider();
    this.inputLogging = inputLogging;
  }

  // Java: JLanguageTool#getDataBroker()
  static getDataBroker() {
    return getDataBroker();
  }

  // Java: JLanguageTool#setDataBroker(ResourceDataBroker)
  static setDataBroker(broker) {
    setDataBroker(broker);
  }

  // Java: JLanguageTool#getClassBroker()
  static getClassBroker() {
    return getClassBroker();
  }

  // Java: JLanguageTool#setClassBrokerBroker(ClassBroker)
  static setClassBrokerBroker(broker) {
    setClassBrokerBroker(broker);
  }

  // Java: JLanguageTool#isCustomPasswordAuthenticatorUsed()
  static isCustomPasswordAuthenticatorUsed() {
    return isCustomPasswordAuthenticatorUsed();
  }

  // Java: JLanguageTool#useCustomPasswordAuthenticator(boolean)
  static useCustomPasswordAuthenticator(use) {
    setUseCustomPasswordAuthenticator(use);
  }

  // Java: JLanguageTool#setListUnknownWords(boolean)
  setListUnknownWords(listUnknownWords) {
    this.listUnknownWords = listUnknownWords;
  }

  // Java: JLanguageTool#setCleanOverlappingMatches(boolean)
  setCleanOverlappingMatches(cleanOverlappingMatches) {
    this.cleanOverlappingMatches = cleanOverlappingMatches;
  }

  // Java: JLanguageTool#setMaxErrorsPerWordRate(float)
  setMaxErrorsPerWordRate(maxErrorsPerWordRate) {
    this.maxErrorsPerWordRate = Math.fround(maxErrorsPerWordRate);
  }

  // Java: JLanguageTool#setCheckCancelledCallback(CheckCancelledCallback)
  setCheckCancelledCallback(callback) {
    this.checkCancelledCallback = callback ?? null;
  }

  // Java: JLanguageTool#getMessageBundle() / getMessageBundle(Language)
  static getMessageBundle(lang) {
    return lang === undefined ? bundleDefault() : getMessageBundleForLanguage(lang);
  }

  // Java: JLanguageTool#getAllBuiltinRules(Language,ResourceBundle,UserConfig,GlobalConfig); language rule lists are stubs until F17
  getAllBuiltinRules(language, messages, userConfig, globalConfig) {
    try {
      const rules = [...language.getRelevantRules(messages, userConfig, this.motherTongue, this.altLanguages)];
      rules.push(...language.getRelevantRulesGlobalConfig(messages, globalConfig, userConfig, this.motherTongue, this.altLanguages));
      return rules;
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(`Could not get rules of language ${language}`, e);
      throw e;
    }
  }

  // Java: JLanguageTool#setOutput(PrintStream); stream = object with println(String)
  setOutput(printStream) {
    this.printStream = printStream ?? null;
    GlobalConfig.setVerbose(this.printStream !== null);
  }

  // Java: JLanguageTool#loadPatternRules(String); loader ported in F25
  loadPatternRules(filename) {
    const ruleLoader = createComponent('org.languagetool.rules.patterns.PatternRuleLoader');
    const is = JLanguageTool.getDataBroker().getAsStream(filename);
    if (is === null) {
      // happens for external rules plugged in as an XML file or testing files:
      if (filename.includes('-test-')) {
        // ignore, for testing
        return [];
      }
      return ruleLoader.getRules(new File(filename), this.language);
    }
    return ruleLoader.getRules(is, filename, this.language);
  }

  // Java: JLanguageTool#loadFalseFriendRules(String); loader ported in F39
  loadFalseFriendRules(filename) {
    if (this.motherTongue === null) {
      return [];
    }
    const ruleLoader = createComponent('org.languagetool.rules.patterns.FalseFriendRuleLoader', this.motherTongue);
    const is = JLanguageTool.getDataBroker().getAsStream(filename);
    if (is === null) {
      return ruleLoader.getRules(new File(filename), this.language, this.motherTongue);
    }
    return ruleLoader.getRules(is, this.language, this.motherTongue);
  }

  // Java: JLanguageTool#updateOptionalLanguageModelRules(LanguageModel)
  updateOptionalLanguageModelRules(lm) {
    const messages = JLanguageTool.getMessageBundle(this.language);
    try {
      const rules = this.language.getRelevantLanguageModelCapableRules(messages, lm, this.globalConfig, this.userConfig, this.motherTongue, this.altLanguages);
      removeIf(this.userRules, (rule) => this.optionalLanguageModelRules.has(rule.getId()));
      this.optionalLanguageModelRules.clear();
      for (const rule of rules) this.optionalLanguageModelRules.add(rule.getId());
      this.userRules.push(...rules);
    } catch (e) {
      if (passesExceptionCatch(e)) throw e;
      throw new RuntimeException('Could not load language model capable rules.', e);
    }
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#activateLanguageModelRules(File); no language models (DEV-001)
  activateLanguageModelRules(indexDir) {
    const languageModel = this.language.getLanguageModel(indexDir);
    if (languageModel !== null && languageModel !== undefined) {
      const messages = JLanguageTool.getMessageBundle(this.language);
      const rules = this.language.getRelevantLanguageModelRules(messages, languageModel, this.userConfig);
      this.userRules.push(...rules);
      this.updateOptionalLanguageModelRules(languageModel);
    }
  }

  // Java: JLanguageTool#transformRules(Function,List)
  transformRules(mapper, rules) {
    // transform this way because variables are final + could log where rule was changed
    for (let i = 0; i < rules.length; i++) {
      const original = rules[i];
      const transformed = mapper(original);
      if (transformed !== original) {
        rules[i] = transformed;
      }
    }
  }

  // Java: JLanguageTool#activateRemoteRules(File) / activateRemoteRules(List); remote rules are DEV-001
  activateRemoteRules(configsOrFile) {
    if (!Array.isArray(configsOrFile)) {
      const configFile = configsOrFile ?? null;
      let configs;
      try {
        if (configFile !== null) {
          throw notPortedYet('RemoteRuleConfig#load (DEV-001)');
        } else {
          configs = [];
        }
        this.activateRemoteRules(configs);
      } catch (e) {
        if (e instanceof IOException) throw new IOException('Could not load remote rules.', e);
        throw e;
      }
      return;
    }
    const configs = configsOrFile;
    const userConfig = this.userConfig;
    // Apply A/B test filtering first - can affect which rules get enabled and thus disabled because of fallback settings
    const activeAbTestsForUser = userConfig.getAbTest();
    const selectedConfigsByUserSettings = configs.filter((config) => {
      if (!userConfig.isPremium() && config.isPremium()) {
        return false;
      }
      const excludeABTest = config.getOptions().get('excludeABTest') ?? null;
      if (excludeABTest !== null && activeAbTestsForUser !== null && activeAbTestsForUser.some((flag) => javaMatches(flag, excludeABTest))) {
        return false;
      }
      const activeRemoteRuleAbTest = config.getOptions().get('abtest') ?? null;
      if (activeRemoteRuleAbTest !== null && javaTrim(activeRemoteRuleAbTest).length !== 0) {
        if (activeAbTestsForUser === null) {
          return false;
        }
        return activeAbTestsForUser.some((test) => javaMatches(test, activeRemoteRuleAbTest));
      }
      return true;
    });
    let effectiveConfigs = [];
    // Then, determine effective configurations based on user opt-in for third-party AI
    if (!userConfig.isOptInThirdPartyAI()) {
      for (const config of selectedConfigsByUserSettings) {
        if (config.isUsingThirdPartyAI()) {
          const remoteRuleConfig = sharedComponent('org.languagetool.rules.RemoteRuleFallbackManager').getInhouseFallback(config.getRuleId());
          if (remoteRuleConfig !== null && !effectiveConfigs.some((c) => c.equals(remoteRuleConfig))) {
            effectiveConfigs.push(remoteRuleConfig);
          }
        } else {
          effectiveConfigs.push(config);
        }
      }
    } else {
      for (const config of selectedConfigsByUserSettings) {
        if (config.isUsingThirdPartyAI() && config.getFallbackRuleId() !== null) {
          this.disableRule(config.getFallbackRuleId());
        }
      }
      effectiveConfigs.push(...selectedConfigsByUserSettings);
    }
    // Apply trusted source filtering
    if (!userConfig.isTrustedSource()) {
      effectiveConfigs = effectiveConfigs.filter((config) => (config.getOptions().get('onlyTrustedSources') ?? 'false') !== 'true');
    }
    // Proceed with rule activation using filtered configs
    const messages = JLanguageTool.getMessageBundle(this.language);
    const rules = this.language.getRelevantRemoteRules(messages, effectiveConfigs, this.globalConfig, userConfig, this.motherTongue, this.altLanguages, this.inputLogging);
    this.userRules.push(...rules);
    const enhanced = this.language.getRemoteEnhancedRules(messages, effectiveConfigs, userConfig, this.motherTongue, this.altLanguages, this.inputLogging);
    this.transformRules(enhanced, this.builtinRules);
    this.transformRules(enhanced, this.userRules);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#activateDefaultPatternRules()
  activateDefaultPatternRules() {
    const patternRules = this.language.getPatternRules();
    const enabledRules = this.language.getDefaultEnabledRulesForVariant();
    const disabledRules = this.language.getDefaultDisabledRulesForVariant();
    if (enabledRules.length !== 0 || disabledRules.length !== 0) {
      for (const patternRule of patternRules) {
        if (enabledRules.includes(patternRule.getId())) {
          patternRule.setDefaultOn();
        }
        if (disabledRules.includes(patternRule.getId())) {
          patternRule.setDefaultOff();
        }
      }
    }
    const transformed = this.transformPatternRules(patternRules, this.language);
    this.userRules.push(...transformed);
  }

  // Java: JLanguageTool#transformPatternRules(List,Language)
  transformPatternRules(patternRules, lang) {
    let rules = patternRules.slice();
    const transforms = [new RepeatedPatternRuleTransformer(lang), new ConsistencyPatternRuleTransformer(lang)];
    const transformed = [];
    for (const op of transforms) {
      const result = op.apply(rules);
      rules = result.getRemainingRules();
      transformed.push(...result.getTransformedRules());
    }
    transformed.push(...rules);
    return transformed;
  }

  // Java: JLanguageTool#activateDefaultFalseFriendRules()
  activateDefaultFalseFriendRules() {
    const falseFriendRulesFilename = `${JLanguageTool.getDataBroker().getRulesDir()}/${FALSE_FRIEND_FILE}`;
    this.userRules.push(...this.loadFalseFriendRules(falseFriendRulesFilename));
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#addMatchFilter(RuleMatchFilter); filter = object with filter(List,AnnotatedText)
  addMatchFilter(filter) {
    this.matchFilters.push(Objects.requireNonNull(filter));
  }

  // Java: JLanguageTool#addRule(Rule)
  addRule(rule) {
    this.userRules.push(rule);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#disableRule(String)
  disableRule(ruleId) {
    this.disabledRules.add(ruleId);
    this.enabledRules.delete(ruleId);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#disableRules(List)
  disableRules(ruleIds) {
    for (const id of ruleIds) this.disabledRules.add(id);
    for (const id of ruleIds) this.enabledRules.delete(id);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#setRules(List); quirk: null clears both lists, then throws before the cache is cleared
  setRules(rules) {
    this.builtinRules.length = 0;
    this.userRules.length = 0;
    if (rules === null || rules === undefined) {
      throw new NullPointerException('Cannot invoke "java.util.Collection.toArray()" because "c" is null');
    }
    this.userRules.push(...rules);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#disableCategory(CategoryId)
  disableCategory(id) {
    this.disabledRuleCategories.set(id.toString(), id);
    this.enabledRuleCategories.delete(id.toString());
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#isCategoryDisabled(CategoryId)
  isCategoryDisabled(id) {
    return this.disabledRuleCategories.has(id.toString());
  }

  // Java: JLanguageTool#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: JLanguageTool#getDisabledRules() (the live set)
  getDisabledRules() {
    return this.disabledRules;
  }

  // Java: JLanguageTool#enableRule(String)
  enableRule(ruleId) {
    this.disabledRules.delete(ruleId);
    this.enabledRules.add(ruleId);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#enableRuleCategory(CategoryId)
  enableRuleCategory(id) {
    this.disabledRuleCategories.delete(id.toString());
    this.enabledRuleCategories.set(id.toString(), id);
    this.ruleSetCache.clear();
  }

  // Java: JLanguageTool#sentenceTokenize(String)
  sentenceTokenize(text) {
    return this.language.getSentenceTokenizer().tokenize(text);
  }

  // Java: JLanguageTool#check(...) overloads with String or AnnotatedText (String forms wrap the text with AnnotatedTextBuilder#addText)
  check(text, ...rest) {
    const annotatedText = typeof text === 'string' ? new AnnotatedTextBuilder().addText(text).build() : text;
    switch (rest.length) {
      case 0: return this.check(annotatedText, true, ParagraphHandling.NORMAL, null, Level.DEFAULT);
      case 1:
        if (rest[0] instanceof Level) return this.check(annotatedText, true, ParagraphHandling.NORMAL, null, rest[0]);
        return this.check(annotatedText, true, ParagraphHandling.NORMAL, rest[0], Level.DEFAULT);
      case 2: return this.check(annotatedText, rest[0], rest[1], null, Level.DEFAULT);
      case 3: return this.check(annotatedText, rest[0], rest[1], rest[2], Level.DEFAULT);
      case 4: {
        // Java: check(AnnotatedText,boolean,ParagraphHandling,RuleMatchListener,Level)
        const paraMode = rest[1];
        let mode;
        if (paraMode === ParagraphHandling.ONLYNONPARA) {
          mode = Mode.ALL_BUT_TEXTLEVEL_ONLY;
        } else if (paraMode === ParagraphHandling.ONLYPARA) {
          mode = Mode.TEXTLEVEL_ONLY;
        } else {
          mode = Mode.ALL;
        }
        return this.check(annotatedText, rest[0], paraMode, rest[2], mode, rest[3], null);
      }
      case 5: return this.check(annotatedText, rest[0], rest[1], rest[2], rest[3], rest[4], null);
      case 6: {
        // Java: check(AnnotatedText,boolean,ParagraphHandling,RuleMatchListener,Mode,Level,Long)
        const [tokenizeText, paraMode, listener, mode, level, textSessionID] = rest;
        const cleaned = this.cleanText(annotatedText);
        const sentences = this.getSentences(cleaned, tokenizeText);
        const analyzedSentences = this.analyzeSentences(sentences);
        return this.checkInternal(cleaned, paraMode, listener, mode, level, new Set(), textSessionID, sentences, analyzedSentences).getRuleMatches();
      }
      default: throw new IllegalArgumentException(`no check overload with ${rest.length + 1} arguments`);
    }
  }

  // Java: JLanguageTool#check2(AnnotatedText,boolean,ParagraphHandling,RuleMatchListener,Mode,Level,[Set<ToneTag>,]Long)
  check2(annotatedText, tokenizeText, paraMode, listener, mode, level, ...rest) {
    const toneTags = rest.length >= 2 ? rest[0] : new Set();
    const textSessionID = rest.length >= 2 ? rest[1] : (rest[0] ?? null);
    const toneTagSet = toneTags instanceof Set ? toneTags : new Set(Objects.requireNonNull(toneTags));
    const cleaned = this.cleanText(annotatedText);
    const sentences = this.getSentences(cleaned, tokenizeText);
    const analyzedSentences = this.analyzeSentences(sentences);
    const checkResults = this.checkInternal(cleaned, paraMode, listener, mode, level, toneTagSet, textSessionID, sentences, analyzedSentences);
    const sentenceRanges = SentenceRange.getRangesFromSentences(cleaned, sentences);
    checkResults.addSentenceRanges(sentenceRanges);
    return checkResults;
  }

  // Java: JLanguageTool#getSentences(AnnotatedText,boolean)
  getSentences(annotatedText, tokenizeText) {
    let sentences;
    if (tokenizeText) {
      sentences = this.sentenceTokenize(annotatedText.getPlainText());
    } else {
      sentences = [];
      sentences.push(annotatedText.getPlainText());
    }
    return sentences;
  }

  // Java: JLanguageTool#cleanText(AnnotatedText); U+FEFF in text parts becomes markup
  cleanText(annotatedText) {
    const atb = new AnnotatedTextBuilder();
    annotatedText.getGlobalMetaData().forEach((value, key) => atb.addGlobalMetaData(key, value));
    annotatedText.getCustomMetaData().forEach((value, key) => atb.addGlobalMetaData(key, value));
    const parts = annotatedText.getParts();
    for (const part of parts) {
      if (part.getType() === TextPart.Type.TEXT) {
        const byteOrderMark = '﻿'; // BOM or zero-width non-breaking space
        // split by byteOrderMark and let the delimiter also be part of the array (no U+FEFF: Pattern#split returns the input)
        const p = part.getPart();
        const split = p.includes('﻿') ? ZERO_WIDTH_NBSP.split(p) : [p];
        for (const text of split) {
          if (text === '﻿') {
            atb.addMarkup(byteOrderMark);
          } else {
            atb.addText(text);
          }
        }
      } else {
        atb.add(part);
      }
    }
    return atb.build();
  }

  // Java: JLanguageTool#checkInternal(AnnotatedText,ParagraphHandling,RuleMatchListener,Mode,Level,[Set,]Long,List,List)
  checkInternal(annotatedText, paraMode, listener, mode, level, toneTags, textSessionID, sentences, analyzedSentences) {
    const rules = this.getActiveRulesForLevelAndToneTags(level, toneTags);
    return this.checkInternalWithCustomRules(rules, annotatedText, paraMode, listener, mode, level, toneTags, textSessionID, sentences, analyzedSentences);
  }

  // Java: JLanguageTool#checkInternalWithCustomRules(RuleSet,AnnotatedText,ParagraphHandling,RuleMatchListener,Mode,Level,Set,Long,List,List)
  checkInternalWithCustomRules(rules, annotatedText, paraMode, listener, mode, level, toneTags, textSessionID, sentences, analyzedSentences) {
    if (this.printStream !== null) {
      this.printIfVerbose(`${rules.allRules().length} rules activated for language ${this.language}`);
    }
    const remoteMatches = [];
    // tone tag and level filtering can not be applied to these rules before processing
    const RemoteRuleClass = JLanguageTool.remoteRuleClass;
    const remoteRules = RemoteRuleClass === null ? [] : rules.allRules().filter((r) => r instanceof RemoteRuleClass);
    const remoteRulesThreadPool = mode === Mode.TEXTLEVEL_ONLY || remoteRules.length === 0 ? null : 'pool';
    let remoteRuleTasks = null;
    if (remoteRulesThreadPool !== null) {
      throw notPortedYet('remote rules (DEV-001)');
    }
    const res = this.performCheck(analyzedSentences, sentences, rules, paraMode, annotatedText, listener, mode, level, remoteRulesThreadPool === null, toneTags);
    const remoteRulesResults = this.fetchRemoteRuleResults(remoteRuleTasks);
    let ruleMatches = res.getRuleMatches();
    ruleMatches.push(...remoteMatches);
    if (ruleMatches.length === 0) {
      return res;
    }
    ruleMatches = this.filterMatches(annotatedText, rules, ruleMatches, level, toneTags, remoteRulesResults);
    // GRPCPostProcessing.get(language): no post-processing rules configured (DEV-001)
    return new CheckResults(ruleMatches, res.getIgnoredRanges(), res.getExtendedSentenceRanges());
  }

  // Java: JLanguageTool#filterMatches(AnnotatedText,RuleSet,List,Level,Set,Map)
  filterMatches(annotatedText, rules, ruleMatches, level, toneTags, remoteRulesResults) {
    // rules can create matches with rule IDs different from the original rule (see e.g. RemoteRules)
    // so while we can't avoid execution of these rules, we still want disabling them to work
    // so do another pass with ignoreRule here
    ruleMatches = ruleMatches.filter((match) => !this.ignoreRule(match.getRule()));
    ruleMatches = ruleMatches.filter((match) => this.isRuleActiveForLanguageWithModel(match.getRule(), this.language, remoteRulesResults));
    ruleMatches = ruleMatches.filter((match) => JLanguageTool.isRuleActiveForLevelAndToneTags(match.getRule(), level, toneTags));
    ruleMatches = new SameRuleGroupFilter().filter(ruleMatches);
    // no sorting: SameRuleGroupFilter sorts rule matches already
    ruleMatches = postFilterHooks.languageDependent(this.language, rules, ruleMatches, annotatedText);
    if (this.cleanOverlappingMatches) {
      ruleMatches = postFilterHooks.cleanOverlapping(this.language, this.userConfig.getHidePremiumMatches(), ruleMatches);
    }
    ruleMatches = this.language.filterRuleMatchesAfterOverlapping(ruleMatches);
    return this.applyCustomFilters(ruleMatches, annotatedText);
  }

  // Java: JLanguageTool#isRuleActiveForLanguageWithModel(Rule,Language,Map)
  isRuleActiveForLanguageWithModel(rule, language, remoteRulesResults) {
    if (language.getShortCode() === 'fr') {
      const disableFrenchRuleGroups = ['OU', 'OU_FIGEES', 'VIRG_NON_TROUVEE', 'A_A_ACCENT', 'A_ACCENT_A', 'CONFUSION_A_AS', 'AGREEMENT_POSTPONED_ADJ', 'LA_OU', 'CONFUSION_RULE_PREMIUM_AIRE_AIR']; // List for rule group IDs
      const disableFrenchSpecificSubrules = ['A_A_ACCENT2[1]', 'ACCORD_SUJET_VERBE[55]', 'PAS_DE_VIRGULE[42]']; // List for specific subrules
      const remoteRulesResult = remoteRulesResults.get('AI_FR_GGEC') ?? null;
      if (remoteRulesResult !== null && remoteRulesResult.isSuccess()) {
        const isDisabledGroup = disableFrenchRuleGroups.includes(rule.getId());
        const isDisabledSubrule = disableFrenchSpecificSubrules.includes(rule.getFullId());
        return !(isDisabledGroup || isDisabledSubrule);
      }
    }
    if (language.getShortCode() === 'es') {
      const disableSpanishRules = ['AGREEMENT_POSTPONED_ADJ'];
      const remoteRulesResult = remoteRulesResults.get('AI_ES_GGEC') ?? null;
      if (remoteRulesResult !== null) {
        if (remoteRulesResult.isSuccess()) {
          return !disableSpanishRules.includes(rule.getId());
        }
      }
    }
    return true;
  }

  // Java: JLanguageTool#isRuleActiveForLevelAndToneTags(Rule,Level,Set)
  static isRuleActiveForLevelAndToneTags(rule, level, toneTags) {
    if (level === Level.DEFAULT && rule.hasTag(Tag.picky)) {
      return false;
    }
    const tones = toneTags instanceof Set ? toneTags : new Set(toneTags);
    let enabledToneTags;
    if (tones.has(ToneTag.ALL_TONE_RULES)) {
      enabledToneTags = ToneTag.REAL_TONE_TAGS;
    } else if (tones.has(ToneTag.NO_TONE_RULE)) {
      enabledToneTags = []; // Even clarity rules will be disabled.
    } else if (tones.size === 0 || tones.has(ToneTag.ALL_WITHOUT_GOAL_SPECIFIC)) {
      enabledToneTags = [ToneTag.ALL_WITHOUT_GOAL_SPECIFIC];
    } else {
      enabledToneTags = [...tones];
    }
    if (rule.getToneTags().length === 0) {
      return true;
    }
    if (enabledToneTags.includes(ToneTag.ALL_WITHOUT_GOAL_SPECIFIC)) {
      return !rule.isGoalSpecific();
    }
    let removeRule = true;
    for (const toneTag of enabledToneTags) {
      if (rule.hasToneTag(toneTag)) {
        removeRule = false;
        break;
      }
    }
    return !removeRule;
  }

  // Java: JLanguageTool#getActiveRulesForLevelAndToneTags(Level,Set) (cached per LevelToneTagCacheKey)
  getActiveRulesForLevelAndToneTags(level, toneTags) {
    const key = levelToneTagCacheKey(level, toneTags);
    let ruleSet = this.ruleSetCache.get(key);
    if (ruleSet === undefined) {
      const allRules = this.getAllActiveRules().filter((rule) => JLanguageTool.isRuleActiveForLevelAndToneTags(rule, level, toneTags));
      ruleSet = RuleSet.textLemmaHinted(allRules);
      this.ruleSetCache.set(key, ruleSet);
    }
    return ruleSet;
  }

  // Java: JLanguageTool#fetchRemoteRuleResults(...); without remote rule tasks the result map is empty (DEV-001)
  fetchRemoteRuleResults(remoteRuleTasks) {
    const remoteRuleResults = new Map();
    if (remoteRuleTasks !== null && remoteRuleTasks.length !== 0) {
      throw notPortedYet('remote rules (DEV-001)');
    }
    return remoteRuleResults;
  }

  // Java: JLanguageTool#adjustOffset(AnnotatedText,int,RuleMatch)
  adjustOffset(annotatedText, offset, match) {
    let fromPos;
    let toPos;
    if (annotatedText !== null) {
      fromPos = annotatedText.getOriginalTextPositionFor(match.getFromPos() + offset, false);
      toPos = annotatedText.getOriginalTextPositionFor(match.getToPos() + offset - 1, true) + 1;
    } else {
      fromPos = match.getFromPos() + offset;
      toPos = match.getToPos() + offset;
    }
    match.setOffsetPosition(fromPos, toPos);
  }

  // Java: JLanguageTool#analyzeText(String)
  analyzeText(text) {
    const sentences = this.sentenceTokenize(text);
    return this.analyzeSentences(sentences);
  }

  // Java: JLanguageTool#analyzeSentences(List)
  analyzeSentences(sentences) {
    this.unknownWords = new Set();
    const analyzedSentences = [];
    let j = 0;
    for (const sentence of sentences) {
      if (this.checkCancelledCallback !== null && this.checkCancelledCallback.checkCancelled()) {
        break;
      }
      let analyzedSentence = this.getAnalyzedSentence(sentence);
      this.rememberUnknownWords(analyzedSentence);
      if (++j === sentences.length) {
        analyzedSentence = JLanguageTool.markAsParagraphEnd(analyzedSentence);
      }
      analyzedSentences.push(analyzedSentence);
      this.printSentenceInfo(analyzedSentence);
    }
    return analyzedSentences;
  }

  // Java: JLanguageTool#markAsParagraphEnd(AnalyzedSentence)
  static markAsParagraphEnd(analyzedSentence) {
    const anTokens = analyzedSentence.getTokens();
    anTokens[anTokens.length - 1].setParagraphEnd();
    const preDisambigAnTokens = analyzedSentence.getPreDisambigTokens();
    preDisambigAnTokens[anTokens.length - 1].setParagraphEnd();
    return new AnalyzedSentence(anTokens, preDisambigAnTokens); /// TODO: why???
  }

  // Java: JLanguageTool#printSentenceInfo(AnalyzedSentence)
  printSentenceInfo(analyzedSentence) {
    if (this.printStream !== null) {
      this.printIfVerbose(analyzedSentence.toString());
      this.printIfVerbose(analyzedSentence.getAnnotations());
    }
  }

  // Java: JLanguageTool#performCheck(List,List,RuleSet,ParagraphHandling,AnnotatedText,RuleMatchListener,Mode,Level,boolean,Set)
  performCheck(analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags) {
    const sentences = this.computeSentenceData(analyzedSentences, sentenceTexts);
    const matcher = new TextCheckCallable(this, ruleSet, sentences, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags);
    try {
      return matcher.call();
    } catch (e) {
      if (e instanceof IOException || passesExceptionCatch(e) || !isThrowable(e)) throw e;
      throw new RuntimeException(e);
    }
  }

  // Java: JLanguageTool#computeSentenceData(List,List); quirk: fewer analyzed sentences (cancelled) -> IndexOutOfBoundsException
  computeSentenceData(analyzedSentences, texts) {
    let charCount = 0;
    let lineCount = 0;
    let columnCount = 1;
    const result = [];
    if (analyzedSentences === null || analyzedSentences.length === 0) {
      return result;
    }
    for (let i = 0; i < texts.length; i++) {
      const sentence = texts[i];
      result.push(new SentenceData(analyzedSentences[Objects.checkIndex(i, analyzedSentences.length)], sentence, charCount, lineCount, columnCount));
      charCount += sentence.length;
      lineCount += JLanguageTool.countLineBreaks(sentence);
      columnCount = this.processColumnChange(columnCount, sentence);
    }
    return result;
  }

  // Java: JLanguageTool#processColumnChange(int,String)
  processColumnChange(columnCount, sentence) {
    const lineBreakPos = sentence.lastIndexOf('\n');
    if (lineBreakPos === -1) {
      columnCount += sentence.length;
    } else {
      columnCount = sentence.length - lineBreakPos;
      if (lineBreakPos === 0 && !this.language.getSentenceTokenizer().singleLineBreaksMarksPara()) {
        columnCount--;
      }
    }
    return columnCount;
  }

  // Java: JLanguageTool#checkAnalyzedSentence(ParagraphHandling,List,AnalyzedSentence[,boolean[,int]])
  checkAnalyzedSentence(paraMode, rules, analyzedSentence, checkRemoteRules, wordCounter) {
    if (arguments.length === 3) {
      const nonIgnored = rules.filter((r) => !this.ignoreRule(r));
      return this.checkAnalyzedSentence(paraMode, nonIgnored, analyzedSentence, false, -1);
    }
    if (arguments.length === 4) {
      return this.checkAnalyzedSentence(paraMode, rules, analyzedSentence, checkRemoteRules, -1);
    }
    if (paraMode === ParagraphHandling.ONLYPARA) {
      return [];
    }
    let sentenceMatches = [];
    const errorRateLog = [];
    let tmpErrorsPerWord = 0.0;
    const RemoteRuleClass = JLanguageTool.remoteRuleClass;
    for (let i = 0, rulesSize = rules.length; i < rulesSize; i++) {
      const rule = rules[i];
      if (rule instanceof TextLevelRule || (!checkRemoteRules && RemoteRuleClass !== null && rule instanceof RemoteRuleClass)) {
        continue;
      }
      if (this.checkCancelledCallback !== null && this.checkCancelledCallback.checkCancelled()) {
        break;
      }
      const thisMatches = rule.match(analyzedSentence);
      for (const m of thisMatches) sentenceMatches.push(m);
      if (wordCounter > 0) {
        // check if the maxErrorsPerWordRate is already reached for the full text with this sentence and rule
        const errorsPerWord = fdiv(sentenceMatches.length, wordCounter);
        if (tmpErrorsPerWord < errorsPerWord) {
          errorRateLog.push(`With rule: ${rule.getFullId()} ${i + 1}/${rulesSize} the sentence error rate increased by: ${floatToString(fsub(errorsPerWord, tmpErrorsPerWord))} from: ${floatToString(tmpErrorsPerWord)} to total: ${floatToString(errorsPerWord)}`);
          tmpErrorsPerWord = errorsPerWord;
        }
        if (this.maxErrorsPerWordRate > 0 && errorsPerWord > this.maxErrorsPerWordRate && wordCounter > 25) {
          // errorRateLog lines and the summary are logged at INFO [BAD_REQUEST] (logger: F71)
          throw new ErrorRateTooHighException(`ErrorRateTooHigh is reached by a single sentence after rule: ${rule.getFullId()}. `
            + `The whole text contains ${wordCounter} words `
            + `and this sentence has ${sentenceMatches.length} matches.`);
        }
      }
    }
    if (sentenceMatches.length === 0) {
      return sentenceMatches;
    }
    // rules can create matches with rule IDs different from the original rule (see e.g. RemoteRules)
    // so while we can't avoid execution of these rules, we still want disabling them to work
    // so do another pass with ignoreRule here
    sentenceMatches = sentenceMatches.filter((match) => !this.ignoreRule(match.getRule()));
    // Java builds the AnnotatedText unconditionally; it is only read by custom filters
    const filtered = new SameRuleGroupFilter().filter(sentenceMatches);
    if (this.matchFilters.length === 0) return filtered;
    const text = new AnnotatedTextBuilder().addText(analyzedSentence.getText()).build();
    return this.applyCustomFilters(filtered, text);
  }

  // Java: JLanguageTool#ignoreRule(Rule)
  ignoreRule(rule) {
    const ruleCategory = requireRule(rule, 'getCategory', 'rule').getCategory();
    const catId = ruleCategory.getId().toString();
    const isCategoryDisabled = (this.disabledRuleCategories.has(catId) || rule.getCategory().isDefaultOff())
      && !this.enabledRuleCategories.has(catId);
    const isRuleDisabled = this.disabledRules.has(rule.getFullId()) || this.disabledRules.has(rule.getId())
      || (rule.isDefaultOff() && !(this.enabledRules.has(rule.getFullId()) || this.enabledRules.has(rule.getId())));
    let isDisabled;
    if (isCategoryDisabled) {
      isDisabled = !(this.enabledRules.has(rule.getFullId()) || this.enabledRules.has(rule.getId()));
    } else {
      isDisabled = isRuleDisabled;
    }
    return isDisabled;
  }

  // Java: JLanguageTool#adjustRuleMatchPos(RuleMatch,int,int,int,String,AnnotatedText)
  adjustRuleMatchPos(match, charCount, columnCount, lineCount, sentence, annotatedText) {
    let fromPos = match.getFromPos() + charCount;
    let toPos = match.getToPos() + charCount;
    if (annotatedText !== null) {
      fromPos = annotatedText.getOriginalTextPositionFor(fromPos, false);
      toPos = annotatedText.getOriginalTextPositionFor(toPos - 1, true) + 1;
    }
    const thisMatch = new RuleMatch(match);
    thisMatch.setOffsetPosition(fromPos, toPos);
    // keep the positions with respect to sentence start
    thisMatch.setSentencePosition(match.getFromPos(), match.getToPos());
    const startPos = match.getPatternFromPos() + charCount;
    const endPos = match.getPatternToPos() + charCount;
    thisMatch.setPatternPosition(startPos, endPos);
    thisMatch.setLazySuggestedReplacements(() => this.extendSuggestions(match.getSuggestedReplacementObjects()));
    const sentencePartToError = substring(sentence, 0, match.getFromPos());
    const sentencePartToEndOfError = substring(sentence, 0, match.getToPos());
    const lastLineBreakPos = sentencePartToError.lastIndexOf('\n');
    let column;
    let endColumn;
    if (lastLineBreakPos === -1) {
      column = sentencePartToError.length + columnCount;
    } else {
      column = sentencePartToError.length - lastLineBreakPos;
    }
    const lastLineBreakPosInError = sentencePartToEndOfError.lastIndexOf('\n');
    if (lastLineBreakPosInError === -1) {
      endColumn = sentencePartToEndOfError.length + columnCount;
    } else {
      endColumn = sentencePartToEndOfError.length - lastLineBreakPosInError;
    }
    const lineBreaksToError = JLanguageTool.countLineBreaks(sentencePartToError);
    const lineBreaksToEndOfError = JLanguageTool.countLineBreaks(sentencePartToEndOfError);
    thisMatch.setLine(lineCount + lineBreaksToError);
    thisMatch.setEndLine(lineCount + lineBreaksToEndOfError);
    thisMatch.setColumn(column);
    thisMatch.setEndColumn(endColumn);
    return thisMatch;
  }

  // Java: JLanguageTool#extendSuggestions(List)
  extendSuggestions(replacements) {
    const extended = [];
    for (const replacement of replacements) {
      const newReplacement = new SuggestedReplacement(replacement);
      if (replacement.getShortDescription() === null) { // don't overwrite more specific suggestions from the rule
        const descOrNull = this.descProvider.getShortDescription(replacement.getReplacement(), this.language);
        newReplacement.setShortDescription(descOrNull);
        newReplacement.setSuffix(replacement.getSuffix());
      }
      extended.push(newReplacement);
    }
    return extended;
  }

  // Java: JLanguageTool#rememberUnknownWords(AnalyzedSentence)
  rememberUnknownWords(analyzedText) {
    if (this.listUnknownWords) {
      const atr = analyzedText.getTokensWithoutWhitespace();
      for (const reading of atr) {
        if (!reading.isTagged()) {
          this.unknownWords.add(reading.getToken());
        }
      }
    }
  }

  // Java: JLanguageTool#getUnknownWords()
  getUnknownWords() {
    if (!this.listUnknownWords) {
      throw new IllegalStateException('listUnknownWords is set to false, unknown words not stored');
    }
    const words = [...this.unknownWords];
    words.sort(javaCompare);
    return words;
  }

  // Java: JLanguageTool#countLineBreaks(String)
  static countLineBreaks(s) {
    let pos = -1;
    let count = 0;
    for (;;) {
      const nextPos = s.indexOf('\n', pos + 1);
      if (nextPos === -1) {
        break;
      }
      pos = nextPos;
      count++;
    }
    return count;
  }

  // Java: JLanguageTool#getAnalyzedSentence(String)
  getAnalyzedSentence(sentence) {
    if (this.cache !== null) {
      throw notPortedYet('ResultCache / SimpleInputSentence (F70)');
    }
    const raw = this.getRawAnalyzedSentence(sentence);
    // The disambiguator modifies some readings in place, so keep an independent copy of the
    // tagger output: <pattern raw_pos="yes"> must still see the pre-disambiguation tags
    const preDisambigTokens = AnalyzedSentence.copyReadings(raw.getTokens());
    const disambig = this.language.getDisambiguator().disambiguate(raw, this.checkCancelledCallback);
    const analyzedSentence = new AnalyzedSentence(disambig.getTokens(), preDisambigTokens);
    if (this.language.getPostDisambiguationChunker() !== null) {
      this.language.getPostDisambiguationChunker().addChunkTags(analyzedSentence.getTokens());
    }
    return analyzedSentence;
  }

  // Java: JLanguageTool#getRawAnalyzedSentence(String)
  getRawAnalyzedSentence(sentence) {
    const tokens = this.language.getWordTokenizer().tokenize(sentence);
    const softHyphenTokens = this.replaceSoftHyphens(tokens);
    const aTokens = this.language.getTagger().tag(tokens);
    if (this.language.getChunker() !== null) {
      this.language.getChunker().addChunkTags(aTokens);
    }
    const tokenArray = new Array(tokens.length + 1);
    const startTokenArray = new Array(1);
    let toArrayCount = 0;
    const sentenceStartToken = new AnalyzedToken('', SENTENCE_START_TAGNAME, null);
    startTokenArray[0] = sentenceStartToken;
    tokenArray[toArrayCount++] = new AnalyzedTokenReadings(startTokenArray, 0);
    let startPos = 0;
    for (const posTag of aTokens) {
      posTag.setStartPos(startPos);
      tokenArray[toArrayCount++] = posTag;
      startPos += posTag.getToken().length;
    }
    const numTokens = aTokens.length;
    let posFix = 0;
    for (let i = 0; i < numTokens; i++) {
      if (i > 0) {
        aTokens[i].setWhitespaceBefore(aTokens[i - 1].getToken());
        aTokens[i].setStartPos(aTokens[i].getStartPos() + posFix);
        aTokens[i].setPosFix(posFix);
      }
      if (softHyphenTokens.size !== 0 && softHyphenTokens.has(i)) {
        // addReading() modifies a readings.token if last token is longer - need to use it first
        const ct = softHyphenTokens.get(i);
        posFix += ct.origToken.length - aTokens[i].getToken().length;
        const newToken = this.language.getTagger().createToken(ct.origToken, null);
        aTokens[i].addReading(newToken, 'softHyphenTokens');
        aTokens[i].setCleanToken(ct.cleanToken);
      }
    }
    // add additional tags
    let lastToken = toArrayCount - 1;
    // make SENT_END appear at last not whitespace token
    for (let i = 0; i < toArrayCount - 1; i++) {
      if (!tokenArray[lastToken - i].isWhitespace()) {
        lastToken -= i;
        break;
      }
    }
    tokenArray[lastToken].setSentEnd();
    if (tokenArray.length === lastToken + 1 && tokenArray[lastToken].isLinebreak()) {
      tokenArray[lastToken].setParagraphEnd();
    }
    return new AnalyzedSentence(tokenArray);
  }

  // Java: JLanguageTool#replaceSoftHyphens(List); tokens are cleaned in place (HashMap lookup-only)
  replaceSoftHyphens(tokens) {
    const ignoredCharacterRegex = this.language.getIgnoredCharactersRegex();
    const ignoredCharsTokens = new Map();
    if (ignoredCharacterRegex === null || ignoredCharacterRegex === undefined) {
      return ignoredCharsTokens;
    }
    for (let i = 0; i < tokens.length; i++) {
      const matcher = ignoredCharacterRegex.matcher(tokens[i]);
      if (matcher.find()) {
        const cleaned = matcher.replaceAll('');
        ignoredCharsTokens.set(i, new CleanToken(tokens[i], cleaned));
        tokens[i] = matcher.replaceAll('');
      }
    }
    return ignoredCharsTokens;
  }

  // Java: JLanguageTool#getCategories() (HashMap<CategoryId,Category>)
  getCategories() {
    const map = new JavaHashMap();
    for (const rule of this.getAllRules()) {
      map.put(requireRule(rule, 'getCategory', 'rule').getCategory().getId(), rule.getCategory());
    }
    return map;
  }

  // Java: JLanguageTool#getAllRules()
  getAllRules() {
    const rules = [];
    rules.push(...this.builtinRules);
    rules.push(...this.userRules);
    return rules;
  }

  // Java: JLanguageTool#getAllActiveRules()
  getAllActiveRules() {
    const rules = [];
    const rulesActive = [];
    rules.push(...this.builtinRules);
    rules.push(...this.userRules);
    // Some rules have an internal state so they can do checks over sentence
    // boundaries. These need to be reset so the checks don't suddenly
    // work on different texts with the same data. However, it could be useful
    // to keep the state information if we're checking a continuous text.
    for (const rule of rules) {
      if (!this.ignoreRule(rule)) {
        rulesActive.push(rule);
      }
    }
    return rulesActive;
  }

  // Java: JLanguageTool#getAllSpellingCheckRules()
  getAllSpellingCheckRules() {
    const SpellingCheckRuleClass = JLanguageTool.spellingCheckRuleClass;
    const rules = [];
    if (SpellingCheckRuleClass === null) return rules;
    for (const rule of this.builtinRules) {
      if (rule instanceof SpellingCheckRuleClass) {
        rules.push(rule);
      }
    }
    for (const rule of this.userRules) {
      if (rule instanceof SpellingCheckRuleClass) {
        rules.push(rule);
      }
    }
    return rules;
  }

  // Java: JLanguageTool#getAllActiveOfficeRules() (CORE-0054, verified in F35)
  getAllActiveOfficeRules() {
    const rules = [];
    const rulesActive = [];
    rules.push(...this.builtinRules);
    rules.push(...this.userRules);
    for (const rule of rules) {
      if (!this.ignoreRule(rule) && !rule.isOfficeDefaultOff()) {
        rulesActive.push(rule);
      } else if (rule.isOfficeDefaultOn() && !this.disabledRules.has(rule.getId())) {
        rulesActive.push(rule);
        this.enableRule(rule.getId());
      } else if (!this.ignoreRule(rule) && rule.isOfficeDefaultOff() && !this.enabledRules.has(rule.getId())) {
        this.disableRule(rule.getId());
      }
    }
    return rulesActive;
  }

  // Java: JLanguageTool#getPatternRulesByIdAndSubId(String,String)
  getPatternRulesByIdAndSubId(id, subId) {
    const rules = this.getAllRules();
    const rulesById = [];
    const Consistency = JLanguageTool.consistencyPatternRuleClass;
    const Repeated = JLanguageTool.repeatedPatternRuleClass;
    const AbstractPatternRuleClass = JLanguageTool.abstractPatternRuleClass;
    for (const rule of rules) {
      if (id === null || id === undefined) throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "id" is null');
      if (id.startsWith(requireRule(rule, 'getId', 'rule').getId())) {
        // test wrapped rules as normal in PatternRuleTest
        if (Consistency !== null && rule instanceof Consistency) {
          const wrappedRules = rule.getWrappedRules();
          rulesById.push(...wrappedRules.filter((r) => strEquals(r.getSubId(), subId)));
        }
      }
      if (rule.getId() === id) {
        // test wrapped rules as normal in PatternRuleTest
        if (Repeated !== null && rule instanceof Repeated) {
          const wrappedRules = rule.getWrappedRules();
          rulesById.push(...wrappedRules.filter((r) => strEquals(r.getSubId(), subId)));
        } else if (AbstractPatternRuleClass !== null && rule instanceof AbstractPatternRuleClass && strEquals(rule.getSubId(), subId)) {
          rulesById.push(rule);
        }
      }
    }
    return rulesById;
  }

  // Java: JLanguageTool#printIfVerbose(String)
  printIfVerbose(s) {
    if (this.printStream !== null) {
      this.printStream.println(s);
    }
  }

  // Java: JLanguageTool#addTemporaryFile(File)
  static addTemporaryFile(file) {
    addTemporaryFile(file);
  }

  // Java: JLanguageTool#removeTemporaryFiles()
  static removeTemporaryFiles() {
    removeTemporaryFiles();
  }

  // Java: JLanguageTool#applyCustomFilters(List,AnnotatedText)
  applyCustomFilters(matches, text) {
    let transformed = matches;
    for (const filter of this.matchFilters) {
      transformed = filter.filter(transformed, text);
    }
    return transformed;
  }

  // Java: JLanguageTool#setConfigValues(Map)
  setConfigValues(v) {
    this.userConfig.insertConfigValues(v);
  }
}

// Java: ArrayList#removeIf(Predicate) (in place)
function removeIf(list, pred) {
  let w = 0;
  for (let r = 0; r < list.length; r++) if (!pred(list[r])) list[w++] = list[r];
  list.length = w;
}

// Java: JLanguageTool.TextCheckCallable.LineColumnPosition
class LineColumnPosition {
  // Java: LineColumnPosition#LineColumnPosition(int,int)
  constructor(line, column) {
    this.line = line;
    this.column = column;
  }
}

// Java: JLanguageTool.TextCheckCallable (inner class; `lt` = JLanguageTool.this)
export class TextCheckCallable {
  // Java: TextCheckCallable#TextCheckCallable(RuleSet,List,ParagraphHandling,AnnotatedText,RuleMatchListener,Mode,Level,boolean,Set)
  constructor(lt, rules, sentences, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags) {
    this.lt = lt;
    this.rules = rules;
    this.checkRemoteRules = checkRemoteRules;
    this.sentences = Objects.requireNonNull(sentences);
    this.paraMode = Objects.requireNonNull(paraMode);
    this.annotatedText = Objects.requireNonNull(annotatedText);
    this.listener = listener ?? null;
    this.mode = Objects.requireNonNull(mode);
    this.level = Objects.requireNonNull(level);
    this.toneTags = toneTags;
  }

  // Java: TextCheckCallable#call()
  call() {
    const ruleMatches = [];
    const ignoreRanges = [];
    const extendedSentenceRanges = [];
    if (this.mode === Mode.ALL) {
      ruleMatches.push(...this.getTextLevelRuleMatches());
      const otherRuleMatches = this.getOtherRuleMatches(this.toneTags);
      ruleMatches.push(...otherRuleMatches.getRuleMatches());
      ignoreRanges.push(...otherRuleMatches.getIgnoredRanges());
      extendedSentenceRanges.push(...otherRuleMatches.getExtendedSentenceRanges());
    } else if (this.mode === Mode.ALL_BUT_TEXTLEVEL_ONLY) {
      const otherRuleMatches = this.getOtherRuleMatches(this.toneTags);
      ruleMatches.push(...otherRuleMatches.getRuleMatches());
      ignoreRanges.push(...otherRuleMatches.getIgnoredRanges());
      extendedSentenceRanges.push(...otherRuleMatches.getExtendedSentenceRanges());
    } else if (this.mode === Mode.TEXTLEVEL_ONLY) {
      ruleMatches.push(...this.getTextLevelRuleMatches());
    } else {
      throw new IllegalArgumentException(`Unknown mode: ${this.mode}`);
    }
    // can't call applyCustomRuleFilters here, done in performCheck ->
    // should run just once w/ complete list of matches
    return new CheckResults(ruleMatches, ignoreRanges, extendedSentenceRanges);
  }

  // Java: TextCheckCallable#getTextLevelRuleMatches()
  getTextLevelRuleMatches() {
    const lt = this.lt;
    const ruleMatches = [];
    let analyzedSentences = null;
    for (const rule of this.rules.allRules()) {
      if (rule instanceof TextLevelRule && this.paraMode !== ParagraphHandling.ONLYNONPARA) {
        if (lt.checkCancelledCallback !== null && lt.checkCancelledCallback.checkCancelled()) {
          break;
        }
        if (analyzedSentences === null) {
          analyzedSentences = this.sentences.map((s) => s.analyzed);
        }
        const matches = rule.match(analyzedSentences, this.annotatedText);
        const adaptedMatches = [];
        for (const match of matches) {
          let from;
          let to;
          try {
            from = this.findLineColumn(match.getFromPos());
            to = this.findLineColumn(match.getToPos());
          } catch (e) {
            if (!(e instanceof RuntimeException)) throw e;
            throw new RuntimeException(`Getting line/column positions failed for match ${match} Sentence: ${match.getSentence().getText()}`, e);
          }
          let newFromPos;
          let newToPos;
          try {
            newFromPos = this.annotatedText.getOriginalTextPositionFor(match.getFromPos(), false);
            newToPos = this.annotatedText.getOriginalTextPositionFor(match.getToPos() - 1, true) + 1;
          } catch (e) {
            if (!(e instanceof RuntimeException)) throw e;
            throw new RuntimeException(`Getting positions failed for match ${match} Sentence: ${match.getSentence().getText()}`, e);
          }
          const newMatch = new RuleMatch(match);
          newMatch.setOffsetPosition(newFromPos, newToPos);
          newMatch.setLine(from.line);
          newMatch.setEndLine(to.line);
          newMatch.setColumn(from.column - (from.line === 0 ? 1 : 0));
          newMatch.setEndColumn(to.column - (to.line === 0 ? 1 : 0));
          newMatch.setSuggestedReplacementObjects(lt.extendSuggestions(match.getSuggestedReplacementObjects()));
          adaptedMatches.push(newMatch);
        }
        ruleMatches.push(...adaptedMatches);
        if (this.listener !== null) {
          for (const adaptedMatch of adaptedMatches) {
            this.listener.matchFound(adaptedMatch);
          }
        }
      }
    }
    return ruleMatches;
  }

  // Java: TextCheckCallable#getOtherRuleMatches(Set)
  getOtherRuleMatches(toneTags) {
    const lt = this.lt;
    const ruleMatches = [];
    const ignoreRanges = []; // TODO: remove later
    const extendedSentenceRanges = [];
    let textWordCounter = 0;
    for (const sentenceData of this.sentences) textWordCounter += sentenceData.wordCount;
    let wordCounter = 0;
    let tmpErrorsPerWord = 0.0;
    const errorRateLog = [];
    for (let i = 0, sentencesSize = this.sentences.length; i < sentencesSize; i++) {
      const sentence = this.sentences[i];
      wordCounter += sentence.wordCount;
      let whitespaceFix = 0;
      // Check if sentence in sentenceData has more than 1 whitespace at begin, if yes fix the range to match with the normal sentenceRange
      if (sentence.text.startsWith(' ', 1)) {
        const sentenceStripLeading = stripLeading(sentence.text);
        whitespaceFix = sentence.text.length - sentenceStripLeading.length;
      }
      const extendedSentenceRange = new ExtendedSentenceRange(sentence.startOffset + whitespaceFix,
        sentence.startOffset + whitespaceFix + javaTrim(sentence.text).length, lt.language.getShortCode());
      extendedSentenceRanges.push(extendedSentenceRange);
      try {
        let sentenceMatches = null;
        if (lt.cache !== null) {
          throw notPortedYet('ResultCache / InputSentence (F70)');
        }
        if (sentenceMatches === null) {
          const rules = this.rules.rulesForSentence(sentence.analyzed).slice();
          rules.push(...lt.userConfig.getRules());
          sentenceMatches = lt.checkAnalyzedSentence(this.paraMode, rules, sentence.analyzed, this.checkRemoteRules, textWordCounter);
        }
        if (sentenceMatches.length !== 0) {
          if (lt.checkCancelledCallback !== null && lt.checkCancelledCallback.checkCancelled()) {
            break;
          }
          for (const elem of sentenceMatches) {
            const thisMatch = lt.adjustRuleMatchPos(elem, sentence.startOffset, sentence.startColumn, sentence.startLine, sentence.text, this.annotatedText);
            if (elem.getNewLanguageMatches().size !== 0) {
              // TODO: remove after the addon is updated
              const ignoreRange = new Range(sentence.startOffset, sentence.startOffset + sentence.text.length, elem.getNewLanguageMatches().keys().next().value);
              if (!ignoreRanges.some((r) => r.equals(ignoreRange))) {
                ignoreRanges.push(ignoreRange);
              }
              extendedSentenceRange.updateLanguageConfidenceRates(elem.getNewLanguageMatches());
            }
            ruleMatches.push(thisMatch);
            if (this.listener !== null) {
              this.listener.matchFound(thisMatch);
            }
          }
        }
        const errorsPerWord = fdiv(ruleMatches.length, wordCounter);
        if (tmpErrorsPerWord < errorsPerWord) {
          errorRateLog.push(`With sentence: ${i + 1} (of ${sentencesSize}) the text error rate increased by: ${floatToString(fsub(errorsPerWord, tmpErrorsPerWord))} from: ${floatToString(tmpErrorsPerWord)} to total: ${floatToString(errorsPerWord)}`);
          tmpErrorsPerWord = errorsPerWord;
        }
        if (lt.maxErrorsPerWordRate > 0 && errorsPerWord > lt.maxErrorsPerWordRate && wordCounter > 25) {
          // errorRateLog lines are logged at INFO [BAD_REQUEST] (logger: F71); message needs String.format("%.0f") (F35, CORE-0085)
          throw notPortedYet('ErrorRateTooHighException message String.format("%.0f") (F35, CORE-0085)');
        }
      } catch (e) {
        if (e instanceof ErrorRateTooHighException) throw e;
        if (e instanceof StackOverflowError || (e instanceof RangeError && /call stack/.test(e.message))) { // V8 stack overflow = StackOverflowError (DEV-004)
          process.stdout.write(`Could not check sentence due to StackOverflowError (language: ${lt.language}): <sentcontent>${abbreviate(sentence.analyzed.toTextString(), 10_000)}</sentcontent>\n`);
          throw e;
        }
        if (passesExceptionCatch(e)) throw e;
        throw new RuntimeException(`Could not check sentence (language: ${lt.language}): <sentcontent>${abbreviate(sentence.analyzed.toTextString(), 500)}</sentcontent>`, e);
      }
    }
    return new CheckResults(ruleMatches, ignoreRanges, extendedSentenceRanges);
  }

  // Java: TextCheckCallable#findLineColumn(int)
  findLineColumn(offset) {
    if (this.sentences.length === 0) return new LineColumnPosition(0, 0);
    const sentence = this.findSentenceContaining(offset);
    const prefix = substring(sentence.text, 0, offset - sentence.startOffset);
    return new LineColumnPosition(
      sentence.startLine + JLanguageTool.countLineBreaks(prefix),
      this.lt.processColumnChange(sentence.startColumn, prefix));
  }

  // Java: TextCheckCallable#findSentenceContaining(int)
  findSentenceContaining(offset) {
    let low = 0;
    let high = this.sentences.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const sentence = this.sentences[mid];
      if (sentence.startOffset < offset) low = mid + 1;
      else if (sentence.startOffset > offset) high = mid - 1;
      else return sentence;
    }
    return this.sentences[Objects.checkIndex(low - 1, this.sentences.length)];
  }
}

registerComponent('org.languagetool.JLanguageTool', (lang) => new JLanguageTool(lang));
