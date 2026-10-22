// Java: org.languagetool.language.Spanish
import { NullPointerException, RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaReplace, javaReplaceAll, javaSplit, javaTrim, toLowerCase } from '../../../lib/java/strings.js';
import { Languages } from '../../../core/Languages.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { createComponent, sharedComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { getMessageBundleForLanguage } from '../../../core/resources/ResourceBundleTools.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { LongSentenceRule } from '../../../core/rules/LongSentenceRule.js';
import { LongParagraphRule } from '../../../core/rules/LongParagraphRule.js';
import { CompoundRule } from '../rules/CompoundRule.js';
import { QuestionMarkRule } from '../rules/QuestionMarkRule.js';
import { SimpleReplaceRule } from '../rules/SimpleReplaceRule.js';
import { SimpleReplaceVerbsRule } from '../rules/SimpleReplaceVerbsRule.js';
import { SpanishRepeatedWordsRule } from '../rules/SpanishRepeatedWordsRule.js';
import { SpanishUnpairedBracketsRule } from '../rules/SpanishUnpairedBracketsRule.js';
import { SpanishWikipediaRule } from '../rules/SpanishWikipediaRule.js';
import { SpanishWordRepeatBeginningRule } from '../rules/SpanishWordRepeatBeginningRule.js';
import { SpanishWordRepeatRule } from '../rules/SpanishWordRepeatRule.js';
import { SpanishWrongWordInContextRule } from '../rules/SpanishWrongWordInContextRule.js';
import { MorfologikSpanishSpellerRule } from '../rules/MorfologikSpanishSpellerRule.js';
import { SpanishTagger } from '../tagging/SpanishTagger.js';
import { SpanishSynthesizer } from '../synthesis/SpanishSynthesizer.js';
import { SpanishWordTokenizer } from '../tokenizers/SpanishWordTokenizer.js';
import { ID2PRIO_ENTRIES } from './id2prioSpanish.js';

const LANGUAGE_SHORT_CODE = 'es-ES';

// XML pattern rules (grammar.xml/style.xml) enabled in W38 (es filters ported); keep true
export const ES_XML_RULES_ENABLED = true;

let instantiationTrace = null; // Java: Spanish#instantiationTrace

const id2prio = new JavaHashMap(); // Java: Spanish#id2prio
for (const [k, v] of ID2PRIO_ENTRIES) id2prio.put(k, v);

const ES_CONTRACTIONS = Pattern.compile('\\b([Aa]|[Dd]e) e(l)\\b');
const TRAILING_WS = '\\s+$';
const suggestionsToAvoid = ['aquél', 'aquélla', 'aquéllas', 'aquéllos', 'ésa', 'ésas',
  'ése', 'ésos', 'ésta', 'éstas', 'éste', 'éstos', 'sólo']; // Java: Spanish#suggestionsToAvoid
const voseoPostagPatern = Pattern.compile('V....V.*'); // Java: Spanish#voseoPostagPatern

// Java: ruleMatch.getSentence().getText() (helpful NPE when the sentence is null)
function sentenceText(m) {
  if (m.getSentence() === null || m.getSentence() === undefined) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedSentence.getText()" because the return value of "org.languagetool.rules.RuleMatch.getSentence()" is null');
  return m.getSentence().getText();
}

// Java: Spanish
export class Spanish extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.Spanish';

  // Java: Spanish#Spanish() / protected Spanish(boolean) (fake constructor overload for subclasses)
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

  // Java: Spanish#getName()
  getName() {
    return 'Spanish';
  }

  // Java: Spanish#getShortCode()
  getShortCode() {
    return 'es';
  }

  // Java: Spanish#getCountries()
  getCountries() {
    return [
      'ES', '', 'MX', 'GT', 'CR', 'PA', 'DO',
      'VE', 'PE', 'AR', 'EC', 'CL', 'UY', 'PY',
      'BO', 'SV', 'HN', 'NI', 'PR', 'US', 'CU',
    ];
  }

  // Java: Spanish#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return Languages.getLanguageForShortCode('es');
  }

  // Java: Spanish#createDefaultTagger()
  createDefaultTagger() {
    return SpanishTagger.INSTANCE;
  }

  // Java: Spanish#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.disambiguation.es.SpanishHybridDisambiguator', this.getDefaultLanguageVariant());
  }

  // Java: Spanish#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return new SpanishWordTokenizer();
  }

  // Java: Spanish#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return SpanishSynthesizer.INSTANCE;
  }

  // Java: Spanish#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Spanish#getMaintainers()
  getMaintainers() {
    return [new Contributor('Jaume Ortolà')];
  }

  // Java: Language#initializePatternRules() gated until the es filters exist (grammar.xml, style.xml)
  initializePatternRules() {
    return ES_XML_RULES_ENABLED ? super.initializePatternRules() : Object.freeze([]);
  }

  // Java: Spanish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikSpanishSpellerRule(messages, this, null, []);
  }

  // Java: Spanish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages,
        Example.wrong('En su opinión<marker> ,</marker> no era verdad.'),
        Example.fixed('En su opinión<marker>,</marker> no era verdad.')),
      new DoublePunctuationRule(messages),
      new SpanishUnpairedBracketsRule(messages),
      new QuestionMarkRule(messages),
      new MorfologikSpanishSpellerRule(messages, this, userConfig, altLanguages),
      new UppercaseSentenceStartRule(messages, this,
        Example.wrong('Venta al público. <marker>ha</marker> subido mucho.'),
        Example.fixed('Venta al público. <marker>Ha</marker> subido mucho.')),
      new SpanishWordRepeatRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
      new SpanishWikipediaRule(messages),
      new SpanishWrongWordInContextRule(messages, this),
      new LongSentenceRule(messages, userConfig, 60),
      new LongParagraphRule(messages, this, userConfig),
      new SimpleReplaceRule(messages, this),
      new SimpleReplaceVerbsRule(messages, this),
      new SpanishWordRepeatBeginningRule(messages, this),
      new CompoundRule(messages, this, userConfig),
      new SpanishRepeatedWordsRule(messages),
    ];
  }

  // Java: Spanish#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
    return []; // SpanishConfusionProbabilityRule needs a language model (ngram, DEV-001); DEV-026: null model gives an empty list
  }

  // Java: Spanish#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '«';
  }

  // Java: Spanish#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '»';
  }

  // Java: Spanish#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return '‘';
  }

  // Java: Spanish#getClosingSingleQuote()
  getClosingSingleQuote() {
    return '’';
  }

  // Java: Spanish#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return true;
  }

  // Java: Spanish#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: Spanish#getPriorityMap()
  getPriorityMap() {
    return id2prio;
  }

  // Java: Spanish#getPriorityForId(String)
  getPriorityForId(id) {
    if (id === 'CONFUSIONS2') {
      return 50; // greater than CONFUSIONS
    }
    if (id === 'RARE_WORDS') {
      return 50;
    }
    if (id === 'MISSPELLING') {
      return 40;
    }
    if (id === 'CONFUSIONS') {
      return 40;
    }
    if (id === 'INCORRECT_EXPRESSIONS') {
      return 40;
    }
    if (id === 'DIACRITICS') {
      return 30;
    }
    if (id.startsWith('ES_SIMPLE_REPLACE_SIMPLE')) {
      return 30;
    }
    if (id.startsWith('ES_COMPOUNDS')) {
      return 50;
    }
    const prio = id2prio.get(id);
    if (prio !== null) {
      return prio;
    }

    if (id.startsWith('AI_ES_HYDRA_LEO')) { // prefer more specific rules (also speller)
      return -101;
    }
    if (id.startsWith('AI_ES_GGEC')) { // prefer more specific rules (also speller)
      if (id === 'AI_ES_GGEC_REPLACEMENT_OTHER') {
        return -300;
      }
      return 0;
    }
    if (id.startsWith('ES_MULTITOKEN_SPELLING')) {
      return -95;
    }

    // STYLE is -50
    return super.getPriorityForId(id);
  }

  // Java: Spanish#hasMinMatchesRules()
  hasMinMatchesRules() {
    return true;
  }

  // Java: Spanish#adaptSuggestion(String,String)
  adaptSuggestion(replacement) {
    const m = ES_CONTRACTIONS.matcher(replacement);
    return m.replaceAll('$1$2');
  }

  // Java: Spanish#prepareLineForSpeller(String)
  prepareLineForSpeller(line) {
    const parts = javaSplit(line, '#');
    if (parts.length === 0) {
      return [line];
    }
    const formTag = javaSplit(parts[0], '[\t;]');
    if (formTag.length > 1) {
      const tag = javaTrim(formTag[1]);
      if (tag.startsWith('N') || tag === '_Latin_' || tag === 'LOC_ADV') {
        return [javaTrim(formTag[0])];
      }
      return [''];
    }
    return [line];
  }

  // Java: Spanish#getMultitokenSpeller()
  getMultitokenSpeller() {
    return sharedComponent('org.languagetool.rules.es.SpanishMultitokenSpeller');
  }

  // Java: Spanish#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches) {
    const results = [];
    for (const ruleMatch of ruleMatches) {
      const suggestions = ruleMatch.getSuggestedReplacements();
      if (suggestions.length === 1 && ruleMatch.getRule().getId().startsWith('AI_ES_GGEC')) {
        const suggestion = suggestions[0];
        // ignore adding punctuation at the sentence end
        if (ruleMatch.getRule().getId() === 'AI_ES_GGEC_MISSING_PUNCTUATION' && suggestion.endsWith('.')) {
          if (javaReplaceAll(sentenceText(ruleMatch), TRAILING_WS, '').endsWith(suggestion.substring(0, suggestion.length - 1))) {
            continue;
          }
        }
        // avoid obsolete diacritics
        if (suggestionsToAvoid.includes(toLowerCase(suggestion))) {
          continue;
        }
        // avoid lowercase at the sentence start
        if (javaTrim(sentenceText(ruleMatch)).startsWith(uppercaseFirstChar(suggestion))) {
          continue;
        }
        // avoid voseo forms in suggestions
        const atr = this.getTagger().tag([suggestion]);
        if (atr !== null && atr.length > 0) {
          if (atr[0].matchesPosTagRegex(voseoPostagPatern)) {
            continue;
          }
        }
        ruleMatch.setOriginalErrorStr();
        // the suggestion only changes the casing
        if (equalsIgnoreCase(suggestion, ruleMatch.getOriginalErrorStr())) {
          ruleMatch.setMessage('Mayúsculas y minúsculas recomendadas.');
          ruleMatch.setShortMessage('Mayúsculas y minúsculas');
          ruleMatch.getRule().setLocQualityIssueType(ITSIssueType.Typographical);
          ruleMatch.getRule().setCategory(Categories.CASING.getCategory(getMessageBundleForLanguage(this)));
          ruleMatch.setSpecificRuleId(javaReplace(ruleMatch.getRule().getId(), 'ORTHOGRAPHY', 'CASING'));
        }
      }
      results.push(ruleMatch);
    }
    return results;
  }

  // Java: Spanish#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(LANGUAGE_SHORT_CODE));
    if (language instanceof Spanish) {
      return language;
    }
    throw new RuntimeException(`Spanish language expected, got ${language}`);
  }
}

registerClass(Spanish.FQCN, Spanish);
