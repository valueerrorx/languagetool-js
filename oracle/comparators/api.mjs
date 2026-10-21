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
    if (e.languagesList && Array.isArray(e.body)) e.body = e.body.filter((x) => ['de', 'en', 'fr'].includes(x.code)); // DEV-006: out-of-scope languages removed from the Java list
    const a = actual[i];
    const tag = `response[${i}]`;
    if (e.parallel) { diffs.push(...compareParallel(e, a, tag, { normalizers, ctx })); continue; } // concurrent request group (X-SRV-EXEC)
    if (e.expect === 'dev006' || e.portLater) continue; // DEV-006 / language module not ported: Java value kept as record only
    if (e.status !== a.status) diffs.push(`${tag} status ${e.status} != ${a.status}`);
    if (e.contentType !== a.contentType) diffs.push(`${tag} contentType ${e.contentType} != ${a.contentType}`);
    if (e.accessControlAllowOrigin !== a.accessControlAllowOrigin) diffs.push(`${tag} Access-Control-Allow-Origin ${e.accessControlAllowOrigin} != ${a.accessControlAllowOrigin}`);
    if (e.headers) diffs.push(...deepDiff(e.headers, a.headers ?? {}, `${tag} headers`));
    if (typeof e.body === 'string' || typeof a.body === 'string') {
      // DEV-006: the list of supported codes differs; the text up to it is compared
      const cut = (t) => t.replace(/(Supported language codes are:).*?(\. The list of languages)/s, '$1 <LIST>$2');
      const n = (x) => cut(normalize(normalizers, typeof x === 'string' ? x : JSON.stringify(x), ctx));
      if (n(e.body) !== n(a.body)) diffs.push(`${tag} text body ${JSON.stringify(n(e.body)).slice(0, 200)} != ${JSON.stringify(n(a.body)).slice(0, 200)}`);
    } else if (e.body && a.body && Array.isArray(e.body.matches) && Array.isArray(a.body.matches)) {
      diffs.push(...compareApiCheckBody(e.body, a.body).map((d) => `${tag} ${d}`));
    } else {
      diffs.push(...deepDiff(e.body, a.body, `${tag} body`, SOFTWARE_IGNORE.map((p) => `${tag} body.${p}`)));
    }
  }
  return diffs;
}

// {parallel:true, ordered:[response...]} (staggered group, request order) or {parallel:true, count, statusCounts, bodies:[{status,body,n}]} (sorted multiset)
function compareParallel(e, a, tag, { normalizers, ctx }) {
  if (!a || !a.parallel) return [`${tag} expected a parallel group result`];
  if (e.ordered) return compareApi(e.ordered, a.ordered ?? [], { normalizers, ctx }).map((d) => `${tag} ${d}`);
  const diffs = [];
  if (e.count !== a.count) diffs.push(`${tag} count ${e.count} != ${a.count}`);
  diffs.push(...deepDiff(e.statusCounts, a.statusCounts ?? {}, `${tag} statusCounts`));
  const strip = (b) => {
    if (!b || typeof b !== 'object') return b;
    const c = JSON.parse(JSON.stringify(b));
    if (c.software) for (const k of ['version', 'buildDate', 'commit', 'gitCommit']) delete c.software[k];
    return c;
  };
  const n = (x) => ({ status: x.status, n: x.n, body: typeof x.body === 'string' ? normalize(normalizers, x.body, ctx) : strip(x.body) });
  diffs.push(...deepDiff(e.bodies.map(n), (a.bodies ?? []).map(n), `${tag} bodies`));
  return diffs;
}
