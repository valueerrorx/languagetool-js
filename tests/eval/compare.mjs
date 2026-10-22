// Compares the raw matches of two eval result files (e.g. java vs js) exactly; exit 1 on any difference.
// Usage: node tests/eval/compare.mjs tests/eval/results/de-DE-java-default.json tests/eval/results/de-DE-js-default.json
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
let diffs = 0;
for (const id of new Set([...Object.keys(a.raw), ...Object.keys(b.raw)])) {
  const x = (a.raw[id] ?? []).map((m) => JSON.stringify(m));
  const y = (b.raw[id] ?? []).map((m) => JSON.stringify(m));
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    diffs++;
    console.log(`${id} #${i}\n  ${a.engine}: ${x[i] ?? '-'}\n  ${b.engine}: ${y[i] ?? '-'}`);
  }
}
const total = Object.values(a.raw).reduce((n, m) => n + m.length, 0);
console.log(`${a.engine}/${a.level} vs ${b.engine}/${b.level}: ${total} matches, ${diffs} differences`);
process.exit(diffs ? 1 : 0);
