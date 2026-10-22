// Authors oracle/cases/X-ESCHECK (W31: Spanish full-pipeline checks, filters, rules, speller, disambiguation, tagger/synth). Inputs only; docs/review/W31-oracle.md
// Usage: node oracle/scripts/gen-cases-w31check.mjs [es] [--only=<regex>]. Derived from gen-cases-w23check.mjs. Synth lemma/tag pairs are harvested from the Java tagger at generation time (tag op).
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, LT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

preflight();
const MOD = path.join(ROOT, 'oracle/java-src/languagetool-language-modules');
const CORE_SPG = path.join(ROOT, 'oracle/java-src/languagetool-core/src/main/resources/org/languagetool/resource/spelling_global.txt');
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
function allJavaStrings1(file) {
  const src = readFileSync(file, 'utf8').replace(/\/\*[^]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m1 = src.replace(/"((?:\\.|[^"\\])*)"\s*\+\s*"((?:\\.|[^"\\])*)"/g, (m, a, b) => `"${a}${b}"`).replace(/"((?:\\.|[^"\\])*)"\s*\+\s*"((?:\\.|[^"\\])*)"/g, (m, a, b) => `"${a}${b}"`);
  const out = [];
  for (const s of m1.matchAll(/"((?:\\.|[^"\\\n])*)"/g)) { try { out.push(JSON.parse(`"${s[1].replace(/\\'/g, "'")}"`)); } catch { /* skip */ } }
  return uniq(out);
}
const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && l[0] !== '#') : []);
const stripComments = (s) => s.replace(/<!--[^]*?-->/g, '');
// rule ids (group id for sub-rules) whose XML uses a filter class (substring), with the example texts of those rules
function filterRules(files, cls) {
  const ids = [];
  const texts = [];
  const pairs = [];
  for (const file of [].concat(files)) {
    const src = stripComments(readFileSync(file, 'utf8'));
    const blocks = [];
    const groups = [];
    for (const g of src.matchAll(/<rulegroup\b([^>]*)>([^]*?)<\/rulegroup>/g)) { groups.push([g.index, g.index + g[0].length]); blocks.push([g[1], g[2]]); }
    for (const r of src.matchAll(/<rule\b([^>]*)>([^]*?)<\/rule>/g)) if (!groups.some(([x, y]) => r.index >= x && r.index < y)) blocks.push([r[1], r[2]]);
    for (const [at, body] of blocks) {
      if (!body.includes(cls)) continue;
      const id = (/\bid="([^"]*)"/.exec(at) || [])[1];
      if (id) ids.push(id);
      for (const m of body.matchAll(/<example\b[^>]*>([^]*?)<\/example>/g)) {
        const raw = unescapeXml(m[1]);
        const text = raw.replace(/<\/?marker>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        texts.push(text);
        const mk = /<marker>([^]*?)<\/marker>/.exec(raw);
        if (mk) pairs.push([text, mk[1].replace(/<[^>]+>/g, '').trim()]);
      }
      for (const m of body.matchAll(/<filter\b[^>]*class="[^"]*"[^>]*args="([^"]*)"/g)) pairs.args = (pairs.args ?? []).concat(m[1]);
    }
  }
  return { ids: uniq(ids), texts: uniq(texts), pairs, args: uniq(pairs.args ?? []) };
}

const CFG = {
  es: {
    id: 'X-ESCHECK', mod: 'es', codes: ['es', 'es-AR'], extraCodes: ['es-ES', 'es-MX'], chunk: 100, langName: 'Spanish',
    ruleIds: ['MORFOLOGIK_RULE_ES', 'ES_COMPOUNDS', 'ES_SIMPLE_REPLACE_SIMPLE', 'ES_SIMPLE_REPLACE_VERBS', 'ES_WIKIPEDIA_COMMON_ERRORS', 'ES_QUESTION_MARK', 'ES_UNPAIRED_BRACKETS', 'SPANISH_WORD_REPEAT_RULE', 'SPANISH_WORD_REPEAT_BEGINNING_RULE', 'ES_REPEATEDWORDS', 'SPANISH_WRONG_WORD_IN_CONTEXT', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'DOUBLE_PUNCTUATION', 'SENTENCE_WHITESPACE', 'VOSEO'],
    xml: ['rules/es/grammar.xml', 'rules/es/style.xml'], xmlFiles: ['rules/es/grammar.xml', 'rules/es/style.xml'], disambXml: 'resource/es/disambiguation.xml',
    extraJunit: ['Al cabo de 28 años, el vicealcalde de Busan, Baek Seung Taek, realiza una visita a Badajoz.', 'Escribe o pega tu texto aqui para tenerlo revisado contínuamente. los errores se subrayaran en diferentes colores: marcaremos los errores ortograficos en rojo; los errores de gramática son resaltado en amarillo; los problemas relacionados al estilo serán marcados en azul. Sabías que te proponemos sinónimos al hacer doble clic sobre una palabra? LanguageTool es un herramienta para textos impecables, sean e-mails, artículos, blogs o otros, incluso cuando el texto se complejice.'],
    edge: ['Esta es una frase de prueba, con varias palabras.', 'El veloz murciélago hindú comía feliz cardillo y kiwi.', '¿Qué pasa? ¡Nada! ¿Cómo estás?', 'Que pasa?', 'Hola, cómo estás?', '¡Hola! ¿Qué tal? Muy bien, gracias.', 'Vos tenés razón y vos sos muy inteligente.', 'Vos podés venir y querés comer.', 'Tú eres bueno y vos sos mejor.', 'El 25 % de los alumnos nació el 1.º de mayo de 1990.', 'El N.º 5 y la 3.ª fila, el 2.º piso, el 3.er día.', 'Mide 3,5 m y pesa 1.000 kg, o sea 1 000 g.', 'El lunes, 7 de octubre de 2014, llovió.', 'El martes 7 de octubre de 2014 fue un día frío.', 'El viernes 31 de abril de 2026 no existe.', 'Nació el 29 de febrero de 2023.', 'Nos vemos el domingo 15 de marzo de 2026.', 'a el niño y de el niño, al niño y del niño.', 'Dijo «hola» y “adiós” (con ‘comillas’).', '«Hola (mundo.', 'Soy un hombre (muy honrado.', 'Hace falta que vengas mañana, sino me enfadaré.', 'Se a hecho un esfuerzo para detectar errores ortograficos.', 'Los casas son bonitas y el niña es alta.', 'Mañana me voy. Mañana vuelvo. Mañana se acabó todo.', 'Yo creo. Yo he visto esto antes. Yo no lo creo.', 'El perro perro ladra ladra.', 'D’Hondt, Guns N’ Roses, rock ’n’ roll.', 'Compré un paraguas-sombrilla y un coche-cama.', 'aquí vive la gente de la ciudad. ha subido mucho.', 'Cuando vengas, avísame; si no, llamaré.', 'No sé si tu vienes o no.', 'Dame el te que compraste.', 'Eso es mio y aquello es tuyo.', 'Pais, mas, esta, tambien y aun.', 'Visite www.ejemplo.es o escriba a juan@ejemplo.es.', 'Buen0s días y h0la.', 'Windows10 y windows1995.', 'Ciudad de México, Buenos Aires y San José.'],
    spellWords: ['casa', 'perro', 'gato', 'niño', 'mañana', 'español', 'corazón', 'canción', 'árbol', 'difícil', 'pingüino', 'cigüeña', 'averigüé', 'ñandú', 'hacer', 'tener', 'vosotros', 'Madrid', 'México', 'ordenador', 'computadora', 'vos', 'tenés', 'sos', 'podés', 'hablás', 'murciélago', 'jirafa', 'queso', 'camión'],
    wordRepeat: ['que que', 'de de', 'la la', 'el el', 'y y', 'a a', 'en en', 'no no', 'muy muy', 'poco poco', 'Hola hola', 'bye bye', 'ja ja', 'jaja jaja', 'tan tan', 'ha ha', 'mil mil', '1 1', '- -', 'x x', 'sí sí', 'ya ya', 'más más', 'dale dale', 'Mira mira', 'luego luego', 'siempre siempre', 'cada cada', 'vamos vamos', 'Nueva Nueva', 'C C', 'así así', 'gran gran', 'blanco blanco', 'Pa pa', 'ni ni', 'o o', 'u u', 'e e', 'Que que', 'QUE QUE', 'el perro el perro', 'La casa, la casa', 'Va va va', 'tic tac tic tac', 'bla bla bla'],
    sentExtra: 'El Sr. García llegó. La Dra. López no vino. ¿Vienes? ¡Sí! Etc. y p. ej. así. Pág. 5 y págs. 6-7. Av. de América, n.º 12, 3.º B. Ud. y Uds. EE. UU. y Cía. S. A. fue. Hablé con el Lic. Pérez, el Ing. Soto y el Prof. Ruiz. Eso es todo... ¿o no? Sí.\nNueva línea sin punto\n\nOtro párrafo.',
    wordExtra: ['N.º 5, 1.º, 2.ª, 3.er, 4.os, 5.as, 1.o, 2.a, nº 5, Nº 6', '3,14 y 1.000.000 y 1 000 y 12:30 y 3.5', '25 % 20 °C 5 km/h 3‰ 4‱ 10º 5ª', 'sud-oeste, ex-presidente, anti-OTAN, hispano-americano, 3-4, 1990-2000', 'guion‐bajo y guion‑duro y soft­hyphen', "D’Hondt D'Hondt N’ N' s’ rock ’n’ roll l’homme l'homme", '¿Qué? ¡Hola! «cita» “cita” ‘cita’ "cita" \'cita\'', 'http://x.es/a-b?c=d, a@b-c.es, www.ejemplo.es', 'a_b @user #tag §5 © € £ $ & @', 'e-mail, SMS-ing, anti–OTAN, a—b', 'mp3 mp4 B2B 4x4 C3PO ñ2 3ñ', 'Buenos Aires, Ciudad de México, San José', 'Windows10 windows1995 Windows 10', '  x​y', '   dos   espacios   ', 'ñandú pingüino cigüeña averigüé'],
  },
};
const COMMON_EDGE = ['', ' ', '  ', 'x', '.', '...', 'a', '\n', '\n\n', 'Ünï cödé wörds — „Citat“ «text» "x" ‹ainsi›.', 'a'.repeat(300), 'Primera línea.\nSegunda línea.', 'Tab\tseparated.', '1234 5678.', '😀 Emoji 😀.', 'Hello world, this is an English sentence.', 'Das ist ein deutscher Satz.', '<b>bold</b> &amp; &lt;tag&gt;', 'http://example.com/a?b=c&d=e www.example.org a@b.com', '((( [[[ {{{ ))) ]]] }}}', '"Zitat ohne Ende', 'a,b;c:d!e?f', '  espacios iniciales  y  dobles  ', 'Fin.  Inicio.', ' nbsp test ', 'zero​width', ('Palabra '.repeat(400)).trim() + '.'];

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
  const words = uniq(exTexts.concat(exFixed).flatMap((t) => t.split(/[\s.,;:!?¿¡()„”“"»«—]+/)).filter((x) => x.length > 1 && !/\d/.test(x)));
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
  const sp = c.ruleIds[0];
  const spOpts = { enabledRules: [sp], enabledOnly: true };
  const spellSet = uniq([...c.spellWords, ...pick(words, 300), ...pick(junitWords, 100)]).filter((x) => x.length > 2);
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-valid-${n}`, `${key} speller: dictionary/example words in short sentences`, 'check', cc.map((wd) => chk(base, `${title(wd)} aquí. Esto es ${wd}.`, spOpts))));
  chunks(spellSet, 60).forEach((cc, n) => w(DIR, `spelling-typo-${n}`, `${key} speller: mutated words (deletion, swap, doubling, replacement, suffix), suggestions`, 'check', cc.map((wd, i) => chk(base, `Esto es ${typo(wd, i + n)}.`, spOpts))));
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
  const listCases = (arr) => arr.flatMap((wd, i) => [chk(base, `${wd}`, spOpts), chk(base, `Aquí ${wd}.`, spOpts), chk(base, `${title(wd)} ${wd.toUpperCase()}.`, spOpts), chk(base, `${typo(wd, i)}.`, spOpts)]);
  chunks(spl, 100).forEach((cc, n) => w(DIR, `spelling-list-spelling-${n}`, `${key} speller: hunspell/spelling.txt words (accepted), case and typo variants`, 'check', listCases(cc)));
  chunks(ign, 100).forEach((cc, n) => w(DIR, `spelling-list-ignore-${n}`, `${key} speller: hunspell/ignore.txt words, case and typo variants`, 'check', listCases(cc)));
  if (proh.length) w(DIR, 'spelling-list-prohibit', `${key} speller: hunspell/prohibit.txt words (prohibited), case and typo variants`, 'check', listCases(proh));
  w(DIR, 'spelling-list-sentences', `${key} speller: list words embedded in sentences, all rules`, 'check', pick([...spl, ...ign, ...proh], 120).map((wd, i) => chk(base, `Yo vi ${i % 2 ? title(wd) : wd} ayer, ${typo(wd, i)}.`)));

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
    ['<b>negrita</b> texto.', '&amp; &lt;tag&gt; <br/> línea', '<p>Hola  mundo</p><p>otro</p>', '[[Enlace|Texto]] {{Plantilla}} aquí', '<marker>x</marker> prueba', 'http://example.com/a?b=c&d=e www.ejemplo.es a@b.com', 'MAYÚSCULAS BIEN. 2020-10-12 y 12.10.2020 y 3,14.'].map((text) => chk(base, text, { level: 'PICKY' })));

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
  const lcodes = [...c.codes, ...(c.extraCodes ?? []), ...c.codes.map((x) => x.toUpperCase()), ...c.codes.map((x) => x.replace('-', '_')), base + '-XX'];
  w(DIR, 'languages', `${key} Languages lookups (short code, long code, name, locale, supported)`, 'jsonl',
    lcodes.map((code) => ({ op: 'lang-lookup', args: { calls: [sc(code), { fn: 'supported', code }] } }))
      .concat([{ op: 'lang-lookup', args: { calls: [{ fn: 'name', name: c.langName }, { fn: 'locale', locale: { language: base, country: '', variant: '' } }, { fn: 'locale', locale: { language: base, country: c.codes[1].split('-')[1], variant: '' } }] } }]));

  // ---- tokenizers
  const sentTexts = uniq([...junitU.slice(0, 200), ...EDGE.slice(2), ...exTexts.slice(0, 80), exTexts.join(' ').slice(0, 3000), exTexts.slice(0, 30).join('\n'), c.sentExtra, ...junitWords.slice(0, 40)]);
  w(DIR, `sentence-tokenize-${base}`, `${key} SRX sentence tokenizer, single line breaks mark paragraph false/true`, 'jsonl', c.codes.map((v) => ({ op: 'sentence-tokenize', args: { lang: v, modes: [false, true], texts: sentTexts } })));
  const compLines = lines(path.join(RES, 'compounds.txt')).map((l) => l.replace(/[*+]$/, ''));
  const wtTexts = [...sentTexts, ...c.wordExtra, '3,14 a 1.000.000. 12:30 `x` a_b @user #tag', "don't l'homme 'quoted' \"double\" «comillas» “inglesas” ‘simples’ ’tilde’", '1.5 % 20 °C 5 km/h', '\u00a0\u2009x\u200by', ...pick(compLines, 200).map((x) => `Esto es ${x}.`), ...pick(compLines, 150)];
  chunks(wtTexts, 400).forEach((cc, n) => w(DIR, `word-tokenize-${base}-${n}`, `${key} word tokenizer (SpanishWordTokenizer)`, 'jsonl', (n === 0 ? c.codes : [base]).map((v) => ({ op: 'word-tokenize', args: { lang: v, texts: cc } }))));

  // ---- tagger
  const nieV = [];
  const nieEx = [];
  const added = lines(path.join(RES, 'added.txt')).map((l) => l.split('\t')[0]);
  const removed = lines(path.join(RES, 'removed.txt')).map((l) => l.split('\t')[0]);
  stats.nieVerdicts = nieV.length; stats.nieExceptions = nieEx.length;
  const mk = (arr) => arr.flatMap((wd) => [wd, wd.toLowerCase(), wd.toUpperCase(), title(wd.toLowerCase())]);
  const tagWords = uniq([...mk(pick(words, 600)), ...mk(c.spellWords), ...mk(junitWords), ...mk(added), ...mk(removed), '', ' ', '.', ',', '1', '123', '3,14', 'x', 'X', 'ñ', 'Ñ', 'ü', 'Ü', 'ÁÉÍÓÚ', 'á', 'é', "l'x", "d’Hondt", "D’Hondt", "N’", "s’", '’', '-', '--', 'a-b', '😀']);
  chunks(tagWords, 400).forEach((cc, n) => w(DIR, `tag-words-${String(n).padStart(2, '0')}`, `${key} tagger: words as single-token lists (lower/upper/title variants)`, 'jsonl', [{ op: 'tag', args: { lang: base, tokenLists: cc.map((x) => [x]) } }]));
  w(DIR, 'tag-sentences', `${key} tagger: word-tokenized sentences (JUnit, examples, edge)`, 'jsonl', [{ op: 'tag', args: { lang: base, texts: uniq([...junitU.slice(0, 120), ...EDGE.slice(2, 30), ...pick(exTexts, 100)]) } }, { op: 'tag', args: { lang: c.codes[1], texts: junitU.slice(0, 4) } }]);

  // ---- disambiguation: full language disambiguator (analyze-raw: raw/post/pre), XML disambiguator (disamb-run, disamb-examples)
  const mwFile = path.join(RES, 'multiwords.txt');
  const mw = lines(mwFile).map((l) => l.split('\t')[0].trim()).filter(Boolean);
  const dPool = uniq([...junitU.slice(0, 100), ...EDGE.slice(2, 30), ...pick(exTexts, 120), ...pick(dTexts, 200), ...c.wordExtra]);
  chunks(dPool, 20).forEach((cc, n) => w(DIR, `analyze-raw-${String(n).padStart(2, '0')}`, `${key} analyze-raw (raw/post/pre disambiguation)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
  if (mw.length) chunks(pick(mw, 240).map((x) => `Ayer ${x} estuvo. ${title(x)} aquí ${x}, ${x.toUpperCase()}.`), 20).forEach((cc, n) => w(DIR, `analyze-multiword-${String(n).padStart(2, '0')}`, `${key} analyze-raw multiwords.txt entries (hybrid disambiguator MultiWordChunker)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));
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
    const tagsAll = execFileSync('unzip', ['-p', path.join(LT, 'libs/spanish-pos-dict.jar'), 'org/languagetool/resource/es/es-ES_tags.txt'], { maxBuffer: 1 << 26 }).toString('utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
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
    reals.unshift(...[['casa', 'NCFS000'], ['casar', 'VMIP3S0'], ['ser', 'VSIP1S0'], ['bueno', 'AQ0MS0'], ['perro', 'NCMP000'], ['hacer clic', 'VMIP3S0'], ['dar de alta', 'VMIP3S0'], ['mil', '_spell_number_'], ['123', '_spell_number_']].map(([l, tg]) => syn(l, tg)));
    chunks(reals, 120).forEach((cc, n) => w(DIR, `synth-lemma-tag-${String(n).padStart(2, '0')}`, `${key} synthesizer: lemma x real tag (2-arg, re=false, re=true)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    chunks(res, 120).forEach((cc, n) => w(DIR, `synth-regex-${String(n).padStart(2, '0')}`, `${key} synthesizer: regex tags (re=true), result order`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    if (negs.length) chunks(negs, 120).forEach((cc, n) => w(DIR, `synth-neg-${String(n).padStart(2, '0')}`, `${key} synthesizer: :neg/:aff, joined tags, token-tag negation (HashSet order)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const edge = [];
    const eLem = ['', ' ', 'casa', 'Casa', 'CASA', 'ser', 'estar', 'yo', 'él', 'bueno', 'grande', 'nuevo', 'niño', 'señor', 'bla', 'bien', 'hermoso', 'año', 'madre', 'hablar', 'cantar', 'ellos', 'hacer clic', 'dar de alta', 'a', 'de', 'el', 'cero', 'uno', 'mil'];
    const eTag = ['NCFS000', 'NCMS000', 'NC.*', 'NCFP000', 'AQ0FS0', 'AQ.*', 'AQ0MP0', 'RG', 'VMIP3S0', 'VMIP1S0', 'VMIF3P0', 'VMN0000', 'VMP00SM', 'VMSP3S0', 'VMM02S0', 'VM.*', 'V.*', 'PP3MS000', 'DA0MS0', 'SPS00', 'CC', 'NP.*', 'Z', '_spell_number_', '', 'NOSUCHTAG', '.*', '(', '[', '*', '+'];
    for (const lem of eLem) for (const t of eTag) edge.push(syn(lem, t), syn(lem, t, true));
    chunks(edge, 150).forEach((cc, n) => w(DIR, `synth-edge-${String(n).padStart(2, '0')}`, `${key} synthesizer: edge lemmas x tags`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls = pick(tagsAll, 400).map((t) => syn(eLem[2], t, true));
    chunks(tagCalls, 150).forEach((cc, n) => w(DIR, `synth-tags-${String(n).padStart(2, '0')}`, `${key} synthesizer: es-ES_tags.txt tags as regex on a fixed lemma`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const tagCalls2 = pick(tagsAll, 300).flatMap((t) => [syn(eLem[3], t), syn(eLem[6], t, true)]);
    chunks(tagCalls2, 150).forEach((cc, n) => w(DIR, `synth-tags-lemmas-${String(n).padStart(2, '0')}`, `${key} synthesizer: tags x lemmas (2-arg and regex)`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: cc } }]));
    const nul = [{ m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3' }, { m: 'synthesize', tok: 'x', lemma: null, tag: 'subst:sg:nom:m3', re: true }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X' }, { m: 'synthesize', tokNull: true, lemma: 'a', tag: 'X', re: true }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null }, { m: 'synthesize', tok: 'a', lemma: 'a', tag: null, re: true }];
    for (const bad of ['(', '[', '*', '+', '\\', '{1}', '[z-a]', '(?i', ')']) nul.push(syn(eLem[2], bad, true));
    nul.push({ m: 'possibleTags' }, { m: 'posTagCorrection', tag: 'subst:sg:nom:m3' }, { m: 'posTagCorrection', tag: null }, { m: 'posTagCorrection', tag: 'a.b' }, { m: 'posTagCorrection', tag: 'adj:sg:nom.acc:m1.m2' }, { m: 'targetPosTag', tags: [], target: 'T' }, { m: 'targetPosTag', tags: ['A', 'B'], target: 'T' }, { m: 'spell', n: '12' }, { m: 'roman', n: '12' });
    w(DIR, 'synth-null-api', `${key} synthesizer: null args, bad regex, API methods`, 'jsonl', [{ op: 'synth', args: { lang: base, calls: nul } }]);
  }

  // ---- Language class hooks: priorities, filterRuleMatches (AI_ES_GGEC), typography, prepareLineForSpeller
  {
    const metaR = (await harnessLines([{ op: 'lang-lookup', args: { calls: c.codes.map((code) => ({ fn: 'shortCode', code, level: 1 })) } }]))[0];
    const pmKeys = metaR.ok ? metaR.result.map((r) => Object.keys(r.value?.priorityMap ?? {})) : c.codes.map(() => []);
    const PROBES = ['ES_SIMPLE_REPLACE_SIMPLE', 'ES_SIMPLE_REPLACE_SIMPLE_AQUI', 'ES_SIMPLE_REPLACE_SIMPLE_X', 'ES_COMPOUNDS', 'ES_COMPOUNDS_X', 'ES_COMPOUNDS_SUD_OESTE', 'CONFUSIONS2', 'RARE_WORDS', 'MISSPELLING', 'CONFUSIONS', 'INCORRECT_EXPRESSIONS', 'DIACRITICS', 'DIACRITICS_EXPERIMENTAL', 'AI_ES_HYDRA_LEO', 'AI_ES_HYDRA_LEO_X', 'AI_ES_HYDRA_LEO_MISSING_COMMA', 'AI_ES_GGEC', 'AI_ES_GGEC_X', 'AI_ES_GGEC_REPLACEMENT_OTHER', 'AI_ES_GGEC_REPLACEMENT_OTHER_X', 'AI_ES_GGEC_MISSING_PUNCTUATION', 'AI_ES_GGEC_REPLACEMENT_ORTHOGRAPHY', 'ES_MULTITOKEN_SPELLING', 'ES_MULTITOKEN_SPELLING_X', 'MORFOLOGIK_RULE_ES', 'morfologik_rule_es', 'MORFOLOGIK_RULE_ES_AR', 'TYPOGRAPHY', 'STYLE', 'REPETITIONS_STYLE', 'TOO_LONG_SENTENCE', 'TOO_LONG_PARAGRAPH', 'VOSEO', 'VOSEO_X', 'PODER_VOSEO', 'MEZCLA_TUTEO_VOSEO', 'ES_SIMPLE_REPLACE_VERBS', 'ES_SIMPLE_REPLACE_MULTIWORDS', 'ES_WIKIPEDIA_COMMON_ERRORS', 'ES_QUESTION_MARK', 'UPPERCASE_SENTENCE_START', 'SPANISH_WORD_REPEAT_RULE', 'SPANISH_WORD_REPEAT_BEGINNING_RULE', 'ES_REPEATEDWORDS', 'ES_UNPAIRED_BRACKETS', 'UNKNOWN_RULE_X', '', 'DE_TILDE', 'DE_TILDE2', 'SE_CREO', 'ETCETERA', 'PHRASE_REPETITION', 'AGREEMENT_DET_NOUN', 'AGREEMENT_DET_NOUN_EXCEPTIONS'];
    const CATS = ['TYPOGRAPHY', 'STYLE', 'CASING', 'MISSPELLING', 'DIACRITICS', 'CONFUSIONS2', 'GRAMMAR'];
    c.codes.forEach((code, ci) => {
      const ids = uniq([...pmKeys[ci], ...pmKeys[0], ...PROBES]);
      const shortlist = uniq([...PROBES.slice(0, 28), ...pmKeys[ci].slice(0, 8)]);
      const rules = [];
      for (const id of shortlist) for (const cat of [null, ...CATS.slice(0, 4)]) for (const [prio, it] of [[null, null], [7, 'Style'], [-9, 'Grammar'], [null, 'Style']]) rules.push({ ruleId: id, ...(cat ? { category: { id: cat } } : {}), ...(prio !== null ? { priority: prio } : {}), ...(it ? { issueType: it } : {}) });
      for (const id of shortlist.slice(0, 12)) rules.push({ ruleId: id, subId: '1' }, { ruleId: id, subId: '2', priority: 3, category: { id: 'STYLE' }, issueType: 'Style' });
      for (const cat of CATS) rules.push({ ruleId: 'UNKNOWN_RULE_X', category: { id: cat } }, { ruleId: 'UNKNOWN_RULE_X', category: { id: cat }, issueType: 'Style' });
      w(DIR, `lang-priority-${code}`, `${key} Language#getPriorityForId (${ids.length} ids), getRulePriority (${rules.length} synthetic rules), every real rule`, 'jsonl', [{ op: 'lang-priority', args: { lang: code, ids } }, { op: 'lang-priority', args: { lang: code, rules } }, { op: 'lang-priority', args: { lang: code, real: true } }]);
    });
    // filterRuleMatches for AI_ES_GGEC (remote AI rules are not reachable offline, so the hook is driven directly)
    const at = (text, sub, nth = 0) => { let i = -1; for (let k = 0; k <= nth; k++) i = text.indexOf(sub, i + 1); if (i < 0) throw new Error(`${sub} not in ${text}`); return [i, i + sub.length]; };
    const M = (text, sub, ruleId, o = {}) => { const [from, to] = at(text, sub, o.nth ?? 0); const { nth, ...rest } = o; return { ruleId, from, to, message: rest.message ?? `msg ${ruleId}`, ...rest }; };
    const GG = 'AI_ES_GGEC_';
    const cases = [];
    const CS = (name, fn, text, matches, en) => cases.push({ name, fn, text, matches, ...(en !== undefined ? { enabledRules: en } : {}) });
    const t0 = 'Esto es una prueba';
    CS('empty', 'filter', t0, []);
    CS('plain', 'filter', t0, [M(t0, 'es', 'FOO_RULE', { suggestions: ['fue'], shortMessage: 'corto' })]);
    CS('period-dropped', 'filter', t0, [M(t0, 'prueba', GG + 'MISSING_PUNCTUATION', { suggestions: ['prueba.'], errorStr: true })]);
    CS('period-dropped-sub', 'filter', t0, [M(t0, 'prueba', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['prueba.'] })]);
    CS('period-trailing-ws', 'filter', 'Esto es una prueba  \n', [M('Esto es una prueba  \n', 'prueba', GG + 'MISSING_PUNCTUATION', { suggestions: ['prueba.'] })]);
    CS('period-kept-other-end', 'filter', 'Esto es una prueba más', [M('Esto es una prueba más', 'prueba', GG + 'MISSING_PUNCTUATION', { suggestions: ['prueba.'] })]);
    CS('period-two-suggestions', 'filter', t0, [M(t0, 'prueba', GG + 'MISSING_PUNCTUATION', { suggestions: ['prueba.', 'prueba!'] })]);
    CS('period-non-ggec', 'filter', t0, [M(t0, 'prueba', 'MISSING_PUNCTUATION', { suggestions: ['prueba.'] })]);
    CS('period-no-sentence', 'filter', t0, [M(t0, 'prueba', GG + 'MISSING_PUNCTUATION', { suggestions: ['prueba.'], noSentence: true })]);
    for (const w1 of ['aquél', 'Aquél', 'AQUÉL', 'aquélla', 'aquéllas', 'aquéllos', 'ésa', 'ésas', 'ése', 'ésos', 'ésta', 'éstas', 'éste', 'éstos', 'sólo', 'Sólo', 'SÓLO', 'aquel', 'esa', 'solo', 'tú', 'él']) {
      const tx = 'Quiero aquel libro y esa mesa solo ahora';
      const sub = w1.toLowerCase().startsWith('s') || w1 === 'solo' ? 'solo' : w1.toLowerCase().startsWith('a') ? 'aquel' : 'esa';
      CS(`accent-${w1}`, 'filter', tx, [M(tx, sub, GG + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: [w1], errorStr: true })]);
    }
    for (const sug of ['Esto', 'esto', 'Esto es', 'ESTO']) CS(`sentence-start-${sug}`, 'filter', t0, [M(t0, 'es', GG + 'REPLACEMENT_OTHER', { suggestions: [sug], errorStr: true })]);
    for (const sug of ['Esto es una prueba', 'esto es una prueba', 'ESTO ES UNA PRUEBA']) CS(`case-only-${sug}`, 'filter', t0, [M(t0, 'Esto es una prueba', GG + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: [sug], errorStr: true })]);
    const tv = 'Vos tenes razon y vos queres comer';
    for (const sug of ['tenés', 'querés', 'sos', 'podés', 'hablás', 'comé', 'vení', 'tienes', 'quieres', 'tener', 'tenido', 'tenga']) CS(`voseo-${sug}`, 'filter', tv, [M(tv, 'tenes', GG + 'REPLACEMENT_VERB', { suggestions: [sug], errorStr: true })]);
    const tc = 'casa Casa CASA';
    for (const [sub, sug] of [['casa', 'Casa'], ['Casa', 'casa'], ['CASA', 'casa'], ['casa', 'casa'], ['Casa', 'CASA']]) CS(`case-${sub}-${sug}`, 'filter', tc, [M(tc, sub, GG + 'REPLACEMENT_ORTHOGRAPHY_LOWERCASE', { suggestions: [sug], errorStr: true })]);
    CS('mixed-passthrough', 'filter', t0, [M(t0, 'Esto', 'FOO', { suggestions: ['A'] }), M(t0, 'es', GG + 'X', { suggestions: ['fue'], errorStr: true }), M(t0, 'una', GG + 'X', { suggestions: ['unas', 'uno'] }), M(t0, 'prueba', 'BAR', { suggestions: [] })]);
    CS('merge-adjacent', 'filter', t0, [M(t0, 'Esto', GG + 'A', { suggestions: ['Eso'], issueType: 'Grammar' }), M(t0, 'es', GG + 'B', { suggestions: ['fue'], issueType: 'Grammar' })]);
    CS('unicode', 'filter', 'Él está allí 😀 sólo', [M('Él está allí 😀 sólo', 'sólo', GG + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['solo'], errorStr: true })]);
    CS('after-overlapping', 'afterOverlapping', t0, [M(t0, 'es', 'FOO', { suggestions: ['fue'] })]);
    c.codes.forEach((code) => w(DIR, `lang-filter-${code}`, `${key} Language#filterRuleMatches (AI_ES_GGEC hook) / filterRuleMatchesAfterOverlapping on harness RuleMatch objects (${cases.length} cases)`, 'jsonl', [{ op: 'lang-filter', args: { lang: code, cases } }]));
    // toAdvancedTypography
    const TY = ['"Hola"', 'Dijo "Hola" y se fue.', '"Hola', 'Hola"', '"', '""', '"a"', ' "a" ', '("a")', '("a", "b")', 'Texto: "cita", fin.', 'Texto "cita". Fin', 'x"y"z', 'a "b" c "d" e', '"cita con \'comillas\' internas"', "'Hola'", "'", "''", "'a'", "x 'a' y", "x 'ab' y", "('x')", "('ab')", "Dijo 'sí'!", "'Hola", "Hola'", "d'accord", "l'homme", "don't", "it's", "Harper's Dictionary", "D'Hondt", "Guns N' Roses", "rock 'n' roll", "en el '90", 'Hmm...', '...', '....', 'Espera... ¿qué?', '... y luego', 'a...b', '. . .', 'Fin..', '¿"Qué"?', '¡"Hola"!', '«Hola»', '“Hola”', '‘Hola’', '«"Hola"»', '"«Hola»"', 'Dijo: "Él dijo \'sí\' ayer".', 'p. ej. esto', 'etc.', 'EE. UU.', '<suggestion>foo</suggestion> bar', '<suggestion>"x"</suggestion> y', '<suggestion>a</suggestion> o <suggestion>b</suggestion>?', '<suggestion></suggestion>', '', ' ', 'a', '\\', '$1', 'a$b', '😀 "x" 😀', '"😀"', 'x'.repeat(300), '"'.repeat(7), "'".repeat(7), 'a "b\nc" d', 'Año "2020" y \'2021\'', 'Él dijo "sí", ella "no".', 'el "niño" ("pequeño")', '“Hola” y "adiós"', '"Hola" ‘x’ \'y\''];
    c.codes.forEach((code) => w(DIR, `lang-typo-${code}`, `${key} Language#toAdvancedTypography over ${TY.length} strings`, 'jsonl', [{ op: 'lang-typo', args: { lang: code, strings: TY } }]));
    // prepareLineForSpeller (spelling.txt / multiwords.txt style lines)
    const splAll = lines(path.join(RES, 'hunspell/spelling.txt'));
    const mwAll = lines(path.join(RES, 'multiwords.txt'));
    const pl = uniq(['', 'foo', 'Foo\tNPCN000', 'foo;N', 'foo # c', '#', '#foo', 'foo\t_Latin_', 'foo\tLOC_ADV', 'foo\tVMIP3S0', 'Foo\tNC', ';', '\t', 'a;b;c', 'foo;LOC_ADV # x', ' foo ', ' foo \tN', 'foo;', 'foo\t', 'foo bar\tNPCN000', 'foo bar\tAQ0CS0', 'foo bar;_Latin_', 'Ñandú\tNCMS000', 'N', '_Latin_', 'LOC_ADV', 'x\tN\ty', 'x;N;y', 'x#y#z', 'x\tN # y # z', ...splAll.slice(0, 120), ...pick(splAll, 120), ...mwAll.slice(0, 150), ...pick(mwAll, 250)]);
    chunks(pl, 300).forEach((cc, n) => w(DIR, `prepare-line-${n}`, `${key} Spanish#prepareLineForSpeller (ES-0016) for es and es-AR`, 'jsonl', c.codes.map((code) => ({ op: 'enspell-misc', args: { kind: 'prepare', lang: code, lines: cc } }))));
  }

  // ---- Java rules (targeted)
  const only = (ids, extra = {}) => ({ enabledRules: ids, enabledOnly: true, ...extra });
  const ruleStrings = (rel) => (existsSync(path.join(TJ, 'org/languagetool/rules/es', rel)) ? allJavaStrings1(path.join(TJ, 'org/languagetool/rules/es', rel)) : []);
  const sentOnly = (arr) => arr.filter((s) => s.length < 1500 && /\p{L}/u.test(s) && !/^(org|java)\./.test(s));
  // JUnit strings of each Java rule test through its rule (enabled only, PICKY) and through all default rules
  const RT = { 'CompoundRuleTest': ['ES_COMPOUNDS'], 'SimpleReplaceRuleTest': ['ES_SIMPLE_REPLACE_SIMPLE'], 'SimpleReplaceVerbsRuleTest': ['ES_SIMPLE_REPLACE_VERBS'], 'SpanishWikipediaRuleTest': ['ES_WIKIPEDIA_COMMON_ERRORS'], 'QuestionMarkRuleTest': ['ES_QUESTION_MARK'], 'SpanishRepeatedWordsRuleTest': ['ES_REPEATEDWORDS'], 'SpanishUnpairedBracketsRuleTest': ['ES_UNPAIRED_BRACKETS'], 'SpanishWordRepeatBeginningRuleTest': ['SPANISH_WORD_REPEAT_BEGINNING_RULE'], 'SpanishWordRepeatRuleTest': ['SPANISH_WORD_REPEAT_RULE'], 'SpanishWrongWordInContextRuleTest': ['SPANISH_WRONG_WORD_IN_CONTEXT'], 'MorfologikSpanishSpellerRuleTest': ['MORFOLOGIK_RULE_ES'] };
  for (const [tn, ids] of Object.entries(RT)) {
    const ss = sentOnly(ruleStrings(`${tn}.java`)).concat(sentOnly(testStrings).length ? [] : []);
    const all = uniq([...ss, ...ss.map((x) => x + '\n'), ...ss.map((x) => `${x} ${x}`)]);
    stats[`junit-${tn}`] = ss.length;
    w(DIR, `rule-junit-${tn}`, `${key} strings of ${tn} through ${ids.join(',')} (enabled only, PICKY / DEFAULT) and all default rules`, 'check', all.flatMap((t) => [chk(base, t, only(ids, { level: 'PICKY' })), chk(base, t, only(ids)), chk(base, t, { level: 'PICKY' })]));
  }
  // WordRepeat (SPANISH_WORD_REPEAT_RULE) and the core WORD_REPEAT_RULE
  const wr = c.wordRepeat;
  const WRC = (t) => [chk(base, `${title(t)}.`, only(['SPANISH_WORD_REPEAT_RULE'])), chk(base, `Él dijo que ${t} y se fue.`, only(['SPANISH_WORD_REPEAT_RULE'])), chk(base, `Él dijo que ${t} y se fue.`), chk(base, `Primero. ${title(t)}`, only(['SPANISH_WORD_REPEAT_RULE'], { level: 'PICKY' })), chk(base, `${t}\n${t}`, only(['SPANISH_WORD_REPEAT_RULE'])), chk(base, `${t}`, only(['SPANISH_WORD_REPEAT_RULE', 'WORD_REPEAT_RULE']))];
  w(DIR, 'rule-SpanishWordRepeatRule', 'es SPANISH_WORD_REPEAT_RULE (_allow_repeat tag exceptions), contexts and case', 'check', wr.flatMap(WRC));
  w(DIR, 'rule-SpanishWordRepeatRule-edge', 'es SPANISH_WORD_REPEAT_RULE edge texts', 'check', ['que que', 'El el', 'la la', 'Que que', 'Lo que que dijo', 'Dijo que que sí.', 'Dijo que, que sí.', 'Dale dale dale', 'ja ja ja ja', 'Ha ha ha', 'mil mil', '1 1', '2 2 2', '- -', '— —', '. .', ', ,', 'No no no no.', 'Sí, sí, sí.', 'ay ay ay', 'oh oh', 'vamos vamos', 'a a a', 'en en el centro', 'de de de', 'x x', 'A A', 'ñ ñ', 'Ñandú ñandú', 'ÁRBOL árbol', 'árbol árbol', 'casa  casa', 'casa\tcasa', 'casa\ncasa', 'Casa. Casa.', 'casa, casa', 'casa casa casa casa', 'tan tan', 'bla bla', 'cha cha', 'chu chu', 'pum pum', 'bien bien', 'mal mal', 'muy muy bien', 'el el el', 'que que que', 'cada cada día', 'poco a poco poco', 'Nueva Nueva York', 'Buenos Buenos Aires', 'Hola hola', 'HOLA hola', 'hola HOLA', 'Mira, mira', 'ni ni', 'o o', 'y y', 'u u', 'e e', 'se se', 'me me', 'te te', 'le le', 'lo lo', 'les les', 'nos nos', 'os os', 'su su', 'mi mi', 'tu tu', 'un un', 'una una', 'unos unos', 'del del', 'al al', 'por por', 'para para', 'con con', 'sin sin', 'sobre sobre', 'tras tras', 'entre entre', 'hasta hasta'].map((t) => chk(base, t, only(['SPANISH_WORD_REPEAT_RULE', 'WORD_REPEAT_RULE']))));
  // SpanishWordRepeatBeginningRule (picky)
  const WB = ['Esto está bien. Esto es mejor, también.', 'El coche. El profesor. El tercer elemento.', 'Mañana me voy. Mañana vuelvo. Mañana se acabó todo.', 'Yo creo. Yo he visto esto antes. Yo no lo creo.', 'También, juego a fútbol. También, juego a baloncesto.', 'Sin embargo, me gusta. Sin embargo, otros me gustan más.', 'Pero me gusta. Pero otros me gustan más.', 'Además, voy. Además, vengo. Además, me quedo.', 'Asimismo, bien. Asimismo, mal.', 'Por otro lado, sí. Por otro lado, no.', 'Tú vienes. Tú te vas. Tú no dices nada.', 'Él viene. Él se va. Él no dice nada.', 'Ella viene. Ella se va.', 'Nosotros vamos. Nosotros volvemos. Nosotros comemos.', 'Ellos vienen. Ellos se van. Ellos comen.', 'Usted viene. Usted se va.', 'Vosotros venís. Vosotros os vais.', 'Vos venís. Vos te vas. Vos comés.', 'La casa es grande. La casa es bonita. La casa es cara.', 'Los niños juegan. Los niños ríen.', 'Punto 1. Punto 2. Punto 3.', 'Artículo 1. Artículo 2. Artículo 3.', 'Unidad 1. Unidad 2.', 'Tema 1. Tema 2. Tema 3.', '1 casa. 1 coche. 1 perro.', '2020 fue bueno. 2020 fue malo. 2020 acabó.', 'Primero, esto. Primero, aquello. Primero, todo.', 'Entonces, sí. Entonces, no. Entonces, quizá.', 'Finalmente, sí. Finalmente, no.', 'Aun así, voy. Aun así, vengo.', 'Por eso, voy. Por eso, vengo. Por eso, me quedo.', 'No obstante, voy. No obstante, vengo.', 'Así que voy. Así que vengo. Así que me quedo.', 'Por cierto, voy. Por cierto, vengo.', 'Ya voy. Ya vengo. Ya me quedo.', 'Sí. Sí. Sí.', 'No. No. No.', 'Hola. Hola. Hola.', '¿Qué? ¿Qué? ¿Qué?', 'Quizá voy. Quizá vengo. Quizá me quedo.', 'Tal vez voy. Tal vez vengo.', 'Luego voy. Luego vengo. Luego me quedo.', 'Después voy. Después vengo. Después me quedo.', 'Antes voy. Antes vengo.', 'Ahora voy. Ahora vengo. Ahora me quedo.', 'Hoy voy. Hoy vengo. Hoy me quedo.', 'Ayer fui. Ayer vine. Ayer me quedé.', 'Siempre voy. Siempre vengo. Siempre me quedo.', 'Nunca voy. Nunca vengo. Nunca me quedo.', 'A veces voy. A veces vengo.', 'Quiero comer. Quiero beber. Quiero dormir.', 'Voy a casa. Voy a clase. Voy a trabajar.', 'Esta casa es grande. Esta casa es bonita. Esta casa es cara.', 'Mi casa es grande. Mi casa es bonita. Mi casa es cara.', 'En casa hay pan. En casa hay vino. En casa hay agua.', 'Se dice así. Se dice asá. Se dice asó.', 'Lo que dijo fue cierto. Lo que hizo fue cierto. Lo que quiso fue cierto.', 'Por un lado, confirmó que la palabra solo no debe llevar tilde, según las reglas generales de acentuación, ni cuando es adverbio, ni cuando es adjetivo. Por otro lado, y este es el tema que hoy nos interesa, confirmó que los demostrativos este, ese o aquel, y sus formas femeninas y plurales, no llevarán tampoco tilde funcionando tanto como pronombres como determinantes.', 'Mañana me voy.\nMañana vuelvo.\nMañana se acabó todo.', 'Mañana me voy.\n\nMañana vuelvo.\n\nMañana se acabó todo.', 'mañana me voy. mañana vuelvo. mañana se acabó todo.', 'MAÑANA me voy. Mañana vuelvo. mañana se acabó.', 'Mañana. Mañana. Mañana. Mañana. Mañana.', '', '.', 'Hola.', 'A. A. A.'];
  w(DIR, 'rule-SpanishWordRepeatBeginningRule', 'es SPANISH_WORD_REPEAT_BEGINNING_RULE (picky, temp_off; exceptions, adverbs, pronoun suggestions)', 'check', WB.flatMap((t) => [chk(base, t, only(['SPANISH_WORD_REPEAT_BEGINNING_RULE'], { level: 'PICKY' })), chk(base, t, only(['SPANISH_WORD_REPEAT_BEGINNING_RULE'])), chk(base, t, { level: 'PICKY', enableTempOff: true }), chk(base, t, only(['SPANISH_WORD_REPEAT_BEGINNING_RULE', 'ES_REPEATEDWORDS'], { level: 'PICKY', mode: 'TEXTLEVEL_ONLY' }))]));
  // QuestionMarkRule
  const QM = ['Hola, ¿cómo estás?', 'Hola, cómo estás?', '¿Que pasa?', 'Que pasa?', 'Que pasa?\n', 'Que pasa?\n\n', '¿Que pasa?\n\n', '¡¿Nunca tienes clases o qué?!', '¡Usted tiene un gusto caro! -exclamó la dependienta- ¿Está seguro?', '¿Quién sabe hablar francés mejor: Tom o Mary?', 'Esto es una prueba. Que pasa?\n\n', 'Hola, de qué me hablas?', 'Después de todo lo que pasó, qué quieres que te diga?', 'Pero cómo quieres que te lo diga?', 'Pero, cómo quieres que te lo diga?', 'Puedes imaginarte por qué no vino con nosotros?', 'Hola, Marco: Puedes darme tu dirección de correo?', 'Están aquí: https://gtlb.com/smll-cued-datasets/hu[…]nitized/-/tree/main/beling?ref_type=heads', 'Hola!', 'Hola, ¡qué tal!', 'Hola, qué tal!', 'Hola! Qué tal?', '¡Hola! ¿Qué tal?', 'Qué bien!', 'No, sí?', 'Y tú, no vienes?', 'Y si no, qué?', 'Vienes o no vienes?', 'Sí o no?', 'Eh?', 'Qué?', '?', '!', '??', '!!', '¿?', '¡!', 'a?', 'a!', '"Qué pasa?"', '«Qué pasa?»', '(Qué pasa?)', '¿(Qué pasa)?', 'Dijo: qué pasa?', 'Dijo: ¿qué pasa?', 'Mira: cómo vienes?', 'Mira, cómo vienes y por qué?', 'Primero pregunta: qué quieres? Luego responde.', '¿Qué quieres? Luego responde, vienes?', 'Qué quieres? Vienes? Sí?', '¿Qué quieres? ¿Vienes? ¿Sí?', 'Cómo te llamas?\nDónde vives?', 'Cómo te llamas?\n\nDónde vives?', '¿Cómo te llamas?\nDónde vives?', 'Hola, y cómo estás?', 'Hola, o cómo estás?', 'Hola, pero cómo estás?', 'Hola, para qué quieres eso?', 'Hola, con quién vienes?', 'Hola, no sé, cómo estás?', 'Hola, eh, cómo estás?', 'Hola, sí cómo estás?', 'Es verdad, no?', 'Es verdad, sí?', 'Es verdad, eh?', 'Bien, pero no sé qué decir!', 'Lo hizo! Cómo?', 'Dime: ¿quién es?', 'Dime quién es?', 'Dime, quién es? Y tú?', '1. Quién es?', 'a) Quién es?', 'http://x.es/a?b=c', 'Visita http://x.es/a?b=c y dime qué opinas?', 'Visita www.x.es/a?b y dime qué opinas', 'foo?bar', 'foo? bar', 'foo ?bar', '¿Cómo estás? Bien!', 'Cómo estás... bien?', 'Cómo estás…?', '¿Cómo estás…?', 'Qué?!', '¿Qué?!', 'Qué?¡', '¡¿Qué?!', '¿¡Qué!?', '¡¡Hola!!', '¿¿Qué??', 'Qué??', 'Hola, ¿qué tal? Muy bien, gracias. Y tú?', 'Hola, qué tal? Muy bien, gracias. Y tú?'];
  w(DIR, 'rule-QuestionMarkRule', 'es ES_QUESTION_MARK texts (JUnit, tokens after comma, quotes, URLs, paragraphs)', 'check', QM.flatMap((t) => [chk(base, t, only(['ES_QUESTION_MARK'])), chk(base, t), chk(base, t, only(['ES_QUESTION_MARK'], { mode: 'TEXTLEVEL_ONLY' }))]));
  // UnpairedBracketsRule
  const brk = ['Soy un hombre (muy honrado).', "D'Hondt.", 'Guns N’ Roses', "Guns N' Roses", 'D’Hondt.', 'L’Équipe', 'rock ’n’ roll', "Harper's Dictionary of Classical Antiquities", 'Harper’s Dictionary of Classical Antiquities', 'Soy un hombre muy honrado).', 'Soy un hombre (muy honrado.', 'Eso es “importante y qué pasa. ', 'Eso es "importante y qué. ', 'Eso es (imposible. ', 'Eso es (imposible.\n\n', 'Eso es) imposible. ', 'Eso es imposible).\t\n ', 'Eso es «importante, ¿ah que sí?', '\n\na) New York\nb) Boston\n', '\n\n1.) New York\n2.) Boston\n', '\n\nXII.) New York\nXIII.) Boston\n', '\n\nA) New York\nB) Boston\nC) Foo\n', '«Hola', 'Hola»', '«Hola» y «adiós', '«Dijo “hola” y se fue»', '«Dijo “hola y se fue»', '«Dijo hola” y se fue»', '“Hola', 'Hola”', '‘Hola', 'Hola’', '(a', 'a)', '[a', 'a]', '{a', 'a}', '(a]', '[a)', '((a)', '(a))', '[(a])', '"a" "b', '"a" b"', 'Mide 5º) y 3° (más', "El '90 fue bueno", "Los 'niños' juegan", "Los 'niños juegan", "Los niños' juegan", 'Los niños’ juegan', 'a’s b’s', "a's b's", "Vos sos' bueno", "Vos' sos bueno", "'Hola'", "'Hola", "Hola'", "O'Neil's", 'rock ‘n’ roll', "rock 'n' roll", "N' Roses", 'Nueva York’s', '1) uno 2) dos', 'a) uno b) dos', 'I) uno II) dos', 'ab) uno', 'Aquí 1) y allí', '12) doce', '(1) uno', '(a) uno', '[1] uno', 'x)', 'x))', '(x', '((x', '"', '«', '»', '¿Qué (pasa?', '¿Qué pasa)?', '(¿Qué pasa?)', '¡Hola (amigo!', 'Fin (1.\n\nInicio 2).', 'Cita: «uno. Dos». Tres. «Cuatro', 'Ley 5/2020 (art. 3', 'Ley 5/2020 art. 3)', '(Primera línea\nsegunda línea)', 'Foo 5° (bar)', 'Foo 5º) bar', 'Foo 25 º) bar', 'Foo 5ª) bar', ':)', ':(', ';)', ':-)', '=)', 'Hola :)', 'Hola :( adiós', '(:', '):', '8)', '8-)', 'Mi nota: 10)', '<(*)>', '(((((', ')))))', '[[[[[', ']]]]]'];
  w(DIR, 'rule-SpanishUnpairedBracketsRule', 'es ES_UNPAIRED_BRACKETS texts (JUnit, apostrophe exceptions, enumerations, degrees)', 'check', brk.flatMap((t) => [chk(base, t, only(['ES_UNPAIRED_BRACKETS'])), chk(base, t)]));
  w(DIR, 'rule-core-es', 'es core rules: UPPERCASE_SENTENCE_START, WHITESPACE_RULE, SENTENCE_WHITESPACE, COMMA_PARENTHESIS_WHITESPACE, DOUBLE_PUNCTUATION', 'check',
    ['Venta al público. ha subido mucho.', 'Esta frase. otra frase.', 'Av. de América. número 5.', 'El sr. Pérez vino.', 'etc. y así. y más.', '«Cita». luego', '"Cita" y luego', '1. punto\n2. punto', 'a) primero\nb) segundo', 'Frase.Otra frase.', 'Frase. Otra  frase.', 'Frase.  Otra frase.', 'Frase .Otra.', 'Frase ,otra ( ok ).', 'Frase  con  dobles  espacios.', ' Frase con espacio al inicio.', 'Frase con tab\ty más.', 'Frase con espacio duro.', 'En su opinión , no era verdad.', 'En su opinión, no era verdad.', 'Él él viene viene.', 'ñu. Ñu. ñandú', 'ÁRBOL. árbol.', 'www.ejemplo.es existe. http://x.es también.', 'a@b.es escribe. c@d.es también.', 'Es el 3 de mayo. el 4 de mayo.', '«Frase. » luego.', 'Frase… luego', 'Frase... luego', 'Frase!!! Luego', 'Frase?! Luego', 'Frase.. luego', '¿Qué? ¡Nada!', 'Hola,, adiós.', '¿Qué?? ¡¡Nada!!', 'Ya?. Sí.', 'Hola;; chao', 'Hola:: chao', 'A. B. C.', '¿Y tú? y yo?', 'Dijo: ¡hola! y se fue.'].flatMap((t) => [chk(base, t, only(['UPPERCASE_SENTENCE_START', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE', 'COMMA_PARENTHESIS_WHITESPACE', 'DOUBLE_PUNCTUATION', 'SPANISH_WORD_REPEAT_RULE'])), chk(base, t, { level: 'PICKY' })]));
  // CompoundRule (ES_COMPOUNDS)
  const stripOpt = (e) => e.replace(/[*+]$/, '');
  const comp = lines(path.join(RES, 'compounds.txt'));
  stats.compounds = comp.length;
  const samp = comp.length > 230 ? pick(comp, 230) : comp;
  const ccases = [];
  for (const e of samp) {
    const s = stripOpt(e);
    ccases.push(`Esto es ${s}.`, `Esto es ${s.replace(/-/g, ' ')}.`, `Esto es ${title(s.replace(/-/g, ' '))}.`, `Esto es ${s.replace(/-/g, '')}.`, `${title(s.replace(/-/g, ' '))} aquí.`, `Esto es ${s.replace(/-/g, ' — ')}.`, `Esto es ${s.replace(/-/g, '–')}.`, `Esto es ${s.replace(/-/g, ' - ')}.`, `${s.toUpperCase()}`, `Esto es ${s.replace(/-/g, '‐')}.`);
  }
  chunks(ccases, 250).forEach((cc, n) => w(DIR, `rule-compounds-${String(n).padStart(2, '0')}`, 'es ES_COMPOUNDS: compounds.txt entries hyphenated, spaced, joined, dashed, capitalised (+ joined only, * hyphen only)', 'check', cc.flatMap((text) => [chk(base, text, only(['ES_COMPOUNDS'], { level: 'PICKY' })), chk(base, text, { level: 'PICKY' })])));
  w(DIR, 'rule-compounds-edge', 'es ES_COMPOUNDS edge texts', 'check', ['sud oeste', 'sud-oeste', 'sudoeste', 'Sud oeste', 'SUD OESTE', 'sud  oeste', 'sud\noeste', 'sud — oeste', 'sud–oeste', 'sud-sudoeste', 'sud sudoeste', 'sudsudoeste', 'sur sudeste', 'sur-sudeste', 'sursudeste', 'ex presidente', 'ex-presidente', 'expresidente', 'anti OTAN', 'hispano americano', 'hispanoamericano', 'hispano-americano', '-', '--', ' - ', 'a - b', 'a-b', 'tiene un paraguas sombrilla', 'sud oeste sud oeste', '1 - 2', 'años 90 - 2000'].map((text) => chk(base, text, only(['ES_COMPOUNDS'], { level: 'PICKY' }))));
  // SimpleReplaceRule (ES_SIMPLE_REPLACE_SIMPLE), wikipedia, verbs
  const repAll = lines(path.join(R, 'rules/es/replace.txt')).concat(lines(path.join(R, 'rules/es/replace_custom.txt')));
  const rep = repAll.map((l) => l.split('=')).filter((p) => p.length >= 2).map((p) => [p[0].split('|')[0], p[1].split('|')[0], p[0].split('|')]);
  stats.replaceEntries = rep.length;
  const rcases = rep.flatMap(([a]) => [`Esto es ${a}.`, `${title(a)} aquí.`, `Esto es ${a.toUpperCase()}.`, `Aquí ${a}, allí ${a}.`, `${a}`, `No ${a}, sino ${title(a)}.`]);
  chunks(rcases, 250).forEach((cc, n) => w(DIR, `rule-replace-${String(n).padStart(2, '0')}`, 'es ES_SIMPLE_REPLACE_SIMPLE: replace.txt entries in contexts, case variants', 'check', cc.flatMap((text) => [chk(base, text, only(['ES_SIMPLE_REPLACE_SIMPLE'])), chk(base, text)])));
  const rcases2 = rep.flatMap(([, b]) => [`Esto es ${b}.`, `${title(b)} aquí.`]);
  chunks(rcases2, 250).forEach((cc, n) => w(DIR, `rule-replace-right-${String(n).padStart(2, '0')}`, 'es ES_SIMPLE_REPLACE_SIMPLE: the replacement (correct) forms must not match', 'check', cc.map((text) => chk(base, text, only(['ES_SIMPLE_REPLACE_SIMPLE'])))));
  w(DIR, 'rule-replace-edge', 'es ES_SIMPLE_REPLACE_SIMPLE edge texts (JUnit strings, demo word aqui, tagged words ignored)', 'check', ['aqui', 'Aqui', 'AQUI', 'aquí', 'Aqui aqui', 'aqui, aqui.', 'Escribe aqui.', 'el aqui', 'aqui\naqui', '(aqui)', '«aqui»', '"aqui"', 'aqui-aqui', 'aqui_aqui', 'aquii', 'aaqui', 'gestionamiento', 'Gestionamiento', 'gestionamientos', 'satisfaceré', 'satisfacere', 'Satisfacere', 'SATISFACERE', 'satisfacerá y satisfacera'].map((text) => chk(base, text, only(['ES_SIMPLE_REPLACE_SIMPLE']))));
  const wik = lines(path.join(R, 'rules/es/wikipedia.txt')).map((l) => l.split('=')).filter((p) => p.length >= 2).map((p) => [p[0].split('|')[0], p[1].split('|')[0]]);
  stats.wikipediaEntries = wik.length;
  const wcases = wik.flatMap(([a]) => [`Esto es ${a}.`, `${title(a)} aquí.`, `Esto es ${a.toUpperCase()}.`, `${a}`]);
  chunks(wcases, 250).forEach((cc, n) => w(DIR, `rule-wikipedia-${String(n).padStart(2, '0')}`, 'es ES_WIKIPEDIA_COMMON_ERRORS (default off, enabled): wikipedia.txt entries in contexts, case variants', 'check', cc.flatMap((text) => [chk(base, text, only(['ES_WIKIPEDIA_COMMON_ERRORS'])), chk(base, text)])));
  w(DIR, 'rule-wikipedia-edge', 'es ES_WIKIPEDIA_COMMON_ERRORS edge texts', 'check', ['a basto', 'A basto', 'A BASTO', 'a  basto', 'a\nbasto', 'abasto', 'a basto a basto', 'absorver', 'Absorver', 'absorviendo', 'aca', 'Aca', 'acá', 'academica', 'academicamente'].map((text) => chk(base, text, only(['ES_WIKIPEDIA_COMMON_ERRORS']))));
  // SimpleReplaceVerbsRule: infinitives and conjugated/clitic forms
  const verbKeys = lines(path.join(R, 'rules/es/replace_verbs.txt')).map((l) => l.split('=')[0].split('|')).flat();
  const AR = ['ar', 'o', 'as', 'a', 'amos', 'áis', 'an', 'é', 'aste', 'ó', 'asteis', 'aron', 'aba', 'abas', 'ábamos', 'abais', 'aban', 'ando', 'ado', 'ada', 'ados', 'adas', 'aré', 'arás', 'ará', 'aremos', 'aréis', 'arán', 'aría', 'arías', 'aríamos', 'arían', 'e', 'es', 'emos', 'éis', 'en', 'ase', 'ara', 'are', 'ad', 'arlo', 'ándolo', 'arse', 'ándose', 'arla', 'ándome', 'ate', 'amelo'];
  const vforms = [];
  for (const v of verbKeys) {
    const stem = v.replace(/ar$/, '');
    for (const e of AR) vforms.push(stem + e);
    vforms.push(v.toUpperCase(), title(v));
  }
  vforms.push('clickeaban', 'Clickeaban', 'hacer clic', 'clicar', 'clicaban', 'loguear', 'logeando', 'logeé', 'loggeamos', 'colorizado', 'colorizaron', 'sobrerepresentados', 'depauperizar', 'fructiferó', 'traspolé', 'eruptan', 'distensionó', 'transgiversaron');
  const vTexts = uniq(vforms).flatMap((f) => [f, `Ellos ${f} ayer.`]);
  chunks(vTexts, 300).forEach((cc, n) => w(DIR, `rule-replace-verbs-${String(n).padStart(2, '0')}`, 'es ES_SIMPLE_REPLACE_VERBS: replace_verbs.txt infinitives x conjugation endings (untagged forms, lazy tagger/synth path)', 'check', cc.flatMap((text) => [chk(base, text, only(['ES_SIMPLE_REPLACE_VERBS'])), chk(base, text)])));
  // SpanishRepeatedWordsRule (ES_REPEATEDWORDS, picky; synonyms.txt)
  const RWG = [['sugiere', 'sugerimos', 'sugerido', 'sugerir', 'sugerencia', 'sugiero', 'sugirió'], ['propone', 'propusimos', 'propuesto', 'propuesta', 'proponer', 'propongo', 'propuse', 'propones'], ['usual', 'habitual', 'común', 'comunes', 'acostumbrada', 'habituales', 'acostumbrado', 'usuales'], ['revisión', 'comprobación', 'verificación', 'corrección', 'revisiones', 'correcciones'], ['magnífico', 'fantástico', 'maravilloso', 'excelente', 'notable', 'insuperable', 'magnífica', 'excelentes'], ['significativo', 'relevante', 'crucial', 'fundamental', 'valioso', 'considerable', 'significativa', 'relevantes'], ['inicia', 'iniciar', 'iniciamos', 'iniciado', 'inició', 'inicio', 'comienza', 'empieza'], ['utilización', 'utilizaciones', 'uso', 'empleo']];
  const rwTexts = [];
  for (const g of RWG) for (let i = 0; i < g.length; i++) for (let j = i; j < g.length; j++) {
    rwTexts.push(`Es ${g[i]} aquí. Es ${g[j]} allí.`, `Es ${g[i]} y ${g[j]}.`, `${title(g[i])} esto. ${title(g[j])} aquello.`, `El perro es ${g[i]}.\n\nLa casa es ${g[j]}.`);
  }
  rwTexts.push('Emplearon la fuerza. Pero los empleados se resistieron.', 'Antes dije esto. Antes de venir.', 'Propuse aquello. Pero la propuesta no fue acceptada.', 'Creó cosas interesantes. Pero creo que no eran útiles.', 'Yo propuse aquello. Pero también propuse esto otro.', 'Yo propuse aquello. Pero propuse también esto otro.', 'Yo propuse aquello. Pero la sugerencia propuesta por el presidente no fue acceptada.', 'Propuse aquello. Pero la sugerencia propuesta por el presidente no fue acceptada.', 'Fue excelente. Fue un resultado excelente.', 'Esto propuse. ¿Propones tu algo diferente?', 'Inicia el debate. Inicia la conversación.', 'Tema 1: algo. Tema 2: otra cosa.', 'Tema III es largo. Tema IV es corto.', 'Así que sí. Así que no.', 'También lo hizo. Lo hizo también.', 'Antes de venir. Antes del almuerzo.', 'Después de comer, propuse. Después de beber, propuse.');
  chunks(uniq(rwTexts), 200).forEach((cc, n) => w(DIR, `rule-SpanishRepeatedWordsRule-${String(n).padStart(2, '0')}`, 'es ES_REPEATEDWORDS (picky; synonyms.txt groups, lemma/POS entries, anti-patterns)', 'check', cc.flatMap((t) => [chk(base, t, only(['ES_REPEATEDWORDS'], { level: 'PICKY' })), chk(base, t, only(['ES_REPEATEDWORDS'])), chk(base, t, { level: 'PICKY', enableTempOff: true })])));
  w(DIR, 'rule-style-es', 'es ES_REPEATEDWORDS / SPANISH_WORD_REPEAT_BEGINNING_RULE / REPETITIONS_STYLE rules via style-check', 'jsonl', [{ op: 'style-check', args: { lang: 'es', ids: ['ES_REPEATEDWORDS'], cases: uniq(rwTexts).slice(0, 80).map((t) => ({ text: t, level: 'PICKY' })) } }, { op: 'style-check', args: { lang: 'es', ids: ['SPANISH_WORD_REPEAT_BEGINNING_RULE'], cases: WB.slice(0, 60).map((t) => ({ text: t, level: 'PICKY' })) } }, { op: 'style-check', args: { lang: 'es', ids: ['ES_REPEATEDWORDS', 'SPANISH_WORD_REPEAT_BEGINNING_RULE'], cases: pick(exTexts, 20).map((t) => ({ text: t, level: 'PICKY' })) } }]);
  // SpanishWrongWordInContextRule
  const wwc = [];
  for (const wd of ['infligió', 'infringió', 'infligir', 'infringir', 'infligían', 'infringen', 'Infligía', 'Infringía', 'inflinges', 'infrinjo', 'infligido', 'infringido']) for (const ctx of ['un duro castigo', 'todas las normas', 'una multa', 'el decreto', 'una herida', 'la ley', 'mucho daño', 'nada', 'la regla', 'una norma', 'una derrota', 'las leyes']) wwc.push(`Le ${wd} ${ctx}`, `Él ${wd} ${ctx}.`, `${ctx} ${wd}.`);
  for (const wd of ['baca', 'vaca', 'bacas', 'vacas', 'Baca', 'Vaca', 'BACA', 'baca vaca']) for (const ctx of ['equipaje', 'leche', 'la maleta', 'el vehículo', 'el coche', 'dispositivo', 'animal', 'la oveja', 'el caballo', 'el campo', 'nada', 'el paquete', 'el chófer', 'el automóvil', 'el portaequipaje']) wwc.push(`La ${wd} da ${ctx}.`, `Pon ${ctx} en la ${wd}.`, `${title(wd)} y ${ctx}`);
  w(DIR, 'rule-SpanishWrongWordInContextRule', 'es SPANISH_WRONG_WORD_IN_CONTEXT: infligir/infringir and baca/vaca with context words', 'check', wwc.flatMap((t) => [chk(base, t, only(['SPANISH_WRONG_WORD_IN_CONTEXT'])), chk(base, t)]));
  // ---- speller specifics: sr-word (lists, suggestions), multitoken speller, voseo variant, rule-level suggestions
  {
    const SP_ID = 'MORFOLOGIK_RULE_ES';
    const swords = uniq([...spl.slice(0, 150), ...pick(spl, 150), ...ign, ...proh, ...c.spellWords, ...pick(words, 200), ...pick(junitWords, 60)]);
    const swAll = uniq(swords.flatMap((wd, i) => [wd, title(wd), wd.toUpperCase(), typo(wd, i)]));
    chunks(swAll, 80).forEach((cc, n) => w(DIR, `speller-word-${String(n).padStart(2, '0')}`, `${key} sr-word MORFOLOGIK_RULE_ES: ignore/prohibit/spelling lists, isMisspelled and suggestions (case and typo variants)`, 'jsonl', c.codes.slice(0, 1).map((code) => ({ op: 'sr-word', args: { lang: code, id: SP_ID, words: cc, sugg: true } }))));
    w(DIR, 'speller-word-variant', `${key} sr-word MORFOLOGIK_RULE_ES under the voseo variant`, 'jsonl', [{ op: 'sr-word', args: { lang: c.codes[1], id: SP_ID, words: swAll.slice(0, 80), sugg: true } }]);
    w(DIR, 'speller-word-expand', `${key} sr-word MORFOLOGIK_RULE_ES with user ignore tokens and accept phrases`, 'jsonl', [
      { op: 'sr-word', args: { lang: base, id: SP_ID, ignoreTokens: ['Zzyxx', 'ñoñería'], acceptPhrases: ['Nueva Yorkk', 'foo bar'], words: ['Zzyxx', 'zzyxx', 'ñoñería', 'Nueva', 'Yorkk', 'foo', 'bar', 'casa', 'csa'], sugg: true } },
      { op: 'sr-word', args: { lang: base, id: SP_ID, considerIgnore: false, words: ign.slice(0, 20), sugg: true } }]);
    w(DIR, 'speller-check-opts', `${key} sr-check MORFOLOGIK_RULE_ES with userWords, ignoreTokens, acceptPhrases, considerIgnore=false, levels and modes`, 'jsonl', [
      { op: 'sr-check', args: { lang: base, ids: [SP_ID], userWords: ['Mydictwort', 'Zzyxx', 'casaa'], cases: [{ text: 'El Mydictwort y el Zzyxx y mydictwort y Mydictwrt y casaa y csa.' }, { text: 'Tippfehlr hier.', level: 'PICKY' }, { text: 'Tippfehlr hier.', mode: 'TEXTLEVEL_ONLY' }, { text: 'Tippfehlr hier.', mode: 'ALL_BUT_TEXTLEVEL_ONLY' }] } },
      { op: 'sr-check', args: { lang: base, ids: [SP_ID], ignoreTokens: ['Tippfehlr', 'foo', 'Hola amigo'], cases: [{ text: 'Tippfehlr foo Foo bar Tippfehlrs y Hola amigo.' }] } },
      { op: 'sr-check', args: { lang: base, ids: [SP_ID], acceptPhrases: ['Nueva Yorkk', 'foo bar', 'Dos Palabrass'], cases: [{ text: 'En Nueva Yorkk hay foo bar y Nueva York y Dos Palabrass aquí.' }] } },
      { op: 'sr-check', args: { lang: base, ids: [SP_ID], considerIgnore: false, cases: [{ text: 'LanguageTool y Zzyxx y xx y ' + ign.slice(0, 5).join(' ') + '.' }] } },
      { op: 'sr-check', args: { lang: c.codes[1], ids: [SP_ID], cases: junitU.slice(0, 20).map((text) => ({ text })) } },
    ]);
    // multitoken speller (Language#getMultitokenSpeller: multiwords.txt, spelling_global.txt, hyphenated_words.txt)
    const mwE = lines(path.join(RES, 'multiwords.txt')).map((l) => l.split('\t')[0].trim()).filter(Boolean);
    const hyE = lines(path.join(RES, 'hyphenated_words.txt')).map((l) => l.trim());
    const glE = lines(CORE_SPG).map((l) => l.split('\t')[0].trim()).filter((x) => x.includes(' ') || x.includes('-'));
    stats.multiwords = mwE.length; stats.hyphenated = hyE.length; stats.spellingGlobalMulti = glE.length;
    const mtWords = uniq([...pick(mwE, 260), ...hyE, ...pick(glE, 260)]).flatMap((x, i) => [x, x.toLowerCase(), x.toUpperCase(), typo(x, i), typo(x.toLowerCase(), i + 1), x.replace(/ /g, '-'), x.replace(/-/g, ' ')]);
    chunks(uniq(mtWords), 150).forEach((cc, n) => w(DIR, `speller-multitoken-${String(n).padStart(2, '0')}`, `${key} MultitokenSpeller#getSuggestions (SpanishMultitokenSpeller): entries, case and typo variants, hyphen/space swaps`, 'jsonl', c.codes.slice(0, 1).map((code) => ({ op: 'sr-misc', args: { kind: 'multitoken', lang: code, words: cc } }))));
    w(DIR, 'speller-multitoken-edge', `${key} MultitokenSpeller edge inputs`, 'jsonl', [{ op: 'sr-misc', args: { kind: 'multitoken', lang: base, words: ['', ' ', 'a', 'a b', 'Ciudad de Mexico', 'Ciudad de México', 'ciudad de méxico', 'Buenos Aires', 'Bunos Aires', 'Nueva York', 'Nueva Yorkk', 'New York', 'San José', 'San Jose', 'Sant Jose', 'Ahmed al-Sharaa', 'Ahmed al Sharaa', 'AHMED AL-SHARAA', 'von Bülow', 'von Bulow', 'Von Bülow', 'Alma-Ata', 'Alma Ata', 'Alma-Atta', 'Adams-Stokes', 'Adams Stokes', 'Allen-Doisy', 'Microsoft Entra', 'Microsoft Entr', 'Co2e', 'Fit4ever', 'fit4work', 'P. Sherman 42 Wallaby Way', 'x'.repeat(100), 'a-'.repeat(20), 'ñ ñ', 'Eugenia de Montijo', 'Eugenia de Montijoo', 'Trofim Lysenko', 'Trofin Lysenko', 'folia cerebelosa', 'folia cerebelosas', 'folias cerebelosas'] } }]);
    // multitoken speller through rules (MultitokenSpellerFilter rules and the speller rule), sentence form
    const mtSent = pick(mwE, 120).flatMap((x, i) => [`Vi a ${x} ayer.`, `Vi a ${typo(x, i)} ayer.`, `${title(x.toLowerCase())} es famoso.`, `Hablé de ${x.toUpperCase()}.`]);
    chunks(mtSent, 120).forEach((cc, n) => w(DIR, `speller-multitoken-sentences-${String(n).padStart(2, '0')}`, `${key} multiword entries and typos in sentences, all rules (MultitokenSpellerFilter rules + speller + chunker)`, 'check', cc.map((text) => chk(base, text))));
    const hySent = hyE.flatMap((x, i) => [`Vi a ${x} ayer.`, `Vi a ${x.replace(/-/g, ' ')} ayer.`, `Vi a ${typo(x, i)} ayer.`]);
    chunks(hySent, 120).forEach((cc, n) => w(DIR, `speller-hyphenated-sentences-${String(n).padStart(2, '0')}`, `${key} hyphenated_words.txt entries (hyphen, space, typo) in sentences, all rules`, 'check', cc.map((text) => chk(base, text))));
    const glSent = pick(glE, 150).flatMap((x, i) => [`Vi a ${x} ayer.`, `Vi a ${typo(x, i)} ayer.`]);
    chunks(glSent, 120).forEach((cc, n) => w(DIR, `speller-global-sentences-${String(n).padStart(2, '0')}`, `${key} spelling_global.txt multi-word entries and typos in sentences, all rules`, 'check', cc.map((text) => chk(base, text))));
    w(DIR, 'spelling-variant-voseo', `${key} speller and voseo rules under es-AR: voseo verb forms, tuteo mix, typos`, 'check', ['Vos tenés razón.', 'Vos tienes razón.', 'Vos sos bueno y vos podés venir.', 'Vos eres bueno.', 'Tú tenés razón y vos tienes suerte.', 'Si vos querés, vení.', 'Si tú quieres, ven.', 'Vos hablás mucho, comé más.', 'Vos hablas mucho, come más.', 'Che, vos andá a casa.', 'Sentate acá y contame todo.', 'Podés decirme qué hacés?', 'Tenés que irte ya.', 'Vos habés llegado tarde.', 'No te vayás.', 'Vos cantás y vos bailás.', 'Vosotros tenéis razón.', 'Ustedes tienen razón.', 'Che boludo, qué hacés.', 'Voseo rioplatense y voseo centroamericano.'].flatMap((t) => [chk(c.codes[1], t), chk(c.codes[1], t, { level: 'PICKY' }), chk(c.codes[1], t, only(['VOSEO', 'PODER_VOSEO', 'MEZCLA_TUTEO_VOSEO', 'MORFOLOGIK_RULE_ES'])), chk(c.codes[0], t), chk(c.codes[0], t, only(['VOSEO', 'PODER_VOSEO', 'MEZCLA_TUTEO_VOSEO']))]));
    w(DIR, 'rule-speller-suggestions', `${key} speller suggestions for typos of example words`, 'check', pick(words, 250).map((x, i) => chk(base, `Esto es ${typo(x, i)}.`, spOpts)));
    w(DIR, 'rule-speller-edge', `${key} speller: digits, camelCase, emoji offsets, apostrophes, abbreviations, Latin and mixed tokens, hyphenated compounds`, 'check', ['Se a 😂 hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales.', 'Se a 😂😂 hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales.', 'Veíanse', 'Hagámosle, deme, démelo, europeízate, homogenéizalo. Anúnciate. Desáhucialos.', 'En la p. 25, pp. 33-45. Ctrl+A', 'Del libro de los cinco anillos', 'Juan -el menor- jugó a la pelota.', 'vilbaino.', 'confirmame.', 'confírmame.', 'DECANTACION.', 'distopia', 'Aministraciones', 'respostas', 'mui', 'finga', 'esque', 'hicistes', 'Windows10', 'windows10', 'Windows1995', 'windows1995', 'iPhone', 'LanguageTool', 'Wi-Fi', 'wifi', 'e-mail', 'email', 'ñandu', 'pinguino', 'cigueña', 'averigue', 'Mexico', 'Mejico', 'Perú', 'Peru', 'ciudad-estado', 'ciudades-estado', 'sud-oeste', 'hispano-hablante', 'anti-OTAN', 'exministro', 'ex-ministro', 'superbueno', 'súper bueno', 'COVID-19', 'Covid', 'ADN', 'adn', 'ONU', 'onu', 'EE.UU.', 'eeuu', 'a.m.', 'p. m.', 'km', 'kg.', 'N.º', 'núm.', 'Sr.', 'Sra.', 'Dr', 'dra.', 'etc', 'etc.', 'xq', 'pq', 'q', 'tb', 'tmb', 'k', 'ke', 'ola k ase', 'jajaja', 'jejeje', 'jjj', 'hola', 'hola!!!', 'holaaaa', 'holaa', 'gracias', 'grasias', 'ahi', 'ahí', 'alli', 'alla', 'aya', 'haya', 'halla', 'valla', 'vaya', 'baya', 'si', 'sí', 'mas', 'más', 'tu', 'tú', 'te', 'té', 'solo', 'sólo', 'este', 'éste', 'aun', 'aún', 'mi', 'mí', 'el', 'él', 'de', 'dé', 'se', 'sé', 'mas o menos', 'por que', 'porque', 'porqué', 'por qué', 'a ver', 'haber', 'a sí mismo', 'asimismo', 'tan bien', 'también', 'sin embargo', 'sinembargo', 'a pesar', 'apesar', 'aveces', 'a veces', 'enserio', 'en serio', 'osea', 'o sea', 'sobretodo', 'sobre todo', 'tampoco', 'tan poco', 'ahora mismo', 'ahoramismo', 'dequeísmo', 'queísmo', 'cuyo', 'cúyo', 'lectura-escritura', 'caló', 'cuál', 'cual', 'qué', 'que'].map((t) => chk(base, t, spOpts)));
    w(DIR, 'rule-speller-edge-all', `${key} same speller edge texts with all default rules`, 'check', ['Se a hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales.', 'Hagámosle, deme, démelo, europeízate, homogenéizalo.', 'Veíanse', 'vilbaino.', 'esque', 'hicistes', 'Windows10', 'ñandu pinguino cigueña', 'Mexico y Perú', 'por que sí', 'sobretodo y enserio', 'aveces osea', 'tan bien y tan poco', 'q tal, xq no vienes tb?', 'jajaja holaaaa', 'EE.UU. y eeuu', 'N.º 5 y núm. 6'].map((t) => chk(base, t)));
  }

  // ---- filters through grammar.xml / style.xml rules
  const XMLS = c.xmlFiles.map((f) => path.join(R, f));
  const FLT = { DateCheckFilter: 'rules.es.DateCheckFilter', NewYearDateFilter: 'rules.es.NewYearDateFilter', AdvancedSynthesizerFilter: 'rules.es.AdvancedSynthesizerFilter', ConfusionCheckFilter: 'rules.es.ConfusionCheckFilter', FindSuggestionsFilter: 'rules.es.FindSuggestionsFilter', PostponedAdjectiveConcordanceFilter: 'rules.es.PostponedAdjectiveConcordanceFilter', SpanishNumberInWordFilter: 'rules.es.SpanishNumberInWordFilter', SpanishSuppressMisspelledSuggestionsFilter: 'rules.es.SpanishSuppressMisspelledSuggestionsFilter', AdaptSuggestionsFilter: 'rules.AdaptSuggestionsFilter', AddCommasFilter: 'rules.AddCommasFilter', ApostropheTypeFilter: 'ApostropheTypeFilter', MultitokenSpellerFilter: 'MultitokenSpellerFilter' };
  const fr = {};
  for (const [nm, cls] of Object.entries(FLT)) fr[nm] = filterRules(XMLS, cls);
  stats.filterRules = Object.fromEntries(Object.entries(fr).map(([k, v]) => [k, `${v.ids.length}/${v.texts.length}`]));
  const WEEK_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const WEEKA = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa'];
  const MON_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MON_ABB = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const grid = [];
  for (let d = 0; d < 7; d++) for (const [dd, mm, yy] of [[7, 9, 2014], [15, 2, 2026], [29, 1, 2024], [29, 1, 2023], [31, 3, 2026], [1, 0, 2000], [31, 11, 2026], [1, 0, 2027], [30, 1, 2026], [28, 8, 2019]]) {
    const wd = WEEK_ES[d]; const mo = MON_ES[mm];
    grid.push(`El ${wd} ${dd} de ${mo} de ${yy}`, `${title(wd)}, ${dd} de ${mo} del ${yy}`, `${wd}, ${dd} ${MON_ABB[mm]} ${yy}`, `${WEEKA[d]} ${dd} de ${mo} de ${yy}`, `${wd.toUpperCase()} ${dd} de ${mo} de ${yy}`, `${wd}, ${dd} de ${MON_ABB[mm]}. de ${yy}`, `${title(wd)} ${dd} de ${mo} ${yy}`);
  }
  grid.push('Lunes, 7 de octubre de 2014', 'Martes, 7 de octubre de 2014', 'Lunes 7 de octubre del 2014', 'lunes 0 de octubre de 2014', 'lunes 32 de octubre de 2014', 'lunes 7 de xxx de 2014', 'lunes 7 de octubre de 99999', 'miercoles 8 de octubre de 2014', 'miércoles 8 de octubre de 2014', 'Washington DC, 7 de octubre del 2014', 'Martes, 7 d\'octubre del 2014', 'jueves 7 de oct. de 2014', 'viernes 7 de sept de 2014', 'sábado 7 de septiembre de 2014', 'domingo 7 de enero de 2014', 'martes 7 de marzo de 2014', 'mar 7 mar 2014', 'mie 7 de mayo de 2014', 'mi 7 de may de 2014');
  const dateTexts = uniq([...fr.DateCheckFilter.texts, ...grid]);
  for (const [sfx, ft] of CLOCKS) {
    chunks(dateTexts, 80).forEach((cc, n) => w(DIR, `rule-DateCheckFilter${sfx}-${String(n).padStart(2, '0')}`, `es DateCheckFilter via rules ${fr.DateCheckFilter.ids.join(',')}: examples + date grid${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.DateCheckFilter.ids)), chk(base, t, { level: 'PICKY' })]), ['paths'], ft ? { FAKETIME: ft } : undefined));
  }
  const nyTexts = [];
  for (const [dd, mm, yy] of [[7, 9, 2013], [7, 9, 2014], [7, 9, 2025], [7, 9, 2026], [7, 9, 2027], [31, 11, 2025], [31, 11, 2026], [1, 0, 2026], [1, 0, 2027], [5, 0, 2026], [5, 0, 2027], [5, 0, 2025], [15, 5, 2026], [15, 2, 2026], [29, 1, 2024], [31, 3, 2026], [0, 0, 2026], [32, 0, 2026], [5, 0, 1999], [5, 0, 2100], [5, 0, 3000]]) {
    nyTexts.push(`${dd} de ${MON_ES[mm]} de ${yy}`, `${dd} ${MON_ABB[mm]} de ${yy}`, `${dd}-${mm + 1}-${yy}`, `${dd}/${mm + 1}/${yy}`, `${dd} de ${MON_ES[mm]} del año ${yy}`, `${dd}-${String(mm + 1).padStart(2, '0')}-${yy}.`, `Nació el ${dd} de ${MON_ES[mm]} de ${yy}.`, `${dd} de ${MON_ES[mm]}, ${yy}`);
  }
  nyTexts.push('7 de octubre de 20130', '7 de octubre de 201', '7 de xxx de 2013', '7 de octubre de 2013 y 8 de octubre de 2013', 'Del 1 de enero de 2026 al 5 de enero de 2026');
  const nyAll = uniq([...fr.NewYearDateFilter.texts, ...nyTexts]);
  for (const [sfx, ft] of CLOCKS) {
    chunks(nyAll, 80).forEach((cc, n) => w(DIR, `rule-NewYearDateFilter${sfx}-${String(n).padStart(2, '0')}`, `es NewYearDateFilter via rules ${fr.NewYearDateFilter.ids.join(',')}: examples + dates around the clock${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.NewYearDateFilter.ids)), chk(base, t)]), ['paths'], ft ? { FAKETIME: ft } : undefined));
  }
  // ConfusionCheckFilter via rules: confusion_pairs.txt forms in contexts
  const cpairs = lines(path.join(R, 'rules/es/confusion_pairs.txt')).map((l) => l.split(';'));
  stats.confusionPairs = cpairs.length;
  const cpSample = pick(cpairs.map((p) => p.join(';')), 160).map((x) => x.split(';'));
  const cfCases = cpSample.flatMap(([a, b]) => [`El ${a} bonito.`, `Los ${a} grandes.`, `La ${a} blanca.`, `${title(a)} es mío.`, `Una ${a} roja y dos ${a}s.`, `Un ${b} grande.`, `Las casas ${a} blancas.`, `Mi ${a.toUpperCase()}.`]);
  const cfBase = uniq([...fr.ConfusionCheckFilter.texts, ...fr.ConfusionCheckFilter.texts.map((t) => t.toLowerCase()), ...fr.ConfusionCheckFilter.texts.map(title), ...fr.ConfusionCheckFilter.texts.map((t) => `${t} ${t}`), ...cfCases]);
  chunks(cfBase, 120).forEach((cc, n) => w(DIR, `rule-ConfusionCheckFilter-${String(n).padStart(2, '0')}`, `es ConfusionCheckFilter via ${fr.ConfusionCheckFilter.ids.length} rules (examples, case variants, confusion_pairs.txt forms in contexts)`, 'check', cc.flatMap((t) => [chk(base, t, only(fr.ConfusionCheckFilter.ids)), chk(base, t, { level: 'PICKY' })])));
  for (const nm of ['AdvancedSynthesizerFilter', 'FindSuggestionsFilter', 'PostponedAdjectiveConcordanceFilter', 'SpanishNumberInWordFilter', 'SpanishSuppressMisspelledSuggestionsFilter', 'AdaptSuggestionsFilter', 'AddCommasFilter', 'ApostropheTypeFilter', 'MultitokenSpellerFilter']) {
    const f = fr[nm];
    stats[`${nm}Texts`] = f.texts.length;
    const extra = nm === 'SpanishNumberInWordFilter' ? ['Buen0s días', 'h0la', 'c4sa grande', 'ca5a', 'La 1casa', 'Mi casa1', 'ñ0ño', 'Windows10', 'año2020', 'ho1a mundo', 'tu3', 'm4ñana'] : [];
    const base2 = uniq([...f.texts, ...extra, ...f.texts.map((t) => t.toLowerCase()), ...f.texts.map(title), ...f.texts.map((t) => t.replace(/[áéíóú]/g, (x) => 'aeiou'['áéíóú'.indexOf(x)])), ...f.texts.map((t) => `${t} ${t}`), ...f.texts.map((t) => t.replace(/,/g, ''))]);
    chunks(base2, 60).forEach((cc, n) => w(DIR, `rule-${nm}-${String(n).padStart(2, '0')}`, `es ${nm} via ${f.ids.length} rules (examples, case/accent variants, doubled)`, 'check', cc.flatMap((t) => [chk(base, t, only(f.ids)), chk(base, t, { level: 'PICKY' })])));
  }
  // postponed adjective sentences through the rules
  const paSent = ['Los niños pequeña juegan.', 'La casa blancos es grande.', 'Un hombre y una mujer cansados.', 'El libro y la revista interesante.', 'Las casas y los coches rojos.', 'Dictador descubierta.', 'La mujer del presidente enfermo.', 'Los libros de la biblioteca antigua.', 'El perro y el gato negra.', 'Compré una camisa y un pantalón blanca.', 'Tengo un coche y una moto rápido.', 'Vi a María y a Juan cansada.', 'La vecina de mi tía enfermas.', 'Las mesas y las sillas viejo.', 'El problema es muy grave y difícil de resolver, urgentes.', 'Una casa con jardín y piscina cerrado.', 'La novela y el cuento largos, publicados ayer.', 'Esta noche, la luna llena hermoso.', 'Tengo una hermana y dos hermanos, pequeño.', 'El niño habló con la profesora enfadada.', 'Los resultados de la encuesta fueron sorprendentes.', 'El agua y la luz caro.', 'Pedro, Ana y Luis contentas.', 'El coche de mi padre y de mi madre nuevos.', 'Hablé con un amigo de mi hermana preocupada.'];
  w(DIR, 'rule-PostponedAdjective-sentences', 'es PostponedAdjectiveConcordanceFilter rules on adjective-after-noun sentences (agreement errors, coordination, prepositions, commas)', 'check', paSent.flatMap((t) => [chk(base, t, only(fr.PostponedAdjectiveConcordanceFilter.ids)), chk(base, t, { level: 'PICKY' })]));

  // ---- direct filter-run cases (literal args, token positions from a Java tokenisation phase)
  const PKG = 'org.languagetool.rules.es.';
  const ROWS = new Map();
  const needRows = async (texts) => {
    const todo = uniq(texts).filter((t) => !ROWS.has(t));
    for (const part of chunks(todo, 400)) {
      const r = await harnessLines(part.map((t) => ({ op: 'filter-run', args: { lang: base, text: t, filter: { cls: 'org.languagetool.rules.WhitespaceCheckFilter' }, args: [['whitespaceChar', 'x'], ['position', '1']], from: 0, to: 1, patternTokenPos: 0, tokenPositions: [1], dumpTokens: true } })));
      r.forEach((j, i) => { if (!j.ok || !j.result.tokens) throw new Error(`tokenize ${part[i]}: ${JSON.stringify(j).slice(0, 300)}`); ROWS.set(part[i], j.result.tokens.slice(1)); });
    }
  };
  const A = (o) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v]);
  // text, filter class, args object, options: i/j = token span (0-based, default all), pos = patternTokenPos, from/to override char span
  const frd = (text, cls, args, o = {}) => {
    const rows = ROWS.get(text);
    const n = rows.length;
    const i = o.i ?? 0; const j = o.j ?? n - 1;
    return { op: 'filter-run', args: { lang: o.lang ?? base, text, filter: { cls: cls.includes('.') ? cls : PKG + cls }, args: A(args), from: o.from ?? (n ? rows[Math.min(i, n - 1)][1] : 0), to: o.to ?? (n ? rows[Math.min(j, n - 1)][2] : 0), patternTokenPos: o.pos ?? 0, tokenPositions: o.tokenPositions ?? new Array(n).fill(1), window: o.window ?? [1, n + 1], message: o.message ?? 'msg', shortMessage: 'sm', suggestions: o.suggestions ?? [], ...(o.clockAt ? { clockAt: o.clockAt } : {}) } };
  };
  const dtexts = [];
  // DateCheckFilter / NewYearDateFilter (DateFilterHelper: exact day names, month prefixes, Locale.FRANCE calendar)
  const dayNames = ['lunes', 'Lunes', 'LUNES', 'lu', 'Lu', 'martes', 'ma', 'miércoles', 'miercoles', 'mi', 'jueves', 'ju', 'viernes', 'vi', 'sábado', 'sabado', 'sa', 'domingo', 'do', 'dom', 'lun', 'xyz', '', 'Domingo', 'SÁBADO', 'lunes.', ' lunes'];
  const dateSets = [['28', 'septiembre', '2019'], ['7', 'octubre', '2014'], ['15', 'marzo', '2026'], ['16', 'marzo', '2026'], ['29', 'febrero', '2024'], ['29', 'febrero', '2023'], ['31', 'abril', '2026'], ['5', 'diciembre', '2026'], ['5', 'Diciembre', '1900'], ['5', 'DICIEMBRE', '2026'], ['0', 'mayo', '2026'], ['5', 'dic', '2026'], ['5', 'may', '2026'], ['5', 'my', '2026'], ['5', 'mzo', '2026'], ['5', 'jun', '2026'], ['5', 'jn', '2026'], ['5', 'jul', '2026'], ['5', 'jl', '2026'], ['5', 'ene', '2026'], ['5', 'en', '2026'], ['5', 'fe', '2026'], ['5', 'ab', '2026'], ['5', 'ag', '2026'], ['5', 'se', '2026'], ['5', 'sep', '2026'], ['5', 'sept', '2026'], ['5', 'oc', '2026'], ['5', 'nov', '2026'], ['5', 'xxx', '2026'], ['abc', 'mayo', '2026'], ['5', 'mayo', 'abcd'], ['5', 'mayo', '99999999999'], ['5', 'mayo', ''], ['', 'mayo', '2026'], ['5', '', '2026'], ['1', 'enero', '2027'], ['31', 'diciembre', '2026'], ['5', '12', '2026'], ['5', 'ENERO', '2026']];
  const mkDate = (lst) => {
    for (const [day, d, m, y] of lst) dtexts.push(`${day} ${d} ${m} ${y}`);
  };
  const dgrid = [];
  for (const day of dayNames) for (const [d, m, y] of dateSets) dgrid.push([day, d, m, y]);
  mkDate(dgrid);
  const tokTexts = ['lunes 7 de octubre de 2014', 'Lunes, 7 de octubre de 2014', 'martes 7 de octubre de 2014', 'lu 7 oct 2014', '7 de octubre de 2013', '7 de octubre de 2026', '7 de octubre de 2027', '1 de enero de 2026', '5 de enero de 2027', '31 de diciembre de 2026', 'domingo 15 de marzo de 2026', 'domingo 15 de marzo del 2026'];
  await needRows([...dtexts, ...tokTexts, '5 enero 2026', 'martes 7 octubre 2014']);
  const args4 = (day, d, m, y) => [['weekDay', day], ['day', d], ['month', m], ['year', y]];
  const dateTokenCases = (clk) => {
    const out = [];
    for (const t of tokTexts) {
      const rows = ROWS.get(t);
      const idx = (re) => rows.findIndex((r) => re.test(r[0])) + 1;
      const wdI = rows.findIndex((r) => /^(lunes|martes|domingo|lu)$/i.test(r[0])) + 1;
      const dI = rows.findIndex((r) => /^\d\d?$/.test(r[0])) + 1;
      const yI = rows.findIndex((r) => /^\d{4}$/.test(r[0])) + 1;
      const mI = Math.max(...[rows.findIndex((r) => /^(octubre|enero|diciembre|marzo|oct)$/i.test(r[0])) + 1]);
      void idx;
      const refs = { weekDay: String(wdI || 1), day: String(dI), month: String(mI), year: String(yI) };
      out.push({ t, refs });
    }
    return out.map(({ t, refs }) => [frd(t, 'DateCheckFilter', refs, { message: 'wd {realDay} / {day} / {month} / {year}', suggestions: [], clockAt: clk }), frd(t, 'DateCheckFilter', { ...refs, weekDay: undefined }, { clockAt: clk }), frd(t, 'DateCheckFilter', { ...refs, year: undefined }, { message: 'wd {realDay}', clockAt: clk }), frd(t, 'DateCheckFilter', { ...refs, month: '99' }, { clockAt: clk }), frd(t, 'DateCheckFilter', { ...refs, day: '0' }, { clockAt: clk }), frd(t, 'NewYearDateFilter', { year: refs.year, month: refs.month, day: refs.day }, { message: 'ny {realYear}', suggestions: [], clockAt: clk }), frd(t, 'NewYearDateFilter', { year: refs.year, month: refs.month }, { clockAt: clk })]).flat();
  };
  for (const [sfx, ft, clk] of CLOCKS) {
    const dc = [];
    // token-reference args (weekDay:1 day:2 ...: positions in the pattern tokens, as in grammar.xml)
    for (const [day, d, m, y] of dgrid) {
      const txt = `${day} ${d} ${m} ${y}`;
      const rows = ROWS.get(txt);
      let off = 0;
      const pos = [];
      for (const part of [day, d, m, y]) { pos.push(part === '' ? 0 : rows.findIndex((r) => r[1] === off) + 1); off += part.length + 1; }
      const [pw, pd, pm, py] = pos.map(String);
      dc.push(frd(txt, 'DateCheckFilter', { weekDay: pw, day: pd, month: pm, year: py }, { message: 'wd {realDay} / {day} / {month} / {year}', suggestions: [], clockAt: clk }));
    }
    for (const [day, d, m, y] of dgrid.filter((_, i) => i % 29 === 0)) dc.push(frd(`${day} ${d} ${m} ${y}`, 'DateCheckFilter', args4(day, d, m, y).reduce((a, [k, v]) => ({ ...a, [k]: v }), {}), { message: 'wd literal {realDay}', suggestions: [], clockAt: clk }));
    for (const a of [{ weekDay: 'martes', day: '7' }, { day: '7', month: 'octubre', year: '2014' }, { weekDay: 'martes', month: 'octubre', year: '2014' }, { weekDay: 'martes', day: '7', month: 'octubre', year: '2014', extra: 'x' }, { year: '2014' }, {}]) dc.push(frd('martes 7 octubre 2014', 'DateCheckFilter', a, { clockAt: clk }));
    dc.push(...dateTokenCases(clk));
    w(DIR, `direct-DateCheckFilter${sfx}`, `es DateCheckFilter direct filter-run (literal and token-reference args): weekday x date grid, missing/invalid args${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'jsonl', dc, ['paths'], ft ? { FAKETIME: ft } : undefined);
    const ny = [];
    const nyMon = [...MON_ES, ...MON_ABB, 'Enero', 'DICIEMBRE', 'my', 'mzo', 'jn', 'jl', 'sept', 'xxx', '', '5', '12', 'enero.'];
    for (const y of ['2025', '2026', '2027', '2028', '2013', '1999', '3000', '0', '99999999999', 'abcd', '', '26', '-2026']) for (const m of nyMon) ny.push(frd('5 enero 2026', 'NewYearDateFilter', { year: y, month: m, day: '5' }, { message: 'ny {realYear}', clockAt: clk }));
    for (const y of ['2026', '2027']) for (const d of ['1', '2', '5', '10', '15', '28', '29', '30', '31', '0', '32', '-1', 'abc', '', '07', '1 ', '1.5', 'primero']) for (const m of ['enero', 'febrero', 'junio', 'septiembre', 'noviembre', 'diciembre']) ny.push(frd('5 enero 2026', 'NewYearDateFilter', { year: y, month: m, day: d }, { message: 'ny {realYear}', clockAt: clk }));
    for (const a of [{ year: '2026', month: 'enero' }, { year: '2026', day: '5' }, { month: 'enero', day: '5' }, {}, { year: '2026', month: 'enero', day: '5', x: 'y' }]) ny.push(frd('5 enero 2026', 'NewYearDateFilter', a, { clockAt: clk }));
    w(DIR, `direct-NewYearDateFilter${sfx}`, `es NewYearDateFilter direct filter-run: month names/prefixes, day and year edge values vs. the clock${ft ? ' [clock ' + ft.slice(1) + ']' : ''}`, 'jsonl', ny, ['paths'], ft ? { FAKETIME: ft } : undefined);
  }
  // ConfusionCheckFilter
  const cfForms = uniq([...cpSample.map((p) => p[0]), ...cpSample.slice(0, 40).map((p) => title(p[0])), ...cpSample.slice(0, 40).map((p) => p[0].toUpperCase()), ...cpSample.slice(0, 30).map((p) => p[1]), 'nosuchform', '', 'a', 'Ácaro', 'acaro', 'ACARO', 'Acaro', 'acida', 'ababan']);
  const cfTexts = cfForms.map((f) => `Las casas ${f} blancas`);
  await needRows(cfTexts);
  const cfOps = [];
  const cpTags = new Map(cpairs.map((p) => [p[0], p[2]]));
  for (const f of cfForms) {
    const t = `Las casas ${f} blancas`;
    const rows = ROWS.get(t);
    const fi = rows.findIndex((r) => r[0] === f);
    const sp1 = fi >= 0 ? { i: fi, j: fi } : {};
    const tag = cpTags.get(f.toLowerCase()) ?? 'NCMS000';
    for (const pt of [`${tag.slice(0, 2)}.*`, '[AN].*', '(NC|AQ).*', '.*', 'V.*']) for (const gn of [undefined, '1', '2', '3', '4']) {
      cfOps.push(frd(t, 'ConfusionCheckFilter', { form: f, postag: pt, gendernumberFrom: gn }, { ...sp1, message: 'La palabra se escribe con tilde.', suggestions: ['{suggestion}', '{Suggestion}'] }));
    }
  }
  const cT = 'Las casas acida blancas';
  await needRows([cT, 'Los niño acida', 'El acaro']);
  for (const gn of ['0', '-1', '5', '6', '99', 'abc', '', '1.5', ' 2']) cfOps.push(frd(cT, 'ConfusionCheckFilter', { form: 'acida', postag: '.*', gendernumberFrom: gn }, { i: 2, j: 2, suggestions: ['{suggestion}'] }));
  cfOps.push(frd(cT, 'ConfusionCheckFilter', { postag: '.*' }, { i: 2, j: 2, suggestions: ['{suggestion}'] }), frd(cT, 'ConfusionCheckFilter', { form: 'acida' }, { i: 2, j: 2, suggestions: ['{suggestion}'] }), frd(cT, 'ConfusionCheckFilter', {}, { i: 2, j: 2 }), frd(cT, 'ConfusionCheckFilter', { form: 'acida', postag: '.*' }, { i: 2, j: 2, suggestions: [] }), frd(cT, 'ConfusionCheckFilter', { form: 'acida', postag: '.*' }, { i: 2, j: 2, suggestions: ['x {SUGGESTION} y', '{suggestion}{Suggestion}'], message: 'Otra cosa.' }), frd(cT, 'ConfusionCheckFilter', { form: 'acida', postag: 'ZZZ' }, { i: 2, j: 2, suggestions: ['{suggestion}'] }), frd(cT, 'ConfusionCheckFilter', { form: 'acida', postag: '(' }, { i: 2, j: 2, suggestions: ['{suggestion}'] }));
  chunks(cfOps, 400).forEach((cc, n) => w(DIR, `direct-ConfusionCheckFilter-${String(n).padStart(2, '0')}`, 'es ConfusionCheckFilter direct filter-run: confusion_pairs.txt forms x postag x gendernumberFrom, case, message variants, missing/invalid args', 'jsonl', cc));
  // FindSuggestionsFilter
  const fsPairs = pick(fr.FindSuggestionsFilter.pairs.map((p) => p.join('\u0001')), 70).map((x) => x.split('\u0001'));
  await needRows(fsPairs.map((p) => p[0]));
  const fsOps = [];
  for (const [t, marked] of fsPairs) {
    const from = t.indexOf(marked);
    if (from < 0 || !marked) continue;
    const rows = ROWS.get(t);
    const wi = Math.max(0, rows.findIndex((r) => r[1] >= from));
    const sp2 = { from, to: from + marked.length };
    for (const pt of ['V.*', 'N.*|A.*', 'NC.*|AQ.*', '.*', 'V.I.*|NC.*|A.*']) fsOps.push(frd(t, 'FindSuggestionsFilter', { wordFrom: String(wi + 1), desiredPostag: pt }, { ...sp2, pos: wi + 1, message: 'find', suggestions: ['{suggestion}', '{Suggestion}'] }));
    fsOps.push(frd(t, 'FindSuggestionsFilter', { wordFrom: 'marker', desiredPostag: 'V.I.*|NC.*|A.*' }, { ...sp2, message: 'find', suggestions: ['{suggestion}'] }), frd(t, 'FindSuggestionsFilter', { wordFrom: 'inmarker', desiredPostag: '.*', suppressMatch: 'true' }, { ...sp2, message: 'find', suggestions: ['{suggestion}'] }), frd(t, 'FindSuggestionsFilter', { wordFrom: String(wi + 1), desiredPostag: 'V.*', suppressMatch: 'true' }, { ...sp2, pos: wi + 1, message: 'find', suggestions: ['{suggestion}'] }), frd(t, 'FindSuggestionsFilter', { wordFrom: String(wi + 1), desiredPostag: '.*', Mode: 'diacritics' }, { ...sp2, pos: wi + 1, message: 'find', suggestions: ['{suggestion}'] }), frd(t, 'FindSuggestionsFilter', { wordFrom: String(wi + 1), desiredPostag: '.*', priorityPostag: 'V.*' }, { ...sp2, pos: wi + 1, message: 'find', suggestions: ['{suggestion}'] }), frd(t, 'FindSuggestionsFilter', { wordFrom: String(wi + 1), desiredPostag: '.*', removeSuggestionsRegexp: '.*s' }, { ...sp2, pos: wi + 1, message: 'find', suggestions: ['{suggestion}'] }));
  }
  const fsT = 'El perro come carne';
  await needRows([fsT]);
  fsOps.push(frd(fsT, 'FindSuggestionsFilter', { desiredPostag: '.*' }, { suggestions: ['{suggestion}'] }), frd(fsT, 'FindSuggestionsFilter', { wordFrom: '2' }, { suggestions: ['{suggestion}'] }), frd(fsT, 'FindSuggestionsFilter', { wordFrom: '99', desiredPostag: '.*' }, { suggestions: ['{suggestion}'] }), frd(fsT, 'FindSuggestionsFilter', { wordFrom: '0', desiredPostag: '.*' }, { suggestions: ['{suggestion}'] }), frd(fsT, 'FindSuggestionsFilter', { wordFrom: 'abc', desiredPostag: '.*' }, { suggestions: ['{suggestion}'] }));
  chunks(fsOps, 150).forEach((cc, n) => w(DIR, `direct-FindSuggestionsFilter-${String(n).padStart(2, '0')}`, 'es FindSuggestionsFilter direct filter-run on marker spans of rule examples (speller suggestions, postag filter, suppressMatch, Mode diacritics, priority, regexp)', 'jsonl', cc));
  // AdvancedSynthesizerFilter
  const asArgs = fr.AdvancedSynthesizerFilter.args;
  const asPairs = fr.AdvancedSynthesizerFilter.pairs;
  await needRows(asPairs.map((p) => p[0]));
  const asOps = [];
  const parseArgs = (s) => Object.fromEntries(s.split(/\s+(?=\w+:)/).map((kv) => { const k = kv.indexOf(':'); return [kv.slice(0, k), kv.slice(k + 1)]; }));
  for (const [t, marked] of asPairs) {
    const from = marked ? t.indexOf(marked) : 0;
    const sp2 = from >= 0 && marked ? { from, to: from + marked.length } : {};
    for (const a of asArgs) asOps.push(frd(t, 'AdvancedSynthesizerFilter', parseArgs(a), { ...sp2, message: 'syn', suggestions: ['{suggestion}', 'x {Suggestion}', '{SUGGESTION}'] }));
  }
  const asT = 'Las casas blancas son grandes';
  await needRows([asT]);
  for (const a of [{ lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'A.*' }, { lemmaFrom: '3', lemmaSelect: 'A.*', postagFrom: '2', postagSelect: 'N.*' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'A.*', postagReplace: 'N..\\b2\\b1.' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'A.*', newLemma: 'perro' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'A.*', newLemma: '_x' }, { lemmaFrom: 'marker', lemmaSelect: 'N.*', postagFrom: 'marker1', postagSelect: 'A.*' }, { lemmaFrom: '0', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'A.*' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '99', postagSelect: 'A.*' }, { lemmaFrom: '2', lemmaSelect: 'ZZ.*', postagFrom: '3', postagSelect: 'A.*' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3', postagSelect: 'ZZ.*' }, { lemmaFrom: '2', lemmaSelect: 'N.*', postagFrom: '3' }, {}]) asOps.push(frd(asT, 'AdvancedSynthesizerFilter', a, { i: 1, j: 2, message: 'syn', suggestions: ['{suggestion}', '{Suggestion}'] }));
  const asCur = [['Las casas blancas', 2, 3], ['El libro rojo', 2, 3], ['Los niños pequeños', 2, 3], ['La mujer alta', 2, 3], ['Unas flores amarillas', 2, 3], ['Mis amigos queridos', 2, 3], ['Esas mesas grandes', 2, 3], ['Un perro negro', 2, 3], ['El coche nuevo y la casa vieja', 2, 3], ['Los profesores cansados', 2, 3]];
  await needRows(asCur.map((x) => x[0]));
  for (const [t, ni, ai] of asCur) {
    const sp3 = { message: 'syn', suggestions: ['{suggestion}', '{Suggestion}', '{SUGGESTION}'] };
    for (const a of [
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ni), postagSelect: 'NC(.)(.)000', postagReplace: 'AQ0\\b1\\b20' },
      { lemmaFrom: String(ni), lemmaSelect: 'NC.*', postagFrom: String(ai), postagSelect: 'AQ0(.)(.)0', postagReplace: 'NC\\b1\\b2000' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ni), postagSelect: 'NC.*' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ai), postagSelect: 'AQ.*' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ni), postagSelect: 'NC(.)(.)000', postagReplace: 'AQ0[C\\b1][N\\b2]0' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ni), postagSelect: 'NC(.)(.)000', postagReplace: 'AQ0\\b1\\b20', newLemma: 'bueno' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: String(ni), postagSelect: 'NC(.)(.)000', postagReplace: 'AQ0\\b1\\b20', newLemma: '_o' },
      { lemmaFrom: String(ai), lemmaSelect: 'AQ.*', postagFrom: 'marker', postagSelect: 'NC(.)(.)000', postagReplace: 'AQ0\\b1\\b20' },
      { lemmaFrom: 'marker1', lemmaSelect: 'AQ.*', postagFrom: 'marker', postagSelect: 'NC.*' },
    ]) asOps.push(frd(t, 'AdvancedSynthesizerFilter', a, { ...sp3, i: ni - 1, j: ai - 1 }), frd(t, 'AdvancedSynthesizerFilter', a, { ...sp3, i: ai - 1, j: ai - 1 }));
  }
  chunks(asOps, 200).forEach((cc, n) => w(DIR, `direct-AdvancedSynthesizerFilter-${String(n).padStart(2, '0')}`, 'es AdvancedSynthesizerFilter direct filter-run: the 10 grammar.xml argument sets on the example sentences of those rules, plus index/regexp error cases', 'jsonl', cc));
  // SpanishSuppressMisspelledSuggestionsFilter
  const sugWords = ['casa', 'csa', 'perro', 'pero', 'prro', 'hola', 'hla', 'él', 'el', 'aquí', 'aqui', 'mañana', 'manana', 'vamos', 'vamso', 'Madrid', 'Madird', 'ordenador', 'ordenadr', 'tener', 'tenerr', 'tienes', 'tené', 'hacer', 'hacerlo', 'hizo', 'jirafa', 'jirfa', 'a', 'x', 'ñandú', 'ñandu', 'de el', 'a el', 'casa blanca', 'casa blnca', ''];
  const sT = 'Esto es una prueba de sugerencias';
  await needRows([sT]);
  const spOps = [];
  const sugSets = [];
  for (let i = 0; i < 40; i++) { const k = 1 + (i % 5); sugSets.push(sugWords.slice((i * 3) % sugWords.length, ((i * 3) % sugWords.length) + k)); }
  sugSets.push([], sugWords, ['csa'], ['casa'], ['csa', 'cs']);
  for (const ss of sugSets) for (const a of [{ suppressMatch: 'true' }, { suppressMatch: 'false' }, { suppressMatch: 'TRUE' }, { suppressMatch: 'x' }, { suppressMatch: 'true', SuppressPostag: 'V.*' }, { suppressMatch: 'true', SuppressPostag: 'N.*|D.*' }, { suppressMatch: 'false', FilterPostag: 'N.*' }, { suppressMatch: 'true', FilterPostag: 'V.*', SuppressPostag: 'NC.*' }, {}]) spOps.push(frd(sT, 'SpanishSuppressMisspelledSuggestionsFilter', a, { i: 2, j: 3, message: 'sup', suggestions: ss }));
  chunks(spOps, 200).forEach((cc, n) => w(DIR, `direct-SpanishSuppressMisspelledSuggestionsFilter-${String(n).padStart(2, '0')}`, 'es SpanishSuppressMisspelledSuggestionsFilter direct filter-run: suggestion lists (correct/misspelled/multiword) x suppressMatch/SuppressPostag/FilterPostag', 'jsonl', cc));
  // SpanishNumberInWordFilter
  const nwWords = ['Buen0s', 'h0la', 'c4sa', 'ca5a', '1casa', 'casa1', '0', '10', 'a0b', 'ho1a', 'cas4', 'Wind0ws', 'Windows10', 'm4ñana', 'año2020', 'tu3', 'ñ0ño', 'p3rro', 'espa6ol', 'con0cer', 'm0n0', 'b0b0', 'x1y2', '', 'hola', 'casa', 'csa1', '1csa', 'c0sa', 'C0SA', 'Mexic0', 'M3xico', 'pap4', 'ma0', 'o0o', '00', 'aa11bb22', 'ñ1', 'é1', 'ü2'];
  await needRows(nwWords.map((x) => x || 'x'));
  const nwOps = [];
  for (const wd of nwWords) nwOps.push(frd(wd || 'x', 'SpanishNumberInWordFilter', { word: wd }, { message: 'Posible error ortográfico.', suggestions: [] }), frd(wd || 'x', 'SpanishNumberInWordFilter', { word: wd }, { message: 'Posible error ortográfico.', suggestions: ['old'] }));
  nwOps.push(frd('x', 'SpanishNumberInWordFilter', {}, { suggestions: [] }));
  w(DIR, 'direct-SpanishNumberInWordFilter', 'es SpanishNumberInWordFilter direct filter-run: words with digits (0 to o, digits removed, speller suggestions), missing word arg', 'jsonl', nwOps);
  // TextToNumberFilter (no grammar.xml rule uses it: direct only)
  const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const HUND = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  const nw = (n) => { if (n < 30) return U[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' y ' + U[n % 10] : ''); if (n === 100) return 'cien'; return HUND[Math.floor(n / 100)] + (n % 100 ? ' ' + nw(n % 100) : ''); };
  const ttn = [];
  for (const n of [0, 1, 2, 9, 10, 15, 16, 21, 22, 29, 30, 31, 45, 58, 77, 99, 100, 101, 115, 120, 199, 200, 256, 300, 345, 400, 512, 600, 678, 700, 801, 900, 999]) ttn.push(nw(n));
  ttn.push('mil', 'dos mil', 'mil uno', 'mil quinientos', 'dos mil quinientos treinta y cuatro', 'veinte mil', 'cien mil', 'doscientos mil trescientos cuarenta y cinco', 'un millón', 'dos millones', 'tres millones doscientos mil', 'un millón quinientos mil', 'millón', 'mil millones', 'dos mil millones', 'un billón', 'dos billones', 'un trillón', 'medio', 'uno y medio', 'cero coma cinco', 'cinco coma cinco', 'cero coma cero uno', 'tres coma catorce', 'uno coma dos tres', 'veinte por ciento', 'cinco por ciento', 'cien por ciento', 'mil por ciento', 'quince %', 'cero', 'Veintiún', 'UNO', 'Dos Mil', 'tres  cuatro', 'cinco y', 'y', 'una', 'cuarenta y una', 'veintiuna', 'doscientas', 'quinientas mil', 'novecientas noventa y nueve mil novecientas noventa y nueve', 'coma', 'dos coma', 'coma dos', 'x', 'dos x tres', 'cien mil millones', 'mil mil', 'mil dos mil');
  await needRows(ttn);
  const ttnOps = [];
  for (const t of ttn) {
    const n = ROWS.get(t).length;
    ttnOps.push(frd(t, 'TextToNumberFilter', {}, { message: 'n', suggestions: [] }), frd(t, 'TextToNumberFilter', {}, { pos: 1, message: 'n', suggestions: ['pre'] }), frd(t, 'TextToNumberFilter', {}, { window: [0, n + 1], tokenPositions: new Array(n + 1).fill(1), message: 'n' }));
    if (n > 1) ttnOps.push(frd(t, 'TextToNumberFilter', {}, { i: 1, j: n - 1, message: 'n' }), frd(t, 'TextToNumberFilter', {}, { i: 0, j: n - 2, message: 'n' }));
  }
  w(DIR, 'direct-TextToNumberFilter', 'es TextToNumberFilter direct filter-run: Spanish number words (units, tens, hundreds, thousands, millions, billón float quirk, coma decimals, por ciento), spans and windows', 'jsonl', ttnOps);
  // PostponedAdjectiveConcordanceFilter
  const paAll = uniq([...fr.PostponedAdjectiveConcordanceFilter.texts, ...paSent]).slice(0, 80);
  await needRows(paAll);
  const paOps = [];
  for (const t of paAll) {
    const n = ROWS.get(t).length;
    for (let p = 1; p <= Math.min(n, 12); p++) for (const ac of [undefined, 'true']) paOps.push(frd(t, 'PostponedAdjectiveConcordanceFilter', { addComma: ac }, { i: p - 1, j: p - 1, pos: p, message: 'pa', suggestions: [] }));
  }
  chunks(paOps, 300).forEach((cc, n) => w(DIR, `direct-PostponedAdjectiveConcordanceFilter-${String(n).padStart(2, '0')}`, 'es PostponedAdjectiveConcordanceFilter direct filter-run on raw-tagged sentences (no _GN_ chunk tags): every token position as the adjective, addComma true/absent', 'jsonl', cc));
  // AdaptSuggestionsFilter (Spanish#adaptSuggestion: a el -> al, de el -> del)
  const adaptSug = ['a el', 'A el', 'de el', 'De el', 'DE EL', 'a el niño', 'de el perro y a el gato', 'para a el', 'sobre el', 'del', 'al', 'a ella', 'de ellos', 'a elefante', 'de elefante', 'va a el', 'viene de el', 'Va de el campo a el pueblo', 'a  el', 'a el', 'a el.', 'a, el', '(a el)', 'dea el', 'a els', 'a e', 'a el el', 'de el el', 'de El', 'a EL', 'x a el', 'x', '', 'de el 5', 'a el_x', 'a\nel'];
  await needRows(['Voy a el mercado']);
  const adOps = [];
  for (const s of adaptSug) for (const ss of [[s], [s, 'x'], ['otra', s, 'a el']]) adOps.push(frd('Voy a el mercado', 'org.languagetool.rules.AdaptSuggestionsFilter', { none: 'none' }, { i: 1, j: 2, message: 'ad', suggestions: ss }));
  w(DIR, 'direct-AdaptSuggestionsFilter', 'es AdaptSuggestionsFilter direct filter-run (Spanish#adaptSuggestion: a el to al, de el to del)', 'jsonl', adOps);
  // MultitokenSpellerFilter
  const mtDirect = pick(mw, 80).map((x, i) => (i % 2 ? typo(x, i) : x));
  const mtTexts = mtDirect.map((x) => `Vi a ${x} ayer .`);
  await needRows(mtTexts);
  const mtOps = [];
  mtDirect.forEach((x, i) => {
    const t = mtTexts[i];
    const from = t.indexOf(x);
    const rows = ROWS.get(t);
    const fi = rows.findIndex((r) => r[1] >= from);
    for (const pos of [fi + 1, 1, 0]) mtOps.push(frd(t, 'org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter', {}, { from, to: from + x.length, pos, message: 'mt', suggestions: [] }));
  });
  w(DIR, 'direct-MultitokenSpellerFilter', 'es MultitokenSpellerFilter direct filter-run on multiwords.txt entries and typos (Language#getMultitokenSpeller)', 'jsonl', mtOps);
  // bitext (no es bitext.xml: built-in rules only)
  const bt = [['There is a dog.', 'Hay un perro.'], ['There is no dog.', 'No hay perro.'], ['Hello.', '¡Hola!'], ['', 'Nada.'], ['There is a dog.', ''], ['Same.', 'Same.'], ['Hello?', 'Hola.'], ['Hi.', 'Una frase muy larga en español que supera con mucho la longitud del original.']];
  w(DIR, 'bitext-tools', 'es Tools.getBitextRules/checkBitext en->es (built-in bitext rules; no es/bitext.xml), es-AR, es->en, de->es', 'jsonl', [{ op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'es', pairs: bt, detail: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'es', pairs: bt, brief: true } }, { op: 'bitext-tools', args: { srcLang: 'en', trgLang: 'es-AR', pairs: bt } }, { op: 'bitext-tools', args: { srcLang: 'es', trgLang: 'en', pairs: bt.map(([a, b]) => [b, a]) } }, { op: 'bitext-tools', args: { srcLang: 'de', trgLang: 'es', pairs: [['Es gibt einen Hund.', 'Hay un perro.'], ['Hallo.', 'Hola.']] } }]);
  w(DIR, 'bitext-load', 'es bitext.xml resource loading (resource absent in the es module: Java error)', 'jsonl', [{ op: 'bitext-load', args: { mode: 'resource', name: '/es/bitext.xml', srcLang: 'en', trgLang: 'es', pairs: bt.slice(0, 3) } }]);
  // mw/global chunkers on spelling_global.txt entries
  const glMw = pick(lines(CORE_SPG).map((l) => l.split('\t')[0].trim()).filter((x) => x.includes(' ')), 120);
  chunks(glMw.map((x) => `Ayer ${x} estuvo. ${x.toUpperCase()} aquí, ${x.toLowerCase()}.`), 20).forEach((cc, n) => w(DIR, `analyze-global-multiword-${String(n).padStart(2, '0')}`, `${key} analyze-raw spelling_global.txt entries (global MultiWordChunker of the hybrid disambiguator)`, 'check-pipe', [{ op: 'analyze-raw', args: { lang: base, texts: cc } }]));

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
  cli('enable-es-rules', ['-l', 'es', '-e', 'ES_WIKIPEDIA_COMMON_ERRORS,SPANISH_WORD_REPEAT_BEGINNING_RULE,ES_REPEATEDWORDS', '--level', 'PICKY', '--json', '-'], 'Mañana me voy. Mañana vuelvo. Mañana se acabó todo. Es excelente. Fue un resultado excelente. Esto es a basto. Vos tenés razón, che.');
  cli('voseo-disabled-default', ['-l', 'es-AR', '--json', '-'], 'Vos tenés razón. Vos tienes razón. Si vos querés, vení.');
  cli('voseo-enable', ['-l', 'es-AR', '-e', 'VOSEO', '--json', '-'], 'Vos tenés razón. Vos tienes razón. Si vos querés, vení.');
  cli('es-ES', ['-l', 'es-ES', '--json', '-'], cliText);
  cli('bitext-basic', ['-l', 'es', '-m', 'en', '-b2', 'input.txt'], null, { 'input.txt': 'There is a dog.\tHay un perro.\nHello world\tHola mundo\n' });
  cli('bitext-stdin', ['-l', 'es', '-m', 'en', '-b2', '-'], 'There is a dog.\tHay un perro.\n');

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
    rq('POST', { language: base, text: 'Mañana me voy. Mañana vuelvo. Mañana se acabó todo.', enabledRules: 'SPANISH_WORD_REPEAT_BEGINNING_RULE', level: 'picky' }),
    rq('POST', { language: 'es-ES', text: T3[2] }), rq('POST', { language: 'es-MX', text: T3[2] }), rq('POST', { language: 'es-AR', text: 'Vos tenés razón.', enabledRules: 'VOSEO' }), rq('POST', { language: 'es-AR', text: 'Vos tienes razón y vos querés.' }),
    rq('POST', { language: base, text: 'Hola, cómo estás?', enabledRules: 'ES_QUESTION_MARK', enabledOnly: 'true' }),
    { method: 'GET', path: '/v2/languages', languagesList: true });
  wh(DIR, 'http', 'http-check', { compare: 'api', normalize: ['buildDate', 'commit'], description: `${key} /v2/check: POST/GET, language variants, auto-detection, options, JSON data, empty text, voseo`, serverArgs: [], requests: reqs });
  return stats;
}

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const key of want.length ? want : Object.keys(CFG)) {
  const s = await gen(key);
  console.log(key, JSON.stringify(s), readdirSync(path.join(ROOT, 'oracle/cases', CFG[key].id)).length, 'cases');
}
