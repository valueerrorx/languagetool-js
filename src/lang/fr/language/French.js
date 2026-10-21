// Java: org.languagetool.language.French (rule lists, rule match filters and speller rules follow in F17/F16)
import { ArrayIndexOutOfBoundsException, IndexOutOfBoundsException, NullPointerException, RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, javaTrim, javaReplaceAll, equalsIgnoreCase, toLowerCase, replaceChar } from '../../../lib/java/strings.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { Languages } from '../../../core/Languages.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { DOMINIQUE_PELLE } from '../../../core/language/Contributors.js';
import { createComponent, notPortedYet, sharedComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { getMessageBundleForLanguage } from '../../../core/resources/ResourceBundleTools.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../../core/rules/SentenceWhitespaceRule.js';
import { LongSentenceRule } from '../../../core/rules/LongSentenceRule.js';
import { LongParagraphRule } from '../../../core/rules/LongParagraphRule.js';
import { MorfologikFrenchSpellerRule } from '../rules/MorfologikFrenchSpellerRule.js';
import { CompoundRule } from '../rules/CompoundRule.js';
import { QuestionWhitespaceStrictRule } from '../rules/QuestionWhitespaceStrictRule.js';
import { QuestionWhitespaceRule } from '../rules/QuestionWhitespaceRule.js';
import { SimpleReplaceRule } from '../rules/SimpleReplaceRule.js';
import { FrenchRepeatedWordsRule } from '../rules/FrenchRepeatedWordsRule.js';
import { ID2PRIO_ENTRIES } from './id2prioFrench.js';

const TRAILING_WS = '\\s+$';

// Java: currentMatch.getSentence().getText() (helpful NPE when the sentence is null)
function sentenceText(m) {
  if (m.getSentence() === null) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedSentence.getText()" because the return value of "org.languagetool.rules.RuleMatch.getSentence()" is null');
  return m.getSentence().getText();
}

// Java: match.getSuggestedReplacements().get(0)
function firstSuggestion(m) {
  const l = m.getSuggestedReplacements();
  if (l.length === 0) throw new IndexOutOfBoundsException('Index 0 out of bounds for length 0');
  return l[0];
}

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
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages, false),
      new DoublePunctuationRule(messages),
      new GenericUnpairedBracketsRule(messages, ['[', '(', '{'], [']', ')', '}']),
      (userConfig === null || userConfig === undefined) && altLanguages.length === 0 ? this.getDefaultSpellingRule() : new MorfologikFrenchSpellerRule(messages, this, userConfig, altLanguages),
      new UppercaseSentenceStartRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
      new SentenceWhitespaceRule(messages),
      new LongSentenceRule(messages, userConfig, 40),
      new LongParagraphRule(messages, this, userConfig),
      // specific to French:
      new CompoundRule(messages, this, userConfig),
      new QuestionWhitespaceStrictRule(messages, this),
      new QuestionWhitespaceRule(messages, this),
      new SimpleReplaceRule(messages, this),
      new FrenchRepeatedWordsRule(messages),
    ];
  }

  // Java: French#getRelevantRulesGlobalConfig(ResourceBundle,GlobalConfig,UserConfig,Language,List); no Grammalecte server is configured (DEV-001)
  getRelevantRulesGlobalConfig() {
    return [];
  }

  // Java: French#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules(messages, languageModel) {
    // FrenchConfusionProbabilityRule: the constructor dereferences the language model (Objects.requireNonNull)
    if (languageModel === null || languageModel === undefined) return []; // DEV-026: Java NPE; no model, no model rules
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

  // Java: French#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches, text, enabledRules) {
    const resultMatches = [];
    let previousMatch = null;
    for (let i = 0; i < ruleMatches.length; i++) {
      const currentMatch = this.adjustFrenchRuleMatch(ruleMatches[i], enabledRules);
      const suggestions = currentMatch.getSuggestedReplacements();
      // ignore adding punctuation at the sentence end
      if (suggestions.length === 1 && currentMatch.getRule().getId().startsWith('AI_FR_GGEC')) {
        const suggestion = suggestions[0];
        if (currentMatch.getRule().getId() === 'AI_FR_GGEC_MISSING_PUNCTUATION_PERIOD' && suggestion.endsWith('.')) {
          if (javaReplaceAll(sentenceText(currentMatch), TRAILING_WS, '').endsWith(suggestion.substring(0, suggestion.length - 1))) {
            continue;
          }
        }
      }
      if (previousMatch !== null && previousMatch.getRule().getId().startsWith('AI_FR_GGEC')
        && currentMatch.getRule().getId().startsWith('AI_FR_GGEC')) {
        if (previousMatch.getToPos() > currentMatch.getFromPos()) {
          continue; // Skip overlapping matches
        }
        // Check if matches are adjacent and share the same 'picky' status
        if ((previousMatch.getToPos() === currentMatch.getFromPos() || previousMatch.getToPos() + 1 === currentMatch.getFromPos())
          && (previousMatch.getRule().getTags().includes(Tag.picky) === currentMatch.getRule().getTags().includes(Tag.picky))) {
          // Merge if they have the same ITSIssueType
          if (previousMatch.getRule().getLocQualityIssueType() === currentMatch.getRule().getLocQualityIssueType()) {
            const mergedMatch = new RuleMatch(this.mergeMatches(previousMatch, currentMatch));
            previousMatch = mergedMatch;
            continue;
          }
          // If matches have different ITSIssueTypes but neither is a style match, merge them
          if (previousMatch.getRule().getLocQualityIssueType() !== currentMatch.getRule().getLocQualityIssueType()
            && previousMatch.getRule().getLocQualityIssueType() !== ITSIssueType.Style && currentMatch.getRule().getLocQualityIssueType() !== ITSIssueType.Style) {
            const mergedMatch = new RuleMatch(this.mergeMatches(previousMatch, currentMatch));
            previousMatch = mergedMatch;
            continue;
          }
        }
        // If no merge happened, add the previous match to results
        resultMatches.push(previousMatch);
        previousMatch = currentMatch; // Move to next match
      } else {
        // Ensure current match becomes previous if no merging criteria are met
        if (previousMatch !== null) {
          resultMatches.push(previousMatch);
        }
        previousMatch = currentMatch;
      }
    }
    // Add the last processed match if it exists and hasn't been added yet
    if (previousMatch !== null) {
      resultMatches.push(previousMatch);
    }
    return resultMatches;
  }

  // Java: French#mergeMatches(RuleMatch,RuleMatch)
  mergeMatches(match1, match2) {
    // Calculate separator based on position
    let separator = '';
    if (match1.getToPos() + 1 === match2.getFromPos()) {
      separator = ' ';
    }
    // Merge original error strings and suggested replacements
    const newErrorStr = match1.getOriginalErrorStr() + separator + match2.getOriginalErrorStr();
    const newReplacement = firstSuggestion(match1) + separator + firstSuggestion(match2);

    // Create a new merged RuleMatch object
    const mergedMatch = new RuleMatch(match1.getRule(), match1.getSentence(), match1.getFromPos(), match2.getToPos(),
      'Il pourrait y avoir un problème ici.', 'Erreur potentielle');
    mergedMatch.setOriginalErrorStr(newErrorStr);
    mergedMatch.setSuggestedReplacement(newReplacement);

    // Set ID based on issue type
    let newId = 'AI_FR_MERGED_MATCH';
    if (match1.getRule().getLocQualityIssueType().equals(ITSIssueType.Style)
      && match2.getRule().getLocQualityIssueType().equals(ITSIssueType.Style)) {
      newId += '_STYLE';
    }
    if (match1.getRule().getTags().includes(Tag.picky) && match2.getRule().getTags().includes(Tag.picky)) {
      newId += '_PICKY';
    }
    mergedMatch.setSpecificRuleId(newId);

    // Set ITSIssueType to Grammar unless both are Style
    if (!match1.getRule().getLocQualityIssueType().equals(match2.getRule().getLocQualityIssueType())) {
      mergedMatch.getRule().setLocQualityIssueType(ITSIssueType.Grammar);
    } else if (match1.getRule().getLocQualityIssueType() === ITSIssueType.Style) {
      mergedMatch.getRule().setLocQualityIssueType(ITSIssueType.Style);
    }
    return mergedMatch;
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

  // Java: French#adjustFrenchRuleMatch(RuleMatch,Set)
  adjustFrenchRuleMatch(rm, enabledRules) {
    rm.setOriginalErrorStr();
    const errorStr = rm.getOriginalErrorStr();
    const suggestions = rm.getSuggestedReplacements();
    if (suggestions.length === 1 && rm.getRule().getId().startsWith('AI_FR_GGEC')) {
      const suggestion = suggestions[0];
      // the suggestion only changes the casing
      if (equalsIgnoreCase(suggestion, errorStr)) {
        rm.setMessage('Un usage différent des majuscules et des minuscules est recommandé.');
        rm.setShortMessage('Majuscules et minuscules');
        rm.getRule().setLocQualityIssueType(ITSIssueType.Typographical);
        rm.getRule().setCategory(Categories.CASING.getCategory(getMessageBundleForLanguage(this)));
        rm.setSpecificRuleId(rm.getRule().getId().replaceAll('ORTHOGRAPHY', 'CASING'));
      }
    }
    if (suggestions.length === 1 && rm.getRule().getId().startsWith('AI_FR_GGEC')
      && rm.getRule().getId().includes('MISSING_PRONOUN_LAPOSTROPHE')) {
      if (errorStr === 'on' && suggestions[0] === 'l\'on' && toLowerCase(sentenceText(rm)).includes('si on')) {
        rm.setSpecificRuleId('AI_FR_GGEC_SI_LON');
        rm.getRule().setTags([Tag.picky]);
      }
    }
    if (rm.getRule().getId().startsWith('AI_FR_GGEC') && rm.getRule().getId().includes('REPLACEMENT_PUNCTUATION_QUOTE')) {
      rm.setSpecificRuleId('AI_FR_GGEC_QUOTES');
      rm.getRule().setTags([Tag.picky]);
      rm.getRule().setLocQualityIssueType(ITSIssueType.Typographical);
    }
    // if the typographical apostrophe rule is enabled, use the typographical apostrophe in suggestons
    if (enabledRules !== null && enabledRules !== undefined && enabledRules.has('APOS_TYP')) {
      const newReplacements = [];
      for (let s of rm.getSuggestedReplacements()) {
        if (s.length > 1) {
          s = replaceChar(s, 0x27, 0x2019);
        }
        newReplacements.push(s);
      }
      rm.setSuggestedReplacements(newReplacements);
    }
    return rm;
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
