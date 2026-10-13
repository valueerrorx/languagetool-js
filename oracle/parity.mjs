// npm run parity [-- <ID>...]   (docs/ORACLE.md section 9)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  for (let c = e.cause; c && causes.length < 20; c = c.cause) causes.push({ class: c.constructor?.name, message: c.message ?? null });
  return { class: e.javaClass ?? e.constructor.name, message: e.message ?? null, causes };
}

async function runCase(id, name) {
  const dir = path.join(GOLDEN, id, name);
  const cs = JSON.parse(readFileSync(path.join(dir, 'case.json'), 'utf8'));
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  if (cs.kind !== 'harness') return { status: 'SKIP', note: `kind ${cs.kind}` };
  const reqs = jsonl(readFileSync(path.join(dir, 'requests.jsonl'), 'utf8'));
  const adapters = new Map();
  for (const r of reqs) {
    if (adapters.has(r.op)) continue;
    const f = path.join(ADAPTERS, `${r.op}.mjs`);
    adapters.set(r.op, existsSync(f) ? await import(f) : { notPorted: true });
  }
  if ([...adapters.values()].some((a) => a.notPorted)) return { status: 'NOT PORTED' };
  const actual = [];
  for (const r of reqs) {
    try {
      actual.push({ id: r.id, ok: true, result: await adapters.get(r.op).run(r.args ?? {}) });
    } catch (e) {
      actual.push({ id: r.id, ok: false, error: errorEnvelope(e) });
    }
  }
  const norm = (t) => normalize(cs.normalize ?? [], t, { workDir: meta.workDir, tmpDir: meta.tmpDir });
  const expectedText = norm(readFileSync(path.join(dir, 'responses.jsonl'), 'utf8'));
  const actualText = norm(actual.map((x) => JSON.stringify(x)).join('\n'));
  const cmp = await getComparator(cs.compare ?? 'jsonl');
  const diffs = cmp(jsonl(expectedText), jsonl(actualText));
  return diffs.length ? { status: 'FAIL', diffs } : { status: 'PASS' };
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
