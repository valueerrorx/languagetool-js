// Authors oracle/cases/X-ITCHECK and X-PLCHECK (W13/W18: Italian / Polish full-pipeline checks, filters, rules, disambiguation, bitext). Inputs only; docs/review/W13-oracle.md.
// Usage: node oracle/scripts/gen-cases-w13check.mjs [it|pl ...]. Synth lemma/tag pairs are harvested from the Java tagger at generation time (tag op).
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
  it: {
    id: 'X-ITCHECK', mod: 'it', codes: ['it', 'it-IT'], chunk: 40, langName: 'Italian',
    ruleIds: ['ITALIAN_WORD_REPEAT_RULE', 'MORFOLOGIK_RULE_IT_IT', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'DOUBLE_PUNCTUATION', 'UNPAIRED_BRACKETS', 'WHITESPACE_RULE', 'WHITESPACE_PUNCTUATION', 'ST_03_001'],
    xml: ['rules/it/grammar.xml'], disambXml: 'resource/it/disambiguation.xml',
    extraJunit: [],
    edge: ['Questo è un test, per vedere se funziona.', 'Ciao ciao, come stai?', 'È già l\'una e mezza, perciò andiamo.', 'Un po\' di pane e un\'amica.', 'Perché non vieni? Perchè no.', 'L\'altro ieri è venuto a casa mia.', 'ÀÈÉÌÒÙ àèéìòù', 'Il 7 ottobre 2014 fu un martedì.', 'Lunedì 7 ottobre 2014 è una data.', 'Costa 5 € (5,00 €).', 'Roma, Milano, Napoli, Torino, Palermo.', 'Dr. Rossi e sig.ra Bianchi sono arrivati. Poi se ne sono andati.', 'Ed ecco, ad ognuno il suo. Ad Anna ed Elena.'],
    spellWords: ['casa', 'pane', 'acqua', 'computer', 'Roma', 'studente', 'scuola', 'donna', 'tempo', 'amico', 'città', 'università', 'perché', 'più', 'cosa'],
    wordRepeat: ['così così', 'passo passo', 'piano piano', 'via via', 'Così così', 'COSÌ COSÌ', 'Passo Passo', 'ciao ciao', 'sì sì', 'no no', 'è è', 'la la', 'che che', 'molto molto', 'bla bla', 'a a', 'di di', 'quasi quasi', 'pian piano', 'così così così', 'via via via', 'più più', 'mai mai', 'ma ma', 'tanto tanto', 'poco poco', 'pian pian', 'sempre sempre', 'forse forse', 'oggi oggi'],
    sentExtra: 'Il sig. Rossi è arrivato. Dott. Bianchi no! "Vieni?" chiese. Sì, ecc. Poi no. A.B.C. e basta. N. 5 del 7 ott. Fine.',
    wordExtra: ["l'amico dell'anno", "un po' di quest'acqua", "c'è, cos'è, dov'è", 'all\'una e dall\'altra', 'è-un po\'-strano', 'sant\'Antonio, nell\'orto', 'anti-fascista e post-moderno', '1.000,50 € e 3,14%'],
  },
  pl: {
    id: 'X-PLCHECK', mod: 'pl', codes: ['pl', 'pl-PL'], chunk: 100, langName: 'Polish',
    ruleIds: ['PL_WORD_REPEAT', 'MORFOLOGIK_RULE_PL_PL', 'WORD_REPEAT_RULE', 'PL_COMPOUNDS', 'PL_SIMPLE_REPLACE', 'PL_WORD_COHERENCY', 'DASH_RULE', 'PL_UNPAIRED_BRACKETS', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE', 'DATA_DEKADY'],
    xml: ['rules/pl/grammar.xml'], disambXml: 'resource/pl/disambiguation.xml',
    extraJunit: [],
    edge: ['To jest zdanie testowe, które ma kilka wyrazów.', 'Zażółć gęślą jaźń. ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż', 'Mówi: „Tak (nie”.)', 'To jest jest błąd.', 'Wpisz tekst lub użyj istniejącego przykładu.', 'W roku 1990. zdarzyło się dużo.', 'Wtorek 27 sierpnia 2014 był dobry.', 'Cena wynosi 5 zł (5,00 zł).', 'Warszawa, Kraków, Łódź, Wrocław, Poznań.', 'Dr Kowalski i prof. Nowak przyszli. Potem poszli.', 'Pan Jan i Pani Anna. Ich dzieci nie przyszły.', 'Nie najlepiej, niegorzej, nieładnie, niewiele.'],
    spellWords: ['dom', 'chleb', 'mleko', 'jabłko', 'komputer', 'Warszawa', 'student', 'szkoła', 'kobieta', 'czas', 'woda', 'ptak', 'praca', 'miasto', 'ludzie'],
    wordRepeat: ['jest jest', 'nie nie', 'się się', 'to to', 'ten ten', 'ala ma ma kota', 'Dom dom dom', 'i i i', 'bardzo bardzo', 'jak jak', 'być być', 'tuż tuż', 'zbyt zbyt', 'aż aż', 'np np.', 'mln mln', '1 1', 'ona ona', 'mój mój', 'z z', 'w w', 'do do', 'na na', 'kot widział psa, a pies widział kota', 'Zobaczyłem kota i znowu zobaczyłem kota.', 'Ten dom jest duży, a ten dom jest mały.', 'Mama kupiła chleb, tata kupił chleb, a babcia kupiła chleb.', 'Idę do szkoły, idę do domu, idę do sklepu.'],
    sentExtra: 'Pan dr. Kowalski przyszedł. Prof. Nowak też! „Idziesz?” zapytał. Tak, itd. Potem nie. A.B.C. i koniec. Nr 5 z dn. 7 paź. Koniec.',
    wordExtra: ['biało-czerwony', 'polsko-niemiecko-francuski', '10-letni, 2-3 dni, 1990-2000', 'e-mail, SMS-y, ZUS-u, AON-u', 'a–b, c – d, ‚x‘', 'quasi-naukowy, niby-prawda', '-x oraz x- oraz -', 'jak-nie-jak, a-b-c, nie-nie', 'Lądek-Zdrój, Rabce-Zdroju, Bielsko-Biała', 'http://x.pl/a-b?c=d, a@b-c.pl', 'pół-litra, mini-spódniczka, super-hiper-mega'],
  },
};
const COMMON_EDGE = ['', ' ', '  ', 'x', '.', '...', 'a', '\n', '\n\n', 'Ünï cödé wörds — „Citat“ «text» "x" ‹ainsi›.', 'a'.repeat(300), 'Pierwsza linia.\nDruga linia.', 'Tab\tseparated.', '1234 5678.', '😀 Emoji 😀.', 'Hello world, this is an English sentence.', 'Das ist ein deutscher Satz.', '<b>bold</b> &amp; &lt;tag&gt;', 'http://example.com/a?b=c&d=e www.example.org a@b.com', '((( [[[ {{{ ))) ]]] }}}', '"Zitat ohne Ende', 'a,b;c:d!e?f', '  führende Leerzeichen  und  doppelte  ', 'Koniec.  Początek.', '\u00a0nbsp\u00a0test\u00a0', 'zero\u200bwidth', ('Parola '.repeat(400)).trim() + '.'];

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
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-valid-${n}`, `${key} speller: dictionary/example words in short sentences`, 'check', cc.map((wd) => chk(base, `${title(wd)} è qui. Questo ${wd}.`.replace(/è qui|Questo/g, key === 'pl' ? (m) => (m === 'è qui' ? 'jest tu' : 'To jest') : (m) => m), spOpts))));
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-typo-${n}`, `${key} speller: mutated words (deletion, swap, doubling, replacement, suffix), suggestions`, 'check', cc.map((wd, i) => chk(base, `${key === 'pl' ? 'To jest' : 'Questo è'} ${typo(wd, i + n)}.`, spOpts))));
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
  w(DIR, 'spelling-list-sentences', `${key} speller: list words embedded in sentences, all rules`, 'check', pick([...spl, ...ign, ...proh], 120).map((wd, i) => chk(base, `${key === 'pl' ? 'Widziałem' : 'Ho visto'} ${i % 2 ? title(wd) : wd} ${key === 'pl' ? 'wczoraj' : 'ieri'}, ${typo(wd, i)}.`)));

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
  const cats = key === 'it' ? ['TYPOS', 'TYPOGRAPHY', 'PUNCTUATION', 'CAT1', 'CAT5', 'CAT10', 'SEMANTICS'] : ['TYPOS', 'TYPOGRAPHY', 'PUNCTUATION', 'GRAMMAR', 'STYLE', 'CASING', 'MISC', 'SPELLING', 'CONFUSED_WORDS', 'REDUNDANCY'];
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
  const lcodes = [...c.codes, ...(key === 'it' ? ['it-CH'] : []), ...c.codes.map((x) => x.toUpperCase()), ...c.codes.map((x) => x.replace('-', '_')), base + '-XX'];
  w(DIR, 'languages', `${key} Languages lookups (short code, long code, name, locale, supported)`, 'jsonl',
    lcodes.map((code) => ({ op: 'lang-lookup', args: { calls: [sc(code), { fn: 'supported', code }] } }))
      .concat([{ op: 'lang-lookup', args: { calls: [{ fn: 'name', name: c.langName }, { fn: 'locale', locale: { language: base, country: '', variant: '' } }, { fn: 'locale', locale: { language: base, country: c.codes[1].split('-')[1], variant: '' } }] } }]));

  // ---- tokenizers
  const sentTexts = uniq([...junitU.slice(0, 200), ...EDGE.slice(2), ...exTexts.slice(0, 80), exTexts.join(' ').slice(0, 3000), exTexts.slice(0, 30).join('\n'), c.sentExtra, ...junitWords.slice(0, 40)]);
  w(DIR, `sentence-tokenize-${base}`, `${key} SRX sentence tokenizer, single line breaks mark paragraph false/true`, 'jsonl', c.codes.map((v) => ({ op: 'sentence-tokenize', args: { lang: v, modes: [false, true], texts: sentTexts } })));
  const compLines = key === 'pl' ? lines(path.join(RES, 'compounds.txt')).map((l) => l.replace(/[*+]$/, '')) : [];
  const wtTexts = [...sentTexts, ...c.wordExtra, '3,14 a 1.000.000. 12:30 `x` a_b @user #tag', "don't l'homme 'quoted' \"double\" „niskie” „wysokie”", '1.5 % 20 °C 5 km/h', '\u00a0\u2009x\u200by', ...pick(compLines, 200).map((x) => `To jest ${x}.`), ...pick(compLines, 150)];
  chunks(wtTexts, 400).forEach((cc, n) => w(DIR, `word-tokenize-${base}-${n}`, `${key} word tokenizer${key === 'pl' ? ' (PolishWordTokenizer, hyphen splitting via tagger)' : ' (core default)'}`, 'jsonl', (n === 0 ? c.codes : [base]).map((v) => ({ op: 'word-tokenize', args: { lang: v, texts: cc } }))));

  // ---- tagger
  const nieV = key === 'pl' ? lines(path.join(T, 'resources/org/languagetool/tagging/pl/nie_verdicts.tsv')).slice(1).map((l) => l.split('\t')[0]) : [];
  const nieEx = key === 'pl' ? lines(path.join(RES, 'nie_compar_exceptions.txt')) : [];
  const added = lines(path.join(RES, 'added.txt')).map((l) => l.split('\t')[0]);
  const removed = lines(path.join(RES, 'removed.txt')).map((l) => l.split('\t')[0]);
  stats.nieVerdicts = nieV.length; stats.nieExceptions = nieEx.length;
  const mk = (arr) => arr.flatMap((wd) => [wd, wd.toLowerCase(), wd.toUpperCase(), title(wd.toLowerCase())]);
  const tagWords = uniq([...mk(pick(words, 600)), ...mk(c.spellWords), ...mk(junitWords), ...mk(added), ...mk(removed), '', ' ', '.', ',', '1', '123', '3,14', 'x', 'X', 'ą', 'ł', 'Ł', 'à', 'è', 'COSÌ', 'ĄĆĘŁŃÓŚŹŻ', "l'x", '-', '--', 'a-b', '😀']);
  chunks(tagWords, 400).forEach((cc, n) => w(DIR, `tag-words-${String(n).padStart(2, '0')}`, `${key} tagger: words as single-token lists (lower/upper/title variants)`, 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
  if (key === 'pl') {
    chunks(uniq([...nieV, ...nieV.map(title), ...nieEx, ...nieEx.map((x) => 'nie' + x)]), 500).forEach((cc, n) => w(DIR, `tag-nie-${String(n).padStart(2, '0')}`, 'pl tagger: joined "nie" + comparative/superlative (nie_verdicts.tsv forms, nie_compar_exceptions.txt, mixed case)', 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
    const nie = ['nie', 'Nie', 'NIE', 'niedobrze', 'Niedobrze', 'NIEDOBRZE', 'nieDobrze', 'niebardzo', 'niemniej', 'niewielki', 'niewiele', 'niejaki', 'nienajlepiej', 'niemądrzej', 'nieco', 'niemal', 'niedługo', 'nieważne', 'nieładniejszy', 'najładniejszy', 'nienajładniejszy', 'niedużo', 'nieraz', 'nieszczególnie', 'niezbyt', 'niejeden', 'niewyraźniej', 'niebieski', 'nieba', 'niech', 'niemiecki', 'niema', 'nienajbardziej', 'niewiadomo', 'niezwykle', 'niezwyklej', 'nieinaczej', 'nieszybciej', 'niewysoko', 'niewyżej', 'niegłupio', 'niegłupiej'];
    w(DIR, 'tag-nie-edge', 'pl tagger: joined-nie edge words (length 7 boundary, case, exceptions)', 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: nie.map((x) => [x]) } }]);
  }
  w(DIR, 'tag-sentences', `${key} tagger: word-tokenized sentences (JUnit, examples, edge)`, 'jsonl', [{ op: 'tag', args: { lang: base, texts: uniq([...junitU.slice(0, 120), ...EDGE.slice(2, 30), ...pick(exTexts, 100)]) } }, { op: 'tag', args: { lang: c.codes[1], texts: junitU.slice(0, 4) } }]);

  // ---- disambiguation: full language disambiguator (analyze-raw: raw/post/pre), XML disambiguator (disamb-run, disamb-examples)
  const mwFile = path.join(RES, 'multiwords.txt');
  const mw = lines(mwFile).map((l) => l.split('\t')[0].trim()).filter(Boolean);
  const dPool = uniq([...junitU.slice(0, 100), ...EDGE.slice(2, 30), ...pick(exTexts, 120), ...pick(dTexts, 200), ...c.wordExtra]);
  chunks(dPool, 20).forEach((cc, n) => w(DIR, `analyze-raw-${String(n).padStart(2, '0')}`, `${key} analyze-raw (raw/post/pre disambiguation)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  if (mw.length) chunks(pick(mw, 240).map((x) => `Wczoraj ${x} jest. ${title(x)} tu ${x}, ${x.toUpperCase()}.`), 20).forEach((cc, n) => w(DIR, `analyze-multiword-${String(n).padStart(2, '0')}`, `${key} analyze-raw multiwords.txt entries (hybrid disambiguator MultiWordChunker)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  chunks(dTexts, 20).slice(0, 60).forEach((cc, n) => w(DIR, `analyze-raw-dex-${String(n).padStart(2, '0')}`, `${key} analyze-raw disambiguation.xml example sentences`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  w(DIR, `analyze-raw-variant`, `${key} analyze-raw under the country variant`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: c.codes[1], texts: dPool.slice(0, 20) } }]);
  const dxml = stripComments(readFileSync(path.join(R, c.disambXml), 'utf8'));
  const nDis = (dxml.match(/<rule\b/g) || []).length;
  stats.disambRules = nDis;
  for (let i = 0, n = 0; i < nDis; i += 100, n++) w(DIR, `disamb-examples-${String(n).padStart(2, '0')}`, `${key} DisambiguationRuleTest replay rules ${i}..${i + 99}`, 'jsonl', [{ op: 'disamb-examples', args: { lang: base, offset: i, limit: 100 } }]);
  chunks(dTexts, 60).slice(0, 25).forEach((cc, n) => w(DIR, `disamb-xml-${String(n).padStart(2, '0')}`, `${key} XmlRuleDisambiguator on raw tagger-only disambiguation.xml example sentences`, 'jsonl', [{ op: 'disamb-run', args: { lang: base, texts: cc, jobs: [{ rule: null, texts: cc.map((_, i) => i) }] } }]));
  w(DIR, 'disamb-xml-global', `${key} XmlRuleDisambiguator(global=true) on raw sentences (examples + edge)`, 'jsonl', [{ op: 'disamb-run', args: { lang: base, global: true, texts: dPool.slice(0, 60), jobs: [{ rule: null, texts: dPool.slice(0, 60).map((_, i) => i) }] } }]);
  const rulePool = uniq([...pick(dTexts, 12), ...junitU.slice(0, 6), ...EDGE.slice(COMMON_EDGE.length, COMMON_EDGE.length + 4)]);
  const ruleSpan = key === 'it' ? nDis : Math.min(nDis, 1400);
  for (let i = 0, n = 0; i < ruleSpan; i += 100, n++) w(DIR, `disamb-rule-${String(n).padStart(2, '0')}`, `${key} disambiguation rules ${i}..${i + 99} applied alone (DisambiguationPatternRule#replace) to a sentence pool`, 'jsonl',
    [{ op: 'disamb-run', args: { lang: base, texts: rulePool, jobs: Array.from({ length: Math.min(100, ruleSpan - i) }, (_, k) => ({ rule: i + k, texts: rulePool.map((_, q) => q) })) } }]);

  // ---- synthesizer (lemma/tag pairs harvested from the Java tagger)
  {
    const hv = pick(uniq([...words, ...junitWords, ...c.spellWords, ...added]), 500);
    const hr = await harnessLines([{ op: 'tag', args: { lang: base, tokenLists: hv.map((x) => [x]) } }]);
    const m = new Map();
    if (hr[0].ok) walkTag(hr[0].result.results ?? hr[0].result, m);
    stats.synthLemmas = m.size;
    const tagsAll = lines(path.join(RES, `${key === 'it' ? 'italian' : 'polish'}_tags.txt`));
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
    const eLem = key === 'pl' ? ['', ' ', 'dom', 'Dom', 'DOM', 'kot', 'być', 'mieć', 'iść', 'ja', 'on', 'duży', 'dobry', 'nowy', 'człowiek', 'dziecko', 'blabla', 'dobrze', 'ładny', 'niedobrze'] : ['', ' ', 'casa', 'Casa', 'CASA', 'essere', 'avere', 'andare', 'io', 'lui', 'grande', 'buono', 'nuovo', 'uomo', 'bambino', 'blabla', 'il', 'la'];
    const eTag = key === 'pl' ? ['subst:sg:nom:m3', 'subst:pl:gen:m1', 'adj:sg:nom:m1:pos', 'adj:sg:nom:m1:pos:neg', 'adv:pos', 'adv:com', 'adv:sup', 'adv:pos:neg', 'verb:fin:sg:ter:imperf', 'ppron12:sg:nom:m1:pri', 'num:pl:nom:m1:congr', '', 'NOSUCHTAG', 'subst:.*', '.*', 'adj:.*:com', 'adj:.*:sup', 'adj:.*:neg', 'adj:.*:pos+adv:pos', 'subst:sg:nom.acc:m3', 'a.b.c', '(', '[', '*', '+'] : ['NOUN-F:s', 'NOUN-M:p', 'VER:inf+pres', 'ADJ:pos+f+s', 'ART:DEF+F+S', 'PRO-PERS-CLI-3-F-S', 'PRE', 'ADV', '', 'NOSUCHTAG', 'NOUN.*', '.*', 'VER.*', 'ADJ.*', 'ADJ:pos.*', '(', '[', '*', '+'];
    for (const lem of eLem) for (const t of eTag) edge.push(syn(lem, t), syn(lem, t, true));
    chunks(edge, 150).forEach((cc, n) => w(DIR, `synth-edge-${String(n).padStart(2, '0')}`, `${key} synthesizer: edge lemmas x tags`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls = pick(tagsAll, 400).map((t) => syn(eLem[2], t, true));
    chunks(tagCalls, 150).forEach((cc, n) => w(DIR, `synth-tags-${String(n).padStart(2, '0')}`, `${key} synthesizer: ${key === 'it' ? 'italian' : 'polish'}_tags.txt tags as regex on a fixed lemma`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls2 = pick(tagsAll, 300).flatMap((t) => [syn(eLem[3], t), syn(eLem[6], t, true)]);
    chunks(tagCalls2, 150).forEach((cc, n) => w(DIR, `synth-tags-lemmas-${String(n).padStart(2, '0')}`, `${key} synthesizer: tags x lemmas (2-arg and regex)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const nul = [{ m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3' }, { m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3', re: true }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: true }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: true }];
    for (const bad of ['(', '[', '*', '+', '\\', '{1}', '[z-a]', '(?i', ')']) nul.push(syn(eLem[2], bad, true));
    nul.push({ m: 'possibleTags' }, { m: 'posTagCorrection', tag: 'subst:sg:nom:m3' }, { m: 'posTagCorrection', tag: null }, { m: 'posTagCorrection', tag: 'a.b' }, { m: 'posTagCorrection', tag: 'adj:sg:nom.acc:m1.m2' }, { m: 'targetPosTag', tags: [], target: 'T' }, { m: 'targetPosTag', tags: ['A', 'B'], target: 'T' }, { m: 'spell', n: '12' }, { m: 'roman', n: '12' });
    w(DIR, 'synth-null-api', `${key} synthesizer: null args, bad regex, API methods`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: nul } }]);
  }

  // ---- Java rules (targeted)
  const only = (ids, extra = {}) => ({ enabledRules: ids, enabledOnly: true, ...extra });
  if (key === 'it') {
    const wr = c.wordRepeat;
    w(DIR, 'rule-ItalianWordRepeatRule', 'it ITALIAN_WORD_REPEAT_RULE: ignored repetitions (così, passo, piano, via), case, sentence contexts', 'check',
      wr.flatMap((t) => [chk(base, `${title(t)}.`, only(['ITALIAN_WORD_REPEAT_RULE'])), chk(base, `Dico ${t} e poi vado.`, only(['ITALIAN_WORD_REPEAT_RULE'])), chk(base, `Dico ${t} e poi vado.`), chk(base, `Dico ${t} e poi vado.`, { level: 'PICKY' }), chk(base, `Prima. ${title(t)}`, only(['ITALIAN_WORD_REPEAT_RULE'])), chk(base, `${t}\n${t}`, only(['ITALIAN_WORD_REPEAT_RULE']))]));
    w(DIR, 'rule-ItalianWordRepeatRule-edge', 'it ITALIAN_WORD_REPEAT_RULE edge texts', 'check',
      ['così così così', 'via, via', 'via . via', 'via - via', 'via-via', 'via  via', 'via\tvia', 'via\nvia', 'Via Via', 'vía via', 'passo, passo', 'passo passo, piano piano. via via!', 'È È', 'e e', 'Ed ed', 'l\'l\'', 'L\'amico amico', 'un un\'amica', 'lo lo', 'gli gli', 'ai ai', 'il il', 'da da', 'in in', 'su su', 'tra tra', 'fra fra', 'noi noi', 'voi voi', 'loro loro', '1 1', '2 2 2', '€ €', '… …', 'a a a a'].map((t) => chk(base, t, only(['ITALIAN_WORD_REPEAT_RULE', 'MORFOLOGIK_RULE_IT_IT']))));
    // orderSuggestions: capitalised suggestions dropped when the lowercase form is present too
    const osw = ['roma', 'milano', 'italia', 'napoli', 'torino', 'firenze', 'venezia', 'sicilia', 'giovanni', 'maria', 'francia', 'europa', 'marte', 'luigi', 'dio', 'papa', 'pasqua', 'natale', 'nord', 'est', 'marco', 'carlo', 'paolo', 'luca', 'anna', 'giulia', 'sara', 'google', 'linux', 'internet', 'wikipedia', 'facebook'];
    w(DIR, 'rule-speller-order', 'it MORFOLOGIK_RULE_IT_IT orderSuggestions: lowercase/capitalised/uppercase words and typos of proper nouns', 'check',
      osw.flatMap((x, i) => [chk(base, `${x}.`, spOpts), chk(base, `Vado a ${x}.`, spOpts), chk(base, `${title(x)}.`, spOpts), chk(base, `${typo(x, i)}.`, spOpts), chk(base, `Vado a ${typo(title(x), i + 1)}.`, spOpts), chk(base, `${x.toUpperCase()}.`, spOpts)]));
    const typoWords = pick(words, 300);
    w(DIR, 'rule-speller-suggestions', 'it speller suggestions for typos of 300 example words (all suggestion kinds)', 'check', typoWords.map((x, i) => chk(base, `Dico ${typo(x, i)}.`, spOpts)));
    w(DIR, 'rule-speller-apostrophe', 'it speller: apostrophes, accents, elisions, hyphens, digits', 'check',
      ["l'amico", "un'amica", "po'", "un po'", "qual'è", "perchè", "perché", "pò", "cosi", "così", "piu", "più", "e'", "è", "citta", "città", "universita'", "all'una", "dell'anno", "sant'Antonio", "dall'altra", "c'è", "c'e", "cos'è", "nient'altro", "tutt'altro", "d'accordo", "d'altronde", "quand'ero", "quest'anno", "anti-fascista", "auto-stima", "ex-moglie", "co-autore", "ventitré", "ventitre", "trentatrè", "a-b", "12esimo", "1°", "2ª", "n°", "sig.", "dott.", "ecc.", "etc"].map((x) => chk(base, `Dico ${x}.`, spOpts)));
    // DateCheckFilter
    const dr = filterRules(path.join(R, 'rules/it/grammar.xml'), 'it.DateCheckFilter');
    stats.dateRules = dr.ids.join(',');
    const grid = [];
    for (let d = 0; d < 7; d++) for (const [dd, mm, yy] of [[7, 9, 2014], [15, 2, 2026], [29, 1, 2024], [29, 1, 2023], [31, 3, 2026], [1, 0, 2000], [31, 11, 2026], [1, 0, 2027], [30, 1, 2026]]) {
      const wd = WEEK_IT[d]; const mo = MON_IT[mm];
      grid.push(`${title(wd)} ${dd} ${mo} ${yy}`, `${wd}, ${dd} ${mo} ${yy}`, `${title(wd)} ${dd}/${mo}/${yy}`, `${wd}, ${dd}.${mo.slice(0, 3)}.${yy}`, `${title(wd)} ${dd} ${mo} del ${yy}`, `${wd.slice(0, 2)} ${dd} ${mo.slice(0, 3)} ${yy}`);
      if (d === mm % 7) grid.push(`${title(wd)} ${dd} ${mo}`, `${wd}, ${dd} ${mo}`);
    }
    grid.push('Lunedì 7 ottobre 2014', 'Martedì, 7 ottobre 2014', 'Lunedì, 7.ott.2014', 'Lunedì 7/ottobre/2014', 'Lunedì 7-ottobre-2014', 'Lunedì 7 ottobre', 'Martedì 27 novembre 1922', 'Martedì 27 novembre del 1922', 'Lunedì 0 ottobre 2014', 'Lunedì 32 ottobre 2014', 'Lunedì 7 xxx 2014', 'Lunedì 7 ottobre 99999', 'Do 7 ott 2014', 'Sabato 7 ottobre 2014 e domenica 8 ottobre 2014.', 'Il lunedì 7 ottobre 2014 e il martedì 8 ottobre 2014.');
    const dtexts = uniq([...dr.texts, ...grid]);
    for (const [sfx, ft] of CLOCKS) {
      chunks(dtexts, 80).forEach((cc, n) => w(DIR, `rule-DateCheckFilter${sfx}-${String(n).padStart(2, '0')}`, `it DateCheckFilter via rules ${dr.ids.join(',')}: examples + date grid${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(dr.ids)), chk(base, t, { level: 'PICKY' })]), ['paths'], ft ? { FAKETIME: ft } : undefined));
    }
  }
  if (key === 'pl') {
    // PL_WORD_REPEAT / WORD_REPEAT_RULE
    const wr = c.wordRepeat;
    w(DIR, 'rule-PolishWordRepeatRule', 'pl PL_WORD_REPEAT (default off, enabled) + WORD_REPEAT_RULE: excluded words/POS, lemma repeats', 'check',
      wr.flatMap((t) => [chk(base, `${title(t)}.`, only(['PL_WORD_REPEAT', 'WORD_REPEAT_RULE'])), chk(base, `Powiedział, że ${t} i poszedł.`, only(['PL_WORD_REPEAT'])), chk(base, `Powiedział, że ${t} i poszedł.`, { enabledRules: ['PL_WORD_REPEAT'] }), chk(base, `Powiedział, że ${t} i poszedł.`), chk(base, `Pierwsze. ${title(t)}`, only(['PL_WORD_REPEAT', 'WORD_REPEAT_RULE'], { level: 'PICKY' }))]));
    w(DIR, 'rule-PolishWordRepeatRule-edge', 'pl PL_WORD_REPEAT / WORD_REPEAT_RULE edge texts', 'check',
      ['jest, jest', 'jest . jest', 'jest - jest', 'jest-jest', 'jest  jest', 'jest\njest', 'Jest Jest', 'JEST JEST', 'a a a a', '1 1', '2 2 2', '&quot; &quot;', '&amp; &amp;', 'XIV XIV', 'I I', 'ma ma', 'mam mam', 'Wiem, że wiem, że wiem.', 'Kupiłem dom i dom kupiłem.', 'Poszła do domu, wróciła z domu.', 'Duży dom, duże domy, duży dom.', 'Pił piwo, piwo było dobre, piwo.', 'Ona widziała jego, a on widział ją.', 'Nasz dom jest nasz.', 'Nie, nie i jeszcze raz nie.', 'To, to i to.', 'Być albo nie być.', 'Czy czy czy', 'Lub lub', 'Zł zł', 'tys. tys.', 'proc. proc.'].map((t) => chk(base, t, { enabledRules: ['PL_WORD_REPEAT', 'WORD_REPEAT_RULE'] })));
    // CompoundRule / DashRule
    const stripOpt = (e) => e.replace(/[*+]$/, '');
    const comp = lines(path.join(RES, 'compounds.txt'));
    stats.compounds = comp.length;
    const samp = pick(comp, 260);
    const ccases = [];
    for (const e of samp) {
      const s = stripOpt(e);
      ccases.push(`To jest ${s}.`, `To jest ${s.replace(/-/g, ' ')}.`, `To jest ${title(s.replace(/-/g, ' '))}.`, `To jest ${s.replace(/-/g, '')}.`, `${title(s.replace(/-/g, ' '))} jest tu.`, `To jest ${s.replace(/-/g, ' — ')}.`, `To jest ${s.replace(/-/g, '–')}.`, `To jest ${s.replace(/-/g, ' - ')}.`, `To jest ${s.replace(/-/g, '—')}.`, `${s.toUpperCase()}`);
    }
    chunks(ccases, 250).forEach((cc, n) => w(DIR, `rule-compounds-${String(n).padStart(2, '0')}`, 'pl PL_COMPOUNDS / DASH_RULE: compounds.txt entries hyphenated, spaced, joined, dashed, capitalised', 'check', cc.flatMap((text) => [chk(base, text, only(['PL_COMPOUNDS', 'DASH_RULE'], { level: 'PICKY' })), chk(base, text, { level: 'PICKY' })])));
    w(DIR, 'rule-compounds-edge', 'pl PL_COMPOUNDS / DASH_RULE edge texts', 'check', ['Rabce Zdroju', 'Rabce-Zdroju', 'Rabce — Zdroju', 'Lądek — Zdrój', 'Lądek-Zdrój', 'Lądek Zdrój', 'lądek zdrój', 'ŁĄDEK ZDRÓJ', 'nota bene', 'nota-bene', 'notabene', 'raz dwa', 'raz-dwa', 'razdwa', 'a  b', 'Bielsko — Biała', 'Bielsko–Biała', 'Bielsko - Biała', 'Bielsko -Biała', 'Bielsko- Biała', 'Bielsko Biała', 'Bielsko-Biała-Cieszyn', '— Zdrój', 'Zdrój —', '—', '–', '-', 'a — b — c', 'a–b', 'Warszawa — Kraków', 'Warszawa-Kraków', 'Rabce\nZdroju', 'Rabce\tZdroju'].map((text) => chk(base, text, only(['PL_COMPOUNDS', 'DASH_RULE'], { level: 'PICKY' }))));
    // SimpleReplaceRule
    const rep = lines(path.join(R, 'rules/pl/replace.txt')).map((l) => l.split('=')).filter((p) => p.length >= 2);
    stats.replaceEntries = rep.length;
    const rcases = rep.flatMap(([a], i) => [`To jest ${a}.`, `${title(a)} jest tu.`, `To ${a.toUpperCase()}.`, `Tu ${a}, tam ${a}.`, `${a}`, `Nie ${a}, ale ${title(a)}.`]);
    chunks(rcases, 250).forEach((cc, n) => w(DIR, `rule-replace-${String(n).padStart(2, '0')}`, 'pl PL_SIMPLE_REPLACE: replace.txt entries in contexts, case variants', 'check', cc.flatMap((text) => [chk(base, text, only(['PL_SIMPLE_REPLACE'])), chk(base, text)])));
    w(DIR, 'rule-replace-edge', 'pl PL_SIMPLE_REPLACE edge texts', 'check', ['sei', 'Sei', 'SEI', 'sie', 'cie', 'duh', 'domowi', 'niewiadomo', 'sei sei', 'sei. sie!', 'sei-sie', 'sei,sie', '„sei”', '(sei)', 'sei\nsie', 'Nie wiem sei.', '1 sei', 'sei1', 'ssei'].map((text) => chk(base, text, only(['PL_SIMPLE_REPLACE']))));
    // WordCoherencyRule
    const coh = lines(path.join(R, 'rules/pl/coherency.txt')).map((l) => l.split(';')).filter((p) => p.length >= 2);
    stats.coherencyPairs = coh.length;
    const hcases = coh.flatMap(([a, b]) => [`To jest ${a}. Tam jest ${b}.`, `To jest ${b}. Tam jest ${a}.`, `${title(a)} i ${b}.`, `To jest ${a}. Tam jest ${a}.`, `Zdanie ${a}.\n\nZdanie ${title(b)}.`, `${a} ${b}`]);
    chunks(hcases, 250).forEach((cc, n) => w(DIR, `rule-coherency-${String(n).padStart(2, '0')}`, 'pl PL_WORD_COHERENCY: coherency.txt pairs in both orders, case, paragraphs', 'check', cc.flatMap((text) => [chk(base, text, only(['PL_WORD_COHERENCY'])), chk(base, text)])));
    w(DIR, 'rule-coherency-edge', 'pl PL_WORD_COHERENCY edge texts', 'check', ['Grapefruity i Grejpfrut.', 'Grapefruit. Grejpfrut.', 'grapefruit, grejpfrut, grapefruit', 'Aerobik i aerobic.', 'aerobik\naerobic', 'Aerobik. Aerobic.', 'Aerobik aerobik aerobik.', 'AEROBIK i AEROBIC.', 'ablativus ablatiwus accusativus akuzatiwus'].map((text) => chk(base, text, only(['PL_WORD_COHERENCY']))));
    // unpaired brackets, uppercase start, whitespace
    const brk = ['„cudzysłowem.', '(a', 'a)', '[x', 'x]', '{x', 'x}', '»x', 'x«', '"x', 'x"', 'Mówi: „Tak (nie”.)', 'a „b ”c” d', '„a „b” c”', '„a (b ”c)', '((a)', '(a))', '[(])', '„»a«”', '»„a”«', '"a" "b', '"a" b"', 'Zdanie. „Drugie zdanie.', 'Zdanie (1. Drugie) zdanie.', '1) pierwszy 2) drugi', 'a) pierwszy b) drugi', '(a) i b)', 'Tak: "tak" i "nie', 'To jest "cytat" i „cytat”.', '"', '„', '”', '(', ')', '(((', ')))', '«»', '„”', '()', '[]', '{}', ':)', ';(', ':-)', 'Wpisz (tekst) lub [użyj] {przykładu}.'];
    w(DIR, 'rule-PolishUnpairedBracketsRule', 'pl PL_UNPAIRED_BRACKETS texts', 'check', brk.flatMap((t) => [chk(base, t, only(['PL_UNPAIRED_BRACKETS'])), chk(base, t)]));
    w(DIR, 'rule-core-pl', 'pl core rules with Polish: UPPERCASE_SENTENCE_START, WHITESPACE_RULE, SENTENCE_WHITESPACE, COMMA_PARENTHESIS_WHITESPACE, WORD_REPEAT_RULE', 'check',
      ['to jest zdanie. a to drugie.', 'To jest zdanie. a to drugie.', 'ul. Marszałkowska. numer 5.', 'Pan dr. kowalski przyszedł.', 'np. tak jest. itd. dalej.', '„cytat”. potem', '"cytat" a potem', '1. punkt\n2. punkt', 'a) pierwszy\nb) drugi', 'Zdanie.Drugie zdanie.', 'Zdanie. Drugie  zdanie.', 'Zdanie.  Drugie zdanie.', 'Zdanie .Drugie.', 'Zdanie ,drugie ( ok ).', 'Zdanie  z  podwójnymi  spacjami.', ' Zdanie ze spacją na początku.', 'Zdanie z tabulatorem\ti dalej.', 'Zdanie z\u00a0twardą spacją.', 'To to jest jest dziwne.', 'Idę idę.', 'ŁÓDŹ. łódź. Łódź', 'ĄĘ. ąę.', 'ósmy. Ósmy.', 'iPhone jest. eBay też.', 'www.example.pl jest. http://x.pl też.', 'a@b.pl pisze. c@d.pl też.', '3 maja. 4 maja.', '„Zdanie. ” a potem.', 'Zdanie… potem', 'Zdanie... potem', 'Zdanie!!! Potem', 'Zdanie?! Potem', 'Zdanie.. potem'].flatMap((t) => [chk(base, t, only(['UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE', 'COMMA_PARENTHESIS_WHITESPACE', 'WORD_REPEAT_RULE'])), chk(base, t, { level: 'PICKY' })]));
    // speller specifics
    const pref = ['arcy', 'neo', 'pre', 'anty', 'eks', 'bez', 'beze', 'ekstra', 'hiper', 'infra', 'kontr', 'maksi', 'midi', 'między', 'mini', 'nad', 'nade', 'około', 'ponad', 'post', 'pro', 'przeciw', 'pseudo', 'super', 'śród', 'ultra', 'wice', 'wokół', 'wokoło'];
    const base2 = ['spódniczka', 'ważny', 'dom', 'ludzki', 'polski', 'sklep', 'miasto', 'dobry', 'nowoczesny', 'mądry'];
    w(DIR, 'rule-speller-prefixes', 'pl speller isNotCompound: 29 prefixes x words (joined, spaced, hyphenated, capitalised, misspelled remainder)', 'check',
      pref.flatMap((p, i) => { const b = base2[i % base2.length]; return [chk(base, `${p}${b}`, spOpts), chk(base, `${p} ${b}`, spOpts), chk(base, `${p}-${b}`, spOpts), chk(base, `${title(p)}${b}`, spOpts), chk(base, `${p}${typo(b, i)}`, spOpts), chk(base, `${p}${b}ami`, spOpts), chk(base, `Mówię o ${p}${b}.`)]; }));
    w(DIR, 'rule-speller-tokenizing', 'pl speller tokenizingPattern quasi-/niby- and hyphenated words, adja+adj compounds', 'check',
      ['quasi-naukowy', 'Quasi-naukowy', 'niby-naukowy', 'Niby-prawda', 'quasi-', 'quasi-xyzzy', 'niby-xyzzy', 'quasi naukowy', 'polsko-niemiecki', 'niemiecko-polski', 'biało-czerwony', 'czerwono-biały', 'polsko-xyzzy', 'xyzzy-polski', 'polsko-niemiecko-francuski', 'dwu-trzy', 'pół-litra', 'pół litra', 'pólitra', 'Czesko-słowacki', 'ukraińsko-polsko', 'nie-polski', 'a-b', '1-2', 'x-y-z', 'e-mail', 'email', 'SMS-y', 'ZUS-u', 'ZUS-ie'].map((t) => chk(base, `To jest ${t}.`, spOpts)));
    const sufw = pick(words.filter((x) => x.length > 5), 80);
    w(DIR, 'rule-speller-suffix-suggestions', 'pl speller: typos of words with banned-suffix splits (ami, ach, e, ego, em ...) and suggestion limits', 'check',
      sufw.flatMap((x, i) => [chk(base, `To jest ${x.slice(0, -2)}${['ami', 'ach', 'ego', 'em', 'owi', 'ie'][i % 6]}.`, spOpts), chk(base, `To ${typo(x, i)} ${typo(x, i + 1)} ${typo(x, i + 2)} ${typo(x, i + 3)}.`, spOpts)]));
    w(DIR, 'rule-speller-many', 'pl speller: many misspellings in one sentence (too_many_errors suggestion limit), lowercase correct form', 'check',
      [Array.from({ length: 12 }, (_, i) => typo(spellSetPl(c, i), i)).join(' '), 'Warszawa warszawa WARSZAWA wArSzAwA', 'polska Polska POLSKA', 'Polak polak POLAK polakach Polakach polakami', 'bledem błedem błędem', 'xyzzy plugh', 'ąęłńóśźż ĄĘŁŃÓŚŹŻ', 'Łódź łódź ŁÓDŹ lodz', 'zażółć gęślą jaźń', 'zazolc gesla jazn'].map((t) => chk(base, t, spOpts)));
    // DateCheckFilter / DecadeSpellingFilter / DateRangeChecker / ShortenedYearRangeChecker through rules
    const dr = filterRules(path.join(R, 'rules/pl/grammar.xml'), 'pl.DateCheckFilter');
    const dec = filterRules(path.join(R, 'rules/pl/grammar.xml'), 'pl.DecadeSpellingFilter');
    const rng = filterRules(path.join(R, 'rules/pl/grammar.xml'), 'DateRangeChecker');
    const sty = filterRules(path.join(R, 'rules/pl/grammar.xml'), 'ShortenedYearRangeChecker');
    stats.dateRules = dr.ids.join(','); stats.decadeRules = dec.ids.join(','); stats.rangeRules = rng.ids.join(','); stats.shortYearRules = sty.ids.join(',');
    const grid = [];
    const abbr = ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
    for (let d = 0; d < 7; d++) for (const [dd, mm, yy] of [[27, 7, 2014], [15, 2, 2026], [29, 1, 2024], [29, 1, 2023], [31, 3, 2026], [1, 0, 2000], [31, 11, 2026], [1, 0, 2027], [30, 1, 2026]]) {
      const wd = WEEK_PL[d]; const mo = MON_PL[mm];
      grid.push(`${title(wd)} ${dd} ${mo} ${yy}`, `${wd}, ${dd} ${mo} ${yy}`, `${abbr[d]}., ${dd} ${mo} ${yy}`, `${wd} ${dd} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][mm]} ${yy}`, `${wd} ${dd} ${mo.slice(0, 3)}. ${yy}`, `${wd.toUpperCase()} ${dd} ${mo} ${yy}`);
    }
    grid.push('wtorek, 26 sierpnia 2014', 'Dziś jest wtorek, 27 sierpnia 2014.', 'Dziś jest pt., 27 sierpnia 2014.', 'Dziś jest niedziela 27 sierpnia 2014.', 'Koncert odbędzie się w niedzielę 27 sierpnia 2014.', 'Poniedziałek 0 maja 2014', 'Poniedziałek 32 maja 2014', 'Poniedziałek 5 xxx 2014', 'Poniedziałek 5 maja 99999', 'środa 29 lutego 2018', '29 II 2020', '29 lutego 2100', 'Piątek, piątek 5 maja 2023', 'w piątek 5 maja 2023 i w sobotę 6 maja 2023.');
    const decGrid = [];
    for (const dcd of ['1840', '1990', '1770', '1660', '1560', '1460', '1360', '1260', '1160', '1900', '1800', '1700', '1200', '1100', '1010', '1090', '2010', '2000', '1930', '1980']) decGrid.push(`W latach ${dcd}.`, `Na początku lat ${dcd}. ulica`, `lata ${dcd}. były dobre`, `${dcd}. było`, `W roku ${dcd}. wydarzyło się`, `Od lat ${dcd}.`, `Lata ${dcd}. XX w.`, `W latach ${dcd}`);
    decGrid.push('Lata zerowe XXI wieku', 'Lata zerowe XX', 'w latach zerowych XXI', 'lata 90.', 'lata 90-te', 'lata dziewięćdziesiąte', 'Lata 1990.', 'Lat 1990.', 'latach 1990.', 'rokiem 1990.');
    const rngGrid = ['w dniach 11–1 lutego', 'w dniach 1–12 lutego', 'od 11 do 1 lutego', 'od 1 do 11 lutego', 'w dniach 21–10 XII', '21-10 XII', '10-21 XII', '31–1 maja', '1–1 maja', '0–5 maja', '5–0 maja', '99–1 maja', 'w latach 1990–1980', 'w latach 1980–1990', 'w latach 1990-89', 'w latach 1980-90', 'w latach 2010–5', 'w latach 2010–15', '1990-1980 r.', '2010-2005', '2010–05', '1999–00', '1999–2000', '1999-98 r.', '10-5 tys. zł', '12-3 mln zł', '5–2 proc.', '1990–89 p.n.e.', '200–100 p.n.e.', '100–200 p.n.e.', '1990–2020 n.e.', '2010-2005 r.', 'w latach 2020–19 oraz 1990–89', 'str. 15-3', 's. 100–50', 'rozdz. 5–2', '15-3 sierpnia', '15–3 sierpnia 2020', 'od 15 do 3 sierpnia 2020'];
    const allD = uniq([...dr.texts, ...grid]);
    for (const [sfx, ft] of CLOCKS) {
      chunks(allD, 80).forEach((cc, n) => w(DIR, `rule-DateCheckFilter${sfx}-${String(n).padStart(2, '0')}`, `pl DateCheckFilter via rules ${dr.ids.join(',')}: examples + date grid${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(dr.ids)), chk(base, t, { level: 'PICKY' })]), ['paths'], ft ? { FAKETIME: ft } : undefined));
    }
    w(DIR, 'rule-DecadeSpellingFilter', `pl DecadeSpellingFilter via rules ${dec.ids.join(',')}: examples + decade grid`, 'check', uniq([...dec.texts, ...decGrid]).flatMap((t) => [chk(base, t, only(dec.ids)), chk(base, t)]));
    w(DIR, 'rule-DateRangeChecker', `pl DateRangeChecker/ShortenedYearRangeChecker via rules ${[...rng.ids, ...sty.ids].join(',')}: examples + range grid`, 'check', uniq([...rng.texts, ...sty.texts, ...rngGrid]).flatMap((t) => [chk(base, t, only([...rng.ids, ...sty.ids])), chk(base, t)]));
    // direct filter calls
    const PKG = 'org.languagetool.rules.pl.';
    const rq = (text, cls, args, o = {}) => {
      const ws = o.words ?? text.split(/\s+/);
      return { op: 'filter-run', args: { lang: base, text, filter: { cls: PKG + cls }, args, from: o.from ?? 0, to: o.to ?? text.length, patternTokenPos: o.pos ?? 0, tokenPositions: o.tokenPositions ?? ws.map(() => 1), window: o.window ?? [1, ws.length + 1], message: o.message ?? 'msg {year} {realYear} {realDay} {day} {month} {currentYear} {dekada} {wiek}', shortMessage: 'sm', ...(o.suggestions ? { suggestions: o.suggestions } : {}), ...(o.clockAt ? { clockAt: o.clockAt } : {}) } };
    };
    const dgrid = [];
    for (const day of ['poniedziałek', 'Poniedziałek', 'PONIEDZIAŁEK', 'wtorek', 'środa', 'Środa', 'czwartek', 'piątek', 'sobota', 'niedziela', 'pon.', 'pon', 'wt', 'śr', 'czw', 'pt', 'pt.', 'sob', 'niedz', 'piątk', 'piątku', 'pt.', 'xyz', '', 'sr', 'śro']) for (const [d, m, y] of [['27', 'sierpnia', '2014'], ['15', 'marca', '2026'], ['16', 'marca', '2026'], ['29', 'lutego', '2024'], ['29', 'lutego', '2023'], ['31', 'kwietnia', '2026'], ['5', 'XII', '2026'], ['5', 'xii', '2026'], ['5', 'Grudnia', '1900'], ['5', 'GRUDNIA', '2026'], ['0', 'maja', '2026'], ['5', 'grudzień', '2026'], ['5', 'maj', '2026'], ['abc', 'maja', '2026'], ['5', 'maja', 'abcd'], ['5', 'maja', '99999999999'], ['5', 'maja', ''], ['', 'maja', '2026'], ['5', '', '2026'], ['5', 'września', '2026'], ['5', 'października', '2026'], ['1', 'stycznia', '2027'], ['31', 'grudnia', '2026']]) dgrid.push([day, d, m, y]);
    const args4 = (day, d, m, y) => [['weekDay', day], ['day', d], ['month', m], ['year', y]];
    for (const [sfx, ft, clk] of CLOCKS) {
      const dc = [];
      for (const [day, d, m, y] of dgrid) dc.push(rq(`${day} ${d} ${m} ${y}`, 'DateCheckFilter', args4(day, d, m, y), { words: [day, d, m, y], message: 'wd {realDay} / {day} / {currentYear}', suggestions: [], clockAt: clk }));
      for (const [day, d, m] of dgrid.slice(0, 80)) dc.push(rq(`${day} ${d} ${m}`, 'DateCheckFilter', [['weekDay', day], ['day', d], ['month', m]], { words: [day, d, m], message: 'wd {realDay} / {day} / {currentYear}', clockAt: clk }));
      for (const a of [[['weekDay', 'wtorek'], ['day', '27']], [['day', '27'], ['month', 'sierpnia'], ['year', '2014']], [['weekDay', 'wtorek'], ['month', 'sierpnia'], ['year', '2014']], [['weekDay', 'wtorek'], ['day', '27'], ['month', 'sierpnia'], ['year', '2014'], ['extra', 'x']], [['year', '2014']], []]) dc.push(rq('wtorek 27 sierpnia 2014', 'DateCheckFilter', a, { words: ['wtorek', '27', 'sierpnia', '2014'], clockAt: clk }));
      w(DIR, `direct-DateCheckFilter${sfx}`, `pl DateCheckFilter direct filter-run (literal args): weekday x date grid, missing/invalid args${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'jsonl', dc, ['paths'], ft ? { FAKETIME: ft } : undefined);
    }
    const dd = [];
    for (const l of ['1840', '1990', '1770', '1660', '1560', '1460', '1360', '1260', '1160', '1900', '1800', '1700', '2000', '2010', '2090', '3000', '9990', '0000', '0010', '1000', '1', '12', '123', '12345', '20', '99', 'abc', '', 'x1990', '19x0', '١٩٩٠', '１９９０', '-190', '+190', ' 190', '19 0', '1990.', '19,90']) {
      dd.push(rq(`rok ${l}.`, 'DecadeSpellingFilter', [['lata', l]], { words: ['rok', l, '.'], message: 'Poprawnie: {dekada}. {wiek} w. [{dekada}|{wiek}|{dekada}{wiek}]', from: 4, to: 5 + l.length, suggestions: ['s1', 's2'] }));
      dd.push(rq(`${l}.`, 'DecadeSpellingFilter', [['lata', l]], { words: [l, '.'], message: '{wiek} {wiek} {dekada}', from: 0, to: l.length + 1 }));
    }
    dd.push(rq('rok 1990.', 'DecadeSpellingFilter', [], { message: 'm' }), rq('rok 1990.', 'DecadeSpellingFilter', [['lata', null]], { message: 'm' }), rq('rok 1990.', 'DecadeSpellingFilter', [['other', '1990']], { message: 'm' }), rq('rok 1990.', 'DecadeSpellingFilter', [['lata', '1990'], ['x', 'y']], { message: '' }));
    w(DIR, 'direct-DecadeSpellingFilter', 'pl DecadeSpellingFilter direct filter-run: decade values, roman numerals, invalid and missing args, placeholders', 'jsonl', dd);
    // bitext
    const bt = [['There is a dog.', 'Nie ma psa.'], ['There is no dog.', 'Nie ma psa.'], ['There is a dog.', 'Jest pies.'], ['There is a dog.', 'Nie jest pies.'], ['There is nothing here.', 'Nie ma tu niczego.'], ['There is nobody here.', 'Nie ma tu nikogo.'], ['There is something.', 'Nie jest coś.'], ['there is a cat', 'nie ma kota'], ['THERE IS A CAT', 'NIE MA KOTA'], ['There is', 'Nie ma'], ['There is a', 'Nie jest'], ['There was a dog.', 'Nie ma psa.'], ['There is a dog and there is a cat.', 'Nie ma psa i nie jest kot.'], ['Hello.', 'Cześć!'], ['I like actually.', 'Aktualnie lubię.'], ['', 'Nie ma.'], ['There is a dog.', ''], ['', ''], ['There is a dog.', 'Nie'], ['There is a dog.', 'Zażółć gęślą jaźń nie ma psa.'], ['There is a dog.', 'Nie ma'], ['This is a test.', 'To jest test.'], ['Hi.', 'Bardzo długie zdanie po polsku, które znacznie przekracza długość oryginału.'], ['Same.', 'Same.'], ['Hello?', 'Cześć.'], ['Wait!', 'Czekaj?']];
    w(DIR, 'bitext-tools', 'pl Tools.getBitextRules/checkBitext en->pl with bitext.xml (there_is) and the built-in bitext rules', 'jsonl', [{ op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'pl', pairs: bt, detail: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'pl', pairs: bt, brief: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'pl-PL', pairs: bt } }, { op: 'bitext-tools', args: { srcLang: 'pl', trgLang: 'en', pairs: bt.map(([a, b]) => [b, a]) } }, { op: 'bitext-tools', args: { srcLang: 'de', trgLang: 'pl', pairs: [['Es gibt einen Hund.', 'Nie ma psa.'], ['Hallo.', 'Cześć.']] } }]);
    w(DIR, 'bitext-load', 'pl bitext.xml resource loading with pairs', 'jsonl', [{ op: 'bitext-load', args: { mode: 'resource', name: '/pl/bitext.xml', srcLang: 'en', trgLang: 'pl', pairs: bt } }, { op: 'bitext-load', args: { mode: 'resource', name: '/pl/bitext.xml', srcLang: 'en', trgLang: 'pl-PL', pairs: bt.slice(0, 5) } }, { op: 'bitext-load', args: { mode: 'resource', name: '/pl/bitext.xml' } }]);
  }

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
  if (key === 'pl') {
    cli('enable-word-repeat', ['-l', 'pl', '-e', 'PL_WORD_REPEAT', '--json', '-'], 'To jest jest test. Ala ma ma kota i kot kot.');
    cli('bitext-basic', ['-l', 'pl', '-m', 'en', '-b2', 'input.txt'], null, { 'input.txt': 'There is a dog.\tNie ma psa.\nThere is a dog.\tJest pies.\nHello world\tCześć świecie\nShort\tTo jest bardzo długie tłumaczenie, które jest dużo dłuższe niż oryginał i dlatego rzuca się w oczy.\n' });
    cli('bitext-stdin', ['-l', 'pl', '-m', 'en', '-b2', '-'], 'There is a dog.\tNie ma psa.\n');
    cli('bitext-json', ['-l', 'pl', '-m', 'en', '-b2', '--json', 'input.txt'], null, { 'input.txt': 'There is a dog.\tNie ma psa.\nThere is no dog.\tNie ma psa.\n' });
    cli('bitext-disable', ['-l', 'pl', '-m', 'en', '-b2', '-d', 'there_is', 'input.txt'], null, { 'input.txt': 'There is a dog.\tNie ma psa.\n' });
    cli('bitext-enable-only', ['-l', 'pl', '-m', 'en', '-b2', '-eo', '-e', 'there_is', 'input.txt'], null, { 'input.txt': 'There is a dog.\tNie ma psa.\nHi.\tBardzo długie zdanie po polsku, które znacznie przekracza długość oryginału.\n' });
    cli('bitext-apply', ['-l', 'pl', '-m', 'en', '-b2', '-a', 'input.txt'], null, { 'input.txt': 'There is a dog.\tNie ma psa.\n' });
  }

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
