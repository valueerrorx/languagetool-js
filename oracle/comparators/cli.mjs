import { normalize } from '../lib/normalizers.mjs';
import { portedBases } from '../lib/scope.mjs';
import { deepDiff } from './deep.mjs';
import { compareApiCheckBody } from './api.mjs';

function lineDiff(tag, e, a, diffs) {
  const el = e.split('\n');
  const al = a.split('\n');
  for (let i = 0; i < Math.max(el.length, al.length); i++) {
    if (el[i] !== al[i]) { diffs.push(`${tag} line ${i + 1}: ${JSON.stringify(el[i])} != ${JSON.stringify(al[i])}`); if (diffs.length > 30) return; }
  }
}

// result: {exitCode, stdout, stderr, files:{path: content}}; json=true compares stdout as the check JSON.
export function compareCli(e, a, { normalizers = [], ctx = {}, json = false, streams = ['stdout', 'stderr'], ignoreExit = false, stripTimestamp = false, stderrExceptionOnly = false, stderrFilter = null, listDev006 = false, listCut = false } = {}) {
  const diffs = [];
  if (!ignoreExit && e.exitCode !== a.exitCode) diffs.push(`exit code ${e.exitCode} != ${a.exitCode}`);
  const nn = (t) => normalize([...normalizers, 'stackFrames'], t, ctx);
  // server startup lines carry a timestamp prefix "yyyy-MM-dd HH:mm:ss +0000 " (D-045: content lines only)
  // "Time: 123ms for 5 sentences (4.3 sentences/sec)": ms and rate are not compared (D-045), the sentence count is
  // -p profile output (CLI-0055): timings and rates are not compared; rule ids, sentence and match counts are
  const profileLines = (t) => t
    .replace(/^Analyze time: \d+ ms, (?:[\d.,]+|NaN|Infinity) sent\/sec$/gm, 'Analyze time: # ms, # sent/sec')
    .replace(/^Disambig time: \d+ ms, (?:[\d.,]+|NaN|Infinity) sent\/sec$/gm, 'Disambig time: # ms, # sent/sec')
    .replace(/^(\S+) +\d+ +(\d+) +(\d+) +(?:[\d.,]+|NaN|Infinity)$/gm, (m, id, sc, mc) => `${id} # ${sc} ${mc} #`)
    .replace(/^Total rule time: \d+ ms$/gm, 'Total rule time: # ms')
    .replace(/^Total time: \d+ ms \(analyze \+ disambig \+ rules\)$/gm, 'Total time: # ms (analyze + disambig + rules)');
  const timeLine = (t) => profileLines(t.replace(/^Time: \d+ms for (\d+) sentences \((?:[\d.,]+|NaN|Infinity) sentences\/sec\)$/gm, 'Time: #ms for $1 sentences (# sentences/sec)'));
  // unknown-language texts: the supported-code list is cut (DEV-006)
  const cut = (t) => (listCut ? t.replace(/(Supported language codes are:).*?(\. The list of languages)/gs, '$1 <LIST>$2') : t);
  const n0 = (t) => (stripTimestamp ? nn(t).replace(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4} /gm, '') : nn(t));
  const n = (t) => cut(timeLine(n0(t)));
  // --list: Java prints all languages; keep only the in-scope ones (de, en, fr incl. variants) on the Java side
  const listFilter = (t) => (listDev006 ? t.split('\n').filter((l) => l === '' || new RegExp(`^(${[...portedBases()].join('|')})(-[A-Z]{2})? `).test(l)).join('\n') : t);
  const eo = listFilter(n(e.stdout));
  const ao = listFilter(n(a.stdout));
  let jsonDone = false;
  if (json) {
    try {
      diffs.push(...compareApiCheckBody(JSON.parse(eo), JSON.parse(ao)).map((d) => `stdout json ${d}`));
      jsonDone = true;
    } catch { /* not JSON: fall back to lines */ }
  }
  if (!jsonDone && streams.includes('stdout')) lineDiff('stdout', eo, ao, diffs);
  if (streams.includes('stderr')) {
    // log lines are not compared (D-045): only the uncaught exception line and its causes
    // stderrFilter: regex source, only matching lines are compared (e.g. config warnings, F66)
    const keep = stderrFilter ? new RegExp(stderrFilter) : null;
    // Java startup race (F66): the pool monitor timer thread may fail with "Label cannot be null" before the metrics collector exists; not part of the contract
    const noRace = (t) => t.split('\n').filter((l) => !l.startsWith('Exception in thread "LtThreadPoolExecutorMonitor"')).join('\n');
    const f = (t) => (keep ? noRace(n(t)).split('\n').filter((l) => keep.test(l)).join('\n') : stderrExceptionOnly ? noRace(n(t)).split('\n').filter((l) => /^(Exception in thread|Caused by:|Maybe something else is running)/.test(l)).join('\n') : n(t));
    lineDiff('stderr', f(e.stderr), f(a.stderr), diffs);
  }
  if (e.files || a.files) diffs.push(...deepDiff(e.files ?? {}, a.files ?? {}, 'files'));
  return diffs;
}
