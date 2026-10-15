// Java: org.languagetool.language.French (rule lists, rule match filters and speller rules follow in F17/F16)
import { ArrayIndexOutOfBoundsException, RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, javaTrim } from '../../../lib/java/strings.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { Languages } from '../../../core/Languages.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { DOMINIQUE_PELLE } from '../../../core/language/Contributors.js';
import { createComponent, notPortedYet, sharedComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { ID2PRIO_ENTRIES } from './id2prioFrench.js';

const BEFORE_APOS = '([cjnmtsldCJNMTSLD]|qu|jusqu|lorsqu|puisqu|quoiqu|Qu|Jusqu|Lorsqu|Puisqu|Quoiqu|QU|JUSQU|LORSQU|PUISQU|QUOIQU)';
const BEFORE_APOS_PATTERN_1 = Pattern.compile(`(\\b${BEFORE_APOS})'`);
const BEFORE_APOS_PATTERN_2 = Pattern.compile(`(\\b${BEFORE_APOS})’"`);
const BEFORE_APOS_PATTERN_3 = Pattern.compile(`(\\b${BEFORE_APOS})’'`);

const TYPOGRAPHY_PATTERN_1 = Pattern.compile(' ;');
const TYPOGRAPHY_PATTERN_2 = Pattern.compile(' !');
const TYPOGRAPHY_PATTERN_3 = Pattern.compile(' \\?');
const TYPOGRAPHY_PATTERN_4 = Pattern.compile(';');
const TYPOGRAPHY_PATTERN_5 = Pattern.compile('!');
const TYPOGRAPHY_PATTERN_6 = Pattern.compile('\\?');
const TYPOGRAPHY_PATTERN_7 = Pattern.compile(':');
const TYPOGRAPHY_PATTERN_8 = Pattern.compile('»');
const TYPOGRAPHY_PATTERN_9 = Pattern.compile('«');
const TYPOGRAPHY_PATTERN_10 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_11 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_12 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_13 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_14 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_15 = Pattern.compile('  ');
const TYPOGRAPHY_PATTERN_16 = Pattern.compile('  ');

const FRENCH_SHORT_CODE = 'fr';

let instantiationTrace = null; // Java: French#instantiationTrace

const id2prio = new JavaHashMap(); // Java: French#id2prio
for (const [k, v] of ID2PRIO_ENTRIES) id2prio.put(k, v);

const spellerExceptions = ['Ho Chi Minh']; // Java: French#spellerExceptions

// Java: French
export class French extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.French';

  // Java: French#French() / protected French(boolean) (fake constructor overload for subclasses)
  constructor(fakeValue) {
    super();
    if (fakeValue === undefined) {
      const trace = instantiationTrace;
      if (trace !== null) {
        throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
      }
      instantiationTrace = new Throwable();
    }
  }

  // Java: French#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: French#getName()
  getName() {
    return 'French';
  }

  // Java: French#getShortCode()
  getShortCode() {
    return FRENCH_SHORT_CODE;
  }

  // Java: French#getCountries()
  getCountries() {
    return ['FR', '', 'LU', 'MC', 'CM', 'CI', 'HT', 'ML', 'SN', 'CD', 'MA', 'RE'];
  }

  // Java: French#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return Languages.getLanguageForShortCode(FRENCH_SHORT_CODE);
  }

  // Java: French#createDefaultTagger()
  createDefaultTagger() {
    return sharedComponent('org.languagetool.tagging.fr.FrenchTagger');
  }

  // Java: French#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return sharedComponent('org.languagetool.synthesis.FrenchSynthesizer');
  }

  // Java: French#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return createComponent('org.languagetool.tokenizers.fr.FrenchWordTokenizer');
  }

  // Java: French#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.disambiguation.fr.FrenchHybridDisambiguator');
  }

  // Java: French#getMaintainers()
  getMaintainers() {
    return [DOMINIQUE_PELLE];
  }

  // Java: French#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.fr.MorfologikFrenchSpellerRule', messages, this, null, []);
  }

  // Java: French#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('French#getRelevantRules (F17)');
  }

  // Java: French#getRelevantRulesGlobalConfig(ResourceBundle,GlobalConfig,UserConfig,Language,List); no Grammalecte server is configured (DEV-001)
  getRelevantRulesGlobalConfig() {
    return [];
  }

  // Java: French#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
    throw notPortedYet('French#getRelevantLanguageModelRules (ngram rules, DEV-001)');
  }

  // Java: French#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '«';
  }

  // Java: French#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '»';
  }

  // Java: French#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return '‘';
  }

  // Java: French#getClosingSingleQuote()
  getClosingSingleQuote() {
    return '’';
  }

  // Java: French#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return true;
  }

  // Java: French#toAdvancedTypography(String)
  toAdvancedTypography(input) {
    let output = super.toAdvancedTypography(input);

    // special cases: apostrophe + quotation marks
    output = BEFORE_APOS_PATTERN_1.matcher(output).replaceAll('$1’');
    output = BEFORE_APOS_PATTERN_2.matcher(output).replaceAll(`$1’${this.getOpeningDoubleQuote()}`);
    output = BEFORE_APOS_PATTERN_3.matcher(output).replaceAll(`$1’${this.getOpeningSingleQuote()}`);

    // non-breaking (thin) space
    // according to https://fr.wikipedia.org/wiki/Espace_ins%C3%A9cable#En_France
    output = TYPOGRAPHY_PATTERN_1.matcher(output).replaceAll(' ;');
    output = TYPOGRAPHY_PATTERN_2.matcher(output).replaceAll(' !');
    output = TYPOGRAPHY_PATTERN_3.matcher(output).replaceAll(' ?');
    output = TYPOGRAPHY_PATTERN_4.matcher(output).replaceAll(' ;');
    output = TYPOGRAPHY_PATTERN_5.matcher(output).replaceAll(' !');
    output = TYPOGRAPHY_PATTERN_6.matcher(output).replaceAll(' ?');

    output = TYPOGRAPHY_PATTERN_7.matcher(output).replaceAll(' :');
    output = TYPOGRAPHY_PATTERN_8.matcher(output).replaceAll(' »');
    output = TYPOGRAPHY_PATTERN_9.matcher(output).replaceAll('« ');

    // remove duplicate spaces
    output = TYPOGRAPHY_PATTERN_10.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_11.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_12.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_13.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_14.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_15.matcher(output).replaceAll(' ');
    output = TYPOGRAPHY_PATTERN_16.matcher(output).replaceAll(' ');

    return output;
  }

  // Java: French#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: French#getPriorityMap()
  getPriorityMap() {
    return id2prio;
  }

  // Java: French#getPriorityForId(String)
  getPriorityForId(id) {
    const prio = id2prio.get(id);
    if (prio !== null) {
      return prio;
    }
    if (id.startsWith('FR_COMPOUNDS')) {
      return 500;
    }
    if (id === 'CAT_TYPOGRAPHIE') {
      return 20; // greater than PRONSUJ_NONVERBE or agreement rules
    }
    if (id === 'CAT_TOURS_CRITIQUES') {
      return 20;
    }
    if (id === 'CAT_HOMONYMES_PARONYMES') {
      return 20;
    }
    if (id === 'SON') {
      return -5; // less than ETRE_VPPA_OU_ADJ
    }
    if (id.startsWith('CAR')) {
      return -50; // lesser than grammar rules
    }
    if (id === 'CONFUSION_RULE_PREMIUM') {
      return -50; // lesser than PRONSUJ_NONVERBE
    }
    if (id.startsWith('FR_MULTITOKEN_SPELLING_')) {
      return -90;
    }
    if (id.startsWith('FR_SIMPLE_REPLACE')) {
      return 150;
    }
    if (id.startsWith('grammalecte_')) {
      return -150;
    }

    if (id.startsWith('AI_FR_HYDRA_LEO')) { // prefer more specific rules (also speller)
      return -101;
    }

    if (id.startsWith('AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY')) { // prefer more specific rules (also speller)
      return -101;
    }
    return super.getPriorityForId(id);
  }

  // Java: French#hasMinMatchesRules()
  hasMinMatchesRules() {
    return true;
  }

  // Java: French#filterRuleMatches(List,AnnotatedText,Set); body in F17 (FR-0010)
  filterRuleMatches(ruleMatches) {
    if (ruleMatches.length === 0) return [];
    throw notPortedYet('French#filterRuleMatches (F17)');
  }

  // Java: French#prepareLineForSpeller(String)
  prepareLineForSpeller(line) {
    const parts = javaSplit(line, '#');
    if (parts.length === 0) {
      return [line];
    }
    const formTag = javaSplit(parts[0], '[\t;]');
    if (formTag.length === 0) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
    const form = javaTrim(formTag[0]);
    if (spellerExceptions.includes(form)) {
      return [''];
    }
    if (formTag.length > 1) {
      const tag = javaTrim(formTag[1]);
      if (tag.startsWith('Z') || tag.startsWith('N') || tag === 'A') {
        return [form];
      }
      return [''];
    }
    return [line];
  }

  // Java: French#getMultitokenSpeller()
  getMultitokenSpeller() {
    return sharedComponent('org.languagetool.rules.fr.FrenchMultitokenSpeller');
  }

  // Java: French#adjustFrenchRuleMatch(RuleMatch,Set); body in F17
  adjustFrenchRuleMatch() {
    throw notPortedYet('French#adjustFrenchRuleMatch (F17)');
  }

  // Java: French#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(FRENCH_SHORT_CODE));
    if (language instanceof French) { // cannot use French here as in premium FRENCH_SHORT_CODE returns FrenchPremium
      return language;
    }
    throw new RuntimeException(`French(Premium) language expected, got ${language}`);
  }
}

registerClass(French.FQCN, French);
