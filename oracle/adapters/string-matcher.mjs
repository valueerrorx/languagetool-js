// JS twin of harness op "string-matcher" (TokMatchOps#stringMatcher).
import { StringMatcher } from '../../src/core/patterns/StringMatcher.js';
import { err } from './_ruleload-common.mjs';

// Java: TokMatchOps#stringMatcher(JsonNode)
export function run(a) {
  return a.entries.map((e) => {
    try {
      const m = StringMatcher.create(e.p, e.re, e.cs);
      const pv = m.getPossibleValues();
      const r = { pv: pv === null ? null : [...pv] };
      let sb = '';
      for (const p of e.probes) {
        try { sb += m.matches(p) ? '1' : '0'; } catch (t) { if (t && t.notPorted === true) throw t; sb += 'E'; }
      }
      r.m = sb;
      return r;
    } catch (t) {
      return err(t);
    }
  });
}
