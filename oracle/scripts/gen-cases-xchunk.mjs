// Authors oracle/cases/X-CHUNK/*.json (inputs only). Ops chunk-run / chunk-tag (ChunkOps.java), format docs/review/F33-oracle.md.
// Multiword entries and sentences are derived from the real data files; expected values come only from the Java run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-CHUNK');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
const pad = (n) => String(n).padStart(2, '0');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const spread = (a, n, off = 0) => (a.length <= n ? a.slice() : Array.from({ length: n }, (_, i) => a[(Math.floor((i * a.length) / n) + off) % a.length]));
const RES = (m, f) => path.join(ROOT, `oracle/java-src/${m}/src/main/resources/org/languagetool/resource/${f}`);
const LM = 'languagetool-language-modules';
const ucFirst = (s) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);
const title = (s) => s.split(' ').map(ucFirst).join(' ');

// entries of a multiword file: first column of each data line (separator from #separatorRegExp= or tab)
function entries(file, oneColumn) {
  let sep = '\t';
  const out = [];
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#separatorRegExp=')) { sep = line.slice('#separatorRegExp='.length); continue; }
    if (line === '' || line[0] === '#') continue;
    out.push(oneColumn ? line : line.split(new RegExp(sep))[0]);
  }
  return out;
}

const LANGS = {
  en: { code: 'en-US', ctx: ['We met {} yesterday.', 'The report on {}, however, was late.', '"{}" was mentioned twice.', 'See {}!', 'He said (about {}) nothing.'], start: '{} is here.' },
  de: { code: 'de-DE', ctx: ['Wir besuchten {} gestern.', 'Der Bericht über {}, aber, kam spät.', '„{}“ wurde zweimal erwähnt.', 'Siehe {}!', 'Er sagte (zu {}) nichts.'], start: '{} ist hier.' },
  fr: { code: 'fr', ctx: ['Nous avons vu {} hier.', 'Le rapport sur {}, cependant, était tardif.', '« {} » a été mentionné deux fois.', 'Voir {} !', "Il n'a rien dit (sur {})."], start: '{} est ici.' },
};
const forms = (e) => [e, ucFirst(e), e.toUpperCase(), title(e), e.toLowerCase()];
function texts(L, ents, n, off = 0) {
  const out = [];
  spread(ents, n, off).forEach((e, i) => {
    const f = forms(e);
    out.push(L.ctx[i % L.ctx.length].replace('{}', f[i % 2 === 0 ? 0 : 1 + (i % 4)]));
    if (i % 3 === 0) out.push(L.start.replace('{}', ucFirst(f[0])));
  });
  return out;
}
// overlap / adjacency: two entries glued, and entry followed by an entry that starts with its last word
function overlaps(ents, n) {
  const out = [];
  const multi = ents.filter((e) => e.includes(' '));
  const byFirst = new Map();
  for (const e of multi) { const w = e.split(' '); (byFirst.get(w[0]) ?? byFirst.set(w[0], []).get(w[0])).push(e); }
  const prefixed = [...byFirst.values()].filter((v) => v.length > 1);
  for (const v of spread(prefixed, n)) out.push(`Both ${v[0]} and ${v[1]} appear. ${v[1]} ${v[0]}`);
  const ms = spread(multi, n * 2);
  for (let i = 0; i + 1 < ms.length; i += 2) {
    const a = ms[i].split(' ');
    const b = ms[i + 1].split(' ');
    out.push(`${ms[i]} ${ms[i + 1]} .`);
    out.push(`${ms[i]}, ${ms[i + 1]}`);
    out.push(`${a.slice(0, -1).join(' ')} ${ms[i + 1]}`);
    out.push(`${a[a.length - 1]} ${b.join(' ')} ${a[0]}`);
  }
  return out;
}
const corpus = (c, n) => spread(readFileSync(path.join(ROOT, `oracle/corpus/${c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 25 && s.length <= 220), n);

const F = {
  en: { mw: RES(`${LM}/en`, 'en/multiwords.txt'), file: '/en/multiwords.txt' },
  fr: { mw: RES(`${LM}/fr`, 'fr/multiwords.txt'), file: '/fr/multiwords.txt' },
  de: { ign: RES(`${LM}/de`, 'de/multitoken-ignore.txt'), sug: RES(`${LM}/de`, 'de/multitoken-suggest.txt') },
};
const GLOBAL = RES('languagetool-core', 'spelling_global.txt');
const GFILE = '/spelling_global.txt';
const gEnts = entries(GLOBAL, true);
const stats = {};

// chains as the real languages build them (Java source of EnglishHybridDisambiguator, FrenchHybridDisambiguator, GermanRuleDisambiguator)
const CH = {
  en: {
    java: [{ kind: 'mwc', file: GFILE, fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }, { kind: 'mwc', file: '/en/multiwords.txt', fc: true, au: true, tc: false, ignoreSpelling: true, removePrev: true }],
    alone: [{ kind: 'mwc', file: '/en/multiwords.txt', fc: true, au: true, tc: false }],
    globalOnly: [{ kind: 'mwc', file: GFILE, fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    tc: [{ kind: 'mwc', file: '/en/multiwords.txt', fc: true, au: true, tc: true, ignoreSpelling: true }],
    bare: [{ kind: 'mwc', file: '/en/multiwords.txt' }],
    getInstanceOnly: [{ kind: 'mwc', file: '/en/multiwords.txt', fc: false, au: false, tc: false, removePrev: true }],
    mwc2: [{ kind: 'mwc2', file: '/en/multiwords.txt', fc: true }],
    mwc2b: [{ kind: 'mwc2', file: '/en/multiwords.txt', fc: false, removeOther: true, wrap: false }],
    mwc2x: [{ kind: 'mwc2x', file: '/en/multiwords.txt', fc: true }],
  },
  fr: {
    java: [{ kind: 'mwc', file: GFILE, fc: false, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }, { kind: 'mwc', file: '/fr/multiwords.txt', fc: true, au: true, tc: false, removePrev: true }],
    alone: [{ kind: 'mwc', file: '/fr/multiwords.txt', fc: true, au: true, tc: false }],
    globalOnly: [{ kind: 'mwc', file: GFILE, fc: false, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    tc: [{ kind: 'mwc', file: '/fr/multiwords.txt', fc: true, au: true, tc: true }],
    bare: [{ kind: 'mwc', file: '/fr/multiwords.txt' }],
    getInstanceOnly: [{ kind: 'mwc', file: '/fr/multiwords.txt', fc: false, au: false, tc: false }],
    mwc2: [{ kind: 'mwc2', file: '/fr/multiwords.txt', fc: true }],
  },
  de: {
    java: [{ kind: 'mwc', file: '/de/multitoken-ignore.txt', fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }, { kind: 'mwc', file: GFILE, fc: false, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }, { kind: 'mwc', file: '/de/multitoken-suggest.txt', fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    ign: [{ kind: 'mwc', file: '/de/multitoken-ignore.txt', fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    sug: [{ kind: 'mwc', file: '/de/multitoken-suggest.txt', fc: true, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    sugNoIgnore: [{ kind: 'mwc', file: '/de/multitoken-suggest.txt', fc: true, au: true, tc: false, tag: 'NONE' }],
    ignTag: [{ kind: 'mwc', file: '/de/multitoken-suggest.txt', fc: true, au: true, tc: true, tag: 'MW' }],
    globalOnly: [{ kind: 'mwc', file: GFILE, fc: false, au: true, tc: false, tag: 'NONE', ignoreSpelling: true }],
    // errors: two-column parse on one-column files, default tag on two-column parse
    badFmt: [{ kind: 'mwc', file: '/de/multitoken-suggest.txt', fc: true, au: true, tc: false }],
    mwc2err: [{ kind: 'mwc2', file: '/de/multitoken-suggest.txt', fc: true }],
  },
};
const jobsOf = (names, nT, full) => names.map((n) => ({ chain: CH.cur[n], texts: Array.from({ length: nT }, (_, i) => i), ...(full.includes(n) ? {} : { digest: true }) }));

function langCases(c, spec) {
  const L = LANGS[c];
  CH.cur = CH[c];
  const T = [];
  const add = (a) => { for (const t of a) if (!T.includes(t)) T.push(t); };
  if (c === 'de') {
    add(texts(L, entries(F.de.ign, true).filter((e) => e.includes(' ')), 90));
    add(texts(L, entries(F.de.sug, true), 70, 3));
    add(overlaps(entries(F.de.ign, true), 8));
    add(overlaps(entries(F.de.sug, true), 6));
  } else {
    const ents = entries(F[c].mw);
    add(texts(L, ents.filter((e) => e.includes(' ')), 110));
    add(texts(L, ents.filter((e) => !e.includes(' ')), 40, 1));
    add(overlaps(ents, 12));
  }
  add(texts(L, gEnts.filter((e) => e.includes(' ')), 40, 2));
  add(texts(L, gEnts.filter((e) => !e.includes(' ')), 30, 2));
  add(spec.extra);
  const full = spec.full;
  chunks(T, spec.per).forEach((ch, i) => {
    write(`real-${c}-${pad(i)}`, `${L.code} raw tagger sentences with multiwords of the real data files through MultiWordChunker/2 chains (${spec.names.join(', ')}); full AnalyzedSentence dumps for ${full.join(', ')}, digest for the rest`,
      [{ op: 'chunk-run', args: { lang: L.code, texts: ch, jobs: jobsOf(spec.names, ch.length, full) } }]);
  });
  stats[`real-${c}`] = T.length;
  // corpus (digest only): java chain + alone
  const cs = corpus(c, spec.corpus);
  chunks(cs, 100).forEach((ch, i) => {
    write(`corpus-${c}-${pad(i)}`, `${L.code} corpus sentences through the Java chains, digest only`,
      [{ op: 'chunk-run', args: { lang: L.code, texts: ch, jobs: spec.cnames.map((n) => ({ chain: CH[c][n], texts: ch.map((_, k) => k), digest: true })) } }]);
  });
  // corpus (full dump) a small spread for the Java chain
  const cf = corpus(c, 40);
  write(`corpusfull-${c}-00`, `${L.code} 40 corpus sentences, full dumps of the Java chain`,
    [{ op: 'chunk-run', args: { lang: L.code, texts: cf, jobs: [{ chain: CH[c].java, texts: cf.map((_, k) => k) }] } }]);
  stats[`corpus-${c}`] = cs.length + 40;
}

langCases('en', {
  names: ['java', 'alone', 'globalOnly', 'tc', 'bare', 'getInstanceOnly', 'mwc2', 'mwc2b', 'mwc2x'], full: ['java', 'alone', 'mwc2'], per: 55,
  corpus: 400, cnames: ['java', 'tc', 'mwc2'],
  extra: [
    'New York City is big. new york city is not.', 'NEW YORK CITY, NEW YORK', 'Is "New York" here? New York!', 'a.m. and p.m. and e.g. i.e.', 'Mr. Smith met Dr. Jones in St. Louis.',
    'The U.S.A. and the U.K. are not the EU.', 'iPhone iPad iOS and IPHONE', 'I live in San Francisco, California.', 'Time to go to Los Angeles', '', ' ', '.', 'New', 'New York', 'York New',
    'Hello  New   York  there', 'Hello\nNew York\tthere', ' New York ', 'Zürich ÄÖÜ ß straße über Café naïve', 'x'.repeat(300), `${'New York '.repeat(40)}`,
  ],
});
langCases('fr', {
  names: ['java', 'alone', 'globalOnly', 'tc', 'bare', 'getInstanceOnly', 'mwc2'], full: ['java', 'alone'], per: 55,
  corpus: 400, cnames: ['java', 'tc', 'mwc2'],
  extra: [
    "L'Hermenault est près de La Chevrolière.", "L’Hermenault (Vendée)", 'Intel Core et home page.', 'LA CHEVROLIÈRE', 'la chevrolière', 'Aujourd’hui c’est l’été à Paris.', "Qu'est-ce que c'est? Jusqu'à demain.",
    '', ' ', '.', 'Black', 'Black Cat', 'Cat Black', 'Black  Cat', "Black\tCat", 'Ça été ÀÉÎ ôù œuvre Œuvre', 'x'.repeat(300),
  ],
});
langCases('de', {
  names: ['java', 'ign', 'sug', 'sugNoIgnore', 'ignTag', 'globalOnly', 'badFmt', 'mwc2err'], full: ['java', 'sug', 'ignTag'], per: 60,
  corpus: 400, cnames: ['java', 'sug'],
  extra: [
    'Er wohnt in der Route de Sugnens.', 'ROUTE DE SUGNENS und route de sugnens', 'Zürich Österreich Äpfel ß Straße über', 'z. B. u. a. d. h. usw. bzw. ca.', 'Das ist, z.B., ein Test.',
    '', ' ', '.', 'Via', 'Via Murate', 'Murate Via', 'Via  Murate', "Via\tMurate", 'x'.repeat(300),
  ],
});

// ---- chunk-tags already present before the chunker (copy constructor keeps/loses chunk tags) ----
{
  const ctx = (c, s, tags) => ({ text: s, tags });
  const t = [
    ctx('en', 'We went to New York City today.', { 1: ['B-NP-singular', 'E-NP-singular'], 3: ['B-NP-singular'], 5: ['E-NP-singular'], 7: ['~regex.*'] }),
    ctx('en', 'New York City', { 1: ['A'], 2: ['B', 'C'], 3: ['D'] }),
    ctx('en', 'Boston Dynamics builds robots.', { 1: ['NP'], 3: ['VP', 'NP'], 4: ['NP'] }),
  ];
  write('pretags-en-00', 'en sentences whose tokens already carry chunk tags before the multiword chunkers run (tags kept or dropped by the readings copy), full dumps',
    [{ op: 'chunk-run', args: { lang: 'en-US', texts: t, jobs: [{ chain: CH.en.java, texts: [0, 1, 2] }, { chain: CH.en.mwc2, texts: [0, 1, 2] }, { chain: CH.en.mwc2b, texts: [0, 1, 2] }, { chain: CH.en.alone, texts: [0, 1, 2] }, { chain: [], texts: [0, 1, 2] }] } }]);
  stats.pretags = 3;
}

// ---- inline multiword files ----
const TAB = '\t';
const INL = [
  { name: 'comments', content: ['# comment', '', '   ', '#another', `New Foo${TAB}NNP`, `  Bar Baz${TAB}NN  `, `# New Foo${TAB}X`, `#separatorRegExp=;`, ''].join('\n'), desc: 'comments, blank lines, leading/trailing blanks, late separator directive (ignored: header is read only after the first line semantic, see Java)' },
  { name: 'tabs', content: [`alpha beta${TAB}AB`, `alpha${TAB}A`, `alpha beta gamma${TAB}ABG`, `beta  gamma${TAB}BG`].join('\n'), desc: 'prefix-overlapping entries, double space inside an entry, double tab (empty column)' },
  { name: 'doubletab', content: `delta${TAB}${TAB}D\nalpha${TAB}A`, desc: 'double tab (empty middle column) -> format error' },
  { name: 'dups', content: [`foo bar${TAB}T1`, `foo bar${TAB}T2`, `Foo Bar${TAB}T3`, `FOO BAR${TAB}T4`, `foo${TAB}F1`, `foo${TAB}F2`].join('\n'), desc: 'duplicate keys with different tags and cased variants' },
  { name: 'unicode', content: [`Zürich Hauptbahnhof${TAB}NNP`, `ÄÖÜ ß${TAB}X`, `straße${TAB}NN`, `İstanbul Üniversitesi${TAB}NNP`, `ǆ ǅ ǈ${TAB}Q`, `😀 smile${TAB}EMO`, `𝔘𝔫𝔦 𝔠𝔬𝔡𝔢${TAB}M`, `l'été d’été${TAB}FR`, `naïve café${TAB}NN`, `ΣΊΣΥΦΟΣ λόγος${TAB}GR`, `ǰ ŉ ﬁ ß${TAB}SPEC`].join('\n'), desc: 'unicode entries (umlauts, Turkish dotted I, titlecase digraphs, astral, special casing, apostrophes)' },
  { name: 'long', content: [`${Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ')}${TAB}LONG25`, `${Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')}${TAB}LONG20`, `${Array.from({ length: 19 }, (_, i) => `w${i}`).join(' ')}${TAB}LONG19`, `${'x'.repeat(500)}${TAB}XL`, `${'y'.repeat(100)} ${'z'.repeat(100)}${TAB}YZ`].join('\n'), desc: 'very long entries (19/20/25 tokens around MAX_TOKENS_IN_MULTIWORD, 500 chars)' },
  { name: 'punct', content: [`e.g.${TAB}ABBR`, `U.S.A.${TAB}USA`, `well-known fact${TAB}WK`, `3.14 pi${TAB}NUM`, `a b c${TAB}ABC`, `...${TAB}ELL`, `?!${TAB}QE`, `don't stop${TAB}DS`, `(foo)${TAB}PAR`, `foo (bar)${TAB}FPB`, `100 %${TAB}PCT`, `"quoted" word${TAB}Q`].join('\n'), desc: 'entries with punctuation (tokenizer splits, no-space concatenation path)' },
  { name: 'sepsemi', content: ['#separatorRegExp=;', 'Foo Bar;NN', 'baz;VB', 'a;b;c', 'x\ty;T'].join('\n'), desc: 'separatorRegExp directive ";" with 2 and 3 columns and tab inside entry' },
  { name: 'sepbad', content: ['#separatorRegExp=[', 'Foo Bar[NN'].join('\n'), desc: 'invalid separator regexp -> PatternSyntaxException' },
  { name: 'crlf', content: `crlf one${TAB}CR\r\ncrlf two${TAB}CR\r\n\r\n# c\r\nlast${TAB}L`, desc: 'CRLF line endings' },
  { name: 'lone', content: 'foo\nbar baz', desc: 'lines with a single column (no tag) -> format error' },
  { name: 'three', content: `foo${TAB}bar${TAB}baz`, desc: 'three columns -> format error' },
  { name: 'empty', content: '', desc: 'empty file' },
  { name: 'onlycomments', content: '# a\n# b\n\n', desc: 'only comments' },
  { name: 'defaulttag', content: ['plain one', 'Plain Two', `tabbed${TAB}x`, 'single', '# c', 'Iphone', 'iPhone', 'IPHONE'].join('\n'), desc: 'one-column file with default tag (tabbed line -> format error)' },
  { name: 'defaulttagok', content: ['plain one', 'Plain Two', 'single', 'Iphone', 'iPhone', 'IPHONE', 'foo bar baz', 'ǆ ǅ', 'ÜBER ALLES'].join('\n'), desc: 'one-column file with default tag, cased variants, camel case' },
  { name: 'mixedcase', content: [`new york${TAB}A`, `New York${TAB}B`, `NEW YORK${TAB}C`, `state of the art${TAB}D`, `State Of The Art${TAB}E`, `of the people${TAB}F`, `iPhone case${TAB}G`, `eBay store${TAB}H`, `McDonald's burger${TAB}I`].join('\n'), desc: 'cased variant generation (first capital, all upper, titlecase, camel case) for multi-token entries' },
  { name: 'sort', content: [`b a${TAB}1`, `a b${TAB}2`, `a${TAB}3`, `b${TAB}4`, `a b c d${TAB}5`, `a b c${TAB}6`, `a x${TAB}7`].join('\n'), desc: 'prefix overlaps and shared first tokens (greedy prefix lengths and order)' },
];
function inlineTexts(content) {
  const ents = [];
  let sep = '\t';
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#separatorRegExp=')) { sep = line.slice(17); continue; }
    if (line === '' || line[0] === '#') continue;
    let e;
    try { e = line.split(new RegExp(sep))[0]; } catch { e = line; }
    ents.push(e);
  }
  const out = [];
  for (const e of ents) {
    const f = forms(e.slice(0, 600));
    out.push(`${f[0]}`, `x ${f[0]} y.`, `${f[1]}.`, `${f[2]} ok`, `See ${f[3]}, and ${f[4]}!`, `${f[0]} ${f[0]}`);
  }
  out.push('A b c d e f g h.', 'foo bar baz qux', 'Foo Bar', 'plain one two', '');
  return [...new Set(out)];
}
INL.forEach((f, k) => {
  const path = `/inl/${f.name}.txt`;
  const T = inlineTexts(f.content).slice(0, 80);
  const idx = T.map((_, i) => i);
  const ops = [];
  const mk = (jobs, texts = T) => ({ op: 'chunk-run', args: { lang: 'en-US', files: { [path]: f.content }, texts, jobs } });
  const j = (chain, digest) => ({ chain, texts: idx, ...(digest ? { digest: true } : {}) });
  ops.push(mk([
    j([{ kind: 'mwc', file: path }]),
    j([{ kind: 'mwc', file: path, fc: true, au: true, tc: false }]),
    j([{ kind: 'mwc', file: path, fc: true, au: true, tc: true, ignoreSpelling: true, removePrev: true }]),
    j([{ kind: 'mwc', file: path, fc: false, au: true, tc: true }]),
    j([{ kind: 'mwc', file: path, fc: true, au: false, tc: false, tag: 'T' }]),
    j([{ kind: 'mwc', file: path, fc: true, au: true, tc: true, tag: 'NONE', ignoreSpelling: true }]),
    j([{ kind: 'mwc2', file: path }]),
    j([{ kind: 'mwc2', file: path, fc: true, removeOther: true }]),
    j([{ kind: 'mwc2', file: path, fc: true, wrap: false }]),
    j([{ kind: 'mwc2x', file: path, fc: true }]),
    j([{ kind: 'mwc', file: path, fc: true, au: true, tc: true }, { kind: 'mwc2', file: path, fc: true }]),
  ]));
  write(`inline-${pad(k)}-${f.name}`, `inline multiword file "${f.name}" (${f.desc}) through MultiWordChunker/2 option variants`, ops);
});
write('inline-errors', 'missing resource file, empty filename, null-ish names, unknown chain, de/fr tokenisation of inline file',
  [
    // getInstance("") removed: classpath directory listing - unreachable, see docs/review/unreachable.md
    { op: 'chunk-run', args: { lang: 'en-US', texts: ['New York'], jobs: [{ chain: [{ kind: 'mwc', file: '/no/such/file.txt' }], texts: [0] }, { chain: [{ kind: 'mwc2', file: '/no/such/file.txt' }], texts: [0] }, { chain: [{ kind: 'mwc', file: '/en/multiwords.txt', tag: 'NONE', fc: true, au: true, tc: false }], texts: [0] }, { chain: [{ kind: 'mwc', file: GFILE, fc: true, au: true, tc: false }], texts: [0] }, { chain: [{ kind: 'mwc2', file: GFILE }], texts: [0] }] } },
    { op: 'chunk-run', args: { lang: 'de-DE', files: { '/inl/de.txt': `Bahnhof Zürich${TAB}NNP\nz. B.${TAB}ABK\nEr sagt${TAB}X` }, texts: ['Der Bahnhof Zürich liegt hier, z. B. nahe.', 'Er sagt: Bahnhof Zürich.'], jobs: [{ chain: [{ kind: 'mwc', file: '/inl/de.txt', fc: true, au: true, tc: true }], texts: [0, 1] }, { chain: [{ kind: 'mwc2', file: '/inl/de.txt', fc: true }], texts: [0, 1] }] } },
    { op: 'chunk-run', args: { lang: 'fr', files: { '/inl/fr.txt': `l'été chaud${TAB}N\nQu'est-ce${TAB}Q\naujourd'hui${TAB}ADV` }, texts: ["Il fait l'été chaud. Qu'est-ce que c'est? Aujourd'hui, oui.", "L’été chaud"], jobs: [{ chain: [{ kind: 'mwc', file: '/inl/fr.txt', fc: true, au: true, tc: true }], texts: [0, 1] }, { chain: [{ kind: 'mwc2', file: '/inl/fr.txt', fc: true }], texts: [0, 1] }] } },
    { op: 'chunk-run', args: { lang: 'en-US', texts: ['New York'], jobs: [{ chain: [], texts: [0] }, { chain: [], texts: [] }, { chain: [{ kind: 'mwc', file: '/en/multiwords.txt' }], texts: [] }] } },
    { op: 'chunk-run', args: { lang: 'zz', texts: ['x'], jobs: [{ chain: [], texts: [0] }] } },
  ]);

// ---- ChunkTag ----
{
  const tags = [
    { tag: 'NP' }, { tag: 'NP', re: false }, { tag: 'NP', re: true }, { tag: 'B-NP.*', re: true }, { tag: 'B-NP-singular' }, { tag: 'E-NP-singular' }, { tag: 'B-NP.*' },
    { tag: null }, { tag: '' }, { tag: ' ' }, { tag: '\t\n' }, { tag: ' NP ' }, { tag: 'NP ', re: true }, { tag: '[', re: true }, { tag: '[' }, { tag: '(', re: true }, { tag: '*', re: true }, { tag: '.*', re: true },
    { tag: 'ÄÖÜ' }, { tag: 'äöü', re: true }, { tag: '\\p{Lu}+', re: true }, { tag: 'ÄÖÜ', re: true }, { tag: '😀' }, { tag: '(?i)np', re: true }, { tag: 'np' }, { tag: 'NP|VP', re: true }, { tag: 'VP' },
    { tag: 'x'.repeat(10000) }, { tag: 'x'.repeat(10000), re: true }, { tag: ' ' }, { tag: ' ' }, { tag: '\u0001' }, { tag: 'a\u0000b' }, { tag: '[a-' , re: true }, { tag: '(?<n>x)\\k<n>', re: true },
  ];
  const pairs = [];
  for (let i = 0; i < tags.length; i++) for (let j = 0; j < tags.length; j++) pairs.push([i, j]);
  chunks(pairs, 400).forEach((p, i) => write(`tag-${pad(i)}`, 'ChunkTag construction (null/empty/blank/invalid regexp), accessors, toString, hashCode, equals, matches over all pairs', [{ op: 'chunk-tag', args: { items: tags, pairs: p } }]));
  stats.tags = tags.length;
}
console.log(JSON.stringify(stats));
