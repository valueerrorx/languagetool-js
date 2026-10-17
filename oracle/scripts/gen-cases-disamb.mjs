// Authors X-RULELOAD cases disamb-* (inputs only; never removes other cases). Ops rule-load modes disamb-file / disamb-inline.
// Phase 1: `node oracle/scripts/gen-cases-disamb.mjs --phase1` writes disamb-counts; run `npm run oracle -- X-RULELOAD disamb-counts`; then rerun without flag.
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-RULELOAD');
const GOLD = path.join(ROOT, 'tests/golden/X-RULELOAD');
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const dop = (args) => ({ op: 'rule-load', args });
const LANGS = ['de-DE', 'en-US', 'fr'];

write('disamb-counts', 'disambiguation.xml rule counts de-DE/en-US/fr', LANGS.map((lang) => dop({ mode: 'disamb-file', lang, offset: 0, limit: 0 })));
if (process.argv.includes('--phase1')) process.exit(0);
const goldPath = path.join(GOLD, 'disamb-counts', 'responses.jsonl');
if (!existsSync(goldPath)) { console.log('run oracle for disamb-counts first'); process.exit(1); }
const counts = readFileSync(goldPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).result.total);

for (const f of readdirSync(DIR)) if (/^disamb-(list|inline)/.test(f)) rmSync(path.join(DIR, f));
const CHUNK = 250;
LANGS.forEach((lang, k) => {
  for (let off = 0, n = 0; off < Math.max(counts[k], 1); off += CHUNK, n++) {
    write(`disamb-list-${lang}-${String(n).padStart(2, '0')}`, `${lang} disambiguation.xml rules ${off}.. (total ${counts[k]}, full detail)`,
      [dop({ mode: 'disamb-file', lang, offset: off, limit: CHUNK, detail: true })]);
  }
});

// ---- inline ----
const W = (body, attrs = 'lang="en"') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules ${attrs}>\n${body}\n</rules>\n`;
const P = '<pattern><token>foo</token></pattern>';
const D = (attrs = 'action="remove" postag="NN"') => `<disambig ${attrs}/>`;
const R = (inner, attrs = 'id="R1" name="Rule one"') => `<rule ${attrs}>${inner}</rule>`;
const RS = (pattern = P, disamb = D(), extra = '', attrs) => R(`${pattern}${disamb}${extra}`, attrs);
const cases = new Map();
const add = (name, desc, items) => cases.set(name, [desc, items.map((x) => (typeof x === 'string' ? { lang: 'en-US', xml: x } : x))]);

add('basic', 'minimal rules, ids, names, rulegroups and subIds', [
  W(RS()), W(RS(P, D(), '', 'id="R1"')), W(RS(P, D(), '', 'name="n"')), W(RS(P, D(), '', '')),
  W(`<rulegroup id="G" name="Grp">${RS(P, D(), '', '')}${RS(P, D('action="add"'), '', '')}${RS(P, D(), '', 'id="OWN" name="own"')}</rulegroup>`),
  W(`<rulegroup>${RS(P, D(), '', '')}${RS(P, D(), '', '')}</rulegroup>`),
  W(`<rulegroup name="NoId">${RS(P, D(), '', '')}</rulegroup>`),
  W(`<rulegroup id="G">${RS(P, D(), '', '')}</rulegroup>${RS(P, D(), '', 'id="AFTER" name="after"')}`),
  W(RS(P, D(), '', 'id="A"') + RS(P, D(), '', 'id="A"')),
  W(''), '', '<rules/>', W(RS(), 'lang="de"'), W(RS(), 'lang="zz"'), W(RS(), ''),
  { lang: 'en-US', xml: W(RS()), filename: 'x/y.xml' }, { lang: 'de-DE', xml: W(RS(), 'lang="en"') }, { lang: 'fr', xml: W(RS(), 'lang="en"') },
]);
const actions = ['add', 'remove', 'replace', 'filter', 'filterall', 'unify', 'immunize', 'ignore_spelling', 'addchunk', 'ADD', 'Remove', 'FilterAll', 'IGNORE_SPELLING', 'bogus', '', 'ignore-spelling', ' add'];
add('actions', 'disambig action values with and without postag/wd', [
  ...actions.map((a) => W(RS(P, D(`action="${a}" postag="NN"`)))),
  ...actions.map((a) => W(RS(P, D(`action="${a}"`)))),
  ...actions.map((a) => W(RS(P, `<disambig action="${a}"><wd lemma="foo" pos="NN">foo</wd></disambig>`))),
  W(RS(P, '<disambig/>')), W(RS(P, '<disambig postag="NN"/>')), W(RS(P, '<disambig postag=""/>')), W(RS(P, '<disambig postag="NN|VB"/>')),
  W(RS(P, '')), W(RS(P, D() + D('action="add" postag="VB"'))),
  W(RS(P, '<disambig action="filter"><match no="1" postag="N.*" postag_regexp="yes">x</match></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1">lemma</match></disambig>')),
  W(RS(P, '<disambig action="filter"><match>lemma</match></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="2"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="0"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="-1"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="abc"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no=""/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="99999999999"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="allupper" include_skipped="all" setpos="yes" suppress_mispelled="yes" postag_replace="X" regexp_match="a(b)" regexp_replace="$1">z</match></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="bogus"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" include_skipped="bogus"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="STARTUPPER" include_skipped="Following"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="startlower"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="nothing"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="preserve"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" case_conversion="alllower" include_skipped="following"/></disambig>')),
  W(RS(P, '<disambig action="filter"><match no="1" regexp_match="(" regexp_replace="x"/></disambig>')),
]);
const WD = (w, l, p) => `<wd${l !== undefined ? ` lemma="${l}"` : ''}${p !== undefined ? ` pos="${p}"` : ''}>${w}</wd>`;
const PAT2 = '<pattern><marker><token>a</token><token>b</token></marker></pattern>';
const PAT3 = '<pattern><token>x</token><marker><token>a</token><token>b</token></marker><token>y</token></pattern>';
add('wd', 'wd elements: attributes, counts vs marker tokens, per action', [
  W(RS(P, `<disambig action="replace">${WD('foo', 'foo', 'NN')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('foo', 'foo', 'NN')}${WD('bar', 'bar', 'VB')}</disambig>`)),
  W(RS(PAT2, `<disambig action="replace">${WD('a', 'a', 'X')}${WD('b', 'b', 'Y')}</disambig>`)),
  W(RS(PAT2, `<disambig action="replace">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT3, `<disambig action="replace">${WD('a', 'a', 'X')}${WD('b', 'b', 'Y')}</disambig>`)),
  W(RS(PAT3, `<disambig action="replace">${WD('a', 'a', 'X')}${WD('b', 'b', 'Y')}${WD('c', 'c', 'Z')}</disambig>`)),
  W(RS(PAT2, `<disambig action="replace" postag="NN"/>`)),
  W(RS(PAT2, `<disambig action="filter" postag="NN"/>`)),
  W(RS(PAT2, `<disambig action="filter"><match no="1"/></disambig>`)),
  W(RS(PAT2, `<disambig action="add">${WD('a', 'a', 'X')}${WD('b', 'b', 'Y')}</disambig>`)),
  W(RS(PAT2, `<disambig action="add">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="remove">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="addchunk">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="filterall">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="unify">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="immunize">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(PAT2, `<disambig action="ignore_spelling">${WD('a', 'a', 'X')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('foo')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('foo', 'l')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('foo', undefined, 'P')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('', '', '')}</disambig>`)),
  W(RS(P, `<disambig action="replace"><wd lemma="l" pos="P"/></disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('  spaced  ', 'l', 'P')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('Ünïcödé ß 日本', 'ü', 'N:ä')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('&amp;&lt;&#x41;', 'a&amp;b', 'P')}</disambig>`)),
  W(RS(P, `<disambig action="replace"><wd lemma="l" pos="P">fo<![CDATA[o&]]>bar</wd></disambig>`)),
  W(RS(P, `<disambig action="replace" postag="NN">${WD('foo', 'foo', 'NN')}</disambig>`)),
  W(RS(P, `<disambig action="replace">${WD('foo', 'foo', 'NN')}<match no="1"/></disambig>`)),
  W(RS(P, `<disambig action="add">${WD('foo', 'foo', 'NN')}</disambig>`, '', 'id="A" name="a"') + RS(P, '<disambig action="replace"/>', '', 'id="B" name="b"')),
  W(RS(P, `<disambig action="add">${WD('foo', 'foo', 'NN')}</disambig>`) + RS(P, `<disambig action="add"/>`, '', 'id="B" name="b"')),
  W(RS(P, `<disambig action="replace">${WD('foo', 'foo', 'NN')}</disambig>`) + RS(P, `<disambig action="replace" postag="X"/>`, '', 'id="B" name="b"')),
]);
const tok = (attrs, body = 'foo') => `<token ${attrs}>${body}</token>`;
add('markers', 'marker positions, matched token counts, errors for replace/filter/unify', [
  W(RS('<pattern><marker><token>a</token></marker><token>b</token></pattern>')),
  W(RS('<pattern><token>a</token><marker><token>b</token></marker></pattern>')),
  W(RS('<pattern><token>a</token><marker><token>b</token><token>c</token></marker><token>d</token></pattern>', D('action="remove" postag="X"'))),
  W(RS('<pattern><token>a</token><marker><token>b</token><token>c</token></marker><token>d</token></pattern>', D('action="replace" postag="X"'))),
  W(RS('<pattern><token>a</token><marker><token>b</token><token>c</token></marker><token>d</token></pattern>', D('action="filter" postag="X"'))),
  W(RS('<pattern><token>a</token><token>b</token></pattern>', D('action="filter" postag="X"'))),
  W(RS('<pattern><token>a</token><token>b</token></pattern>', D('action="replace" postag="X"'))),
  W(RS('<pattern><token>a</token><token>b</token></pattern>', D('action="remove" postag="X"'))),
  W(RS('<pattern><token>a</token><token>b</token><token>c</token></pattern>', D('action="filter"><match no="1"/></disambig><!--'))),
  W(RS('<pattern><marker><token>a</token></marker><marker><token>b</token></marker></pattern>')),
  W(RS('<pattern><marker><token>a</token><marker><token>b</token></marker></marker></pattern>')),
  W(RS('<pattern><marker><token>a</token></pattern>')),
  W(RS('<pattern><marker><and><token>a</token><token postag="X"/></and><token>b</token></marker></pattern>', D('action="remove" postag="X"'))),
  W(RS('<pattern><marker><and><token>a</token><token postag="X"/></and><token>b</token></marker></pattern>', D('action="filter" postag="X"'))),
  W(RS('<pattern><token>a</token><marker></marker><token>b</token></pattern>')),
  W(RS('<pattern><marker></marker></pattern>')),
  W(RS('<pattern></pattern>')),
  W(RS('<pattern><token/></pattern>')),
  W(RS('')),
  W(RS('<pattern><token>a</token></pattern><pattern><token>b</token></pattern>')),
  W(RS('<pattern case_sensitive="yes"><token>A</token></pattern>')),
  W(RS('<pattern case_sensitive="no"><token>A</token></pattern>')),
  W(RS('<pattern case_sensitive="YES"><token>A</token></pattern>')),
  W(RS('<pattern case_sensitive="yes"><token>A</token></pattern>') + RS('<pattern><token>A</token></pattern>', D(), '', 'id="R2" name="n2"')),
  W(`<rulegroup id="G" name="g">${RS('<pattern><marker><token>a</token></marker></pattern>', D(), '', '')}${RS('<pattern><token>b</token></pattern>', D(), '', '')}</rulegroup>`),
]);
add('tokens', 'token attributes in disambiguation patterns (shared token handling)', [
  W(RS(`<pattern>${tok('regexp="yes"', 'f.o')}</pattern>`)),
  W(RS(`<pattern>${tok('postag="NN.*" postag_regexp="yes"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('postag="NN" negate_pos="yes"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('inflected="yes"', 'be')}</pattern>`)),
  W(RS(`<pattern>${tok('negate="yes"', 'be')}</pattern>`)),
  W(RS(`<pattern>${tok('case_sensitive="yes"', 'Be')}</pattern>`)),
  W(RS(`<pattern>${tok('skip="2"')}${tok('min="0" max="3"')}</pattern>`)),
  W(RS(`<pattern>${tok('skip="-1"')}${tok('min="2" max="1"')}</pattern>`)),
  W(RS(`<pattern>${tok('skip="x"')}</pattern>`)),
  W(RS(`<pattern>${tok('spacebefore="yes"')}${tok('spacebefore="no"')}${tok('spacebefore="ignore"')}</pattern>`)),
  W(RS(`<pattern>${tok('chunk="B-NP-singular"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('chunk_re="B-NP.*"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('', 'a|b|c')}</pattern>`)),
  W(RS(`<pattern><token>a<exception>b</exception></token></pattern>`)),
  W(RS(`<pattern><token>a<exception postag="X" scope="next">b</exception></token></pattern>`)),
  W(RS(`<pattern><token>a<exception scope="previous" regexp="yes">b.*</exception><exception inflected="yes" negate="yes" negate_pos="yes" postag="Q" postag_regexp="yes">z</exception></token></pattern>`)),
  W(RS(`<pattern><token postag="NN">a<match no="1" postag="X"/></token></pattern>`)),
  W(RS(`<pattern><token>a</token><token><match no="1"/></token></pattern>`)),
  W(RS(`<pattern><token>a</token><token><match no="2"/></token></pattern>`)),
  W(RS(`<pattern><token><match no="1"/></token></pattern>`)),
  W(RS(`<pattern><token>a</token><token><match no="1" postag="X" postag_regexp="yes" case_conversion="allupper">z</match></token></pattern>`)),
  W(RS(`<pattern><token>a</token><token><match no="x"/></token></pattern>`)),
  W(RS(`<pattern><and><token>a</token><token postag="X"/></and></pattern>`)),
  W(RS(`<pattern><and><token>a</token><token postag="X"/><token inflected="yes">q</token></and><token>b</token></pattern>`)),
  W(RS(`<pattern><token>a</token><token>b</token></pattern>`, D('action="unify"'))),
  W(RS(`<pattern><or><token>a</token><token>b</token></or></pattern>`)),
  W(RS(`<pattern><token bogus="1">a</token></pattern>`)),
  W(RS(`<pattern>${tok('postag="N" postag_regexp="yes" negate_pos="maybe"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('inflected="maybe"', 'x')}</pattern>`)),
  W(RS(`<pattern>${tok('regexp="yes"', '(')}</pattern>`)),
  W(RS(`<pattern>${tok('postag="(" postag_regexp="yes"', '')}</pattern>`)),
  W(RS(`<pattern>${tok('', 'Ünïcödé ß 日本 😀')}</pattern>`)),
  W(RS(`<pattern>${tok('regexp="yes"', '\\p{L}+')}</pattern>`)),
]);
add('antipatterns', 'antipatterns in rules and rulegroups, ids, markers, null_antipattern quirk', [
  W(RS(P, D(), '<antipattern><token>x</token></antipattern>')),
  W(RS(P, D(), '<antipattern><token>x</token></antipattern><antipattern><token>y</token><token>z</token></antipattern>')),
  W(RS(P, D(), '<antipattern><marker><token>x</token></marker><token>y</token></antipattern>')),
  W(RS(P, D(), '<antipattern case_sensitive="yes"><token>X</token></antipattern>')),
  W(R(`<antipattern><token>x</token></antipattern>${P}${D()}`)),
  W(R(`${P}<antipattern><token>x</token></antipattern>${D()}`)),
  W(R(`<antipattern><token>x</token></antipattern><antipattern><token>y</token></antipattern>${P}${D()}`, 'id="R1" name="n"') + R(`${P}${D()}`, 'id="R2" name="n2"')),
  W(`<rulegroup id="G" name="g"><antipattern><token>gx</token></antipattern>${RS(P, D(), '', '')}${RS(P, D(), '<antipattern><token>rx</token></antipattern>', '')}${RS(P, D(), '', '')}</rulegroup>`),
  W(`<rulegroup><antipattern><token>gx</token></antipattern>${RS(P, D(), '', '')}</rulegroup>`),
  W(`<rulegroup>${RS(P, D(), '<antipattern><token>rx</token></antipattern>', '')}</rulegroup>`),
  W(`<rulegroup id="G">${RS(P, D(), '<antipattern><token>rx</token></antipattern><antipattern><token>ry</token></antipattern>', '')}${RS(P, D(), '<antipattern><token>rz</token></antipattern>', '')}</rulegroup>`),
  W(`<rulegroup id="G"><antipattern><token>gx</token></antipattern><antipattern><token>gy</token></antipattern>${RS(P, D(), '<antipattern><token>rx</token></antipattern>', '')}</rulegroup>${RS(P, D(), '', 'id="OUT" name="out"')}`),
  W(`<rulegroup id="G1">${RS(P, D(), '<antipattern><token>a</token></antipattern>', '')}</rulegroup><rulegroup id="G2">${RS(P, D(), '', '')}</rulegroup>`),
  W(RS(P, D(), '<antipattern></antipattern>')),
  W(RS(P, D(), '<antipattern><token>x<exception>y</exception></token></antipattern>')),
  W(RS(P, D(), '<antipattern><marker><token>x</token></marker></antipattern>', 'id="R1"')),
  W(`<rulegroup name="g"><antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="OWN" name="n"')}</rulegroup>`),
  W(`<rulegroup name="g"><antipattern><token>gx</token></antipattern><antipattern><token>gy</token></antipattern>${RS(P, D(), '', 'id="OWN" name="n"')}${RS(P, D(), '', 'id="OWN2" name="n2"')}</rulegroup>`),
  W(`<rulegroup name="g">${RS(P, D(), '', 'id="OWN" name="n"')}<antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="OWN2" name="n2"')}</rulegroup>`),
  W(RS(P, D(), '', 'id="PREV" name="p"') + `<rulegroup name="g"><antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="NEXT" name="n"')}</rulegroup>`),
  W(`<antipattern><token>top</token></antipattern>${RS(P, D(), '', 'id="FIRST" name="n"')}`),
  W(`<rulegroup><antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="OWN" name="n"')}</rulegroup>`),
  W(`<rulegroup id="G"><antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="OWN" name="n"')}</rulegroup>`),
  W(`<rulegroup id="G" name="g"><antipattern><token>gx</token></antipattern>${RS(P, D(), '', 'id="OWN" name="n"')}</rulegroup>`),
  W(R(`<antipattern><token>x</token></antipattern>${P}${D()}`, 'name="noid"')),
  W(R(`<antipattern><token>x</token></antipattern>${P}${D()}`, '')),
  W(RS(P, D(), '<antipattern><token>x</token></antipattern>') + RS(P, D(), '', 'id="R2" name="n"')),
  W(RS(P, D(), '<antipattern><token>x</token></antipattern>', 'id="R1" name="a"') + RS(P, D(), '<antipattern><token>y</token></antipattern>', 'id="R2" name="b"')),
  W(`<antipattern><token>top</token></antipattern>${RS()}`),
  W(RS(P, D(), '<antipattern><token>x</token></antipattern><example type="untouched">foo</example>')),
  W(RS(P, D(), '<antipattern><token postag="X"><match no="1"/></token></antipattern>')),
]);
const EX = (type, body, extra = '') => `<example type="${type}"${extra}>${body}</example>`;
add('examples', 'example element: types, attributes, markers, mixed content', [
  W(RS(P, D(), EX('untouched', 'foo'))),
  W(RS(P, D(), EX('untouched', 'a <marker>foo</marker> b'))),
  W(RS(P, D(), EX('ambiguous', 'a <marker>foo</marker> b', ' inputform="foo[foo/NN]" outputform="foo[foo/VB]"'))),
  W(RS(P, D(), EX('ambiguous', 'a <marker>foo</marker> b'))),
  W(RS(P, D(), EX('ambiguous', 'a <marker>foo</marker> b', ' inputform="x"'))),
  W(RS(P, D(), EX('ambiguous', 'a <marker>foo</marker> b', ' outputform="y"'))),
  W(RS(P, D(), EX('bogus', 'a <marker>foo</marker> b', ' inputform="x" outputform="y"'))),
  W(RS(P, D(), EX('', 'a'))),
  W(RS(P, D(), '<example>no type</example>')),
  W(RS(P, D(), EX('untouched', '') + EX('untouched', 'two'))),
  W(RS(P, D(), EX('untouched', 'u1') + EX('ambiguous', 'a1', ' inputform="i" outputform="o"') + EX('untouched', 'u2') + EX('ambiguous', 'a2', ' inputform="i2" outputform="o2"'))),
  W(RS(P, D(), EX('untouched', 'a <marker>foo</marker> <marker>bar</marker>'))),
  W(RS(P, D(), EX('untouched', 'a <marker>foo <marker>bar</marker></marker>'))),
  W(RS(P, D(), EX('untouched', 'a </marker>foo'))),
  W(RS(P, D(), EX('untouched', '  indented\n\t text  with   spaces \n'))),
  W(RS(P, D(), EX('untouched', 'Ünïcödé ß 日本 😀 &amp; &lt;x&gt;'))),
  W(RS(P, D(), EX('untouched', '<![CDATA[<raw> & stuff]]>'))),
  W(RS(P, D(), EX('ambiguous', '<marker>foo</marker>', ' inputform="Ünï[ü/N]" outputform="日本[x/Y]"'))),
  W(RS(P, D(), EX('untouched', 'x') + EX('untouched', 'y'), 'id="R1" name="a"') + RS(P, D(), EX('ambiguous', 'z', ' inputform="i" outputform="o"'), 'id="R2" name="b"')),
  W(RS(P, D(), EX('ambiguous', 'a', ' inputform="i" outputform="o"')) + RS(P, D(), EX('ambiguous', 'b'), 'id="R2" name="b"')),
  W(RS(P, D(), EX('untouched', 'u')) + RS(P, D(), '', 'id="R2" name="b"')),
  W(`<rulegroup id="G">${RS(P, D(), EX('untouched', 'u'), '')}${RS(P, D(), '', '')}</rulegroup>`),
  W(RS(P, D(), `<example type="untouched">pre<tag>inner</tag>post</example>`)),
  W(R(`${EX('untouched', 'before pattern')}${P}${D()}`)),
  W(R(`${P}${EX('untouched', 'before disambig')}${D()}`)),
  W(RS(P, D(), '<example type="untouched" extra="1">q</example>')),
  W(RS(P, D(), '<example>&#x1F600;</example>')),
]);
add('filter-unify', 'filter element and unify/unification blocks', [
  W(RS(P, D(), '<filter class="org.languagetool.rules.patterns.RuleFilter" args="a:b"/>')),
  W(RS(P, D(), '<filter class="no.such.Filter" args="a:b"/>')),
  W(RS(P, D(), '<filter class="" args=""/>')),
  W(RS(P, D(), '<filter/>')),
  W(RS(P, D(), '<filter class="org.languagetool.rules.patterns.RuleFilter"/>')),
  W(RS(P, D(), '<filter class="java.lang.String" args="x"/>')),
  W(RS(P, D(), '<filter class="org.languagetool.rules.Rule" args="x"/>')),
  W(RS(P, D(), '<filter class="org.languagetool.rules.patterns.RuleFilter" args="a:b"/>', 'id="A" name="a"') + RS(P, D(), '', 'id="B" name="b"')),
  W(RS(P, D(), '<filter args="only"/>')),
  W(RS(P, D(), '<filter class="org.languagetool.rules.en.AvsAnRule"/>')),
  W(RS(P, D(), '<filter class="org.languagetool.rules.patterns.RuleFilter" args="a:b"/><filter class="x.Y"/>')),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence><equivalence type="pl"><token postag="NNS"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"><type id="sg"/></feature><token postag="DT"/><token postag="NN"/></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker><token>x</token></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker><token>x</token></pattern>', D('action="remove" postag="X"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify negate="yes"><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><unify-ignore><token>very</token></unify-ignore><token postag="NN"/></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><and><token postag="NN"/><token>x</token></and></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify><token>x</token></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/></unify></marker></pattern>', D('action="unify"'))),
  W(RS('<pattern><marker><unify><feature id="undefined"/><token postag="DT"/></unify></marker></pattern>', D('action="unify"'))),
  W(RS('<pattern><marker><unify><token postag="DT"/></unify></marker></pattern>', D('action="unify"'))),
  W(RS('<pattern><marker><unify></unify></marker></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` + RS('<pattern><token postag="DT"/></pattern>', D('action="unify"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification><unification feature="number"><equivalence type="pl"><token postag="NNS"/></equivalence></unification>` + RS()),
  W(`<unification><equivalence type="sg"><token postag="NN"/></equivalence></unification>` + RS()),
  W(`<unification feature="number"><equivalence><token postag="NN"/></equivalence></unification>` + RS()),
  W(`<unification feature="number"><equivalence type="sg"/></unification>` + RS()),
  W(`<unification feature="number"/>` + RS()),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/><token postag="X"/></equivalence></unification>` + RS()),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><marker><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></marker></pattern>', D('action="replace" postag="X"'))),
  W(`<unification feature="number"><equivalence type="sg"><token postag="NN"/></equivalence></unification>` +
    RS('<pattern><unify><feature id="number"/><token postag="DT"/><token postag="NN"/></unify></pattern>', D('action="unify"'))),
].map((x) => ({ lang: 'en-US', xml: x, unifier: true })));
add('structure-errors', 'malformed XML, unknown elements, missing parts, wrong nesting, encoding', [
  '', ' ', 'not xml', '<rules', '<rules></rule>', '<?xml version="1.0"?>', '<?xml version="1.0" encoding="UTF-8"?><rules lang="en"><rule id="x"></rules>',
  W(R(P)), W(R(D())), W(R(`${P}${D()}<unknown/>`)), W(`<bogus/>`), W(`<category id="C" name="c">${RS()}</category>`),
  W(RS(P, D(), '<message>msg</message>')), W(RS(P, D(), '<short>x</short><url>u</url>')),
  W(`<rule id="R1" name="n"><pattern><token>a</token></pattern><disambig action="remove" postag="X"/></rule></rule>`),
  W(RS(P, D(), '', 'id="R1" name="n" default="off" tags="picky"')),
  W(RS('<pattern><token>a</token><disambig action="remove"/></pattern>')),
  W(RS('<pattern><rule/></pattern>')),
  W(`<rulegroup id="G">${RS(P, D(), '', '')}<rulegroup id="H">${RS(P, D(), '', '')}</rulegroup></rulegroup>`),
  W(`<rulegroup id="G"></rulegroup>`),
  W(`<rulegroup/>`),
  `<?xml version="1.0" encoding="ISO-8859-1"?>\n<rules lang="en">${RS(P, D(), EX('untouched', 'ümlaut'))}</rules>`,
  `<?xml version="1.0" encoding="UTF-16"?>\n<rules lang="en">${RS()}</rules>`,
  `<?xml version="1.0" encoding="bogus"?>\n<rules lang="en">${RS()}</rules>`,
  `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">${RS()}</rules>`,
  `<!DOCTYPE rules [<!ENTITY e "foo">]><rules lang="en">${RS('<pattern><token>&e;</token></pattern>')}</rules>`,
  `<!DOCTYPE rules [<!ENTITY e SYSTEM "file:///etc/hostname">]><rules lang="en">${RS('<pattern><token>&e;</token></pattern>')}</rules>`,
  `<!DOCTYPE rules SYSTEM "http://localhost:1/none.dtd"><rules lang="en">${RS()}</rules>`,
  `<!DOCTYPE rules SYSTEM "disambiguation.dtd"><rules lang="en">${RS()}</rules>`,
  W(RS(P, D(), '<!-- comment --><?pi data?>')),
  W(RS('<pattern><token>a</token></pattern>\n\n\n', D('action="bogus"'))),
  W('\n\n\n' + RS(P, D('action="replace" postag="NN"'), '', 'id="L" name="line"') + '\n' + RS(P, D('action="filter"><match no="9"/></disambig><x'), '', 'id="M" name="m"')),
  { lang: 'en-US', nullStream: true }, { lang: 'de-DE', nullStream: true },
]);
for (const [name, [desc, items]] of cases) {
  write(`disamb-inline-${name}`, desc, items.map((a) => dop({ mode: 'disamb-inline', filename: 'inline-disamb.xml', ...a })));
}
