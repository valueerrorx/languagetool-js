// Normalisers per docs/ORACLE.md section 3.5: paths, buildDate, commit, durations, stackFrames.
const impl = {
  paths(text, ctx) {
    let t = text;
    if (ctx.tmpDir) t = t.split(ctx.tmpDir).join('<TMP>');
    if (ctx.workDir) t = t.split(ctx.workDir).join('<CASE>');
    return t;
  },
  // build timestamp: JSON "buildDate" values and the --version line "(2026-10-12 18:33:54 +0200, 9b0be9d)"
  buildDate(text) {
    return text
      .replace(/("buildDate"\s*:\s*)(null|"[^"]*")/g, '$1"<BUILDDATE>"')
      .replace(/\((\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4}|[^(),]*), ([0-9a-f]{7,40}|[^(),]*)\)/g, (m, d, c) => (/^\d{4}-/.test(d) ? `(<BUILDDATE>, ${c})` : m));
  },
  commit(text) {
    return text
      .replace(/("(?:commit|gitCommit|gitShortId)"\s*:\s*)(null|"[^"]*")/g, '$1"<COMMIT>"')
      .replace(/\(<BUILDDATE>, [^()]*\)/g, '(<BUILDDATE>, <COMMIT>)')
      .replace(/\((\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4}), [0-9a-f]{7,40}\)/g, '($1, <COMMIT>)');
  },
  // numbers in timing lines ("... took 123 ms", "Time: 1.5s") -> #
  durations(text) {
    return text.split('\n').map((l) => (/\b(time|took|elapsed|ms|sec|seconds)\b/i.test(l) ? l.replace(/\d+(?:[.,]\d+)?/g, '#') : l)).join('\n');
  },
  // remove "\tat ..." frames and "... n more" lines; "Caused by:" lines and the first line stay
  stackFrames(text) {
    return text.split('\n').filter((l) => !/^\s+at [\w$.<>/]+\(.*\)\s*$/.test(l) && !/^\s*\.\.\. \d+ (more|common frames omitted)\s*$/.test(l)).join('\n');
  },
};

export const NORMALIZERS = Object.keys(impl);

export function normalize(names, text, ctx = {}) {
  let t = text;
  // tmp dir lives inside the work dir, so paths runs first; order of the others is fixed
  for (const n of ['paths', 'stackFrames', 'buildDate', 'commit', 'durations']) {
    if (n !== 'paths' && !names.includes(n)) continue;
    t = impl[n](t, ctx);
  }
  for (const n of names) if (!impl[n]) throw new Error(`normalizer not implemented: ${n}`);
  return t;
}
