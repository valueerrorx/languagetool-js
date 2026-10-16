import { normalize } from '../lib/normalizers.mjs';
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
export function compareCli(e, a, { normalizers = [], ctx = {}, json = false, streams = ['stdout', 'stderr'], ignoreExit = false, stripTimestamp = false, stderrExceptionOnly = false } = {}) {
  const diffs = [];
  if (!ignoreExit && e.exitCode !== a.exitCode) diffs.push(`exit code ${e.exitCode} != ${a.exitCode}`);
  const nn = (t) => normalize([...normalizers, 'stackFrames'], t, ctx);
  // server startup lines carry a timestamp prefix "yyyy-MM-dd HH:mm:ss +0000 " (D-045: content lines only)
  const n = (t) => (stripTimestamp ? nn(t).replace(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4} /gm, '') : nn(t));
  const eo = n(e.stdout);
  const ao = n(a.stdout);
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
    const f = (t) => (stderrExceptionOnly ? n(t).split('\n').filter((l) => /^(Exception in thread|Caused by:)/.test(l)).join('\n') : n(t));
    lineDiff('stderr', f(e.stderr), f(a.stderr), diffs);
  }
  if (e.files || a.files) diffs.push(...deepDiff(e.files ?? {}, a.files ?? {}, 'files'));
  return diffs;
}
