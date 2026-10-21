// Ported from JLanguageToolTest (fr module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../../src/core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../../../src/core/text/AnnotatedTextBuilder.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { FakeRule } from '../../../src/core/rules/FakeRule.js';
import { ITSIssueType } from '../../../src/core/rules/model/ITSIssueType.js';
import { Tag } from '../../../src/core/rules/model/Tag.js';
import { French } from '../../../src/lang/fr/language/French.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java fr module tests run without the en module on the classpath

const LONG = 3600000;

describe('JLanguageToolTest (fr)', () => {
  // Java: JLanguageToolTest#testLanguageDependentFilter
  it('testLanguageDependentFilter', () => {
    const lang = French.getInstance();
    const tool = new JLanguageTool(lang);

    // picky mode: suggestions with typographical apostrophes
    let analyzedSentence = tool.getAnalyzedSentence('De homme');
    let annotatedText = new AnnotatedTextBuilder().addText(analyzedSentence.getText()).build();
    let matches = tool.check(annotatedText, true, ParagraphHandling.NORMAL, null, Mode.ALL, Level.PICKY);
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe("[D'homme]");

    // normal mode: suggestions with straight apostrophes
    analyzedSentence = tool.getAnalyzedSentence('De homme');
    annotatedText = new AnnotatedTextBuilder().addText(analyzedSentence.getText()).build();
    matches = tool.check(annotatedText, true, ParagraphHandling.NORMAL, null, Mode.ALL, Level.DEFAULT);
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe("[D'homme]");

    tool.check("vrai/faux avec explication : Les droits d'accès, également appelés permissions ou autorisations, sont des règles définissant");
  }, LONG);

  // Java: JLanguageToolTest#testMultitokenSpeller
  it('testMultitokenSpeller', () => {
    const lang = French.getInstance();
    expect(`[${lang.getMultitokenSpeller().getSuggestions('greco-romain').join(', ')}]`).toBe('[gréco-romain, Gréco-Romain]');
    expect(`[${lang.getMultitokenSpeller().getSuggestions('Rinsky-Korsakov').join(', ')}]`).toBe('[Rimski-Korsakov]');
    expect(`[${lang.getMultitokenSpeller().getSuggestions('Nikolai Rimski-Korsakov').join(', ')}]`).toBe('[Nikolaï Rimski-Korsakov]');
  }, LONG);

  // Java: JLanguageToolTest#testMatchfiltering
  it('testMatchfiltering', () => {
    const lang = French.getInstance();
    const lt = new JLanguageTool(lang);
    const analyzedSentence = lt.getAnalyzedSentence("C'est Madame Curie.");
    const ruleMatch = new RuleMatch(new FakeRule('AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY_UPPERCASE_MADAME_MADAME'), analyzedSentence, 6, 12, 'Possible error');
    ruleMatch.setSuggestedReplacement('madame');
    const filteredRuleMatches = lang.filterRuleMatches([ruleMatch], null, null);
    expect(filteredRuleMatches[0].getMessage()).toBe('Un usage différent des majuscules et des minuscules est recommandé.');
    expect(filteredRuleMatches[0].getShortMessage()).toBe('Majuscules et minuscules');
    expect(filteredRuleMatches[0].getRule().getLocQualityIssueType()).toBe(ITSIssueType.Typographical);
    expect(String(filteredRuleMatches[0].getRule().getCategory().getId())).toBe('CASING');
    expect(filteredRuleMatches[0].getRule().getFullId()).toBe('AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY_UPPERCASE_MADAME_MADAME');
    expect(filteredRuleMatches[0].getSpecificRuleId()).toBe('AI_FR_GGEC_REPLACEMENT_CASING_UPPERCASE_MADAME_MADAME');
  }, LONG);

  // Java: JLanguageToolTest#testQuotes
  it('testQuotes', () => {
    const lang = French.getInstance();
    const lt = new JLanguageTool(lang);
    const analyzedSentence = lt.getAnalyzedSentence("'elle'.");
    const ruleMatch = new RuleMatch(new FakeRule('AI_FR_GGEC_REPLACEMENT_PUNCTUATION_QUOTE_TEST'), analyzedSentence, 0, 5, 'Possible error');
    const processedMatch = lang.adjustFrenchRuleMatch(ruleMatch, new Set());
    expect(processedMatch.getRule().getTags().includes(Tag.picky)).toBe(true);
    expect(processedMatch.getSpecificRuleId()).toBe('AI_FR_GGEC_QUOTES');
  }, LONG);

  // Java: JLanguageToolTest#testMergingOfGrammarCorrections
  it('testMergingOfGrammarCorrections', () => {
    const lang = French.getInstance();
    const lt = new JLanguageTool(lang);
    const analyzedSentence = lt.getAnalyzedSentence('Ce sont de spectateur');

    // Mocking two adjacent grammar issues
    const ruleMatch1 = new RuleMatch(new FakeRule('AI_FR_GGEC_DES'), analyzedSentence, 9, 11, 'Erreur de nombre');
    ruleMatch1.setSuggestedReplacement('des');
    const ruleMatch2 = new RuleMatch(new FakeRule('AI_FR_GGEC_SPECTATEURS'), analyzedSentence, 12, 21, 'Erreur de forme plurielle');
    ruleMatch2.setSuggestedReplacement('spectateurs');

    const processedMatches = lang.filterRuleMatches([ruleMatch1, ruleMatch2], null, new Set());

    expect(processedMatches[0].getSuggestedReplacements()[0]).toBe('des spectateurs');
    expect(processedMatches[0].getSpecificRuleId()).toBe('AI_FR_MERGED_MATCH');
  }, LONG);
});
