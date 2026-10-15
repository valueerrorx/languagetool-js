// Comparator for X-CHECK-PIPE (docs/review/F15-oracle.md): honours the oracle flags.
// check2: cases with languageFilterChanged are skipped (F35 owns Language#filterRuleMatches); extendedSentenceRanges are not compared (R5, F35).
// analyze-raw: raw dump always, post/pre/analyzeText only where disambChanged is false.
// lt-api: JVM "helpful NullPointerException" texts (Cannot invoke ...) compare by class only.
import { deepDiff } from './deep.mjs';

// X-RULES-CORE: cases with disambChanged (rule result depends on the disambiguator/immunization) are skipped until the disambiguators are ported (F32/F45/F51); set true then
const DISAMB_PORTED = false;
const errKey = (e) => (e ? `${e.class}: ${e.message}` : null);

function check2Case(e, a, p, out) {
  if (e.languageFilterChanged) return;
  if (e.disambChanged && !DISAMB_PORTED) return;
  if (e.error || a.error) {
    if (errKey(e.error?.error ?? e.error) !== errKey(a.error?.error ?? a.error)) out.push(`${p}: error ${JSON.stringify(e.error)} != ${JSON.stringify(a.error)}`);
    if (e.cancelCalls || a.cancelCalls) deepDiff(e.cancelCalls, a.cancelCalls, `${p}.cancelCalls`, [], out);
    return;
  }
  for (const k of ['matches', 'sentenceRanges', 'ignoredRanges', 'cancelCalls']) deepDiff(e[k], a[k], `${p}.${k}`, [], out);
}

function analyzeRawText(e, a, p, out) {
  if (e.error || a.error) { if (errKey(e.error) !== errKey(a.error)) out.push(`${p}: error ${JSON.stringify(e.error)} != ${JSON.stringify(a.error)}`); return; }
  if (e.sentences.length !== a.sentences.length) { out.push(`${p}.sentences: length ${e.sentences.length} != ${a.sentences.length}`); return; }
  e.sentences.forEach((s, i) => {
    const t = a.sentences[i];
    deepDiff(s.text, t.text, `${p}.sentences[${i}].text`, [], out);
    deepDiff(s.raw, t.raw, `${p}.sentences[${i}].raw`, [], out);
    if (!s.disambChanged) { deepDiff(s.post, t.post, `${p}.sentences[${i}].post`, [], out); deepDiff(s.pre, t.pre, `${p}.sentences[${i}].pre`, [], out); }
  });
  if (!e.disambChanged) deepDiff(e.analyzeText, a.analyzeText, `${p}.analyzeText`, [], out);
}

function ltApi(e, a, p, out) {
  const norm = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'message' && typeof v === 'string' && v.includes('Cannot invoke') ? '<helpful-npe>' : v)));
  deepDiff(norm(e), norm(a), p, [], out);
}

export function compareCheckPipe(expectedLines, actualLines) {
  const out = [];
  if (expectedLines.length !== actualLines.length) out.push(`responses: count ${expectedLines.length} != ${actualLines.length}`);
  for (let i = 0; i < Math.min(expectedLines.length, actualLines.length); i++) {
    const e = expectedLines[i];
    const a = actualLines[i];
    const p = `id ${e.id}`;
    if (e.ok !== a.ok) { out.push(`${p}: ok ${e.ok} != ${a.ok} ${JSON.stringify(a.error ?? '')}`); continue; }
    if (!e.ok) { if (errKey(e.error) !== errKey(a.error)) out.push(`${p}: error ${JSON.stringify(e.error)} != ${JSON.stringify(a.error)}`); continue; }
    const er = e.result;
    const ar = a.result;
    if (er.cases) {
      if (!ar.cases || ar.cases.length !== er.cases.length) { out.push(`${p}.cases: length mismatch`); continue; }
      er.cases.forEach((c, j) => check2Case(c, ar.cases[j], `${p}.cases[${j}]`, out));
    } else if (er.results) {
      if (!ar.results || ar.results.length !== er.results.length) { out.push(`${p}.results: length mismatch`); continue; }
      er.results.forEach((r, j) => analyzeRawText(r, ar.results[j], `${p}.results[${j}]`, out));
    } else if (er.steps || er.ctorError) ltApi(er, ar, p, out);
    else deepDiff(er, ar, p, [], out);
  }
  return out;
}
