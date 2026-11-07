// Error suite: texts with deliberately placed, annotated errors; reports what LanguageTool finds and compares with a baseline.
// Usage: node tests/eval/suite/run.mjs [--lang de|en] [--engine js|java] [--ltjs off] [--level picky] [--type T[,T]]
//        [--update-baseline] [--verbose] [--port N]
//   JS runs in-process (src/index.js check()), Java through its HTTP server (tests/eval/run.mjs startServer).
//   Each text is checked twice: as written (detection of the annotated errors) and corrected (every match is a false alarm).
//   Exit 1 on regressions against tests/eval/suite/baseline/<config>.json (error found before and now worse, or a new false alarm).
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../run.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const TOKEN = /\{\{([^{}]*?)=>([^{}]*?)\|([a-z_]+)\}\}/g;
export const TYPES = {
  de: ['kongruenz', 'kasus', 'subjekt_verb', 'verbform', 'pronomen', 'vergleich', 'verwechslung', 'gross_klein', 'getrennt_zusammen',
    'rechtschreibung', 'wiederholung', 'ausdruck', 'das_dass', 'komma'],
  en: ['agreement', 'verb_form', 'pronoun', 'confusion', 'article', 'comparison', 'preposition', 'capitalization', 'spelling', 'word_choice',
    'repetition'],
};
// detection levels, best first: the suggestion gives the correction, a grammar/style rule flags the spot, only the speller flags it, nothing
export const LEVELS = ['exact', 'flagged', 'speller', 'missed'];

function parseArgs(argv) {
  const o = { lang: 'de', engine: 'js', ltjs: true, level: null, types: null, update: false, verbose: false, port: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') o.lang = argv[++i];
    else if (a === '--engine') o.engine = argv[++i];
    else if (a === '--ltjs') o.ltjs = argv[++i] !== 'off';
    else if (a === '--level') o.level = argv[++i];
    else if (a === '--type') o.types = argv[++i].split(',').filter(Boolean);
    else if (a === '--update-baseline') o.update = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--port') o.port = Number(argv[++i]);
    else throw new Error(`unknown argument ${a}`);
  }
  if (!TYPES[o.lang]) throw new Error('--lang de|en');
  if (o.engine !== 'js' && o.engine !== 'java') throw new Error('--engine js|java');
  o.port ??= o.engine === 'java' ? 19872 : 19873;
  o.config = `${o.lang}-${o.engine}${o.engine === 'js' && !o.ltjs ? '-noltjs' : ''}${o.level ? `-${o.level}` : ''}`;
  return o;
}

// Parses one marked-up text into plain text plus its errors (offsets in UTF-16 code units).
export function compile(id, lang, genre, marked) {
  let text = '';
  let last = 0;
  const errors = [];
  const seen = new Map();
  for (const m of marked.matchAll(TOKEN)) {
    text += marked.slice(last, m.index);
    last = m.index + m[0].length;
    const [correction, ...alternatives] = m[2].split(';;');
    const key = `${id}:${m[1]}=>${correction}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    errors.push({ key: n > 1 ? `${key}#${n}` : key, offset: text.length, length: m[1].length, original: m[1], correction, alternatives, type: m[3] });
    text += m[1];
  }
  text += marked.slice(last);
  return { id, lang, genre, text, errors };
}

// Text with all errors replaced by their (first) correction.
export function corrected(t) {
  let s = t.text;
  for (const e of [...t.errors].sort((a, b) => b.offset - a.offset)) s = s.slice(0, e.offset) + e.correction + s.slice(e.offset + e.length);
  return s;
}

// Reads <lang>/*.txt; throws on markup problems.
export function loadTexts(lang) {
  const dir = path.join(HERE, lang);
  const src = readFileSync(path.join(dir, 'texts.txt'), 'utf8');
  const texts = [];
  let cur = null;
  for (const line of src.split('\n')) {
    const h = /^### (\S+) \| (\S+) \| (.+)$/.exec(line);
    if (h) { cur = { id: h[1], lang: h[2], genre: h[3].trim(), lines: [] }; texts.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  const out = texts.map((c) => compile(c.id, c.lang, c.genre, c.lines.join('\n').replace(/^\n+|\n+$/g, '')));
  const problems = [];
  const ids = new Set();
  for (const t of out) {
    if (ids.has(t.id)) problems.push(`${t.id}: duplicate id`);
    ids.add(t.id);
    if (/\{\{|\}\}|=>/.test(t.text)) problems.push(`${t.id}: leftover markup`);
    for (const e of t.errors) {
      if (!TYPES[lang].includes(e.type)) problems.push(`${e.key}: unknown type ${e.type}`);
      if (e.original === e.correction || e.original === '') problems.push(`${e.key}: empty or unchanged error`);
    }
  }
  if (problems.length) throw new Error(`markup problems:\n${problems.join('\n')}`);
  return out;
}

const shape = (text, ms) => ms.map((m) => ({ ruleId: m.rule.id, category: m.rule.category?.id, offset: m.offset, length: m.length,
  covered: text.substr(m.offset, m.length), message: m.message, replacements: (m.replacements ?? []).slice(0, 5).map((x) => x.value) }));

// JS runs in-process through the public API (less memory than a server); Java through its HTTP server
async function checkText(o, text, language) {
  if (o.engine === 'js') return shape(text, (await o.api.check(text, { language, extraRules: o.ltjs, ...(o.level ? { level: o.level } : {}) })).matches);
  const params = new URLSearchParams({ text, language });
  if (o.level) params.set('level', o.level);
  const post = () => fetch(`http://127.0.0.1:${o.port}/v2/check`, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  // one retry: a reused keep-alive socket can be closed by the server in between
  const r = await post().catch((e) => (e?.cause?.code === 'UND_ERR_SOCKET' ? post() : Promise.reject(e)));
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body}`);
  return shape(text, JSON.parse(body).matches);
}

const overlaps = (a, b) => a.offset < b.offset + b.length && b.offset < a.offset + a.length;
const splice = (s, off, len, rep) => s.slice(0, off) + rep + s.slice(off + len);
const ctx = (s, off, len) => s.slice(Math.max(0, off - 35), off + len + 35).replace(/\s+/g, ' ');

// Detection level of one error from the matches on the original text.
export function judge(t, e, matches) {
  const ov = matches.filter((m) => overlaps(m, e));
  if (!ov.length) return { level: 'missed', by: [] };
  const targets = [e.correction, ...e.alternatives].map((c) => splice(t.text, e.offset, e.length, c));
  const exact = ov.filter((m) => m.replacements.some((r) => targets.includes(splice(t.text, m.offset, m.length, r))));
  if (exact.length) return { level: 'exact', by: exact.map((m) => m.ruleId) };
  const grammar = ov.filter((m) => m.category !== 'TYPOS');
  if (grammar.length) return { level: 'flagged', by: grammar.map((m) => m.ruleId) };
  return { level: 'speller', by: ov.map((m) => m.ruleId) };
}

export function evaluate(texts, results) {
  const errors = [];
  const falseAlarms = [];
  const unannotated = [];
  for (const t of texts) {
    const { original, fixed } = results[t.id];
    for (const e of t.errors) errors.push({ key: e.key, id: t.id, type: e.type, original: e.original, correction: e.correction, context: ctx(t.text, e.offset, e.length), ...judge(t, e, original) });
    for (const m of original) if (!t.errors.some((e) => overlaps(m, e))) unannotated.push({ id: t.id, ruleId: m.ruleId, covered: m.covered, message: m.message, replacements: m.replacements });
    const fixedText = corrected(t);
    for (const m of fixed) falseAlarms.push({ sig: `${t.id}|${m.ruleId}|${m.covered}`, id: t.id, ruleId: m.ruleId, covered: m.covered, message: m.message, context: ctx(fixedText, m.offset, m.length) });
  }
  return { errors, falseAlarms, unannotated };
}

function summary(lang, errors, falseAlarms) {
  const rows = [['typ', 'fehler', ...LEVELS, 'erkannt']];
  const add = (name, list) => {
    const n = (l) => list.filter((e) => e.level === l).length;
    const hit = list.length - n('missed');
    rows.push([name, list.length, ...LEVELS.map(n), list.length ? `${((hit / list.length) * 100).toFixed(0)}%` : '-']);
  };
  for (const t of TYPES[lang]) { const list = errors.filter((e) => e.type === t); if (list.length) add(t, list); }
  add('GESAMT', errors);
  const w = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  return `${rows.map((r) => r.map((v, c) => String(v).padEnd(w[c])).join('  ')).join('\n')}\nFehlalarme in den korrigierten Texten: ${falseAlarms.length}`;
}

// Regressions and improvements against a stored baseline.
export function diffBaseline(base, errors, falseAlarms) {
  const rank = (l) => LEVELS.length - 1 - LEVELS.indexOf(l);
  const regressions = [];
  const improvements = [];
  for (const e of errors) {
    const before = base.errors[e.key];
    if (before === undefined) continue;
    if (rank(e.level) < rank(before)) regressions.push(`${e.key}: ${before} -> ${e.level}`);
    else if (rank(e.level) > rank(before)) improvements.push(`${e.key}: ${before} -> ${e.level}`);
  }
  const known = new Set(base.falseAlarms);
  const now = new Set(falseAlarms.map((f) => f.sig));
  for (const f of falseAlarms) if (!known.has(f.sig)) regressions.push(`neuer Fehlalarm ${f.sig} (${f.message})`);
  for (const s of known) if (!now.has(s)) improvements.push(`Fehlalarm weg: ${s}`);
  const newKeys = errors.filter((e) => base.errors[e.key] === undefined).map((e) => e.key);
  return { regressions, improvements, newKeys };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  let texts = loadTexts(o.lang);
  if (o.types) texts = texts.map((t) => ({ ...t, errors: t.errors.filter((e) => o.types.includes(e.type)) }));
  let kill = () => {};
  if (o.engine === 'js') {
    o.api = await import('../../../src/index.js');
  } else {
    const srv = await startServer(o.engine, o.port);
    kill = () => { try { process.kill(srv.child.pid, 'SIGKILL'); } catch { /* gone */ } rmSync(srv.workDir, { recursive: true, force: true }); };
    process.on('SIGINT', () => { kill(); process.exit(130); });
  }
  const results = {};
  const t0 = Date.now();
  try {
    for (const t of texts) results[t.id] = { original: await checkText(o, t.text, t.lang), fixed: await checkText(o, corrected(t), t.lang) };
  } finally {
    kill();
  }
  const { errors, falseAlarms, unannotated } = evaluate(texts, results);
  console.log(`Fehler-Suite ${o.config}: ${texts.length} Texte, ${errors.length} Fehler, ${Date.now() - t0} ms`);
  console.log(summary(o.lang, errors, falseAlarms));
  const missed = errors.filter((e) => e.level === 'missed' || (o.verbose && e.level === 'speller'));
  if (missed.length) console.log(`\nnicht erkannt${o.verbose ? ' (oder nur Speller)' : ''}:\n${missed.map((e) => `  [${e.type}] ${e.original} => ${e.correction}  (${e.level}) …${e.context}…`).join('\n')}`);
  if (falseAlarms.length) console.log(`\nFehlalarme:\n${falseAlarms.map((f) => `  ${f.id} ${f.ruleId} '${f.covered}': ${f.message}`).join('\n')}`);
  if (o.verbose && unannotated.length) console.log(`\nweitere Treffer in den Fehlertexten (nicht annotiert):\n${unannotated.map((u) => `  ${u.id} ${u.ruleId} '${u.covered}'`).join('\n')}`);

  const outDir = path.join(HERE, '..', 'results');
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `suite-${o.config}.json`);
  writeFileSync(out, `${JSON.stringify({ config: o.config, texts: texts.length, errors, falseAlarms, unannotated, raw: results }, null, 2)}\n`);
  console.log(`\n-> ${path.relative(ROOT, out)}`);

  const basePath = path.join(HERE, 'baseline', `${o.config}.json`);
  if (o.update) {
    if (o.types) throw new Error('--update-baseline only without --type');
    mkdirSync(path.dirname(basePath), { recursive: true });
    const base = { config: o.config, errors: Object.fromEntries(errors.map((e) => [e.key, e.level])), falseAlarms: [...new Set(falseAlarms.map((f) => f.sig))].sort() };
    writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`);
    console.log(`Baseline geschrieben: ${path.relative(ROOT, basePath)}`);
    return;
  }
  if (!existsSync(basePath)) { console.log(`keine Baseline (${path.relative(ROOT, basePath)}), anlegen mit --update-baseline`); return; }
  const { regressions, improvements, newKeys } = diffBaseline(JSON.parse(readFileSync(basePath, 'utf8')), errors, falseAlarms);
  if (improvements.length) console.log(`\nVerbesserungen gegenüber Baseline (${improvements.length}):\n${improvements.map((x) => `  ${x}`).join('\n')}`);
  if (newKeys.length) console.log(`\nneue Fehler ohne Baseline-Eintrag: ${newKeys.length} (Baseline mit --update-baseline aktualisieren)`);
  if (regressions.length) {
    console.log(`\nVERSCHLECHTERUNGEN gegenüber Baseline (${regressions.length}):\n${regressions.map((x) => `  ${x}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('\nkeine Verschlechterung gegenüber der Baseline');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
