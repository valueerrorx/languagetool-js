// Compiles tests/eval/<lang>/src/corpus-*.txt (markup) into one gold JSON per text and validates the offsets.
// Usage: node tests/eval/build-corpus.mjs [--lang de] [--dir de-heldout] [--check]   (--check: validate existing JSON only; --dir: corpus dir under tests/eval, default <lang>)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'de';
const checkOnly = args.includes('--check');
const DIR = path.join(HERE, args.includes('--dir') ? args[args.indexOf('--dir') + 1] : lang);
const SRC = path.join(DIR, 'src');

const ERR_TYPES = { d: 'das_dass', cm: 'comma_missing', cs: 'comma_superfluous', o: 'other' };
const NEG_TYPES = { d: 'das_dass', c: 'comma', opt: 'comma_optional' };
const TOKEN = /\{\{([^{}]*?)=>([^{}]*?)\|(d|cm|cs|o)\}\}|\[\[([^[\]]*?)\|(d|c|opt)\]\]/g;

// Parses one marked-up text into plain text plus gold annotations (offsets in UTF-16 code units).
export function compile(id, genre, marked) {
  let text = '';
  let last = 0;
  const errors = [];
  const negatives = [];
  const optional = [];
  for (const m of marked.matchAll(TOKEN)) {
    text += marked.slice(last, m.index);
    last = m.index + m[0].length;
    const offset = text.length;
    if (m[1] !== undefined) {
      const [correction, ...alternatives] = m[2].split(';;');
      const e = { offset, length: m[1].length, original: m[1], correction, type: ERR_TYPES[m[3]] };
      if (alternatives.length) e.alternatives = alternatives;
      errors.push(e);
      text += m[1];
    } else {
      const t = NEG_TYPES[m[5]];
      (t === 'comma_optional' ? optional : negatives).push({ offset, length: m[4].length, original: m[4], type: t });
      text += m[4];
    }
  }
  text += marked.slice(last);
  return { id, genre, control: /\(.*control.*\)/.test(genre), text, errors, negatives, optional };
}

// Validates one gold record; returns a list of problems.
export function validate(g) {
  const problems = [];
  const spans = [...g.errors, ...g.negatives, ...g.optional];
  for (const s of spans) {
    if (g.text.substr(s.offset, s.length) !== s.original) problems.push(`${g.id}: offset ${s.offset} '${g.text.substr(s.offset, s.length)}' != '${s.original}'`);
  }
  const sorted = spans.map((s) => [s.offset, s.offset + s.length]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) if (sorted[i][0] < sorted[i - 1][1]) problems.push(`${g.id}: overlapping spans at ${sorted[i][0]}`);
  if (/\{\{|\}\}|\[\[|\]\]|=>/.test(g.text)) problems.push(`${g.id}: leftover markup`);
  const words = g.text.split(/\s+/).filter(Boolean).length;
  if (words < 80 || words > 250) problems.push(`${g.id}: ${words} words (want 80-250)`);
  if (g.control && g.errors.length) problems.push(`${g.id}: control text has errors`);
  for (const e of g.errors) {
    const diff = e.original !== e.correction;
    if (!diff) problems.push(`${g.id}: error at ${e.offset} has no change`);
    if (e.type === 'comma_missing' && e.correction.replace(/,/g, '') !== e.original.replace(/,/g, '')) problems.push(`${g.id}: comma_missing at ${e.offset} changes more than commas`);
    if (e.type === 'comma_superfluous' && e.original.replace(/,/g, '').replace(/\s+/g, ' ') !== e.correction.replace(/\s+/g, ' ')) problems.push(`${g.id}: comma_superfluous at ${e.offset} changes more than commas`);
  }
  return problems;
}

// Corrected text: all gold errors applied (first correction).
export function corrected(g) {
  let t = g.text;
  for (const e of [...g.errors].sort((a, b) => b.offset - a.offset)) t = t.slice(0, e.offset) + e.correction + t.slice(e.offset + e.length);
  return t;
}

function parseSource(content) {
  const out = [];
  let cur = null;
  for (const line of content.split('\n')) {
    const h = /^### (\S+) \| (.+)$/.exec(line);
    if (h) { cur = { id: h[1], genre: h[2].trim(), lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((c) => ({ id: c.id, genre: c.genre, marked: c.lines.join('\n').replace(/^\n+|\n+$/g, '') }));
}

let records = [];
if (checkOnly) {
  records = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(path.join(DIR, f), 'utf8')));
} else {
  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.txt')).sort()) {
    for (const t of parseSource(readFileSync(path.join(SRC, f), 'utf8'))) records.push(compile(t.id, t.genre, t.marked));
  }
}
const ids = new Set();
const problems = [];
for (const g of records) {
  if (ids.has(g.id)) problems.push(`${g.id}: duplicate id`);
  ids.add(g.id);
  problems.push(...validate(g));
}
if (!checkOnly) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  for (const g of records) writeFileSync(path.join(DIR, `${g.id}.json`), `${JSON.stringify(g, null, 2)}\n`);
}
const count = (pred) => records.reduce((n, g) => n + pred(g), 0);
const stats = {
  texts: records.length,
  controls: count((g) => g.control ? 1 : 0),
  words: count((g) => g.text.split(/\s+/).filter(Boolean).length),
  errors: Object.fromEntries(Object.values(ERR_TYPES).map((t) => [t, count((g) => g.errors.filter((e) => e.type === t).length)])),
  negatives: Object.fromEntries(['das_dass', 'comma'].map((t) => [t, count((g) => g.negatives.filter((e) => e.type === t).length)])),
  optional: count((g) => g.optional.length),
};
console.log(JSON.stringify(stats));
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
