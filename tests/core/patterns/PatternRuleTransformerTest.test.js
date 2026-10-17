// Extra tests (no Java test class exists): Repeated/ConsistencyPatternRuleTransformer, RegexAntiPatternFilter, transformPatternRules on the Demo language
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { PatternRuleLoader } from '../../../src/core/patterns/PatternRuleLoader.js';
import { RepeatedPatternRuleTransformer } from '../../../src/core/patterns/RepeatedPatternRuleTransformer.js';
import { ConsistencyPatternRuleTransformer } from '../../../src/core/patterns/ConsistencyPatternRuleTransformer.js';
import { RegexAntiPatternFilter } from '../../../src/core/patterns/RegexAntiPatternFilter.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { getDemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

const rule = (id, extra, token) => `<rule id="${id}" name="n"${extra}><pattern><token>${token}</token></pattern><message>m ${id}</message><example correction="">a <marker>${token}</marker></example></rule>`;
const load = (body) => new PatternRuleLoader().getRules(Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><rules lang="xx"><category id="C" name="c">${body}</category></rules>`, 'utf8'), 'inline.xml', getDemoLanguage());

describe('PatternRuleTransformers', () => {
  useXxTestResources();
  let lt;
  beforeAll(() => { lt = new JLanguageTool(getDemoLanguage()); });

  // Java: RepeatedPatternRuleTransformer#apply(List)
  it('repeated: only min_prev_matches rules are wrapped, grouped by id', () => {
    const rules = load(rule('PLAIN', '', 'x') + rule('REP', ' min_prev_matches="1"', 'foo') + rule('REP', ' min_prev_matches="1"', 'bar'));
    const result = new RepeatedPatternRuleTransformer(getDemoLanguage()).apply(rules);
    expect(result.getRemainingRules().map((r) => r.getId())).toEqual(['PLAIN']);
    expect(result.getTransformedRules().length).toBe(1);
    const t = result.getTransformedRules()[0];
    expect(t.getId()).toBe('REP');
    expect(t.getWrappedRules().length).toBe(2);
    expect(t.minToCheckParagraph()).toBe(0);
  });

  // Java: RepeatedPatternRuleTransformer.RepeatedPatternRule#match(List)
  it('repeated: reports a match only after the previous matches, offsets are text based', () => {
    const rules = load(rule('REP', ' min_prev_matches="1"', 'foo'));
    const t = new RepeatedPatternRuleTransformer(getDemoLanguage()).apply(rules).getTransformedRules()[0];
    const sentences = [lt.getAnalyzedSentence('foo bar. '), lt.getAnalyzedSentence('foo baz. ')];
    const matches = t.match(sentences);
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(9);
    expect(matches[0].getToPos()).toBe(12);
  });

  // Java: ConsistencyPatternRuleTransformer#apply(List)
  it('consistency: prefix rules grouped by PREFIX_GROUP, others remain', () => {
    const prefix = getDemoLanguage().getConsistencyRulePrefix();
    const rules = load(rule('PLAIN', '', 'x') + rule(`${prefix}G_A`, '', 'foo') + rule(`${prefix}G_B`, '', 'bar'));
    const result = new ConsistencyPatternRuleTransformer(getDemoLanguage()).apply(rules);
    expect(result.getRemainingRules().map((r) => r.getId())).toEqual(['PLAIN']);
    expect(result.getTransformedRules().length).toBe(1);
    expect(result.getTransformedRules()[0].getId()).toBe(`${prefix}G`);
    const sentences = [lt.getAnalyzedSentence('foo foo bar. ')];
    const matches = result.getTransformedRules()[0].match(sentences);
    expect(matches.map((m) => m.getFromPos())).toEqual([8]);
  });

  // Java: JLanguageTool#transformPatternRules(List,Language)
  it('transformPatternRules: repeated, consistency, then remaining', () => {
    const prefix = getDemoLanguage().getConsistencyRulePrefix();
    const rules = load(rule('PLAIN', '', 'x') + rule('REP', ' min_prev_matches="1"', 'foo') + rule(`${prefix}G_A`, '', 'foo'));
    const out = lt.transformPatternRules(rules, getDemoLanguage());
    expect(out.map((r) => r.getId())).toEqual(['REP', `${prefix}G`, 'PLAIN']);
  });

  // Java: RegexAntiPatternFilter#acceptRuleMatch(RuleMatch,Map,AnalyzedSentence,Matcher)
  it('RegexAntiPatternFilter drops matches that overlap an antipattern, requires the argument', () => {
    const [r] = load(rule('R', '', 'foo'));
    const s = lt.getAnalyzedSentence('this is foo bar');
    const match = new RuleMatch(r, s, 8, 11, 'msg');
    const filter = new RegexAntiPatternFilter();
    const args = new JavaHashMap();
    expect(() => filter.acceptRuleMatch(match, args, s, null)).toThrow("Missing 'antiPatterns:' in 'args' in <filter> of rule R");
    args.put('antipatterns', 'xyz|foo bar');
    expect(filter.acceptRuleMatch(match, args, s, null)).toBeNull();
    args.put('antipatterns', 'xyz|is');
    expect(filter.acceptRuleMatch(match, args, s, null)).toBe(match);
  });
});
