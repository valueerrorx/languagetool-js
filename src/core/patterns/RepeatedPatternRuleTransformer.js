// org.languagetool.rules.patterns.RepeatedPatternRuleTransformer (wraps min_prev_matches rules into text-level rules)
import { unmodifiableList } from '../../lib/java/collections/Collections.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { listGet } from '../../lib/java/arrays.js';
import { TextLevelRule } from '../rules/model/TextLevelRule.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { SameRuleGroupFilter } from '../rules/SameRuleGroupFilter.js';
import { TransformedRules } from './PatternRuleTransformer.js';

// Java: RepeatedPatternRuleTransformer
export class RepeatedPatternRuleTransformer {
  static FQCN = 'org.languagetool.rules.patterns.RepeatedPatternRuleTransformer';

  // Java: RepeatedPatternRuleTransformer(Language)
  constructor(lang) {
    this.defaultMaxDistanceTokens = 60; // number of tokens
    this.transformerLanguage = lang;
  }

  // Java: RepeatedPatternRuleTransformer#apply(List)
  apply(patternRules) {
    const remaining = [];
    const toTransform = new JavaHashMap();
    // rules in a rule group / with the same ID should be combined so repetitions of similar patterns are matched
    for (const abstractPatternRule of patternRules) {
      if (abstractPatternRule.getMinPrevMatches() > 0) {
        toTransform.compute(abstractPatternRule.getId(), (id, rules) => {
          if (rules === null) {
            return [abstractPatternRule];
          }
          rules.push(abstractPatternRule);
          return rules;
        });
      } else {
        remaining.push(abstractPatternRule);
      }
    }
    const transformed = toTransform.values().map((group) => new RepeatedPatternRule(group, this.transformerLanguage, this));
    return new TransformedRules(remaining, transformed);
  }
}

/**
 * Wrapper for loaded AbstractPatternRule instances to act as text-level rules
 */
// Java: RepeatedPatternRuleTransformer.RepeatedPatternRule (inner class, needs the outer instance)
export class RepeatedPatternRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.patterns.RepeatedPatternRuleTransformer$RepeatedPatternRule';

  // Java: RepeatedPatternRule(List,Language)
  constructor(rules, lang, outer) {
    super();
    this.outer = outer;
    this.rules = unmodifiableList(rules);
    this.ruleLanguage = lang;
    this.setPremium(rules.some((r) => r.isPremium()));
  }

  // Java: RepeatedPatternRule#getWrappedRules()
  getWrappedRules() {
    return this.rules;
  }

  // Java: RepeatedPatternRule#getId()
  getId() {
    return listGet(this.rules, 0).getId();
  }

  // Java: RepeatedPatternRule#getDescription()
  getDescription() {
    return listGet(this.rules, 0).getDescription();
  }

  // Java: RepeatedPatternRule#match(List)
  match(sentences) {
    const matches = [];
    let offsetChars = 0;
    let offsetTokens = 0;
    let prevFromToken = 0;
    let prevMatches = 0;
    const distancesBetweenMatches = [];
    // we need to adjust offsets since each pattern rule returns offsets relative to the sentence, not text
    for (const s of sentences) {
      let sentenceMatches = [];
      for (const rule of this.rules) {
        const ruleMatches = rule.match(s);
        sentenceMatches.push(...ruleMatches);
      }
      sentenceMatches = new SameRuleGroupFilter().filter(sentenceMatches);
      // no sorting: SameRuleGroupFilter sorts rule matches already
      const sentenceLenghtTokens = s.getTokensWithoutWhitespace().length;
      for (const m of sentenceMatches) {
        let fromToken = 0;
        while (fromToken < sentenceLenghtTokens
            && s.getTokensWithoutWhitespace()[fromToken].getStartPos() < m.getFromPos()) {
          fromToken++;
        }
        fromToken += offsetTokens;
        const fromPos = m.getFromPos() + offsetChars;
        const toPos = m.getToPos() + offsetChars;
        m.setOffsetPosition(fromPos, toPos);
        let maxDistanceTokens = m.getRule().getDistanceTokens();
        if (maxDistanceTokens < 1) {
          maxDistanceTokens = this.outer.defaultMaxDistanceTokens * m.getRule().getMinPrevMatches();
        }
        distancesBetweenMatches.push(fromToken - prevFromToken);
        if (prevMatches >= m.getRule().getMinPrevMatches()
            && this.isDistanceValid(distancesBetweenMatches, maxDistanceTokens, m.getRule().getMinPrevMatches())) {
          matches.push(m);
        }
        prevFromToken = fromToken;
        prevMatches++;
      }
      offsetChars += s.getText().length;
      offsetTokens += sentenceLenghtTokens - 1; // -1 -> not counting SENT_START
    }
    return matches.length === 0 ? RuleMatch.EMPTY_ARRAY : matches;
  }

  // Java: RepeatedPatternRule#minToCheckParagraph()
  minToCheckParagraph() {
    // TODO: what should we use here? calculate based on min_prev_matches?
    return 0;
  }

  // Java: RepeatedPatternRule#supportsLanguage(Language)
  supportsLanguage(language) {
    return language.equalsConsiderVariantsIfSpecified(this.ruleLanguage);
  }

  // Java: RepeatedPatternRule#isDistanceValid(List,int,int)
  isDistanceValid(distancesBetweenMatches, maxDistanceTokens, minPrevMatches) {
    let i = 0;
    const size = distancesBetweenMatches.length;
    let distance = 0;
    while (i < minPrevMatches && i < size) {
      distance += listGet(distancesBetweenMatches, size - 1 - i);
      i++;
    }
    return distance < maxDistanceTokens;
  }
}
