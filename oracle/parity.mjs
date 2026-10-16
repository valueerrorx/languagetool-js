// npm run parity [-- <ID>...]   (docs/ORACLE.md section 9)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from './lib/env.mjs';
import { normalize } from './lib/normalizers.mjs';
import { getComparator } from './comparators/index.mjs';

const GOLDEN = path.join(ROOT, 'tests/golden');
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
  if (cs.kind === 'cli' && cs.portLater) return { status: 'SKIP', note: 'portLater (needs rules/language not ported)' };
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
      diffs = cmp(exp, actual, { normalizers: cs.normalize ?? [], streams: cs.streams, ignoreExit: cs.ignoreExit, stripTimestamp: cs.stripTimestamp, stderrExceptionOnly: cs.stderrExceptionOnly, listDev006: cs.listDev006, listCut: cs.listCut, json: (cs.args ?? []).includes('--json') || (cs.args ?? []).includes('-json') });
    } else {
      const exp = JSON.parse(readFileSync(path.join(dir, 'responses.json'), 'utf8'));
      diffs = cmp(exp, actual.responses ?? actual, { normalizers: cs.normalize ?? [], ctx: ctxA });
    }
    return diffs.length ? { status: 'FAIL', diffs } : { status: 'PASS' };
  } catch (e) {
    if (e && e.notPorted === true) return { status: 'NOT PORTED', note: `${cs.kind} not ported` };
    throw e;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function runCase(id, name) {
  const dir = path.join(GOLDEN, id, name);
  const cs = JSON.parse(readFileSync(path.join(dir, 'case.json'), 'utf8'));
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
  const actual = [];
  const nonPorted = new Set();
  for (const r of reqs) {
    const ad = adapters.get(r.op);
    if (ad.notPorted) { actual.push(null); nonPorted.add(r.id); continue; }
    try {
      actual.push({ id: r.id, ok: true, result: await ad.run(r.args ?? {}) });
    } catch (e) {
      if (e && e.notPorted === true) { actual.push(null); nonPorted.add(r.id); continue; }
      actual.push({ id: r.id, ok: false, error: errorEnvelope(e) });
    }
  }
  if (nonPorted.size === reqs.length) return { status: 'NOT PORTED', note: `${nonPorted.size}/${reqs.length} requests not ported` };
  const norm = (t) => normalize(cs.normalize ?? [], t, { workDir: meta.workDir, tmpDir: meta.tmpDir });
  const expectedText = norm(readFileSync(path.join(dir, 'responses.jsonl'), 'utf8'));
  // per-request notPorted: drop those requests from both sides, then compare the rest
  const expectedLines = jsonl(expectedText).filter((x) => !nonPorted.has(x.id));
  const actualText = norm(actual.filter(Boolean).map((x) => JSON.stringify(x)).join('\n'));
  const cmp = await getComparator(cs.compare ?? 'jsonl');
  const diffs = cmp(expectedLines, jsonl(actualText));
  if (diffs.length) return { status: 'FAIL', diffs };
  return nonPorted.size ? { status: 'NOT PORTED', note: `${nonPorted.size}/${reqs.length} requests not ported` } : { status: 'PASS' };
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const all = existsSync(GOLDEN) ? readdirSync(GOLDEN).filter((d) => !d.startsWith('.')).sort() : [];
const later = laterIds();
const counts = { PASS: 0, FAIL: 0, SKIP: 0, 'NOT PORTED': 0 };
const rows = [];
for (const id of ids.length ? ids : all) {
  const cases = existsSync(path.join(GOLDEN, id)) ? readdirSync(path.join(GOLDEN, id)).filter((c) => !c.startsWith('.')).sort() : [];
  for (const c of cases) {
    let r;
    if (later.has(id)) r = { status: 'SKIP', note: 'inventory status later' };
    else {
      try { r = await runCase(id, c); } catch (e) { r = { status: 'FAIL', diffs: [`error: ${e.message}`] }; }
    }
    counts[r.status]++;
    rows.push(`${r.status.padEnd(10)} ${id}/${c}${r.note ? `  (${r.note})` : ''}`);
    if (r.diffs) rows.push(...r.diffs.slice(0, 40).join('\n').split('\n').slice(0, 40).map((l) => `    ${l}`));
  }
}
console.log(rows.join('\n'));
console.log(`parity: ${counts.PASS} pass, ${counts.FAIL} fail, ${counts.SKIP} skip, ${counts['NOT PORTED']} not ported`);
process.exit(counts.FAIL ? 1 : 0);
