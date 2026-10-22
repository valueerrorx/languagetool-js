// org.languagetool.rules.patterns.RuleSet (rule list with token/lemma hints for per-sentence preselection)
import { UnsupportedOperationException } from '../../lib/java/errors.js';
import { unmodifiableList } from '../../lib/java/collections/Collections.js';

const hintIndexCache = [[], []]; // JS: most recently used first, per withLemmaHints

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
    const allRules = unmodifiableList(rules);
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
    const allRules = unmodifiableList(rules);
    const TokenBased = RuleSet.abstractTokenBasedRuleClass;
    // JS: the hint index only depends on the token-based rules (identity) and their positions; reuse it across pipelines
    const cached = RuleSet.findHintIndex(Array.isArray(rules) ? rules : allRules, withLemmaHints, TokenBased);
    const { byToken, byLemma, unclassified } = cached;
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

  // JS: memo of RuleSet#hinted index structures (rule lists that agree in token-based rule identity and positions)
  static findHintIndex(allRules, withLemmaHints, TokenBased) {
    const n = allRules.length;
    const entries = hintIndexCache[withLemmaHints ? 1 : 0];
    for (let e = 0; e < entries.length; e++) {
      const entry = entries[e];
      const sig = entry.sig;
      if (sig.length !== n) continue;
      let same = true;
      for (let i = 0; i < n; i++) {
        const rule = allRules[i];
        if (TokenBased !== null && rule instanceof TokenBased ? rule !== sig[i] : sig[i] !== null) {
          same = false;
          break;
        }
      }
      if (same) {
        if (e > 0) { entries.splice(e, 1); entries.unshift(entry); }
        return entry;
      }
    }
    const byToken = new Map();
    const byLemma = new Map();
    const unclassified = [];
    const sig = new Array(n);
    for (let i = 0; i < n; i++) {
      const rule = allRules[i];
      let classified = false;
      sig[i] = null;
      if (TokenBased !== null && rule instanceof TokenBased) {
        sig[i] = rule;
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
    const entry = { sig, byToken, byLemma, unclassified };
    entries.unshift(entry);
    if (entries.length > 16) entries.pop();
    return entry;
  }

  // Java: RuleSet#filterList(BitSet,List); includedIndices = ascending set-bit indices
  static filterList(includedIndices, list) {
    const result = [];
    for (const i of includedIndices) result.push(list[i]);
    return result;
  }
}
