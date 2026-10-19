// Generates oracle/cases/X-OPENNLP and X-ENCHUNK (inputs only; expectations come from the Java run).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let seed = 44;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const text = readFileSync(path.join(ROOT, 'oracle/corpus/en/corpus.txt'), 'utf8').replace(/\s+/g, ' ');
const all = text.split(/(?<=[.!?”"])\s+(?=[A-Z“"])/).map((s) => s.trim()).filter((s) => s.length > 3);
const picked = [];
const used = new Set();
while (picked.length < 300 && picked.length < all.length) { const i = Math.floor(rnd() * all.length); if (!used.has(i)) { used.add(i); picked.push(all[i]); } }
const edge = ['', ' ', '.', '!!!', '...', '?', ',', '“”', '()', 'a', 'I', 'The', '1', '3.14', '1,000,000', '$5.99 for 10% off.', 'Dr. Smith, Ph.D., lives at 12 Main St. in Paris.',
  'e-mail: foo@bar.com or http://example.org/a?b=c#d', "Don't, can't, won't, I'm, he'll, they've, it's.", 'I’m sure it’s fine; they’ll come.', 'Über Müller’s Straße naïve café résumé.',
  'Das ist ein deutscher Satz mit Umlauten äöüß.', 'Emoji 😀 and astral 𝒳 characters.', 'x﻿y z.', 'tab\tseparated\tvalues', 'line one\nline two', 'Line.\r\nLine2.',
  'well-known state-of-the-art, e.g. foo-bar', 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', 'the quick brown fox jumps over the lazy dog', '2026-03-15 at 10:30 a.m.', '12345678901234567890',
  'a b c d e f g h i j k l m n o p q r s t u v w x y z', 'He said, "Go away!" and left.', '--- ***  ___ ===', '1) first 2) second', 'U.S.A. U.K. etc.', ' nbsp here .',
  'A very long sentence '.repeat(120) + 'ends here.', 'word'.repeat(800), ('The old man and the sea, ').repeat(60) + 'finished.', 'ǅ ǆ İstanbul ß ẞ', 'Chinese 中文 and Arabic العربية text.'];
const out = (id, name, c) => { const d = path.join(ROOT, 'oracle/cases', id); mkdirSync(d, { recursive: true }); writeFileSync(path.join(d, name + '.json'), JSON.stringify(c)); };
const base = (description, ops, compare = 'jsonl') => ({ kind: 'harness', clock: 'fixed', description, normalize: [], compare, ops });
const chunks = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };
for (const id of ['X-OPENNLP', 'X-ENCHUNK']) rmSync(path.join(ROOT, 'oracle/cases', id), { recursive: true, force: true });

// X-OPENNLP
out('X-OPENNLP', 'model', base('OpenNLP model container contents (EN-0029, EN-0204..0206)', [{ op: 'opennlp-model', args: {} }]));
chunks(picked, 30).forEach((c, i) => out('X-OPENNLP', `run-corpus-${String(i).padStart(2, '0')}`, base(`TokenizerME/POSTaggerME/ChunkerME on corpus sentences (EN-0031..0034)`, [{ op: 'opennlp-run', args: { texts: c } }])));
chunks(edge, 12).forEach((c, i) => out('X-OPENNLP', `run-edge-${String(i).padStart(2, '0')}`, base('OpenNLP edge inputs', [{ op: 'opennlp-run', args: { texts: c } }])));
// feature contexts
const words = ['the', 'The', 'of', 'dog', 'running', 'quickly', 'Paris', 'U.S.', '3.14', '1,000', 'well-known', 'unseenwordxyz', 'ä', ''];
const posCtx = [];
for (const w of words) { posCtx.push([`w=${w}`, 'default']); posCtx.push([`w=${w}`, `suf=${w.slice(-1)}`, `suf=${w.slice(-2)}`, `pre=${w.slice(0, 2)}`, 'p=DT', 't=DT', 'pp=NN', 't2=NN,DT']); }
posCtx.push([], ['default'], ['*SB*'], ['unknown=feature'], ['w=the', 'w=the', 'w=the'], ['h', 'c', 'd']);
out('X-OPENNLP', 'eval-pos', base('GISModel#eval POS maxent contexts, double bits (EN-0030)', [{ op: 'opennlp-eval', args: { model: 'pos', contexts: posCtx } }]));
const tokCtx = [['p=a', 's=b', 'x=c'], ['p=.', 's=c', 'x=m'], ['p=,', 'x=,'], [], ['p=', 's='], ['pn1=', 'pn2=', 'x=-', 'p=e', 's=f'], ['x=.', 'p=U', 's=S'], ['x=\'', 'p=n', 's=t'], ['x=$', 's=5'], ['unknown']];
for (const ch of ['.', ',', '!', '?', ':', ';', '-', '/', '(', ')', '"', "'", '%', '$', '@', '&', '#', '*', '+', '=']) tokCtx.push([`p=a`, `s=b`, `x=${ch}`], [`p=${ch}`, `x=${ch}`]);
out('X-OPENNLP', 'eval-token', base('GISModel#eval tokenizer contexts', [{ op: 'opennlp-eval', args: { model: 'token', contexts: tokCtx } }]));
const chCtx = [];
for (const [w, t] of [['the', 'DT'], ['dog', 'NN'], ['runs', 'VBZ'], ['quickly', 'RB'], ['in', 'IN'], ['.', '.'], ['and', 'CC'], ['big', 'JJ'], ['Paris', 'NNP']]) chCtx.push([`w0=${w}`, `t0=${t}`, `p_1=O`, `t-1=NN`, `w1=of`, `t1=IN`, 'default'], [`w0=${w}`, `t0=${t}`, `t0t1=${t}|NN`, 'p_1=B-NP', 'p_2=O']);
chCtx.push([], ['default'], ['w0=bos', 't0=bos'], ['zzz']);
out('X-OPENNLP', 'eval-chunk', base('GISModel#eval chunker contexts', [{ op: 'opennlp-eval', args: { model: 'chunk', contexts: chCtx } }]));
// X-MATH
const specials = ['0.0', '-0.0', '1.0', '-1.0', '2.0', '0.5', '709.0', '709.78', '709.782712893384', '710.0', '-745.0', '-745.13', '-746.0', '-708.0', '1.0E-300', '4.9E-324', '-4.9E-324', '1.7976931348623157E308', 'NaN', 'Infinity', '-Infinity', '2.718281828459045', '10.0', '100.0', '-100.0', '1.0E-10', '0.6931471805599453', '1.1102230246251565E-16', '-1.1102230246251565E-16'];
const rv = (lo, hi, n) => Array.from({ length: n }, () => String(lo + rnd() * (hi - lo)));
const mv = [...specials, ...rv(-50, 50, 150), ...rv(-1, 1, 100), ...rv(-745, 710, 80), ...rv(-1e-5, 1e-5, 20)];
for (const fn of ['exp', 'log', 'sqrt', 'pow2', 'log10', 'expm1']) {
  const vals = fn === 'log' || fn === 'log10' || fn === 'sqrt' ? mv.map((v) => (v.startsWith('-') && rnd() < 0.7 ? v.slice(1) : v)) : mv;
  out('X-OPENNLP', `math-${fn}`, base(`StrictMath.${fn} (X-MATH)`, [{ op: 'opennlp-math', args: { fn, values: vals } }]));
}
out('X-OPENNLP', 'math-errors', base('StrictMath unsupported fn / bad number', [{ op: 'opennlp-math', args: { fn: 'bogus', values: ['1.0'] } }]));

// X-ENCHUNK
chunks(picked, 30).forEach((c, i) => out('X-ENCHUNK', `enchunker-corpus-${String(i).padStart(2, '0')}`, base('EnglishChunker + EnglishChunkFilter on raw analyzed sentences (EN-0026, EN-0027)', [{ op: 'opennlp-enchunker', args: { texts: c } }])));
chunks(edge, 12).forEach((c, i) => out('X-ENCHUNK', `enchunker-edge-${String(i).padStart(2, '0')}`, base('EnglishChunker edge inputs', [{ op: 'opennlp-enchunker', args: { texts: c } }])));
chunks(picked, 20).forEach((c, i) => out('X-ENCHUNK', `analyze-corpus-${String(i).padStart(2, '0')}`, base('analyze-raw en-US: raw/disambiguated/pre-disambiguation dumps with chunk tags (EN-0025, EN-0160, EN-0173)', [{ op: 'analyze-raw', args: { lang: 'en-US', texts: c } }], 'check-pipe')));
chunks(edge, 12).forEach((c, i) => out('X-ENCHUNK', `analyze-edge-${String(i).padStart(2, '0')}`, base('analyze-raw en-US edge inputs', [{ op: 'analyze-raw', args: { lang: 'en-US', texts: c } }], 'check-pipe')));
// multiword-focused sentences from resource/en/multiwords.txt
const mw = readFileSync(path.join(ROOT, 'oracle/java-src/languagetool-language-modules/en/src/main/resources/org/languagetool/resource/en/multiwords.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]).filter((x) => x && x.includes(' '));
const mws = []; const step = Math.max(1, Math.floor(mw.length / 120));
for (let i = 0; i < mw.length && mws.length < 120; i += step) mws.push(`We met ${mw[i]} yesterday. ${mw[i]} is here.`);
chunks(mws, 20).forEach((c, i) => out('X-ENCHUNK', `analyze-multiword-${String(i).padStart(2, '0')}`, base('analyze-raw en-US multiword entries of multiwords.txt (EN-0173)', [{ op: 'analyze-raw', args: { lang: 'en-US', texts: c } }], 'check-pipe')));
for (const v of ['en-GB', 'en-CA', 'en-AU']) out('X-ENCHUNK', `analyze-variant-${v}`, base(`analyze-raw ${v}`, [{ op: 'analyze-raw', args: { lang: v, texts: picked.slice(0, 20) } }], 'check-pipe'));
console.log('ok', picked.length, mws.length);
