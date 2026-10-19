// Runs X-HUNSPELL harness cases N times against Java, writes tests/golden/X-HUNSPELL/<case>/unstable.json (DEV-009).
// usage: node oracle/tools/hs-stability.mjs [runs=5]   (golden responses.jsonl counts as an additional run)
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const RUNS = Number(process.argv[2] ?? 5);
const dir = path.join(ROOT, 'tests/golden/X-HUNSPELL');
const SUGG = new Set(['suggest', 'suggestions']);
preflight();

// collect differing leaf paths; returns paths of differing values
function diff(a, b, p, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diff(a[k], b[k], [...p, k], out);
  } else out.push(p);
}

const cases = readdirSync(dir).filter((c) => !c.startsWith('.') && existsSync(path.join(dir, c, 'case.json')))
  .filter((c) => JSON.parse(readFileSync(path.join(dir, c, 'case.json'), 'utf8')).kind === 'harness');
const summary = {};
for (const c of cases) {
  const cs = JSON.parse(readFileSync(path.join(dir, c, 'case.json'), 'utf8'));
  const runs = [readFileSync(path.join(dir, c, 'responses.jsonl'), 'utf8')];
  for (let i = 0; i < RUNS; i++) runs.push((await runHarness(cs)).responses);
  const parsed = runs.map((t) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l)));
  const unstable = {}; const other = [];
  for (let r = 1; r < parsed.length; r++) {
    parsed[0].forEach((e, i) => {
      const out = []; diff(e, parsed[r][i], [], out);
      for (const p of out) {
        // path: result.results.<idx>.<field>[...]
        const ri = p.indexOf('results');
        const field = p[ri + 2];
        if (p[0] === 'result' && ri === 1 && SUGG.has(field)) {
          const w = e.result.results[p[2]].w;
          (unstable[e.id] ??= {})[w] = 1;
        } else other.push(`${e.id}:${p.join('.')}`);
      }
    });
  }
  const keys = Object.entries(unstable).flatMap(([id, ws]) => Object.keys(ws).map((w) => ({ id: Number(id), w })));
  writeFileSync(path.join(dir, c, 'unstable.json'), JSON.stringify({ runs: runs.length, unstable: keys, otherDiffs: [...new Set(other)] }, null, 1) + '\n');
  summary[c] = { unstable: keys.length, other: new Set(other).size };
  console.log(c, summary[c]);
}
