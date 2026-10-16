// Authors oracle/cases/X-RULELOAD/*.json (inputs only). Ops rule-load / ruleset-hints: docs/review/F25-oracle.md.
// Two phases: `--phase1` writes files + counts (sizes the chunks); run `npm run oracle -- X-RULELOAD`, then rerun without the flag to write the rest from tests/golden/X-RULELOAD/{files,counts}.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-RULELOAD');
const GOLD = path.join(ROOT, 'tests/golden/X-RULELOAD');
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const op = (args, o = 'rule-load') => ({ op: o, args });
const gold = (c) => JSON.parse(readFileSync(path.join(GOLD, c, 'responses.jsonl'), 'utf8').split('\n').filter(Boolean)[0]).result;
const goldAll = (c) => readFileSync(path.join(GOLD, c, 'responses.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).result);
const wanted = (l) => l.code.includes('-') || l.code === 'fr';

write('files', 'rule files per de/en/fr language', [op({ mode: 'files' })]);
if (process.argv.includes('--phase1')) {
  if (!existsSync(path.join(GOLD, 'files'))) { console.log('run oracle once for files, then rerun --phase1'); process.exit(0); }
  const ops = [];
  for (const l of gold('files').languages.filter(wanted)) l.files.forEach((_, fi) => ops.push(op({ mode: 'file', lang: l.code, file: fi, offset: 0, limit: 0 })));
  write('counts', 'rule counts per language/file', ops);
  process.exit(0);
}

// remove generated cases of earlier runs (keep files/counts)
for (const f of readdirSync(DIR)) if (f !== 'files.json' && f !== 'counts.json') rmSync(path.join(DIR, f), { recursive: true, force: true });

// ---- per language/file ----
const langs = gold('files').languages.filter(wanted);
const counts = goldAll('counts');
const PRIMARY = new Set(['de-DE', 'en-US', 'fr']);
const CHUNK = 400;
let k = 0;
for (const l of langs) {
  for (let fi = 0; fi < l.files.length; fi++) {
    const total = counts[k++].total;
    const base = path.basename(l.files[fi].name.replace(/\/[^/]*$/, '')) + '-' + path.basename(l.files[fi].name, '.xml');
    const shared = /^(de|en|fr)\/(grammar|style)\.xml$/.test(l.files[fi].name.split('/rules/').pop()) || /\/rules\/(de|en|fr)\/(grammar|style)\.xml$/.test(l.files[fi].name);
    const full = !shared || PRIMARY.has(l.code);
    for (let off = 0, n = 0; off < Math.max(total, 1); off += CHUNK, n++) {
      write(`list-${l.code}-f${fi}-${String(n).padStart(2, '0')}`, `${l.code} ${l.files[fi].name} rules ${off}.. (${full ? 'full' : 'compact'}, total ${total})`,
        [op({ mode: 'file', lang: l.code, file: fi, offset: off, limit: CHUNK, detail: false, compact: !full })]);
    }
    // detailed token dumps
    if (full) write(`tokens-${l.code}-f${fi}`, `${l.code} ${l.files[fi].name} detailed token dumps (stride sample + first rules per feature)`,
      [op({ mode: 'tokens', lang: l.code, file: fi, limit: shared ? 200 : 60, extraPerFeature: shared ? 2 : 1 })]);
  }
}
for (const l of langs) write(`patternrules-${l.code}`, `${l.code} Language#getPatternRules and default activation`, [op({ mode: 'patternRules', lang: l.code })]);

// ---- inline ----
const W = (body, attrs = 'lang="en"') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules ${attrs}>\n${body}\n</rules>\n`;
const C = (body, attrs = '') => `<category id="CAT" name="Category" ${attrs}>\n${body}\n</category>`;
const R = (inner, attrs = 'id="R1" name="Rule one"') => `<rule ${attrs}><pattern><token>foo</token></pattern><message>Msg</message><example correction="bar"><marker>foo</marker></example>${inner}</rule>`.replace('</rule>', '</rule>');
const RA = (inner, attrs = 'id="R1" name="Rule one"') => `<rule ${attrs}>${inner}<pattern><token>foo</token></pattern><message>Msg</message><example correction="bar"><marker>foo</marker></example></rule>`;
const RP = (pattern, attrs = 'id="R1" name="Rule one"', rest = '<message>Msg</message>') => `<rule ${attrs}><pattern>${pattern}</pattern>${rest}</rule>`;
const T = '<token>foo</token>';
const inl = (xml, extra = {}) => op({ mode: 'inline', lang: 'en-US', xml, filename: 'inline.xml', ...extra });
const cases = new Map();
const add = (name, desc, xmls) => cases.set(name, [desc, xmls.map((x) => (typeof x === 'string' ? inl(x) : x))]);

add('basic', 'minimal, single rule, rulegroup subIds, ids and names', [
  W(C(RP(T))),
  W(C(`<rulegroup id="G1" name="Group"><rule>${'<pattern><token>a</token></pattern><message>m1</message>'}</rule><rule name="own name"><pattern><token>b</token></pattern><message>m2</message></rule><rule id="OWN"><pattern><token>c</token></pattern><message>m3</message></rule></rulegroup>`)),
  W(C(RP(T, 'id="A"') + RP(T, 'id="A"'))),
  W(C(RP(T), ) + C(RP(T, 'id="R2" name="R2"'), 'id="X" name="Y"').replace('id="CAT" name="Category" id="X" name="Y"', 'id="X" name="Y"')),
  W(C(RP(T, 'id="R1" name="Rule one" default="on"'))),
  W(''),
  W(C('')),
]);
add('rules-attrs', 'rules element: idprefix, lang, premium, integrate, missing lang, other languages', [
  W(C(RP(T)), 'lang="en" idprefix="PRE_"'),
  W(C(RP(T)), 'lang="en" premium="yes"'),
  W(C(RP(T)), 'lang="en" premium="no"'),
  W(C(RP(T)), 'lang="en" premium="maybe"'),
  W(C(RP(T)), 'lang="en" integrate="yes"'),
  W(C(RP(T)), 'lang="en" idprefix="P_" premium="yes" integrate="no"'),
  W(C(RP(T)), 'lang="de"'),
  W(C(RP(T)), ''),
  W(C(RP(T)), 'lang="xx-yy"'),
  W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`), 'lang="en" idprefix="PRE_"'),
  W(C(`<rulegroup id="G" name="Gr"><rule id="X"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`), 'lang="en" idprefix="PRE_"'),
]);
add('category', 'category attributes and inheritance by rules', [
  W(C(RP(T), 'default="off"')),
  W(C(RP(T), 'default="temp_off"')),
  W(C(RP(T), 'default="on"')),
  W(C(RP(T, 'id="R1" name="n" default="on"'), 'default="off"')),
  W(C(RP(T, 'id="R1" name="n" default="off"'), 'default="on"')),
  W(C(RP(T), 'type="style"')),
  W(C(RP(T, 'id="R1" name="n" type="grammar"'), 'type="style"')),
  W(C(RP(T), 'type="bogus"')),
  W(C(RP(T), 'tags="picky"')),
  W(C(RP(T), 'tags="picky academic clarity"')),
  W(C(RP(T, 'id="R1" name="n" tags="professional"'), 'tags="picky"')),
  W(C(RP(T), 'tags="default"')),
  W(C(RP(T), 'tags="picky  academic"')),
  W(C(RP(T), 'tags="picky picky"')),
  W(C(RP(T), 'tags="nonsense"')),
  W(C(RP(T), 'tags=""')),
  W(C(RP(T), 'tone_tags="formal informal"')),
  W(C(RP(T), 'tone_tags="formal  informal"')),
  W(C(RP(T), 'tone_tags="bogus"')),
  W(C(RP(T), 'tone_tags="NO_TONE_RULE ALL_TONE_RULES clarity"')),
  W(C(RP(T, 'id="R1" name="n" tone_tags="academic"'), 'tone_tags="formal"')),
  W(C(RP(T), 'is_goal_specific="true"')),
  W(C(RP(T), 'is_goal_specific="false"')),
  W(C(RP(T, 'id="R1" name="n" is_goal_specific="false"'), 'is_goal_specific="true"')),
  W(C(RP(T, 'id="R1" name="n" is_goal_specific="true"'), 'is_goal_specific="false"')),
  W(C(RP(T), 'is_goal_specific="yes"')),
  W(C(RP(T), 'prio="5"')),
  W(C(RP(T, 'id="R1" name="n" prio="-3"'), 'prio="5"')),
  W(C(RP(T, 'id="R1" name="n" prio="0"'), 'prio="5"')),
  W(C(RP(T), 'prio="abc"')),
  W(C(RP(T), 'prio="2147483647"')),
  W(C(RP(T), 'prio="2147483648"')),
  W(C(RP(T), 'premium="yes"')),
  W(C(RP(T, 'id="R1" name="n" premium="no"'), 'premium="yes"')),
  W(C(RP(T, 'id="R1" name="n" premium="yes"'), 'premium="no"')),
  W(C(RP(T), 'premium="yes"'), ).replace('lang="en"', 'lang="en" premium="no"'),
  W(C(RP(T, 'id="R1" name="n" premium="no"'), 'premium="yes"'), 'lang="en" premium="yes"'),
  W(C(RP(T), 'external="yes"')),
  W(C(RP(T), 'external="no"')),
  W(C(RP(T), 'tab="MyTab"')),
  W(C(RP(T), 'external="yes" tab="Tab2" default="off"')),
  W(`<category id="A" name="First">${RP(T, 'id="R1" name="n"')}</category><category id="B" name="Second" default="off">${RP(T, 'id="R2" name="n"')}</category>`),
  W(`<category name="NoId">${RP(T)}</category>`),
  W(`<category id="NoName">${RP(T)}</category>`),
  W(`<category id="" name="">${RP(T)}</category>`),
  W(`<category id="A" name="X">${RP(T, 'id="R1" name="n"')}</category><category id="A" name="Y">${RP(T, 'id="R2" name="n"')}</category>`),
]);
add('rulegroup', 'rulegroup attributes, subIds, default off inheritance and errors', [
  W(C(`<rulegroup id="G" name="Group" default="off"><rule><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="temp_off"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="off"><rule default="on"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="off"><rule default="off"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="temp_off"><rule default="temp_off"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="on"><rule default="off"><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" default="bogus"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" min_prev_matches="2" distance_tokens="7"><rule><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" min_prev_matches="2"><rule min_prev_matches="3"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" distance_tokens="2"><rule distance_tokens="4"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group"><rule min_prev_matches="3" distance_tokens="9"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rule id="R" name="n" min_prev_matches="1" distance_tokens="5"><pattern><token>a</token></pattern><message>m</message></rule>`)),
  W(C(`<rulegroup id="G" name="Group" type="style" tags="picky" tone_tags="formal" is_goal_specific="true" prio="4" premium="yes"><rule><pattern><token>a</token></pattern><message>m</message></rule><rule type="grammar" tags="clarity" tone_tags="informal" is_goal_specific="false" prio="-1" premium="no"><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" tags="nonsense"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group" tone_tags="nonsense"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group"><url>http://example.com/g</url><short>group short</short><rule><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message><url>http://example.com/own</url><short>own short</short></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Group"><antipattern><token>x</token></antipattern><rule><antipattern><token>y</token></antipattern><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup name="Gr"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Gr"><rule id="G"><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Gr"></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token></pattern><message>m</message><example>ok.</example></rule><example>group example</example></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Gr"><rulegroup id="H" name="Inner"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup></rulegroup>`)),
]);
add('rule', 'rule attributes: id/name/default/type/tags/precedence', [
  W(C(RP(T, 'name="no id"'))),
  W(C(RP(T, 'id="NONAME"'))),
  W(C(RP(T, ''))),
  W(C(RP(T, 'name="no id"')), 'lang="en"').replace('<rules lang="en">', '<rules lang="en">'),
  W(C(RP(T, 'id="R1" name="n" default="off"'))),
  W(C(RP(T, 'id="R1" name="n" default="temp_off"'))),
  W(C(RP(T, 'id="R1" name="n" default="on"'))),
  W(C(RP(T, 'id="R1" name="n" default="OFF"'))),
  W(C(RP(T, 'id="R1" name="n" type="grammar"'))),
  W(C(RP(T, 'id="R1" name="n" type="style"'))),
  W(C(RP(T, 'id="R1" name="n" type="misspelling"'))),
  W(C(RP(T, 'id="R1" name="n" type="uncategorized"'))),
  W(C(RP(T, 'id="R1" name="n" type="bogus"'))),
  W(C(RP(T, 'id="R1" name="n" tags="picky academic"'))),
  W(C(RP(T, 'id="R1" name="n" tags="Picky"'))),
  W(C(RP(T, 'id="R1" name="n" tone_tags="formal clarity"'))),
  W(C(RP(T, 'id="R1" name="n" is_goal_specific="true"'))),
  W(C(RP(T, 'id="R1" name="n" prio="10"'))),
  W(C(RP(T, 'id="R1" name="n" premium="yes"'))),
  W(C(RP(T, 'id="R1" name="n" premium="no"'))),
  W(C(RP(T, 'id="R1" name="n" premium="true"'))),
  W(C(RP(T, 'id="R1" name="n" min_prev_matches="3" distance_tokens="8"'))),
  W(C(RP(T, 'id="R1" name="n" min_prev_matches="x"'))),
  W(C(RP(T, 'id="R1" name="n" bogus="1"'))),
  W(C(RP(T, 'id="R-with.special_chars" name="Näme with ümläut ß € 😀"'))),
  W(C(RP(T, 'id="R1" name=""'))),
  W(C(RP(T, 'id="" name="x"'))),
  W(C(RP(T, 'id="R1" name="n" default="off"'), 'default="on"')),
  W(C(RP(T, 'id="R1" name="n" type="style" tags="picky" tone_tags="formal" is_goal_specific="true" prio="3" premium="yes"'), 'type="grammar" tags="clarity" tone_tags="informal" is_goal_specific="false" prio="9" premium="no"')),
]);
const ID = ['<antipattern>', '</antipattern>'];
add('antipattern', 'antipatterns at rule and group level, markers, examples, case_sensitive, errors', [
  W(C(RA('<antipattern><token>x</token><token>foo</token></antipattern>'))),
  W(C(RA('<antipattern case_sensitive="yes"><token>X</token></antipattern>'))),
  W(C(RA('<antipattern case_sensitive="no"><token>X</token></antipattern>'))),
  W(C(RA('<antipattern><token>a</token><marker><token>foo</token></marker><token>b</token></antipattern>'))),
  W(C(RA('<antipattern><token>a</token><token>foo</token><example>a <marker>foo</marker></example></antipattern>'))),
  W(C(RA('<antipattern><token>a</token><token>foo</token><example type="correct">a <marker>foo</marker></example></antipattern>'))),
  W(C(RA('<antipattern><token>a</token><token>foo</token><example type="incorrect">a <marker>foo</marker></example></antipattern>'))),
  W(C(RA('<antipattern><token>a</token><token>foo</token><example correction="x">a <marker>foo</marker></example></antipattern>'))),
  W(C(RA('<antipattern><token>a</token></antipattern><antipattern><token>b</token></antipattern><antipattern><token>c</token></antipattern>'))),
  W(C(`<rulegroup id="G" name="Gr"><antipattern><token>a</token></antipattern><rule><pattern><token>foo</token></pattern><message>m</message></rule><rule><pattern><token>bar</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rulegroup id="G" name="Gr"><antipattern><token>a</token></antipattern><rule><antipattern><token>q</token></antipattern><pattern><token>foo</token></pattern><message>m</message></rule><rule><pattern><token>bar</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(RA('<antipattern><token postag="NN" postag_regexp="no">x</token><token regexp="yes">fo+</token></antipattern>'))),
  W(C(RA('<antipattern><token inflected="yes">x</token><token skip="2">y</token><token min="0" max="2">z</token></antipattern>'))),
  W(C(RA('<antipattern></antipattern>'))),
  W(C(R('<antipattern><token>x</token></antipattern>'))),
  W(C(R('<antipattern><token>x</token></antipattern>'))).replace('<message>Msg</message><example', '<example'),
  W(C(RA('<antipattern><marker><token>a</token></marker><marker><token>b</token></marker></antipattern>'))),
  W(C(RA('<antipattern><unify><feature id="number"><type id="sg"/><type id="pl"/></feature><token postag="NN"/><token postag="VB"/></unify></antipattern>'))),
  W(C(`<rule id="R" name="n"><antipattern><token>a</token></antipattern><pattern><token>foo</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R" name="n"><pattern><token>foo</token></pattern><antipattern><token>a</token></antipattern><message>m</message></rule>`)),
]);
add('marker', 'marker positions, nesting, mark_from/mark_to', [
  W(C(RP('<marker><token>a</token></marker>'))),
  W(C(RP('<token>a</token><marker><token>b</token></marker>'))),
  W(C(RP('<marker><token>a</token></marker><token>b</token>'))),
  W(C(RP('<token>a</token><marker><token>b</token><token>c</token></marker><token>d</token>'))),
  W(C(RP('<marker><token>a</token><token>b</token><token>c</token></marker>'))),
  W(C(RP('<token>a</token><marker><token>b</token><marker><token>c</token></marker></marker>'))),
  W(C(RP('<marker><marker><token>a</token></marker></marker>'))),
  W(C(RP('<marker></marker>'))),
  W(C(RP('<token>a</token><marker><token min="0">b</token></marker><token>c</token>'))),
  W(C(RP('<marker><token skip="1">a</token><token>b</token></marker>'))),
  W(C(RP('<marker><token>a</token></marker><marker><token>b</token></marker>'))),
  W(C(RP('<token>a</token><marker><and><token>b</token><token postag="NN"/></and></marker>'))),
  W(C(RP('<marker><token>a</token></marker><token>b</token>', 'id="R1" name="n"', '<message>m</message><example><marker>a</marker> b</example>'))),
  W(C(RP('<token>a</token>', 'id="R1" name="n"', '<message>m</message><example>x <marker>a</marker> <marker>b</marker></example>'))),
  W(C(RP('<token>a</token>', 'id="R1" name="n"', '<message>m</message><example>x <marker>a b</example>'))),
  W(C(RP('<token>a</token>', 'id="R1" name="n"', '<message>m</message><example>x a</marker></example>'))),
  W(C(RP('<token>a</token>', 'id="R1" name="n"', '<message>m</message><example>no marker here</example>'))),
  W(C(RP('<token>a</token>', 'id="R1" name="n"', '<message>m</message><example type="incorrect">no marker here</example>'))),
]);
add('message', 'message, suggestion, short, url, match elements, backrefs', [
  W(C(RP(T, 'id="R1" name="n"', '<message>Use <suggestion>bar</suggestion> instead of foo.</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Use <suggestion>bar</suggestion> or <suggestion>baz</suggestion>.</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Msg <suggestion suppress_misspelled="yes">bar</suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message suppress_misspelled="yes">Msg <suggestion>bar</suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message suppress_misspelled="no">Msg</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Msg</message><suggestion>outside</suggestion>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Msg</message><suggestion>outside1</suggestion><suggestion suppress_misspelled="yes">outside2</suggestion>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Msg <suggestion>in</suggestion></message><suggestion>out</suggestion>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message>Token \\1 and \\2 here, <suggestion>\\2 \\1</suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message>Token \\3</message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message>Token \\0</message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message>Token <match no="1"/> and <match no="2" case_conversion="startupper"/></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message>Token <suggestion><match no="1" case_conversion="allupper"/> <match no="2" case_conversion="startlower"/></suggestion></message>'))),
  W(C(RP(T + '<token postag="NN">b</token>', 'id="R1" name="n"', '<message><suggestion><match no="2" postag="NNS" postag_regexp="no" setpos="yes"/></suggestion></message>'))),
  W(C(RP(T + '<token postag="NN">b</token>', 'id="R1" name="n"', '<message><suggestion><match no="2" postag="NN:(.*)" postag_regexp="yes" postag_replace="NNS:$1"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" regexp_match="(f)(.*)" regexp_replace="$2$1"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" include_skipped="all"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" include_skipped="following"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" include_skipped="bogus"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" case_conversion="bogus"/></suggestion></message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<message><suggestion><match no="1" suppress_misspelled="yes"/></suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message><suggestion><match no="2"/></suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message><suggestion><match no="0"/></suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message><suggestion><match no=""/></suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message><suggestion><match no="x"/></suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message><match no="1"/> <match no="1" case_conversion="allupper"/></message><suggestion><match no="1"/></suggestion>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><short>Short msg</short>'))),
  W(C(RP(T, 'id="R1" name="n"', '<short>Short first</short><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><url>http://example.com/rule</url>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><url>not a url</url>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><url>  https://example.com/x?y=1&amp;z=2  </url>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><url></url>'))),
  W(C(RP(T, 'id="R1" name="n"', ''))),
  W(C(RP(T, 'id="R1" name="n"', '<message></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>Ünicode ß € 😀 &lt;b&gt; &amp; text <suggestion>Größe</suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>two</message><message>messages</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>  spaced \n  text  </message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m <suggestion>a<match no="1"/>b</suggestion></message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><suggestion><match no="1"/></suggestion><suggestion>x</suggestion>'))),
]);
add('examples', 'example types, corrections, reason, markers', [
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example>plain correct</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="correct">typed correct</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="incorrect"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="incorrect" correction="bar"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="bar"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="a|b|c"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="a|b|"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="|a"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction=""><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="|"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="a||b"><marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="triggers_error"><marker>foo</marker> trig</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="triggers_error" correction="x"><marker>foo</marker> trig</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="bogus">x</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example reason="why">x <marker>foo</marker></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example correction="Größe|Maß">Äußerst <marker>foo</marker> öde 😀</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example>multi\nline <marker>foo</marker>\n example</example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example>  lead and trail  </example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example type="incorrect"></example>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example>one</example><example type="incorrect"><marker>foo</marker></example><example>two</example><example type="triggers_error"><marker>foo</marker></example>'))),
  W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token></pattern><message>m</message><example>x</example></rule><rule><pattern><token>b</token></pattern><message>m</message><example type="incorrect"><marker>b</marker></example></rule></rulegroup>`)),
  W(C(RP(T, 'id="R1" name="n"', '<example>before message</example><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><example>x <marker>foo</marker> <b>nested</b></example>'))),
]);
add('filter', 'filter class and args; errors from RuleFilterCreator', [
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args=""/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter"/><message>m</message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:b c:\\1 d:\\2"/><message>m</message>'))),
  W(C(RP(T + '<token>b</token>', 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><filter class="org.languagetool.rules.UnderlineSpacesFilter" args="x:y"/>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter" args="suppressMatch:true"/><message>m</message>'))),
  W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token></pattern><filter class="org.languagetool.rules.UnderlineSpacesFilter" args="k:v"/><message>m</message></rule><rule><pattern><token>b</token></pattern><filter class="org.languagetool.rules.UnderlineSpacesFilter" args="k:w"/><message>m</message></rule></rulegroup>`)),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.DoesNotExist" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="DoesNotExist" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="java.lang.String" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.RuleFilter" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.patterns.RuleFilter"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="" args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter args="a:b"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="novalue"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:b a:c"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:\\1 b:\\1"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:\\5"/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="  a:b   c:d  "/><message>m</message>'))),
  W(C(RP(T, 'id="R1" name="n"', '<filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:b:c"/><message>m</message>'))),
  W(C(`<rule id="R1" name="n"><regexp>foo</regexp><filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:b"/><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>foo</regexp><filter class="org.languagetool.rules.patterns.RegexRuleFilter"/><message>m</message></rule>`)),
]);
add('regexp', 'regexp rules: mark, case_sensitive, errors', [
  W(C(`<rule id="R1" name="n"><regexp>foo\\s+bar</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="1">(foo)\\s+(bar)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="2">(foo)\\s+(bar)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="3">(foo)\\s+(bar)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="0">(foo)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="-1">(foo)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp mark="x">(foo)</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp case_sensitive="yes">Foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp case_sensitive="no">Foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(?i)foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp case_sensitive="yes">(?i)foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>\\p{Lu}foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(?i)\\p{Lu}foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(foo</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp></regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>foo</regexp><regexp>bar</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>foo</regexp><pattern><token>x</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(a)(b)</regexp><message>Use \\1 and \\2</message><suggestion>\\2\\1</suggestion></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(a)(b)</regexp><message>Use <suggestion>\\2\\1</suggestion></message><short>sh</short><url>http://example.com</url><example correction="ba"><marker>ab</marker></example></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>(a)(b)</regexp><message>x</message><suggestion><match no="1" case_conversion="allupper"/></suggestion></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>foo</regexp><antipattern><token>x</token></antipattern><message>m</message></rule>`)),
  W(C(`<rulegroup id="G" name="Gr"><rule><regexp>foo</regexp><message>m</message></rule><rule><pattern><token>bar</token></pattern><message>m</message></rule></rulegroup>`)),
  W(C(`<rule id="R1" name="n"><regexp>foo&amp;bar&lt;baz</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>  spaced  </regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>[</regexp><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><regexp>Größe|ÄÖÜ|😀</regexp><message>m</message></rule>`)),
]);
const TK = (a, body = 'foo') => RP(`<token ${a}>${body}</token>`);
add('token-attrs', 'token attributes', [
  W(C(TK('', 'word'))),
  W(C(TK('regexp="yes"', 'fo+|ba[rz]'))),
  W(C(TK('regexp="no"', 'fo+'))),
  W(C(TK('regexp="bogus"', 'fo+'))),
  W(C(TK('case_sensitive="yes"', 'Foo'))),
  W(C(TK('case_sensitive="yes" regexp="yes"', 'Fo+'))),
  W(C(TK('inflected="yes"', 'be'))),
  W(C(TK('inflected="yes" regexp="yes"', 'be|have'))),
  W(C(TK('negate="yes"', 'foo'))),
  W(C(TK('negate="no"', 'foo'))),
  W(C(TK('postag="NN"', ''))),
  W(C(TK('postag="NN.*" postag_regexp="yes"', ''))),
  W(C(TK('postag="NN" negate_pos="yes"', ''))),
  W(C(TK('postag="NN" postag_regexp="yes" negate_pos="yes"', 'foo'))),
  W(C(TK('postag_regexp="yes"', 'foo'))),
  W(C(TK('negate_pos="yes"', 'foo'))),
  W(C(TK('chunk="B-NP-singular"', 'foo'))),
  W(C(TK('chunk_re="B-NP.*"', 'foo'))),
  W(C(TK('chunk="x" chunk_re="y"', 'foo'))),
  W(C(TK('skip="2"', 'foo'))),
  W(C(TK('skip="-1"', 'foo'))),
  W(C(TK('skip="x"', 'foo'))),
  W(C(TK('min="0"', 'foo'))),
  W(C(TK('min="0" max="3"', 'foo'))),
  W(C(TK('max="3"', 'foo'))),
  W(C(TK('min="2" max="1"', 'foo'))),
  W(C(TK('min="-1"', 'foo'))),
  W(C(TK('min="x"', 'foo'))),
  W(C(TK('min="0" max="-1"', 'foo'))),
  W(C(TK('spacebefore="yes"', 'foo'))),
  W(C(TK('spacebefore="no"', 'foo'))),
  W(C(TK('spacebefore="ignore"', 'foo'))),
  W(C(TK('spacebefore="bogus"', 'foo'))),
  W(C(TK('bogus="x"', 'foo'))),
  W(C(RP('<token postag="SENT_START"/><token>foo</token>'))),
  W(C(RP('<token/>'))),
  W(C(RP('<token></token>'))),
  W(C(RP('<token>  padded  </token>'))),
  W(C(RP('<token>a|b</token>'))),
  W(C(RP('<token regexp="yes">(a</token>'))),
  W(C(RP('<token regexp="yes">(?i)(?-i)A</token>'))),
  W(C(RP('<token>Größe</token><token>😀</token><token>ß</token>'))),
  W(C(RP('<token>&lt;&amp;&gt;</token>'))),
  W(C(RP('<token>foo<token>bar</token></token>'))),
  W(C(RP(''))),
  W(C(RP('<pattern/>'))),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token></pattern><pattern><token>b</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern case_sensitive="yes"><token>a</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern case_sensitive="no"><token>a</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern mark_from="1" mark_to="-1"><token>a</token><token>b</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token><token>b</token></pattern><message>m</message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token><token>b</token></pattern><message>m</message></rule>`)),
]);
add('exceptions', 'exception elements and scope', [
  W(C(RP('<token>foo<exception>bar</exception></token>'))),
  W(C(RP('<token>foo<exception scope="current">bar</exception></token>'))),
  W(C(RP('<token>foo</token><token>x<exception scope="previous">bar</exception></token>'))),
  W(C(RP('<token>foo<exception scope="next">bar</exception></token><token>x</token>'))),
  W(C(RP('<token>foo<exception scope="bogus">bar</exception></token>'))),
  W(C(RP('<token>foo<exception regexp="yes">ba[rz]</exception></token>'))),
  W(C(RP('<token>foo<exception postag="NN"/></token>'))),
  W(C(RP('<token>foo<exception postag="NN.*" postag_regexp="yes" negate_pos="yes"/></token>'))),
  W(C(RP('<token>foo<exception inflected="yes">be</exception></token>'))),
  W(C(RP('<token>foo<exception negate="yes">bar</exception></token>'))),
  W(C(RP('<token>foo<exception case_sensitive="yes">Bar</exception></token>'))),
  W(C(RP('<token>foo<exception spacebefore="yes">bar</exception></token>'))),
  W(C(RP('<token>foo<exception spacebefore="no" scope="next">bar</exception></token><token>x</token>'))),
  W(C(RP('<token>foo<exception>a</exception><exception scope="previous">b</exception><exception scope="next" postag="X">c</exception></token><token>x</token>'))),
  W(C(RP('<token postag="NN">foo<exception postag="NN"/><exception>x</exception></token>'))),
  W(C(RP('<token><exception>bar</exception></token>'))),
  W(C(RP('<token postag="NN"><exception/></token>'))),
  W(C(RP('<token>foo<exception chunk="B-NP"/></token>'))),
  W(C(RP('<token>foo<exception chunk_re="B-.*"/></token>'))),
  W(C(RP('<token>foo<exception><token>nested</token></exception></token>'))),
  W(C(RP('<exception>a</exception><token>foo</token>'))),
  W(C(RP('<token>foo<exception>a</exception>text</token>'))),
]);
add('and-or-unify', 'and/or groups, unification', [
  W(C(RP('<and><token>foo</token><token postag="NN"/></and>'))),
  W(C(RP('<and><token>foo</token><token negate="yes">bar</token><token postag="X" negate_pos="yes"/></and>'))),
  W(C(RP('<or><token>foo</token><token>bar</token></or>'))),
  W(C(RP('<or><token>foo</token><token postag="NN"/><token regexp="yes">x+</token></or>'))),
  W(C(RP('<token>a</token><or><token>foo</token><token>bar</token></or><token>b</token>'))),
  W(C(RP('<and><token>foo<exception>x</exception></token><token postag="NN"/></and>'))),
  W(C(RP('<and><token>foo</token></and>'))),
  W(C(RP('<and></and>'))),
  W(C(RP('<or><token>a</token><and><token>b</token><token>c</token></and></or>'))),
  W(C(RP('<and><token skip="1">foo</token><token>x</token></and>'))),
  W(C(RP('<and><token min="0">foo</token><token>x</token></and>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/><type id="pl"/></feature><token postag="NN"/><token postag="VB"/></unify>'))),
  W(C(RP('<token>a</token><unify><feature id="number"><type id="sg"/></feature><feature id="gender"><type id="m"/><type id="f"/></feature><token postag="NN"/><token postag="JJ"/></unify><token>b</token>'))),
  W(C(RP('<unify negate="yes"><feature id="number"><type id="sg"/></feature><token postag="NN"/><token postag="VB"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><token postag="NN"/><unify-ignore><token>of</token></unify-ignore><token postag="VB"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><token postag="NN"/></unify>'))),
  W(C(RP('<unify><token postag="NN"/><token postag="VB"/></unify>'))),
  W(C(RP('<unify><feature id="number"/><token postag="NN"/></unify>'))),
  W(C(RP('<unify><feature><type id="sg"/></feature><token postag="NN"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type/></feature><token postag="NN"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><token postag="NN"/></unify><unify><feature id="gender"><type id="m"/></feature><token postag="JJ"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><and><token postag="NN"/><token>x</token></and><token postag="VB"/></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><token postag="NN"/><token postag="VB"/><marker><token>x</token></marker></unify>'))),
  W(C(RP('<unify><feature id="number"><type id="sg"/></feature><marker><token postag="NN"/><token postag="VB"/></marker></unify>'))),
  W(C(RP('<token postag="NN"/><token postag="VB"/>', 'id="R1" name="n"', '<message>m</message>'))).replace('<rules lang="en">', '<rules lang="en">'),
  W(C(RP('<token postag="NN"><match no="1"/></token>'))),
  W(C(RP('<token>a</token><token><match no="1"/></token>'))),
  W(C(RP('<token>a</token><token><match no="1" postag="X"/></token>'))),
  W(C(RP('<token>a</token><token><match no="1" case_conversion="startupper" regexp_match="a" regexp_replace="b"/></token>'))),
  W(C(RP('<token>a</token><token><match no="2"/></token>'))),
  W(C(RP('<token><match no="1"/></token><token>a</token>'))),
  W(C(RP('<token>a</token><token inflected="yes"><match no="1" postag="VB" postag_regexp="yes"/></token>'))),
]);
add('phrases', 'phrases and includephrases', [
  W(`<phrases><phrase id="P1"><token>a</token><token>b</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token><token>b</token></phrase></phrases>` + C(RP('<token>x</token><includephrases><phraseref idref="P1"/></includephrases><token>y</token>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase><phrase id="P2"><token>b</token><token>c</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/><phraseref idref="P2"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase><phrase id="P2"><token>b</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/></includephrases><includephrases><phraseref idref="P2"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase><phrase id="P2"><includephrases><phraseref idref="P1"/></includephrases><token>b</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P2"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="NOPE"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<includephrases><phraseref/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase><phrase id="P1"><token>b</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/></includephrases>'))),
  W(`<phrases><phrase><token>a</token></phrase></phrases>` + C(RP('<token>x</token>'))),
  W(`<phrases></phrases>` + C(RP('<token>x</token>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<includephrases></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<marker><includephrases><phraseref idref="P1"/></includephrases></marker><token>y</token>'))),
  W(`<phrases><phrase id="P1"><token>a</token><token>b</token></phrase></phrases>` + C(RP('<token>x</token><includephrases><phraseref idref="P1"/></includephrases>', 'id="R1" name="n"', '<message>\\1 \\2 \\3</message><suggestion>\\3</suggestion>'))),
  W(`<phrases><phrase id="P1"><token>a</token><token>b</token></phrase></phrases>` + C(RP('<token>x</token><includephrases><phraseref idref="P1"/></includephrases>', 'id="R1" name="n"', '<message>m <match no="3"/></message>'))),
  W(`<phrases><phrase id="P1"><token>a</token><token>b</token></phrase><phrase id="P2"><token>c</token></phrase></phrases>` + C(`<rulegroup id="G" name="Gr"><rule><pattern><includephrases><phraseref idref="P1"/><phraseref idref="P2"/></includephrases><token>z</token></pattern><message>m</message></rule><rule><pattern><token>q</token></pattern><message>m</message></rule></rulegroup>`)),
  W(`<phrases><phrase id="P1"><token>a</token><token skip="1">b</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/></includephrases>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<includephrases><phraseref idref="P1"/></includephrases>', 'id="R1" name="n"', '<message>m</message><filter class="org.languagetool.rules.UnderlineSpacesFilter" args="a:\\1"/>'))),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(`<rule id="R1" name="n"><antipattern><includephrases><phraseref idref="P1"/></includephrases></antipattern><pattern><token>z</token></pattern><message>m</message></rule>`)),
  W(C(RP('<includephrases><phraseref idref="P1"/></includephrases>')) + `<phrases><phrase id="P1"><token>a</token></phrase></phrases>`),
  W(`<phrases><phrase id="P1"><token>a</token></phrase></phrases>` + C(RP('<phraseref idref="P1"/>'))),
]);
add('structure-errors', 'invalid XML, unknown elements, wrong structure', [
  '',
  'not xml at all',
  '<rules lang="en"><category id="A" name="B"></rules>',
  '<?xml version="1.0"?>',
  '<?xml version="1.0" encoding="UTF-8"?><other lang="en"/>',
  '<?xml version="1.0" encoding="UTF-8"?><rules lang="en"><bogus/></rules>',
  W(C('<bogus/>')),
  W(C(RP(T, 'id="R1" name="n"', '<message>m</message><bogus/>'))),
  W('<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule>'),
  W(C('<rule id="R1" name="n"><message>m</message></rule>')),
  W(C('<rule id="R1" name="n"><pattern/><message>m</message></rule>')),
  W(C('<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message><rule id="R2"/></rule>')),
  W(C('<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m'.concat('</rule>'))),
  '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rules SYSTEM "does-not-exist.dtd"><rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule></category></rules>',
  '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rules [<!ENTITY e "expanded">]><rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>&e;</token></pattern><message>m &e;</message></rule></category></rules>',
  '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rules [<!ENTITY e SYSTEM "file:///etc/hostname">]><rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>&e;</token></pattern><message>m</message></rule></category></rules>',
  '<?xml version="1.0" encoding="UTF-8"?><rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>&undefined;</token></pattern><message>m</message></rule></category></rules>',
  '<?xml version="1.0" encoding="ISO-8859-1"?><rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>Gr\u00fc\u00dfe</token></pattern><message>m</message></rule></category></rules>',
  '\uFEFF' + W(C(RP(T))),
  W(C(RP(T)) + '<!-- comment -->' + C(RP(T, 'id="R2" name="n"'), 'id="C2" name="Two"')),
  W(C(`<rule id="R1" name="n"><!-- c --><pattern><token>a<!-- c -->b</token></pattern><message>m<!-- c --></message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern><token><![CDATA[a<b]]></token></pattern><message><![CDATA[m <b>]]></message></rule>`)),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule>`)).replace('<rules lang="en">', '<rules xmlns:x="urn:x" lang="en" x:foo="1">'),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule>`) + '<trailing/>'),
  W(C(RP(T)).replace('<category', '<category foo="bar"')),
  '<rules lang="en"><category id="A" name="B"><rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule></category></rules><rules/>',
]);
add('relaxed', 'relaxedMode: rules without id/name', [
  { ...inl(W(C(RP(T, 'name="no id"'))), { relaxed: true }) },
  { ...inl(W(C(RP(T, 'id="NONAME"'))), { relaxed: true }) },
  { ...inl(W(C(RP(T, ''))), { relaxed: true }) },
  { ...inl(W(RP(T, 'id="R1" name="n"')), { relaxed: true }) },
  { ...inl(W(C(`<rulegroup><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)), { relaxed: true }) },
  { ...inl(W(`<category><rule><pattern><token>a</token></pattern><message>m</message></rule></category>`), { relaxed: true }) },
  { ...inl(W(C(RP(T, 'name="no id"'))), { relaxed: false }) },
]);
add('via-file', 'File variant of the loader (absolute path as sourceFile)', [
  { ...inl(W(C(RP(T))), { via: 'file' }) },
  { ...inl(W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token></pattern><message>m</message></rule></rulegroup>`)), { via: 'file' }) },
  { ...inl('<broken', { via: 'file' }) },
  { ...inl(W(C(RP(T)))) },
  { ...inl(W(C(RP(T))), { filename: 'a/b/other-name.xml' }) },
  { ...inl(W(C(RP(T))), { filename: '' }) },
]);
add('languages', 'same rules loaded with different languages', ['en-US', 'en-GB', 'de-DE', 'de-AT', 'de-CH', 'fr', 'fr-CA', 'en-AU'].map((lang) => inl(W(C(`<rulegroup id="G" name="Gr"><rule><pattern><token>a</token><token postag="NN">b</token></pattern><message>m <suggestion>\\1</suggestion></message><example correction="a"><marker>a</marker></example></rule></rulegroup>`)), { lang })));
add('misc-big', 'many rules in one file, order, duplicates, long text', [
  W(C(Array.from({ length: 50 }, (_, i) => RP(`<token>w${i}</token>`, `id="R${i}" name="Rule ${i}"`)).join('\n'))),
  W(C(RP('<token>' + 'x'.repeat(20000) + '</token>'))),
  W(C(RP(T, 'id="R1" name="n"', '<message>' + 'long message '.repeat(2000) + '</message>'))),
  W(C(RP(Array.from({ length: 300 }, (_, i) => `<token>t${i}</token>`).join('')))),
  W(C(RP('<token>a</token>'.repeat(50)))),
  W(C(`<rulegroup id="G" name="Gr">${Array.from({ length: 30 }, (_, i) => `<rule><pattern><token>a${i}</token></pattern><message>m${i}</message></rule>`).join('')}</rulegroup>`)),
  W(C(`<rule id="R1" name="n"><pattern><token>a</token></pattern><message>m</message></rule>`) + C(`<rule id="R1" name="n"><pattern><token>b</token></pattern><message>m</message></rule>`, 'id="CAT2" name="Cat2"')),
]);
for (const [name, [desc, ops]] of cases) write(`inline-${name}`, desc, ops);

// ---- toXML / PatternRuleXmlCreator on real rules: covered in tokens-* cases (toXML field) ----

// ---- builders (CORE-0178) and RuleSet hints (RuleSetTest) ----
const B = (...calls) => calls;
write('builder', 'PatternTokenBuilder / PatternRuleBuilderHelper', [op({
  mode: 'builder', tokens: [
    B(['token', 'foo']), B(['csToken', 'Foo']), B(['tokenRegex', 'fo+']), B(['csTokenRegex', 'Fo+']),
    B(['pos', 'NN']), B(['posRegex', 'NN.*']), B(['token', 'foo'], ['pos', 'NN']), B(['pos', 'NN'], ['token', 'foo']),
    B(['token', 'foo'], ['min', 0]), B(['token', 'foo'], ['max', 3]), B(['token', 'foo'], ['min', 2], ['max', 5]), B(['token', 'foo'], ['min', 3], ['max', 2]),
    B(['token', 'foo'], ['min', -1]), B(['token', 'foo'], ['mark', false]), B(['token', 'foo'], ['mark', true]), B(['token', 'foo'], ['negate']),
    B(['token', 'foo'], ['setSkip', 2]), B(['token', 'foo'], ['setSkip', -1]), B(['token', 'foo'], ['setIsWhiteSpaceBefore', true]), B(['token', 'foo'], ['setIsWhiteSpaceBefore', false]),
    B(['token', 'foo'], ['matchInflectedForms']), B(['tokenRegex', 'fo+'], ['matchInflectedForms'], ['negate']),
    B(['posRegexWithStringException', 'NN.*', 'foo|bar']), B(['posRegexWithStringException', 'NN.*', '(']),
    B(['token', 'foo'], ['token', 'bar']), B(['csToken', 'Foo'], ['token', 'bar']), B(['tokenRegex', 'x'], ['token', 'y']), B(['pos', 'NN'], ['posRegex', 'V.*']), B(['posRegex', 'V.*'], ['pos', 'NN']),
    B(['tokenRegex', '(']), B(['token', '']), B(['nullToken']), B(['pos', null]), B(),
    B(['token', 'Ünïcödé'], ['negate'], ['setSkip', 1], ['min', 0], ['max', 2], ['mark', false], ['setIsWhiteSpaceBefore', true]),
    { helper: 'csToken', arg: 'Foo' }, { helper: 'pos', arg: 'NN' }, { helper: 'token', arg: 'foo' }, { helper: 'regex', arg: 'fo+' }, { helper: 'csRegex', arg: 'Fo+' }, { helper: 'regex', arg: '(' },
  ],
})]);
const S = (t, pos = 'pos', lemma = 'lemma') => ({ t, pos, lemma });
const hint = (kind, rules, sentence) => op({ kind, rules, sentence }, 'ruleset-hints');
const tokR = (c) => B(...c);
const sent = [S('token')];
const hintOps = [];
// textHintsAreHonored
for (const kind of ['plain', 'text', 'lemma']) {
  hintOps.push(
    hint(kind, [B(['csToken', 'token'])], sent), hint(kind, [B(['token', 'Token'])], sent), hint(kind, [B(['tokenRegex', 'token|another'])], sent),
    hint(kind, [B(['csToken', 'unsuitable'])], sent),
    hint(kind, [B(['token', 'lemma'], ['matchInflectedForms'])], sent), hint(kind, [B(['token', 'Lemma'], ['matchInflectedForms'])], sent),
    hint(kind, [B(['csTokenRegex', 'lemm[ab]'], ['matchInflectedForms'])], sent), hint(kind, [B(['csToken', 'unsuitable'], ['matchInflectedForms'])], sent),
    hint(kind, [B(['csToken', 'unsuitable'], ['matchInflectedForms']), B(['pos', 'somePos'])], sent),
    hint(kind, [B(['pos', 'somePos'])], sent), hint(kind, [B(['pos', 'pos'])], sent), hint(kind, [B(['posRegex', 'p.*'])], sent),
    hint(kind, [B(['csToken', 'token'], ['negate'])], sent), hint(kind, [B(['csToken', 'other'], ['negate'])], sent),
    hint(kind, [B(['token', 'token'], ['min', 0])], sent), hint(kind, [B(['token', 'zzz'], ['min', 0])], sent),
    hint(kind, [B(['tokenRegex', 'tok.*'])], sent), hint(kind, [B(['tokenRegex', '.*'])], sent), hint(kind, [B(['tokenRegex', 'a|b|c'])], sent),
    hint(kind, [B(['csToken', 'lemma'])], sent), hint(kind, [B(['csToken', 'lemma'], ['matchInflectedForms'])], sent), hint(kind, [B(['csToken', 'token'], ['matchInflectedForms'])], sent),
    hint(kind, [B(['token', 'a']), B(['token', 'token'])], sent), hint(kind, [B(['token', 'token']), B(['token', 'a'])], sent),
    hint(kind, [B(['csToken', 'token']), B(['csToken', 'nope']), B(['pos', 'x']), B(['token', 'TOKEN'])], sent),
    hint(kind, [B(['csToken', 'token']), B(['csToken', 'nope']), B(['pos', 'x']), B(['token', 'TOKEN'])], [S('a', 'p', 'l'), S('token'), S('other', null, null)]),
    hint(kind, [{ tokens: [B(['csToken', 'a']), B(['csToken', 'b'])] }, { tokens: [B(['csToken', 'a']), B(['csToken', 'token'])] }], [S('a'), S('token')]),
    hint(kind, [], sent),
    hint(kind, [B(['csToken', 'token'])], []),
    hint(kind, [B(['pos', 'pos'])], [S('token', null, null)]),
    hint(kind, [B(['csToken', 'Ünï'])], [S('Ünï', 'p', 'l')]),
    hint(kind, [B(['token', 'ünï'])], [S('Ünï', 'p', 'l')]),
    hint(kind, [B(['token', 'ß'])], [S('SS', 'p', 'l')]),
  );
}
// all rules unclassified (hinted shortcut review F15)
for (const kind of ['text', 'lemma']) hintOps.push(
  hint(kind, [B(['pos', 'a']), B(['pos', 'b'])], sent), hint(kind, [B(['pos', 'a']), B(['pos', 'pos'])], sent),
  hint(kind, [B(['posRegex', '.*']), B(['pos', 'b'])], [S('x', 'b', 'x')]),
  hint(kind, [B(['csToken', 'q']), B(['pos', 'b'])], [S('x', 'b', 'x')]),
  hint(kind, [B(['csToken', 'q']), B(['pos', 'b']), B(['token', 'x'])], [S('x', 'b', 'x')]),
  hint(kind, [B(['token', 'x'], ['min', 0]), B(['pos', 'b'])], [S('y', 'c', 'y')]),
);
write('ruleset-hints', 'RuleSet.plain/textHinted/textLemmaHinted rulesForSentence (RuleSetTest + extras)', hintOps);

// ---- ruleset-hints-order: getPossibleValues / tokenHints iteration order (F25a review finding 1, guavaCapacity) ----
{
  const DE = ['der', 'die', 'das', 'eine', 'einen', 'einem', 'einer', 'eines', 'und', 'oder', 'aber', 'denn', 'weil', 'dass', 'wenn', 'als', 'wie', 'auch', 'noch', 'schon', 'sehr', 'mehr', 'nicht', 'kein', 'keine', 'mit', 'ohne', 'für', 'gegen', 'durch'];
  const EN = ['the', 'a', 'an', 'and', 'or', 'but', 'because', 'that', 'if', 'when', 'as', 'how', 'also', 'still', 'already', 'very', 'more', 'not', 'no', 'none', 'with', 'without', 'for', 'against', 'through', 'Apple', 'Zebra', 'house', 'Mouse', 'tree'];
  const UM = ['Äpfel', 'Öl', 'Übung', 'äußerst', 'schön', 'Füße', 'größer', 'Mädchen', 'über', 'Bär', 'Löwe', 'Mühle', 'Straße', 'Käse', 'Ärger', 'Ökonomie', 'Müll', 'Bücher', 'Hände', 'Tür', 'Köln', 'Fräulein', 'Jäger', 'Gänse', 'Würfel', 'Nüsse', 'Böden', 'Lüge', 'Süden', 'Ölung'];
  const AB = Array.from({ length: 30 }, (_, i) => 'ab' + String.fromCharCode(99 + i % 24) + (i >= 24 ? '1' : ''));
  const lists = { de: DE, en: EN, um: UM, ab: AB };
  const ordOps = [];
  const orOp = (rules) => op({ dump: true, rules }, 'ruleset-hints');
  for (const [ln, L] of Object.entries(lists)) {
    for (const call of ['tokenRegex', 'csTokenRegex']) {
      for (let n = 1; n <= 30; n++) ordOps.push(orOp([B([call, L.slice(0, n).join('|')])]));
    }
    for (const n of [3, 6, 12, 24]) {
      ordOps.push(orOp([B(['tokenRegex', L.slice(0, n).join('|')], ['matchInflectedForms'])]));
      ordOps.push(orOp([B(['csTokenRegex', L.slice(0, n).join('|')], ['matchInflectedForms'])]));
      ordOps.push(orOp([B(['tokenRegex', '(' + L.slice(0, n).join('|') + ')'])]));
      ordOps.push(orOp([B(['tokenRegex', L.slice(0, n).join('|')], ['negate'])]));
    }
  }
  const rx = (n, L = DE, call = 'tokenRegex') => B([call, L.slice(0, n).join('|')]);
  const combos = [
    [B(['tokenRegex', 'abc|abd|abe']), B(['tokenRegex', 'der|die|eine'])],
    [B(['tokenRegex', 'der|die|eine']), B(['tokenRegex', 'abc|abd|abe'])],
    [rx(3), rx(3, AB)], [rx(6), rx(6, AB)], [rx(12), rx(12, AB)], [rx(24), rx(24, AB)],
    [rx(3, DE, 'csTokenRegex'), rx(3, AB, 'csTokenRegex')], [rx(12, DE, 'csTokenRegex'), rx(12, EN, 'csTokenRegex')],
    [rx(5), rx(9), rx(2)], [rx(2), rx(9, EN), rx(5, UM)], [rx(7, UM), rx(7, DE)], [rx(4, EN), rx(4, UM), rx(4, DE)],
    [B(['token', 'der']), rx(3)], [rx(3), B(['token', 'xyz'])], [rx(3), B(['token', 'Der'])], [rx(8), B(['pos', 'NN']), rx(8, AB)],
    [rx(3), B(['tokenRegex', 'x|y|z'], ['matchInflectedForms'])], [rx(6, EN), rx(6, UM, 'csTokenRegex')],
    [rx(15, DE), rx(15, EN)], [rx(30, AB), rx(30, DE)], [rx(10, UM), rx(10, AB), rx(10, EN), rx(10, DE)],
    [B(['tokenRegex', 'abc|abd|abe'], ['min', 0]), B(['tokenRegex', 'der|die|eine'])],
    [B(['tokenRegex', 'abc|abd|abe']), B(['tokenRegex', 'der|die|eine'], ['setSkip', 1]), rx(2, EN)],
  ];
  for (const c of combos) ordOps.push(orOp([c.length ? { tokens: c } : []]));
  ordOps.push(orOp(combos.slice(0, 6).map((c) => ({ tokens: c }))));
  // rulesForSentence: sentences that contain only one hint each
  const sents = (c) => {
    const out = new Set();
    for (const t of c) {
      const call = t.find((x) => x[0].includes('oken'));
      if (!call) continue;
      for (const v of call[1].replace(/[()]/g, '').split('|').slice(0, 3)) out.add(v);
    }
    return [...out];
  };
  for (const c of combos) {
    for (const kind of ['text', 'lemma']) {
      for (const w of sents(c)) {
        ordOps.push(hint(kind, [{ tokens: c }], [S(w, 'NN', w)]));
        ordOps.push(hint(kind, [{ tokens: c }], [S('x', 'NN', w)]));
      }
    }
  }
  for (const kind of ['text', 'lemma']) {
    for (const w of ['der', 'abc', 'die', 'eine', 'abd', 'abe', 'xyz', 'DER', 'Der']) {
      ordOps.push(hint(kind, combos.slice(0, 6).map((c) => ({ tokens: c })), [S(w, 'NN', w)]));
      ordOps.push(hint(kind, combos.slice(0, 2).map((c) => ({ tokens: c })), [S(w), S('other')]));
    }
  }
  write('ruleset-hints-order', 'StringMatcher/PatternToken possible values and AbstractTokenBasedRule.tokenHints iteration order; RuleSet hinted rulesForSentence', ordOps);
}
console.log('cases written:', readdirSync(DIR).length);
