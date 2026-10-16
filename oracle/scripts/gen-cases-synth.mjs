// Authors oracle/cases/X-SYNTH/*.json (inputs only; lemma/tag candidates come from X-TAGGER* fixtures and added.txt). Op synth: docs/review/F24-oracle.md.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-SYNTH');
const GOLD = path.join(ROOT, 'tests/golden');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const op = (args) => ({ op: 'synth', args });
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const uniq = (a) => [...new Set(a)];
const sample = (a, n) => (a.length <= n ? a : a.filter((_, i) => i % Math.ceil(a.length / n) === 0));
const RES = (l) => path.join(ROOT, `oracle/java-src/languagetool-language-modules/${l}/src/main/resources/org/languagetool/resource/${l}`);

// lemma -> tags from tagger fixtures
function harvest(ids) {
  const m = new Map();
  for (const id of ids) {
    const d = path.join(GOLD, id);
    if (!existsSync(d)) continue;
    for (const c of readdirSync(d)) {
      const f = path.join(d, c, 'responses.jsonl');
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
        const r = JSON.parse(line).result;
        if (!r || !Array.isArray(r.results)) continue;
        const walk = (x) => {
          if (!Array.isArray(x)) return;
          if (x.length === 6 && typeof x[0] === 'string' && Array.isArray(x[4])) {
            for (const rd of x[4]) if (rd[1] && rd[2]) { if (!m.has(rd[1])) m.set(rd[1], new Set()); m.get(rd[1]).add(rd[2]); }
            return;
          }
          x.forEach(walk);
        };
        walk(r.results);
      }
    }
  }
  return m;
}
// added.txt: form, lemma, tag
function added(l, sep = '\t') {
  const lines = readFileSync(path.join(RES(l), 'added.txt'), 'utf8').split('\n');
  let s = sep;
  const out = [];
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#separatorRegExp=')) s = line.replace('#separatorRegExp=', '');
    if (!line || line[0] === '#') continue;
    line = line.split('#')[0].trim();
    const p = line.split(s);
    if (p.length === 3) out.push({ form: p[0], lemma: p[1], tag: p[2] });
  }
  return out;
}
const title = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const lower = (w) => w.charAt(0).toLowerCase() + w.slice(1);
const syn = (lemma, tag, re, tok) => ({ m: 'synthesize', tok: tok ?? lemma, lemma, tag, ...(re === undefined ? {} : { re }) });
// regexes derived from a real tag: exact, prefix wildcard, middle wildcard
function regexes(tag) {
  const esc = tag.replace(/[+.*?()[\]{}|\\^$]/g, '\\$&');
  const parts = tag.split(/[: ]/);
  const out = [esc, '.*', `${parts[0].replace(/[+.*?()[\]{}|\\^$]/g, '\\$&')}.*`, `.*${parts[parts.length - 1].replace(/[+.*?()[\]{}|\\^$]/g, '\\$&')}`];
  if (parts.length > 2) out.push(`${esc.slice(0, esc.lastIndexOf(parts[parts.length - 1]) - 1)}.*`);
  return out;
}

const LANGS = {
  de: { lang: 'de-DE', ids: ['X-TAGGER-DE'], sep: '\t' },
  en: { lang: 'en-US', ids: ['X-TAGGER'], sep: '\t' },
  fr: { lang: 'fr', ids: ['X-TAGGER'], sep: ';' },
};
const EXTRA_TAGS = {
  de: ['SUB:NOM:SIN:MAS', 'SUB:DAT:PLU:FEM', 'VER:INF:NON', 'ADJ:PRD:GRU', 'PRO:PER:NOM:SIN:ALG', 'ART:DEF:NOM:SIN:MAS', 'SUB:AKK:SIN:NEU', 'ADJ:NOM:SIN:MAS:GRU:SOL', 'PRP:LOK+TMP:DAT', 'ZZ', '', 'NOSUCHTAG', 'sub:nom:sin:mas'],
  en: ['NN', 'NNS', 'NNP', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'JJ', 'JJR', 'JJS', 'RB', 'MD', 'PRP$', 'NN+DT', 'NN+INDT', 'JJ+DT', 'NNS+INDT', 'ZZ', '', 'NOSUCHTAG', 'nn'],
  fr: ['N m s', 'N f s', 'N m p', 'N f p', 'V inf', 'V ind pres 3 s', 'V ind pres 3 p', 'J m s', 'J f s', 'J e s', 'R pers suj 3 m s', 'ZZ', '', 'NOSUCHTAG', 'n m s'],
};
const LEMMA_EDGE = {
  de: ['', ' ', 'Haus', 'haus', 'HAUS', 'Haustür', 'Haustürschloss', 'Hausschlüssel', 'Arbeitszimmer', 'Geburtstagsfeier', 'E-Mail-Adresse', 'Baden-Württemberg', 'USB-Stick', 'Donaudampfschifffahrtsgesellschaft', 'ich', 'Ich', 'mein', 'unser', 'unsere', 'sie', 'Sie', 'ihr', 'Ihr', 'sein', 'haben', 'werden', 'gehen', 'müssen', 'wissen', 'schließen', 'beschließen', 'essen', 'Maß', 'Maße', 'Fuß', 'Füße', 'groß', 'Groß', 'ß', 'Ä', 'Österreich', 'Übermut', 'schön', 'Xyzabc', 'unbekanntlemma', 'Katze', 'Hund', 'Kind', 'Mann', 'Frau', 'der', 'die', 'das', 'ein', 'kein', 'dieser', 'jener', 'welcher'],
  en: ['', ' ', 'house', 'House', 'HOUSE', 'be', 'have', 'do', 'go', 'good', 'well', 'bad', 'man', 'woman', 'child', 'person', 'mouse', 'foot', 'I', 'me', 'my', 'you', 'he', 'they', 'a', 'an', 'the', 'ne\'er', 'e\'er', 'o\'er', 'ma\'am', 'informations', 'information', 'umbrella', 'hour', 'university', 'honest', 'hotel', 'one', 'FBI', 'xyzabc', 'cat', 'dog', 'run', 'can', 'will', 'must', 'not', 'n\'t', 'x', 'university student', 'Zürich', 'café', 'naïve'],
  fr: ['', ' ', 'maison', 'Maison', 'MAISON', 'être', 'avoir', 'aller', 'faire', 'pouvoir', 'savoir', 'beau', 'bon', 'petit', 'grand', 'le', 'la', 'les', 'un', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'qui', 'que', 'quelque', 'quelqu\'un', 'qqch', 'informer', 'burkinabè', 'koinè', 'épistémè', 'père', 'mère', 'très', 'xyzabc', 'chat', 'chien', 'œuf', 'cœur', 'Ça', 'ça', 'ç', 'été', 'élève', 'évènement'],
};
const NUMS_EDGE = ['0', '1', '2', '3', '10', '11', '12', '13', '19', '20', '21', '99', '100', '101', '110', '111', '120', '121', '200', '999', '1000', '1001', '1100', '1999', '2000', '2026', '9999', '10000', '12345', '100000', '123456', '999999', '1000000', '1000001', '2147483647', '2147483648', '-1', '-0', '-5', '-100', '-2147483648', '0.5', '1.5', '3.14', '1,5', '1.000', '1,000', '1 000', '01', '007', '00', '+5', '1e3', '12abc', 'abc', '', ' ', '١٢٣', '٣', '1２', '９９', '4294967296', '9223372036854775807', '9223372036854775808', '-9223372036854775808', '123456789012345678901234567890', '1000000000000', '1000000000000000000000', 'feminine', 'feminine 5', 'feminine 21', 'féminin 1'];
const ROMAN_EDGE = ['0', '1', '2', '3', '4', '5', '9', '14', '40', '49', '90', '99', '400', '499', '500', '900', '1000', '1994', '2026', '3999', '4000', '4999', '5000', '10000', '-1', '1.5', 'abc', '', ' ', 'XIV', '٣'];

for (const [code, cfg] of Object.entries(LANGS)) {
  const lang = cfg.lang;
  const ids = cfg.ids;
  const triples = harvest(ids);
  // restrict to language tag style (X-TAGGER holds en and fr): classify by tag style
  const isEn = (t) => /^(NN|VB|JJ|RB|MD|DT|IN|PRP|CC|CD|UH|WP|WDT|EX|FW|POS|PDT|RP|SYM|TO|WRB|LS)/.test(t);
  const filt = new Map();
  for (const [lem, tags] of triples) {
    const ts = [...tags].filter((t) => (code === 'en' ? isEn(t) : code === 'fr' ? /^[A-Z]( |$)/.test(t) : /^[A-Z]{2,}/.test(t)));
    if (ts.length && lem.length < 60) filt.set(lem, ts);
  }
  const lemmas = [...filt.keys()].sort();
  const pick = sample(lemmas, 300);
  const reals = [];
  const res = [];
  for (const lem of pick) {
    const tags = filt.get(lem);
    const tg = sample(tags, 3);
    for (const t of tg) { reals.push(syn(lem, t)); reals.push(syn(lem, t, false)); reals.push(syn(lem, t, true)); }
    for (const t of sample(tags, 2)) for (const r of regexes(t).slice(0, 4)) res.push(syn(lem, r, true));
  }
  chunks(reals, 120).forEach((c, i) => write(`${code}-lemma-tag-${String(i).padStart(2, '0')}`, `${code} synthesize lemma x real tag (2-arg, re=false, re=true)`, [op({ lang, calls: c })]));
  chunks(res, 120).forEach((c, i) => write(`${code}-regex-${String(i).padStart(2, '0')}`, `${code} synthesize regex tags (re=true), possibleTags iteration order`, [op({ lang, calls: c })]));
  // edge lemmas x extra tags, case variants
  const edge = [];
  for (const lem of LEMMA_EDGE[code]) for (const t of EXTRA_TAGS[code]) {
    edge.push(syn(lem, t)); edge.push(syn(lem, t, true));
  }
  chunks(edge, 150).forEach((c, i) => write(`${code}-edge-${String(i).padStart(2, '0')}`, `${code} edge lemmas x extra tags`, [op({ lang, calls: c })]));
  // case variants of real lemmas
  const cv = [];
  for (const lem of sample(pick, 60)) {
    const t = filt.get(lem)[0];
    for (const v of uniq([title(lem), lower(lem), lem.toUpperCase(), lem.toLowerCase()])) { cv.push(syn(v, t)); cv.push(syn(v, '.*', true)); }
  }
  chunks(cv, 150).forEach((c, i) => write(`${code}-case-${String(i).padStart(2, '0')}`, `${code} case variants of lemmas`, [op({ lang, calls: c })]));
  // token != lemma, token null, lemma null, tag null
  const nul = [];
  for (const lem of sample(pick, 20)) {
    const t = filt.get(lem)[0];
    nul.push(syn(lem, t, undefined, 'OTHER'), syn(lem, t, false, ''), { m: 'synthesize', tok: 'x', lemma: null, tag: t }, { m: 'synthesize', tok: 'x', lemma: null, tag: t, re: true }, { m: 'synthesize', tok: null, lemma: lem, tag: t }, { m: 'synthesize', tok: null, lemma: lem, tag: t, re: true });
  }
  nul.push({ m: 'synthesize', tok: 'a', lemma: 'a', tag: null }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: true }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: false },
    { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: true }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: false },
    { m: 'synthesize', tokNull: true, lemma: 'a', tag: '_spell_number_' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: '_spell_number_:Roman' });
  for (const bad of ['(', '[', '*', '+', '?x', '(?<', '\\', '{1}', 'a{2,1}', '[z-a]', '(?i', ')']) nul.push(syn('a', bad, true));
  write(`${code}-null-regexerr`, `${code} null token/lemma/tag, bad regex syntax`, [op({ lang, calls: nul })]);
  // misc API
  const misc = [{ m: 'possibleTags' }, { m: 'posTagCorrection', tag: 'X' }, { m: 'posTagCorrection', tag: null }, { m: 'posTagCorrection', tag: '' },
    { m: 'targetPosTag', tags: [], target: 'T' }, { m: 'targetPosTag', tags: ['A'], target: 'T' }, { m: 'targetPosTag', tags: ['A', 'B', 'C'], target: 'T' }, { m: 'targetPosTag', tags: [], target: null }, { m: 'targetPosTag', tags: null, target: 'T' }, { m: 'targetPosTag', tags: ['A', null], target: 'T' }];
  for (const lem of sample(pick, 40)) for (const t of sample(filt.get(lem), 2)) misc.push({ m: 'lookup', lemma: lem, tag: t });
  misc.push({ m: 'lookup', lemma: null, tag: 'X' }, { m: 'lookup', lemma: 'a', tag: null }, { m: 'lookup', lemma: '', tag: '' });
  write(`${code}-api`, `${code} getPossibleTagsForSynthesis, getTargetPosTag, getPosTagCorrection, protected lookup`, [op({ lang, calls: misc })]);
  // number spelling
  const nums = [];
  for (let i = 0; i <= 120; i++) nums.push(String(i));
  nums.push(...NUMS_EDGE);
  const sp = nums.flatMap((n) => [{ m: 'spell', n }, { m: 'roman', n }, syn(n, '_spell_number_'), syn(n, '_spell_number_:feminine', true), syn(n, '_spell_number_:Roman', true), syn('x', '_spell_number_', undefined, n), syn('x', '_spell_number_:feminine', undefined, n), syn('x', '_spell_number_:Roman', undefined, n), syn('x', '_spell_number_', true, n)]);
  sp.push({ m: 'spell', n: null }, { m: 'roman', n: null }, syn('x', '_spell_number_', undefined, null), syn('x', '_spell_number_:feminine', undefined, null), syn('x', '_spell_number_:Roman', undefined, null));
  chunks(sp, 200).forEach((c, i) => write(`${code}-spell-${String(i).padStart(2, '0')}`, `${code} number spelling 0..120 + edge (getSpelledNumber, getRomanNumber, _spell_number_* tags)`, [op({ lang, calls: c })]));
  const big = [];
  for (let i = 121; i <= 4100; i += (i < 1000 ? 7 : i < 2000 ? 53 : 197)) big.push(String(i));
  for (const e of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18]) { big.push('1' + '0'.repeat(e), '2' + '0'.repeat(e), '1' + '0'.repeat(e - 1) + '1', '9'.repeat(e)); }
  const sp2 = big.flatMap((n) => [{ m: 'spell', n }, { m: 'roman', n }, { m: 'spell', n: 'feminine ' + n }]);
  chunks(sp2, 200).forEach((c, i) => write(`${code}-spell-big-${String(i).padStart(2, '0')}`, `${code} number spelling large numbers`, [op({ lang, calls: c })]));
  // manual synthesizer (added.txt / removed / do-not-synthesize), tags order
  const mlang = code;
  const mfiles = [['added.txt'], ['added_custom.txt'], ['removed.txt'], ['removed_custom.txt']].concat(existsSync(path.join(RES(code), 'do-not-synthesize.txt')) ? [['do-not-synthesize.txt']] : []);
  const addedEntries = added(code, cfg.sep);
  const mp = [];
  for (const f of mfiles) if (existsSync(path.join(RES(code), f[0]))) {
    const body = readFileSync(path.join(RES(code), f[0]), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && l[0] !== '#' && l.split('#')[0].trim().split(f[0].startsWith('added') && code === 'fr' ? ';' : '\t').length === 3);
    const sepFr = code === 'fr' ? ';' : '\t';
    const ents = body.map((l) => l.split('#')[0].trim().split(sepFr)).map((p) => ({ form: p[0], lemma: p[1], tag: p[2] }));
    mp.push({ f: f[0], ents });
  }
  for (const { f, ents } of mp) {
    const sel = sample(ents, 250);
    const calls = [{ m: 'possibleTags' }, ...sel.map((e) => ({ m: 'lookup', lemma: e.lemma, tag: e.tag }))];
    for (const e of sample(ents, 40)) calls.push({ m: 'lookup', lemma: e.lemma, tag: e.tag + 'X' }, { m: 'lookup', lemma: e.lemma.toUpperCase(), tag: e.tag }, { m: 'lookup', lemma: e.form, tag: e.tag });
    calls.push({ m: 'lookup', lemma: null, tag: null }, { m: 'lookup', lemma: '', tag: '' });
    write(`${code}-manual-${f.replace(/\.txt$/, '').replace(/_/g, '-')}`, `${code} ManualSynthesizer from ${f}: lookup order, possibleTags order`, [op({ impl: 'manual', lang: mlang, files: [f], calls })]);
  }
  // via synthesizer: lemmas from added.txt (manual forms merged into dictionary results; regex over tags incl. manual tags)
  const sel = sample(addedEntries, 250);
  const calls = [];
  for (const e of sel) { calls.push(syn(e.lemma, e.tag), syn(e.lemma, e.tag, true), syn(e.lemma, regexes(e.tag)[2], true)); }
  chunks(calls, 150).forEach((c, i) => write(`${code}-added-synth-${String(i).padStart(2, '0')}`, `${code} synthesizer on lemmas from added.txt (manual merge, removal files, tag order)`, [op({ lang, calls: c })]));
}

// ManualSynthesizer inline content: separators, suffix encoding, errors
const MC = (name, description, content, lookups) => write(`manual-inline-${name}`, description, [op({ impl: 'manual', content, calls: [{ m: 'possibleTags' }, ...lookups.map(([lemma, tag]) => ({ m: 'lookup', lemma, tag })), { m: 'lookup', lemma: null, tag: 'A' }, { m: 'lookup', lemma: 'x', tag: null }] })]);
MC('basic', 'inline: form lemma tag, comments, blank, multi-forms', '# c\n\nhaus\thaus\tN\nhäuser\thaus\tN\nhaeuser\thaus\tN\nhäuslein\thaus\tN\nhaus\thaus\tM #comment\n  \nrun\trun\tV\nran\trun\tV\n', [['haus', 'N'], ['haus', 'M'], ['Haus', 'N'], ['haus', 'V'], ['run', 'V'], ['', ''], ['run', 'N']]);
MC('suffix', 'inline: suffix encoding variants (word starts with lemma, shares lemma-1, unrelated)', 'abc\tabc\tT1\nabcd\tabc\tT1\nabd\tabc\tT1\nxyz\tabc\tT1\nab\tabc\tT1\na\tabc\tT1\nabce\tabc\tT2\nz\tz\tT3\nzz\tz\tT3\ny\tz\tT3\n\n', [['abc', 'T1'], ['abc', 'T2'], ['z', 'T3'], ['z', 'T1']]);
MC('sep', 'inline: #separatorRegExp', '#separatorRegExp=;\na;b;C\nb;b;C\nä;ö;D\n', [['b', 'C'], ['ö', 'D'], ['a', 'C']]);
MC('sep-pipe', 'inline: separatorRegExp with regex special', '#separatorRegExp=\\|\na|b|C\nc|b|C\n', [['b', 'C']]);
MC('dupes', 'inline: duplicate forms, many tags (possibleTags order)', [...Array.from({ length: 60 }, (_, i) => `f${i}\tl${i % 7}\tTAG${i % 23}`), 'f0\tl0\tTAG0', 'f0\tl0\tTAG0'].join('\n') + '\n', [['l0', 'TAG0'], ['l1', 'TAG1'], ['l6', 'TAG20'], ['l3', 'TAG3']]);
MC('manytags', 'inline: 300 distinct tags (set order after rehash)', Array.from({ length: 300 }, (_, i) => `w${i}\tl\tTAG:${i}:${i % 5}`).join('\n') + '\n', [['l', 'TAG:0:0'], ['l', 'TAG:299:4'], ['l', 'TAG:150:0']]);
MC('unicode', 'inline: unicode lemma/tag', 'Äpfel\tApfel\tSUB:PLU\nÄpfeln\tApfel\tSUB:DAT\n😀s\t😀\tE\nß\tß\tX\nSS\tß\tX\n', [['Apfel', 'SUB:PLU'], ['😀', 'E'], ['ß', 'X']]);
MC('empty', 'inline: empty file', '', [['a', 'b']]);
MC('commentsonly', 'inline: only comments', '# a\n#b\n', [['a', 'b']]);
MC('crlf', 'inline: CRLF line endings and trailing whitespace', 'a\tb\tC\r\nd\tb\tC  \r\n', [['b', 'C']]);
MC('badline', 'inline: error, 2 columns', 'a\tb\n', []);
MC('badline4', 'inline: error, 4 columns', 'a\tb\tc\td\n', []);
MC('badplus', 'inline: error, word starts with +', '+a\tb\tc\n', []);
MC('hashinline', 'inline: # inside line cut', 'a\tb\tc # x\td#\te\tf\n', [['b', 'c']]);
MC('sepinvalid', 'inline: invalid separator regexp', '#separatorRegExp=(\na\tb\tc\n', [['b', 'c']]);
MC('sepempty', 'inline: empty separatorRegExp splits into chars', '#separatorRegExp=\nabc\n', []);
MC('sepspace', 'inline: space separator', '#separatorRegExp= \na b C\nb b C\n', [['b', 'C']]);
console.log(readdirSync(DIR).length + ' case files');
