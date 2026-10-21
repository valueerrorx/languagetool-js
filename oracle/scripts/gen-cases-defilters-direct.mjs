// Authors oracle/cases/X-DEFILTERS-U (F58): direct filter-run ops for the German filters without XML use (DE-0110, DE-0114, DE-0115 RecentYearFilter + YMDNewYearDateFilter, DE-0117, DE-0121). Inputs only.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../cases/X-DEFILTERS-U');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const CLOCK = '2026-03-15T10:00:00+01:00';
const PKG = 'org.languagetool.rules.de.';

// words (tokens without whitespace) of a German text, as the JS/Java German word tokenizer yields them for the texts below
function words(text) {
  return text.match(/[^\s,.]+|[,.]/g) ?? [];
}

function req(text, cls, args, o = {}) {
  const w = o.words ?? words(text);
  return {
    op: 'filter-run',
    args: {
      lang: 'de-DE', text, filter: { cls: PKG + cls }, args, from: o.from ?? 0, to: o.to ?? text.length, patternTokenPos: o.pos ?? 0,
      tokenPositions: o.tokenPositions ?? w.map(() => 1), window: o.window ?? [1, w.length + 1], message: o.message ?? 'msg {year} {realYear}', shortMessage: 'sm',
      ...(o.suggestions ? { suggestions: o.suggestions } : {}), clockAt: o.clockAt ?? CLOCK,
    },
  };
}

function write(name, description, ops, env) {
  writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ...(env ? { env } : {}), ops }));
}

// DE-0110 AdaptSuggestionFilter: patternTokenPos = index in getTokensWithoutWhitespace (SENT_START = 0), window = the noun token
{
  const ops = [];
  const sentences = ['Die Roadmap ist gut.', 'Hier steht die Roadmap.', 'Hier steht eine Roadmap.', 'Hier steht meine Roadmap.', 'Hier steht unsere Roadmap.', 'Hier steht eure Roadmap.',
    'Hier steht seine Roadmap.', 'Hier steht Roadmap.', 'Hier steht die neue Roadmap.', 'Roadmap ist gut.', 'Ich habe eine Roadmap.', 'Die Ausführung einer Roadmap dauert.', 'Er sieht der Roadmap zu.'];
  const suggs = [['Plan'], ['Idee'], ['Verfahren'], ['Plan', 'Idee'], ['Hund', 'Haus', 'Katze'], ['Roadmap'], [], ['Pläne'], ['schöner Plan'], ['xyzzy']];
  for (const s of sentences) {
    const w = words(s);
    const idx = w.indexOf('Roadmap');
    const from = s.indexOf('Roadmap');
    for (const sug of suggs) ops.push(req(s, 'AdaptSuggestionFilter', [], { from, to: from + 7, pos: idx + 1, window: [idx + 1, idx + 2], suggestions: sug, message: 'adapt' }));
  }
  ops.push(req('Hier steht die Roadmap.', 'AdaptSuggestionFilter', [], { from: 0, to: 4, pos: 0, window: [1, 2], suggestions: ['Plan'], message: 'adapt' }));
  ops.push(req('Hier steht die Roadmap.', 'AdaptSuggestionFilter', [], { from: 0, to: 4, pos: 1, window: [1, 2], suggestions: ['Plan'], message: 'adapt' }));
  write('adapt', 'AdaptSuggestionFilter (DE-0110) direct filter-run', ops);
}

// DE-0114 YMDDateCheckFilter (+ DE-0115 YMDNewYearDateFilter)
{
  const ops = [];
  const mk = (s, args, cls = 'YMDDateCheckFilter', o = {}) => ops.push(req(s, cls, args, { message: 'wd {realDay} / {day} / {currentYear}', ...o }));
  const dates = ['2014-08-25', '2014-08-23', '2026-03-16', '2026-03-15', '2024-02-29', '2023-02-29', '2014-13-45', '2014-8-5', '2014/08/25', '25.08.2014', '0000-01-01', '9999-12-31', 'abc'];
  const days = ['Montag', 'Dienstag', 'Mo.', 'So', 'Sonnabend', 'Samstag', 'Xyz'];
  for (const d of dates) {
    for (const day of days) {
      const s = `Am ${day}, ${d} gehen wir.`;
      const w = [`Am`, day, ',', d, 'gehen', 'wir', '.'];
      mk(s, [['weekDay', '2'], ['date', d]], 'YMDDateCheckFilter', { words: w }); // date = literal text as after \\n substitution
    }
  }
  const base = 'Am Montag, 2014-08-25 gehen wir.';
  const w = ['Am', 'Montag', ',', '2014-08-25', 'gehen', 'wir', '.'];
  mk(base, [['weekDay', '2'], ['date', '2014-08-25'], ['year', '1']], 'YMDDateCheckFilter', { words: w });
  mk(base, [['weekDay', '2'], ['date', '2014-08-25'], ['month', '1']], 'YMDDateCheckFilter', { words: w });
  mk(base, [['weekDay', '2'], ['date', '2014-08-25'], ['day', '1']], 'YMDDateCheckFilter', { words: w });
  mk(base, [['weekDay', '2']], 'YMDDateCheckFilter', { words: w });
  mk(base, [['date', '2014-08-25']], 'YMDDateCheckFilter', { words: w });
  mk(base, [], 'YMDDateCheckFilter', { words: w });
  write('ymd-datecheck', 'YMDDateCheckFilter (DE-0114) direct filter-run', ops);
  for (const [tag, ft, at] of [['jan', '@2027-01-05 12:00:00', '2027-01-05T12:00:00+01:00'], ['dec', '@2026-12-31 12:00:00', '2026-12-31T12:00:00+01:00'], ['mar', null, CLOCK]]) {
    const ops2 = [];
    for (const d of ['2026-12-30', '2026-12-31', '2026-01-01', '2027-01-01', '2025-12-31', '2026-02-30', '2026-13-01', 'abc', '2026-1-5']) {
      ops2.push(req(`Am ${d} war es.`, 'YMDNewYearDateFilter', [['date', d]], { words: ['Am', d, 'war', 'es', '.'], message: 'year {year} real {realYear}', clockAt: at }));
    }
    ops2.push(req('Am 2026-12-30 war es.', 'YMDNewYearDateFilter', [['date', '2026-12-30'], ['year', '2']], { words: ['Am', '2026-12-30', 'war', 'es', '.'], message: 'year {year} real {realYear}', clockAt: at }));
    ops2.push(req('Am 2026-12-30 war es.', 'YMDNewYearDateFilter', [], { words: ['Am', '2026-12-30', 'war', 'es', '.'], message: 'year {year} real {realYear}', clockAt: at }));
    write('ymd-newyear-' + tag, 'YMDNewYearDateFilter (DE-0115) direct filter-run', ops2, ft ? { FAKETIME: ft } : undefined);
  }
}

// DE-0115 RecentYearFilter (relative to the case clock 2026)
{
  const ops = [];
  for (const [year, back] of [['2025', '1'], ['2026', '1'], ['2024', '1'], ['2024', '2'], ['2020', '6'], ['2020', '5'], ['1999', '50'], ['2027', '5'], ['2025', '0'], ['2025', '-1'], ['abc', '1'], ['2025', 'x'], ['2025', ''], ['', '1'], ['+2025', '1'], ['2025 ', '1']]) {
    ops.push(req('Im Jahr 2025 war es.', 'RecentYearFilter', [['year', year], ['maxYearsBack', back]], { words: ['Im', 'Jahr', '2025', 'war', 'es', '.'] }));
  }
  ops.push(req('Im Jahr 2025 war es.', 'RecentYearFilter', [['year', '2025']], { words: ['Im', 'Jahr', '2025', 'war', 'es', '.'] }));
  ops.push(req('Im Jahr 2025 war es.', 'RecentYearFilter', [['maxYearsBack', '1']], { words: ['Im', 'Jahr', '2025', 'war', 'es', '.'] }));
  ops.push(req('Im Jahr 2025 war es.', 'RecentYearFilter', [], { words: ['Im', 'Jahr', '2025', 'war', 'es', '.'] }));
  write('recentyear', 'RecentYearFilter (DE-0115) direct filter-run', ops);
  write('recentyear-jan', 'RecentYearFilter (DE-0115) direct filter-run, clock 2027-01-05', ops.map((o) => ({ ...o, args: { ...o.args, clockAt: '2027-01-05T12:00:00+01:00' } })), { FAKETIME: '@2027-01-05 12:00:00' });
}

// DE-0117 GermanSuppressMisspelledSuggestionsFilter
{
  const ops = [];
  const sug = ['das', 'Haus', 'qwertzx', 'ein Hund', 'Hunde', 'läuft', 'Das', 'lief', 'Hnud', 'Haus tür', 'Kaffeemaschine', 'Autotür'];
  const text = 'Das ist ein Hnud .';
  const w = ['Das', 'ist', 'ein', 'Hnud', '.'];
  for (const args of [[['suppressMatch', 'true']], [['suppressMatch', 'false']], [['suppressMatch', 'true'], ['SuppressPostag', 'SUB:.*']], [['suppressMatch', 'false'], ['FilterPostag', 'SUB:.*']],
    [['suppressMatch', 'true'], ['FilterPostag', 'VER:.*']], [['suppressMatch', 'false'], ['SuppressPostag', 'ART:.*']], [], [['suppressMatch', 'maybe']]]) {
    ops.push(req(text, 'GermanSuppressMisspelledSuggestionsFilter', args, { from: 8, to: 16, words: w, suggestions: sug, message: 'sup' }));
    ops.push(req(text, 'GermanSuppressMisspelledSuggestionsFilter', args, { from: 8, to: 16, words: w, suggestions: ['qwertzx', 'xyzzyq'], message: 'sup' }));
  }
  write('suppress', 'GermanSuppressMisspelledSuggestionsFilter (DE-0117) direct filter-run', ops);
}

// DE-0121 UppercaseNounReadingFilter
{
  const ops = [];
  const toks = ['haus', 'Haus', 'schnell', 'laufen', 'der', 'blau', 'Blau', 'gehen', 'essen', 'ß', 'xyzzyq', '', ' ', 'erste', 'Kind', 'kind', 'hund hase', 'über', 'überall', '1', 'ärztin'];
  for (const t of toks) ops.push(req('Das ist ein Test .', 'UppercaseNounReadingFilter', [['token', t]], { words: ['Das', 'ist', 'ein', 'Test', '.'], message: 'upp' }));
  ops.push(req('Das ist ein Test .', 'UppercaseNounReadingFilter', [], { words: ['Das', 'ist', 'ein', 'Test', '.'], message: 'upp' }));
  write('uppercasenoun', 'UppercaseNounReadingFilter (DE-0121) direct filter-run', ops);
}
console.log(readdirSync(OUT).length + ' case files');
