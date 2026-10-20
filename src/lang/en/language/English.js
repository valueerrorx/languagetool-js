// Java: org.languagetool.language.English (rule lists, rule match filter and speller rules follow in F17/F16)
import { ArrayIndexOutOfBoundsException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, javaTrim } from '../../../lib/java/strings.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { DANIEL_NABER, MARCIN_MILKOWSKI } from '../../../core/language/Contributors.js';
import { createComponent, notPortedYet, sharedComponent } from '../../../core/language/components.js';
import { getClassBroker, getDataBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { ID2PRIO_ENTRIES } from './id2prioEnglish.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { currentTimeMillis } from '../../../lib/java/clock.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../../core/rules/SentenceWhitespaceRule.js';
import { WhiteSpaceBeforeParagraphEnd } from '../../../core/rules/WhiteSpaceBeforeParagraphEnd.js';
import { WhiteSpaceAtBeginOfParagraph } from '../../../core/rules/WhiteSpaceAtBeginOfParagraph.js';
import { EmptyLineRule } from '../../../core/rules/EmptyLineRule.js';
import { LongParagraphRule } from '../../../core/rules/LongParagraphRule.js';
import { ParagraphRepeatBeginningRule } from '../../../core/rules/ParagraphRepeatBeginningRule.js';
import { PunctuationMarkAtParagraphEnd } from '../../../core/rules/PunctuationMarkAtParagraphEnd.js';
import { PunctuationMarkAtParagraphEnd2 } from '../../../core/rules/PunctuationMarkAtParagraphEnd2.js';
import { ReadabilityRule } from '../../../core/rules/ReadabilityRule.js';
import { LongSentenceRule } from '../rules/LongSentenceRule.js';
import { ConsistentApostrophesRule } from '../rules/ConsistentApostrophesRule.js';
import { EnglishSpecificCaseRule } from '../rules/EnglishSpecificCaseRule.js';
import { EnglishUnpairedBracketsRule } from '../rules/EnglishUnpairedBracketsRule.js';
import { EnglishUnpairedQuotesRule } from '../rules/EnglishUnpairedQuotesRule.js';
import { EnglishWordRepeatRule } from '../rules/EnglishWordRepeatRule.js';
import { AvsAnRule } from '../rules/AvsAnRule.js';
import { EnglishWordRepeatBeginningRule } from '../rules/EnglishWordRepeatBeginningRule.js';
import { CompoundRule } from '../rules/CompoundRule.js';
import { ContractionSpellingRule } from '../rules/ContractionSpellingRule.js';
import { EnglishWrongWordInContextRule } from '../rules/EnglishWrongWordInContextRule.js';
import { EnglishDashRule } from '../rules/EnglishDashRule.js';
import { WordCoherencyRule } from '../rules/WordCoherencyRule.js';
import { EnglishDiacriticsRule } from '../rules/EnglishDiacriticsRule.js';
import { EnglishPlainEnglishRule } from '../rules/EnglishPlainEnglishRule.js';
import { EnglishRedundancyRule } from '../rules/EnglishRedundancyRule.js';
import { SimpleReplaceRule } from '../rules/SimpleReplaceRule.js';
import { SimpleReplaceProfanityRule } from '../rules/SimpleReplaceProfanityRule.js';
import { EnglishRepeatedWordsRule } from '../rules/EnglishRepeatedWordsRule.js';
import { StyleTooOftenUsedVerbRule } from '../rules/StyleTooOftenUsedVerbRule.js';
import { StyleTooOftenUsedNounRule } from '../rules/StyleTooOftenUsedNounRule.js';
import { StyleTooOftenUsedAdjectiveRule } from '../rules/StyleTooOftenUsedAdjectiveRule.js';

const FALSE_FRIENDS_PATTERN = Pattern.compile('EN_FOR_[A-Z]+_SPEAKERS_FALSE_FRIENDS.*');

const L2_CACHE_MILLIS = 30 * 60 * 1000;
const cache = new Map(); // Java: English#cache (Guava LoadingCache, expireAfterWrite 30 min): path -> {rules, writtenAt}

// Java: English#cache.getUnchecked(String) / CacheLoader#load(String)
function cacheGetUnchecked(path) {
  const now = currentTimeMillis();
  const e = cache.get(path);
  if (e !== undefined && now - e.writtenAt < L2_CACHE_MILLIS) return e.rules;
  const rules = [];
  const loader = createComponent('org.languagetool.rules.patterns.PatternRuleLoader');
  const is = getDataBroker().getAsStream(path);
  rules.push(...loader.getRules(is, path, null));
  cache.set(path, { rules, writtenAt: now });
  return rules;
}

const id2prio = new JavaHashMap(); // Java: English#id2prio
for (const [k, v] of ID2PRIO_ENTRIES) id2prio.put(k, v);

// Java: English
export class English extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.English';

  // Java: English#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return getClassBroker().forName('org.languagetool.language.AmericanEnglish').getInstance();
  }

  // Java: English#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: English#getName()
  getName() {
    return 'English';
  }

  // Java: English#getShortCode()
  getShortCode() {
    return 'en';
  }

  // Java: English#getCountries()
  getCountries() {
    return [];
  }

  // Java: English#createDefaultTagger()
  createDefaultTagger() {
    return sharedComponent('org.languagetool.tagging.en.EnglishTagger');
  }

  // Java: English#createDefaultChunker()
  createDefaultChunker() {
    return createComponent('org.languagetool.chunking.EnglishChunker');
  }

  // Java: English#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return sharedComponent('org.languagetool.synthesis.en.EnglishSynthesizer');
  }

  // Java: English#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.en.EnglishHybridDisambiguator', this.getDefaultLanguageVariant());
  }

  // Java: English#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return createComponent('org.languagetool.tokenizers.en.EnglishWordTokenizer');
  }

  // Java: English#getMaintainers()
  getMaintainers() {
    return [new Contributor('Mike Unwalla'), MARCIN_MILKOWSKI, DANIEL_NABER];
  }

  // Java: English#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: English#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue) {
    const allRules = [];
    if (motherTongue !== null && motherTongue !== undefined) {
      if (motherTongue.getShortCode() === 'de') {
        allRules.push(...cacheGetUnchecked('/org/languagetool/rules/en/grammar-l2-de.xml'));
      } else if (motherTongue.getShortCode() === 'fr') {
        allRules.push(...cacheGetUnchecked('/org/languagetool/rules/en/grammar-l2-fr.xml'));
      }
    }
    allRules.push(
      new CommaWhitespaceRule(messages,
        Example.wrong('We had coffee<marker> ,</marker> cheese and crackers and grapes.'),
        Example.fixed('We had coffee<marker>,</marker> cheese and crackers and grapes.')),
      new DoublePunctuationRule(messages, getUrl('https://languagetool.org/insights/post/punctuation-guide/#what-are-periods')),
      new UppercaseSentenceStartRule(messages, this,
        Example.wrong('This house is old. <marker>it</marker> was built in 1950.'),
        Example.fixed('This house is old. <marker>It</marker> was built in 1950.'),
        getUrl('https://languagetool.org/insights/post/spelling-capital-letters/')),
      new MultipleWhitespaceRule(messages, this),
      new SentenceWhitespaceRule(messages, 2),
      new WhiteSpaceBeforeParagraphEnd(messages, this),
      new WhiteSpaceAtBeginOfParagraph(messages),
      new EmptyLineRule(messages, this),
      new LongSentenceRule(messages, userConfig, 40),
      new LongParagraphRule(messages, this, userConfig),
      // new OpenNMTRule() commented out because of #903
      new ParagraphRepeatBeginningRule(messages, this),
      new PunctuationMarkAtParagraphEnd(messages, this),
      new PunctuationMarkAtParagraphEnd2(messages, this),
      // specific to English:
      new ConsistentApostrophesRule(messages),
      new EnglishSpecificCaseRule(messages),
      new EnglishUnpairedBracketsRule(messages, this),
      new EnglishUnpairedQuotesRule(messages, this),
      new EnglishWordRepeatRule(messages, this),
      new AvsAnRule(messages),
      new EnglishWordRepeatBeginningRule(messages, this),
      new CompoundRule(messages, this, userConfig),
      new ContractionSpellingRule(messages, this),
      new EnglishWrongWordInContextRule(messages, this),
      new EnglishDashRule(messages),
      new WordCoherencyRule(messages),
      new EnglishDiacriticsRule(messages),
      new EnglishPlainEnglishRule(messages),
      new EnglishRedundancyRule(messages),
      new SimpleReplaceRule(messages, this),
      new SimpleReplaceProfanityRule(messages, this),
      new ReadabilityRule(messages, this, userConfig, false),
      new ReadabilityRule(messages, this, userConfig, true),
      new EnglishRepeatedWordsRule(messages),
      new StyleTooOftenUsedVerbRule(messages, this, userConfig),
      new StyleTooOftenUsedNounRule(messages, this, userConfig),
      new StyleTooOftenUsedAdjectiveRule(messages, this, userConfig));
    return allRules;
  }

  // Java: English#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules(messages, languageModel) {
    // UpperCaseNgramRule, EnglishConfusionProbabilityRule, EnglishNgramProbabilityRule: constructors dereference the language model
    if (languageModel === null || languageModel === undefined) throw new NullPointerException();
    throw notPortedYet('English#getRelevantLanguageModelRules (ngram rules, DEV-001)');
  }

  // Java: English#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules(messages, lm, globalConfig, userConfig, motherTongue) {
    if (lm !== null && lm !== undefined && motherTongue !== null && motherTongue !== undefined) {
      const code = motherTongue.getShortCode();
      if (code === 'fr' || code === 'de' || code === 'es' || code === 'nl') {
        throw notPortedYet('English#getRelevantLanguageModelCapableRules (false friend n-gram rules, DEV-001)');
      }
    }
    return [];
  }

  // Java: English#hasNGramFalseFriendRule(Language)
  hasNGramFalseFriendRule(motherTongue) {
    return motherTongue !== null && motherTongue !== undefined && (
      // Note: extend EnglishForL2SpeakersFalseFriendRuleTest.testMessageDetailData() if you add a language here
      motherTongue.getShortCode() === 'de'
      || motherTongue.getShortCode() === 'fr'
      || motherTongue.getShortCode() === 'es'
      || motherTongue.getShortCode() === 'nl');
  }

  // Java: English#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '“';
  }

  // Java: English#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '”';
  }

  // Java: English#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return '‘';
  }

  // Java: English#getClosingSingleQuote()
  getClosingSingleQuote() {
    return '’';
  }

  // Java: English#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return true;
  }

  // Java: English#getDefaultRulePriorityForStyle()
  getDefaultRulePriorityForStyle() {
    return -50;
  }

  // Java: English#getPriorityMap()
  getPriorityMap() {
    return id2prio;
  }

  // Java: English#getPriorityForId(String)
  getPriorityForId(id) {
    const prio = id2prio.get(id);
    if (prio !== null) {
      return prio;
    }
    if (id.startsWith('EN_COMPOUNDS_')) {
      return 2;
    }
    if (id === 'PRP_VBZ') {
      return -2; // prefer other more specific rules (with suggestions)
    }
    if (id.startsWith('CONFUSION_RULE_')) {
      return -20;
    }
    if (id === 'EN_UPPER_CASE_NGRAM') {
      return -12; // prefer other more specific rules (e.g. AI models)
    }
    if (id.startsWith('AI_SPELLING_RULE')) {
      return -9; // higher than MORFOLOGIK_*, for testing
    }
    if (id.startsWith('EN_MULTITOKEN_SPELLING_')) {
      return -9; // higher than MORFOLOGIK_*
    }
    if (id.startsWith('EN_GB_SIMPLE_REPLACE')) {
      return -5; // higher than MORFOLOGIK_*
    }
    if (id.startsWith('EN_US_SIMPLE_REPLACE')) {
      return -5; // higher than MORFOLOGIK_*
    }
    if (id === 'QB_EN_OXFORD') {
      return -51; // MISSING_COMMA_AFTER_YEAR
    }
    if (id.startsWith('EN_SIMPLE_REPLACE')
      && (id.endsWith('GRAMME') || id.endsWith('GRAMMES'))) {
      return -49; // Higher prio than Oxford rule
    }
    if (id.startsWith('AI_HYDRA_LEO')) { // prefer more specific rules (also speller)
      if (id === 'AI_HYDRA_LEO_MISSING_COMMA') {
        return -51; // prefer comma style rules.
      }
      if (id.startsWith('AI_HYDRA_LEO_CP_YOU_YOUARE')) {
        return -1;
      }
      if (id.startsWith('AI_HYDRA_LEO_CP')) {
        return 2;
      }
      if (id.startsWith('AI_HYDRA_LEO_MISSING_TO')) {
        return -14; // prefer lector, HAVE_PART_AGREEMENT and BEEN_PART_AGREEMENT
      }
      return -11;
    }
    if (id.startsWith('AI_EN_LECTOR')) { // prefer more specific rules (also speller)
      return -11;
    }
    if (FALSE_FRIENDS_PATTERN.matcher(id).matches()) {
      return -21;
    }
    return super.getPriorityForId(id);
  }

  // Java: English#hasMinMatchesRules()
  hasMinMatchesRules() {
    return true;
  }

  // Java: English#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikAmericanSpellerRule', messages, this, null, []);
  }

  // Java: English#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches) {
    const newRuleMatches = [];
    for (const rm of ruleMatches) {
      const errorStr = rm.getOriginalErrorStr();
      const suggestedReplacements = rm.getSuggestedReplacementObjects();
      const newReplacements = [];
      for (const suggestedReplacement of suggestedReplacements) {
        let newReplStr = suggestedReplacement.getReplacement();
        if (errorStr.length > 2) {
          // add a whitespace when the error is in a contraction and the suggestion is not
          if (errorStr.startsWith("'") && !newReplStr.startsWith("'") && !newReplStr.startsWith('’')
              && !newReplStr.startsWith(' ')) {
            newReplStr = ` ${newReplStr}`;
          }
          if (errorStr.startsWith("n't") && !newReplStr.startsWith("n't") && !newReplStr.startsWith('n’t')) {
            newReplStr = ` ${newReplStr}`;
          }
        }
        const newSuggestedReplacement = new SuggestedReplacement(suggestedReplacement);
        newSuggestedReplacement.setReplacement(newReplStr);
        if (!newReplacements.some((r) => r.equals(newSuggestedReplacement))) {
          newReplacements.push(newSuggestedReplacement);
        }
      }
      const newMatch = new RuleMatch(rm, newReplacements);
      if (newMatch.getSpecificRuleId().startsWith('EN_SIMPLE_REPLACE')
        && (newMatch.getSpecificRuleId().endsWith('GRAMME') || newMatch.getSpecificRuleId().endsWith('GRAMMES'))) {
        newMatch.getRule().setLocQualityIssueType(ITSIssueType.LocaleViolation);
      }
      newRuleMatches.push(newMatch);
    }
    return newRuleMatches;
  }

  // Java: English#prepareLineForSpeller(String)
  prepareLineForSpeller(line) {
    const parts = javaSplit(line, '#');
    if (parts.length === 0) {
      return [line];
    }
    if (line.includes('+')) {
      // while the morfologik separator is "+", multiwords with '+' can cause undesired results.
      return [''];
    }
    const formTag = javaSplit(parts[0], '\t');
    if (formTag.length === 0) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
    const form = javaTrim(formTag[0]);
    if (formTag.length > 1) {
      const tag = javaTrim(formTag[1]);
      if (tag.startsWith('NN') || tag.startsWith('JJ')) {
        return [form];
      }
      return [''];
    }
    return [line];
  }

  // Java: English#getMultitokenSpeller()
  getMultitokenSpeller() {
    return sharedComponent('org.languagetool.rules.en.EnglishMultitokenSpeller');
  }
}

registerClass(English.FQCN, English);
