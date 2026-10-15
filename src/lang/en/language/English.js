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
import { getClassBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { ID2PRIO_ENTRIES } from './id2prioEnglish.js';

const FALSE_FRIENDS_PATTERN = Pattern.compile('EN_FOR_[A-Z]+_SPEAKERS_FALSE_FRIENDS.*');

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
  getRelevantRules() {
    throw notPortedYet('English#getRelevantRules (F17)');
  }

  // Java: English#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
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

  // Java: English#filterRuleMatches(List,AnnotatedText,Set); body in F17 (EN-0005)
  filterRuleMatches(ruleMatches) {
    if (ruleMatches.length === 0) return [];
    throw notPortedYet('English#filterRuleMatches (F17, EN-0005)');
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
