// Normalisers per docs/ORACLE.md section 3.5: paths, buildDate, commit, durations, stackFrames, logTimestamp.
const impl = {
  paths(text, ctx) {
    let t = text;
    if (ctx.tmpDir) t = t.split(ctx.tmpDir).join('<TMP>');
    if (ctx.workDir) t = t.split(ctx.workDir).join('<CASE>');
    // File.createTempFile("ruleload", ".xml") (X-RULELOAD via=file): random digits, directory differs between runs
    t = t.replace(/(?:<TMP>|\/[^\s"']*)\/ruleload\d+\.xml/g, '<TMP>/ruleload<N>.xml');
    return t;
  },
  // build timestamp: JSON "buildDate" values and the --version line "(2026-10-12 18:33:54 +0200, 9b0be9d)"
  buildDate(text) {
    return text
      .replace(/("buildDate"\s*:\s*)(null|"[^"]*")/g, '$1"<BUILDDATE>"')
      .replace(/\((\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4}|[^(),]*), ([0-9a-f]{7,40}|[^(),]*)\)/g, (m, d, c) => (/^\d{4}-/.test(d) ? `(<BUILDDATE>, ${c})` : m))
      // server startup line "(build date: 2026-10-12 18:33:54 +0200, 9b0be9d)"
      .replace(/\(build date: \d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4}, ([0-9a-f]{7,40})\)/g, '(build date: <BUILDDATE>, $1)');
  },
  commit(text) {
    return text
      .replace(/("(?:commit|gitCommit|gitShortId)"\s*:\s*)(null|"[^"]*")/g, '$1"<COMMIT>"')
      .replace(/\(<BUILDDATE>, [^()]*\)/g, '(<BUILDDATE>, <COMMIT>)')
      .replace(/\((\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4}), [0-9a-f]{7,40}\)/g, '($1, <COMMIT>)')
      .replace(/\(build date: <BUILDDATE>, [0-9a-f]{7,40}\)/g, '(build date: <BUILDDATE>, <COMMIT>)');
  },
  // numbers in timing lines ("... took 123 ms", "Time: 1.5s") -> #
  durations(text) {
    return text.split('\n').map((l) => (/\b(time|took|elapsed|ms|sec|seconds)\b/i.test(l) ? l.replace(/\d+(?:[.,]\d+)?/g, '#') : l)).join('\n');
  },
  // log line timestamp prefix "yyyy-MM-dd HH:mm:ss.SSS " (D-045: log lines are not acceptance; only the prefix is replaced)
  logTimestamp(text) {
    return text.split('\n').map((l) => l.replace(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d[.,]\d{3} /, '<TS> ')).join('\n');
  },
  // timeout messages (SRV-0138): "system load: [/proc/loadavg line]" and the running request counter "r: <n>" vary between runs
  sysLoad(text) {
    return text.replace(/system load: \[[^\]]*\]/g, 'system load: [<LOAD>]').replace(/\br: \d+/g, 'r: #');
  },
  // identity hash codes of Object.toString ("UserLimits@1a2b3c4d[...]")
  identityHash(text) {
    return text.replace(/@[0-9a-f]{5,8}\b/g, '@<H>');
  },
  // remove "\tat ..." frames and "... n more" lines; "Caused by:" lines and the first line stay
  stackFrames(text) {
    return text.split('\n').filter((l) => !/^\s+at [\w$.<>/#]+\(.*\)\s*$/.test(l) && !/^\s*\.\.\. \d+ (more|common frames omitted)\s*$/.test(l)).join('\n');
  },
};

export const NORMALIZERS = Object.keys(impl);

export function normalize(names, text, ctx = {}) {
  let t = text;
  // tmp dir lives inside the work dir, so paths runs first; order of the others is fixed
  for (const n of ['paths', 'stackFrames', 'buildDate', 'commit', 'durations', 'logTimestamp', 'sysLoad', 'identityHash']) {
    if (n !== 'paths' && !names.includes(n)) continue;
    t = impl[n](t, ctx);
  }
  for (const n of names) if (!impl[n]) throw new Error(`normalizer not implemented: ${n}`);
  return t;
}
