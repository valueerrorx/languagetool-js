// org.languagetool.rules.patterns.RuleSet (rule list with token/lemma hints for per-sentence preselection)
import { UnsupportedOperationException } from '../../lib/java/errors.js';

// Java: Collections.unmodifiableList(List); frozen copy (callers always pass a fresh list)
function unmodifiable(list) {
  return Object.freeze(list.slice());
}

export class RuleSet {
  static FQCN = 'org.languagetool.rules.patterns.RuleSet';
  // set by the AbstractTokenBasedRule port (F25+): class whose instances carry `tokenHints`
  static abstractTokenBasedRuleClass = null;

  #ruleIds = null;

  // Java: RuleSet#allRules() (abstract)
  allRules() {
    throw new UnsupportedOperationException();
  }

  // Java: RuleSet#rulesForSentence(AnalyzedSentence) (abstract)
  rulesForSentence() {
    throw new UnsupportedOperationException();
  }

  // Java: RuleSet#allRuleIds()
  allRuleIds() {
    let result = this.#ruleIds;
    if (result === null) {
      this.#ruleIds = result = Object.freeze(new Set(this.allRules().map((r) => r.getId())));
    }
    return result;
  }

  // Java: RuleSet#plain(List)
  static plain(rules) {
    const allRules = unmodifiable(rules);
    return new (class extends RuleSet {
      allRules() {
        return allRules;
      }

      rulesForSentence() {
        return allRules;
      }
    })();
  }

  // Java: RuleSet#textLemmaHinted(List)
  static textLemmaHinted(rules) {
    return RuleSet.hinted(rules, true);
  }

  // Java: RuleSet#textHinted(List)
  static textHinted(rules) {
    return RuleSet.hinted(rules, false);
  }

  // Java: RuleSet#hinted(List,boolean); BitSets as sorted index arrays / byte masks
  static hinted(rules, withLemmaHints) {
    const allRules = unmodifiable(rules);
    const byToken = new Map();
    const byLemma = new Map();
    const unclassified = [];
    const TokenBased = RuleSet.abstractTokenBasedRuleClass;
    for (let i = 0; i < allRules.length; i++) {
      const rule = allRules[i];
      let classified = false;
      if (TokenBased !== null && rule instanceof TokenBased) {
        const tokenHints = rule.tokenHints;
        const firstHint = tokenHints === null || tokenHints === undefined ? null
          : withLemmaHints ? tokenHints[0]
            : (tokenHints.find((th) => !th.inflected) ?? null);
        if (firstHint !== null && firstHint !== undefined) {
          classified = true;
          const map = firstHint.inflected ? byLemma : byToken;
          for (const hint of firstHint.lowerCaseValues) {
            let set = map.get(hint);
            if (set === undefined) map.set(hint, set = []);
            if (set[set.length - 1] !== i) set.push(i);
          }
        }
      }
      if (!classified) {
        unclassified.push(i);
      }
    }
    // no hinted rule: every sentence gets all rules (same list content as filterList over all set bits)
    if (byToken.size === 0 && byLemma.size === 0) {
      return new (class extends RuleSet {
        allRules() {
          return allRules;
        }

        rulesForSentence() {
          return allRules.slice();
        }
      })();
    }
    return new (class extends RuleSet {
      allRules() {
        return allRules;
      }

      rulesForSentence(sentence) {
        const included = new Uint8Array(allRules.length);
        for (const i of unclassified) included[i] = 1;
        if (byLemma.size !== 0) {
          for (const lemma of sentence.getLemmaSet()) {
            const set = byLemma.get(lemma);
            if (set !== undefined) for (const i of set) included[i] = 1;
          }
        }
        for (const token of sentence.getTokenSet()) {
          const set = byToken.get(token);
          if (set !== undefined) for (const i of set) included[i] = 1;
        }
        const result = [];
        for (let i = 0; i < included.length; i++) if (included[i] === 1) result.push(allRules[i]);
        return result;
      }
    })();
  }

  // Java: RuleSet#filterList(BitSet,List); includedIndices = ascending set-bit indices
  static filterList(includedIndices, list) {
    const result = [];
    for (const i of includedIndices) result.push(list[i]);
    return result;
  }
}
