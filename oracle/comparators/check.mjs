import { deepDiff } from './deep.mjs';

// Result of op `check`: matches in order (all fields incl. positions), sentence ranges, extended ranges, ignored ranges.
export function compareCheck(e, a, ignore = []) {
  const diffs = [];
  const em = e.matches ?? [];
  const am = a.matches ?? [];
  if (em.length !== am.length) diffs.push(`matches: count ${em.length} != ${am.length}`);
  for (let i = 0; i < Math.min(em.length, am.length); i++) {
    for (const d of deepDiff(em[i], am[i], '', ignore)) diffs.push(`matches[${i}] (${em[i].ruleId ?? em[i].rule?.id}@${em[i].fromPos ?? em[i].offset}) ${d}`);
  }
  for (const k of ['sentenceRanges', 'extendedSentenceRanges', 'ignoredRanges']) {
    if (k in e || k in a) diffs.push(...deepDiff(e[k], a[k], k, ignore));
  }
  return diffs;
}

// Envelope {ok,result|error}; error compared as data
export function compareEnvelope(e, a, resultCmp) {
  if (!e || !a) return [`envelope missing: ${!e ? 'expected' : 'actual'}`];
  if (e.ok !== a.ok) return [`ok ${e.ok} != ${a.ok}${a.error ? ` (${a.error.class}: ${a.error.message})` : ''}`];
  if (!e.ok) return deepDiff(e.error, a.error, 'error');
  return resultCmp(e.result, a.result);
}
