// Authors oracle/cases/X-RUCHECK (W23: Russian full-pipeline checks, filters, rules, disambiguation, chunker, bitext). Inputs only; docs/review/W23-oracle.md.
// Usage: node oracle/scripts/gen-cases-w23check.mjs [ru]. Derived from gen-cases-w13check.mjs. Synth lemma/tag pairs are harvested from the Java tagger at generation time (tag op).
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

// All string literals of the Java files under a directory (concatenations "a" + "b" merged)
function allJavaStrings(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.java')) {
        const src = readFileSync(p, 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        const merged = src.replace(/"((?:\\.|[^"\\])*)"\s*\+\s*"((?:\\.|[^"\\])*)"/g, (m, a, b) => `"${a}${b}"`);
        const merged2 = merged.replace(/"((?:\\.|[^"\\])*)"\s*\+\s*"((?:\\.|[^"\\])*)"/g, (m, a, b) => `"${a}${b}"`);
        for (const s of merged2.matchAll(/"((?:\\.|[^"\\\n])*)"/g)) {
          try { out.push(JSON.parse(`"${s[1].replace(/\\'/g, "'")}"`)); } catch { /* skip */ }
        }
      }
    }
  };
  walk(dir);
  return uniq(out);
}
const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && l[0] !== '#') : []);
const stripComments = (s) => s.replace(/<!--[^]*?-->/g, '');
// rule ids (group id for sub-rules) whose XML uses a filter class (substring), with the example texts of those rules
function filterRules(file, cls) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const blocks = [];
  const groups = [];
  for (const g of src.matchAll(/<rulegroup\b([^>]*)>([^]*?)<\/rulegroup>/g)) { groups.push([g.index, g.index + g[0].length]); blocks.push([g[1], g[2]]); }
  for (const r of src.matchAll(/<rule\b([^>]*)>([^]*?)<\/rule>/g)) if (!groups.some(([a, b]) => r.index >= a && r.index < b)) blocks.push([r[1], r[2]]);
  const ids = [];
  const texts = [];
  for (const [at, body] of blocks) {
    if (!body.includes(cls)) continue;
    const id = (/\bid="([^"]*)"/.exec(at) || [])[1];
    if (id) ids.push(id);
    for (const m of body.matchAll(/<example\b[^>]*>([^]*?)<\/example>/g)) texts.push(unescapeXml(m[1]).replace(/<\/?marker>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }
  return { ids: uniq(ids), texts: uniq(texts) };
}

const WEEK_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MON_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const WEEK_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const MON_PL = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

const CFG = {
  ru: {
    id: 'X-RUCHECK', mod: 'ru', codes: ['ru', 'ru-RU'], chunk: 100, langName: 'Russian',
    ruleIds: ['MORFOLOGIK_RULE_RU_RU', 'MORFOLOGIK_RULE_RU_RU_YO', 'RU_COMPOUNDS', 'RU_SIMPLE_REPLACE', 'WORD_REPEAT_RULE', 'RU_WORD_COHERENCY', 'RU_DASH_RULE', 'RU_UNPAIRED_BRACKETS', 'RU_SPECIFIC_CASE', 'RU_VERB_CONJUGATION', 'RU_WORD_REPEAT', 'RU_WORD_ROOT_REPEAT', 'FILLER_WORDS_RU', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE', 'DATE_WEEKDAY1'],
    xml: ['rules/ru/grammar.xml'], disambXml: 'resource/ru/disambiguation.xml',
    extraJunit: ['Вставьте ваш текст сюда .. или проверьте этот текстт. Релиз LanguageTool 4.7 состоялся в четверг 28 сентября 2019 года.'],
    edge: ['Это тестовое предложение, в котором несколько слов.', 'Съешь ещё этих мягких французских булок, да выпей чаю.', 'Ёжик и ёлка, ежик и елка.', 'Мама мыла раму раму.', 'Я идёт домой.', 'В понедельник, 7 октября 2014 года.', 'Во вторник 7 октября 2014 г.', 'Цена 5 руб. (5,00 ₽).', 'Москва, Санкт-Петербург, Новосибирск.', 'Т. е. он пришёл. Потом ушёл.', 'Мы с ним по-прежнему из-за чего-то не-друзья.', 'Слово ́ударение и ударе́ние, мо́жно.', '«Привет», — сказал он (тихо.', 'Закончилось лето. дети снова сели за школьные парты.', 'ИНН: 1234567890 и ИНН: 2301050337.', 'Они были знакомы с 17 июня 2039 года.', 'Мы посетили клиента 17 июня 2039 г.'],
    spellWords: ['дом', 'хлеб', 'молоко', 'яблоко', 'компьютер', 'Москва', 'студент', 'школа', 'женщина', 'время', 'вода', 'птица', 'работа', 'город', 'люди', 'ёжик', 'ежик', 'елка', 'ёлка', 'всё', 'все'],
    wordRepeat: ['дом дом', 'не не', 'и и', 'по по', 'что что', 'ПО по', 'по ПО', 'а а', 'б б', 'в в', 'Я я', 'мама мама мыла', 'Он сказал, что что-то', 'Ну ну', 'очень очень', 'так так', 'хорошо хорошо', 'ПАО ПАО', 'ООО ООО', '1 1', '- -', 'У У', 'ё ё', 'a a', 'x x', 'Мама мыла раму, мама мыла раму.', 'Идёт дождь, идёт снег, идёт град.', 'Это дом, и это дом, который стоит в доме.', 'Мы пошли в дом и вернулись в дом.'],
    sentExtra: 'Г-н Иванов пришёл. Т. е. не он! «Идёшь?» — спросил он. Да, и т. д. Потом нет. А.Б.В. и всё. № 5 от 7 окт. 2019 г. Конец. См. рис. 5. Проф. Петров и д-р Сидоров, т. к. они в г. Москве, ул. Ленина, д. 5.',
    wordExtra: ['б/у, б/н, б/у.', 'a .b . c .. d ... e', ' .ru и . и .. и', 'из-за, по-русски, кто-то, что-нибудь, как-либо, в-третьих', 'а́ о́ е́ у́ и́ ы́ э́ ю́ я́ слово ́ударе́ние, мо̀жно', 'ʼ ъ объʼявление', 'e-mail, SMS-ка, ЗАО-шный', 'http://x.ru/a-b?c=d, a@b-c.ru, www.яндекс.рф', "ёжик, ЁЖИК, ёж-ёж, Ёж", '10-летний, 2-3 дня, 1990-2000, 5–7', '«ёлка» „ёлка“ ‘ёлка’ "ёлка" \'ёлка\'', 'т.е. т. е. и т.д. и т. п. т.к.', '3,14 и 1.000.000. 12:30 `x` a_b @user #tag', '1.5 % 20 °C 5 км/ч', '  x​y'],
  },
};
const COMMON_EDGE = ['', ' ', '  ', 'x', '.', '...', 'a', '\n', '\n\n', 'Ünï cödé wörds — „Citat“ «text» "x" ‹ainsi›.', 'a'.repeat(300), 'Pierwsza linia.\nDruga linia.', 'Tab\tseparated.', '1234 5678.', '😀 Emoji 😀.', 'Hello world, this is an English sentence.', 'Das ist ein deutscher Satz.', '<b>bold</b> &amp; &lt;tag&gt;', 'http://example.com/a?b=c&d=e www.example.org a@b.com', '((( [[[ {{{ ))) ]]] }}}', '"Zitat ohne Ende', 'a,b;c:d!e?f', '  führende Leerzeichen  und  doppelte  ', 'Конец.  Начало.', '\u00a0nbsp\u00a0test\u00a0', 'zero\u200bwidth', ('Слово '.repeat(400)).trim() + '.'];

const w = (dir, name, description, compare, ops, normalize = ['paths'], env) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize, compare, ...(env ? { env } : {}), ops }) + '\n');
const wh = (dir, kind, name, body) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind, clock: 'fixed', ...body }, null, 1) + '\n');
const chk = (lang, text, extra = {}) => ({ op: 'check', args: { lang, text, ...extra } });
const CLOCKS = [['', null, null], ['-jan', '@2027-01-05 12:00:00', '2027-01-05T12:00:00+01:00'], ['-dec', '@2026-12-31 12:00:00', '2026-12-31T12:00:00+01:00']];

function walkTag(x, m) {
  if (!Array.isArray(x)) return;
  if (x.length === 6 && typeof x[0] === 'string' && Array.isArray(x[4])) {
    for (const rd of x[4]) if (rd[1] && rd[2]) { if (!m.has(rd[1])) m.set(rd[1], new Set()); m.get(rd[1]).add(rd[2]); }
    return;
  }
  x.forEach((y) => walkTag(y, m));
}
const harnessLines = async (ops) => (await runHarness({ clock: 'fixed', ops })).responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));

async function gen(key) {
  const c = CFG[key];
  const DIR = path.join(ROOT, 'oracle/cases', c.id);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const base = c.codes[0];
  const MODR = path.join(MOD, c.mod, 'src/main');
  const R = path.join(MODR, 'resources/org/languagetool');
  const T = path.join(MOD, c.mod, 'src/test');
  const TJ = path.join(T, 'java');
  const RES = path.join(R, 'resource', c.mod);
  const CH = c.chunk;

  // ---- sources
  const exs = c.xml.flatMap((f) => examples(path.join(R, f)));
  const exTexts = uniq(exs.map((e) => e.text).filter(Boolean));
  const exFixed = uniq(exs.filter((e) => e.fixed).map((e) => e.fixed));
  const dexs = examples(path.join(R, c.disambXml));
  const dTexts = uniq(dexs.map((e) => e.text).filter(Boolean));
  const testStrings = allJavaStrings(TJ);
  const isSentence = (s) => /\s/.test(s) && s.length >= 4 && s.length < 1500 && !/^[<{\[]/.test(s) && !/^(org|java)\./.test(s) && /\p{L}{2}/u.test(s) && !/^\//.test(s);
  const junitSent = uniq(testStrings.filter(isSentence));
  const junitWords = uniq(testStrings.filter((s) => /^[\p{L}][\p{L}'’-]*$/u.test(s) && s.length >= 2 && s.length < 40 && !/^[A-Z][A-Z_0-9]+$/.test(s)));
  const junitU = uniq([...junitSent, ...c.extraJunit]);
  const words = uniq(exTexts.concat(exFixed).flatMap((t) => t.split(/[\s.,;:!?()„”“"»«]+/)).filter((x) => x.length > 1 && !/\d/.test(x)));
  const stats = { examples: exs.length, exTexts: exTexts.length, disambExamples: dexs.length, junitSentences: junitU.length, junitWords: junitWords.length, words: words.length };

  // ---- junit sentences + demo, both codes, DEFAULT and PICKY, chunked
  for (const code of c.codes) {
    chunks(junitU, 60).forEach((cc, n) => w(DIR, `junit-${code}-${String(n).padStart(2, '0')}`, `${key} full check of demo/JUnit sentences ${n * 60}.., ${code}, DEFAULT and PICKY`, 'check',
      ['DEFAULT', 'PICKY'].flatMap((level) => cc.map((text) => chk(code, text, { level })))));
  }
  // grammar.xml examples (correct and incorrect) and corrected versions
  chunks(exTexts, CH).forEach((cc, n) => w(DIR, `examples-${String(n).padStart(3, '0')}`, `${key} grammar.xml example sentences ${n * CH}.., DEFAULT`, 'check', cc.map((text) => chk(base, text))));
  chunks(exTexts, CH).forEach((cc, n) => w(DIR, `examples-picky-${String(n).padStart(3, '0')}`, `${key} grammar.xml example sentences ${n * CH}.., PICKY + enableTempOff`, 'check', cc.map((text) => chk(base, text, { level: 'PICKY', enableTempOff: true }))));
  chunks(exFixed, CH).forEach((cc, n) => w(DIR, `examples-fixed-${String(n).padStart(3, '0')}`, `${key} example sentences with the first correction applied, PICKY`, 'check', cc.map((text) => chk(base, text, { level: 'PICKY' }))));
  w(DIR, 'examples-joined', `${key} examples joined as paragraphs (multi-sentence text), DEFAULT and PICKY`, 'check',
    chunks(exTexts, 15).slice(0, 12).flatMap((cc) => [chk(base, cc.join(' ')), chk(base, cc.join('\n\n'), { level: 'PICKY' })]));
  // disambiguation.xml example sentences through the full check
  chunks(dTexts, CH).slice(0, 12).forEach((cc, n) => w(DIR, `disamb-sentences-check-${String(n).padStart(2, '0')}`, `${key} disambiguation.xml example sentences through all rules`, 'check', cc.map((text) => chk(base, text))));

  // ---- spelling
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
  const sp = c.ruleIds[1];
  const spOpts = { enabledRules: [sp], enabledOnly: true };
  const spellSet = uniq([...c.spellWords, ...pick(words, 300), ...pick(junitWords, 100)]).filter((x) => x.length > 2);
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-valid-${n}`, `${key} speller: dictionary/example words in short sentences`, 'check', cc.map((wd) => chk(base, `${title(wd)} здесь. Это ${wd}.`, spOpts))));
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-typo-${n}`, `${key} speller: mutated words (deletion, swap, doubling, replacement, suffix), suggestions`, 'check', cc.map((wd, i) => chk(base, `Это ${typo(wd, i + n)}.`, spOpts))));
  w(DIR, 'spelling-sentences', `${key} speller in running text with typos, all default rules`, 'check',
    pick(exTexts, 80).map((t, i) => chk(base, t.split(' ').map((wd, j) => (j === i % 3 + 1 && wd.length > 3 ? typo(wd, i + j) : wd)).join(' '))));
  w(DIR, 'spelling-case', `${key} speller: case variants (lower, upper, title) of dictionary words`, 'check',
    [...c.spellWords.slice(0, 10), ...pick(words, 30)].flatMap((wd) => [chk(base, `${wd.toUpperCase()}.`, spOpts), chk(base, `${title(wd)} ${wd}.`, spOpts), chk(base, `${wd}${wd}.`, spOpts), chk(base, `${wd}-${wd}.`, spOpts), chk(base, `${wd.toLowerCase()} ${title(wd)}.`)]));
  // speller word lists (spelling.txt / ignore.txt / prohibit.txt)
  const hs = path.join(RES, 'hunspell');
  const spl = lines(path.join(hs, 'spelling.txt')).map((l) => l.split('\t')[0]);
  const ign = lines(path.join(hs, 'ignore.txt')).map((l) => l.split('\t')[0]);
  const proh = lines(path.join(hs, 'prohibit.txt')).map((l) => l.split('\t')[0]);
  stats.spellingTxt = spl.length; stats.ignoreTxt = ign.length; stats.prohibitTxt = proh.length;
  const listCases = (arr) => arr.flatMap((wd, i) => [chk(base, `${wd}`, spOpts), chk(base, `Ecco ${wd}.`, spOpts), chk(base, `${title(wd)} ${wd.toUpperCase()}.`, spOpts), chk(base, `${typo(wd, i)}.`, spOpts)]);
  chunks(spl, 100).forEach((cc, n) => w(DIR, `spelling-list-spelling-${n}`, `${key} speller: hunspell/spelling.txt words (accepted), case and typo variants`, 'check', listCases(cc)));
  chunks(ign, 100).forEach((cc, n) => w(DIR, `spelling-list-ignore-${n}`, `${key} speller: hunspell/ignore.txt words, case and typo variants`, 'check', listCases(cc)));
  if (proh.length) w(DIR, 'spelling-list-prohibit', `${key} speller: hunspell/prohibit.txt words (prohibited), case and typo variants`, 'check', listCases(proh));
  w(DIR, 'spelling-list-sentences', `${key} speller: list words embedded in sentences, all rules`, 'check', pick([...spl, ...ign, ...proh], 120).map((wd, i) => chk(base, `Я видел ${i % 2 ? title(wd) : wd} вчера, ${typo(wd, i)}.`)));

  // ---- edge, targeted
  const EDGE = [...COMMON_EDGE, ...c.edge];
  for (const code of c.codes) w(DIR, `edge-${code}`, `${key} full check edge and targeted texts ${code} (DEFAULT, PICKY)`, 'check', [...EDGE.map((text) => chk(code, text)), ...EDGE.map((text) => chk(code, text, { level: 'PICKY' }))]);
  const tx = pick(exTexts, 6);
  w(DIR, `modes-${base}`, `${key} Mode / paragraph handling`, 'check',
    ['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].flatMap((mode) => ['DEFAULT', 'PICKY'].flatMap((level) => tx.map((text) => chk(base, text, { mode, level })))).concat(
      ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].flatMap((paraMode) => tx.slice(0, 3).map((text) => chk(base, text, { paraMode })))));
  w(DIR, `tones-${base}`, `${key} tone tags PICKY`, 'check',
    ['ALL_TONE_RULES', 'NO_TONE_RULE', 'ALL_WITHOUT_GOAL_SPECIFIC', 'academic', 'formal', 'general'].flatMap((t) => tx.slice(0, 2).map((text) => chk(base, text, { level: 'PICKY', toneTags: [t] }))));
  const ri = c.ruleIds;
  const cats = ['TYPOS', 'TYPOGRAPHY', 'PUNCTUATION', 'GRAMMAR', 'STYLE', 'CASING', 'MISC', 'LOGIC', 'EXTEND', 'REDUNDANCY'];
  w(DIR, `selection-${base}`, `${key} rule/category enable/disable options`, 'check',
    [{ enabledRules: ri.slice(0, 4), enabledOnly: true }, { disabledCategories: cats.slice(0, 2) }, { disabledCategories: cats.slice(2, 5), level: 'PICKY' }, { enabledCategories: cats, level: 'PICKY' }, { disabledRules: ri.slice(0, 5) }, { enabledRules: ri, enabledOnly: false, level: 'PICKY', enableTempOff: true }, { enabledCategories: cats.slice(0, 3), enabledOnly: true }]
      .flatMap((o) => EDGE.slice(COMMON_EDGE.length).concat(tx.slice(0, 3), junitU.slice(0, 2)).map((text) => chk(base, text, o))));
  for (const m of ['en', 'de']) w(DIR, `mothertongue-${m}`, `${key} check with mother tongue ${m}`, 'check', [...tx, ...EDGE.slice(COMMON_EDGE.length)].map((text) => chk(base, text, { level: 'PICKY', motherTongue: m })));
  w(DIR, `tools-correct-${base}`, `${key} Tools.correctText with the rule set`, 'jsonl', c.codes.map((v) => ({ op: 'tools-correct', args: { lang: v, texts: [...EDGE.slice(2), ...tx, ...junitU.slice(0, 40)] } })));
  w(DIR, `analyze-${base}`, `${key} JLanguageTool#analyzeText (tokens, readings, chunk tags)`, 'analyze', c.codes.flatMap((v) => [...EDGE.slice(2, 30), ...tx, ...junitU.slice(0, 30)].map((text) => ({ op: 'analyze', args: { lang: v, text } }))));
  w(DIR, `markup-like-${base}`, `${key} check of markup-like plain text`, 'check',
    ['<b>bold</b> Tekst.', '&amp; &lt;tag&gt; <br/> riga', '<p>Ciao  mondo</p><p>drugi</p>', '[[Link|Text]] {{Template}} qui', '<marker>x</marker> test', 'http://example.com/a?b=c&d=e www.example.it a@b.com', 'MAIUSCOLE OK. 2020-10-12 e 12.10.2020 e 3,14.'].map((text) => chk(base, text, { level: 'PICKY' })));

  // ---- rule list, rule-examples, languages
  const probe = (await harnessLines([{ op: 'rule-examples', args: { lang: base, offset: 0, limit: 0, unrestricted: false } }]))[0];
  if (!probe.ok) throw new Error('probe failed ' + JSON.stringify(probe).slice(0, 400));
  const exCount = probe.result.rulesWithExamples;
  stats.rulesWithExamples = exCount;
  w(DIR, 'rulelist', `${key} JLanguageTool rule list: order, class, category, default off/temp_off, activity (rules-list op)`, 'jsonl', [...c.codes, base].map((v) => ({ op: 'rules-list', args: { lang: v } })));
  w(DIR, 'rulelist-lt', `${key} JLanguageTool rule list incl. activity at DEFAULT/PICKY (en-rulelist lt), mother tongues none/en/de`, 'jsonl', [...c.codes.map((v) => ({ op: 'en-rulelist', args: { kind: 'lt', lang: v } })), ...['en', 'de'].map((m) => ({ op: 'en-rulelist', args: { kind: 'lt', lang: base, motherTongue: m } }))]);
  w(DIR, 'rulelist-direct', `${key} Language#getRelevantRules (direct, null LM) per mother tongue`, 'jsonl', c.codes.flatMap((v) => [undefined, 'en', 'de'].map((m) => ({ op: 'en-rulelist', args: { kind: 'direct', lang: v, ...(m ? { motherTongue: m } : {}) } }))));
  const PER = 100;
  for (let i = 0, n = 0; i < exCount; i += PER, n++) w(DIR, `rule-examples-${String(n).padStart(3, '0')}`, `${key} rule-examples rules ${i}..${i + PER - 1} (restricted + unrestricted)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: base, offset: i, limit: PER } }]);
  w(DIR, 'rule-examples-variant', `${key} rule-examples rules 0..49 under the country variant`, 'rule-examples', [{ op: 'rule-examples', args: { lang: c.codes[1], offset: 0, limit: 50 } }]);
  const sc = (code, level = 2) => ({ fn: 'shortCode', code, level });
  const lcodes = [...c.codes, ...c.codes.map((x) => x.toUpperCase()), ...c.codes.map((x) => x.replace('-', '_')), base + '-XX'];
  w(DIR, 'languages', `${key} Languages lookups (short code, long code, name, locale, supported)`, 'jsonl',
    lcodes.map((code) => ({ op: 'lang-lookup', args: { calls: [sc(code), { fn: 'supported', code }] } }))
      .concat([{ op: 'lang-lookup', args: { calls: [{ fn: 'name', name: c.langName }, { fn: 'locale', locale: { language: base, country: '', variant: '' } }, { fn: 'locale', locale: { language: base, country: c.codes[1].split('-')[1], variant: '' } }] } }]));

  // ---- tokenizers
  const sentTexts = uniq([...junitU.slice(0, 200), ...EDGE.slice(2), ...exTexts.slice(0, 80), exTexts.join(' ').slice(0, 3000), exTexts.slice(0, 30).join('\n'), c.sentExtra, ...junitWords.slice(0, 40)]);
  w(DIR, `sentence-tokenize-${base}`, `${key} SRX sentence tokenizer, single line breaks mark paragraph false/true`, 'jsonl', c.codes.map((v) => ({ op: 'sentence-tokenize', args: { lang: v, modes: [false, true], texts: sentTexts } })));
  const compLines = lines(path.join(RES, 'compounds.txt')).map((l) => l.replace(/[*+]$/, ''));
  const wtTexts = [...sentTexts, ...c.wordExtra, '3,14 a 1.000.000. 12:30 `x` a_b @user #tag', "don't l'homme 'quoted' \"double\" „niskie” „wysokie”", '1.5 % 20 °C 5 km/h', '\u00a0\u2009x\u200by', ...pick(compLines, 200).map((x) => `Это ${x}.`), ...pick(compLines, 150)];
  chunks(wtTexts, 400).forEach((cc, n) => w(DIR, `word-tokenize-${base}-${n}`, `${key} word tokenizer (RussianWordTokenizer)`, 'jsonl', (n === 0 ? c.codes : [base]).map((v) => ({ op: 'word-tokenize', args: { lang: v, texts: cc } }))));

  // ---- tagger
  const nieV = [];
  const nieEx = [];
  const added = lines(path.join(RES, 'added.txt')).map((l) => l.split('\t')[0]);
  const removed = lines(path.join(RES, 'removed.txt')).map((l) => l.split('\t')[0]);
  stats.nieVerdicts = nieV.length; stats.nieExceptions = nieEx.length;
  const mk = (arr) => arr.flatMap((wd) => [wd, wd.toLowerCase(), wd.toUpperCase(), title(wd.toLowerCase())]);
  const tagWords = uniq([...mk(pick(words, 600)), ...mk(c.spellWords), ...mk(junitWords), ...mk(added), ...mk(removed), '', ' ', '.', ',', '1', '123', '3,14', 'x', 'X', 'ą', 'ł', 'Ł', 'à', 'è', 'COSÌ', 'ĄĆĘŁŃÓŚŹŻ', "l'x", '-', '--', 'a-b', '😀']);
  chunks(tagWords, 400).forEach((cc, n) => w(DIR, `tag-words-${String(n).padStart(2, '0')}`, `${key} tagger: words as single-token lists (lower/upper/title variants)`, 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
  w(DIR, 'tag-sentences', `${key} tagger: word-tokenized sentences (JUnit, examples, edge)`, 'jsonl', [{ op: 'tag', args: { lang: base, texts: uniq([...junitU.slice(0, 120), ...EDGE.slice(2, 30), ...pick(exTexts, 100)]) } }, { op: 'tag', args: { lang: c.codes[1], texts: junitU.slice(0, 4) } }]);

  // ---- disambiguation: full language disambiguator (analyze-raw: raw/post/pre), XML disambiguator (disamb-run, disamb-examples)
  const mwFile = path.join(RES, 'multiwords.txt');
  const mw = lines(mwFile).map((l) => l.split('\t')[0].trim()).filter(Boolean);
  const dPool = uniq([...junitU.slice(0, 100), ...EDGE.slice(2, 30), ...pick(exTexts, 120), ...pick(dTexts, 200), ...c.wordExtra]);
  chunks(dPool, 20).forEach((cc, n) => w(DIR, `analyze-raw-${String(n).padStart(2, '0')}`, `${key} analyze-raw (raw/post/pre disambiguation)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  if (mw.length) chunks(pick(mw, 240).map((x) => `Вчера ${x} был. ${title(x)} тут ${x}, ${x.toUpperCase()}.`), 20).forEach((cc, n) => w(DIR, `analyze-multiword-${String(n).padStart(2, '0')}`, `${key} analyze-raw multiwords.txt entries (hybrid disambiguator MultiWordChunker)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  chunks(dTexts, 20).slice(0, 60).forEach((cc, n) => w(DIR, `analyze-raw-dex-${String(n).padStart(2, '0')}`, `${key} analyze-raw disambiguation.xml example sentences`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  w(DIR, `analyze-raw-variant`, `${key} analyze-raw under the country variant`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: c.codes[1], texts: dPool.slice(0, 20) } }]);
  const dxml = stripComments(readFileSync(path.join(R, c.disambXml), 'utf8'));
  const nDis = (dxml.match(/<rule\b/g) || []).length;
  stats.disambRules = nDis;
  for (let i = 0, n = 0; i < nDis; i += 100, n++) w(DIR, `disamb-examples-${String(n).padStart(2, '0')}`, `${key} DisambiguationRuleTest replay rules ${i}..${i + 99}`, 'jsonl', [{ op: 'disamb-examples', args: { lang: base, offset: i, limit: 100 } }]);
  chunks(dTexts, 60).slice(0, 25).forEach((cc, n) => w(DIR, `disamb-xml-${String(n).padStart(2, '0')}`, `${key} XmlRuleDisambiguator on raw tagger-only disambiguation.xml example sentences`, 'jsonl', [{ op: 'disamb-run', args: { lang: base, texts: cc, jobs: [{ rule: null, texts: cc.map((_, i) => i) }] } }]));
  w(DIR, 'disamb-xml-global', `${key} XmlRuleDisambiguator(global=true) on raw sentences (examples + edge)`, 'jsonl', [{ op: 'disamb-run', args: { lang: base, global: true, texts: dPool.slice(0, 60), jobs: [{ rule: null, texts: dPool.slice(0, 60).map((_, i) => i) }] } }]);
  const rulePool = uniq([...pick(dTexts, 12), ...junitU.slice(0, 6), ...EDGE.slice(COMMON_EDGE.length, COMMON_EDGE.length + 4)]);
  const ruleSpan = nDis;
  for (let i = 0, n = 0; i < ruleSpan; i += 100, n++) w(DIR, `disamb-rule-${String(n).padStart(2, '0')}`, `${key} disambiguation rules ${i}..${i + 99} applied alone (DisambiguationPatternRule#replace) to a sentence pool`, 'jsonl',
    [{ op: 'disamb-run', args: { lang: base, texts: rulePool, jobs: Array.from({ length: Math.min(100, ruleSpan - i) }, (_, k) => ({ rule: i + k, texts: rulePool.map((_, q) => q) })) } }]);

  // ---- synthesizer (lemma/tag pairs harvested from the Java tagger)
  {
    const hv = pick(uniq([...words, ...junitWords, ...c.spellWords, ...added]), 500);
    const hr = await harnessLines([{ op: 'tag', args: { lang: base, tokenLists: hv.map((x) => [x]) } }]);
    const m = new Map();
    if (hr[0].ok) walkTag(hr[0].result.results ?? hr[0].result, m);
    stats.synthLemmas = m.size;
    const tagsAll = lines(path.join(RES, 'tags_russian.txt'));
    const syn = (lemma, tag, re, tok, tokTag) => ({ m: 'synthesize', tok: tok ?? lemma, lemma, tag, ...(re === undefined ? {} : { re }), ...(tokTag ? { tokTag } : {}) });
    const lemmas = pick([...m.keys()].filter((l) => l.length < 40), 250);
    const reals = [];
    const res = [];
    const negs = [];
    for (const lem of lemmas) {
      const tags = [...m.get(lem)].sort();
      for (const t of tags.slice(0, 3)) reals.push(syn(lem, t), syn(lem, t, false), syn(lem, t, true));
      const t0 = tags[0];
      res.push(syn(lem, t0.slice(0, 2) + '.*', true), syn(lem, '.*', true), syn(lem, t0.replace(/.$/, '.'), true), syn(lem, `.*${t0.slice(-1)}`, true));
      if (key === 'pl') {
        const parts = t0.split(':');
        const neg = t0.includes(':aff') ? t0.replace(':aff', ':neg') : t0 + ':neg';
        negs.push(syn(lem, neg), syn(lem, neg, true), syn(lem, neg, false), syn(lem, t0, undefined, lem, neg), syn(lem, t0, true, lem, neg), syn(lem, t0, undefined, lem, t0 + ':neg'),
          syn(lem, tags.length > 1 ? `${tags[0]}+${tags[1]}` : `${t0}+${t0}`, true), syn(lem, tags.length > 1 ? `${tags[0]}+${tags[1]}` : `${t0}+${t0}`),
          syn(lem, parts.length > 2 ? [parts[0], parts[1], `${parts[2]}.gen`, ...parts.slice(3)].join(':') : t0 + '.x', true), syn(lem, t0.replace(/:/g, '.'), true),
          syn(lem, parts[0] + ':.*:neg', true), syn(lem, parts[0] + ':.*:com', true), syn(lem, parts[0] + ':.*:sup', true), syn(lem, t0, undefined, lem, 'adj:sg:nom:m1:com'), syn(lem, neg, undefined, lem, 'adj:sg:nom:m1:sup'), syn(lem, neg, undefined, lem, 'adv:com'));
      }
    }
    reals.unshift(...[['abaco', 'SS'], ['casa', 'NOUN-F:s'], ['mangiare', 'VER:inf+pres'], ['kot', 'subst:sg:nom:m2'], ['pies', 'subst:pl:gen:m2']].map(([l, t]) => syn(l, t)));
    chunks(reals, 120).forEach((cc, n) => w(DIR, `synth-lemma-tag-${String(n).padStart(2, '0')}`, `${key} synthesizer: lemma x real tag (2-arg, re=false, re=true)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    chunks(res, 120).forEach((cc, n) => w(DIR, `synth-regex-${String(n).padStart(2, '0')}`, `${key} synthesizer: regex tags (re=true), result order`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    if (negs.length) chunks(negs, 120).forEach((cc, n) => w(DIR, `synth-neg-${String(n).padStart(2, '0')}`, `${key} synthesizer: :neg/:aff, joined tags, token-tag negation (HashSet order)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const edge = [];
    const eLem = ['', ' ', 'дом', 'Дом', 'ДОМ', 'быть', 'идти', 'я', 'он', 'большой', 'хороший', 'новый', 'человек', 'ребёнок', 'бла', 'хорошо', 'красивый', 'ёж', 'мама', 'читать', 'ходить', 'они'];
    const eTag = ['NN:Inanim:Masc:Sin:Nom', 'NN:Masc:Nom:Sin:Inanim', 'NN:.*', 'ADJ:Posit:Fem:Nom:Sin', 'ADJ:.*', 'ADJ:Comp', 'ADV', 'VB:Past:Sin:Masc', 'VB:Real:Sin:P1', 'VB:Fut:PL:P3', 'VB:INF', 'PNN:Sin:Nom:P1', 'PREP', 'CONJ', 'NumC:.*', '', 'NOSUCHTAG', '.*', 'VB:.*', 'NN:.*:PL:.*', 'NN:Inanim:Masc:PL:Gen', '(', '[', '*', '+'];
    for (const lem of eLem) for (const t of eTag) edge.push(syn(lem, t), syn(lem, t, true));
    chunks(edge, 150).forEach((cc, n) => w(DIR, `synth-edge-${String(n).padStart(2, '0')}`, `${key} synthesizer: edge lemmas x tags`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls = pick(tagsAll, 400).map((t) => syn(eLem[2], t, true));
    chunks(tagCalls, 150).forEach((cc, n) => w(DIR, `synth-tags-${String(n).padStart(2, '0')}`, `${key} synthesizer: tags_russian.txt tags as regex on a fixed lemma`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls2 = pick(tagsAll, 300).flatMap((t) => [syn(eLem[3], t), syn(eLem[6], t, true)]);
    chunks(tagCalls2, 150).forEach((cc, n) => w(DIR, `synth-tags-lemmas-${String(n).padStart(2, '0')}`, `${key} synthesizer: tags x lemmas (2-arg and regex)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const nul = [{ m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3' }, { m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3', re: true }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: true }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: true }];
    for (const bad of ['(', '[', '*', '+', '\\', '{1}', '[z-a]', '(?i', ')']) nul.push(syn(eLem[2], bad, true));
    nul.push({ m: 'possibleTags' }, { m: 'posTagCorrection', tag: 'subst:sg:nom:m3' }, { m: 'posTagCorrection', tag: null }, { m: 'posTagCorrection', tag: 'a.b' }, { m: 'posTagCorrection', tag: 'adj:sg:nom.acc:m1.m2' }, { m: 'targetPosTag', tags: [], target: 'T' }, { m: 'targetPosTag', tags: ['A', 'B'], target: 'T' }, { m: 'spell', n: '12' }, { m: 'roman', n: '12' });
    w(DIR, 'synth-null-api', `${key} synthesizer: null args, bad regex, API methods`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: nul } }]);
  }

  // ---- Java rules (targeted)
  const only = (ids, extra = {}) => ({ enabledRules: ids, enabledOnly: true, ...extra });
  // ---- ru Java rules (targeted)
  const wr = c.wordRepeat;
  const RUCASE = (t) => [chk(base, `${title(t)}.`, only(['WORD_REPEAT_RULE', 'RU_WORD_REPEAT'])), chk(base, `Он сказал, что ${t} и ушёл.`, only(['WORD_REPEAT_RULE'])), chk(base, `Он сказал, что ${t} и ушёл.`, only(['RU_WORD_REPEAT'])), chk(base, `Он сказал, что ${t} и ушёл.`), chk(base, `Первое. ${title(t)}`, only(['WORD_REPEAT_RULE', 'RU_WORD_REPEAT'], { level: 'PICKY' })), chk(base, `${t}\n${t}`, only(['WORD_REPEAT_RULE']))];
  w(DIR, 'rule-RussianSimpleWordRepeatRule', 'ru WORD_REPEAT_RULE (RussianSimpleWordRepeatRule: ignored и/по/что/-, ПО по, single letters) + RU_WORD_REPEAT (default off, enabled), contexts and case', 'check', wr.flatMap(RUCASE));
  w(DIR, 'rule-RussianSimpleWordRepeatRule-edge', 'ru WORD_REPEAT_RULE / RU_WORD_REPEAT edge texts', 'check',
    ['а а', 'б б б', 'в в', 'x x', 'A A', 'я я', 'Я я', 'Мама мыла раму. Мама мыла раму.', 'Он он', 'и и', 'И и', 'по по', 'По по', 'ПО ПО', 'ПО по', 'по ПО', 'Что что', 'что, что', 'что . что', 'что - что', 'что-что', 'дом  дом', 'дом\tдом', 'дом\nдом', 'ДОМ ДОМ', 'Дом дом', 'ёж еж', 'ёж ёж', 'один один', '1 1', '2 2 2', '№ №', '… …', '- -', '— —', '. .', ', ,', 'ПАО ПАО', 'ООО ООО', 'табл табл', 'рис рис', 'минута минута', 'час час', 'друг друг', 'секунда секунда', 'не не', 'ни ни', 'их их', 'на на', 'в в', 'доме доме', 'в доме доме', 'XIV XIV', '&quot; &quot;', '&amp; &amp;', 'мыла мыло', 'иду идти', 'идёт идёт', 'Повтор слов в повтор предложении.', 'Повтор слов в предложении.', 'к к', 'с с', 'о о', 'у у', 'э э', 'ё ё', 'Ё ё', 'a a a a', 'Он и и она', 'А а а'].map((t) => chk(base, t, { enabledRules: ['WORD_REPEAT_RULE', 'RU_WORD_REPEAT'] })));
  // statistic / style rules via style-check (FILLER_WORDS_RU, RU_WORD_REPEAT, RU_WORD_ROOT_REPEAT)
  const sc2 = (ids, config, cases, extra = {}) => ({ op: 'style-check', args: { lang: 'ru-RU', ids, ...(config ? { config } : {}), ...extra, cases } });
  const SC = (text, level = 'PICKY') => ({ text, level });
  const fillerBase = 'Ах, это очень хорошо. Однако, вау, эээ, ох, всё э ух. Ну вот, всё. Эй, эх, ух-ты, бу, ау! Аа, ааа, аааа. «Ах, как хорошо», — сказал он. Однако мы пошли домой.';
  const fillerTexts = ['', 'Привет.', fillerBase, `${fillerBase}\n\n${fillerBase}`, `${fillerBase} ${fillerBase} ${fillerBase}`, 'Он пришёл. Она ушла. Мы остались.', 'ах', 'Ах.', 'ВАУ! Однако?', 'ух-ты и ух', ...pick(exTexts, 6)];
  w(DIR, 'rule-statistic-ru', 'ru FILLER_WORDS_RU (default off, PICKY style rule, percentage config) via style-check', 'jsonl',
    [null, [0], [1], [8], [10], [20], [50], [100], [101], [-1], [10, true], [10, false], [0, false]].map((cfg) => sc2(['FILLER_WORDS_RU'], cfg ? { FILLER_WORDS_RU: cfg } : null, fillerTexts.map((t) => SC(t)))).concat([sc2(['FILLER_WORDS_RU'], null, fillerTexts.map((t) => SC(t, 'DEFAULT')))]));
  const rootPairs = lines(path.join(R, 'rules/ru/wordrootrep.txt')).map((l) => l.split(';')).filter((p) => p.length >= 2);
  stats.rootPairs = rootPairs.length; stats.rootDistinct = uniq(rootPairs.flat()).length;
  const rp = pick(rootPairs.map((p) => p.join(';')), 150).map((x) => x.split(';'));
  const rootCases = rp.flatMap(([a, b]) => [`Это ${a}. Там ${b}.`, `Это ${b}, а там ${a}.`, `${title(a)} и ${b}.`, `Это ${a}. Это ${a}.`, `Слово ${a}.\n\nСлово ${title(b)}.`, `${a} ${b}`, `${a.toUpperCase()} ${b}`]);
  chunks(rootCases, 250).forEach((cc, n) => w(DIR, `rule-RussianWordRootRepeatRule-${String(n).padStart(2, '0')}`, 'ru RU_WORD_ROOT_REPEAT (default off, enabled): wordrootrep.txt pairs in both orders, case, paragraphs', 'check', cc.flatMap((text) => [chk(base, text, only(['RU_WORD_ROOT_REPEAT'])), chk(base, text, { enabledRules: ['RU_WORD_ROOT_REPEAT'], level: 'PICKY' }), chk(base, text)])));
  w(DIR, 'rule-RussianWordRootRepeatRule-edge', 'ru RU_WORD_ROOT_REPEAT edge texts', 'check', ['абажур абажурный', 'Абажур. Абажурный.', 'абонент абонентный абонентский', 'абонент и абонентский и абонентный', 'АБАЖУР абажурный', 'Абакан абаканский', 'абакан Абаканский', 'абажур\nабажурный', 'абажур, абажурный, абажур', 'абажур абажур', 'абажурный абажур', 'абажура абажурные', 'абзац абзацный и абзацы'].map((t) => chk(base, t, only(['RU_WORD_ROOT_REPEAT']))));
  w(DIR, 'rule-style-ru', 'ru RU_WORD_REPEAT (AdvancedWordRepeatRule) and RU_WORD_ROOT_REPEAT via style-check', 'jsonl', [sc2(['RU_WORD_REPEAT'], null, ['', 'Мама мыла раму. Мама мыла раму и маму.', 'Это дом, и это дом, который стоит в доме.', 'Повтор слов в повтор предложении.', 'доме доме', 'Мы шли по дороге, а дорога вела по лесу.', 'Он взял 5 книг и 5 ручек и 5 тетрадей.', 'В доме дом.', 'Минута за минутой, час за часом.', ...pick(exTexts, 10)].map((t) => SC(t))), sc2(['RU_WORD_ROOT_REPEAT'], null, ['', 'абажур абажурный', 'Абонент и абонентский.', ...pick(exTexts, 6)].map((t) => SC(t)))]);
  // CompoundRule / DashRule
  const stripOpt = (e) => e.replace(/[*+]$/, '');
  const comp = lines(path.join(RES, 'compounds.txt'));
  stats.compounds = comp.length;
  const samp = pick(comp, 220);
  const ccases = [];
  for (const e of samp) {
    const s = stripOpt(e);
    ccases.push(`Это ${s}.`, `Это ${s.replace(/-/g, ' ')}.`, `Это ${title(s.replace(/-/g, ' '))}.`, `Это ${s.replace(/-/g, '')}.`, `${title(s.replace(/-/g, ' '))} здесь.`, `Это ${s.replace(/-/g, ' — ')}.`, `Это ${s.replace(/-/g, '–')}.`, `Это ${s.replace(/-/g, ' - ')}.`, `Это ${s.replace(/-/g, '—')}.`, `${s.toUpperCase()}`);
  }
  chunks(ccases, 250).forEach((cc, n) => w(DIR, `rule-compounds-${String(n).padStart(2, '0')}`, 'ru RU_COMPOUNDS / RU_DASH_RULE: compounds.txt entries hyphenated, spaced, joined, dashed, capitalised', 'check', cc.flatMap((text) => [chk(base, text, only(['RU_COMPOUNDS', 'RU_DASH_RULE'], { level: 'PICKY' })), chk(base, text, { level: 'PICKY' })])));
  w(DIR, 'rule-compounds-edge', 'ru RU_COMPOUNDS / RU_DASH_RULE edge texts', 'check', ['конференц зале', 'конференц-зале', 'конференц — зале', 'конференц–зале', 'конференц - зале', 'конференцзале', 'Конференц зале', 'КОНФЕРЕНЦ ЗАЛЕ', 'из — за', 'из-за', 'из за', 'изза', 'из — за стола', 'Из — за', 'по — русски', 'по-русски', 'по русски', 'порусски', 'кто — то', 'кто-то', 'кто то', 'что — нибудь', 'как — либо', 'где-то — когда-то', '— —', '—', '–', '-', 'а — б — в', 'а–б', 'Москва — Санкт-Петербург', 'Москва-Санкт-Петербург', 'конференц\nзале', 'конференц\tзале', 'конференц  зале', 'в — третьих', 'в-третьих', 'в третьих', 'еле — еле', 'еле-еле', 'еле еле', 'кое — кто', 'кое-кто', 'кое кто', 'то — есть', 'почему — то', 'всё — таки', 'всё-таки', 'всё таки', 'ё-моё', 'Санкт — Петербург', 'Нью — Йорк', 'Нью-Йорк', 'Нью Йорк', 'ньюйорк'].map((text) => chk(base, text, only(['RU_COMPOUNDS', 'RU_DASH_RULE'], { level: 'PICKY' }))));
  // SimpleReplaceRule
  const rep = lines(path.join(R, 'rules/ru/replace.txt')).map((l) => l.split('\t')[0].split('=')).filter((p) => p.length >= 2);
  stats.replaceEntries = rep.length;
  const rcases = rep.flatMap(([a]) => [`Это ${a}.`, `${title(a)} здесь.`, `Это ${a.toUpperCase()}.`, `Тут ${a}, там ${a}.`, `${a}`, `Не ${a}, а ${title(a)}.`]);
  chunks(rcases, 250).forEach((cc, n) => w(DIR, `rule-replace-${String(n).padStart(2, '0')}`, 'ru RU_SIMPLE_REPLACE: replace.txt entries in contexts, case variants', 'check', cc.flatMap((text) => [chk(base, text, only(['RU_SIMPLE_REPLACE'])), chk(base, text)])));
  w(DIR, 'rule-replace-edge', 'ru RU_SIMPLE_REPLACE edge texts', 'check', ['Экспрессо', 'экспрессо', 'ЭКСПРЕССО', 'Экспрессо Экспрессо', 'ни будь', 'ни  будь', 'ни\nбудь', 'по идти', 'по-крайней', 'по-крайней мере', '2-ух', '2-ух человек', '„по-крайней”', '(по-крайней)', 'по идти, по идти.', 'Он по идти.', '1 по идти', 'по идти1', 'ппо идти'].map((text) => chk(base, text, only(['RU_SIMPLE_REPLACE']))));
  // SpecificCaseRule
  const spec = lines(path.join(RES, 'specific_case.txt'));
  stats.specificCase = spec.length;
  const specCases = spec.flatMap((ph) => {
    const lo = ph.toLowerCase();
    const caps = ph.split(' ').map(title).join(' ');
    return [ph, lo, caps, ph.toUpperCase(), `Это ${ph}.`, `Это ${lo}.`, `${lo}.`, `${lo} здесь.`, `Это ${caps}.`, `Это ${ph.toUpperCase()}.`, `Я люблю ${lo}, а ты ${ph}.`, `«${lo}»`, `(${lo})`, `Что? ${lo} ${lo}.`, `Это ${ph} и ${lo} вместе.`, `Это ${ph.split(' ')[0]}.`, `Это ${ph.split(' ').slice(0, -1).join(' ')} ${ph.split(' ').slice(-1)[0].toUpperCase()}.`, `Это ${ph.replace(' ', '  ')}.`, `Это ${ph.replace(' ', '\n')}.`];
  });
  chunks(specCases, 120).forEach((cc, n) => w(DIR, `rule-RussianSpecificCaseRule-${String(n).padStart(2, '0')}`, 'ru RU_SPECIFIC_CASE: specific_case.txt phrases in lower/title/upper case and contexts', 'check', cc.flatMap((t) => [chk(base, t, only(['RU_SPECIFIC_CASE'])), chk(base, t)])));
  w(DIR, 'rule-RussianSpecificCaseRule-edge', 'ru RU_SPECIFIC_CASE edge texts (JUnit, duplicate lowercase keys: Председатель/Председателя Правительства)', 'check', ['Рытый Банк', 'Центральный банк РФ', 'Рытый банк', 'центральный банк РФ', 'I like air France.', 'air France', 'Air france', 'AIR FRANCE', 'air canada', 'Air Canada.', 'Air  France', 'банк России', 'Банк россии', 'председатель правительства', 'Председатель правительства', 'председателя правительства', 'Председателя правительства', 'правительство российской федерации', 'Правительство Российской Федерации', 'правительства российской федерации', 'российская федерация', 'Российская федерация', 'северный кавказ', 'Северный кавказ', 'советский союз', 'Советский союз', 'кулагинский банк', 'Никитинский банк', 'никитинский банк', 'створный банк', 'центральный банк российской федерации', 'Центральный банк российской федерации', 'Центральный Банк РФ', 'Центральный банк рф', 'Это советский союз и российская федерация.', 'Советский Союз. советский союз.'].flatMap((t) => [chk(base, t, only(['RU_SPECIFIC_CASE'])), chk(base, t, { level: 'PICKY' })]));
  // WordCoherencyRule
  const coh = lines(path.join(R, 'rules/ru/coherency.txt')).map((l) => l.split(';')).filter((p) => p.length >= 2);
  stats.coherencyPairs = coh.length;
  const hcases = coh.flatMap(([a, b]) => [`Это ${a}. Там ${b}.`, `Это ${b}. Там ${a}.`, `${title(a)} и ${b}.`, `Это ${a}. Там ${a}.`, `Слово ${a}.\n\nСлово ${title(b)}.`, `${a} ${b}`]);
  chunks(hcases, 250).forEach((cc, n) => w(DIR, `rule-coherency-${String(n).padStart(2, '0')}`, 'ru RU_WORD_COHERENCY: coherency.txt pairs in both orders, case, paragraphs', 'check', cc.flatMap((text) => [chk(base, text, only(['RU_WORD_COHERENCY'])), chk(base, text)])));
  w(DIR, 'rule-coherency-edge', 'ru RU_WORD_COHERENCY edge texts', 'check', ['офлайн и оффлайн.', 'Офлайн. Оффлайн.', 'офлайн, оффлайн, офлайн', 'блогер\nблоггер', 'Блогер. Блоггер.', 'БЛОГЕР и БЛОГГЕР.', 'ноль нуль нуль', 'Ноль и нуль', 'летоисчисление и летосчисление', 'патронажем и патронатом', 'произошедший и происшедший', 'произошедший, произошедший.', 'внеочередной неочередной', 'внештатный и заштатный'].map((text) => chk(base, text, only(['RU_WORD_COHERENCY']))));
  // unpaired brackets, core rules
  const brk = ['«цитата.', '(а', 'а)', '[х', 'х]', '{х', 'х}', '»х', 'х«', '"х', 'х"', 'Он сказал: „да (нет“.)', 'а „б ”в” г', '„а „б” в”', '„а (б ”в)', '((а)', '(а))', '[(])', '„»а«”', '"а" "б', '"а" б"', 'Фраза. „Вторая фраза.', 'Фраза (1. Вторая) фраза.', '1) первый 2) второй', 'а) первый б) второй', 'я) и б)', 'Так: "да" и "нет', 'Это "цитата" и „цитата”.', '"', '„', '”', '(', ')', '(((', ')))', '«»', '„”', '()', '[]', '{}', ':)', ';(', ':-)', 'Введите (текст) или [пример] {здесь}.', 'Я пришёл (1) и ушёл (2).', 'п. 1а) и 2б) и IV) и 12)', 'см. (рис. 5', "'кавычки", "он'", '(Это предложение (в скобках.)', 'Вот 1) пункт.', 'Вот а) пункт б) пункт', 'Вот I) пункт II) пункт', 'Вот ab) пункт', 'Вот AB) пункт'];
  w(DIR, 'rule-RussianUnpairedBracketsRule', 'ru RU_UNPAIRED_BRACKETS texts', 'check', brk.flatMap((t) => [chk(base, t, only(['RU_UNPAIRED_BRACKETS'])), chk(base, t)]));
  w(DIR, 'rule-core-ru', 'ru core rules: UPPERCASE_SENTENCE_START, WHITESPACE_RULE, SENTENCE_WHITESPACE, COMMA_PARENTHESIS_WHITESPACE, DOUBLE_PUNCTUATION', 'check',
    ['это предложение. а это второе.', 'Это предложение. а это второе.', 'ул. Ленина. номер 5.', 'Г-н иванов пришёл.', 'т. е. так. и т. д. дальше.', '«цитата». потом', '"цитата" а потом', '1. пункт\n2. пункт', 'а) первый\nб) второй', 'Фраза.Вторая фраза.', 'Фраза. Вторая  фраза.', 'Фраза.  Вторая фраза.', 'Фраза .Вторая.', 'Фраза ,вторая ( ок ).', 'Фраза  с  двойными  пробелами.', ' Фраза с пробелом в начале.', 'Фраза с табуляцией\tи дальше.', 'Фраза с неразрывным пробелом.', 'Он он идёт идёт.', 'ёлка. Ёлка. ёж', 'ЁЖ. ёж.', 'www.example.ru есть. http://x.ru тоже.', 'a@b.ru пишет. c@d.ru тоже.', '3 мая. 4 мая.', '«Фраза. » а потом.', 'Фраза… потом', 'Фраза... потом', 'Фраза!!! Потом', 'Фраза?! Потом', 'Фраза.. потом', 'Вставьте ваш текст сюда .. или проверьте этот текстт.', 'Не род ,а ум поставлю в воеводы.', 'Не род , а ум поставлю в воеводы.', 'Закончилось лето. дети снова сели за школьные парты.', 'Нет!? Да,, нет.', 'A. B. C.'].flatMap((t) => [chk(base, t, only(['UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE', 'COMMA_PARENTHESIS_WHITESPACE', 'DOUBLE_PUNCTUATION', 'WORD_REPEAT_RULE'])), chk(base, t, { level: 'PICKY' })]));
  // verb conjugation
  const PRON = ['я', 'ты', 'он', 'она', 'оно', 'мы', 'вы', 'они', 'Я', 'Они', 'и я', 'и он', 'Джек и я', 'кто', 'это', 'мне', 'тебя'];
  const VERBS = ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут', 'иде', 'ходил', 'ходила', 'ходило', 'ходили', 'ходит', 'ходят', 'сидит', 'сидят', 'сижу', 'сидишь', 'сидим', 'сидите', 'думает', 'думаешь', 'думаю', 'думаем', 'думаете', 'думают', 'пишут', 'пишу', 'пишет', 'читаешь', 'читает', 'читаю', 'творит', 'творю', 'творят', 'пойду', 'пойдёт', 'пойдёшь', 'пойдём', 'пойдёте', 'пойдут', 'согласился', 'согласилась', 'согласились', 'согласилось', 'буду', 'будет', 'будем', 'был', 'была', 'было', 'были', 'есть', 'может', 'могу', 'можем', 'сказал', 'сказала', 'сказали', 'скажет', 'скажу', 'целую', 'любит', 'любим', 'любил', 'любила', 'бежал', 'бежит', 'бегут', 'живёт', 'живут', 'жил', 'жили'];
  const vcases = PRON.flatMap((p) => VERBS.map((v) => `${p} ${v}`));
  chunks(vcases, 250).forEach((cc, n) => w(DIR, `rule-RussianVerbConjugationRule-${String(n).padStart(2, '0')}`, 'ru RU_VERB_CONJUGATION: pronoun x verb forms (person, number, gender, tense)', 'check', cc.flatMap((t) => [chk(base, t, only(['RU_VERB_CONJUGATION'])), chk(base, `${title(t)}.`, only(['RU_VERB_CONJUGATION']))])));
  const vedge = ['Я идёт', 'Она сидят', 'Оно думаешь', 'Они идёте', 'Мы думаю', 'Ты читает', 'Он творю', 'Я ходили', 'Они ходил', 'Мы ходила', 'Она ходил', 'Оно ходила', 'Я ходило', 'Я пойдёт', 'Она пойдут', 'Оно пойдёте', 'Мы пойдёшь', 'Ты пойду', 'Мы может поговорить здесь.', 'Я иду', 'Она сидит', 'Оно думает', 'Они пишут', 'Мы думаем', 'Ты читаешь', 'Он творит', 'Вы идёте', 'Я ходил', 'Они ходили', 'Мы ходили', 'Она ходила', 'Оно ходило', 'Я ходила', 'Я пойду', 'Она пойдёт', 'Оно пойдёт', 'Мы пойдём', 'Ты пойдёшь', 'Я согласился на предложение.', 'Джек и я согласились', 'Ты может быть не помнишь.', 'Ты может быть не помнишь', 'Он может быть дома.', 'Я может быть', 'Я', 'я идёт', 'Мы целую', 'Он целую', 'Я целую', 'Вчера я идёт домой, а они идёт в школу.', 'Я идёт, ты идёшь, он идут.', 'Сегодня мы пойдёт в кино.', 'Я, идёт', 'Я - идёт', 'Я\nидёт', 'Я  идёт', 'и я идёт', 'и Я идёт', 'и он идут', 'Она и я пошли, а он пошёл, они пошла.', 'Я не идёт', 'Я уже ходили', 'Мы с ним ходил', 'Ты и он ходили', 'Он которая ходила', 'Мы ходит', 'Вы ходишь', 'Ты ходите'];
  w(DIR, 'rule-RussianVerbConjugationRule-edge', 'ru RU_VERB_CONJUGATION: JUnit sentences, exceptions (и, может быть, целую) and context edge cases', 'check', vedge.flatMap((t) => [chk(base, t, only(['RU_VERB_CONJUGATION'])), chk(base, t)]));
  // YO speller and speller specifics
  const yoWords = uniq([...c.spellWords, ...pick(words, 300), ...pick(junitWords, 60)].filter((x) => /[еёЕЁ]/.test(x)));
  const toYo = (x) => x.replace(/е/g, 'ё').replace(/Е/g, 'Ё');
  const toYe = (x) => x.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  const yoOpts = { enabledRules: ['MORFOLOGIK_RULE_RU_RU_YO'], enabledOnly: true };
  const yoCases = yoWords.flatMap((x, i) => [chk(base, `Это ${x}.`, yoOpts), chk(base, `Это ${toYe(x)}.`, yoOpts), chk(base, `Это ${toYo(x)}.`, yoOpts), chk(base, `Это ${typo(x, i)}.`, yoOpts), chk(base, `${title(toYe(x))}.`, yoOpts)]);
  chunks(yoCases, 150).forEach((cc, n) => w(DIR, `spelling-yo-${String(n).padStart(2, '0')}`, 'ru MorfologikRussianYOSpellerRule (default off, enabled): words with e/yo variants, typos', 'check', cc));
  w(DIR, 'spelling-yo-edge', 'ru MORFOLOGIK_RULE_RU_RU_YO and MORFOLOGIK_RULE_RU_RU: yo/ye pairs, елка (no-suggest), JUnit words, Latin and mixed script', 'check',
    ['елка', 'ёлка', 'Елка', 'ёлки', 'елки', 'еж', 'ёж', 'ежик', 'ёжик', 'все', 'всё', 'ее', 'её', 'жена', 'жёны', 'идет', 'идёт', 'небо', 'нёбо', 'береза', 'берёза', 'Мы пошли в лес и нашли ежа.', 'Моя елка и твоя ёлка.', 'Ёжик в тумане', 'Ещё', 'Еще', 'ЕЩЕ', 'ЕЩЁ', 'hello', 'Hello world', 'смесь mixed', 'слово123', 'каждя', 'каждая', 'блоггер', 'блогер', 'дрочим', 'орочем', 'анальный', 'мо́жно', 'мо̀жно', 'ударе́ние', 'объʼявление', 'объявление', 'ʼ', 'а́', 'ё́', 'под"ём', 'Ё-мобиль', 'ё-мое', 'ё-моё', 'Ё', 'ё'].flatMap((t) => [chk(base, `${t}`, yoOpts), chk(base, `${t}`, spOpts), chk(base, `${t}.`, { enabledRules: ['MORFOLOGIK_RULE_RU_RU_YO', 'MORFOLOGIK_RULE_RU_RU'], enabledOnly: true }), chk(base, `${t}.`, { level: 'PICKY', enableTempOff: true })]));
  w(DIR, 'rule-speller-suggestions', 'ru speller suggestions for typos of example words (replacement pairs, runon words)', 'check', pick(words, 250).map((x, i) => chk(base, `Это ${typo(x, i)}.`, spOpts)));
  w(DIR, 'rule-speller-replacements', 'ru speller replacement-pair provoked typos (тся/ться, нн/н, не/ни, ц/тс, а/о, е/и)', 'check',
    ['улыбаеться', 'улыбаются', 'надо улыбатся', 'пишеться', 'учиться', 'учитса', 'оконый', 'окон', 'стеклянный', 'стекляный', 'ветреный', 'ветрянный', 'рассеяный', 'нигде', 'ненигде', 'неоткуда', 'не кто', 'ни кто', 'никто', 'чтото', 'что то', 'какнибудь', 'масса', 'маса', 'касса', 'каса', 'осенью', 'осеню', 'иногда', 'инагда', 'здраствуйте', 'здравствуйте', 'пожалуста', 'пожалуйста', 'приветт', 'приве', 'сдесь', 'здесь', 'сегоня', 'сегодня', 'пребывать', 'прибывать', 'нужны', 'нужные', 'ихний', 'евойный', 'ложить', 'класть', 'ихнего', 'тоесть', 'то есть', 'вообщем', 'в общем', 'ввиду', 'в виду', 'вследствии', 'вследствие'].map((t) => chk(base, `Он сказал ${t} вчера.`, spOpts)));
  w(DIR, 'rule-speller-latin-option', 'ru speller: Latin words and mixed-script tokens (rule option 0/1 behaviour with default config)', 'check',
    ['LanguageTool', 'iPhone', 'Wi-Fi', 'wifi', 'Python и Java', 'используем Docker для CI/CD', 'слово word', 'sлово', 'cлово', 'cтрана', 'Мосcква', 'hello', 'HELLO', 'COVID-19', 'Covid', 'ГИБДД', 'ГИБД', 'ЮНЕСКО', 'ЮНЕСК', 'ХААРП', 'Дэн', 'Дэна', 'Дэнк', 'Бетти', 'видеолкция', 'девчёнка', 'друшлаг', 'ингридиент', 'автоподбр'].map((t) => chk(base, `Это ${t}.`, spOpts)));
  // filters through grammar.xml rules
  const FLT = { 'ru.DateCheckFilter': 'DateCheckFilter', 'ru.FutureDateFilter': 'FutureDateFilter', 'ru.INNNumberFilter': 'INNNumberFilter', 'ru.AdvancedSynthesizerFilter': 'AdvancedSynthesizerFilter', 'ru.RussianPartialPosTagFilter': 'RussianPartialPosTagFilter', 'ru.RussianSuppressMisspelledSuggestionsFilter': 'RussianSuppressMisspelledSuggestionsFilter' };
  const fr = {};
  for (const [cls, nm] of Object.entries(FLT)) fr[nm] = filterRules(path.join(R, 'rules/ru/grammar.xml'), cls);
  stats.filterRules = Object.fromEntries(Object.entries(fr).map(([k, v]) => [k, v.ids.length]));
  const WEEK_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const WEEK_RU_ACC = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
  const WEEKA = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MON_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const grid = [];
  for (let d = 0; d < 7; d++) for (const [dd, mm, yy] of [[7, 9, 2014], [15, 2, 2026], [29, 1, 2024], [29, 1, 2023], [31, 3, 2026], [1, 0, 2000], [31, 11, 2026], [1, 0, 2027], [30, 1, 2026], [28, 8, 2019]]) {
    const wd = WEEK_RU_ACC[d]; const mo = MON_RU[mm];
    grid.push(`В ${wd}, ${dd} ${mo} ${yy} г.`, `${title(wd)} ${dd} ${mo} ${yy}`, `${WEEK_RU[d]}, ${dd} ${mo.slice(0, 3)} ${yy}`, `${WEEKA[d]} ${dd} ${mo} ${yy}`, `${WEEK_RU[d].toUpperCase()} ${dd} ${mo} ${yy}`, `${wd}, ${String(dd).padStart(2, '0')}.${String(mm + 1).padStart(2, '0')}.${yy}`, `${wd} ${dd}.${mm + 1}.${yy}`);
  }
  grid.push('Конференция состоится в понедельник, 7 октября 2014 г.', 'во вторник, 7.10.2014', 'в понедельник 0 октября 2014', 'в понедельник 32 октября 2014', 'в понедельник 7 ххх 2014', 'в понедельник 7 октября 99999', 'четверг 28 сентября 2019 года', 'в четверг 28 сентября 2019 года', 'Релиз состоялся в четверг 28 сентября 2019 года.', 'понедельник, 7 окт 2014', 'понедельник, 7 янв 2014', 'понедельник, 7 фев 2014', 'понедельник, 7 мар 2014', 'понедельник, 7 апр 2014', 'понедельник, 7 июн 2014', 'понедельник, 7 июл 2014', 'понедельник, 7 авг 2014', 'понедельник, 7 сен 2014', 'понедельник, 7 ноя 2014', 'понедельник, 7 дек 2014', 'понедельник, 7 мая 2014', 'понедельник, 7 май 2014', 'понедельник, 7 октябрь 2014', 'понедельник, 7 XII 2014', 'понедельник, 7 xii 2014', 'вторник, 29.02.2024', 'вторник, 29.2.2023', 'пятница 13.13.2020', 'суббота, 7.10.2014 и воскресенье, 8.10.2014.');
  const dateTexts = uniq([...fr.DateCheckFilter.texts, ...grid]);
  for (const [sfx, ft] of CLOCKS) {
    chunks(dateTexts, 80).forEach((cc, n) => w(DIR, `rule-DateCheckFilter${sfx}-${String(n).padStart(2, '0')}`, `ru DateCheckFilter via rules ${fr.DateCheckFilter.ids.join(',')}: examples + date grid${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.DateCheckFilter.ids)), chk(base, t, { level: 'PICKY' })]), ['paths'], ft ? { FAKETIME: ft } : undefined));
  }
  const futTexts = [];
  for (const [dd, mm, yy] of [[17, 5, 2039], [17, 5, 1939], [1, 0, 2027], [5, 0, 2027], [31, 11, 2026], [22, 9, 2026], [23, 9, 2026], [21, 9, 2026], [1, 0, 2100], [29, 1, 2024], [31, 3, 2026], [0, 0, 2030], [32, 0, 2030], [7, 11, 3000], [1, 1, 1000], [1, 1, 0], [12, 11, 2026], [5, 4, 2030]]) {
    for (const v of ['Мы посетили клиента', 'Он пришёл', 'Они были', 'Мы посетим клиента', 'Она придёт']) futTexts.push(`${v} ${dd} ${MON_RU[mm]} ${yy} г.`, `${v} ${dd}.${String(mm + 1).padStart(2, '0')}.${yy}.`);
    futTexts.push(`Он пришёл ${dd} ${MON_RU[mm].slice(0, 3)} ${yy}`, `Он пришёл ${dd}.${mm + 1}.${yy}`);
  }
  futTexts.push('Мы посетили клиента 17 июнь 2039', 'Мы посетили клиента 17 июн 2039 года.', 'Мы посетили клиента 17 июня 20390', 'Мы посетили клиента 7.13.2039', 'Мы посетили клиента 17.6.2039', 'до 17 июня 2039 он пришёл', 'Мы посетили клиента до 17 июня 2039.');
  const futAll = uniq([...fr.FutureDateFilter.texts, ...futTexts]);
  for (const [sfx, ft] of CLOCKS) {
    chunks(futAll, 80).forEach((cc, n) => w(DIR, `rule-FutureDateFilter${sfx}-${String(n).padStart(2, '0')}`, `ru FutureDateFilter (DateFilterHelper) via rules ${fr.FutureDateFilter.ids.join(',')}: examples + dates around the clock${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.FutureDateFilter.ids)), chk(base, t)]), ['paths'], ft ? { FAKETIME: ft } : undefined));
  }
  const innVals = [];
  for (let i = 0; i < 60; i++) { const h = sha('inn' + i); const digs = h.replace(/[a-f]/g, (ch) => String(ch.charCodeAt(0) - 97)); innVals.push(digs.slice(0, 10), digs.slice(10, 22)); }
  innVals.push('1234567890', '123456789025', '2301050337', '7707083893', '500100732259', '7830002293', '0000000000', '000000000000', '9999999999', '999999999999', '1234567891', '12345678901', '123456789', '1234567890123', '12345', '123456', '1234567890123456', '00000000000000', '77', '7707083894', '502909615001');
  const innTexts = innVals.flatMap((v) => [`ИНН: ${v}`, `ИНН ${v}`, `ИНН  ${v}.`, `Наш ИНН: ${v}, спасибо.`, `инн: ${v}`]);
  innTexts.push('ИНН: abc', 'ИНН: 12a4567890', 'ИНН', 'ИНН:', 'ИНН : 1234567890', 'ИНН:: 1234567890', 'ИНН 12 34 56 78 90');
  const innAll = uniq([...fr.INNNumberFilter.texts, ...innTexts]);
  chunks(innAll, 150).forEach((cc, n) => w(DIR, `rule-INNNumberFilter-${String(n).padStart(2, '0')}`, `ru INNNumberFilter via rules ${fr.INNNumberFilter.ids.join(',')}: examples + INN checksum grid (10/12 digits, other lengths, non-digits)`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.INNNumberFilter.ids)), chk(base, t)])));
  for (const nm of ['AdvancedSynthesizerFilter', 'RussianPartialPosTagFilter', 'RussianSuppressMisspelledSuggestionsFilter']) {
    const f = fr[nm];
    stats[`${nm}Texts`] = f.texts.length;
    const base2 = uniq([...f.texts, ...f.texts.map((t) => t.toLowerCase()), ...f.texts.map(title), ...f.texts.map((t) => t.replace(/ё/g, 'е')), ...f.texts.map((t) => `${t} ${t}`)]);
    chunks(base2, 60).forEach((cc, n) => w(DIR, `rule-${nm}-${String(n).padStart(2, '0')}`, `ru ${nm} via ${f.ids.length} rules (examples, case variants, doubled)`, 'check', cc.flatMap((t) => [chk(base, t, only(f.ids)), chk(base, t, { level: 'PICKY' })])));
  }
  // direct filter-run cases (literal args)
  const PKG = 'org.languagetool.rules.ru.';
  const frq = (text, cls, args, o = {}) => {
    const ws = o.words ?? text.split(/\s+/);
    return { op: 'filter-run', args: { lang: base, text, filter: { cls: PKG + cls }, args, from: o.from ?? 0, to: o.to ?? text.length, patternTokenPos: o.pos ?? 0, tokenPositions: o.tokenPositions ?? ws.map(() => 1), window: o.window ?? [1, ws.length + 1], message: o.message ?? 'msg {realDay} {day} {month} {year}', shortMessage: 'sm', ...(o.suggestions ? { suggestions: o.suggestions } : {}), ...(o.clockAt ? { clockAt: o.clockAt } : {}) } };
  };
  const dgrid = [];
  const dayNames = ['понедельник', 'Понедельник', 'ПОНЕДЕЛЬНИК', 'пн', 'пн.', 'вторник', 'вт', 'среда', 'среду', 'ср', 'четверг', 'чт', 'пятница', 'пятницу', 'пт', 'суббота', 'субботу', 'сб', 'воскресенье', 'вс', 'вос', 'пят', 'суб', 'xyz', '', 'Пятниц', 'ПТ'];
  const dateSets = [['28', 'сентября', '2019'], ['7', 'октября', '2014'], ['15', 'марта', '2026'], ['16', 'марта', '2026'], ['29', 'февраля', '2024'], ['29', 'февраля', '2023'], ['31', 'апреля', '2026'], ['5', 'XII', '2026'], ['5', 'xii', '2026'], ['5', 'Декабря', '1900'], ['5', 'ДЕКАБРЯ', '2026'], ['0', 'мая', '2026'], ['5', 'декабрь', '2026'], ['5', 'май', '2026'], ['5', 'июн', '2026'], ['5', 'июл', '2026'], ['5', 'ин', '2026'], ['5', 'ил', '2026'], ['5', 'янв', '2026'], ['5', 'ноя', '2026'], ['5', 'дек', '2026'], ['5', 'ххх', '2026'], ['abc', 'мая', '2026'], ['5', 'мая', 'abcd'], ['5', 'мая', '99999999999'], ['5', 'мая', ''], ['', 'мая', '2026'], ['5', '', '2026'], ['1', 'января', '2027'], ['31', 'декабря', '2026']];
  for (const day of dayNames) for (const [d, m, y] of dateSets) dgrid.push([day, d, m, y]);
  const args4 = (day, d, m, y) => [['weekDay', day], ['day', d], ['month', m], ['year', y]];
  for (const [sfx, ft, clk] of CLOCKS) {
    const dc = [];
    for (const [day, d, m, y] of dgrid) dc.push(frq(`${day} ${d} ${m} ${y}`, 'DateCheckFilter', args4(day, d, m, y), { words: [day, d, m, y], message: 'wd {realDay} / {day} / {month}', suggestions: [], clockAt: clk }));
    for (const a of [[['weekDay', 'вторник'], ['day', '7']], [['day', '7'], ['month', 'октября'], ['year', '2014']], [['weekDay', 'вторник'], ['month', 'октября'], ['year', '2014']], [['weekDay', 'вторник'], ['day', '7'], ['month', 'октября'], ['year', '2014'], ['extra', 'x']], [['year', '2014']], []]) dc.push(frq('вторник 7 октября 2014', 'DateCheckFilter', a, { words: ['вторник', '7', 'октября', '2014'], clockAt: clk }));
    w(DIR, `direct-DateCheckFilter${sfx}`, `ru DateCheckFilter direct filter-run (literal args): weekday x date grid, missing/invalid args${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'jsonl', dc, ['paths'], ft ? { FAKETIME: ft } : undefined);
    const fd = [];
    const fMon = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря', 'Января', 'ДЕКАБРЯ', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек', 'декабрь', 'I', 'XII', 'xii', 'ххх', '', '5', 'мая.', '«мая»'];
    const fDays = ['1', '5', '12', '22', '23', '31', '0', '32', '-1', 'abc', '', '07', '1 ', ' 1', '1.5'];
    const fYears = ['2026', '2027', '2025', '2039', '1939', '3000', '0', '99999999999', 'abcd', '', '26', '-2026'];
    for (const y of fYears) for (const m of fMon) fd.push(frq(`${y} ${m}`, 'FutureDateFilter', [['year', y], ['month', m], ['day', '15']], { words: ['15', m, y], message: 'fut {year} {month} {day}', clockAt: clk }));
    for (const y of ['2026', '2027']) for (const d of fDays) for (const m of ['сентября', 'октября', 'ноября', 'декабря', 'января']) fd.push(frq(`${d} ${m} ${y}`, 'FutureDateFilter', [['year', y], ['month', m], ['day', d]], { words: [d, m, y], message: 'fut', clockAt: clk }));
    for (const a of [[['year', '2039'], ['month', 'июня']], [['year', '2039'], ['day', '17']], [['month', 'июня'], ['day', '17']], [], [['year', '2039'], ['month', 'июня'], ['day', '17'], ['x', 'y']]]) fd.push(frq('17 июня 2039', 'FutureDateFilter', a, { words: ['17', 'июня', '2039'], clockAt: clk }));
    w(DIR, `direct-FutureDateFilter${sfx}`, `ru FutureDateFilter/DateFilterHelper direct filter-run: month names/abbreviations/roman, day and year edge values vs. the clock${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'jsonl', fd, ['paths'], ft ? { FAKETIME: ft } : undefined);
  }
  const ii = [];
  for (const v of innVals) ii.push(frq(`ИНН: ${v}`, 'INNNumberFilter', [['inn', v]], { words: ['ИНН', ':', v], message: 'inn {year}' }));
  for (const v of ['', ' ', 'abc', '12a4567890', '١٢٣٤٥٦٧٨٩٠', '１２３４５６７８９０', '1234567890 ', ' 1234567890', '-123456789', '12345.7890', '123456789０', '٢٣٠١٠٥٠٣٣٧', '²³⁰¹⁰⁵⁰³³⁷', '1234567890\n']) ii.push(frq(`ИНН: ${v}`, 'INNNumberFilter', [['inn', v]], { words: ['ИНН', ':', v], message: 'inn' }));
  ii.push(frq('ИНН: 1234567890', 'INNNumberFilter', [], { words: ['ИНН', ':', '1234567890'], message: 'inn' }), frq('ИНН: 1234567890', 'INNNumberFilter', [['inn', null]], { words: ['ИНН', ':', '1234567890'], message: 'inn' }), frq('ИНН: 1234567890', 'INNNumberFilter', [['other', '1234567890']], { words: ['ИНН', ':', '1234567890'], message: 'inn' }));
  w(DIR, 'direct-INNNumberFilter', 'ru INNNumberFilter direct filter-run: checksum grid (10/12 digits), other lengths, non-ASCII digits, missing arg', 'jsonl', ii);
  // bitext
  const bt = [['There is a dog.', 'Нет собаки.'], ['There is no dog.', 'Нет собаки.'], ['There is a dog.', 'Это собака.'], ['There is nothing here.', 'Здесь нет ничего.'], ['There is nobody here.', 'Нет никого.'], ['there is a cat', 'нет кота'], ['THERE IS A CAT', 'НЕТ КОТА'], ['There is', 'Нет'], ['There is a', 'Нет кота'], ['There was a dog.', 'Нет собаки.'], ['There is a dog and there is a cat.', 'Нет собаки и нет кота.'], ['Hello.', 'Привет!'], ['', 'Нет.'], ['There is a dog.', ''], ['', ''], ['There is a dog.', 'Нет'], ['There is a dog.', 'Съешь ещё этих мягких французских булок нет собаки.'], ['This is a test.', 'Это тест.'], ['Hi.', 'Очень длинное предложение по-русски, которое значительно превышает длину оригинала.'], ['Same.', 'Same.'], ['Hello?', 'Привет.'], ['Wait!', 'Подожди?']];
  w(DIR, 'bitext-tools', 'ru Tools.getBitextRules/checkBitext en->ru with bitext.xml (there_is) and the built-in bitext rules', 'jsonl', [{ op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'ru', pairs: bt, detail: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'ru', pairs: bt, brief: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'ru-RU', pairs: bt } }, { op: 'bitext-tools', args: { srcLang: 'ru', trgLang: 'en', pairs: bt.map(([a, b]) => [b, a]) } }, { op: 'bitext-tools', args: { srcLang: 'de', trgLang: 'ru', pairs: [['Es gibt einen Hund.', 'Нет собаки.'], ['Hallo.', 'Привет.']] } }]);
  w(DIR, 'bitext-load', 'ru bitext.xml resource loading with pairs', 'jsonl', [{ op: 'bitext-load', args: { mode: 'resource', name: '/ru/bitext.xml', srcLang: 'en', trgLang: 'ru', pairs: bt } }, { op: 'bitext-load', args: { mode: 'resource', name: '/ru/bitext.xml', srcLang: 'en', trgLang: 'ru-RU', pairs: bt.slice(0, 5) } }, { op: 'bitext-load', args: { mode: 'resource', name: '/ru/bitext.xml' } }]);
  // chunker (RussianChunker, post-disambiguation chunk tags) and tagger extras
  const chunkSent = ['Иван Иванов пришёл домой.', 'И. И. Иванов и Мария Петрова пошли в магазин.', 'Тов. Иванов и тов. Петров не пошли.', 'Если ты придёшь, то я буду рад.', 'Он остался дома, поэтому не пошёл в школу.', 'Красивый дом стоит на большой красивой улице.', 'Мальчик, читающий книгу, сидит на скамейке.', 'Девочка, прочитавшая книгу, ушла.', 'Идя по улице, он думал о жизни.', 'Прочитав книгу, она заснула.', 'Он будет читать, не будет спать и не хочет есть.', 'Мы хотели бы пойти, но не смогли пойти.', 'Иван и Мария, Пётр или Анна пришли.', 'Александр Сергеевич Пушкин родился в Москве.', 'Москва - столица России.', 'Новый большой дом строят рабочие.', 'Самый красивый город в мире.', 'Он ещё не пришёл, а они уже ушли.', 'Мы увидели ёжика и ежа.', 'Все сотрудники компании пришли вовремя, хотя шёл дождь.', 'Ему не нравится, что она не пришла.', 'Я не знаю, когда он вернётся, потому что он не сказал.', 'Президент России В. В. Путин встретился с министром.', 'Российская Федерация и Советский Союз.', 'Красная Шапочка пошла к бабушке.'];
  const chunkPool = uniq([...chunkSent, ...pick(exTexts, 150), ...pick(dTexts, 40)]);
  chunks(chunkPool, 20).forEach((cc, n) => w(DIR, `analyze-chunk-${String(n).padStart(2, '0')}`, 'ru analyze-raw (RussianChunker tags after hybrid disambiguation): chunk-rich sentences and examples', 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  w(DIR, 'analyze-chunk-analyze', 'ru analyzeText (tokens, readings, chunk tags) for chunk-rich sentences', 'analyze', chunkPool.slice(0, 60).map((text) => ({ op: 'analyze', args: { lang: base, text } })));
  const yoTag = uniq([...c.spellWords, ...pick(words, 200)].filter((x) => /[ёЁеЕ]/.test(x)).flatMap((x) => [toYe(x), toYo(x), toYe(x).toUpperCase(), title(toYe(x)), x]));
  chunks(yoTag, 400).forEach((cc, n) => w(DIR, `tag-yo-${String(n).padStart(2, '0')}`, 'ru tagger: MayMissingYO chunk tag (е without ё, ё variants, case)', 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
  const stress = ['мо́жно', 'мо̀жно', 'ударе́ние', 'слово́', 'А́нна', 'а́ о́ е́ у́ и́ ы́ э́ ю́ я́', 'о̀ а̀ ѐ у̀ ѝ ы̀ э̀ ю̀ я̀', 'объʼявление', 'подʼезд', 'ʼ', 'ʼʼ', 'е́ж', 'ё́', 'всё', 'все', 'ещё', 'еще', 'ЕЩЁ', 'ЕЩЕ', 'ёж', 'ЁЖ', 'Ёж', 'ё', 'Ё', 'е', 'Е', 'б/у', 'б/н', 'ун', 'ъ', 'ь'];
  w(DIR, 'tag-stress', 'ru tagger: stress marks, apostrophe to hard sign, single letters, abbreviations', 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: stress.map((x) => [x]) } }, { op: 'tag', args: { lang: base, texts: stress } }]);
  const mwf = lines(path.join(RES, 'multiwords.txt')).map((l) => l.split('\t')[0].trim());
  w(DIR, 'mw-single', 'ru MultiWordChunker (hybrid disambiguator) on multiwords.txt entries alone', 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: uniq(mwf).slice(0, 60) } }]);

  // ---- cli
  const cliNorm = ['buildDate', 'commit', 'stackFrames', 'paths', 'logTimestamp'];
  const cliText = junitU.slice(0, 12).concat(pick(exTexts, 4)).join('\n');
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
  cli('list-unknown', ['-l', base, '-u', '-'], cliText);
  cli('enable-ru-rules', ['-l', 'ru', '-e', 'RU_WORD_REPEAT,FILLER_WORDS_RU,MORFOLOGIK_RULE_RU_RU_YO,RU_WORD_ROOT_REPEAT', '--json', '-'], 'Мама мыла раму. Мама мыла раму и маму. Ах, вау! Мы ещё посидели, всё ещё идёт елка.');
  cli('bitext-basic', ['-l', 'ru', '-m', 'en', '-b2', 'input.txt'], null, { 'input.txt': 'There is a dog.\tНет собаки.\nThere is a dog.\tЭто собака.\nHello world\tПривет, мир\nShort\tЭто очень длинный перевод, который намного длиннее оригинала и поэтому бросается в глаза.\n' });
  cli('bitext-stdin', ['-l', 'ru', '-m', 'en', '-b2', '-'], 'There is a dog.\tНет собаки.\n');
  cli('bitext-json', ['-l', 'ru', '-m', 'en', '-b2', '--json', 'input.txt'], null, { 'input.txt': 'There is a dog.\tНет собаки.\nThere is no dog.\tНет собаки.\n' });
  cli('bitext-disable', ['-l', 'ru', '-m', 'en', '-b2', '-d', 'there_is', 'input.txt'], null, { 'input.txt': 'There is a dog.\tНет собаки.\n' });
  cli('bitext-enable-only', ['-l', 'ru', '-m', 'en', '-b2', '-eo', '-e', 'there_is', 'input.txt'], null, { 'input.txt': 'There is a dog.\tНет собаки.\nHi.\tОчень длинное предложение по-русски, которое значительно превышает длину оригинала.\n' });
  cli('bitext-apply', ['-l', 'ru', '-m', 'en', '-b2', '-a', 'input.txt'], null, { 'input.txt': 'There is a dog.\tНет собаки.\n' });

  // ---- http
  const rq = (method, params) => ({ method, path: '/v2/check', params });
  const reqs = [];
  const T3 = [...junitU.slice(0, 2), ...pick(exTexts, 6)];
  for (const t of T3) reqs.push(rq('POST', { language: base, text: t }), rq('GET', { language: c.codes[1], text: t }), rq('POST', { language: base, text: t, level: 'picky' }));
  reqs.push(rq('POST', { language: 'auto', text: exTexts.slice(0, 5).join(' ') }), rq('POST', { language: 'auto', text: exTexts.slice(0, 5).join(' '), preferredVariants: c.codes[1] }),
    rq('POST', { language: base, text: T3[2], enabledOnly: 'true', enabledRules: c.ruleIds.slice(0, 3).join(',') }), rq('POST', { language: base, text: T3[2], disabledRules: c.ruleIds.slice(0, 3).join(',') }),
    rq('POST', { language: base, text: T3[3], motherTongue: 'en' }), rq('POST', { language: base, text: T3[3], mode: 'textLevelOnly' }), rq('POST', { language: base, text: T3[3], mode: 'allButTextLevelOnly', level: 'picky' }),
    rq('POST', { language: base, text: '' }), rq('POST', { language: base, text: 'a'.repeat(200) }), rq('POST', { language: base, data: JSON.stringify({ annotation: [{ text: T3[2] }, { markup: '<b>' }, { text: ' ' + T3[3] }] }) }),
    rq('POST', { language: base, text: T3[2], enableTempOffRules: 'true', level: 'picky' }), rq('POST', { language: base, text: T3[2], c: '1' }),
    rq('POST', { language: base, text: c.wordRepeat.slice(0, 6).join('. ') + '.', enabledRules: c.ruleIds[0] }),
    { method: 'GET', path: '/v2/languages', languagesList: true });
  wh(DIR, 'http', 'http-check', { compare: 'api', normalize: ['buildDate', 'commit'], description: `${key} /v2/check: POST/GET, language variants, auto-detection, options, JSON data, empty text`, serverArgs: [], requests: reqs });
  return stats;
}
function spellSetPl(c, i) { return c.spellWords[i % c.spellWords.length]; }

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const key of want.length ? want : Object.keys(CFG)) {
  const s = await gen(key);
  console.log(key, JSON.stringify(s), readdirSync(path.join(ROOT, 'oracle/cases', CFG[key].id)).length, 'cases');
}
