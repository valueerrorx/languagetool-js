// Authors oracle/cases/X-FILTERS/*.json (inputs only). Ops filter-run / filter-helper (FilterOps.java) and rule-match-disamb (DisambOps.java), format docs/review/F34-oracle.md.
// Expected values come only from the Java run; token positions are looked up from the Java tokenisation (phase 0), not computed.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-FILTERS');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const TESTS_JAR = 'oracle/java-src/languagetool-core/target/languagetool-core-6.9-SNAPSHOT-tests.jar';
const pad = (n) => String(n).padStart(2, '0');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
// clocks: Java side via libfaketime (case env), JS side via args.clockAt of every request
const CLOCKS = {
  mar: { at: '2026-03-15T10:00:00+01:00' },
  jan: { at: '2027-01-05T12:00:00+01:00', env: { FAKETIME: '@2027-01-05 12:00:00' } },
  leap: { at: '2028-02-29T12:00:00+01:00', env: { FAKETIME: '@2028-02-29 12:00:00' } },
  dec: { at: '2026-12-31T12:00:00+01:00', env: { FAKETIME: '@2026-12-31 12:00:00' } },
};
const write = (name, description, ops0, extra = {}) => {
  let ops = ops0;
  const clock = extra.clock ?? 'mar';
  const { clock: _c, ...rest } = extra;
  const cl = CLOCKS[clock];
  const env = cl.env ? { env: cl.env } : {};
  // configs are registered once per case file (filter-cfg) and referenced by name
  const cfgs = new Map();
  const withClock = ops.map((o) => {
    if (o.op !== 'filter-run' && o.op !== 'filter-helper') return o;
    let args = { ...o.args, clockAt: cl.at };
    if (args.filter?.cfg !== undefined) {
      const key = JSON.stringify(args.filter.cfg);
      if (!cfgs.has(key)) cfgs.set(key, { name: `c${cfgs.size}`, cfg: args.filter.cfg });
      const { cfg: _x, ...rest } = args.filter;
      args = { ...args, filter: { ...rest, cfgRef: cfgs.get(key).name } };
    }
    return { ...o, args };
  });
  ops = [...cfgs.values()].map((c) => ({ op: 'filter-cfg', args: c })).concat(withClock);
  writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ...env, ...rest, ops }) + '\n');
};
const stats = {};
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];

// ---- phase 0: Java tokenisation of all sentences used for position lookups ----
const SENT = {};
const want = (code, text) => { (SENT[code] ??= new Set()).add(text); };
const TOK = {};
const ROWS = {};
async function tokenize() {
  const ops = [];
  const keys = [];
  for (const [code, set] of Object.entries(SENT)) for (const t of set) { ops.push({ op: 'filter-run', args: { lang: code, text: t, filter: { cls: 'org.languagetool.rules.WhitespaceCheckFilter' }, args: [['whitespaceChar', 'x'], ['position', '1']], from: 0, to: 1, patternTokenPos: 0, tokenPositions: [1], dumpTokens: true } }); keys.push(`${code}|${t}`); }
  if (!ops.length) return;
  const r = await runHarness({ ops, extraCp: [TESTS_JAR] });
  r.responses.split('\n').filter(Boolean).forEach((l, i) => { const j = JSON.parse(l); if (!j.ok || !j.result.tokens) throw new Error(`tokenize ${keys[i]}: ${l.slice(0, 300)}`); ROWS[keys[i]] = j.result.tokens.slice(1); TOK[keys[i]] = ROWS[keys[i]].map((t) => t[0]); });
  for (const k of Object.keys(SENT)) delete SENT[k];
}
// 1-based position (window starts after SENT_START) of the nth occurrence of token s
const P = (code, text, s, nth = 0) => {
  const t = TOK[`${code}|${text}`];
  let k = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === s && ++k === nth) return i + 1;
  throw new Error(`token ${JSON.stringify(s)} not in ${JSON.stringify(t)} (${text})`);
};
const NT = (code, text) => TOK[`${code}|${text}`].length;

// ---- configs of the date test subclasses (tables of the language DateFilterHelper classes) ----
const DATE = {
  de: { locale: 'de-DE', trim: true, wrongYear: 'Dieses Datum stimmt nicht mit dem Tag überein. Meinten Sie "{currentYear}"?', adjust: 'de',
    dayPrefix: [['sonnabend', 7], ['so', 1], ['mo', 2], ['di', 3], ['mi', 4], ['do', 5], ['fr', 6], ['sa', 7]],
    monthPrefix: [['jän', 1], ['jan', 1], ['feb', 2], ['mär', 3], ['apr', 4], ['mai', 5], ['jun', 6], ['jul', 7], ['aug', 8], ['sep', 9], ['okt', 10], ['nov', 11], ['dez', 12]],
    dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] },
  en: { locale: 'en-GB', trim: true, wrongYear: 'This date is wrong. Did you mean "{currentYear}"?', dayStrLike: 'en',
    dayPrefix: [['su', 1], ['mo', 2], ['tu', 3], ['we', 4], ['th', 5], ['fr', 6], ['sa', 7]],
    monthPrefix: [['jan', 1], ['feb', 2], ['mar', 3], ['apr', 4], ['may', 5], ['jun', 6], ['jul', 7], ['aug', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  fr: { locale: 'fr-FR', trim: false, wrongYear: 'Cette date est incorrecte. Faites-vous référence à l\'année "{currentYear}" ?',
    dayPrefix: [['dim', 1], ['lun', 2], ['mar', 3], ['mer', 4], ['jeu', 5], ['ven', 6], ['sam', 7]],
    monthPrefix: [['jan', 1], ['fév', 2], ['fev', 2], ['mar', 3], ['avr', 4], ['mai', 5], ['juin', 6], ['juil', 7], ['aou', 8], ['aoû', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['déc', 12], ['dec', 12]],
    dayNames: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
};
const DOW = { de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] };
const DOWABBR = { de: ['So.', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], fr: ['dim.', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'] };
const MON = { de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'] };
const DAYWORDS = { en: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'] };

const A = (o) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v]);
// day of week (1=Sunday) of a proleptic Gregorian date computed only to PICK interesting weekday names as inputs (the verdict comes from Java)
const wdOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const base = (lang, text, filter, args, extra = {}) => ({ op: 'filter-run', args: { lang, text, filter, args: A(args), from: 0, to: 1, patternTokenPos: 0, tokenPositions: [1], window: [1, 2], ...extra } });

// ---- 1. AbstractDateCheckFilter (CORE-0181), future (CORE-0182), new year (CORE-0182) on args only ----
const DATES = [
  [2026, 3, 15], [2026, 3, 16], [2026, 1, 1], [2026, 12, 31], [2025, 12, 31], [2027, 1, 1], [2024, 2, 29], [2023, 2, 29], [2000, 2, 29], [1900, 2, 29], [2100, 2, 29], [2028, 2, 29], [2020, 2, 30],
  [2014, 1, 1], [2014, 12, 31], [2013, 12, 31], [2015, 1, 1], [1999, 12, 31], [2000, 1, 1], [1970, 1, 1], [1582, 10, 4], [1582, 10, 5], [1582, 10, 10], [1582, 10, 14], [1582, 10, 15], [1582, 10, 16],
  [1, 1, 1], [100, 3, 1], [1500, 2, 29], [1600, 2, 29], [9999, 12, 31], [10000, 1, 1], [3000, 6, 15], [2026, 4, 31], [2026, 6, 31], [2026, 9, 31], [2026, 11, 31], [2026, 5, 31], [2026, 13, 1], [2026, 0, 1], [2026, 1, 0], [2026, 1, 32], [2026, 7, 4], [2026, 10, 3], [2026, 8, 15],
];
function dateArgs(c) {
  const out = [];
  const L = DATE[c];
  for (const [y, m, d] of DATES) {
    const wd = wdOf(y, m, d);
    const wrong = (wd + 3) % 7;
    const ok = m >= 1 && m <= 12 ? 1 : 0;
    out.push({ year: String(y), month: String(m), day: String(d), weekDay: DOW[c][wd] });
    out.push({ year: String(y), month: String(m), day: String(d), weekDay: DOW[c][wrong] });
    if (ok && y > 1583) out.push({ year: String(y), month: MON[c][m - 1], day: String(d), weekDay: DOWABBR[c][wrong] });
  }
  const m3 = MON[c][2];
  out.push(
    // missing / invalid args
    { month: '3', day: '15', weekDay: DOW[c][1] }, { year: '2026', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '3', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '15' }, {},
    { year: 'abc', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '', month: '3', day: '15', weekDay: DOW[c][1] }, { year: ' 2026', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '+2026', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '-1', month: '3', day: '15', weekDay: DOW[c][1] },
    { year: '0', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '292278994', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '292278995', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '2147483647', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '2147483648', month: '3', day: '15', weekDay: DOW[c][1] },
    { year: '2026', month: 'abc', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '2147483647', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '99999999999', day: '15', weekDay: DOW[c][1] },
    { year: '2026', month: m3, day: '15', weekDay: DOW[c][1] }, { year: '2026', month: m3.toUpperCase(), day: '15', weekDay: DOW[c][1].toUpperCase() }, { year: '2026', month: `${m3.slice(0, 3)}.`, day: '15', weekDay: DOW[c][1] },
    { year: '2026', month: '3', day: 'abc', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '99999999999', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '15.', weekDay: DOW[c][1] },
    { year: '2026', month: '3', day: '15th', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '22nd', weekDay: DOW[c][0] }, { year: '2026', month: '3', day: '22-an', weekDay: DOW[c][0] }, { year: '2026', month: '3', day: '007', weekDay: DOW[c][1] }, { year: '2026', month: '3', day: '15­a', weekDay: DOW[c][1] },
    { year: '2026', month: '3', day: '１５', weekDay: DOW[c][1] }, { year: '２０２６', month: '3', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '３', day: '15', weekDay: DOW[c][1] }, { year: '2026', month: '٣', day: '15', weekDay: DOW[c][1] }, { year: '٢٠٢٦', month: '3', day: '15', weekDay: DOW[c][1] },
    // weekday spelling
    { year: '2026', month: '3', day: '15', weekDay: 'Xyz' }, { year: '2026', month: '3', day: '15', weekDay: '' }, { year: '2026', month: '3', day: '15', weekDay: DOW[c][1].toLowerCase() }, { year: '2026', month: '3', day: '15', weekDay: `${DOW[c][1].slice(0, 2)}­${DOW[c][1].slice(2)}` }, { year: '2026', month: '3', day: '15', weekDay: DOW[c][0].replace('i', 'ı').replace('o', 'ö') },
    { year: '2026', month: `${m3.slice(0, 2)}­${m3.slice(2)}`, day: '15', weekDay: DOW[c][1] }, { year: '2026', month: `­${m3}`, day: '15', weekDay: DOW[c][1] },
    // no year: current year (the Java original uses the real clock when not under JUnit)
    { month: '3', day: '15', weekDay: DOW[c][0] }, { month: '3', day: '16', weekDay: DOW[c][0] }, { month: '2', day: '29', weekDay: DOW[c][0] }, { month: '1', day: '1', weekDay: DOW[c][5] }, { month: '12', day: '31', weekDay: DOW[c][4] },
  );
  void L;
  return out;
}
const MSG = 'wd {realDay} / {day} / {currentYear} / {realDay}';
const dateOps = (code, c, test, extraCfg = {}, mk = (a) => a) => {
  const cfg = { ...DATE[c], ...extraCfg };
  return dateArgs(c).map((a) => base(code, 'Datum', { test, cfg }, a, { message: MSG, shortMessage: 'short', ...mk({}) }));
};
for (const L of LANGS) {
  for (const [name, test, clocks] of [['datecheck', 'datecheck', ['mar', 'leap']], ['future', 'future', ['mar', 'dec']], ['newyear', 'newyear', ['jan', 'dec']]]) {
    for (const ck of clocks) {
      const ops = dateOps(L.code, L.c, test);
      write(`date-${name}-${L.c}-${ck}`, `${test} test subclass (${L.c} tables) on ${ops.length} argument sets, clock ${CLOCKS[ck].at}`, ops, { clock: ck });
      stats[`date-${name}-${L.c}-${ck}`] = ops.length;
    }
  }
}
// day words (getDayOfMonth override), real language classes (cls), core classes
{
  const ops = [];
  const cfg = { ...DATE.en, dayWords: DAYWORDS.en };
  for (const [d, wd] of [['first', 'Sunday'], ['first', 'Monday'], ['fifteenth', 'Sunday'], ['twentieth', 'Friday'], ['thirtieth', 'Monday'], ['nope', 'Monday'], ['First', 'Sunday']]) {
    for (const t of ['datecheck', 'future', 'newyear']) ops.push(base('en-US', 'Datum', { test: t, cfg }, { year: '2026', month: 'March', day: d, weekDay: wd }, { message: MSG }));
  }
  write('date-dayword-en', 'getDayOfMonth override (day words) in datecheck/future/newyear', ops);
  write('date-dayword-en-jan', 'getDayOfMonth override (day words) in datecheck/future/newyear, January clock', ops, { clock: 'jan' });
}
for (const L of LANGS) {
  for (const [name, cls, clocks] of [['future', `org.languagetool.rules.${L.c}.FutureDateFilter`, ['mar']], ['newyear', `org.languagetool.rules.${L.c}.NewYearDateFilter`, ['jan']]]) {
    if (L.c === 'fr' && name === 'future') continue; // no fr.FutureDateFilter in Java
    for (const ck of clocks) {
      const ops = dateArgs(L.c).map((a) => base(L.code, 'Datum', { cls }, a, { message: MSG, shortMessage: 'short' }));
      write(`date-real-${name}-${L.c}-${ck}`, `real ${cls} (language subclass; needs the language step) on ${ops.length} argument sets`, ops, { clock: ck });
      stats[`date-real-${name}-${L.c}-${ck}`] = ops.length;
    }
  }
}
// range checkers
{
  const xy = [['1998', '1992'], ['1998', '1998'], ['1998', '1999'], ['1998', '92'], ['1998', '99'], ['1998', '98'], ['1998', '00'], ['1998', '1'], ['1998', ''], ['', '92'], ['abc', '92'], ['1998', 'abc'], ['5', '3'], ['5', '7'], ['0', '0'], ['-5', '-7'], ['+5', '3'], ['5.0', '3'], ['٢٠٢٠', '١٩'], ['2147483647', '2147483646'], ['2147483648', '1'], ['99999999999', '1'], ['1999', '١٩'], ['１９９８', '92'], ['12', '3'], ['123', '45'], ['-1998', '92'], [' 1998', '92'], ['1998', ' 92'], ['1998', '-92'], ['1998', '+92']];
  for (const [name, cls] of [['range', 'org.languagetool.rules.DateRangeChecker'], ['shortened', 'org.languagetool.rules.ShortenedYearRangeChecker']]) {
    const ops = [];
    for (const [x, y] of xy) ops.push(base('en-US', 'Datum', { cls }, { x, y }, { message: 'range' }));
    ops.push(base('en-US', 'Datum', { cls }, { x: '1998' }, {}), base('en-US', 'Datum', { cls }, { y: '92' }, {}), base('en-US', 'Datum', { cls }, {}, {}));
    write(`daterange-${name}`, `${cls} on ${ops.length} x/y combinations (missing, malformed, Unicode digits, int limits)`, ops);
    stats[`daterange-${name}`] = ops.length;
  }
}
// YMDDateHelper
{
  const ops = [];
  const dates = ['2020-01-02', '2020-1-2', '2020-01-', '2020-01', '2020', '', '-2020-01-01', '2020-01-02-03', '2020--02', '--', 'a-b-c', '2020-01-02-', '2020 -01-02', '２０２０-01-02', '0001-01-01', '2020-13-45'];
  for (const dt of dates) ops.push({ op: 'filter-helper', args: { kind: 'ymd', method: 'parseDate', args: [['date', dt], ['keep', 'x']] } });
  ops.push({ op: 'filter-helper', args: { kind: 'ymd', method: 'parseDate', args: [] } }, { op: 'filter-helper', args: { kind: 'ymd', method: 'parseDate', args: [['date', null]] } });
  const ca = [[['year', '2020'], ['month', '01'], ['day', '02']], [['year', '2020'], ['month', '1'], ['day', '2']], [['year', '-1'], ['month', '12'], ['day', '31']], [['year', '2147483647'], ['month', '1'], ['day', '1']], [['year', 'x'], ['month', '1'], ['day', '1']], [['year', '2020']], [['month', '1'], ['day', '1']], [['year', '2020'], ['month', '1']], [['year', '+5'], ['month', 'M'], ['day', 'D']], [['year', '99999999999'], ['month', '1'], ['day', '1']], [['year', '٢٠٢٠'], ['month', '1'], ['day', '1']], [['year', ' 2020'], ['month', '1'], ['day', '1']]];
  for (const args of ca) for (const message of ['Date: {realDate} / {realDate}', 'no placeholder', '']) ops.push({ op: 'filter-helper', args: { kind: 'ymd', method: 'correctDate', lang: 'en-US', text: 'Datum', from: 0, to: 5, message, shortMessage: 'sm', args } });
  write('ymd-helper', 'YMDDateHelper#parseDate and #correctDate', ops);
  stats['ymd-helper'] = ops.length;
}

// ---- 2. position based date check with suggestions (CORE-0181) ----
{
  const T = {
    de: ['Am Montag, 15. März 2026 gehen wir.', 'Am Sonntag, 15. März 2026 gehen wir.', 'Am Mo., 15.03.2026 kommt er.', 'Der Dienstag, 29. Februar 2024 ist ein Schalttag.', 'Der Mittwoch, 29. Februar 2023 existiert nicht.', 'Am Samstag, den 3. Mai 2025 ist es so.', 'Sonntag 2026-03-15 ist ein Datum.', 'Freitag, 31. April 2026 ist falsch.', 'Am Donnerstag, 1. Januar 2026 war Neujahr.', 'Am Montag, 15. März gilt es.', 'Am Montag 15. März 2026.', 'So., 15.03.2026', 'Am Samstag, 31. Dezember 2025 war es.', 'Am Dienstag, 6. August 1914 war es.', 'Am Sonntag, 5. Oktober 1582 war es.'],
    en: ['On Monday, 15 March 2026 we go.', 'On Sunday, 15 March 2026 we go.', 'On Monday the 1st of March 2026 it is.', 'On Tuesday, 3rd March 2026 it is.', 'On Sunday, March 15th, 2026 it is.', 'Wednesday, 29 February 2023 does not exist.', 'Tuesday, 29 February 2028 exists.', 'On Friday, 31 April 2026 is wrong.', 'On Monday, 15 March it is.', 'Sunday 2026-03-15 is a date.', 'Mon, 11 March 2026 and Thu, 12 March 2026.', 'On Saturday, 22 March 2026 it is.', 'On Thursday, 2 January 2025 it is.', 'On Friday, 13 March 2026 it is.'],
    fr: ['Le lundi 15 mars 2026 nous partons.', 'Le dimanche 15 mars 2026 nous partons.', 'Le mardi 29 février 2024 existe.', 'Le mercredi 29 février 2023 existe pas.', 'Le vendredi 31 avril 2026 est faux.', 'Le lundi 15 mars il vient.', 'Lundi 1er mars 2026 est un jour.', 'dimanche 2026-03-15 est une date.', 'Le jeudi 3 juillet 2025 était un jour.', 'Le samedi 22 mars 2026 est un jour.'],
  };
  for (const L of LANGS) for (const t of T[L.c]) want(L.code, t);
  await tokenize();
  const first = (code, t) => TOK[`${code}|${t}`];
  for (const L of LANGS) {
    const mk = (cfgx, clsOrTest) => {
      const ops = [];
      for (const t of T[L.c]) {
        const toks = first(L.code, t);
        const n = toks.length;
        const wdTok = toks.find((x) => new RegExp(`^(${DOW[L.c].join('|')}|${DOWABBR[L.c].map((s) => s.replace('.', '')).join('|')})$`, 'i').test(x));
        if (!wdTok) throw new Error(`no weekday in ${t}`);
        const wdP = toks.indexOf(wdTok) + 1;
        const dateTok = toks.findIndex((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
        const num = (s) => toks.findIndex((x) => s.test(x)) + 1;
        const dayP = num(/^(\d{1,2})(st|nd|rd|th|er)?$/);
        const monP = toks.findIndex((x) => MON[L.c].includes(x)) + 1;
        const yrP = toks.findIndex((x) => /^(1[0-9]{3}|20[0-9]{2})$/.test(x)) + 1;
        const f = clsOrTest;
        const common = { window: [1, n + 1], tokenPositions: new Array(n).fill(1), from: toks.length ? 0 : 0, to: t.length, message: 'wd {realDay} / {day} / {currentYear}', shortMessage: 'sm', patternTokenPos: 0 };
        void common;
        const mkreq = (args, extra = {}) => base(L.code, t, f, args, { window: [1, n + 1], tokenPositions: new Array(n).fill(1), from: 0, to: t.length, message: 'wd {realDay} / {day} / {currentYear}', shortMessage: 'sm', patternTokenPos: 0, ...extra });
        if (dateTok >= 0) {
          ops.push(mkreq({ weekDay: String(wdP), date: String(dateTok + 1) }));
          ops.push(mkreq({ weekDay: String(wdP), date: String(dateTok + 1), day: '1', month: '1' }));
        }
        if (dayP && monP && yrP) {
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(monP), year: String(yrP) }));
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(monP) }));
        } else if (dayP && monP) {
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(monP) }));
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(monP), year: '0' }));
        }
        // swapped / invalid references
        if (dayP && monP) {
          ops.push(mkreq({ weekDay: String(dayP), day: String(wdP), month: String(monP), year: yrP ? String(yrP) : undefined }));
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(n + 5), year: yrP ? String(yrP) : undefined }));
          ops.push(mkreq({ weekDay: String(wdP), day: String(dayP), month: String(monP), year: yrP ? String(yrP) : undefined }, { tokenPositions: [2, 1, 1, 1, 1, 1].slice(0, n).concat(new Array(Math.max(0, n - 6)).fill(1)) }));
        }
      }
      ops.push(mkreq0(L, T[L.c][0], clsOrTest, { day: '1', month: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '2', month: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '2', day: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: 'x', day: '1', month: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '99', day: '1', month: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '-1', day: '1', month: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '2', day: '3', month: '1', year: '-1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '2', date: '1' }), mkreq0(L, T[L.c][0], clsOrTest, { weekDay: '2', date: '-1', day: '3', month: '4' }));
      void cfgx;
      return ops;
    };
    for (const ck of ['mar', 'leap']) {
      const ops = mk(null, { test: 'datecheck-sugg', cfg: DATE[L.c] });
      write(`datesugg-${L.c}-${ck}`, `datecheck-sugg test subclass (${L.c} tables, weekday/day/month/year/date by token reference) clock ${CLOCKS[ck].at}`, ops, { clock: ck });
      stats[`datesugg-${L.c}-${ck}`] = ops.length;
    }
    const ops = mk(null, { cls: `org.languagetool.rules.${L.c}.DateCheckFilter` });
    write(`datesugg-real-${L.c}`, `real ${L.c}.DateCheckFilter (language subclass of AbstractDateCheckWithSuggestionsFilter) with token references`, ops);
    stats[`datesugg-real-${L.c}`] = ops.length;
  }
}
function mkreq0(L, t, f, args) { const n = TOK[`${L.code}|${t}`].length; return base(L.code, t, f, args, { window: [1, n + 1], tokenPositions: new Array(n).fill(1), from: 0, to: t.length, message: 'm', patternTokenPos: 0 }); }

// ======== part 2: other generic filters ========
const R = (code, text) => ROWS[`${code}|${text}`];
// span of tokens i..j (0-based, window-relative) as match offsets
const span = (code, text, i, j = i) => ({ from: R(code, text)[i][1], to: R(code, text)[j][2] });
const full = (code, text) => ({ window: [1, NT(code, text) + 1], tokenPositions: new Array(NT(code, text)).fill(1) });
const fr = (code, text, filter, args, extra = {}) => base(code, text, filter, args, { ...extra });
const withSpan = (code, text, i, j, extra = {}) => ({ ...full(code, text), ...span(code, text, i, j), patternTokenPos: 0, ...extra });

// ---- PartialPosTagFilter (CORE-0180) ----
{
  const ops = [];
  const T = 'The inaccurate result was unhappy and undogs arrived.';
  want('en-US', T);
  want('en-US', 'Zzzzqx');
  await tokenize();
  const ppf = (filter, args, text = T, extra = {}) => ops.push(base('en-US', text, filter, args, { ...withSpan('en-US', text, 0, 0), message: 'pp', suggestions: ['a', 'b'], ...extra }));
  const dm = { test: 'partialpos', cfg: { mode: 'demo' } };
  const tg = { test: 'partialpos', cfg: { mode: 'tagger' } };
  const dis = { test: 'partialpos', cfg: { mode: 'disamb' } };
  for (const f of [dm, tg, dis]) {
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: 'NN' });
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: 'JJ', negate_pos: 'yes' });
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: 'NN', negate_pos: '' });
    ppf(f, { no: '2', regexp: '(in)(accurate)', postag_regexp: 'JJ', two_groups_regexp: 'true' });
    ppf(f, { no: '2', regexp: '(in)(.*)', postag_regexp: 'JJ', two_groups_regexp: 'true' });
    ppf(f, { no: '2', regexp: '(in)(accurate)', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: 'JJ', two_groups_regexp: 'x' });
    ppf(f, { no: '2', regexp: 'xx(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: 'in.*', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: '(i)(n)(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: '(in', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: 'in(.*)', postag_regexp: '(' });
    ppf(f, { no: '3', regexp: '(.*)', prefix: 'in', postag_regexp: 'JJ' });
    ppf(f, { no: '3', regexp: '(.*)', suffix: 'x', postag_regexp: 'JJ' });
    ppf(f, { no: '1', regexp: '(.*)', prefix: 'accur', suffix: 'ate', postag_regexp: 'JJ' });
    ppf(f, { no: '1', regexp: '(.*)', prefix: 'accur', suffix: 'ate', postag_regexp: 'JJ', negate_pos: 'yes' });
    ppf(f, { no: '1', regexp: '(.*)', prefix: null, suffix: null, postag_regexp: 'JJ' });
    ppf(f, { no: '5', regexp: 'un(.*)', postag_regexp: 'JJ.*' });
    ppf(f, { no: '7', regexp: 'un(.*)', postag_regexp: 'NNS?' });
    ppf(f, { no: '7', regexp: 'un(.*)', postag_regexp: 'NNS?', negate_pos: 'yes' });
    ppf(f, { no: '7', regexp: 'un(.*)', postag_regexp: 'VB.*', negate_pos: 'yes' });
    ppf(f, { no: '0', regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '99', regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '-1', regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: 'x', regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '', regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { regexp: '(.*)', postag_regexp: 'JJ' });
    ppf(f, { no: '2', postag_regexp: 'JJ' });
    ppf(f, { no: '2', regexp: '(.*)' });
    ppf(f, {});
    ppf(f, { no: '2', regexp: '(.*)', postag_regexp: 'JJ' }, 'Zzzzqx');
  }
  for (const [code, text, rows] of [
    ['en-US', 'They are Xunhappy , undogs and rerun .', [['2', 'un(.*)', 'JJ.*'], ['3', 'X(.*)', 'JJ'], ['4', 'un(.*)', 'NN.*'], ['5', 'ex(.*)', 'NN.*']]],
    ['de-DE', 'Sie sind unschön , Hundehütte und Zwischenwelt .', [['3', 'un(.*)', 'ADJ:.*'], ['5', '.*(hütte)', 'SUB:.*'], ['5', '(Hunde)(hütte)', 'SUB:.*'], ['7', 'Zwischen(.*)', 'SUB:.*'], ['3', 'un(.*)', 'SUB:.*']]],
    ['fr', 'Il va refaire les chats et désabuser .', [['3', 're(.*)', 'V.*'], ['6', '(.*)s', 'N .*'], ['8', 'dés(.*)', 'V .*'], ['8', 'dés(.*)', 'V .*']]],
  ]) {
    want(code, text);
    await tokenize();
    for (const mode of ['tagger', 'disamb']) {
      for (const [no, re, pt] of rows) for (const neg of [undefined, 'yes']) ops.push(base(code, text, { test: 'partialpos', cfg: { mode } }, { no, regexp: re, postag_regexp: pt, negate_pos: neg }, { ...withSpan(code, text, 0, 0), message: 'pp' }));
    }
    for (const [cls, ok] of [['org.languagetool.rules.en.NoDisambiguationEnglishPartialPosTagFilter', code === 'en-US'], ['org.languagetool.rules.en.EnglishPartialPosTagFilter', code === 'en-US'], ['org.languagetool.rules.fr.FrenchPartialPosTagFilter', code === 'fr']]) {
      if (!ok) continue;
      for (const [no, re, pt] of rows) for (const neg of [undefined, 'yes']) ops.push(base(code, text, { cls }, { no, regexp: re, postag_regexp: pt, negate_pos: neg }, { ...withSpan(code, text, 0, 0), message: 'pp' }));
    }
  }
  write('partialpos', 'PartialPosTagFilter test subclasses (Demo stub, raw tagger, tagger+disambiguator) and real language subclasses (en NoDisambiguation/English, fr French): argument validation, groups, negate_pos, prefix/suffix', ops);
  stats.partialpos = ops.length;
}

// ---- AbstractFindSuggestionsFilter (CORE-0183) with stub speller ----
{
  const ops = [];
  const S = {
    'en-US': { text: 'She has a cta at home .', bad: 'cta', after: 'cat', spell: { cta: ['cat', 'cats', 'cut', 'cart', 'Cat', 'act', 'cta', 'CAT', 'cat', 'cot'], CTA: ['cat', 'cats'], Cta: ['cat', 'cut'], hom: ['home', 'hum'], 'c t a': ['cat'] }, post: 'NN.*', prio: 'NNS', rm: 'cu.*', synth: 'NNS', caps: ['CTA', 'Cta'] },
    'de-DE': { text: 'Das ist ein Hnud .', bad: 'Hnud', after: 'ein', spell: { Hnud: ['Hund', 'Hunde', 'Hand', 'Hut', 'Rund', 'und', 'Hunden', 'Hundes', 'hund', 'Hunds', 'Huhn', 'Hund', 'Hunger'], HNUD: ['Hund', 'Hunde'] }, post: 'SUB:.*', prio: 'SUB:NOM:SIN.*', rm: 'Ha.*', synth: 'SUB:DAT:PLU:MAS', caps: ['HNUD'] },
    fr: { text: 'Le chta dort ete la .', bad: 'chta', after: 'dort', spell: { chta: ['chat', 'chats', 'chas', 'chats', 'Chat', 'chat', 'cha', 'chai'], ete: ['été', 'ête', 'ete', 'etée', 'Été'], CHTA: ['chat'] }, post: 'N .*', prio: 'N m p', rm: 'cha[si]', synth: 'N m p', caps: ['CHTA'] },
  };
  for (const [code, x] of Object.entries(S)) {
    want(code, x.text);
    await tokenize();
    const t = TOK[`${code}|${x.text}`];
    const bp = t.indexOf(x.bad) + 1;
    const sp = (extra = {}, args = {}, cfg = {}, ms = ['{suggestion}']) => ops.push(base(code, x.text, { test: 'findsugg', cfg: { spell: x.spell, ...cfg } }, args, { ...withSpan(code, x.text, bp - 1, bp - 1), message: 'find', suggestions: ms, ...extra }));
    const A0 = { wordFrom: String(bp), desiredPostag: x.post };
    for (const cfg of [{}, { synth: true }]) {
      sp({}, A0, cfg);
      sp({}, { ...A0, priorityPostag: x.prio }, cfg);
      sp({}, { ...A0, removeSuggestionsRegexp: x.rm }, cfg);
      sp({}, { ...A0, suppressMatch: 'true' }, cfg);
      sp({}, { ...A0, suppressMatch: 'TRUE' }, cfg);
      sp({}, { ...A0, suppressMatch: 'false' }, cfg);
      sp({}, { ...A0, wordFrom: 'marker' }, cfg);
      sp({}, { ...A0, wordFrom: 'marker1' }, cfg);
      sp({}, { ...A0, wordFrom: 'marker-1' }, cfg);
      sp({}, { ...A0, wordFrom: 'inmarker' }, cfg);
      sp({}, { ...A0, desiredPostag: x.synth }, cfg);
      sp({}, { ...A0, desiredPostag: 'ZZZ' }, cfg);
      sp({}, { ...A0, desiredPostag: 'ZZZ', suppressMatch: 'true' }, cfg);
      sp({}, { ...A0, Mode: 'diacritics' }, cfg);
      sp({}, { ...A0, Mode: 'other' }, cfg);
      sp({}, { ...A0, removeSuggestionsRegexp: '(' }, cfg);
      sp({}, A0, cfg, ['{Suggestion}', 'the {suggestion}!', '{SUGGESTION}', 'fixed', '{suggestion} {suggestion}']);
      sp({}, A0, cfg, ['fixed']);
      sp({}, A0, cfg, []);
      sp({}, { ...A0, suppressMatch: 'true' }, cfg, ['fixed']);
      sp({}, { ...A0, suppressMatch: 'true' }, cfg, ['{suggestion}', x.bad]);
      sp({}, { ...A0, Mode: 'diacritics' }, cfg, ['fixed']);
    }
    sp({}, A0, { clean: true });
    sp({}, A0, { excRegex: '.*a.*' });
    sp({}, A0, { excRegex: '.*a.*', synth: true });
    sp({}, { ...A0, wordFrom: 'inmarker' }, { pre: true });
    sp({ from: 0, to: x.text.length }, { ...A0, wordFrom: 'inmarker' }, {});
    sp({}, { wordFrom: String(bp) });
    sp({}, { desiredPostag: x.post });
    sp({}, {});
    for (const wf of ['0', '99', '-1', 'x', '', '1.5']) sp({}, { ...A0, wordFrom: wf });
    sp({}, { ...A0, wordFrom: String(t.indexOf(x.after) + 1) });
    // upper/capitalized misspelling
    for (const c of x.caps) {
      const text = x.text.replace(x.bad, c);
      want(code, text);
      await tokenize();
      const p2 = TOK[`${code}|${text}`].indexOf(c) + 1;
      for (const cfg of [{}, { synth: true }]) ops.push(base(code, text, { test: 'findsugg', cfg: { spell: x.spell, ...cfg } }, { wordFrom: String(p2), desiredPostag: x.post }, { ...withSpan(code, text, p2 - 1, p2 - 1), message: 'find', suggestions: ['{suggestion}'] }));
    }
  }
  write('findsugg-stub', 'AbstractFindSuggestionsFilter test subclass with stub speller suggestions (cfg.spell) and the language tagger/synthesizer: arguments, modes, placeholders, ordering, limits', ops);
  stats['findsugg-stub'] = ops.length;
  // real language subclasses need the morfologik speller (F41/F42)
  const ro = [];
  const RS = { 'en-US': ['org.languagetool.rules.en.FindSuggestionsFilter', 'She has a cta at home and a dgo .', ['cta', 'dgo'], 'NN.*'], fr: ['org.languagetool.rules.fr.FindSuggestionsFilter', 'Le chta dort et le chein ete la .', ['chta', 'chein', 'ete'], 'N .*'] };
  for (const [code, [cls, text, bads, post]] of Object.entries(RS)) {
    want(code, text);
    await tokenize();
    for (const b of bads) {
      const p = TOK[`${code}|${text}`].indexOf(b) + 1;
      for (const extra of [{}, { suppressMatch: 'true' }, { priorityPostag: post }, { Mode: 'diacritics' }]) ro.push(base(code, text, { cls }, { wordFrom: String(p), desiredPostag: post, ...extra }, { ...withSpan(code, text, p - 1, p - 1), message: 'find', suggestions: ['{suggestion}', '{Suggestion}'] }));
    }
  }
  write('findsugg-real', 'real FindSuggestionsFilter (needs MorfologikSpeller dictionaries: speller-dependent F41/F42)', ro);
  stats['findsugg-real'] = ro.length;
}

// ---- AbstractAdvancedSynthesizerFilter (CORE-0184) ----
{
  const S = {
    'en-US': { texts: ['The dogs run fast .', 'He walks to the big houses .', 'She had written letters .'], sel: [['NN.*', 'NNS'], ['VB.*', 'NNS?'], ['VBZ', 'VBD'], ['NNS', 'NN'], ['JJ', 'NNS'], ['VBN', 'VBZ'], ['.*', 'NN'], ['(VB)(.*)', '(NN)(S)']], repl: ['\\b1\\a2', '\\a1', 'X', '\\a1\\b2\\b1'] },
    'de-DE': { texts: ['Die Hunde laufen schnell .', 'Er sieht die großen Häuser .'], sel: [['SUB:.*', 'SUB:NOM:PLU:MAS'], ['VER:.*', 'VER:3:SIN:PRÄ.*'], ['ADJ:.*', 'SUB:.*'], ['SUB:AKK.*', 'SUB:DAT:PLU.*'], ['.*', 'ART.*']], repl: ['\\b1', '\\a1'] },
    fr: { texts: ['Les chats dorment ici .', 'Il mange les grandes pommes .'], sel: [['N .*', 'N m p'], ['V .*', 'V ind pres 3 s'], ['J .*', 'N f p'], ['.*', 'D .*']], repl: ['\\b1', 'X'] },
  };
  const ops = [];
  for (const [code, x] of Object.entries(S)) {
    for (const text of x.texts) want(code, text);
    await tokenize();
    for (const text of x.texts) {
      const n = NT(code, text);
      const mk = (args, extra = {}, cfg = {}) => ops.push(base(code, text, { test: 'advsynth', cfg }, args, { ...withSpan(code, text, 1, 1), message: 'syn', suggestions: ['{suggestion}', 'x {Suggestion}', '{SUGGESTION}'], ...extra }));
      for (const [ls, ps] of x.sel) {
        for (const [lf, pf] of [['2', '2'], ['2', '3'], ['3', '2'], ['1', '1'], ['marker', 'marker'], ['marker1', 'marker2'], ['2', 'marker'], [String(n), String(n)]]) {
          mk({ lemmaFrom: lf, postagFrom: pf, lemmaSelect: ls, postagSelect: ps });
        }
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps }, { suggestions: [] });
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps }, { suggestions: ['plain'] });
        for (const r of x.repl) mk({ lemmaFrom: '2', postagFrom: '3', lemmaSelect: ls, postagSelect: ps, postagReplace: r });
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps, newLemma: 'abc' });
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps, newLemma: '_s' }, {}, { newLemma: true });
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps, newLemma: '_s' });
        mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: ls, postagSelect: ps }, {}, { excRegex: '.*s' });
      }
      mk({ lemmaFrom: '0', postagFrom: '2', lemmaSelect: '.*', postagSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: '0', lemmaSelect: '.*', postagSelect: '.*' });
      mk({ lemmaFrom: String(n + 1), postagFrom: '2', lemmaSelect: '.*', postagSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: String(n + 1), lemmaSelect: '.*', postagSelect: '.*' });
      mk({ lemmaFrom: 'x', postagFrom: '2', lemmaSelect: '.*', postagSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: '(', postagSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: '.*', postagSelect: 'ZZZ' });
      mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: 'ZZZ', postagSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: '2', lemmaSelect: '.*' });
      mk({ lemmaFrom: '2', postagFrom: '2', postagSelect: '.*' });
      mk({ lemmaFrom: '2', lemmaSelect: '.*', postagSelect: '.*' });
      mk({ postagFrom: '2', lemmaSelect: '.*', postagSelect: '.*' });
      mk({});
    }
  }
  write('advsynth', 'AbstractAdvancedSynthesizerFilter test subclass with the language synthesizer: lemma/postag references (numbers, marker, markerN), selectors, postagReplace, newLemma, suggestion placeholders, errors', ops);
  stats.advsynth = ops.length;
}
// ---- AbstractSuppressMisspelledSuggestionsFilter (CORE-0402): xx has no speller, en/de/fr need the default spelling rule ----
{
  const SUG = {
    xx: ['the', 'house', 'qwertz', 'a b', 'The', '', 'dogs'],
    'en-US': ['the', 'house', 'qwertzx', 'a dog', 'dogs', 'running', 'The', 'ran', 'wrng', 'house keeper'],
    'de-DE': ['das', 'Haus', 'qwertzx', 'ein Hund', 'Hunde', 'läuft', 'Das', 'lief', 'Hnud', 'Haus tür'],
    fr: ['le', 'maison', 'qwertzx', 'un chat', 'chats', 'court', 'Le', 'cours', 'chta', "l'ami"],
  };
  const PT = { xx: ['.*', 'NN.*'], 'en-US': ['NN.*', 'VB.*'], 'de-DE': ['SUB.*', 'VER.*'], fr: ['N .*', 'V .*'] };
  for (const [code, sugs] of Object.entries(SUG)) {
    const text = code === 'fr' ? 'Il y a un chta ici .' : code === 'de-DE' ? 'Das ist ein Hnud .' : 'This is a wrng word .';
    want(code, text);
    await tokenize();
    const ops = [];
    const mk = (args, ms) => ops.push(base(code, text, { test: 'suppress' }, args, { ...withSpan(code, text, 2, 3), message: 'sup', suggestions: ms }));
    const subsets = [sugs, sugs.slice(0, 1), sugs.slice(2, 3), sugs.slice(1, 2), [], sugs.slice(3, 6), sugs.slice(6)];
    for (const ms of subsets) {
      for (const sm of ['true', 'false', 'FALSE', 'False', 'x', '']) mk({ suppressMatch: sm }, ms);
      mk({}, ms);
      for (const [sp, fp] of [[PT[code][0], undefined], [undefined, PT[code][0]], [PT[code][1], undefined], [undefined, PT[code][1]], [PT[code][0], PT[code][1]], ['ZZZ', undefined], [undefined, 'ZZZ'], ['(', undefined]]) mk({ suppressMatch: 'true', SuppressPostag: sp, FilterPostag: fp }, ms);
      mk({ suppressMatch: 'false', SuppressPostag: PT[code][0], FilterPostag: PT[code][0] }, ms);
    }
    write(`suppress-${code === 'xx' ? 'xx' : code.slice(0, 2)}`, code === 'xx' ? 'AbstractSuppressMisspelledSuggestionsFilter on the Demo language (no speller, no PatternRule tagger postags)' : `AbstractSuppressMisspelledSuggestionsFilter with the real ${code} default spelling rule (speller-dependent F41/F42/F43/F53)`, ops, code === 'xx' ? { extraCp: [TESTS_JAR] } : {});
    stats[`suppress-${code}`] = ops.length;
  }
  const ro = [];
  for (const [code, cls] of [['en-US', 'org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter'], ['de-DE', 'org.languagetool.rules.de.GermanSuppressMisspelledSuggestionsFilter'], ['fr', 'org.languagetool.rules.fr.FrenchSuppressMisspelledSuggestionsFilter']]) {
    const text = 'a b c d';
    want(code, text);
    await tokenize();
    for (const ms of [SUG[code], SUG[code].slice(2, 3), ['x']]) for (const sm of ['true', 'false']) ro.push(base(code, text, { cls }, { suppressMatch: sm }, { ...withSpan(code, text, 0, 1), message: 'sup', suggestions: ms }));
  }
  write('suppress-real', 'real language subclasses of AbstractSuppressMisspelledSuggestionsFilter (speller-dependent)', ro);
  stats['suppress-real'] = ro.length;
}

// ---- AbstractNumberInWordFilter (CORE-0412) with stub speller ----
{
  const ops = [];
  const cfg = { misspelled: ['b1ll', 'b0ll', 'a1b2', 'zzz', 'qq', 'x0y'], spell: { b1ll: ['bill'], bll: ['bell', 'ball'], ab: ['ab1'], zzz: [], qq: ['qq'] } };
  for (const w of ['b1ll', 'b0ll', 'bo0k', 'book0', '0ne', '0', '00', '123', 'a1b2', 'zzz', 'q1q', 'qq0', 'x0y', 'w0rd', 'ab', 'a0', '١٢٣', 'b１ll', '', 'o0', 'foo']) {
    ops.push(base('en-US', 'Word', { test: 'numberinword', cfg }, { word: w }, { message: 'num', suggestions: ['old'], from: 0, to: 4 }));
  }
  ops.push(base('en-US', 'Word', { test: 'numberinword', cfg }, {}, { message: 'num' }), base('en-US', 'Word', { test: 'numberinword', cfg }, { other: 'x' }, { message: 'num' }), base('en-US', 'Word', { test: 'numberinword', cfg }, { word: null }, { message: 'num' }));
  write('numberinword', 'AbstractNumberInWordFilter test subclass with stub speller (misspelled list, suggestion map): zero-to-o, digit removal, fallback suggestions, missing word', ops);
  stats.numberinword = ops.length;
  const ro = [];
  for (const [code, cls] of [['en-US', 'org.languagetool.rules.en.EnglishNumberInWordFilter'], ['de-DE', 'org.languagetool.rules.de.GermanNumberInWordFilter'], ['fr', 'org.languagetool.rules.fr.FrenchNumberInWordFilter']]) {
    for (const w of ['b1ll', 'b0ll', 'hous3', 'Hund3', 'ch4t', 'w0rd', '123', '0', 'maison1', 'Ha1s', 'zzzq1']) ro.push(base(code, 'Word', { cls }, { word: w }, { message: 'num', suggestions: ['old'], from: 0, to: 4 }));
    ro.push(base(code, 'Word', { cls }, {}, { message: 'num' }));
  }
  write('numberinword-real', 'real language subclasses of AbstractNumberInWordFilter (speller-dependent)', ro);
  stats['numberinword-real'] = ro.length;
}

// ---- AbstractMakeContractionsFilter (CORE-0411) ----
{
  const ops = [];
  const cfg = { pairs: [['de le', 'du'], ['à le', 'au'], ['de les', 'des'], ['à les', 'aux']] };
  const SG = [['de le chat', 'à le chat', 'de les chats', 'à les chats'], ['DE LE chat', 'Adele le', 'de le de les'], [], ['x'], ['de  le', 'dele', 'À LE'], ['de le chat', "d'le"]];
  for (const ms of SG) {
    ops.push(base('fr', 'Le chat', { test: 'contractions', cfg }, {}, { message: 'c', suggestions: ms }));
    ops.push(base('fr', 'Le chat', { cls: 'org.languagetool.rules.fr.MakeContractionsFilter' }, {}, { message: 'c', suggestions: ms }));
  }
  write('contractions', 'AbstractMakeContractionsFilter test subclass (replace pairs) and real fr.MakeContractionsFilter', ops);
  stats.contractions = ops.length;
}

// ---- AbstractTextToNumberFilter (CORE-0413) ----
{
  const T = ['one hundred twenty three', 'two thousand twenty six', 'three point one four', 'half', 'one point five percent', 'ten million', 'twelve billion trillion', 'big', 'ten %', 'zero', 'one , five', 'point', 'one hundred and one', 'twenty-one thousand', 'five million three hundred thousand', 'quadrillion', 'one point one one one one one one one', 'nine point zero zero one', 'tenth', 'two point tenth hundredth', 'seven hundred eighty nine thousand', 'hundred', 'thousand thousand', 'point five', 'three point', 'One Hundred', 'x y z'];
  for (const t of T) want('en-US', t);
  await tokenize();
  const ops = [];
  for (const t of T) {
    const n = NT('en-US', t);
    for (const cfg of [{}, { brackets: true }, { splitDash: true }]) {
      ops.push(base('en-US', t, { test: 'texttonumber', cfg }, {}, { ...withSpan('en-US', t, 0, n - 1), message: 'n', suggestions: [] }));
      ops.push(base('en-US', t, { test: 'texttonumber', cfg }, {}, { ...withSpan('en-US', t, 0, n - 1), window: [0, n + 1], tokenPositions: new Array(n + 1).fill(1), message: 'n', suggestions: ['pre'] }));
    }
    if (n > 1) ops.push(base('en-US', t, { test: 'texttonumber', cfg: {} }, {}, { ...withSpan('en-US', t, 1, n - 1), message: 'n', suggestions: [] }), base('en-US', t, { test: 'texttonumber', cfg: {} }, {}, { ...withSpan('en-US', t, 0, n - 2), message: 'n', suggestions: [] }));
  }
  write('texttonumber', 'AbstractTextToNumberFilter test subclass (English number words, float arithmetic, decimals, percentage, formatResult, tokenize hook)', ops);
  stats.texttonumber = ops.length;
}

// ---- ConvertToSentenceCaseFilter (CORE-0405) ----
{
  const TX = {
    'en-US': ['THE UNITED STATES OF AMERICA .', 'the Quick brown FOX jumps .', 'Microsoft Corp . announces', 'i am here', "I'M HERE AND I’M THERE", 'NASA LAUNCHES Rocket', 'Apple iPhone', '( HELLO ) WORLD', 'ONE', 'a b c', '" QUOTED TEXT "', 'U . S . A . TODAY', 'corp . corp', 'Paris IS NICE', 'WHAT ? REALLY !'],
    'de-DE': ['DER HUND UND DIE KATZE .', 'Berlin IST SCHÖN', 'DAS IST EIN TEST', 'ÖSTERREICH UND DEUTSCHLAND', 'EU - KOMMISSION', 'der Hund'],
    fr: ["L'HOMME EST ICI", 'LE CHAT ET LA SOURIS', "L’ÉCOLE EST OUVERTE", 'PARIS EST BELLE', 'le chat'],
  };
  for (const [code, ts] of Object.entries(TX)) {
    for (const t of ts) want(code, t);
    await tokenize();
    const ops = [];
    for (const t of ts) {
      const n = NT(code, t);
      for (const f of [{ cls: 'org.languagetool.rules.ConvertToSentenceCaseFilter' }, { test: 'sentencecase', cfg: { exceptions: ['i', 'nasa', 'u', 'paris'] } }]) {
        ops.push(base(code, t, f, {}, { ...withSpan(code, t, 0, n - 1), message: 'sc', suggestions: [] }));
        ops.push(base(code, t, f, {}, { ...withSpan(code, t, 0, n - 1), patternTokenPos: 1, message: 'sc', suggestions: ['old'] }));
        ops.push(base(code, t, f, {}, { ...withSpan(code, t, 0, n - 1), window: [0, n + 1], tokenPositions: new Array(n + 1).fill(1), message: 'sc' }));
        if (n > 2) ops.push(base(code, t, f, {}, { ...withSpan(code, t, 1, n - 2), message: 'sc' }), base(code, t, f, {}, { ...withSpan(code, t, 1, 1), message: 'sc' }));
        ops.push(base(code, t, f, {}, { ...withSpan(code, t, 0, n - 1), patternTokenPos: n + 3, message: 'sc' }));
      }
    }
    write(`sentencecase-${code.slice(0, 2)}`, `ConvertToSentenceCaseFilter (real class and tokenIsException subclass) on ${code} sentences with the raw tagger`, ops);
    stats[`sentencecase-${code}`] = ops.length;
  }
}

// ---- AdaptSuggestionsFilter (CORE-0403), CheckPostagsInSuggestionFilter (CORE-0404) ----
{
  const AD = {
    'en-US': { text: 'This is a apple in the house .', sugs: [['a apple', 'an apple', 'a house'], ['an hour', 'a hour', 'A apple', 'AN APPLE'], [], ['the  apple', ' a apple'], ['a umbrella', 'a european', 'a hour']] },
    'de-DE': { text: 'Das ist ein Haus am See .', sugs: [['ein Haus', 'zum See', 'Ein Haus'], ['dem Haus', 'in dem Haus', 'an dem See'], []] },
    fr: { text: "Le arbre est dans l'école .", sugs: [["le arbre", "l'arbre", 'de le chat', 'ce arbre'], ["je ai", "que il", "si il", "La arbre"], ['de les amis', 'à le jardin', 'la heure', 'le homme', 'ne est'], []] },
  };
  const CP = {
    'en-US': { text: 'This is a dog in the house .', sugs: [['the dog', 'a dog', 'dog the', 'the houses'], ['a big dog'], ['the'], ['', 'the dog']], tags: ['DT,NN.*', 'DT,NN', 'DT,NNS', 'DT,JJ,NN', 'DT', '.*,.*', 'XX,NN', 'DT,NN,', ',', '', '(,NN'] },
    'de-DE': { text: 'Das ist ein Hund im Haus .', sugs: [['der Hund', 'ein Hund', 'Hund der'], ['die Katze']], tags: ['ART.*,SUB.*', 'ART:DEF.*,SUB:.*', 'SUB.*,ART.*', 'ART.*'] },
    fr: { text: 'Le chat est dans la maison .', sugs: [['le chat', 'un chat', 'chat le'], ['la maison']], tags: ['D .*,N .*', 'D m s,N m s', 'N .*,D .*', 'D .*'] },
  };
  for (const [code, x] of Object.entries(AD)) {
    want(code, x.text);
    await tokenize();
    const n = NT(code, x.text);
    const ops = x.sugs.map((ms) => base(code, x.text, { cls: 'org.languagetool.rules.AdaptSuggestionsFilter' }, {}, { ...withSpan(code, x.text, 2, 3), message: 'adapt', suggestions: ms }));
    ops.push(base(code, x.text, { cls: 'org.languagetool.rules.AdaptSuggestionsFilter' }, { ignored: 'x' }, { ...withSpan(code, x.text, 0, n - 1), message: 'adapt', suggestions: x.sugs[0] }));
    ops.push(base(code, x.text, { cls: 'org.languagetool.rules.AdaptSuggestionsFilter' }, {}, { from: 0, to: 4, window: [1, 3], message: 'adapt', suggestions: x.sugs[0] }));
    write(`adapt-${code.slice(0, 2)}`, `AdaptSuggestionsFilter on ${code} (Language#adaptSuggestion, setOriginalErrorStr per suggestion)`, ops);
    stats[`adapt-${code}`] = ops.length;
  }
  for (const [code, x] of Object.entries(CP)) {
    want(code, x.text);
    await tokenize();
    const ops = [];
    for (const ms of x.sugs) for (const tg of x.tags) ops.push(base(code, x.text, { cls: 'org.languagetool.rules.CheckPostagsInSuggestionFilter' }, { PostagsList: tg }, { ...withSpan(code, x.text, 2, 3), message: 'cp', suggestions: ms }));
    ops.push(base(code, x.text, { cls: 'org.languagetool.rules.CheckPostagsInSuggestionFilter' }, {}, { ...withSpan(code, x.text, 2, 3), message: 'cp', suggestions: x.sugs[0] }));
    ops.push(base(code, x.text, { cls: 'org.languagetool.rules.CheckPostagsInSuggestionFilter' }, { PostagsList: x.tags[0] }, { ...withSpan(code, x.text, 2, 3), message: 'cp', suggestions: [] }));
    write(`checkpostags-${code.slice(0, 2)}`, `CheckPostagsInSuggestionFilter on ${code}: tag list vs suggestion tokens, mismatch IOException texts, no suggestion kept`, ops);
    stats[`checkpostags-${code}`] = ops.length;
  }
}

// ---- UnderlineSpacesFilter (CORE-0406), WhitespaceCheckFilter (CORE-0407), ApostropheTypeFilter (CORE-0414) ----
{
  const ops = [];
  const U = ['Hello  world foo bar .', 'a b', ' a b ', 'x', 'foo\tbar baz', 'foo bar baz', 'foo\nbar baz', 'foo  bar'];
  for (const t of U) want('en-US', t);
  await tokenize();
  for (const t of U) {
    const L = t.length;
    const spans = [[0, 1], [0, L], [1, 2], [2, 3], [Math.max(0, L - 2), L - 1], [Math.max(0, L - 1), L], [3, 5], [L, L], [-1, 2]];
    for (const [f, to] of spans) for (const u of ['before', 'after', 'both', 'x', 'BEFORE', '']) ops.push(base('en-US', t, { cls: 'org.languagetool.rules.UnderlineSpacesFilter' }, { underlineSpaces: u }, { ...full('en-US', t), from: f, to, message: 'u', suggestions: ['s'] }));
    ops.push(base('en-US', t, { cls: 'org.languagetool.rules.UnderlineSpacesFilter' }, {}, { ...full('en-US', t), from: 1, to: 2, message: 'u' }));
  }
  write('underlinespaces', 'UnderlineSpacesFilter: before/after/both at sentence start, end and whitespace kinds', ops);
  stats.underlinespaces = ops.length;
  const wops = [];
  const W = ['a b  c\td e f', 'a b', ',a , b', 'foo  bar baz'];
  for (const t of W) want('en-US', t);
  await tokenize();
  for (const t of W) {
    const n = NT('en-US', t);
    for (const wc of [' ', '  ', '', '\t', ' ', ' ', 'x', '  ']) for (const pos of ['1', '2', '3', '4', String(n), String(n + 1), '0', '-1', ...(wc === ' ' ? ['x', '', '1.0'] : [])]) wops.push(base('en-US', t, { cls: 'org.languagetool.rules.WhitespaceCheckFilter' }, { whitespaceChar: wc, position: pos }, { ...full('en-US', t), message: 'w' }));
    wops.push(base('en-US', t, { cls: 'org.languagetool.rules.WhitespaceCheckFilter' }, { position: '1' }, { ...full('en-US', t), message: 'w' }), base('en-US', t, { cls: 'org.languagetool.rules.WhitespaceCheckFilter' }, { whitespaceChar: ' ' }, { ...full('en-US', t), message: 'w' }));
  }
  write('whitespacecheck', 'WhitespaceCheckFilter: whitespaceChar vs whitespace before token, position range errors', wops);
  stats.whitespacecheck = wops.length;
  const aops = [];
  const AT = { 'fr': ["Il a dit l' homme", "L’homme d’ici et l'arbre", "Qu’est-ce que c'est ?"], 'en-US': ["It's the dog’s toy and ’tis fine", "Don't can’t won't"], 'de-DE': ["Das geht's nicht", "Wie geht’s dir ?"] };
  for (const [code, ts] of Object.entries(AT)) for (const t of ts) want(code, t);
  await tokenize();
  for (const [code, ts] of Object.entries(AT)) for (const t of ts) {
    const n = NT(code, t);
    for (const wf of ['1', '2', '3', String(n), String(n + 1), '0', '-1', 'marker', 'x', '']) for (const h of ['true', 'false', 'TRUE', 'x']) aops.push(base(code, t, { cls: 'org.languagetool.rules.patterns.ApostropheTypeFilter' }, { wordFrom: wf, hasTypographicalApostrophe: h }, { ...withSpan(code, t, Math.min(1, n - 1), Math.min(2, n - 1)), message: 'a' }));
    aops.push(base(code, t, { cls: 'org.languagetool.rules.patterns.ApostropheTypeFilter' }, { wordFrom: '1' }, { ...full(code, t), message: 'a' }), base(code, t, { cls: 'org.languagetool.rules.patterns.ApostropheTypeFilter' }, { hasTypographicalApostrophe: 'true' }, { ...full(code, t), message: 'a' }));
  }
  write('apostrophetype', 'ApostropheTypeFilter: wordFrom number/marker, typographic vs ASCII apostrophe in the language tokenizer output', aops);
  stats.apostrophetype = aops.length;
}

// ---- AddCommasFilter (CORE-0408) ----
{
  const AC = {
    'en-US': ['However , he came .', 'He came however and left .', 'However he came .', 'I think so , however .', 'Yes , however , no .', 'He said ( however ) no .', 'He said " however " no .', 'Also , a b c .', 'a however', 'however'],
    'de-DE': ['Er kam jedoch nicht .', 'Jedoch kam er nicht .', 'Er kam , jedoch nicht .', 'Er kam jedoch , nicht Sie .'],
    fr: ['Il est venu cependant mais pas elle .', 'Cependant , il est venu .', 'Il est venu , cependant elle non .', "Il a dit « cependant » non ."],
  };
  for (const [code, ts] of Object.entries(AC)) for (const t of ts) want(code, t);
  await tokenize();
  for (const [code, ts] of Object.entries(AC)) {
    const ops = [];
    for (const t of ts) {
      const n = NT(code, t);
      for (let i = 0; i < n; i++) for (const len of [1, 2]) {
        if (i + len - 1 >= n) continue;
        for (const ss of [undefined, 'true', 'TRUE', 'false']) {
          if (ss !== undefined && !(len === 2 || i === 1)) continue;
          ops.push(base(code, t, { cls: 'org.languagetool.rules.AddCommasFilter' }, { suggestSemicolon: ss }, { ...withSpan(code, t, i, i + len - 1), message: 'comma', shortMessage: 'sm', suggestions: ['old'] }));
        }
      }
    }
    write(`addcommas-${code.slice(0, 2)}`, `AddCommasFilter on ${code}: every 1-2 token span of ${ts.length} sentences, suggestSemicolon variants`, ops);
    stats[`addcommas-${code}`] = ops.length;
  }
}

// ---- IsEnglishWordFilter (CORE-0410), SuppressIfAnyRuleMatchesFilter (CORE-0409), MultitokenSpellerFilter (CORE-0415) ----
{
  const ops = [];
  const T = 'This is Haus Katze dog running unhappyx qwertzx';
  want('en-US', T);
  want('de-DE', T);
  await tokenize();
  for (const code of ['en-US', 'de-DE', 'fr']) {
    want(code, T);
    await tokenize();
    const n = NT(code, T);
    const mk = (args, extra = {}) => ops.push(base(code, T, { cls: 'org.languagetool.rules.IsEnglishWordFilter' }, args, { ...withSpan(code, T, 0, 2), message: 'e', ...extra }));
    for (const fp of ['1', '2', '3', '4', '5', '6', '7', '8', '1,2', '2,3', '1,4', '4,5', '1,2,3', '3,4,5,6', '0', '99', 'x', '1,x', '', ',', '1,,2', '-1']) {
      mk({ formPositions: fp });
      mk({ formPositions: fp, postags: 'NN.*' });
      mk({ formPositions: fp, postags: 'NN.*,VBZ,NN' });
      mk({ formPositions: fp, postags: 'ZZZ' });
    }
    mk({ formPositions: '2,4', postags: 'VBZ,NN' }, { tokenPositions: [1, 2, 1, 1, 1, 1, 1, 1].slice(0, n) });
    mk({ formPositions: '3', postags: 'NN.*' }, { tokenPositions: [1, 1, 3, 1, 1, 1, 1, 1].slice(0, n) });
    mk({ formPositions: '3' }, { tokenPositions: [0, 1, 1] });
    mk({ postags: 'NN' });
    mk({});
    mk({ formPositions: '2', postags: '(' });
  }
  write('isenglishword', 'IsEnglishWordFilter (en-US raw tagger): formPositions with skip correction, postags count/regex errors, rule language de/en/fr', ops);
  stats.isenglishword = ops.length;
}
{
  const SI = {
    'en-US': { ids: ['UPPERCASE_SENTENCE_START', 'EN_A_VS_AN', 'COMMA_PARENTHESIS_WHITESPACE', 'WHITESPACE_RULE', 'DOUBLE_PUNCTUATION', 'EN_UNPAIRED_BRACKETS', 'NOPE'], texts: ['this is a test .', 'I saw a apple .', 'He said , ( no ) .', 'See  you .', 'What ?? No .'], },
    'de-DE': { ids: ['UPPERCASE_SENTENCE_START', 'COMMA_PARENTHESIS_WHITESPACE', 'WHITESPACE_RULE', 'DE_UNPAIRED_BRACKETS', 'NOPE'], texts: ['das ist ein Test .', 'Er sagt , ( nein ) .', 'Sieh  du .'] },
    fr: { ids: ['UPPERCASE_SENTENCE_START', 'COMMA_PARENTHESIS_WHITESPACE', 'WHITESPACE_RULE', 'FR_UNPAIRED_BRACKETS', 'NOPE'], texts: ['le chat dort .', 'Il dit , ( non ) .', 'Vois  moi .'] },
  };
  const ops = [];
  for (const [code, x] of Object.entries(SI)) {
    for (const t of x.texts) want(code, t);
    await tokenize();
    for (const t of x.texts) {
      const n = NT(code, t);
      for (const ids of [...x.ids, x.ids.slice(0, 3).join(','), x.ids.join(',')]) for (const fo of [undefined, 'true', 'false']) for (const ms of [['This', 'this', 'an', 'A'], ['x y'], []]) {
        ops.push(base(code, t, { cls: 'org.languagetool.rules.SuppressIfAnyRuleMatchesFilter' }, { ruleIDs: ids, fastOnly: fo }, { ...withSpan(code, t, 0, 0), message: 's', suggestions: ms }));
      }
      ops.push(base(code, t, { cls: 'org.languagetool.rules.SuppressIfAnyRuleMatchesFilter' }, {}, { ...withSpan(code, t, 0, 0), message: 's', suggestions: ['a'] }));
      void n;
    }
  }
  write('suppressifany', 'SuppressIfAnyRuleMatchesFilter (re-analysis with language.createDefaultJLanguageTool(): needs all default rules of the language, speller-dependent where the rule set contains the speller)', ops);
  stats.suppressifany = ops.length;
}
{
  // names taken from the language multiword lists (en/multiwords.txt, de/multitoken-suggest.txt, fr/multiwords.txt) with typos; [sentence, first token, last token]
  const MT = {
    'en-US': [['I met Lady Gaga yesterday .', 'Lady', 'Gaga'], ['I met Ladi Gaga yesterday .', 'Ladi', 'Gaga'], ['We visit Amerigo Vespuci today .', 'Amerigo', 'Vespuci'], ['Open Google Mapz now .', 'Google', 'Mapz'], ['The Sahara Dessert is hot .', 'Sahara', 'Dessert'], ['Drink a Cuba Libr now .', 'Cuba', 'Libr'], ['Sturm Rugr is a firm .', 'Sturm', 'Rugr'], ['We saw San Luis Rio Colorado .', 'San', 'Colorado'], ['GOOGLE MAPZ IS GOOD .', 'GOOGLE', 'MAPZ'], ['google maps is good .', 'google', 'maps'], ['I met John Smyth in New Yrok .', 'John', 'Smyth'], ['a b', 'a', 'b'], [`${'x'.repeat(60)} yy`, 'yy', 'yy']],
    'de-DE': [['Er las Thomas Moruss gern .', 'Thomas', 'Moruss'], ['Er las Tomas Morus gern .', 'Tomas', 'Morus'], ['Das ist Alma Matr .', 'Alma', 'Matr'], ['Wir fahren nach New Yrok .', 'New', 'Yrok'], ['Wir fahren nach San Fransisko .', 'San', 'Fransisko'], ['Das ist Deus ex Machna .', 'Deus', 'Machna'], ['Magna Chrata ist alt .', 'Magna', 'Chrata'], ['Carl Friedrich Gauss lebte .', 'Carl', 'Gauss'], ['Osama bin Ladn lebte .', 'Osama', 'Ladn'], ['THOMAS MORUSS LEBTE .', 'THOMAS', 'MORUSS'], ['Frank-Walter Steinmeyer spricht .', 'Frank-Walter', 'Steinmeyer'], ['Ich traf Hans Mueler in Berlni .', 'Hans', 'Mueler']],
    fr: [['Je visite Sri Lank demain .', 'Sri', 'Lank'], ['Je visite Sierra Leon demain .', 'Sierra', 'Leon'], ['Je visite Burkina Fasso demain .', 'Burkina', 'Fasso'], ['Je visite Îles Cok demain .', 'Îles', 'Cok'], ['Je visite Iles Marshal demain .', 'Iles', 'Marshal'], ['SRI LANK EST BELLE .', 'SRI', 'LANK'], ['Je vois Jean Dupnt a Parsi .', 'Jean', 'Dupnt']],
  };
  const ops = [];
  for (const [code, ts] of Object.entries(MT)) {
    for (const t of ts) want(code, t[0]);
    await tokenize();
    for (const [t, a, b] of ts) {
      const toks = TOK[`${code}|${t}`];
      const i = toks.indexOf(a);
      const j = toks.lastIndexOf(b);
      for (const pos of [i + 1, 1, 0]) ops.push(base(code, t, { cls: 'org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter' }, {}, { ...withSpan(code, t, i, j), patternTokenPos: pos, message: 'mt', suggestions: [] }));
      ops.push(base(code, t, { cls: 'org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter' }, {}, { ...withSpan(code, t, 0, toks.length - 1), patternTokenPos: 1, message: 'mt', suggestions: [] }));
    }
  }
  write('multitokenspeller', 'MultitokenSpellerFilter: needs Language#getMultitokenSpeller and the default spelling rule (speller-dependent F42/F53/F60)', ops);
  stats.multitokenspeller = ops.length;
}

// ---- NewLineMatchFilter (CORE-0416) ----
{
  const ops = [];
  const TXT = ['Hello\nworld\n', '\n\nabc\n\n', '⁣abc⁣', 'a\nb', '\n', '\n\n\n', 'abc', '', 'x⁣\n⁣y', 'line1\nline2\n\nline3'];
  for (const t of TXT) {
    const L = t.length;
    const spans = [[0, L], [0, Math.max(0, L - 1)], [1, L], [0, 1], [L + 1, L + 2], [0, L + 3], [2, 3], [Math.max(0, L - 2), L]].filter(([f, to]) => f < to);
    for (const [f, to] of spans) for (const sg of [undefined, [], ['x'], ['\nabc\n'], ['abc'], ['⁣\n'], ['a', 'b'], ['\nabc⁣']]) ops.push({ op: 'filter-helper', args: { kind: 'newline', lang: 'en-US', text: t, matches: [{ from: f, to, suggestions: sg }] } });
    ops.push({ op: 'filter-helper', args: { kind: 'newline', lang: 'en-US', text: t, matches: [{ from: 0, to: L, suggestions: ['q'] }, { from: Math.min(1, L), to: L, suggestions: [] }, { from: 0, to: Math.min(2, L) }] } });
  }
  ops.push({ op: 'filter-helper', args: { kind: 'newline', lang: 'en-US', text: 'abc', matches: [{ from: 3, to: 3 }] } }, { op: 'filter-helper', args: { kind: 'newline', lang: 'en-US', text: 'abc', matches: [{ from: -1, to: 2 }] } }, { op: 'filter-helper', args: { kind: 'newline', lang: 'en-US', text: 'abc', matches: [] } });
  write('newlinematch', 'NewLineMatchFilter (RuleMatchFilter): trimming of leading/trailing newlines and U+2063 in match span and suggestions', ops);
  stats.newlinematch = ops.length;
}
// ======== part 4: real grammar rules using these filters (de/en/fr) on XML-disambiguated sentences ========
{
  const hr = await runHarness({ ops: LANGS.map((L) => ({ op: 'infra-harvest', args: { lang: L.code } })) });
  const harv = hr.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j)); return j.result; });
  const SKIP = /(CompoundCheckFilter|PotentialCompoundFilter|RemoveUnknownCompoundsFilter|ValidWordFilter|InsertCommaFilter|AdverbFilter|OrdinalSuffixFilter|WordWithDeterminerFilter|PostponedAdjectiveConcordanceFilter|fr\.SuggestionsFilter|InterrogativeVerbFilter|RegexAntiPatternFilter)$/;
  const DATEF = /(DateCheckFilter|FutureDateFilter|NewYearDateFilter)$/;
  const sample = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor((i * a.length) / n)]));
  const cleanEx = (s) => s.replace(/[\n\t]+/g, ' ').trim();
  const rn = {};
  for (let li = 0; li < LANGS.length; li++) {
    const L = LANGS[li];
    let sel = harv[li].rules.filter((x) => x[7] && !SKIP.test(x[7]));
    const heavy = sel.filter((x) => /(FindSuggestionsFilter|SuppressMisspelledSuggestionsFilter)$/.test(x[7]));
    sel = sel.filter((x) => !heavy.includes(x)).concat(sample(heavy, 40));
    sel.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    rn[L.c] = sel.length;
    for (const variant of ['mar', 'jan']) {
      const part = variant === 'mar' ? sel : sel.filter((x) => DATEF.test(x[7]));
      chunks(part, 30).forEach((ch, ci) => {
        const texts = [];
        const idx = new Map();
        const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
        const jobs = ch.map((x) => {
          const own = [...x[10].slice(0, 3), ...x[9].slice(0, 1)].map(cleanEx).filter((s) => s.length > 0 && s.length < 1500);
          let ids = own.map(tid);
          if (DATEF.test(x[7])) {
            for (const s of own.slice(0, 3)) {
              if (variant === 'jan') ids.push(tid(s.replace(/\b201[34]\b/g, '2026')));
              else { ids.push(tid(s.replace(/\b201[34]\b/g, '2025'))); ids.push(tid(s.replace(/\b201[34]\b/g, '2099'))); }
            }
          }
          ids = [...new Set(ids)];
          return { src: { file: x[0], rule: x[1] }, texts: ids };
        });
        const name = `real-${L.c}-${variant}-${pad(ci)}`;
        write(name, `${L.code} grammar rules with <filter> (${[...new Set(ch.map((x) => x[7].split('.').pop()))].join(', ')}) on XML-disambiguated sentences, clock ${CLOCKS[variant].at}: createRuleMatch hits (filters run), RuleWithMaxFilter, PatternRule#match`,
          [{ op: 'rule-match-disamb', args: { lang: L.code, global: true, texts, jobs } }], { clock: variant });
        stats[name] = jobs.length;
      });
    }
  }
  stats.realRules = rn;
}
console.error(JSON.stringify(stats));
