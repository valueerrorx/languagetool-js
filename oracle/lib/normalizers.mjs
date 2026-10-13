// Normalisers per docs/ORACLE.md section 5; only `paths` is implemented so far.
const impl = {
  paths(text, ctx) {
    let t = text;
    if (ctx.tmpDir) t = t.split(ctx.tmpDir).join('<TMP>');
    if (ctx.workDir) t = t.split(ctx.workDir).join('<CASE>');
    return t;
  },
};

export function normalize(names, text, ctx) {
  let t = text;
  // tmp dir lives inside the work dir, so replace it first
  for (const n of ['paths', ...names.filter((x) => x !== 'paths')]) {
    if (!names.includes(n)) continue;
    if (!impl[n]) throw new Error(`normalizer not implemented: ${n}`);
    t = impl[n](t, ctx);
  }
  return t;
}
