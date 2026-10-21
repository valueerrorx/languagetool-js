// Authors oracle/cases/X-SLCHECK and X-SKCHECK (W02: Slovenian / Slovak full-pipeline checks). Inputs only; docs/review/W02-oracle.md.
// Usage: node oracle/scripts/gen-cases-w2check.mjs [sl|sk ...]. Synth cases (sk) harvest lemma/tag from tests/golden/X-SKCHECK/tag-* if present (run the tag cases first).
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

preflight();
const MOD = path.join(ROOT, 'oracle/java-src/languagetool-language-modules');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const title = (w) => w.charAt(0).toUpperCase() + w.slice(1);

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// <example ...>text</example> -> {type, correction, text (markers removed), marked (marker content)}
function examples(file) {
  const xml = readFileSync(file, 'utf8');
  const out = [];
  for (const m of xml.matchAll(/<example([^>]*)>([^]*?)<\/example>/g)) {
    const attrs = m[1];
    const body = unescapeXml(m[2]);
    const corr = /correction="([^"]*)"/.exec(attrs);
    const type = /type="([^"]*)"/.exec(attrs);
    const text = body.replace(/<\/?marker>/g, '').replace(/\s+/g, ' ').trim();
    const mk = /<marker>([^]*?)<\/marker>/.exec(body);
    const first = corr ? unescapeXml(corr[1]).split('|')[0] : null;
    const fixed = mk && first !== null ? body.replace(/<marker>[^]*?<\/marker>/, first).replace(/<\/?marker>/g, '').replace(/\s+/g, ' ').trim() : null;
    out.push({ type: type ? type[1] : 'correct', text, fixed });
  }
  return out;
}
// Java string literals of a call such as testSplit("a", "b")
function javaStrings(file, fn) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  const re = new RegExp(`${fn}\\s*\\(([^;]*?)\\);`, 'gs');
  for (const m of src.matchAll(re)) {
    const args = m[1];
    const parts = [];
    for (const s of args.matchAll(/"((?:\\.|[^"\\])*)"/g)) parts.push(JSON.parse(`"${s[1].replace(/\\'/g, "'")}"`));
    out.push(parts);
  }
  return out;
}

const CFG = {
  sl: {
    id: 'X-SLCHECK', mod: 'sl', codes: ['sl', 'sl-SI'], ruleIds: ['WORD_REPEAT_RULE', 'MORFOLOGIK_RULE_SL_SI', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'DOUBLE_PUNCTUATION', 'UNPAIRED_BRACKETS', 'MULTIPLE_WHITESPACE', 'TO_JE_BREZ_VEJICE', 'KI_BREZ_VEJICE', 'PREDLOG_S'],
    xml: ['rules/sl/grammar.xml'],
    junit: [
      'Tukaj vnesite svoje besedilo... Pa poglejmo primer besedila s nekaj napakami ki jih lahko razpozna orodje LanguageTool; ko opazite napake, jih lahko enostavno popiravite. ( Obenem se izvrši tudi preverjanje črkovanja črkovanja.',
      'Kupil je npr. jajca, moko in mleko.',
    ],
    edge: ['Včeraj sem šel v trgovino in kupil kruh, mleko ter jabolka.', 'ČŠŽ čšž ĆĐ ćđ', 'To je je test.', 'To je test ,brez presledka.', 'To je (test.', 'Šel sem s sestro. S tem se ne strinjam. Z njim sem govoril. Šel sem z mamo.', 'Ali veš, da je to res? Ne vem. Morda.', 'Ta hiša je velika, vendar hladna. Ker je mraz, kurimo.', 'Dne 1. 1. 2020 ob 12.30 uri smo se srečali.', 'Cena je 5 EUR (5,00 €).', 'Pogovor je bil dolg, ki ga ni nihče pozabil.', 'Slovenija, Ljubljana, Maribor, Celje, Kranj.'],
    spellWords: ['hiša', 'kruh', 'mleko', 'jabolko', 'računalnik', 'Ljubljana', 'študent', 'šola', 'žena', 'čas', 'voda', 'ptica', 'delo', 'mesto', 'ljudje'],
  },
  sk: {
    id: 'X-SKCHECK', mod: 'sk', codes: ['sk', 'sk-SK'], ruleIds: ['WORD_REPEAT_RULE', 'MORFOLOGIK_RULE_SK_SK', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'DOUBLE_PUNCTUATION', 'UNPAIRED_BRACKETS', 'MULTIPLE_WHITESPACE', 'SK_COMPOUNDS'],
    xml: ['rules/sk/grammar.xml', 'rules/sk/grammar-typography.xml', 'rules/sk/grammar-nezaradene.xml'],
    junit: ['Wikipédia neobsahuje článok s takýmto názvom.', 'Tu nájdete vybrané čísla a obsahy časopisu Kultúra slova.', 'blabla', 'česko-slovenský', 'rakúsko-uhorský', 'bim bam', 'bim-bam'],
    edge: ['Dobrý deň, ako sa máš?', 'ĽŠČŽÝÁÍÉŤŇÓÚĎ ľščžýáíéťňóúď äôĺŕ', 'To je je test.', 'To je test ,bez medzery.', 'To je (test.', 'Včera som išiel do obchodu a kúpil chlieb, mlieko a jablká.', 'Dňa 1. 1. 2020 o 12.30 hod. sme sa stretli.', 'Cena je 5 EUR (5,00 €).', 'Bratislava, Košice, Prešov, Žilina, Nitra.', 'Ten človek, ktorý tam stojí, je môj brat.', 'Slovenská republika vznikla 1. januára 1993.'],
    spellWords: ['dom', 'chlieb', 'mlieko', 'jablko', 'počítač', 'Bratislava', 'študent', 'škola', 'žena', 'čas', 'voda', 'vták', 'práca', 'mesto', 'ľudia'],
  },
};
const COMMON_EDGE = ['', ' ', '  ', 'x', '.', '...', 'a', '\n', '\n\n', 'Ünï cödé wörds — „Citat“ «text» "x" ‹ainsi›.', 'a'.repeat(300), 'Prva vrstica.\nDruga vrstica.', 'Tab\tseparated.', '1234 5678.', '😀 Emoji 😀.', 'Hello world, this is an English sentence.', 'Das ist ein deutscher Satz.', '<b>bold</b> &amp; &lt;tag&gt;', 'http://example.com/a?b=c&d=e www.example.org a@b.com', '((( [[[ {{{ ))) ]]] }}}', '"Zitat ohne Ende', 'a,b;c:d!e?f', '  führende Leerzeichen  und  doppelte  ', 'Konec.  Začetek.', '\u00a0nbsp\u00a0test\u00a0', 'zero\u200bwidth', ('Beseda '.repeat(400)).trim() + '.'];

const w = (dir, name, description, compare, ops, normalize = ['paths']) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize, compare, ops }) + '\n');
const wh = (dir, kind, name, body) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind, clock: 'fixed', ...body }, null, 1) + '\n');
const chk = (lang, text, extra = {}) => ({ op: 'check', args: { lang, text, ...extra } });

function walkTag(x, m) {
  if (!Array.isArray(x)) return;
  if (x.length === 6 && typeof x[0] === 'string' && Array.isArray(x[4])) {
    for (const rd of x[4]) if (rd[1] && rd[2]) { if (!m.has(rd[1])) m.set(rd[1], new Set()); m.get(rd[1]).add(rd[2]); }
    return;
  }
  x.forEach((y) => walkTag(y, m));
}

async function gen(key) {
  const c = CFG[key];
  const DIR = path.join(ROOT, 'oracle/cases', c.id);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const base = c.codes[0];
  const R = path.join(MOD, c.mod, 'src/main/resources/org/languagetool');
  const T = path.join(MOD, c.mod, 'src/test/java/org/languagetool');

  // sources
  const exs = c.xml.flatMap((f) => examples(path.join(R, f)));
  const exTexts = uniq(exs.map((e) => e.text));
  const exFixed = uniq(exs.filter((e) => e.fixed).map((e) => e.fixed));
  const junit = [...c.junit];
  if (key === 'sk') {
    for (const parts of javaStrings(path.join(T, 'tokenizers/sk/SlovakSentenceTokenizerTest.java'), 'testSplit')) junit.push(parts.join(''));
  }
  const junitU = uniq(junit);
  const words = uniq(exTexts.concat(exFixed).flatMap((t) => t.split(/[\s.,;:!?()„“"»«]+/)).filter((x) => x.length > 1 && !/\d/.test(x)));
  const stats = { examples: exs.length, exTexts: exTexts.length, junit: junitU.length, words: words.length };

  // checks: demo + JUnit sentences, both language codes, DEFAULT and PICKY
  for (const code of c.codes) {
    w(DIR, `junit-${code}`, `${key} full check of demo/JUnit sentences, ${code}, DEFAULT and PICKY`, 'check',
      ['DEFAULT', 'PICKY'].flatMap((level) => junitU.map((text) => chk(code, text, { level }))));
  }
  // grammar.xml examples (correct and incorrect) and corrected versions
  chunks(exTexts, 40).forEach((cc, n) => w(DIR, `examples-${String(n).padStart(2, '0')}`, `${key} grammar.xml example sentences ${n * 40}.., DEFAULT`, 'check', cc.map((text) => chk(base, text))));
  chunks(exTexts, 40).forEach((cc, n) => w(DIR, `examples-picky-${String(n).padStart(2, '0')}`, `${key} grammar.xml example sentences ${n * 40}.., PICKY + enableTempOff`, 'check', cc.map((text) => chk(base, text, { level: 'PICKY', enableTempOff: true }))));
  chunks(exFixed, 40).forEach((cc, n) => w(DIR, `examples-fixed-${String(n).padStart(2, '0')}`, `${key} example sentences with the first correction applied, PICKY`, 'check', cc.map((text) => chk(base, text, { level: 'PICKY' }))));
  w(DIR, 'examples-joined', `${key} all examples joined as paragraphs (multi-sentence text), DEFAULT and PICKY`, 'check',
    chunks(exTexts, 15).slice(0, 8).flatMap((cc) => [chk(base, cc.join(' ')), chk(base, cc.join('\n\n'), { level: 'PICKY' })]));

  // spelling
  const typo = (wd, i) => {
    const k = 1 + (i % Math.max(1, wd.length - 2));
    switch (i % 5) {
      case 0: return wd.slice(0, k) + wd.slice(k + 1);
      case 1: return wd.slice(0, k) + wd[k + 1] + wd[k] + wd.slice(k + 2);
      case 2: return wd.slice(0, k) + wd[k] + wd.slice(k);
      case 3: return wd.slice(0, k) + 'q' + wd.slice(k + 1);
      default: return wd + wd.slice(-1) + 'x';
    }
  };
  const spellSet = uniq([...c.spellWords, ...pick(words, 200)]);
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-valid-${n}`, `${key} speller: words from the dictionary/examples in short sentences`, 'check', cc.map((wd) => chk(base, `${title(wd)} je tu. To je ${wd}.`, { enabledRules: [c.ruleIds[1]], enabledOnly: true }))));
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-typo-${n}`, `${key} speller: mutated words (deletion, swap, doubling, replacement, suffix), suggestions`, 'check', cc.map((wd, i) => chk(base, `To je ${typo(wd, i + n)}.`, { enabledRules: [c.ruleIds[1]], enabledOnly: true }))));
  w(DIR, 'spelling-sentences', `${key} speller in running text with typos, all default rules`, 'check',
    pick(exTexts, 40).map((t, i) => chk(base, t.split(' ').map((wd, j) => (j === i % 3 + 1 && wd.length > 3 ? typo(wd, i + j) : wd)).join(' '))));
  w(DIR, 'spelling-case', `${key} speller: case variants (lower, upper, title) of dictionary words and mixed scripts`, 'check',
    [...c.spellWords.slice(0, 10), ...pick(words, 20)].flatMap((wd) => [chk(base, `To je ${wd.toUpperCase()}.`), chk(base, `to je ${title(wd)}.`), chk(base, `To je ${wd}${wd}.`), chk(base, `To je ${wd}-${wd}.`)]));

  // edge, targeted
  const EDGE = [...COMMON_EDGE, ...c.edge];
  for (const code of c.codes) w(DIR, `edge-${code}`, `${key} full check edge and targeted texts ${code} (DEFAULT, PICKY)`, 'check', [...EDGE.map((text) => chk(code, text)), ...EDGE.map((text) => chk(code, text, { level: 'PICKY' }))]);
  const tx = pick(exTexts, 6);
  w(DIR, `modes-${base}`, `${key} Mode / paragraph handling`, 'check',
    ['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].flatMap((mode) => ['DEFAULT', 'PICKY'].flatMap((level) => tx.map((text) => chk(base, text, { mode, level })))).concat(
      ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].flatMap((paraMode) => tx.slice(0, 3).map((text) => chk(base, text, { paraMode })))));
  w(DIR, `tones-${base}`, `${key} tone tags PICKY`, 'check',
    ['ALL_TONE_RULES', 'NO_TONE_RULE', 'ALL_WITHOUT_GOAL_SPECIFIC', 'academic', 'formal', 'general'].flatMap((t) => tx.slice(0, 2).map((text) => chk(base, text, { level: 'PICKY', toneTags: [t] }))));
  const ri = c.ruleIds;
  w(DIR, `selection-${base}`, `${key} rule/category enable/disable options`, 'check',
    [{ enabledRules: ri.slice(0, 4), enabledOnly: true }, { disabledCategories: ['TYPOS', 'GRAMMAR'] }, { disabledCategories: ['MISC', 'PUNCTUATION'], level: 'PICKY' }, { enabledCategories: ['TYPOS', 'MISC', 'STYLE', 'CAT1', 'CAT2', 'CAT3', 'CAT4', 'CAT5', 'CAT6', 'TYPOGRAPHY'], level: 'PICKY' }, { disabledRules: ri.slice(0, 5) }, { enabledRules: ri, enabledOnly: false, level: 'PICKY', enableTempOff: true }]
      .flatMap((o) => EDGE.slice(COMMON_EDGE.length).concat(tx.slice(0, 3), junitU.slice(0, 2)).map((text) => chk(base, text, o))));
  for (const m of ['en', 'de']) w(DIR, `mothertongue-${m}`, `${key} check with mother tongue ${m}`, 'check', [...tx, ...EDGE.slice(COMMON_EDGE.length)].map((text) => chk(base, text, { level: 'PICKY', motherTongue: m })));
  w(DIR, `tools-correct-${base}`, `${key} Tools.correctText with the rule set`, 'jsonl', c.codes.map((v) => ({ op: 'tools-correct', args: { lang: v, texts: [...EDGE.slice(2), ...tx, ...junitU] } })));
  w(DIR, `analyze-${base}`, `${key} JLanguageTool#analyzeText (tokens, readings, chunk tags)`, 'analyze', c.codes.flatMap((v) => [...EDGE.slice(2, 30), ...tx, ...junitU].map((text) => ({ op: 'analyze', args: { lang: v, text } }))));
  w(DIR, `markup-like-${base}`, `${key} check of markup-like plain text`, 'check',
    ['<b>bold</b> Tekst.', '&amp; &lt;tag&gt; <br/> vrstica', '<p>Pozdrav  svijet</p><p>drugi</p>', '[[Link|Text]] {{Template}} tu', '<marker>x</marker> test', 'http://example.com/a?b=c&d=e www.example.sk a@b.com', 'VELIKE ČRKE SO V REDU. 2020-10-12 in 12.10.2020 in 3,14.'].map((text) => chk(base, text, { level: 'PICKY' })));

  // rule list, rule-examples, languages
  const probe = (await runHarness({ clock: 'fixed', ops: [{ op: 'rule-examples', args: { lang: base, offset: 0, limit: 0, unrestricted: false } }] })).responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (!probe[0].ok) throw new Error('probe failed ' + JSON.stringify(probe[0]).slice(0, 400));
  const exCount = probe[0].result.rulesWithExamples;
  w(DIR, 'rulelist', `${key} JLanguageTool rule list: order, class, category, default off/temp_off, activity (rules-list op)`, 'jsonl', [...c.codes, c.codes[0].split('-')[0]].map((v) => ({ op: 'rules-list', args: { lang: v } })));
  w(DIR, 'rulelist-lt', `${key} JLanguageTool rule list incl. activity at DEFAULT/PICKY (en-rulelist lt), mother tongues none/en/de`, 'jsonl', [...c.codes.map((v) => ({ op: 'en-rulelist', args: { kind: 'lt', lang: v } })), ...['en', 'de'].map((m) => ({ op: 'en-rulelist', args: { kind: 'lt', lang: base, motherTongue: m } }))]);
  w(DIR, 'rulelist-direct', `${key} Language#getRelevantRules (direct, null LM) per mother tongue`, 'jsonl', c.codes.flatMap((v) => [undefined, 'en', 'de'].map((m) => ({ op: 'en-rulelist', args: { kind: 'direct', lang: v, ...(m ? { motherTongue: m } : {}) } }))));
  const PER = 100;
  for (let i = 0, n = 0; i < exCount; i += PER, n++) w(DIR, `rule-examples-${String(n).padStart(2, '0')}`, `${key} rule-examples rules ${i}..${i + PER - 1} (restricted + unrestricted)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: base, offset: i, limit: PER } }]);
  w(DIR, 'rule-examples-variant', `${key} rule-examples rules 0..49 under the country variant and short code`, 'rule-examples', [{ op: 'rule-examples', args: { lang: c.codes[1], offset: 0, limit: 50 } }]);
  const sc = (code, level = 2) => ({ fn: 'shortCode', code, level });
  w(DIR, 'languages', `${key} Languages lookups (short code, long code, name, locale, supported)`, 'jsonl',
    [...c.codes, ...c.codes.map((x) => x.toUpperCase()), ...c.codes.map((x) => x.replace('-', '_')), c.codes[0] + '-XX'].map((code) => ({ op: 'lang-lookup', args: { calls: [sc(code), { fn: 'supported', code }] } }))
      .concat([{ op: 'lang-lookup', args: { calls: [{ fn: 'name', name: key === 'sl' ? 'Slovenian' : 'Slovak' }, { fn: 'locale', locale: { language: base, country: '', variant: '' } }, { fn: 'locale', locale: { language: base, country: c.codes[1].split('-')[1], variant: '' } }] } }]));

  // tokenizers
  const sentTexts = uniq([...junitU, ...EDGE.slice(2), ...exTexts.slice(0, 80), exTexts.join(' ').slice(0, 3000), exTexts.slice(0, 30).join('\n'), 'Prva. Druga! Tretja? "Citat." Naprej. 3. maj. Dr. Novak. Na primer npr. tako. Itd. in tako dalje.', 'A. B. C. D.', 'št. 5 in str. 7. Konec.']);
  w(DIR, `sentence-tokenize-${base}`, `${key} SRX sentence tokenizer, single line breaks mark paragraph false/true`, 'jsonl', c.codes.map((v) => ({ op: 'sentence-tokenize', args: { lang: v, modes: [false, true], texts: sentTexts } })));
  if (key === 'sk') {
    const sk = junitU.slice(c.junit.length);
    w(DIR, 'sentence-tokenize-junit', 'sk SlovakSentenceTokenizerTest sentences (as in the JUnit test), joined and split', 'jsonl',
      [{ op: 'sentence-tokenize', args: { lang: 'sk', modes: [false, true], texts: [...sk, sk.join(' '), sk.join('\n'), sk.join('\n\n')] } }]);
  }
  w(DIR, `word-tokenize-${base}`, `${key} WordTokenizer (core default)`, 'jsonl', c.codes.map((v) => ({ op: 'word-tokenize', args: { lang: v, texts: [...sentTexts, 'česko-slovenský, rakúsko-uhorský; 3,14 a 1.000.000. 12:30 `x` a_b @user #tag http://x.sk/a?b=c, a@b.sk', "don't l'homme 'quoted' \"double\" „nízke“ „vysoké“", '1.5 % 20 °C 5 km/h', '\u00a0\u2009x\u200by'] } })));

  // tagger (sk: BaseTagger; sl: core demo tagger)
  const mk = (arr) => arr.flatMap((wd) => [wd, wd.toLowerCase(), wd.toUpperCase(), title(wd.toLowerCase())]);
  const tagWords = uniq([...mk(pick(words, 500)), ...mk(c.spellWords), '', ' ', '.', ',', '1', '123', '3,14', 'x', 'X', 'ä', 'ľ', 'Ľ', 'ďaleko', 'blabla', 'ČŠŽ', "l'x", '-', '--', 'a-b', '😀']);
  chunks(tagWords, 400).forEach((cc, n) => w(DIR, `tag-words-${String(n).padStart(2, '0')}`, `${key} tagger: words as single-token lists (lower/upper/title variants)`, 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
  w(DIR, 'tag-sentences', `${key} tagger: word-tokenized sentences (JUnit, examples, edge)`, 'jsonl', [{ op: 'tag', args: { lang: base, texts: uniq([...junitU, ...EDGE.slice(2, 30), ...pick(exTexts, 80)]) } }, { op: 'tag', args: { lang: c.codes[1], texts: junitU.slice(0, 4) } }]);

  // sk only: compound rule, synthesizer
  if (key === 'sk') {
    const comp = readFileSync(path.join(R, 'resource/sk/compounds.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && l[0] !== '#');
    const sample = pick(comp, 200);
    const stripOpt = (e) => e.replace(/\*$/, '');
    const cases = [];
    for (const e of sample) {
      const s = stripOpt(e);
      cases.push(`To je ${s}.`, `To je ${s.replace(/-/g, ' ')}.`, `To je ${title(s.replace(/-/g, ' '))}.`, `To je ${s.replace(/-/g, '')}.`, `${title(s.replace(/-/g, ' '))} je tu.`);
    }
    chunks(cases, 200).forEach((cc, n) => w(DIR, `compounds-${String(n).padStart(2, '0')}`, 'sk SK_COMPOUNDS: compounds.txt entries hyphenated, spaced, joined, capitalised', 'check', cc.map((text) => chk(base, text, { level: 'PICKY' }))));
    w(DIR, 'compounds-edge', 'sk SK_COMPOUNDS edge texts', 'check', ['česko-slovenský', 'rakúsko-uhorský', 'bim bam', 'bim-bam', 'Bim Bam', 'BIM BAM', 'bim  bam', 'bim\tbam', 'bim\nbam', 'bim bam bam', 'a bim bam b', 'česko slovenský', 'česko - slovenský', 'rakúsko uhorský štát'].map((text) => chk(base, text, { enabledRules: ['SK_COMPOUNDS'], enabledOnly: true })));
    // synthesizer
    const gold = path.join(ROOT, 'tests/golden', c.id);
    const m = new Map();
    if (existsSync(gold)) {
      for (const d of readdirSync(gold)) {
        if (!d.startsWith('tag-')) continue;
        const f = path.join(gold, d, 'responses.jsonl');
        if (!existsSync(f)) continue;
        for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(line).result; if (r && Array.isArray(r.results)) walkTag(r.results, m); }
      }
    }
    stats.synthLemmas = m.size;
    const syn = (lemma, tag, re, tok) => ({ m: 'synthesize', tok: tok ?? lemma, lemma, tag, ...(re === undefined ? {} : { re }) });
    const tagsAll = readFileSync(path.join(R, 'resource/sk/slovak_tags.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    const lemmas = pick([...m.keys()].filter((l) => l.length < 40), 250);
    const reals = [];
    const res = [];
    for (const lem of lemmas) {
      const tags = [...m.get(lem)].sort();
      for (const t of tags.slice(0, 3)) reals.push(syn(lem, t), syn(lem, t, false), syn(lem, t, true));
      const t0 = tags[0];
      res.push(syn(lem, t0.slice(0, 2) + '.*', true), syn(lem, '.*', true), syn(lem, t0.replace(/.$/, '.'), true), syn(lem, `.*${t0.slice(-1)}`, true));
    }
    const JU = [['blablabla', 'blablabla', false], ['časopis', 'SSis2', undefined], ['časopis', 'SS.*', true]];
    reals.unshift(...JU.map(([l, t, r]) => syn(l, t, r)));
    chunks(reals, 120).forEach((cc, n) => w(DIR, `synth-lemma-tag-${String(n).padStart(2, '0')}`, 'sk synthesizer: lemma x real tag (2-arg, re=false, re=true)', 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    chunks(res, 120).forEach((cc, n) => w(DIR, `synth-regex-${String(n).padStart(2, '0')}`, 'sk synthesizer: regex tags (re=true), result order', 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const edge = [];
    for (const lem of ['', ' ', 'dom', 'Dom', 'DOM', 'časopis', 'byť', 'mať', 'ísť', 'ja', 'on', 'veľký', 'dobrý', 'nový', 'človek', 'dieťa', 'blabla']) for (const t of ['SSis2', 'SSms1', 'VKdpb+', 'AAms1x', 'PD', 'J', 'ZZ', '', 'NOSUCHTAG', 'ss.*', 'S.*', '.*', 'V.*', 'A.*']) edge.push(syn(lem, t), syn(lem, t, true));
    chunks(edge, 150).forEach((cc, n) => w(DIR, `synth-edge-${String(n).padStart(2, '0')}`, 'sk synthesizer: edge lemmas x tags', 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls = pick(tagsAll, 300).map((t) => syn('časopis', t, true));
    chunks(tagCalls, 150).forEach((cc, n) => w(DIR, `synth-tags-${String(n).padStart(2, '0')}`, 'sk synthesizer: slovak_tags.txt tags as regex on lemma časopis', 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const nul = [{ m: 'synthesize', tok: 'x', lemma: null, tag: 'SSis2' }, { m: 'synthesize', tok: 'x', lemma: null, tag: 'SSis2', re: true }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: true }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: true }];
    for (const bad of ['(', '[', '*', '+', '\\', '{1}', '[z-a]', '(?i', ')']) nul.push(syn('časopis', bad, true));
    nul.push({ m: 'possibleTags' }, { m: 'posTagCorrection', tag: 'SSis2' }, { m: 'posTagCorrection', tag: null }, { m: 'targetPosTag', tags: [], target: 'T' }, { m: 'targetPosTag', tags: ['A', 'B'], target: 'T' }, { m: 'spell', n: '12' }, { m: 'roman', n: '12' });
    w(DIR, 'synth-null-api', 'sk synthesizer: null args, bad regex, API methods', 'jsonl', [{ op: 'synth', args: { lang: base, calls: nul } }]);
  }

  // cli
  const cliNorm = ['buildDate', 'commit', 'stackFrames', 'paths', 'logTimestamp'];
  const cliText = junitU.concat(pick(exTexts, 4)).join('\n');
  const cli = (name, args, input, files) => wh(DIR, 'cli', `cli-${name}`, { compare: 'cli', normalize: cliNorm, description: `${key} CLI ${name}`, args, ...(files ? { files } : { stdin: input }) });
  for (const code of c.codes) {
    cli(`json-${code}`, ['-l', code, '--json', '-'], cliText);
    cli(`plain-${code}`, ['-l', code, '-'], cliText);
    cli(`file-json-${code}`, ['-l', code, '--json', 'input.txt'], null, { 'input.txt': cliText + '\n' });
  }
  cli('picky-json', ['-l', base, '--level', 'PICKY', '--json', '-'], pick(exTexts, 12).join('\n'));
  cli('enabled-only', ['-l', base, '-eo', '-e', c.ruleIds.slice(0, 4).join(','), '--json', '-'], cliText);
  cli('disable', ['-l', base, '-d', c.ruleIds.slice(0, 3).join(','), '--json', '-'], cliText);
  cli('adl', ['-adl', '--json', '-'], junitU.slice(0, 2).join(' ') + ' ' + exTexts.slice(0, 3).join(' '));
  cli('adl-plain', ['-adl', '-'], exTexts.slice(0, 5).join(' '));
  cli('apply', ['-l', base, '-a', '-'], junitU.slice(0, 3).join('\n'));
  cli('empty', ['-l', base, '--json', '-'], '');
  cli('mothertongue', ['-l', base, '-m', 'en', '--json', '-'], cliText);

  // http
  const rq = (method, params) => ({ method, path: '/v2/check', params });
  const reqs = [];
  const T3 = [...junitU.slice(0, 2), ...pick(exTexts, 6)];
  for (const t of T3) reqs.push(rq('POST', { language: base, text: t }), rq('GET', { language: c.codes[1], text: t }), rq('POST', { language: base, text: t, level: 'picky' }));
  reqs.push(rq('POST', { language: 'auto', text: exTexts.slice(0, 5).join(' ') }), rq('POST', { language: 'auto', text: exTexts.slice(0, 5).join(' '), preferredVariants: c.codes[1] }),
    rq('POST', { language: base, text: T3[2], enabledOnly: 'true', enabledRules: c.ruleIds.slice(0, 3).join(',') }), rq('POST', { language: base, text: T3[2], disabledRules: c.ruleIds.slice(0, 3).join(',') }),
    rq('POST', { language: base, text: T3[3], motherTongue: 'en' }), rq('POST', { language: base, text: T3[3], mode: 'textLevelOnly' }), rq('POST', { language: base, text: T3[3], mode: 'allButTextLevelOnly', level: 'picky' }),
    rq('POST', { language: base, text: '' }), rq('POST', { language: base, text: 'a'.repeat(200) }), rq('POST', { language: base, data: JSON.stringify({ annotation: [{ text: T3[2] }, { markup: '<b>' }, { text: ' ' + T3[3] }] }) }),
    rq('POST', { language: base, text: T3[2], enableTempOffRules: 'true', level: 'picky' }), rq('POST', { language: base, text: T3[2], c: '1' }),
    { method: 'GET', path: '/v2/languages', languagesList: true });
  wh(DIR, 'http', 'http-check', { compare: 'api', normalize: ['buildDate', 'commit'], description: `${key} /v2/check: POST/GET, language variants, auto-detection, options, JSON data, empty text`, serverArgs: [], requests: reqs });
  return stats;
}

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const key of want.length ? want : Object.keys(CFG)) {
  const s = await gen(key);
  console.log(key, JSON.stringify(s), readdirSync(path.join(ROOT, 'oracle/cases', CFG[key].id)).length, 'cases');
}
