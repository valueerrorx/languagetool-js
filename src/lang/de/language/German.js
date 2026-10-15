// Java: org.languagetool.language.German (rule lists, rule match filters and speller rules follow in F17/F16)
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, javaReplaceAll } from '../../../lib/java/strings.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { Objects } from '../../../lib/java/Objects.js';
import { RuntimeException, NullPointerException, IndexOutOfBoundsException } from '../../../lib/java/errors.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { DANIEL_NABER } from '../../../core/language/Contributors.js';
import { createComponent, notPortedYet, sharedComponent } from '../../../core/language/components.js';
import { getClassBroker } from '../../../core/resources/LtStatics.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { ID2PRIO_ENTRIES } from './id2prioGerman.js';

const TYPOGRAPHY_PATTERN = Pattern.compile('\\b([a-zA-Z]\\.)([a-zA-Z]\\.)');
const AI_DE_GGEC_MISSING_PUNCT = Pattern.compile('AI_DE_GGEC_MISSING_PUNCTUATION_\\d+_DASH_J(_|AE)HRIG|AI_DE_GGEC_REPLACEMENT_CONFUSION', Pattern.CASE_INSENSITIVE);
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

const GERMAN_SHORT_CODE = 'de';

const id2prio = new JavaHashMap(); // Java: German#id2prio
for (const [k, v] of ID2PRIO_ENTRIES) id2prio.put(k, v);

// Java: German
export class German extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.German';

  // Java: German#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return getClassBroker().forName('org.languagetool.language.GermanyGerman').getInstance();
  }

  // Java: German#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.de.GermanSpellerRule', messages, this);
  }

  // Java: German#getDefaultSpellingRule()
  getDefaultSpellingRule() {
    return Objects.requireNonNull(super.getDefaultSpellingRule());
  }

  // Java: German#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.disambiguation.rules.de.GermanRuleDisambiguator', this.getDefaultLanguageVariant());
  }

  // Java: German#createDefaultPostDisambiguationChunker()
  createDefaultPostDisambiguationChunker() {
    return createComponent('org.languagetool.chunking.GermanChunker');
  }

  // Java: German#getName()
  getName() {
    return 'German';
  }

  // Java: German#getShortCode()
  getShortCode() {
    return GERMAN_SHORT_CODE;
  }

  // Java: German#getCountries()
  getCountries() {
    return ['LU', 'LI', 'BE'];
  }

  // Java: German#createDefaultTagger()
  createDefaultTagger() {
    return sharedComponent('org.languagetool.tagging.de.GermanTagger');
  }

  // Java: German#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return sharedComponent('org.languagetool.synthesis.GermanSynthesizer');
  }

  // Java: German#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: German#getMaintainers()
  getMaintainers() {
    return [new Contributor('Jan Schreiber'), DANIEL_NABER];
  }

  // Java: German#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('German#getRelevantRules (F17)');
  }

  // Java: German#getNonStrictCompoundSplitter()
  getNonStrictCompoundSplitter() {
    throw notPortedYet('German#getNonStrictCompoundSplitter (F23)');
  }

  // Java: German#getStrictCompoundTokenizer()
  getStrictCompoundTokenizer() {
    throw notPortedYet('German#getStrictCompoundTokenizer (F23)');
  }

  // Java: German#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
    throw notPortedYet('German#getRelevantLanguageModelRules (ngram rules, DEV-001)');
  }

  // Java: German#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return createComponent('org.languagetool.tokenizers.de.GermanWordTokenizer');
  }

  // Java: German#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '„';
  }

  // Java: German#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '“';
  }

  // Java: German#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return '‚';
  }

  // Java: German#getClosingSingleQuote()
  getClosingSingleQuote() {
    return '‘';
  }

  // Java: German#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return true;
  }

  // Java: German#toAdvancedTypography(String)
  toAdvancedTypography(input) {
    let output = super.toAdvancedTypography(input);
    // non-breaking space
    output = TYPOGRAPHY_PATTERN.matcher(output).replaceAll('$1 $2');
    output = TYPOGRAPHY_PATTERN.matcher(output).replaceAll('$1 $2');
    return output;
  }

  // Java: German#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: German#getPriorityMap()
  getPriorityMap() {
    return id2prio;
  }

  // Java: German#getPriorityForId(String)
  getPriorityForId(id) {
    const prio = id2prio.get(id);
    if (prio !== null) {
      return prio;
    }
    if (id.startsWith('DE_PROHIBITED_COMPOUNDS_') || id.startsWith('DE_PROHIBITED_COMPOUNDS_PREMIUM_')) { // don't hide spelling mistakes
      return -4;
    }
    if (id.startsWith('DE_MULTITOKEN_SPELLING')) {
      return -2;
    }
    if (id.startsWith('CONFUSION_RULE_')) {
      return -1;
    }
    if (id.startsWith('AI_DE_HYDRA_LEO')) { // prefer more specific rules (also speller)
      if (id.startsWith('AI_DE_HYDRA_LEO_MISSING_COMMA')) {
        return -51; // prefer comma style rules.
      }
      if (id.startsWith('AI_DE_HYDRA_LEO_CP')) {
        return 2;
      }
      if (id.startsWith('AI_DE_HYDRA_LEO_DATAKK')) {
        return 1;
      }
      return -11;
    }
    if (id.startsWith('AI_DE_KOMMA')) {
      return -52; // prefer comma style rules and AI_DE_HYDRA_LEO_MISSING_COMMA
    }
    if (id.startsWith('AI_DE_GGEC')) {
      // gGEC IDs that should have less prio than rules with default prio
      // e. g. ABKUERZUNG_FEHLENDE_PUNKTE
      switch (id) {
        case 'AI_DE_GGEC_MISSING_PUNCTUATION_E_DASH_MAIL': // less prio than EMAIL
          return 0;
        case 'AI_DE_GGEC_REPLACEMENT_ADJECTIVE':
        case 'AI_DE_GGEC_REPLACEMENT_ADVERB':
        case 'AI_DE_GGEC_REPLACEMENT_NOUN':
        case 'AI_DE_GGEC_REPLACEMENT_ORTHOGRAPHY_LOWERCASE':
        case 'AI_DE_GGEC_REPLACEMENT_ORTHOGRAPHY_SPELL':
        case 'AI_DE_GGEC_REPLACEMENT_OTHER':
        case 'AI_DE_GGEC_REPLACEMENT_VERB':
        case 'AI_DE_GGEC_REPLACEMENT_VERB_FORM':
        case 'AI_DE_GGEC_UNNECESSARY_ORTHOGRAPHY_SPACE':
        case 'AI_DE_GGEC_UNNECESSARY_OTHER':
        case 'AI_DE_GGEC_UNNECESSARY_SPACE':
          return -1;
        default:
          break;
      }

      if (id.startsWith('AI_DE_GGEC_MISSING_ORTHOGRAPHY_SPACE')) {
        return -2; // lower prio than LT_RECOMMENDATION but higher prio than GERMAN_SPELLER_RULE
      }

      if (id.startsWith('AI_DE_GGEC_MISSING_PUNCTUATION_PERIOD')) { // less prio than spell checker
        return -4;
      }
      if (id.startsWith('AI_DE_GGEC_UNNECESSARY_PUNCTUATION')) { // less prio than FALSCHES_ANFUEHRUNGSZEICHEN
        return -2;
      }
      if (AI_DE_GGEC_MISSING_PUNCT.matcher(id).find()) {
        return -1;
      }
      return 1;
    }
    return super.getPriorityForId(id);
  }

  // Java: German#hasMinMatchesRules()
  hasMinMatchesRules() {
    return true;
  }

  // Java: German#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches) {
    const resultMatches = [];
    let previousMatch = null;
    for (let i = 0; i < ruleMatches.length; i++) {
      const currentMatch = ruleMatches[i];
      const suggestions = currentMatch.getSuggestedReplacements();
      // ignore adding punctuation at the sentence end
      if (suggestions.length === 1 && currentMatch.getRule().getId().startsWith('AI_DE_GGEC')) {
        const suggestion = suggestions[0];
        if (currentMatch.getRule().getId() === 'AI_DE_GGEC_MISSING_PUNCTUATION_PERIOD' && suggestion.endsWith('.')) {
          if (javaReplaceAll(sentenceText(currentMatch), TRAILING_WS, '').endsWith(suggestion.substring(0, suggestion.length - 1))) {
            continue;
          }
        }
      }
      if (previousMatch !== null && previousMatch.getRule().getId().startsWith('AI_DE_GGEC')
        && currentMatch.getRule().getId().startsWith('AI_DE_GGEC')) {
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

  // Java: German#mergeMatches(RuleMatch,RuleMatch)
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
      'Hier scheint es einen Fehler zu geben.', 'Potenzieller Fehler');
    mergedMatch.setOriginalErrorStr(newErrorStr);
    mergedMatch.setSuggestedReplacement(newReplacement);

    // Create a new specific rule ID based on conditions
    const newId = 'AI_DE_MERGED_MATCH';
    mergedMatch.setSpecificRuleId(newId);

    // If issue types differ, set to Grammar unless both are Style
    if (match1.getRule().getLocQualityIssueType() !== match2.getRule().getLocQualityIssueType()) {
      mergedMatch.getRule().setLocQualityIssueType(ITSIssueType.Grammar);
    } else if (match1.getRule().getLocQualityIssueType() === ITSIssueType.Style && match2.getRule().getLocQualityIssueType() === ITSIssueType.Style) {
      mergedMatch.getRule().setLocQualityIssueType(ITSIssueType.Style);
    }

    return mergedMatch;
  }

  // Java: German#prepareLineForSpeller(String)
  prepareLineForSpeller(line) {
    const results = [];
    const parts = javaSplit(line, '#');
    if (parts.length === 0) {
      return [line];
    }
    const formTag = javaSplit(parts[0], '[/]');
    if (formTag.length === 0) {
      return [''];
    }
    const form = formTag[0];
    results.push(form);
    let tag = '';
    if (formTag.length === 2) {
      tag = formTag[1];
    }
    if (tag.includes('E')) {
      results.push(`${form}e`);
    }
    if (tag.includes('S')) {
      results.push(`${form}s`);
    }
    if (tag.includes('N')) {
      results.push(`${form}n`);
    }
    return results;
  }

  // Java: German#getMultitokenSpeller()
  getMultitokenSpeller() {
    return sharedComponent('org.languagetool.rules.de.GermanMultitokenSpeller');
  }

  // Java: German#getInstance() (safety method, always throws)
  static getInstance() {
    throw new RuntimeException('You should not obtain the German language instance. Use getInstance method of derived language class instead. Or maybe subclass did not implement the getInstance method.');
  }
}

registerClass(German.FQCN, German);
