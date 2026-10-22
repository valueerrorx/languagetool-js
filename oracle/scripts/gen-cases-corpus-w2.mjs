// Authors oracle/cases/X-CORPUS-W2 (W42): all corpora x variants x {harness check, /v2/check, CLI --json} x {DEFAULT, PICKY}. Inputs only. Docs: docs/review/W42-corpus-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-CORPUS-W2');
const CHUNK = 14;
const VARIANTS = { it: ['it'], pl: ['pl-PL'], sl: ['sl-SI'], sk: ['sk-SK'], ru: ['ru-RU'], es: ['es', 'es-AR'] };
const LEVELS = ['DEFAULT', 'PICKY'];
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const w = (name, o) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify(o) + '\n');
let n = 0;
for (const [dir, variants] of Object.entries(VARIANTS)) {
  const paras = readFileSync(path.join(ROOT, 'oracle/corpus', dir, 'corpus.txt'), 'utf8').split('\n\n').map((p) => p.trim()).filter(Boolean);
  for (const v of variants) for (const level of LEVELS) {
    const lv = level.toLowerCase();
    for (let i = 0, k = 0; i < paras.length; i += CHUNK, k++) {
      const part = paras.slice(i, i + CHUNK);
      const desc = `corpus ${dir} ${v} ${level} paragraphs ${i}..${i + part.length - 1}`;
      w(`h-${v}-${lv}-${k}`, { kind: 'harness', clock: 'fixed', description: `harness check ${desc}`, normalize: ['paths'], compare: 'check', ops: part.map((text) => ({ op: 'check', args: { lang: v, text, level } })) });
      w(`http-${v}-${lv}-${k}`, { kind: 'http', clock: 'fixed', description: `/v2/check ${desc}`, compare: 'api', normalize: ['buildDate', 'commit'], serverArgs: [], requests: part.map((text) => ({ method: 'POST', path: '/v2/check', params: { language: v, text, level: lv } })) });
      w(`cli-${v}-${lv}-${k}`, { kind: 'cli', clock: 'fixed', compare: 'cli', normalize: ['buildDate', 'commit', 'stackFrames', 'paths'], description: `CLI --json ${desc}`, args: ['-l', v, '--json', '--level', level, '-'], stdin: part.join('\n\n') + '\n' });
      n += 3;
    }
  }
}
console.log(`X-CORPUS-W2: ${n} case files`);
