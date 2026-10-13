// Per-language case files (inputs only) for the content oracle (docs/ORACLE.md 4).
//   node oracle/scripts/gen-corpus.mjs --lang de --code de-DE --id DE-CORPUS [--dry] [--rules-per-case 150] [--paras-per-case 25]
// Writes oracle/cases/<ID>/{rule-examples-NNN,disambiguation-examples-NNN,corpus-check-NNN,corpus-check-picky-NNN,corpus-http-NNN}.json.
// Not run for the full corpora yet; fixtures come from `npm run oracle -- <ID>`.
// JUnit-derived texts (ORACLE.md 4.3) are not harvested here: deferred to the per-language steps.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const lang = arg('lang');
const code = arg('code', lang);
const id = arg('id');
const dry = process.argv.includes('--dry');
const rulesPerCase = Number(arg('rules-per-case', 150));
const parasPerCase = Number(arg('paras-per-case', 25));
if (!lang || !id) { console.error('usage: gen-corpus.mjs --lang <corpus dir> [--code <lt code>] --id <ID> [--dry]'); process.exit(2); }

preflight();
const probe = await runHarness({
  clock: 'fixed',
  ops: [{ op: 'rules-list', args: { lang: code } }, { op: 'disambiguation-examples', args: { lang: code.split('-')[0], offset: 0, limit: 0 } }],
});
const [rl, de] = probe.responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rulesWithExamples = rl.result.rules.filter((r) => r.examples.some((n) => n > 0)).length;
const disRules = de.ok ? de.result.rules : 0;

const cases = {};
const chunk = (prefix, total, size, mk) => {
  for (let i = 0, n = 0; i < total; i += size, n++) cases[`${prefix}-${String(n).padStart(3, '0')}`] = mk(i, size);
};
const base = { kind: 'harness', clock: 'fixed', normalize: [] };
chunk('rule-examples', rulesWithExamples, rulesPerCase, (offset, limit) => ({ ...base, compare: 'rule-examples', description: `rule examples ${code} rules ${offset}..${offset + limit - 1}`, ops: [{ op: 'rule-examples', args: { lang: code, offset, limit } }] }));
chunk('disambiguation-examples', disRules, rulesPerCase * 4, (offset, limit) => ({ ...base, compare: 'disambiguation-examples', description: `disambiguation examples ${code} rules ${offset}..`, ops: [{ op: 'disambiguation-examples', args: { lang: code.split('-')[0], offset, limit } }] }));

const corpusFile = path.join(ROOT, 'oracle/corpus', lang, 'corpus.txt');
const paras = existsSync(corpusFile) ? readFileSync(corpusFile, 'utf8').split('\n\n').map((p) => p.trim()).filter(Boolean) : [];
chunk('corpus-check', paras.length, parasPerCase, (i, n) => ({ ...base, compare: 'check', description: `corpus ${lang} paragraphs ${i}..`, ops: paras.slice(i, i + n).map((text) => ({ op: 'check', args: { lang: code, text } })) }));
chunk('corpus-check-picky', paras.length, parasPerCase, (i, n) => ({ ...base, compare: 'check', description: `corpus ${lang} picky paragraphs ${i}..`, ops: paras.slice(i, i + n).map((text) => ({ op: 'check', args: { lang: code, text, level: 'PICKY' } })) }));
chunk('corpus-http', paras.length, parasPerCase, (i, n) => ({
  kind: 'http', clock: 'fixed', compare: 'api', normalize: ['buildDate', 'commit'], serverArgs: [], description: `corpus ${lang} /v2/check paragraphs ${i}..`,
  requests: paras.slice(i, i + n).map((text) => ({ method: 'POST', path: '/v2/check', params: { language: code, text } })),
}));

console.log(`${id}: ${Object.keys(cases).length} case files (rules with examples ${rulesWithExamples}, disambiguation rules ${disRules}, paragraphs ${paras.length})`);
if (!dry) {
  const dir = path.join(ROOT, 'oracle/cases', id);
  mkdirSync(dir, { recursive: true });
  for (const [name, o] of Object.entries(cases)) writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(o, null, 2) + '\n');
}
