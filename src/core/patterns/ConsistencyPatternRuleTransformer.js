// org.languagetool.rules.patterns.ConsistencyPatternRuleTransformer (groups consistency-prefixed rules into text-level rules)
import { unmodifiableList } from '../../lib/java/collections/Collections.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { arrayGet, listGet } from '../../lib/java/arrays.js';
import { javaSplit } from '../../lib/java/strings.js';
import { TextLevelRule } from '../rules/model/TextLevelRule.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { SameRuleGroupFilter } from '../rules/SameRuleGroupFilter.js';
import { TransformedRules } from './PatternRuleTransformer.js';

// Java: ConsistencyPatternRuleTransformer#getMainRuleId(String)
function getMainRuleId(originalId) {
  const parts = javaSplit(originalId, '_');
  return arrayGet(parts, 0) + '_' + arrayGet(parts, 1);
}

// Java: ConsistencyPatternRuleTransformer#getFeature(String)
function getFeature(originalId) {
  const parts = javaSplit(originalId, '_');
  return arrayGet(parts, 2);
}

// Java: ConsistencyPatternRuleTransformer
export class ConsistencyPatternRuleTransformer {
  static FQCN = 'org.languagetool.rules.patterns.ConsistencyPatternRuleTransformer';

  // Java: ConsistencyPatternRuleTransformer(Language)
  constructor(lang) {
    this.transformerLanguage = lang;
  }

  // Java: ConsistencyPatternRuleTransformer#apply(List)
  apply(patternRules) {
    const remaining = [];
    const toTransform = new JavaHashMap();
    // rule id conventions:
    // PREFIX_GROUPOFRULES_FEATURE
    for (const abstractPatternRule of patternRules) {
      const ruleId = abstractPatternRule.getId();
      if (ruleId.startsWith(abstractPatternRule.getLanguage().getConsistencyRulePrefix())) {
        const mainId = getMainRuleId(ruleId);
        toTransform.compute(mainId, (id, rules) => {
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
    const transformed = toTransform.values().map((group) => new ConsistencyPatternRule(group, this.transformerLanguage));
    return new TransformedRules(remaining, transformed);
  }
}

/**
 * Wrapper for loaded AbstractPatternRule instances to act as text-level rules
 */
// Java: ConsistencyPatternRuleTransformer.ConsistencyPatternRule (inner class)
export class ConsistencyPatternRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.patterns.ConsistencyPatternRuleTransformer$ConsistencyPatternRule';

  // Java: ConsistencyPatternRule(List,Language)
  constructor(rules, lang) {
    super();
    this.rules = unmodifiableList(rules);
    this.ruleLanguage = lang;
    this.setPremium(rules.some((r) => r.isPremium()));
  }

  // Java: ConsistencyPatternRule#getWrappedRules()
  getWrappedRules() {
    return this.rules;
  }

  // Java: ConsistencyPatternRule#getId()
  getId() {
    return getMainRuleId(listGet(this.rules, 0).getId());
  }

  // Java: ConsistencyPatternRule#getDescription()
  getDescription() {
    return listGet(this.rules, 0).getDescription();
  }

  // Java: ConsistencyPatternRule#match(List)
  match(sentences) {
    const countFeatures = new JavaHashMap();
    let offsetChars = 0;
    const matches = [];
    for (const s of sentences) {
      let sentenceMatches = [];
      for (const rule of this.rules) {
        const ruleMatches = rule.match(s);
        sentenceMatches.push(...ruleMatches);
      }
      sentenceMatches = new SameRuleGroupFilter().filter(sentenceMatches);
      // we need to adjust offsets since each pattern rule returns offsets relative to the sentence, not text
      const adjustedSentenceMatches = [];
      for (const rm of sentenceMatches) {
        rm.setSentencePosition(rm.getFromPos(), rm.getToPos());
        const fromPos = rm.getFromPos() + offsetChars;
        const toPos = rm.getToPos() + offsetChars;
        rm.setOffsetPosition(fromPos, toPos);
        adjustedSentenceMatches.push(rm);
      }
      matches.push(...adjustedSentenceMatches);
      offsetChars += s.getText().length;
    }
    const resultMatches = [];
    // count occurrences of features
    for (const rm of matches) {
      const feature = getFeature(rm.getRule().getId());
      countFeatures.put(feature, (countFeatures.containsKey(feature) ? countFeatures.get(feature) : 0) + 1);
    }
    if (countFeatures.size() < 2) {
      // there is no inconsistency
      return resultMatches.length === 0 ? RuleMatch.EMPTY_ARRAY : resultMatches;
    }
    const max = Math.max(...countFeatures.values()); // Java: Collections.max
    const featuresWithMax = [];
    const featuresToKeep = [];
    const featuresToSuggest = [];
    for (const [key, value] of countFeatures.entrySet()) {
      if (value === max) {
        featuresWithMax.push(key);
      } else {
        featuresToKeep.push(key);
      }
    }
    featuresToSuggest.push(...featuresWithMax);
    if (featuresWithMax.length > 1) {
      featuresToKeep.push(...featuresWithMax);
    }
    for (const rm of matches) {
      if (featuresToKeep.includes(getFeature(rm.getRule().getId()))) {
        resultMatches.push(this.ruleLanguage.adjustMatch(rm, featuresToSuggest));
      }
    }
    return resultMatches.length === 0 ? RuleMatch.EMPTY_ARRAY : resultMatches;
  }

  // Java: ConsistencyPatternRule#minToCheckParagraph()
  minToCheckParagraph() {
    // TODO: what should we use here? calculate based on min_prev_matches?
    return 0;
  }

  // Java: ConsistencyPatternRule#supportsLanguage(Language)
  supportsLanguage(language) {
    return language.equalsConsiderVariantsIfSpecified(this.ruleLanguage);
  }
}
