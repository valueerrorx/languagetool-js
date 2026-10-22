// Eval runner: checks every gold text with Java or JS LanguageTool (one HTTP server, POST /v2/check) and scores against gold.
// Usage: node tests/eval/run.mjs --engine java|js --lang de-DE [--level picky] [--disable RULE[,RULE]] [--port N] [--out file] [--dir de-heldout]
//        JS runs with the LTJS rule layer (D-061) unless LTJS_EXTRA_RULES=0 is set.
//        node tests/eval/run.mjs --rescore tests/eval/results/<file>.json   (score stored raw matches against the current gold)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JDK = '/usr/lib/jvm/java-17-openjdk';
const LT = path.join(ROOT, 'oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT');
export const TYPES = ['das_dass', 'comma_missing', 'comma_superfluous', 'other'];

function parseArgs(argv) {
  const o = { engine: null, lang: 'de-DE', level: null, disable: [], port: null, out: null, dir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--engine') o.engine = argv[++i];
    else if (a === '--lang') o.lang = argv[++i];
    else if (a === '--level') o.level = argv[++i];
    else if (a === '--disable') o.disable.push(...argv[++i].split(',').filter(Boolean));
    else if (a === '--port') o.port = Number(argv[++i]);
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--rescore') o.rescore = argv[++i];
    else if (a === '--dir') o.dir = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (o.rescore) return o;
  if (o.engine !== 'java' && o.engine !== 'js') throw new Error('--engine java|js required');
  o.port ??= o.engine === 'java' ? 19870 : 19871;
  if (o.port < 19840 || o.port > 19879) throw new Error('port must be in 19840-19879');
  return o;
}

// Starts one server and waits for /v2/healthcheck; returns {child, workDir}.
async function startServer(engine, port) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-eval-'));
  const env = { ...process.env, TZ: 'Europe/Vienna', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', HOME: workDir };
  const child = engine === 'java'
    ? spawn(`${JDK}/bin/java`, ['-Duser.language=en', '-Duser.country=US', '-Dfile.encoding=UTF-8', `-Djava.io.tmpdir=${workDir}`,
      '-cp', 'languagetool-server.jar', 'org.languagetool.server.HTTPServer', '--port', String(port)], { cwd: LT, env, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn(process.execPath, [path.join(ROOT, 'bin/lt-server.mjs'), '--port', String(port)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = [];
  child.stdout.on('data', (d) => log.push(d));
  child.stderr.on('data', (d) => log.push(d));
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${engine} server exited: ${Buffer.concat(log).toString()}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/v2/healthcheck`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    if (Date.now() - t0 > 120000) { child.kill('SIGKILL'); throw new Error(`${engine} server start timeout`); }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { child, workDir };
}

async function check(port, text, opts) {
  const params = new URLSearchParams({ text, language: opts.lang });
  if (opts.level) params.set('level', opts.level);
  if (opts.disable.length) params.set('disabledRules', opts.disable.join(','));
  const r = await fetch(`http://127.0.0.1:${port}/v2/check`, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body}`);
  return JSON.parse(body).matches;
}

export function loadGold(lang, sub = null) {
  const dir = path.join(HERE, sub ?? lang.split('-')[0]);
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
}

const overlaps = (aStart, aLen, bStart, bLen) => aStart < bStart + bLen && bStart < aStart + aLen;
const splice = (text, off, len, rep) => text.slice(0, off) + rep + text.slice(off + len);
const dasNorm = (s) => s.replace(/\bsodass\b/gi, 'so das').replace(/\b([Dd])ass\b/g, '$1as');
const commaNorm = (s) => s.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
const commas = (s) => (s.match(/,/g) ?? []).length;

// Match class from the replacement diff, then from the rule id.
export function classify(m, text) {
  const orig = text.substr(m.offset, m.length);
  for (const { value: rep } of m.replacements ?? []) {
    if (rep !== orig && dasNorm(rep) === dasNorm(orig)) return 'das_dass';
    if (rep !== orig && commaNorm(rep) === commaNorm(orig) && commas(rep) !== commas(orig)) return commas(rep) > commas(orig) ? 'comma_missing' : 'comma_superfluous';
  }
  const id = m.rule.id;
  if (/KOMMA|COMMA/.test(id)) return orig.includes(',') ? 'comma_superfluous' : 'comma_missing';
  if (/^DAS_DASS$|(^|_)DASS(_|$)/.test(id)) return 'das_dass';
  return 'other';
}

// Gold edit point (index into text) of a das/dass or comma error: first differing position of original vs correction.
function editPoint(e) {
  let p = 0;
  while (p < e.original.length && e.original[p] === e.correction[p]) p++;
  return e.offset + p;
}

const family = (t) => (t.startsWith('comma') ? 'comma' : t);

// Sentence span [start, end) around offset: boundaries are [.!?:] + whitespace and line breaks.
function sentenceOf(text, off) {
  let start = 0;
  let end = text.length;
  for (const m of text.matchAll(/[.!?:](?=\s)|\n/g)) {
    const b = m.index + m[0].length;
    if (b <= off) start = b; else { end = b; break; }
  }
  return [start, end];
}

export function evaluate(gold, results) {
  const stats = Object.fromEntries(TYPES.map((t) => [t, { gold: 0, found: 0, flaggedOnly: 0, missed: 0, falseAlarms: 0 }]));
  const details = { found: [], flaggedOnly: [], missed: [], falseAlarms: [], ignoredOptional: [], unscoredOther: [], duplicates: [] };
  for (const g of gold) {
    const matches = results[g.id];
    const cls = matches.map((m) => classify(m, g.text));
    const ctx = (off, len) => g.text.slice(Math.max(0, off - 40), off + len + 40).replace(/\n/g, ' ');
    const mInfo = (m, i) => ({ ruleId: m.rule.id, offset: m.offset, length: m.length, covered: g.text.substr(m.offset, m.length), replacements: (m.replacements ?? []).slice(0, 5).map((r) => r.value), class: cls[i] });
    const usedByGold = new Set();
    const outcome = [];
    for (const e of g.errors) {
      const targets = [e.correction, ...(e.alternatives ?? [])].map((c) => splice(g.text, e.offset, e.length, c));
      const ov = matches.map((m, i) => i).filter((i) => overlaps(matches[i].offset, matches[i].length, e.offset, e.length));
      ov.forEach((i) => usedByGold.add(i));
      const rec = { id: g.id, type: e.type, original: e.original, correction: e.correction, offset: e.offset, context: ctx(e.offset, e.length) };
      if (e.type === 'other') {
        outcome.push(ov.length ? ['found', { ...rec, by: ov.map((i) => mInfo(matches[i], i)) }] : ['missed', rec]);
        continue;
      }
      const hit = ov.find((i) => (matches[i].replacements ?? []).some((r) => targets.includes(splice(g.text, matches[i].offset, matches[i].length, r.value))));
      if (hit !== undefined) { outcome.push(['found', { ...rec, by: [mInfo(matches[hit], hit)] }]); continue; }
      const ep = editPoint(e);
      const relevant = ov.filter((i) => {
        const m = matches[i];
        if (m.rule.category?.id === 'TYPOS') return false;
        if (family(cls[i]) === family(e.type)) return true;
        return e.type === 'das_dass' ? true : m.offset < ep && m.offset + m.length > ep;
      });
      outcome.push(relevant.length ? ['flaggedOnly', { ...rec, by: relevant.map((i) => mInfo(matches[i], i)) }] : ['missed', { ...rec, overlapping: ov.map((i) => mInfo(matches[i], i)) }]);
    }
    // a comma match without suggestions in the same sentence as a gold comma error: flags it (flagged-only) if missed, else a duplicate (no false alarm)
    matches.forEach((m, i) => {
      if (usedByGold.has(i) || family(cls[i]) !== 'comma' || (m.replacements ?? []).length) return;
      const [s0, s1] = sentenceOf(g.text, m.offset);
      const inSentence = (e) => family(e.type) === 'comma' && e.offset >= s0 && e.offset < s1;
      const k = g.errors.findIndex((e, j) => inSentence(e) && outcome[j][0] === 'missed');
      if (k < 0) {
        if (g.errors.some(inSentence)) { usedByGold.add(i); details.duplicates.push({ id: g.id, ...mInfo(m, i) }); }
        return;
      }
      usedByGold.add(i);
      const rec = outcome[k][1];
      delete rec.overlapping;
      outcome[k] = ['flaggedOnly', { ...rec, sameSentence: true, by: [mInfo(m, i)] }];
    });
    g.errors.forEach((e, j) => { stats[e.type].gold++; stats[e.type][outcome[j][0]]++; details[outcome[j][0]].push(outcome[j][1]); });
    matches.forEach((m, i) => {
      if (usedByGold.has(i)) return;
      const info = { id: g.id, control: g.control, ...mInfo(m, i), context: ctx(m.offset, m.length) };
      if (g.optional.some((o) => overlaps(m.offset, m.length, o.offset, o.length))) { details.ignoredOptional.push(info); return; }
      const neg = g.negatives.find((n) => overlaps(m.offset, m.length, n.offset, n.length));
      let t = null;
      if (neg) t = cls[i] !== 'other' ? cls[i] : neg.type === 'das_dass' ? 'das_dass' : (g.text.substr(neg.offset, neg.length).includes(',') ? 'comma_superfluous' : 'comma_missing');
      else if (g.control || cls[i] !== 'other') t = cls[i];
      if (t === null) { details.unscoredOther.push(info); return; }
      stats[t].falseAlarms++;
      details.falseAlarms.push({ ...info, faType: t, negative: neg ? neg.type : null });
    });
  }
  for (const s of Object.values(stats)) {
    const tp = s.found + s.flaggedOnly;
    s.recall = s.gold ? s.found / s.gold : null;
    s.flaggedRecall = s.gold ? tp / s.gold : null;
    s.precision = tp + s.falseAlarms ? tp / (tp + s.falseAlarms) : null;
  }
  return { stats, details };
}

const pct = (x) => (x === null ? '-' : `${(x * 100).toFixed(1)}%`);
export function table(stats) {
  const rows = [['type', 'gold', 'found', 'flagged-only', 'missed', 'false alarms', 'recall', 'recall(flagged)', 'precision']];
  for (const t of TYPES) { const s = stats[t]; rows.push([t, s.gold, s.found, s.flaggedOnly, s.missed, s.falseAlarms, pct(s.recall), pct(s.flaggedRecall), pct(s.precision)]); }
  const w = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  return rows.map((r) => r.map((v, c) => String(v).padEnd(w[c])).join('  ')).join('\n');
}

// Raw matches of a result file back in /v2/check shape.
function fromRaw(raw) {
  return Object.fromEntries(Object.entries(raw).map(([id, ms]) => [id, ms.map((m) => ({ rule: { id: m.ruleId, category: { id: m.categoryId } }, offset: m.offset, length: m.length, message: m.message, replacements: m.replacements.map((value) => ({ value })) }))]));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.rescore) {
    const prev = JSON.parse(readFileSync(opts.rescore, 'utf8'));
    Object.assign(opts, { engine: prev.engine, lang: prev.lang, level: prev.level === 'default' ? null : prev.level, disable: prev.disable, dir: opts.dir ?? prev.dir ?? null, out: opts.rescore });
    report(opts, loadGold(opts.lang, opts.dir), fromRaw(prev.raw), prev.ms);
    return;
  }
  const gold = loadGold(opts.lang, opts.dir);
  const srv = await startServer(opts.engine, opts.port);
  const kill = () => { try { process.kill(srv.child.pid, 'SIGKILL'); } catch { /* gone */ } rmSync(srv.workDir, { recursive: true, force: true }); };
  process.on('SIGINT', () => { kill(); process.exit(130); });
  const results = {};
  const t0 = Date.now();
  try {
    for (const g of gold) results[g.id] = await check(opts.port, g.text, opts);
  } finally {
    kill();
  }
  report(opts, gold, results, Date.now() - t0);
}

function report(opts, gold, results, ms) {
  const { stats, details } = evaluate(gold, results);
  const label = `${opts.engine} ${opts.lang} level=${opts.level ?? 'default'}${opts.disable.length ? ` disable=${opts.disable.join(',')}` : ''}`;
  console.log(`${label}: ${gold.length} texts, ${Object.values(results).reduce((n, m) => n + m.length, 0)} matches, ${ms} ms`);
  console.log(table(stats));
  const outDir = path.join(HERE, 'results');
  mkdirSync(outDir, { recursive: true });
  const out = opts.out ?? path.join(outDir, `${opts.lang}-${opts.engine}-${opts.level ?? 'default'}${opts.disable.length ? '-disable' : ''}.json`);
  const raw = Object.fromEntries(Object.entries(results).map(([id, ms2]) => [id, ms2.map((m) => ({ ruleId: m.rule.id, categoryId: m.rule.category?.id, offset: m.offset, length: m.length, message: m.message, replacements: (m.replacements ?? []).map((r) => r.value) }))]));
  writeFileSync(out, `${JSON.stringify({ engine: opts.engine, lang: opts.lang, level: opts.level ?? 'default', disable: opts.disable, ...(opts.dir ? { dir: opts.dir } : {}), texts: gold.length, ms, stats, details, raw }, null, 2)}\n`);
  console.log(`-> ${path.relative(ROOT, out)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
