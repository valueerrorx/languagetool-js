// Authors oracle/cases/X-RULEINFRA/*.json (inputs only). Ops infra-harvest, regex-match, rule-transform, rule-text-match, rule-filter, hints-real (RuleInfraOps.java), format docs/review/F30-oracle.md.
// Rules/sentences are chosen by features from the Java harvest; expected values come only from the Java run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-RULEINFRA');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];

const hr = await runHarness({ ops: LANGS.map((L) => ({ op: 'infra-harvest', args: { lang: L.code } })) });
const harv = hr.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j)); return j.result; });
const corp = {};
for (const L of LANGS) {
  const corpus = readFileSync(path.join(ROOT, `oracle/corpus/${L.c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 25 && s.length <= 220);
  corp[L.c] = Array.from({ length: 120 }, (_, i) => corpus[Math.floor((i * corpus.length) / 120)]);
}
const HEAD = (lang) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${lang}">\n<category id="CAT" name="Category">\n`;
const FOOT = '</category>\n</rules>\n';
const xmlOf = (lang, body) => HEAD(lang) + body + FOOT;
const SHORT = { 'de-DE': 'de', 'en-US': 'en', fr: 'fr' };

// ---- 1. real regexp rules ----
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const rx = harv[li].rules.filter((x) => x[2] === 'regex');
  const per = 40;
  for (let ci = 0, st = 0; st < rx.length; ci++, st += per) {
    const slice = rx.slice(st, st + per);
    const texts = [];
    const idx = new Map();
    const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
    const jobs = slice.map((x, j) => {
      const own = [...x[10].slice(0, 5), ...x[9].slice(0, 2)].filter((s) => s.length < 1900);
      const ids = own.map(tid);
      // variants: upper-cased and leading-space/lower-cased first letter of the first incorrect example
      if (x[10][0] && x[10][0].length < 1900) {
        ids.push(tid(x[10][0].toUpperCase()));
        ids.push(tid(x[10][0].charAt(0).toLowerCase() + x[10][0].slice(1)));
        ids.push(tid(x[10][0] + ' ' + x[10][0]));
      }
      for (let k = 0; k < 2; k++) ids.push(tid(corp[L.c][(j * 3 + k * 11 + st) % 120]));
      return { src: { file: x[0], rule: x[1] }, texts: [...new Set(ids)] };
    });
    write(`regex-${L.c}-${String(ci).padStart(2, '0')}`, `real ${L.code} <regexp> rules (${slice.length}), RegexPatternRule#match on own examples, variants and corpus sentences (raw tagger sentences, noop chunker)`, [{ op: 'regex-match', args: { lang: L.code, texts, jobs } }]);
  }
  console.error(L.code, 'regex rules', rx.length);
}

// ---- 2. inline regexp rules ----
{
  const rules = [];
  const R = (attrs, re, msg, extra = '', ex = '') => rules.push(`<rule id="RX${rules.length}" name="r${rules.length}"><regexp${attrs}>${re.replace(/</g, "&lt;")}</regexp>${extra}<message>${msg}</message>${ex}</rule>`);
  R('', 'foo\\s+bar', 'm');
  R(' mark="1"', '(foo)\\s+(bar)', 'm');
  R(' mark="2"', '(foo)\\s+(bar)', 'm');
  R(' mark="3"', '(foo)\\s+(bar)', 'm');
  R(' mark="0"', '(foo)\\s+(bar)', 'm');
  R(' mark="-1"', '(foo)\\s+(bar)', 'm');
  R(' case_sensitive="yes"', 'Foo\\s+bar', 'm');
  R(' case_sensitive="no"', 'Foo\\s+bar', 'm');
  R('', 'Foo\\s+bar', 'm');
  R(' type="exact"', 'foo bar', 'm');
  R(' type="smart"', 'foo bar', 'm');
  R(' type="smart"', '[a b] foo bar', 'm');
  R(' mark="1"', '(foo) bar', 'x <suggestion>\\1</suggestion> y');
  R(' mark="1"', '(foo) (bar)', 'x <suggestion>\\2 \\1</suggestion> y \\1 and \\2');
  R('', '(foo) (bar)', 'x <suggestion>\\0</suggestion>');
  R('', '(foo) (bar)', 'x <suggestion>\\3</suggestion>');
  R('', '(foo) (bar)', 'x \\3');
  R('', '(foo)? (bar)', 'x <suggestion>\\1</suggestion> \\1|');
  R('', '(f)(o)(o)(b)(a)(r)(.)(.)(.)(.)(.)', '\\10 \\1 \\11');
  R('', '(foo) (bar)', '\\\\1 <suggestion>\\\\2</suggestion>');
  R('', '(foo) (bar)', 'a <suggestion>\\1</suggestion> b <suggestion>\\2</suggestion> c \\1 d <suggestion>\\2\\1</suggestion>');
  R('', '(foo) (bar)', 'a', '<suggestion>\\2 \\1</suggestion><suggestion>\\1</suggestion>');
  R('', '(foo) (bar)', 'a <suggestion>\\1</suggestion>', '<suggestion>\\2 \\1</suggestion>');
  R('', '(foo) (bar)', 'a', '<suggestion><match no="1" case_conversion="allupper"/> <match no="2" case_conversion="startupper"/></suggestion>');
  R('', '(foo) (bar)', 'a <suggestion><match no="1" regexp_match="o+" regexp_replace="0"/>-\\2</suggestion>');
  R('', '(FOO) (bar)', 'a <suggestion><match no="1" case_conversion="alllower"/></suggestion> <match no="2" case_conversion="allupper"/>');
  R('', '(foo) (bar)', 'a <suggestion><match no="1" regexp_match="(?i)^f" regexp_replace="$1"/></suggestion>');
  R('', '(Foo) (bar)', '<suggestion><match no="1" case_conversion="preserve"/></suggestion>');
  R('', '(?<w>foo) bar', 'x <suggestion>\\1</suggestion>');
  R('', 'foo(?=\\s+bar)', 'lookahead');
  R('', '(?<=foo\\s)bar', 'lookbehind');
  R(' mark="1"', '\\b(\\p{L}+)\\s+\\1\\b', 'repeated <suggestion>\\1</suggestion>');
  R('', 'straße|STRASSE|ſtrasse', 'unicode ci');
  R('', 'İstanbul|istanbul|ISTANBUL', 'turkish');
  R('', '\\p{Lu}\\w+', 'caps');
  R('', '\\d+\\s?[€$]', 'currency');
  R('', '^foo', 'start');
  R('', 'bar$', 'end');
  R('', 'foo.*bar', 'greedy');
  R('', 'foo.*?bar', 'lazy');
  R('', '[Ää]rzt\\w*', 'umlaut');
  R('', '\\uD83D\\uDE00|😀', 'emoji');
  R('', 'x{2,}', 'rep');
  R('', '(a|b)+c', 'alt <suggestion>\\1</suggestion>');
  R('', 'colou?r', 'colour', '<short>short msg</short><url>https://example.org/x</url>');
  R('', 'colou?r', 'colour', '<short>short msg</short>', '<example correction="x">a <marker>color</marker></example>');
  rules.push('<rulegroup id="GRP" name="grp"><short>gshort</short><url>https://example.org/g</url><rule><regexp>alpha</regexp><message>g1</message></rule><rule><regexp>beta</regexp><message>g2</message><short>own</short></rule></rulegroup>');
  rules.push('<rule id="FLT0" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:xyz|baz"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT1" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:\\bsee\\sfoo\\sbar"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT2" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:foo|zzz"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT3" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="noantipatterns:foo"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT4" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:(unclosed"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT5" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="nocolon"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT6" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:bar$"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT7" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:^Foo"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT8" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:a|b|c|\\d"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT9" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:zzz  extra:1"/><message>filtered</message></rule>');
  rules.push('<rule id="FLT10" name="f"><regexp>foo\\s+bar</regexp><filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:"/><message>filtered</message></rule>');
  const xml = xmlOf('en', rules.join('\n') + '\n');
  const texts = [
    'foo bar', 'Foo bar baz', 'Foo Bar', 'FOO BAR', 'a foo\u00a0bar b', 'foo\u202fbar', 'see foo bar', 'xyz foo bar', 'foo bar baz', 'foo bar foo bar foo  bar', 'foo baz', '',
    'foo foo bar bar', 'the the cat cat sat', 'Straße STRASSE strasse ſtrasse', 'İstanbul istanbul ISTANBUL ıstanbul', 'Der Ärzt und die ärzte.', 'ÄRZTLICH',
    'Hello World 12 € and 5$ 7 $', 'It is colour or color.', 'alpha beta gamma', 'xx xxx xxxx x', 'abc bbc aac c', 'a😀b \uD83D\uDE00 c', 'a\u0301 foo bar',
    'x'.repeat(1990) + ' foo bar', 'foo bar ' + 'y'.repeat(1992), 'foo bar ' + 'y'.repeat(1993), 'foo bar ' + 'y'.repeat(2500),
    'foo bar\nfoo bar', 'foo\tbar', '  foo bar  ', 'Foo bar. Foo bar.', 'abc1 foo bar 7',
  ];
  const nR = rules.length;
  const jobs = [];
  for (let i = 0; i < nR; i++) jobs.push({ src: { rule: i }, texts: texts.map((_, k) => k) });
  // load errors / structural cases each in own xml
  const bad = [
    '<rule id="B0" name="b"><regexp>(foo) (bar)</regexp><message>a <suggestion><match no="1" regexp_match="(" regexp_replace="x"/></suggestion></message></rule>',
    '<rule id="B1" name="b"><regexp>(</regexp><message>m</message></rule>',
    '<rule id="B2" name="b"><regexp mark="x">foo</regexp><message>m</message></rule>',
    '<rule id="B3" name="b"><regexp>foo</regexp><antipattern><token>a</token></antipattern><message>m</message></rule>',
    '<rulegroup id="B4" name="b"><antipattern><token>a</token></antipattern><rule><regexp>foo</regexp><message>m</message></rule></rulegroup>',
    '<rule id="B5" name="b"><regexp>foo</regexp><filter class="org.languagetool.rules.patterns.RuleFilter" args="a:b"/><message>m</message></rule>',
    '<rule id="B6" name="b"><regexp>foo</regexp><filter class="does.not.Exist" args="a:b"/><message>m</message></rule>',
    '<rule id="B7" name="b"><regexp>foo</regexp><filter class="java.lang.String" args="a:b"/><message>m</message></rule>',
    '<rule id="B8" name="b"><regexp></regexp><message>m</message></rule>',
    '<rule id="B9" name="b"><regexp>a</regexp><pattern><token>a</token></pattern><message>m</message></rule>',
    '<rule id="B10" name="b"><regexp>foo</regexp></rule>',
    '<rule id="B11" name="b"><regexp case_sensitive="maybe">foo</regexp><message>m</message></rule>',
  ];
  const ops = [{ op: 'regex-match', args: { lang: 'en-US', xml, texts, jobs } }];
  for (const b of bad) ops.push({ op: 'regex-match', args: { lang: 'en-US', xml: xmlOf('en', b + '\n'), texts: ['foo bar'], jobs: [{ src: { rule: 0 }, texts: [0] }] } });
  write('regex-inline-en', 'inline <regexp> rules (mark, case_sensitive, type, message/suggestion refs, match elements, regex anti-pattern filter, MAX_SENT_LENGTH, unicode) on handwritten sentences + load errors', ops);
  // de and fr minimal inline variants (language-specific case conversion / locale)
  for (const [lc, code, rxs, txs] of [
    ['de', 'de-DE', [['(stra\u00dfe)', '<suggestion><match no="1" case_conversion="startupper"/></suggestion>'], ['(\u00e4rzte?)', '<suggestion><match no="1" case_conversion="allupper"/></suggestion>'], ['(ich) (bin)', '<suggestion>\\2 \\1</suggestion>']], ['Die Stra\u00dfe ist lang.', 'STRA\u00dfE und \u00e4rzte', 'Ich bin hier. ich bin da', 'Der \u00c4rzte kam', 'Gro\u00dfe Stra\u00dfe, kleine Stra\u00dfe']],
    ['fr', 'fr', [['(l\u2019\u00e9t\u00e9)', '<suggestion><match no="1" case_conversion="startupper"/></suggestion>'], ['(\u0153uf)s?', '<suggestion><match no="1" case_conversion="allupper"/></suggestion>'], ['(i\u00e7i) (l\u00e0)', '<suggestion>\\2 \\1</suggestion>']], ["L\u2019\u00e9t\u00e9 est l\u00e0.", "des \u0153ufs frais", "\u0152UF et \u0153ufs", "ici l\u00e0 ou ICI L\u00c0", "\u00c9T\u00c9"]],
  ]) {
    const rr = rxs.map(([re, msg], i) => `<rule id="${lc.toUpperCase()}${i}" name="n"><regexp>${re}</regexp><message>m ${msg}</message></rule>`).join('\n') + '\n';
    write(`regex-inline-${lc}`, `inline ${code} <regexp> rules with case conversion in language locale`, [{ op: 'regex-match', args: { lang: code, xml: xmlOf(lc, rr), texts: txs, jobs: rxs.map((_, i) => ({ src: { rule: i }, texts: txs.map((__, k) => k) })) } }]);
  }
}

// ---- 3. transformers ----
const trOps = (lang, files) => ['repeated', 'consistency', 'tool'].map((t) => ({ op: 'rule-transform', args: { lang, ...(files ? { files } : {}), transformer: t } }));
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const ops = trOps(L.code);
  for (let f = 0; f < harv[li].files.length; f++) ops.push(...trOps(L.code, [f]).slice(0, 2));
  write(`transform-real-${L.c}`, `Repeated/ConsistencyPatternRuleTransformer#apply and JLanguageTool#transformPatternRules on all real ${L.code} rule files and per file (remaining vs transformed order, ids, wrapped rules)`, ops);
}
{
  const ops = [];
  const mk = (lang, body) => xmlOf(lang, body + '\n');
  const rep = (id, mp, dist, tok, extra = '') => `<rulegroup id="${id}" name="n" min_prev_matches="${mp}"${dist ? ` distance_tokens="${dist}"` : ''}${extra}><rule><pattern><token>${tok}</token></pattern><message>m ${id}</message><example correction="">a <marker>${tok}</marker></example></rule></rulegroup>`;
  const many = [];
  for (const id of ['REP_ALPHA', 'REP_BETA', 'REP_GAMMA', 'REP_DELTA', 'A', 'B', 'ZZ', 'REP_ONE', 'REP_TWO', 'REP_THREE', 'REP_FOUR', 'REP_FIVE', 'x1', 'x2', 'Aa', 'BB', 'REP_\u00c4', 'REP_\u00df']) many.push(rep(id, 1 + (id.length % 3), id.length % 2 ? 0 : 20, id.toLowerCase().replace(/[^a-z]/g, 'q') || 'q'));
  many.push('<rule id="PLAIN1" name="p"><pattern><token>plain</token></pattern><message>m</message><example correction="">a <marker>plain</marker></example></rule>');
  many.push('<rule id="REP_SINGLE" name="s" min_prev_matches="2" distance_tokens="7"><pattern><token>single</token></pattern><message>m</message><example correction="">a <marker>single</marker></example></rule>');
  many.push('<rule id="REP_SINGLE" name="s2" min_prev_matches="3"><pattern><token>single2</token></pattern><message>m</message><example correction="">a <marker>single2</marker></example></rule>');
  many.push('<rule id="REP_ZERO" name="z" min_prev_matches="0"><pattern><token>zero</token></pattern><message>m</message><example correction="">a <marker>zero</marker></example></rule>');
  many.push('<rule id="REP_PREM" name="z" min_prev_matches="1" default="off" tags="picky"><pattern><token>prem</token></pattern><message>m</message><example correction="">a <marker>prem</marker></example></rule>');
  many.push('<rulegroup id="REP_MIX" name="mix" distance_tokens="9"><rule min_prev_matches="1"><pattern><token>mixa</token></pattern><message>m</message><example correction="">a <marker>mixa</marker></example></rule><rule><pattern><token>mixb</token></pattern><message>m</message><example correction="">a <marker>mixb</marker></example></rule></rulegroup>');
  ops.push(...trOps('en-US').map((o) => ({ ...o, args: { ...o.args, xml: mk('en', many.join('\n')) } })));
  const P = 'PREFIXFORCONSISTENCYRULES_';
  const cons = (id, tok) => `<rule id="${id}" name="n"><pattern><token>${tok}</token></pattern><message>m ${id}</message><example correction="">a <marker>${tok}</marker></example></rule>`;
  const consBody = [cons(P + 'SPELL_UK', 'colour'), cons(P + 'SPELL_US', 'color'), cons(P + 'DATE_ISO', 'iso'), cons(P + 'DATE_US', 'usd'), cons(P + 'DATE_EU', 'eud'), cons(P + 'X_A_B', 'xab'), cons(P + 'X_C', 'xc'), cons('PREFIXFORCONSISTENCYRULES', 'nop'), cons('OTHER_SPELL_UK', 'other'), cons('R_1', 'r1'), cons('R_2', 'r2'), cons(P + '\u00c4_\u00df', 'au')].join('\n');
  ops.push(...trOps('en-US').map((o) => ({ ...o, args: { ...o.args, xml: mk('en', consBody) } })));
  for (const bad of [P + 'ONLYONE', P, 'PREFIXFORCONSISTENCYRULES_A__B', 'PREFIXFORCONSISTENCYRULES__B_C']) {
    ops.push({ op: 'rule-transform', args: { lang: 'en-US', xml: mk('en', cons(bad, 'zz')), transformer: 'consistency' } });
    ops.push({ op: 'rule-transform', args: { lang: 'en-US', xml: mk('en', cons(bad, 'zz')), transformer: 'tool' } });
  }
  ops.push({ op: 'rule-transform', args: { lang: 'de-DE', xml: mk('de', rep('REP_DE', 2, 30, 'sehr') + cons(P + 'S_A', 'a') + cons(P + 'S_B', 'b')), transformer: 'tool' } });
  ops.push({ op: 'rule-transform', args: { lang: 'fr', xml: mk('fr', rep('REP_FR', 2, 0, 'tr\u00e8s') + cons(P + 'S_A', 'a')), transformer: 'tool' } });
  ops.push({ op: 'rule-transform', args: { lang: 'en-US', xml: mk('en', ''), transformer: 'repeated' } });
  write('transform-inline', 'transformers on inline rules: many ids (HashMap order), single rule ids, min_prev_matches=0, rulegroup vs rule attributes, premium/tags, consistency id conventions and errors (ArrayIndexOutOfBounds)', ops);
}

// ---- 4. text-level matching of transformed rules ----
const fillerOf = (c, n, off = 0) => Array.from({ length: n }, (_, i) => corp[c][(off + i * 7) % 120]);
{
  // real repeated rules (en, fr): determine the transformed order from Java, then drive each group
  for (const [li, L] of [[1, LANGS[1]], [2, LANGS[2]]]) {
    const r = await runHarness({ ops: [{ op: 'rule-transform', args: { lang: L.code, transformer: 'repeated' } }] });
    const j = JSON.parse(r.responses.split('\n')[0]);
    if (!j.ok) throw new Error(JSON.stringify(j));
    const trans = j.result.transformed;
    const byId = new Map();
    for (const x of harv[li].rules) if (x[5] > 0) { if (!byId.has(x[3])) byId.set(x[3], []); byId.get(x[3]).push(x); }
    const CH = 12;
    for (let ci = 0, st = 0; st < trans.length; ci++, st += CH) {
      const slice = trans.slice(st, st + CH);
      const texts = [];
      const idx = new Map();
      const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
      const jobs = slice.map((t, k) => {
        const members = byId.get(t.id) ?? [];
        const inc = members.flatMap((m) => m[10]).filter((s) => s.length < 400);
        const mp = Math.max(1, members[0] ? members[0][5] : 1);
        const ids = [];
        if (inc.length > 0) {
          const e0 = inc[0];
          const e1 = inc[inc.length > 1 ? 1 : 0];
          const fl = fillerOf(L.c, 14, st + k);
          ids.push(tid(e0));
          ids.push(tid([e0, e0].join(' ')));
          ids.push(tid(Array.from({ length: mp + 1 }, () => e0).join(' ')));
          ids.push(tid(Array.from({ length: mp + 2 }, (_, i) => (i % 2 ? e1 : e0) + ' ' + fl[i]).join(' ')));
          ids.push(tid(Array.from({ length: mp + 1 }, (_, i) => e0 + ' ' + fl.slice(i, i + 13).join(' ')).join(' ')));
          ids.push(tid(inc.slice(0, 6).join(' ')));
          for (const e of inc.slice(0, L.c === 'en' ? 8 : 3)) ids.push(tid(Array.from({ length: mp + 2 }, () => e).join(' ')));
          ids.push(tid(inc.slice(0, 3).join(' ') + ' ' + fl.slice(0, 4).join(' ') + ' ' + inc.slice(0, 3).join(' ')));
        }
        ids.push(tid(fillerOf(L.c, 10, st + k * 5).join(' ')));
        return { rule: st + k, texts: ids };
      });
      write(`textmatch-${L.c}-${String(ci).padStart(2, '0')}`, `RepeatedPatternRule#match (text level) for real ${L.code} min_prev_matches rules ${st}..${st + slice.length - 1} of the transformed list, raw tagger sentences`, [{ op: 'rule-text-match', args: { lang: L.code, transformer: 'repeated', texts, jobs } }]);
    }
    console.error(L.code, 'transformed repeated groups', trans.length);
  }
}
{
  const ops = [];
  const P = 'PREFIXFORCONSISTENCYRULES_';
  const cons = (id, tok) => `<rule id="${id}" name="n"><pattern><token>${tok}</token></pattern><message>m ${id}</message><example correction="">a <marker>${tok}</marker></example></rule>`;
  const body = [cons(P + 'SPELL_UK', 'colour'), cons(P + 'SPELL_US', 'color'), cons(P + 'SPELL_CA', 'colur'), cons(P + 'DATE_ISO', 'iso'), cons(P + 'DATE_US', 'usd')].join('\n') + '\n';
  const T = [
    'I like colour. The colour is nice. A third colour appears. Only one color here.',
    'I like color. The color is nice. One colour.',
    'colour color. colour color.',
    'colour. color. colur.',
    'colour colour colour color color color colur colur colur.',
    'No match here at all.', '', 'color', 'iso usd. iso usd. iso.', 'colour\n\ncolor\n\ncolour', 'The colour. The color.  The colour.   The color.',
    'Ein colour. Ein color. \u00c4ndern colour. colour.',
  ];
  ops.push({ op: 'rule-text-match', args: { lang: 'en-US', xml: xmlOf('en', body), transformer: 'consistency', texts: T, jobs: [0, 1].map((r) => ({ rule: r, texts: T.map((_, i) => i) })) } });
  const rb = (id, mp, dist, tok, msg = 'm') => `<rulegroup id="${id}" name="n" min_prev_matches="${mp}"${dist ? ` distance_tokens="${dist}"` : ''}><rule><pattern><token>${tok}</token></pattern><message>${msg}</message><example correction="">a <marker>${tok}</marker></example></rule></rulegroup>`;
  const rep = [rb('REP_VERY', 2, 12, 'very'), rb('REP_REALLY', 1, 0, 'really'), rb('REP_QUITE', 3, 5, 'quite'), '<rulegroup id="REP_GRP" name="g" min_prev_matches="1" distance_tokens="30"><rule><pattern><token>big</token></pattern><message>big</message><example correction="">a <marker>big</marker></example></rule><rule><pattern><token>huge</token></pattern><message>huge</message><example correction="">a <marker>huge</marker></example></rule></rulegroup>'].join('\n') + '\n';
  const filler = 'The cat sat on the mat and looked at the old green door of the house by the river.';
  const T2 = [
    'This is very good and very nice and very big.', 'This is very good. It is very nice. So very pretty. Truly very fine.', 'very. very. very. very. very.',
    `very ${filler} very ${filler} very ${filler} very`, `very ${filler} ${filler} ${filler} very ${filler} ${filler} very`,
    'really nice. really good. really bad.', 'quite quite quite quite quite quite', 'quite. nothing here at all in between. quite. quite. quite.',
    'big. huge. big. huge. big. big huge.', 'Nothing.', '', 'very really quite big huge very really quite big huge very really quite big huge',
    'Sehr gut. Very very very. \u00c4hnlich very.', ' very  very   very ', 'very\n\nvery\n\nvery\n\nvery',
  ];
  ops.push({ op: 'rule-text-match', args: { lang: 'en-US', xml: xmlOf('en', rep), transformer: 'repeated', texts: T2, jobs: [0, 1, 2, 3].map((r) => ({ rule: r, texts: T2.map((_, i) => i) })) } });
  // out-of-range rule index -> error entry
  ops.push({ op: 'rule-text-match', args: { lang: 'en-US', xml: xmlOf('en', rep), transformer: 'repeated', texts: ['very very very'], jobs: [{ rule: 9, texts: [0] }, { rule: 0, texts: [0] }] } });
  write('textmatch-inline', 'ConsistencyPatternRule#match and RepeatedPatternRule#match on inline rules over multi-sentence texts (counts, ties, minority, distance windows, offsets across sentences)', ops);
}

// ---- 5. RuleFilter / RuleFilterEvaluator ----
{
  const T = 'The quick brown fox jumps over the lazy dog today.';
  const ARGS = ['a:b', 'a:\\1', 'a:\\1 b:\\2', 'a:\\1 a:\\2', 'a:b a:\\1', 'a:\\1 a:b', 'a:\\0', 'a:\\9', 'a:\\-1', 'a:\\x', 'a:\\', 'a:\\1\\2', 'a:\\\\1', 'noColon', '', ' a:b', 'a:b ', 'a:b\tc:d', 'a:b\nc:d', 'a:b  c:d', 'a:b\u00a0c:d', ':x', 'a:', 'a:b:c', 'a:\\1:x', 'a:\\99999999999', 'a:\\+1', 'a:\\\u0663', 'a:\\\uff11', 'a:\\2147483647', 'a:\\3 b:\\3', 'a:x\\1', 'a:\\ 1', 'a:b c', 'k1:v1 k2:\\2 k3:\\1 k4:lit', '\\1:x', 'a:\\1 \\2', 'a:\\00', 'a:\\007', 'A:\\1 a:\\1'];
  const PS = [[1, 1, 1], [1, 2, 1], [1], [], [2, 3], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [0, 1], [-1, 2]];
  const ops = [];
  for (const args of ARGS) {
    for (const [pi, tp] of PS.entries()) {
      ops.push({ op: 'rule-filter', args: { kind: 'resolve', lang: 'en-US', filterArgs: args, text: T, patternTokenPos: pi % 3, tokenPositions: tp } });
    }
    ops.push({ op: 'rule-filter', args: { kind: 'resolve', lang: 'en-US', filterArgs: args, text: T, window: [2, 4], patternTokenPos: 1, tokenPositions: [1, 1, 1] } });
    ops.push({ op: 'rule-filter', args: { kind: 'resolve', lang: 'en-US', filterArgs: args, tokens: ['x', 'y\u00e4', '\ud83d\ude00'], patternTokenPos: 0, tokenPositions: [1, 1, 1] } });
  }
  write('filter-resolve-synthetic', 'RuleFilterEvaluator#getResolvedArguments: key:value syntax, \\N references with skip correction, number parsing traps, duplicate keys, bounds errors (map in HashMap iteration order)', ops);

  // real filter args from the rule files, evaluated on rule examples
  for (let li = 0; li < LANGS.length; li++) {
    const L = LANGS[li];
    const seen = new Map();
    for (const x of harv[li].rules) if (x[8] && !seen.has(x[8])) seen.set(x[8], x);
    const rops = [];
    for (const [fa, x] of seen) {
      const ex = x[10][0] ?? x[9][0] ?? corp[L.c][0];
      if (ex.length > 1500) continue;
      for (const tp of [[1, 1, 1, 1, 1, 1], [1, 2, 1, 1, 1], [1, 1]]) rops.push({ op: 'rule-filter', args: { kind: 'resolve', lang: L.code, filterArgs: fa, text: ex, patternTokenPos: 1, tokenPositions: tp } });
    }
    write(`filter-resolve-real-${L.c}`, `getResolvedArguments with the ${seen.size} distinct real ${L.code} filter args on rule examples`, rops);
    console.error(L.code, 'distinct filter args', seen.size);
  }

  const run = [];
  for (const args of ['a:b', 'a:\\1 b:\\2', 'reject:1', 'throw:1', 'io:1', 'a:\\1 reject:x', 'a:\\9', 'bad', 'k:\\2']) {
    for (const tp of [[1, 1, 1], [1, 2, 1], [2]]) run.push({ op: 'rule-filter', args: { kind: 'run', lang: 'en-US', filterArgs: args, text: T, from: 4, to: 9, patternTokenPos: 2, tokenPositions: tp } });
  }
  write('filter-run', 'RuleFilterEvaluator#runFilter with an echo filter: resolved args, patternTokenPos, tokens and positions as seen by RuleFilter#acceptRuleMatch; null result, RuntimeException and IOException from the filter', run);

  const h = [];
  const MAP = [['a', 'x'], ['b', ''], ['n', null], ['\u00e4', '\u00fc']];
  for (const key of ['a', 'b', 'n', 'zz', '\u00e4', '']) {
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getRequired', lang: 'en-US', key, map: MAP } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getOptional', lang: 'en-US', key, map: MAP } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getOptional3', lang: 'en-US', key, map: MAP, default: 'dflt' } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getOptional3', lang: 'en-US', key, map: MAP, default: null } });
  }
  for (const tp of [[1, 1, 1], [1, 2, 1], [3], [], [0, 2], [-1, 1], [5, 5, 5]]) {
    for (const ref of [-3, -1, 0, 1, 2, 3, 5, 100]) h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getSkipCorrectedReference', lang: 'en-US', tokenPositions: tp, ref } });
  }
  const xml = xmlOf('en', '<rule id="PAT_RULE" name="p"><pattern><token>a</token></pattern><message>m</message></rule>\n<rule id="RX_RULE" name="r"><regexp>a</regexp><message>m</message></rule>\n<rulegroup id="GRP_RULE" name="g"><rule><pattern><token>a</token></pattern><message>m</message></rule><rule><pattern><token>b</token></pattern><message>m</message></rule></rulegroup>\n');
  const STRS = ['marker', 'marker+1', 'marker-1', 'marker+0', 'marker+x', 'markerabc', 'marker5', 'marker+2147483647', 'marker-', 'marker+', 'marker\u0663', '1', '3', '0', '-1', '99', ' 1', '+2', '1.0', '', 'abc', '2147483647', '12', 'Marker', 'marker +1'];
  for (const s of STRS) {
    for (const from of [-1, 0, 1, 4, 10, 16, 20, 50, 100]) {
      h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', text: T, from, str: s } });
    }
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', xml, src: { rule: 0 }, text: T, from: 4, str: s } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', xml, src: { rule: 2 }, text: T, from: 4, str: s } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', xml, src: { rule: 1 }, text: 'a b a', from: 0, str: s } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', text: '', from: 0, str: s } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getPosition', lang: 'en-US', text: T, window: [1, 5], from: 4, str: s } });
  }
  for (const tx of [T, 'Hello, world.', '... Hi there', '"Quote" start', '(a) b', '!! ?', 'A', '', '\u00bfQu\u00e9? s\u00ed.']) {
    for (const from of [-1, 0, 1, 2, 3, 4, 6, 9, 12, 20, 40, 100]) h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'isMatchAtSentenceStart', lang: 'en-US', text: tx, from } });
  }
  for (const args of [[['a', 'b']], [['reject', '1']], [['throw', '1']], []]) {
    for (const first of [-1, 0, 2, 9]) h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'matches', lang: 'en-US', text: T, first, map: args, tokenPositions: [1, 2] } });
  }
  for (const setLang of [undefined, null, 'de-DE', 'fr']) {
    const base = setLang === undefined ? {} : { setLang };
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getLanguageFromRuleMatch', lang: 'en-US', ...base } });
    for (const r of [0, 1, 2]) h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getLanguageFromRuleMatch', lang: 'en-US', xml, src: { rule: r }, ...base } });
    h.push({ op: 'rule-filter', args: { kind: 'helper', method: 'getLanguageFromRuleMatch', lang: 'de-DE', xml: xmlOf('de', '<rule id="DE_PAT" name="p"><pattern><token>a</token></pattern><message>m</message></rule>\n'), src: { rule: 0 }, ...base } });
  }
  write('filter-helper', 'RuleFilter base helpers via a subclass: getRequired/getOptional, getPosition (marker syntax, bounds, parse errors, getFullId in message), isMatchAtSentenceStart, getSkipCorrectedReference, matches, getLanguageFromRuleMatch/setLanguage (ClassCastException for regexp rules)', h);
}

// ---- 6. hint pre-filter on real sentences ----
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const rules = harv[li].rules.filter((x) => x[10].length > 0 && x[10][0].length < 400);
  const texts = [];
  for (let i = 0; i < 14; i++) texts.push(rules[Math.floor(((i + 0.5) * rules.length) / 14)][10][0]);
  for (let i = 0; i < 6; i++) texts.push(corp[L.c][i * 17 % 120]);
  texts.push('', 'A', '!!! ??? ...', texts[0].toUpperCase());
  write(`hints-real-${L.c}`, `RuleSet.textHinted/textLemmaHinted vs plain on real ${L.code} rules (all rule files): rule indices kept per sentence and the matches of kept vs all rules (Java: equal flag), raw tagger sentences`,
    texts.map((t) => ({ op: 'hints-real', args: { lang: L.code, text: t } })));
}
console.error('done');
