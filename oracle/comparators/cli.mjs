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
export function compareCli(e, a, { normalizers = [], ctx = {}, json = false } = {}) {
  const diffs = [];
  if (e.exitCode !== a.exitCode) diffs.push(`exit code ${e.exitCode} != ${a.exitCode}`);
  const n = (t) => normalize([...normalizers, 'stackFrames'], t, ctx);
  const eo = n(e.stdout);
  const ao = n(a.stdout);
  let jsonDone = false;
  if (json) {
    try {
      diffs.push(...compareApiCheckBody(JSON.parse(eo), JSON.parse(ao)).map((d) => `stdout json ${d}`));
      jsonDone = true;
    } catch { /* not JSON: fall back to lines */ }
  }
  if (!jsonDone) lineDiff('stdout', eo, ao, diffs);
  lineDiff('stderr', n(e.stderr), n(a.stderr), diffs);
  if (e.files || a.files) diffs.push(...deepDiff(e.files ?? {}, a.files ?? {}, 'files'));
  return diffs;
}
