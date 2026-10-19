// Authors oracle/cases/X-STYLE/*.json (inputs only). Op style-check: docs/review/F36-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-STYLE');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);
const LANGS = [['en-US', 'en'], ['fr', 'fr'], ['de-DE', 'de']];
const W = { en: ['house', 'green', 'tree', 'runs', 'quickly', 'and', 'the', 'big'], fr: ['maison', 'verte', 'arbre', 'court', 'vite', 'et', 'le', 'grand'], de: ['Haus', 'grünes', 'Baum', 'läuft', 'schnell', 'und', 'der', 'große'] };
const words = (s, n) => Array.from({ length: n }, (_, i) => W[s][i % W[s].length]).join(' ');
const sent = (s, n, end = '.') => { const t = words(s, n); return t.charAt(0).toUpperCase() + t.slice(1) + end; };
const SUF = { en: '', fr: '', de: '_DE' };
const op = (lang, ids, config, cases, extra = {}) => ({ op: 'style-check', args: { lang, ids, ...(config ? { config } : {}), ...extra, cases } });
const C = (text, level = 'PICKY', more = {}) => ({ text, level, ...more });
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

for (const [lang, s] of LANGS) {
  const cp = corpus(s);
  // ---- long sentence (CORE-0259)
  {
    const LS = s === 'de' ? 'TOO_LONG_SENTENCE_DE' : 'TOO_LONG_SENTENCE';
    const texts = [''.padEnd(0), 'x', sent(s, 4), sent(s, 5), sent(s, 6), sent(s, 39), sent(s, 40), sent(s, 41), sent(s, 120),
      `${sent(s, 12, ',')} ${words(s, 12)}; ${words(s, 12)}: ${words(s, 12)}!`, `${sent(s, 7)} ${sent(s, 7)} ${sent(s, 8)}`,
      `${words(s, 6)} 1 2 3 4 5 6 7 8 9 10 - — -- ... "quoted words here" (and (nested) bits) ${words(s, 3)}.`,
      `${sent(s, 3)}\n\n${sent(s, 9)}\n\n${sent(s, 2)}`, `${words(s, 9)}\n${words(s, 9)}.`, `${sent(s, 5).slice(0, -1)}`, 'Ünï cödé wörds éèà ñ ß ' + words(s, 7) + '.', ...cp.slice(0, 4)];
    const ops = [];
    for (const cfg of [null, [5], [6], [4], [40], [100], [1], [0], [-1], [2147483647], [-2147483648], [3, true]]) ops.push(op(lang, [LS], cfg ? { [LS]: cfg } : null, texts.map((t) => C(t))));
    ops.push(op(lang, [LS], null, texts.slice(5, 9).map((t) => C(t, 'DEFAULT'))));
    ops.push(op(lang, [LS], { [LS]: [8] }, texts.slice(0, 12).map((t) => C(t, 'DEFAULT'))));
    ops.push(op(lang, [LS], { [LS]: ['x'] }, [C(sent(s, 9))]));
    ops.push(op(lang, [LS], { [LS]: [true] }, [C(sent(s, 9))]));
    ops.push(op(lang, [LS], { [LS]: [] }, [C(sent(s, 9))]));
    ops.push(op(lang, [LS], { OTHER_ID: [3] }, [C(sent(s, 9)), C(sent(s, 41))]));
    write(`longsentence-${lang}`, `TOO_LONG_SENTENCE ${lang}`, ops);
  }
  // ---- long paragraph (CORE-0260)
  {
    const LS = s === 'de' ? 'TOO_LONG_SENTENCE_DE' : 'TOO_LONG_SENTENCE';
    const para = (n, k) => Array.from({ length: k }, (_, i) => sent(s, n + (i % 3))).join(' ');
    const texts = ['', sent(s, 3), para(5, 2), para(10, 4), para(20, 5), para(30, 6), sent(s, 79), sent(s, 80), sent(s, 81), sent(s, 120),
      `${para(10, 3)}\n\n${para(4, 2)}\n\n${para(15, 7)}`, `${para(10, 4)}\n${para(10, 4)}`, `${para(20, 4)}\r\n\r\n${para(20, 4)}`, `${para(30, 5)}\n\n\n\n${para(2, 1)}`,
      `${words(s, 10)} 1 2 3 , . ; "a b c" (d e f) ${words(s, 5)}`, ...cp.slice(0, 5)];
    const ops = [];
    for (const cfg of [null, [5], [20], [40], [80], [100], [200], [1], [0], [-1], [2147483647]]) ops.push(op(lang, ['TOO_LONG_PARAGRAPH'], cfg ? { TOO_LONG_PARAGRAPH: cfg } : null, texts.map((t) => C(t))));
    ops.push(op(lang, ['TOO_LONG_PARAGRAPH'], { TOO_LONG_PARAGRAPH: [20] }, texts.map((t) => C(t, 'DEFAULT'))));
    ops.push(op(lang, ['TOO_LONG_PARAGRAPH'], { TOO_LONG_PARAGRAPH: ['x'] }, [C(para(10, 4))]));
    ops.push(op(lang, ['TOO_LONG_PARAGRAPH', LS], { TOO_LONG_PARAGRAPH: [15], [LS]: [8] }, texts.slice(0, 12).map((t) => C(t))));
    write(`longparagraph-${lang}`, `TOO_LONG_PARAGRAPH ${lang}`, ops);
  }
  // ---- paragraph rules (CORE-0417..0422): EN has all, FR/DE via direct instantiation of core classes where missing
  {
    const A = sent(s, 4), B = sent(s, 5), Cc = sent(s, 6);
    const ids = [['EMPTY_LINE', 'EmptyLineRule'], ['PUNCTUATION_PARAGRAPH_END', 'PunctuationMarkAtParagraphEnd'], ['PUNCTUATION_PARAGRAPH_END2', 'PunctuationMarkAtParagraphEnd2'], ['WHITESPACE_PARAGRAPH_BEGIN', 'WhiteSpaceAtBeginOfParagraph'], ['WHITESPACE_PARAGRAPH', 'WhiteSpaceBeforeParagraphEnd'], ['PARAGRAPH_REPEAT_BEGINNING_RULE', 'ParagraphRepeatBeginningRule']];
    const open = words(s, 11);
    const texts = ['', '\n', '\n\n', 'x', `${A}\n\n\n\n${B}`, `${A}\n\n${B}`, `${A}\n\n\n\n${B}\n\n\n\n${Cc}`, `${A}\n\n\n\n`, `${A}\n\n\n\n\n\n${B}`, `${A}\r\n\r\n\r\n\r\n${B}`, `${A}\n\r\n\r\n\r\n\r${B}`, `${A}\n\n\n\n${A}`,
      `${A} ${B}\n\n${A} ${B}`, `${A}\n\n${A}\n\n${A}`, `${A}\n\n${B}\n\n${A}\n\n${B}`, `"${A}"\n\n"${B}"`, `The ${A}\n\nThe ${B}`, `Le ${A}\n\nLe ${B}`, `Der ${A}\n\nDer ${B}`, `(${A})\n\n(${B})`, `${A} ${B}\n\n${Cc} ${A}`,
      `${A}   \n\n${B}`, `${A} \n\n${B} `, `${A} \n\n${B}`, `  ${A}\n\n${B}`, `\t${A}\n\n   ${B}`, ` ${A}`, `​${A}`, `\n ${A}`, `${A}​ \n\n${B}`, ` \n\n${A}`,
      `${A} ${B} ${open}`, `${A} ${B} ${words(s, 11)}\n\n${B}`, `${A} ${open}\n\n${A} ${B} ${words(s, 12)}!`, `${A} ${B} ${open}:\n\n${A}`, `${A} ${B} ${open}…\n\n${A}`, `${A} ${B} ${open} ?\n\n${A}`,
      `${A} ${B} ${open}\n\n${A} ${B} http://example.org/a/b`, `${A} ${B} ${open} ftp://example.org/x\n\n${A} ${B}`, `${A} ${B}: https://example.org/very/long/path/to/something/that/is/long/enough\n\n${A} ${B}`,
      `${A} 2.2.2.\n\n${B} ${Cc} ${open}`, `${A} ${B} ${open}"\n\n${B}`, `${A} ${B} ${open}\n${B} ${Cc} ${open}`, `1. ${A}\n\n2. ${B}`, `${A}\n\n${B}\n\n`, `${A} ${B}\n\n${A}`, ...cp.slice(0, 6)];
    const ops = [];
    for (const [id, cls] of ids) {
      const native = s === 'en' || false;
      ops.push(op(lang, native ? [id] : [], null, texts.map((t) => C(t)), native ? {} : { extra: [cls] }));
      ops.push(op(lang, native ? [id] : [], null, texts.slice(0, 20).map((t) => C(t, 'DEFAULT')), native ? {} : { extra: [cls] }));
      ops.push(op(lang, native ? [id] : [], null, texts.slice(0, 20).map((t) => C(t, 'PICKY', { paraMode: 'ONLYNONPARA' })), native ? {} : { extra: [cls] }));
    }
    ops.push(op(lang, s === 'en' ? ids.map((x) => x[0]) : [], null, texts.map((t) => C(t)), s === 'en' ? {} : { extra: ids.map((x) => x[1]) }));
    write(`paragraph-${lang}`, `paragraph-level rules ${lang}`, ops);
  }
  // ---- word repeat beginning (CORE-0262), phrase repeat (0263)
  {
    const sx = { en: ['However', 'Therefore', 'Moreover', 'The', 'Also', 'But', 'And'], fr: ['Cependant', 'Donc', 'De plus', 'Le', 'Aussi', 'Mais', 'Et'], de: ['Jedoch', 'Daher', 'Außerdem', 'Der', 'Auch', 'Aber', 'Und'] }[s];
    const st = (w) => `${w} ${words(s, 4)}.`;
    const texts = ['', st(sx[0]), `${st(sx[3])} ${st(sx[3])}`, `${st(sx[3])} ${st(sx[3])} ${st(sx[3])}`, `${st(sx[3])} ${st(sx[3])} ${st(sx[3])} ${st(sx[3])}`, `${st(sx[0])} ${st(sx[0])}`, `${st(sx[0])} ${st(sx[1])} ${st(sx[0])}`,
      `${st(sx[0])} ${st(sx[0])} ${st(sx[0])}`, `${st(sx[1])} ${st(sx[2])} ${st(sx[1])} ${st(sx[2])}`, `${st(sx[4])} ${st(sx[4])}`, `${st(sx[5])} ${st(sx[5])} ${st(sx[5])}`, `${st(sx[6])} ${st(sx[6])} ${st(sx[6])}`,
      `${st(sx[3])}\n\n${st(sx[3])}\n\n${st(sx[3])}`, `${st(sx[3])}\n${st(sx[3])}\n${st(sx[3])}`, `${st(sx[0].toLowerCase())} ${st(sx[0].toLowerCase())}`, `"${st(sx[3])}" "${st(sx[3])}" "${st(sx[3])}"`, `1. ${st(sx[3])} 2. ${st(sx[3])} 3. ${st(sx[3])}`, `${sx[3]}. ${sx[3]}. ${sx[3]}.`, ...cp.slice(0, 8)];
    const ops = [];
    if (s === 'en') ops.push(op(lang, ['ENGLISH_WORD_REPEAT_BEGINNING_RULE'], null, texts.map((t) => C(t))), op(lang, ['ENGLISH_WORD_REPEAT_BEGINNING_RULE'], null, texts.map((t) => C(t, 'DEFAULT'))));
    else if (s === 'de') ops.push(op(lang, ['GERMAN_WORD_REPEAT_BEGINNING_RULE'], null, texts.map((t) => C(t))));
    else ops.push(op(lang, [], null, texts.map((t) => C(t)), { extra: ['WordRepeatBeginningRule'] }));
    const pr = [ '', 'This is is a test.', 'one two three one two three four', 'a b c a b c a b c', 'he said that that was fine', 'ha ha ha ha', 'bla bla, bla bla', 'ein ein ein', 'le le chat chat dort dort', 'Wir haben haben viel viel Spaß', 'The cat the cat sat. The cat the cat.', 'tic tac tic tac toe toe', '1 2 1 2 3 3', 'x x', 'a a a a a a a a', ...cp.slice(0, 8)];
    ops.push(op(lang, [], null, pr.map((t) => C(t)), { extra: ['PhraseRepeatRule'] }));
    ops.push(op(lang, [], null, pr.map((t) => C(t, 'DEFAULT')), { extra: ['PhraseRepeatRule'] }));
    write(`repeat-${lang}`, `WORD_REPEAT_BEGINNING_RULE and PHRASE_REPEAT_RULE ${lang}`, ops);
  }
  // ---- readability (CORE-0264); fr has none
  if (s !== 'fr') {
    const RS = s === 'de' ? '_DE' : '';
    const easy = { en: 'The cat sat on the mat. It was a big cat. The dog ran to the cat. They had fun. The sun was hot. We go to see it.', fr: 'Le chat est sur le lit. Il est gros. Le chien court. Ils ont joué. Le ciel est bleu. On va voir.', de: 'Die Katze sitzt auf dem Bett. Sie ist groß. Der Hund läuft. Sie spielen. Der Himmel ist blau. Wir gehen hin.' }[s];
    const hard = { en: 'Notwithstanding the aforementioned considerations, the institutional epistemological methodologies necessitate comprehensive reconsideration regarding interdisciplinary collaboration. Characteristically, administrative responsibilities incorporate multidimensional organizational transformations.', fr: 'Nonobstant les considérations susmentionnées, les méthodologies épistémologiques institutionnelles nécessitent une reconsidération approfondie concernant la collaboration interdisciplinaire. Caractéristiquement, les responsabilités administratives incorporent des transformations organisationnelles multidimensionnelles.', de: 'Ungeachtet der vorgenannten Erwägungen erfordern die institutionellen erkenntnistheoretischen Methodologien eine umfassende Neubetrachtung hinsichtlich der interdisziplinären Zusammenarbeit. Charakteristischerweise beinhalten verwaltungstechnische Verantwortlichkeiten mehrdimensionale organisatorische Transformationen.' }[s];
    const texts = ['', 'Hi.', easy, hard, `${easy}\n\n${hard}`, `${easy} ${hard}`, `${hard}\n\n${easy}\n\n${hard}`, words(s, 60), sent(s, 30), Array.from({ length: 20 }, () => sent(s, 2)).join(' '), '1 2 3 4 5 6 7 8 9 10 11 12.', ...cp.slice(0, 6), cp.slice(0, 6).join('\n\n')];
    const ops = [];
    for (const ids of [[`READABILITY_RULE_SIMPLE${RS}`], [`READABILITY_RULE_DIFFICULT${RS}`], [`READABILITY_RULE_SIMPLE${RS}`, `READABILITY_RULE_DIFFICULT${RS}`]]) {
      for (const lv of [null, 0, 1, 2, 3, 4, 5, 6, -1, 7, 100]) {
        const cfg = lv === null ? null : Object.fromEntries(ids.map((i) => [i, [lv]]));
        if (ids.length === 2 && lv !== null && lv > 4) continue;
        ops.push(op(lang, ids, cfg, texts.map((t) => C(t))));
      }
    }
    ops.push(op(lang, [`READABILITY_RULE_SIMPLE${RS}`, `READABILITY_RULE_DIFFICULT${RS}`], null, texts.map((t) => C(t, 'DEFAULT'))));
    write(`readability-${lang}`, `READABILITY_RULE_SIMPLE/DIFFICULT ${lang}`, ops);
  }
  // ---- repeated words (CORE-0432) and too-often-used (0428)
  {
    const rw = { en: 'He saw the tree. Then he saw another tree. The big house is big. I like to like things. Choose a good option. Choose a good choice. It is important and important.', fr: 'Notamment, il est généralement facile de démarrer. Notamment, il doit démarrer maintenant. Il est généralement facile. Maintenant, il bouge. Sérieusement, il bouge sérieusement. Il voit un arbre. Il voit un autre arbre. La grande maison est grande. Je veux faire quelque chose. Il a fait une chose. Il fait un bon choix, un très bon choix.', de: 'Leider kam er außerdem zu spät. Leider war das außerdem teuer, nun ist es meist so. Es ist meist so, nun ja. Das ist hervorragend. Es ist wirklich hervorragend und beeindruckend. Er sieht einen Baum. Dann sieht er einen anderen Baum. Das große Haus ist groß. Ich mache etwas. Er macht eine Sache. Es ist wichtig und wichtig.' }[s];
    const texts = ['', 'Hi.', rw, `${rw}\n\n${rw}`, Array.from({ length: 6 }, () => rw).join(' '), `${sent(s, 6)} ${sent(s, 6)}`, `${rw.split('. ').slice(0, 2).join('. ')}.`, 'He did it. He did it again. And again he did it. Then he did it once more, did it, did it.', ...cp.slice(0, 8)];
    const ops = [];
    const id = `${s.toUpperCase()}_REPEATEDWORDS`;
    ops.push(op(lang, [id], null, texts.map((t) => C(t))), op(lang, [id], null, texts.map((t) => C(t, 'DEFAULT'))));
    if (s !== 'fr') {
      const pre = s === 'en' ? ['TOO_OFTEN_USED_VERB_EN', 'TOO_OFTEN_USED_NOUN_EN', 'TOO_OFTEN_USED_ADJECTIVE_EN'] : ['TOO_OFTEN_USED_VERB_DE', 'TOO_OFTEN_USED_NOUN_DE', 'TOO_OFTEN_USED_ADJECTIVE_DE'];
      const long = [cp.slice(0, 12).join('\n\n'), Array.from({ length: 12 }, () => rw).join(' '), Array.from({ length: 12 }, () => rw).join('\n\n'), cp.slice(0, 3).join(' '), '', 'Hi.'];
      for (const i of pre) {
        for (const pc of [null, 1, 2, 5, 10, 50, 100, 0, -1, 101]) ops.push(op(lang, [i], pc === null ? null : { [i]: [pc] }, long.map((t) => C(t))));
      }
      ops.push(op(lang, pre, null, long.map((t) => C(t, 'DEFAULT'))));
    }
    write(`repwords-${lang}`, `repeated words / too often used ${lang}`, ops);
  }
}

// ---- de-only statistic/style rules (CORE-0427, 0429..0431)
{
  const lang = 'de-DE';
  const cp = corpus('de');
  const base = 'Meines Erachtens ist das in der Tat mehr oder weniger ein bisschen an sich ganz und gar nötig, ohne Zweifel. Er hat eigentlich nur ganz einfach gesagt, dass das ja wohl eben so sein muss. Man sollte halt doch mal schauen. Das wurde von ihm gemacht. Und dann kam sie. Aber er blieb. Sie kann es machen. Es ist wohl ziemlich schwierig. „Das ist ja eigentlich nur so“, sagte er. Man muss das tun.';
  const texts = ['', 'Hallo.', base, `${base}\n\n${base}`, `${base} ${base} ${base}`, 'Er kommt. Sie geht. Wir bleiben.', 'Der Mann sieht den Mann. Der Mann sieht den Mann nicht. Der Mann sieht den Hund.', `Der Hund bellt. Der Hund beißt. Der Hund rennt. Dann sagt er: „Der Hund hat Hunger.“ Der Hund bellt laut.`, ...cp.slice(0, 8)];
  const ids = ['FILLER_WORDS_DE', 'NON_SIGNIFICANT_VERB_DE', 'UNNECESSARY_PHRASES_DE', 'PASSIVE_SENTENCE_DE', 'SENTENCE_WITH_MODAL_VERB_DE', 'SENTENCE_WITH_MAN_DE', 'SENTENCE_BEGINNING_WITH_CONJUNCTION_DE'];
  const ops = [];
  for (const id of ids) {
    for (const cfg of [null, [0], [1], [8], [10], [20], [50], [100], [101], [-1], [10, true], [10, false], [0, false]]) ops.push(op(lang, [id], cfg ? { [id]: cfg } : null, texts.map((t) => C(t))));
    ops.push(op(lang, [id], null, texts.map((t) => C(t, 'DEFAULT'))));
  }
  write('statistic-de-DE', 'AbstractStatistic*/AbstractFillerWords de-DE', ops);
  const sw = 'Er sagt das Wort. Dann sagt er das Wort wieder. „Das Wort ist gut“, sagte er. Das Wort war gut. Sie sah das Haus und das Haus war groß. Er ging nach Hause, dann ging er nach Hause.';
  const t2 = ['', sw, `${sw}\n\n${sw}`, 'Der Hund und der Hund.', 'Das Haus. Das Haus. Das Haus. Das Haus.', ...cp.slice(0, 8)];
  const ops2 = [];
  const id = 'STYLE_REPEATED_WORD_RULE_DE';
  for (const cfg of [null, [0], [1], [2], [3], [5], [6], [-1], [1, false], [1, true], [3, false], [0, false], [5, false]]) ops2.push(op(lang, [id], cfg ? { [id]: cfg } : null, t2.map((t) => C(t))));
  ops2.push(op(lang, [id], null, t2.map((t) => C(t, 'DEFAULT'))));
  ops2.push(op(lang, [id], { [id]: ['x'] }, [C(sw)]));
  write('stylerepeated-de-DE', 'STYLE_REPEATED_WORD_RULE_DE de-DE', ops2);
}
// ---- other languages: AdvancedWordRepeatRule (pl/ru subclasses), AbstractFillerWordsRule (ru)
{
  const ops = [];
  ops.push(op('pl-PL', ['PL_WORD_REPEAT'], null, ['', 'Ala ma kota. Ala ma psa i kota.', 'To jest to samo to samo słowo w zdaniu, które jest w zdaniu.', 'Dom jest duży, a dom jest mały. Dom.'].map((t) => C(t))));
  ops.push(op('ru-RU', ['RU_WORD_REPEAT'], null, ['', 'Мама мыла раму. Мама мыла раму и маму.', 'Это дом, и это дом, который стоит в доме.'].map((t) => C(t))));
  ops.push(op('ru-RU', ['FILLER_WORDS_RU'], null, ['', 'Ах, это очень хорошо. Однако, вау, эээ, ох, всё э ух. Ну вот, всё.'].map((t) => C(t))));
  ops.push(op('ru-RU', ['FILLER_WORDS_RU'], { FILLER_WORDS_RU: [1] }, ['', 'Ах, это очень хорошо. Однако, вау, эээ, ох, всё э ух. Ну вот, всё.'].map((t) => C(t))));
  write('other-langs', 'AdvancedWordRepeatRule / AbstractFillerWordsRule via pl/ru', ops);
}
