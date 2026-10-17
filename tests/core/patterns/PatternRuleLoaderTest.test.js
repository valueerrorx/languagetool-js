// Ported from PatternRuleLoaderTest (languagetool-core); /xx/*.xml come from tests/resources/rules/xx; testEncryptDecrypt is @Ignore
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PatternRuleLoader } from '../../../src/core/patterns/PatternRuleLoader.js';
import { ITSIssueType } from '../../../src/core/rules/model/ITSIssueType.js';
import { Tag, ToneTag } from '../../../src/core/rules/model/Tag.js';
import { ChunkTag } from '../../../src/core/chunking/ChunkTag.js';
import { XX_DIR, useXxTestResources } from '../../support/DemoLanguage.js';

// Java: JLanguageTool.getDataBroker().getFromRulesDirAsStream("/xx/<name>") + PatternRuleLoader#getRules(InputStream,String,Language)
const load = (name) => {
  const n = `/xx/${name}`;
  return new PatternRuleLoader().getRules(readFileSync(path.join(XX_DIR, name)), n, null);
};

// Java: PatternRuleLoaderTest#getCategoryNames(List)
const getCategoryNames = (rules) => new Set(rules.map((r) => r.getCategory().getName()));

// Java: PatternRuleLoaderTest#getRuleById(String,List)
function getRuleById(id, rules) {
  for (const rule of rules) if (rule.getId() === id) return rule;
  throw new Error(`No rule found for id '${id}'`);
}

// Java: PatternRuleLoaderTest#getRulesById(String,List)
const getRulesById = (id, rules) => rules.filter((r) => r.getId() === id);

describe('PatternRuleLoaderTest', () => {
  useXxTestResources();

  // Java: PatternRuleLoaderTest#testGetRules
  it('testGetRules', () => {
    const rules = load('grammar.xml');
    expect(rules.length).toBeGreaterThanOrEqual(30);

    const demoRule1 = getRuleById('DEMO_RULE', rules);
    expect(demoRule1.getUrl().toString()).toBe('http://fake-server.org/foo-bar-error-explained');
    expect(`[${demoRule1.getCorrectExamples().join(', ')}]`).toBe('[This is <marker>fuu bah</marker>.]');
    const incorrectExamples = demoRule1.getIncorrectExamples();
    expect(incorrectExamples.length).toBe(1);
    expect(incorrectExamples[0].getExample()).toBe('This is <marker>foo bar</marker>.');

    const demoRule2 = getRuleById('API_OUTPUT_TEST_RULE', rules);
    expect(demoRule2.getUrl()).toBeNull();

    expect(demoRule1.getLocQualityIssueType()).toBe(ITSIssueType.Uncategorized);
    expect(getRuleById('TEST_GO', rules).getLocQualityIssueType(), 'tag inheritance failed').toBe(ITSIssueType.Addition);
    expect(getRuleById('TEST_PHRASES1', rules).getLocQualityIssueType(), 'tag inheritance overwrite failed').toBe(ITSIssueType.Uncategorized);
    expect(getRuleById('test_include', rules).getLocQualityIssueType(), 'tag inheritance overwrite failed').toBe(ITSIssueType.Characters);

    const groupRules1 = getRulesById('test_spacebefore', rules);
    expect(groupRules1[0].getLocQualityIssueType(), 'tag inheritance form category failed').toBe(ITSIssueType.Addition);
    expect(groupRules1[1].getLocQualityIssueType(), 'tag inheritance overwrite failed').toBe(ITSIssueType.Duplication);
    const groupRules2 = getRulesById('test_unification_with_negation', rules);
    expect(groupRules2[0].getLocQualityIssueType(), 'tag inheritance from rulegroup failed').toBe(ITSIssueType.Grammar);

    const categories = getCategoryNames(rules);
    expect(categories.size).toBe(5);
    expect(categories.has('misc')).toBe(true);
    expect(categories.has('otherCategory')).toBe(true);
    expect(categories.has('Test tokens with min and max attributes')).toBe(true);
    expect(categories.has("A category that's off by default")).toBe(true);

    const demoRuleWithChunk = getRuleById('DEMO_CHUNK_RULE', rules);
    const patternTokens = demoRuleWithChunk.getPatternTokens();
    expect(patternTokens.length).toBe(2);
    expect(patternTokens[1].getPOStag()).toBeNull();
    expect(patternTokens[1].getChunkTag().equals(new ChunkTag('B-NP-singular'))).toBe(true);

    const orRules = getRulesById('GROUP_WITH_URL', rules);
    expect(orRules.length).toBe(3);
    expect(orRules[0].getUrl().toString()).toBe('http://fake-server.org/rule-group-url');
    expect(orRules[1].getUrl().toString()).toBe('http://fake-server.org/rule-group-url-overwrite');
    expect(orRules[2].getUrl().toString()).toBe('http://fake-server.org/rule-group-url');

    expect(orRules[0].getShortMessage()).toBe('short message on rule group');
    expect(orRules[1].getShortMessage()).toBe('overwriting short message');
    expect(orRules[2].getShortMessage()).toBe('short message on rule group');

    // make sure URLs don't leak to the next rule:
    for (const rule of getRulesById('OR_GROUPS', rules)) expect(rule.getUrl(), 'http://fake-server.org/rule-group-url').toBeNull();
    const nextRule = getRuleById('DEMO_CHUNK_RULE', rules);
    expect(nextRule.getUrl(), 'http://fake-server.org/rule-group-url').toBeNull();
  });

  // Java: PatternRuleLoaderTest#testPremiumXmlFlag
  it('testPremiumXmlFlag', () => {
    const rulesInNonPremiumFile = load('grammar-nonPremium.xml');
    expect(getRuleById('F-NP_C-NP_RG-NP_R-NP', rulesInNonPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-NP_C-NP_RG-NP_R-P', rulesInNonPremiumFile).isPremium()).toBe(true);
    expect(getRuleById('F-NP_C-NP_RG-P_R-NP', rulesInNonPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-NP_C-NP_RG-P_R-P', rulesInNonPremiumFile).isPremium()).toBe(true);
    expect(getRuleById('F-NP_C-P_RG-NP_R-NP', rulesInNonPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-NP_C-P_RG-NP_R-P', rulesInNonPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-NP_C-P_RG-P_R-NP', rulesInNonPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-NP_C-P_RG-P_R-P', rulesInNonPremiumFile).isPremium()).toBe(true);
    const rulesInPremiumFile = load('grammar-premium.xml');
    expect(getRuleById('F-P_C-P_RG-P_R-P', rulesInPremiumFile).isPremium()).toBe(true);
    expect(getRuleById('F-P_C-P_RG-P_R-NP', rulesInPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-P_C-P_RG-NP_R-P', rulesInPremiumFile).isPremium()).toBe(true);
    expect(getRuleById('F-P_C-P_RG-NP_R-NP', rulesInPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-P_C-NP_RG-P_R-NP', rulesInPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-P_C-NP_RG-P_R-P', rulesInPremiumFile).isPremium()).toBe(true);
    expect(getRuleById('F-P_C-NP_RG-NP_R-NP', rulesInPremiumFile).isPremium()).toBe(false);
    expect(getRuleById('F-P_C-NP_RG-NP_R-P', rulesInPremiumFile).isPremium()).toBe(true);
  });

  // Java: PatternRuleLoaderTest#testToneTagsAttribute
  it('testToneTagsAttribute', () => {
    const styleRules = load('style.xml');
    let r;
    r = getRuleById('Formal_Clarity_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.formal)).toBe(true);
    expect(r.hasToneTag(ToneTag.clarity)).toBe(true);
    expect(r.getToneTags().length).toBe(2);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('NO_TONE_RULE', styleRules);
    expect(r.getToneTags().length).toBe(0);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('CONFIDENT_ACADEMIC_SCIENTIFIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.confident)).toBe(true);
    expect(r.hasToneTag(ToneTag.academic)).toBe(true);
    expect(r.hasToneTag(ToneTag.scientific)).toBe(true);
    expect(r.getToneTags().length).toBe(3);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('CONFIDENT_ACADEMIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.confident)).toBe(true);
    expect(r.hasToneTag(ToneTag.academic)).toBe(true);
    expect(r.getToneTags().length).toBe(2);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('PICKY-CLARITY_CONFIDENT_ACADEMIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.clarity)).toBe(true);
    expect(r.hasToneTag(ToneTag.confident)).toBe(true);
    expect(r.hasToneTag(ToneTag.academic)).toBe(true);
    expect(r.getToneTags().length).toBe(3);
    expect(r.hasTag(Tag.picky)).toBe(true);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('PICKY-CLARITY_CONFIDENT_ACADEMIC_SCIENTIFIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.clarity)).toBe(true);
    expect(r.hasToneTag(ToneTag.confident)).toBe(true);
    expect(r.hasToneTag(ToneTag.academic)).toBe(true);
    expect(r.hasToneTag(ToneTag.scientific)).toBe(true);
    expect(r.getToneTags().length).toBe(4);
    expect(r.hasTag(Tag.picky)).toBe(true);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('PERSUASIVE_OBJECTIVE_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.persuasive)).toBe(true);
    expect(r.hasToneTag(ToneTag.objective)).toBe(true);
    expect(r.getToneTags().length).toBe(2);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('PERSUASIVE_OBJECTIVE_INFORMAL_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.persuasive)).toBe(true);
    expect(r.hasToneTag(ToneTag.objective)).toBe(true);
    expect(r.hasToneTag(ToneTag.informal)).toBe(true);
    expect(r.getToneTags().length).toBe(3);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('PERSUASIVE_GOAL_SPECIFIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.persuasive)).toBe(true);
    expect(r.isGoalSpecific()).toBe(true);
    r = getRuleById('PERSUASIVE_NOT_GOAL_SPECIFIC_TONE_RULE', styleRules);
    expect(r.hasToneTag(ToneTag.persuasive)).toBe(true);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('IS_GOAL_SPECIFIC_RULE_GROUP_FALSE_OVERRIDE_TEST_1', styleRules);
    expect(r.isGoalSpecific()).toBe(true);
    r = getRuleById('IS_GOAL_SPECIFIC_RULE_GROUP_FALSE_OVERRIDE_TEST_2', styleRules);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('IS_GOAL_SPECIFIC_RULE_GROUP_FALSE_OVERRIDE_TEST_3', styleRules);
    expect(r.isGoalSpecific()).toBe(false);
    r = getRuleById('IS_GOAL_SPECIFIC_FROM_CATEGORY', styleRules);
    expect(r.isGoalSpecific()).toBe(true);
  });

  // Java: PatternRuleLoaderTest#testPrioAttribute
  it('testPrioAttribute', () => {
    const xmlPrioRules = load('grammar-withPrio.xml');
    expect(getRuleById('CAT-PRIO-5-RG-PRIO-10-R-PRIO-15', xmlPrioRules).getPriority()).toBe(15);
    expect(getRuleById('CAT-PRIO-5-RG-PRIO-10-R-PRIO-0', xmlPrioRules).getPriority()).toBe(10);
    expect(getRuleById('CAT-PRIO-5-RG-PRIO-0-R-PRIO-0', xmlPrioRules).getPriority()).toBe(5);
    expect(getRuleById('CAT-PRIO-0-RG-PRIO-0-R-PRIO-0', xmlPrioRules).getPriority()).toBe(0);
    expect(getRuleById('CAT-PRIO-0-R-PRIO-0', xmlPrioRules).getPriority()).toBe(0);
  });

  // Java: PatternRuleLoaderTest#testEncryptDecrypt (@Ignore)
  it.skip('testEncryptDecrypt (@Ignore in Java)', () => {});
});
