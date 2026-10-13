// Generic content diff: key order ignored, integers exact, non-integer numbers equal after Math.fround (Java floats).
export function sameNumber(a, b) {
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  return a === b || Math.fround(a) === Math.fround(b);
}

// ignore: array of dotted paths with "*" for array indices/keys, e.g. "software.buildDate"
export function deepDiff(e, a, path = '', ignore = [], out = []) {
  if (ignore.some((p) => matchPath(p, path))) return out;
  if (typeof e === 'number' && typeof a === 'number') {
    if (!sameNumber(e, a)) out.push(`${path || '$'}: ${JSON.stringify(e)} != ${JSON.stringify(a)}`);
    return out;
  }
  if (Array.isArray(e) || Array.isArray(a)) {
    if (!Array.isArray(e) || !Array.isArray(a)) { out.push(`${path || '$'}: type ${show(e)} != ${show(a)}`); return out; }
    if (e.length !== a.length) out.push(`${path || '$'}: length ${e.length} != ${a.length}`);
    for (let i = 0; i < Math.min(e.length, a.length); i++) deepDiff(e[i], a[i], `${path}[${i}]`, ignore, out);
    return out;
  }
  if (e && a && typeof e === 'object' && typeof a === 'object') {
    for (const k of new Set([...Object.keys(e), ...Object.keys(a)])) {
      const p = path ? `${path}.${k}` : k;
      if (ignore.some((x) => matchPath(x, p))) continue;
      if (!(k in e)) out.push(`${p}: missing in expected, actual ${show(a[k])}`);
      else if (!(k in a)) out.push(`${p}: missing in actual, expected ${show(e[k])}`);
      else deepDiff(e[k], a[k], p, ignore, out);
    }
    return out;
  }
  if (e !== a) out.push(`${path || '$'}: ${show(e)} != ${show(a)}`);
  return out;
}

function matchPath(pattern, path) {
  const norm = path.replace(/\[\d+\]/g, '[*]');
  return pattern === norm || pattern === path;
}

function show(v) {
  const s = JSON.stringify(v);
  return s && s.length > 160 ? `${s.slice(0, 160)}...` : s;
}
