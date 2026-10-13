import { deepDiff } from './deep.mjs';
import { compareCheck } from './check.mjs';
import { normalize } from '../lib/normalizers.mjs';

// D-023: software version/buildDate/commit are ignored.
const SOFTWARE_IGNORE = ['software.version', 'software.buildDate', 'software.commit', 'software.gitCommit'];

// /v2/check body (parsed JSON): content-equal, formatting and number text irrelevant.
export function compareApiCheckBody(e, a) {
  const diffs = [];
  const { matches: em = [], ...er } = e;
  const { matches: am = [], ...ar } = a;
  diffs.push(...deepDiff(er, ar, '', SOFTWARE_IGNORE));
  diffs.push(...compareCheck({ matches: em }, { matches: am }));
  return diffs;
}

// responses: [{status, contentType, body}] with body parsed JSON (object) or text (string)
export function compareApi(expected, actual, { normalizers = [], ctx = {} } = {}) {
  const diffs = [];
  if (expected.length !== actual.length) diffs.push(`responses: count ${expected.length} != ${actual.length}`);
  for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
    const e = expected[i];
    const a = actual[i];
    const tag = `response[${i}]`;
    if (e.status !== a.status) diffs.push(`${tag} status ${e.status} != ${a.status}`);
    if (e.contentType !== a.contentType) diffs.push(`${tag} contentType ${e.contentType} != ${a.contentType}`);
    if (e.accessControlAllowOrigin !== a.accessControlAllowOrigin) diffs.push(`${tag} Access-Control-Allow-Origin ${e.accessControlAllowOrigin} != ${a.accessControlAllowOrigin}`);
    if (typeof e.body === 'string' || typeof a.body === 'string') {
      const n = (x) => normalize(normalizers, typeof x === 'string' ? x : JSON.stringify(x), ctx);
      if (n(e.body) !== n(a.body)) diffs.push(`${tag} text body ${JSON.stringify(n(e.body)).slice(0, 200)} != ${JSON.stringify(n(a.body)).slice(0, 200)}`);
    } else if (e.body && a.body && Array.isArray(e.body.matches) && Array.isArray(a.body.matches)) {
      diffs.push(...compareApiCheckBody(e.body, a.body).map((d) => `${tag} ${d}`));
    } else {
      diffs.push(...deepDiff(e.body, a.body, `${tag} body`, SOFTWARE_IGNORE.map((p) => `${tag} body.${p}`)));
    }
  }
  return diffs;
}
