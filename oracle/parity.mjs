// npm run parity [-- <ID>...]   (docs/ORACLE.md section 9)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from './lib/env.mjs';
import { normalize } from './lib/normalizers.mjs';
import { getComparator } from './comparators/index.mjs';
import { isMark, NP_KEY } from './adapters/_partial.mjs';
import { compareServerLog } from './comparators/logs.mjs';

const GOLDEN = path.join(ROOT, 'tests/golden');

// D-056 deliberate differences: oracle/deviations.json maps "<ID>/<case>[#request]" -> DEV id.
// "#k" masks one request (http: response index, harness: request id) on both sides; without "#k" a FAIL of the case becomes DEV.
const DEVIATIONS = existsSync(path.join(ROOT, 'oracle/deviations.json')) ? JSON.parse(readFileSync(path.join(ROOT, 'oracle/deviations.json'), 'utf8')) : {};
function devMasks(id, name) {
  const whole = DEVIATIONS[`${id}/${name}`] ?? null;
  const reqs = new Map();
  for (const [k, v] of Object.entries(DEVIATIONS)) if (k.startsWith(`${id}/${name}#`)) reqs.set(k.slice(id.length + name.length + 2), v);
  return { whole, reqs };
}
const ADAPTERS = path.join(ROOT, 'oracle/adapters');

// IDs whose inventory status is "later" are skipped.
function laterIds() {
  const later = new Set();
  const dir = path.join(ROOT, 'docs/inventory');
  if (!existsSync(dir)) return later;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    for (const line of readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      const cells = line.split('|').map((c) => c.trim());
      if (cells.length > 4 && /^[A-Z]+-\d+$/.test(cells[1]) && cells[cells.length - 2] === 'later') later.add(cells[1]);
    }
  }
  return later;
}

// per-part notPorted: where the port marked a part, replace the Java part by the marker too (positional)
function maskNotPorted(exp, act) {
  if (isMark(act)) return act;
  if (Array.isArray(exp) && Array.isArray(act)) { for (let i = 0; i < act.length && i < exp.length; i++) exp[i] = maskNotPorted(exp[i], act[i]); }
  else if (exp && act && typeof exp === 'object' && typeof act === 'object' && !Array.isArray(exp) && !Array.isArray(act)) {
    for (const k of Object.keys(act)) if (k in exp) exp[k] = maskNotPorted(exp[k], act[k]);
  }
  return exp;
}

const jsonl = (t) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l));

function errorEnvelope(e) {
  const causes = [];
  for (let c = e.cause; c && causes.length < 20; c = c.cause) causes.push({ class: c.javaClass ?? c.constructor?.name, message: c.message ?? null });
  return { class: e.javaClass ?? e.constructor.name, message: e.message ?? null, causes };
}

function harnessOps() {
  const src = readFileSync(path.join(ROOT, 'oracle/harness/src/ltjs/oracle/Harness.java'), 'utf8');
  return new Set([...src.matchAll(/case "([^"]+)":/g)].map((m) => m[1]));
}

// cli/http: the JS side is oracle/adapters/<kind>.mjs; run(cs, {workDir, port?}) returns the same shape as the Java side.
async function runKindCase(cs, meta, dir) {
  const f = path.join(ADAPTERS, `${cs.kind}.mjs`);
  const ad = existsSync(f) ? await import(f) : { notPorted: true };
  if (ad.notPorted) return { status: 'NOT PORTED', note: `${cs.kind} adapter not ported` };
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-parity-'));
  mkdirSync(path.join(workDir, 'tmp'));
  try {
    const actual = await ad.run(cs, { workDir });
    const ctxE = { workDir: meta.workDir, tmpDir: meta.tmpDir };
    const ctxA = { workDir, tmpDir: path.join(workDir, 'tmp') };
    const cmp = await getComparator(cs.compare ?? cs.kind);
    let diffs;
    if (cs.kind === 'cli') {
      const exp = {
        exitCode: Number(readFileSync(path.join(dir, 'exit.txt'), 'utf8')),
        stdout: readFileSync(path.join(dir, 'stdout.txt'), 'utf8'),
        stderr: readFileSync(path.join(dir, 'stderr.txt'), 'utf8'),
        files: JSON.parse(readFileSync(path.join(dir, 'files.json'), 'utf8')),
      };
      const n = (t, c) => normalize(cs.normalize ?? [], t, c);
      exp.stdout = n(exp.stdout, ctxE); exp.stderr = n(exp.stderr, ctxE);
      actual.stdout = n(actual.stdout, ctxA); actual.stderr = n(actual.stderr, ctxA);
      diffs = cmp(exp, actual, { normalizers: cs.normalize ?? [], streams: cs.streams, ignoreExit: cs.ignoreExit, stripTimestamp: cs.stripTimestamp, stderrExceptionOnly: cs.stderrExceptionOnly, stderrFilter: cs.stderrFilter, listDev006: cs.listDev006, listCut: cs.listCut, args: cs.args, json: (cs.args ?? []).includes('--json') || (cs.args ?? []).includes('-json') });
    } else {
      const exp = JSON.parse(readFileSync(path.join(dir, 'responses.json'), 'utf8'));
      const actualResp = actual.responses ?? actual;
      const dm = devMasks(cs.__id, cs.__name);
      let expResp = exp;
      let actResp = actualResp;
      if (dm.reqs.size && Array.isArray(exp) && Array.isArray(actualResp)) { // drop the deviating responses on both sides
        const drop = new Set([...dm.reqs.keys()].map(Number));
        expResp = exp.filter((_, i) => !drop.has(i));
        actResp = actualResp.filter((_, i) => !drop.has(i));
      }
      diffs = cmp(expResp, actResp, { normalizers: cs.normalize ?? [], ctx: ctxA });
      // captureLog cases (X-LOGS): server log records by message text, layout free (D-045)
      if (cs.captureLog && !dm.reqs.size && existsSync(path.join(dir, 'server.log'))) diffs.push(...compareServerLog(readFileSync(path.join(dir, 'server.log'), 'utf8'), actual.log ?? '', ctxE, cs.dropLogPatterns ?? []));
    }
    return diffs.length ? { status: 'FAIL', diffs } : { status: 'PASS' };
  } catch (e) {
    if (e && e.notPorted === true) return { status: 'NOT PORTED', note: `${cs.kind} not ported` };
    throw e;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

let dev009Exempt = 0;
const partialTotals = { cases: 0, skipped: 0, total: 0 };

async function runCase(id, name) {
  const dir = path.join(GOLDEN, id, name);
  const cs = JSON.parse(readFileSync(path.join(dir, 'case.json'), 'utf8'));
  cs.__id = id; cs.__name = name;
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  if (cs.kind === 'cli' || cs.kind === 'http') return runKindCase(cs, meta, dir);
  if (cs.kind !== 'harness') return { status: 'SKIP', note: `kind ${cs.kind}` };
  const reqs = jsonl(readFileSync(path.join(dir, 'requests.jsonl'), 'utf8'));
  // ops handled by Harness.java's switch; anything else yields its "unknown op" error
  const javaOps = harnessOps();
  const adapters = new Map();
  for (const r of reqs) {
    if (adapters.has(r.op)) continue;
    const f = path.join(ADAPTERS, `${r.op}.mjs`);
    if (existsSync(f)) {
      const mod = await import(f);
      if (typeof mod.beginCase === 'function') mod.beginCase(); // each case file is its own JVM in the oracle
      adapters.set(r.op, mod);
    }
    else if (!javaOps.has(r.op)) adapters.set(r.op, { run: () => { throw Object.assign(new Error(`unknown op: ${r.op}`), { javaClass: 'java.lang.IllegalArgumentException' }); } });
    else adapters.set(r.op, { notPorted: true });
  }
  // fixed clock of the case (Java: libfaketime, case env FAKETIME "@yyyy-MM-dd HH:mm:ss" in Europe/Vienna); read lazily by src/lib/java/clock.js
  const prevClock = process.env.LTJS_FIXED_TIME;
  const ft = cs.env?.FAKETIME;
  if (typeof ft === 'string' && /^@\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(ft)) process.env.LTJS_FIXED_TIME = viennaIso(ft.slice(1));
  else if (cs.clock === 'fixed') process.env.LTJS_FIXED_TIME = viennaIso('2026-03-15 10:00:00');
  try {
    return await runHarnessOps(cs, meta, dir, reqs, adapters);
  } finally {
    if (prevClock === undefined) delete process.env.LTJS_FIXED_TIME; else process.env.LTJS_FIXED_TIME = prevClock;
  }
}

// "yyyy-MM-dd HH:mm:ss" wall time in Europe/Vienna -> ISO instant with the zone offset of that date
function viennaIso(wall) {
  const [d, t] = wall.split(' ');
  const guess = Date.parse(`${d}T${t}Z`);
  const offsetOf = (ms) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Vienna', timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find((x) => x.type === 'timeZoneName').value;
    return Number(p.slice(3).split(':')[0] || 0) * 60;
  };
  return new Date(guess - offsetOf(guess - 3600000) * 60000).toISOString();
}

async function runHarnessOps(cs, meta, dir, reqs, adapters) {
  const actual = [];
  const nonPorted = new Set();
  const partial = { requests: 0, skipped: 0, total: 0 };
  for (const r of reqs) {
    const ad = adapters.get(r.op);
    if (ad.notPorted) { actual.push(null); nonPorted.add(r.id); continue; }
    try {
      const result = await ad.run(r.args ?? {});
      if (result && typeof result === 'object' && result[NP_KEY]) {
        partial.requests++; partial.skipped += result[NP_KEY].skipped; partial.total += result[NP_KEY].total;
        delete result[NP_KEY];
      }
      actual.push({ id: r.id, ok: true, result });
    } catch (e) {
      if (e && e.notPorted === true) { actual.push(null); nonPorted.add(r.id); continue; }
      actual.push({ id: r.id, ok: false, error: errorEnvelope(e) });
    }
  }
  if (nonPorted.size === reqs.length) return { status: 'NOT PORTED', note: `${nonPorted.size}/${reqs.length} requests not ported` };
  const norm = (t) => normalize(cs.normalize ?? [], t, { workDir: meta.workDir, tmpDir: meta.tmpDir });
  const expectedText = norm(readFileSync(path.join(dir, 'responses.jsonl'), 'utf8'));
  // per-request notPorted: drop those requests from both sides, then compare the rest
  const devReqs = devMasks(cs.__id, cs.__name).reqs;
  const expectedLines = jsonl(expectedText).filter((x) => !nonPorted.has(x.id) && !devReqs.has(String(x.id)));
  const actualText = norm(actual.filter(Boolean).map((x) => JSON.stringify(x)).join('\n'));
  const actualLines = jsonl(actualText).filter((x) => !devReqs.has(String(x.id)));
  if (partial.requests) {
    const byId = new Map(actualLines.map((x) => [x.id, x]));
    for (const e of expectedLines) { const a = byId.get(e.id); if (a && a.ok && e.ok) e.result = maskNotPorted(e.result, a.result); }
  }
  const note = [];
  if (nonPorted.size) note.push(`${nonPorted.size}/${reqs.length} requests not ported`);
  if (partial.requests) note.push(`partial: ${partial.skipped}/${partial.total} parts notPorted in ${partial.requests} request(s)`);
  partialTotals.skipped += partial.skipped; partialTotals.total += partial.total; if (partial.requests) partialTotals.cases++;
  // DEV-009: words whose Java suggestions vary between runs (unstable.json): spell result exact, suggestions exempt
  const uf = path.join(dir, 'unstable.json');
  if (existsSync(uf)) {
    const ex = new Map();
    for (const u of JSON.parse(readFileSync(uf, 'utf8')).unstable) (ex.get(u.id) ?? ex.set(u.id, new Set()).get(u.id)).add(u.w);
    let n = 0;
    for (const side of [expectedLines, actualLines]) for (const l of side) {
      const ws = ex.get(l.id);
      if (!ws || !l.ok || !Array.isArray(l.result?.results)) continue;
      for (const e of l.result.results) if (ws.has(e.w)) for (const f of ['suggest', 'suggestions']) if (f in e) { e[f] = 'dev009-exempt'; if (side === expectedLines) n++; }
    }
    dev009Exempt += n;
    if (n) note.push(`${n} dev009-exempt`);
  }
  const cmp = await getComparator(cs.compare ?? 'jsonl');
  const diffs = cmp(expectedLines, actualLines);
  if (diffs.length) return { status: 'FAIL', diffs, note: note.join('; ') };
  if (nonPorted.size) return { status: 'NOT PORTED', note: note.join('; ') };
  return { status: 'PASS', note: note.join('; ') };
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const all = existsSync(GOLDEN) ? readdirSync(GOLDEN).filter((d) => !d.startsWith('.')).sort() : [];
const later = laterIds();
const DIFF_LINES = Number(process.env.LTJS_DIFF_LINES ?? 40); // LTJS_DIFF_LINES: more diff lines per case
const counts = { PASS: 0, FAIL: 0, SKIP: 0, 'NOT PORTED': 0, DEV: 0 };
const rows = [];
for (const id of ids.length ? ids : all) {
  const cases = existsSync(path.join(GOLDEN, id)) ? readdirSync(path.join(GOLDEN, id)).filter((c) => !c.startsWith('.')).sort() : [];
  for (const c of cases) {
    if (process.env.LTJS_CASE && !new RegExp(process.env.LTJS_CASE).test(c)) continue; // optional case-name filter (regex)
    let r;
    if (later.has(id)) r = { status: 'SKIP', note: 'inventory status later' };
    else {
      try { r = await runCase(id, c); } catch (e) { r = { status: 'FAIL', diffs: [`error: ${e.message}`] }; }
    }
    if (r.status === 'FAIL' && devMasks(id, c).whole) r = { status: 'DEV', note: devMasks(id, c).whole }; // D-056 documented deviation
    else if (r.status === 'PASS' && devMasks(id, c).reqs.size) r = { ...r, status: 'DEV', note: [...new Set(devMasks(id, c).reqs.values())].join(',') };
    counts[r.status]++;
    rows.push(`${r.status.padEnd(10)} ${id}/${c}${r.note ? `  (${r.note})` : ''}`);
    if (r.diffs) rows.push(...r.diffs.slice(0, DIFF_LINES).join('\n').split('\n').slice(0, DIFF_LINES).map((l) => `    ${l}`));
  }
}
console.log(rows.join('\n'));
if (partialTotals.cases) console.log(`partial: ${partialTotals.cases} case(s) compared with notPorted parts, ${partialTotals.skipped}/${partialTotals.total} parts skipped`);
if (dev009Exempt) console.log(`dev009-exempt: ${dev009Exempt} word suggestion list(s) not compared (DEV-009)`);
console.log(`parity: ${counts.PASS} pass, ${counts.FAIL} fail, ${counts.SKIP} skip, ${counts.DEV} dev, ${counts['NOT PORTED']} not ported`);
process.exit(counts.FAIL ? 1 : 0);
