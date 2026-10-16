// Comparator for X-JSON (docs/review/F19-oracle.md, D-044): parsed JSON compared structurally, software.version/buildDate ignored,
// plus the object key order (CORE-0322/0323). Number text and whitespace do not matter. Errors: class + message (JDK index messages by class only).
import { deepDiff } from './deep.mjs';

const IGNORE = ['software.version', 'software.buildDate'];
const jdkMsg = (c) => /^java\.lang\.(StringIndexOutOfBounds|IndexOutOfBounds|ArrayIndexOutOfBounds|NullPointer)/.test(c);
const errKey = (e) => (e ? `${e.class}: ${jdkMsg(e.class) ? '' : e.message}` : null);

// key sequences of every object, in document order
function keyOrder(v, p = '', out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => keyOrder(x, `${p}[${i}]`, out));
  else if (v && typeof v === 'object') {
    out.push(`${p}:${Object.keys(v).join(',')}`);
    for (const [k, x] of Object.entries(v)) keyOrder(x, `${p}.${k}`, out);
  }
  return out;
}

function oneCase(e, a, p, out) {
  if (e.error || a.error) {
    if (errKey(e.error) !== errKey(a.error)) out.push(`${p}: error ${JSON.stringify(e.error)} != ${JSON.stringify(a.error)}`);
    return;
  }
  const pe = JSON.parse(e.json);
  const pa = JSON.parse(a.json);
  deepDiff(pe, pa, p, IGNORE.map((x) => `${p}.${x}`), out);
  const ke = keyOrder(pe);
  const ka = keyOrder(pa);
  if (JSON.stringify(ke) !== JSON.stringify(ka)) out.push(`${p}: key order differs ${ke.find((x, i) => x !== ka[i])} != ${ka.find((x, i) => x !== ke[i])}`);
}

export function compareJsonSerialize(expectedLines, actualLines) {
  const out = [];
  if (expectedLines.length !== actualLines.length) out.push(`responses: count ${expectedLines.length} != ${actualLines.length}`);
  for (let i = 0; i < Math.min(expectedLines.length, actualLines.length); i++) {
    const e = expectedLines[i];
    const a = actualLines[i];
    const p = `id ${e.id}`;
    if (e.ok !== a.ok) { out.push(`${p}: ok ${e.ok} != ${a.ok} ${JSON.stringify(a.error ?? '')}`); continue; }
    if (!e.ok) { if (errKey(e.error) !== errKey(a.error)) out.push(`${p}: error ${JSON.stringify(e.error)} != ${JSON.stringify(a.error)}`); continue; }
    if (e.result.cases.length !== a.result.cases.length) { out.push(`${p}.cases: length mismatch`); continue; }
    e.result.cases.forEach((c, j) => oneCase(c, a.result.cases[j], `${p}.cases[${j}]`, out));
  }
  return out;
}
