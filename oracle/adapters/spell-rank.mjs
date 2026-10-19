// JS twin of harness op "spell-rank" (SpellOps#rank, docs/review/F41-oracle.md).
import { WeightedSuggestion } from '../../src/core/rules/spelling/morfologik/WeightedSuggestion.js';
import { DetailedDamerauLevenstheinDistance as D } from '../../src/core/rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.js';
import { SuggestionsOrdererConfig } from '../../src/core/rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.js';
import { Random } from '../../src/lib/java/Random.js';
import { System } from '../../src/lib/java/System.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { Tally } from './_partial.mjs';
import { notPorted } from './_pipe-common.mjs';
import { err, ws } from './_spell-common.mjs';

const PROP = 'enableMLSuggestionsOrdering';

// Java: SpellOps#edit(String,long): operation with its random field set to a seeded Random
function edit(name, seed) {
  let op;
  switch (name) {
    case 'insert': op = new D.Insert(); break;
    case 'delete': op = new D.Delete(); break;
    case 'replace': op = new D.Replace(); break;
    case 'transpose': op = new D.Transpose(); break;
    default: throw new IllegalArgumentException(name);
  }
  op.random = new Random(seed);
  return op;
}

// Java: SpellOps#dist(Distance)
function dist(d) {
  return { value: d.value(), i: d.inserts, d: d.deletes, r: d.replaces, t: d.transposes, str: d.toString().replace(/@[0-9a-f]+/g, '@H') };
}

// Java: SpellOps#rank(JsonNode)
export function run(a) {
  const fn = a.fn;
  const out = [];
  switch (fn) {
    case 'compare':
      for (const p of a.pairs) {
        const r = {};
        const s1 = p[0];
        const s2 = p[1];
        r.a = s1;
        r.b = s2;
        try { r.d = dist(D.compare(s1, s2)); } catch (t) { r.error = err(t); }
        out.push(r);
      }
      return out;
    case 'edits': // {op, seed, inputs, repeat}
      for (const input of a.inputs) {
        const r = { in: input };
        const seq = [];
        try {
          const op = edit(a.op, a.seed);
          let cur = input;
          for (let i = 0; i < a.repeat; i++) {
            try {
              const n = op.apply(cur);
              seq.push(n);
              cur = n === null ? cur : n;
            } catch (t) { seq.push(err(t)); }
          }
        } catch (t) { seq.push(err(t)); }
        r.seq = seq;
        out.push(r);
      }
      return out;
    case 'distance': { // Distance value object: builds via op chain
      const tally = new Tally();
      let d = new D.Distance();
      for (const o of a.chain) {
        switch (o) {
          case 'insert': d = d.insert(); break;
          case 'delete': d = d.delete(); break;
          case 'replace': d = d.replace(); break;
          case 'transpose': d = d.transpose(); break;
          case 'track-insert': d = d.track(edit('insert', 1)); break;
          case 'track-delete': d = d.track(edit('delete', 1)); break;
          case 'track-replace': d = d.track(edit('replace', 1)); break;
          case 'track-transpose': d = d.track(edit('transpose', 1)); break;
          case 'track-anon': // the message holds the identity hash of the harness' anonymous class
            try { d = d.track(new (class extends D.EditOperation { apply(s) { return s; } })()); } catch { out.push(tally.skip(notPorted('identity hash of an anonymous class in the message'))); }
            break;
          default: throw new IllegalArgumentException(o);
        }
        out.push(dist(d));
      }
      const e = new D.Distance(a.eq[0], a.eq[1], a.eq[2], a.eq[3]);
      out.push({ equalsChain: d.equals(e), equalsSelf: d.equals(d), equalsNull: d.equals(null), equalsOther: d.equals('x') });
      return tally.skipped === 0 ? out : Object.assign(out, { __np: { skipped: tally.skipped, total: tally.total } });
    }
    case 'weighted': { // {items:[[word, weight]]} -> toString, sorted order, compareTo matrix
      const l = [];
      for (const it of a.items) {
        try { l.push(new WeightedSuggestion(it[0], it[1])); } catch (t) { out.push(err(t)); }
      }
      out.push(ws(l));
      const s = [...l].sort((x, y) => x.compareTo(y));
      out.push(ws(s));
      const cmp = [];
      for (const x of l) for (const y of l) cmp.push(Math.sign(x.compareTo(y)));
      out.push(cmp);
      return out;
    }
    case 'config': {
      const prev = System.getProperty(PROP);
      try {
        for (const v of a.props) {
          if (v === null) System.clearProperty(PROP); else System.setProperty(PROP, v);
          out.push(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled());
        }
        SuggestionsOrdererConfig.setMLSuggestionsOrderingEnabled(true);
        out.push(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled());
        out.push(System.getProperty(PROP));
        SuggestionsOrdererConfig.setMLSuggestionsOrderingEnabled(false);
        out.push(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled());
        out.push(System.getProperty(PROP));
      } finally {
        if (prev === null) System.clearProperty(PROP); else System.setProperty(PROP, prev);
      }
      return out;
    }
    default: throw new IllegalArgumentException(fn);
  }
}
