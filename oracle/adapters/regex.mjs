// JS twin of harness op "regex" (RegexOps.java#regex) on src/lib/java/regex.
import { Pattern } from '../../src/lib/java/regex/index.js';

// Java: RegexOps#err(Throwable)
function err(t) {
  const e = { class: t.javaClass ?? t.constructor.name };
  if (t.javaClass === 'java.util.regex.PatternSyntaxException') {
    e.description = t.getDescription();
    e.index = t.getIndex();
    e.pattern = t.getPattern();
  }
  e.message = t instanceof RangeError ? null : t.getMessage?.() ?? t.message ?? null;
  return e;
}

// Java: RegexOps#guard(Thunk)
function guard(f) {
  try {
    return f();
  } catch (x) {
    return { error: err(x) };
  }
}

// Java: RegexOps#regex(JsonNode)
export function run(a) {
  const pat = a.pattern;
  const flags = a.flags !== undefined ? a.flags : 0;
  const res = {};
  let p;
  try {
    p = Pattern.compile(pat, flags);
  } catch (t) {
    res.compile = { error: err(t) };
    return res;
  }
  const probe = p.matcher('');
  res.compile = { groupCount: probe.groupCount(), flags: p.flags() };
  const repl = a.replacement !== undefined ? a.replacement : (probe.groupCount() >= 1 ? '<$0|$1>' : '<$0>');
  if (a.replacement !== undefined || a.ops === undefined || JSON.stringify(a.ops).includes('replace')) res.replacement = repl;
  const limits = a.limits !== undefined ? a.limits : [0, -1, 2];
  const ops = new Set(a.ops !== undefined ? a.ops : ['matches', 'lookingAt', 'find', 'split', 'replaceAll', 'replaceFirst']);
  const results = [];
  for (const s of a.inputs) {
    const r = {};
    if (ops.has('matches')) r.matches = guard(() => p.matcher(s).matches());
    if (ops.has('lookingAt')) r.lookingAt = guard(() => p.matcher(s).lookingAt());
    if (ops.has('find')) {
      r.find = guard(() => {
        const m = p.matcher(s);
        const all = [];
        const gc = m.groupCount();
        while (m.find()) {
          const mm = [m.start(), m.end()];
          const gs = [];
          for (let g = 1; g <= gc; g++) {
            if (m.start(g) < 0) gs.push(null);
            else gs.push(m.start(g), m.end(g));
          }
          mm.push(gs);
          all.push(mm);
          if (all.length > 500) break;
        }
        return all;
      });
    }
    if (ops.has('split')) {
      const sp = {};
      for (const lim of limits) sp[String(lim)] = guard(() => p.split(s, lim));
      r.split = sp;
    }
    if (ops.has('replaceAll')) r.replaceAll = guard(() => p.matcher(s).replaceAll(repl));
    if (ops.has('replaceFirst')) r.replaceFirst = guard(() => p.matcher(s).replaceFirst(repl));
    results.push(r);
  }
  res.results = results;
  return res;
}
