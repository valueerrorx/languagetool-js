// Authors oracle/cases/X-DERULES-B (F57, inputs only). Op: replace-check mode rules (StyleOps). Unit rules reuse X-UNIT. Docs: docs/review/F57-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-DERULES-B'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const C = (text, level = 'DEFAULT') => ({ text, level });
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
const rop = (lang, ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang, ids, ...extra, cases } });
const JT = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/test/java/org/languagetool/rules/de');
const RES = path.join(ROOT, 'resources/org/languagetool/rules/de');
const lines = (f) => readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('#'));
function unesc(s) { return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => c[0] === 'u' && c.length === 5 ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', t: '\t', r: '\r' }[c] ?? c)); }
// all string literals (len >= 6) of the given JUnit files, concatenations joined
function lits(...files) {
  const out = [];
  for (const f of files) {
    const p = path.join(JT, f); if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/"\s*\+\s*"/g, '');
    const re = /"((?:[^"\\\n]|\\.)*)"/g; let m;
    while ((m = re.exec(src))) { const s = unesc(m[1]); if (s.length >= 6 && /\s/.test(s) && !/^[A-Z_]+$/.test(s) && !out.includes(s)) out.push(s); }
  }
  return out;
}
const VARS = ['de-DE', 'de-AT', 'de-CH'];
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — „zitiert“ ‚Text‘.', 'a'.repeat(300), 'Zeile eins.\nZeile zwei.', 'Tab\tgetrennt.', '1234 5678.', '😀 Emoji 😀.', 'Der der der der.', 'Ein ein Haus.'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 240), 400);
const ordered = corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 5);
const paras = []; for (let i = 0; i < 8; i++) paras.push(ordered.slice(i * 40, i * 40 + 40).join(' '));
const sub = (ids, level, texts, l = 'de-DE', n = 60, cfg) => chunks(lv(texts, level), n).map((c) => rop(l, ids, c, cfg ? { config: cfg } : {}));
// every (de-DE all texts, AT/CH first chunk) x (DEFAULT, PICKY)
function std(name, desc, ids, texts, { maxAT = 1, n = 60 } = {}) {
  for (const l of VARS) {
    const ops = [...sub(ids, 'DEFAULT', texts, l, n), ...sub(ids, 'PICKY', texts, l, n)];
    w(`${name}-${l}`, `${desc} (${l}), DEFAULT and PICKY`, l === 'de-DE' ? ops : [ops[0], ops[Math.ceil(texts.length / n)]]);
  }
  void maxAT;
}

// DE-0057 filler words + DE-0188 not here; DE-0059 readability; statistic rules
{
  const ids = ['FILLER_WORDS_DE'];
  const t = lits('GermanFillerWordsRuleTest.java');
  const rep = 'Das ist eigentlich ganz einfach halt so, und das ist ja wohl eben auch irgendwie ziemlich sehr gut. ';
  const ts = [...t, rep.repeat(5), rep.repeat(1), '„Das ist ja eigentlich so“, sagte er. Das ist halt ja doch eben so. Er sagte: „Eigentlich ja halt“.', 'Aber eigentlich ist es ja halt eben so ganz einfach nur ziemlich wohl ein bisschen irgendwie recht.', ...EDGE, ...paras];
  std('fillerwords', 'DE-0057 FILLER_WORDS_DE JUnit literals + corpus paragraphs', ids, ts);
  const base = lv([rep.repeat(6), t.join(' '), ...paras.slice(0, 3), 'Das ist halt so. „Das ist ja halt so“, sagte er. Es ist eigentlich ganz einfach. Ja eigentlich halt so.'], 'PICKY');
  const cfgs = [[8, false, false, false], [0, false, false, false], [100, false, false, false], [1, true, false, false], [1, false, true, false], [1, false, false, true], [1, true, true, true], [30, false, true, true], [-1, false, false, false], [101, false, false, false]];
  w('fillerwords-config', 'DE-0057 FILLER_WORDS_DE option values [percent, excludeDirectSpeech, twoFollowing, manyInSentence]', cfgs.map((c) => rop('de-DE', ids, base, { config: { FILLER_WORDS_DE: c } })));
}
{
  const ids = ['READABILITY_RULE_SIMPLE_DE', 'READABILITY_RULE_DIFFICULT_DE'];
  const easy = 'Ich bin da. Du bist da. Er ist da. Wir sind da. Ihr seid da. Sie sind da. Es ist gut. Das geht so. Ja, das passt. Nun gut. ';
  const hard = 'Die verfassungsrechtlichen Rahmenbedingungen der bundesstaatlichen Finanzverfassung erfordern umfangreiche Gesetzgebungsverfahren, deren Durchführungsverordnungen unverhältnismäßig kompliziert ausgestaltet wurden, sodass Rechtsunsicherheiten entstehen. ';
  const ts = [easy.repeat(12), hard.repeat(8), (easy + hard).repeat(6), ...paras, ...pick(sentences, 8), ...EDGE];
  std('readability', 'DE-0059 READABILITY_RULE_SIMPLE_DE/DIFFICULT_DE', ids, ts, { n: 10 });
  w('readability-config', 'DE-0059 readability level 0..6 and invalid', [0, 1, 2, 3, 4, 5, 6, 7, -1].flatMap((n) => ids.map((id) => rop('de-DE', [id], lv([easy.repeat(12), hard.repeat(8), (easy + hard).repeat(6), paras[0], paras[1], paras[2]], 'PICKY'), { config: { [id]: [n] } }))));
}
{
  const pct = ['NON_SIGNIFICANT_VERB_DE', 'PASSIVE_SENTENCE_DE', 'SENTENCE_WITH_MAN_DE', 'SENTENCE_WITH_MODAL_VERB_DE', 'UNNECESSARY_PHRASES_DE'];
  const tgt = {
    NON_SIGNIFICANT_VERB_DE: ['Er macht das und tut es. Sie hat es und ist da. Wir machen, tun, haben, sind. Ich mache es und habe es getan. Er hat gemacht und getan.'.repeat(4), 'Das ist gut. Er hat Zeit. Sie macht Platz. Wir tun nichts.'],
    PASSIVE_SENTENCE_DE: ['Das Haus wurde gebaut. Der Brief wird geschrieben. Das Buch ist gelesen worden. Er wird gesehen. Es wurde getan. Sie wird gerufen.'.repeat(3), 'Der Mann baut das Haus. Das Haus wurde gebaut.'],
    SENTENCE_WITH_MAN_DE: ['Man sagt das so. Man kann es tun. Man muss gehen. Man weiß nie. Man sieht es. Man hört es. Man macht das.'.repeat(3), 'Man weiß es. Er weiß es. Sie wissen es.'],
    SENTENCE_WITH_MODAL_VERB_DE: ['Er kann gehen. Sie muss bleiben. Wir wollen essen. Ihr sollt lernen. Ich darf spielen. Man mag das. Er will es. Sie kann es.'.repeat(3), 'Er kann gehen. Sie geht.'],
    UNNECESSARY_PHRASES_DE: ['Meines Erachtens ist es in der Tat so, dass im Grunde genommen alles klar ist. Es ist offensichtlich, dass es selbstverständlich so ist. Wie bereits erwähnt, ist es letzten Endes sozusagen egal.'.repeat(3), 'Das ist so.'],
  };
  const gen = ['Der Hund läuft schnell durch den großen Garten und bellt laut. Die Katze schläft auf dem Sofa. Er hat gestern ein neues Auto gekauft. Sie wird morgen abreisen.'.repeat(20)];
  for (const id of pct) {
    const jt = id === 'UNNECESSARY_PHRASES_DE' ? lits('UnnecessaryPhraseRuleTest.java') : [];
    const ts = [...tgt[id], ...jt, ...gen, ...paras, `${tgt[id][0]} ${paras[0]}`, ...EDGE];
    std(`stat-${id.toLowerCase().replace(/_de$/, '')}`, `DE-0077/0079/0083/0084/0092 ${id} corpus paragraphs + targeted`, [id], ts, { n: 8 });
    w(`stat-${id.toLowerCase().replace(/_de$/, '')}-config`, `${id} threshold values`, [0, 1, 3, 8, 15, 50, 100, -1, 101].map((n) => rop('de-DE', [id], lv([tgt[id][0], tgt[id][1], paras[0], paras[1], `${tgt[id][0]} ${paras[2]}`], 'PICKY'), { config: { [id]: [n] } })));
  }
  const tou = ['TOO_OFTEN_USED_VERB_DE', 'TOO_OFTEN_USED_NOUN_DE', 'TOO_OFTEN_USED_ADJECTIVE_DE'];
  const rep = (a) => Array(40).fill(a).join(' ');
  const targeted = [rep('Der große Hund läuft. Der große Hund frisst. Der große Hund schläft.'), rep('Wir machen Dinge. Wir machen Pläne. Wir machen Essen. Wir haben Zeit.'), rep('Ein guter Mann tat eine gute Sache auf eine gute Art für einen guten Zweck.'), 'Kurzer Text.', ...EDGE];
  for (const l of VARS) w(`toooften-${l}`, `DE-0089 TOO_OFTEN_USED_{VERB,NOUN,ADJECTIVE}_DE (${l})`, [rop(l, tou, lv(paras, 'PICKY')), rop(l, tou, lv(targeted, 'PICKY')), ...tou.map((id) => rop(l, [id], lv([...paras.slice(0, 5), ...targeted.slice(0, 3)], 'PICKY'))), rop(l, tou, lv(paras.slice(0, 4)))]);
  w('toooften-config', 'DE-0089 TOO_OFTEN_USED_* thresholds', [1, 3, 5, 10, 20, 30, 100, 0, 101].map((n) => rop('de-DE', tou, lv([...paras.slice(0, 5), ...targeted.slice(0, 3)], 'PICKY'), { config: Object.fromEntries(tou.map((i) => [i, [n]])) })));
}

// DE-0058 paragraph repeat beginning
{
  const ids = ['GERMAN_PARAGRAPH_REPEAT_BEGINNING_RULE'];
  const ts = [...lits('GermanParagraphRepeatBeginningRuleTest.java'), 'Der Hund bellt.\n\nDer Hund schläft.', 'Der Hund bellt.\n\nDie Katze schläft.', 'Der Hund bellt.\n\nDer Mann schläft.', 'Ein Hund bellt.\n\nEin Hund schläft.\n\nEin Hund frisst.', 'Das Haus ist alt.\n\nDas Haus ist neu.', 'Er geht.\n\nEr kommt.\n\nEr bleibt.', 'Er geht.\nEr kommt.', 'Er geht.\n\n\n\nEr kommt.', 'Er.\n\nEr.', '„Er geht.“\n\n„Er kommt.“', 'Die\n\nDie', ...EDGE, paras.slice(0, 3).map((p) => p.replace(/(?<=[.!?]) (?=.{200,})/g, '\n\n')).join('\n\n'), ...ordered.slice(0, 60).map((s, i) => (i % 3 ? s : `${s}\n\n${s}`))];
  std('paragraphrepeat', 'DE-0058 GERMAN_PARAGRAPH_REPEAT_BEGINNING_RULE', ids, ts);
}
// DE-0060/0188 repeated words
{
  const ids = ['DE_REPEATEDWORDS'];
  const syn = lines(path.join(RES, 'synonyms.txt')).filter((l) => l.includes('=')).map((l) => l.split('=')[0].trim().replace(/\/.*$/, ''));
  const ts = [...lits('GermanRepeatedWordsRuleTest.java')];
  for (const k of syn) ts.push(`Das ist ${k} und das ist ${k} auch.`, `Ich finde es ${k}. Später ist es wieder ${k}. Und so ${k}.`, `${cap(k)}, ${k}, ${k}, ${k}!`, `Es war ${k}.\n\nEs war ${k} wirklich und ${k}.`);
  ts.push('Wir müssen reden. Ich muss es sehen. Wir brauchen es und brauchen das.', ...pick(sentences, 40).map((s) => `${s} ${s}`), ...paras.slice(0, 4), ...EDGE);
  std('repeatedwords', 'DE-0060/0188 DE_REPEATEDWORDS synonyms.txt-derived + JUnit + corpus', ids, ts, { n: 40 });
}
// DE-0068 style repeated word
{
  const ids = ['STYLE_REPEATED_WORD_RULE_DE'];
  const t = lits('GermanStyleRepeatedWordRuleTest.java');
  const ts = [...t, 'Der Hund läuft. Der Hund bellt. Ein Hund schläft.', 'Er sagte: „Das Auto ist schön. Das Auto ist neu.“ Das Auto fährt.', 'Die Baumhäuser sind schön. Das Haus ist alt. Ein Haus brennt.', 'Wir laufen schnell. Er läuft langsam. Sie liefen weit.', 'Der schöne Garten. Ein schöner Garten. Die schöne Blume.', ...EDGE, ...pick(sentences, 40).map((s, i) => (i % 2 ? s : `${s} ${s}`)), ...paras.slice(0, 3), ...ordered.slice(0, 12).map((_, i) => ordered.slice(i, i + 3).join(' '))];
  std('stylerepeatedword', 'DE-0068 STYLE_REPEATED_WORD_RULE_DE', ids, ts, { n: 40 });
  const base = lv([...t.slice(0, 12), ...ts.slice(t.length, t.length + 5), paras[0]], 'PICKY');
  const cfgs = [[1, false, false], [0, false, false], [2, false, false], [5, false, false], [6, false, false], [-1, false, false], [1, true, false], [1, false, true], [3, true, true]];
  w('stylerepeatedword-config', 'DE-0068 options [maxDistance, excludeDirectSpeech, testCompoundWords]', cfgs.map((c) => rop('de-DE', ids, base, { config: { STYLE_REPEATED_WORD_RULE_DE: c } })));
}
// DE-0069/0070 brackets and quotes
{
  const ids = ['UNPAIRED_BRACKETS', 'DE_UNPAIRED_QUOTES'];
  const ts = [...lits('GenericUnpairedBracketsRuleTest.java', 'GermanUnpairedQuotesRuleTest.java'), 'Er sagte (hallo.', 'Er sagte hallo).', 'Er sagte [hallo.', 'Er sagte {hallo.', 'Er sagte (hallo) [Welt] {x}.', 'Er sagte (hallo [Welt) ].', '1) Erstens. 2) Zweitens. a) drittens. b) viertens', 'Smiley :) und :( und ;-)', '(DBV zufolge', 'Er sagte „Hallo.', 'Er sagte Hallo“.', 'Er sagte „Hallo“ und „Tschüss“.', 'Er sagte »Hallo« und «Tschüss».', 'Er sagte »Hallo.', 'Er sagte ›neues Auto', 'Er sagte „Hallo ‚Welt“ da.', 'Er sagte „Hallo ‚Welt‘ da“.', 'Er sagte "Hallo.', 'Er sagte "Hallo" und "Tschüss".', "Er sagte 'Hallo.", "Das ist Pauls Auto und 'n Ding.", 'Er ist 5\' 10" groß.', 'Absatz eins (offen.\n\nAbsatz zwei zu).', 'Absatz „eins.\n\nAbsatz zwei“.', ...EDGE];
  for (const s of pick(sentences, 50)) ts.push(s, `(${s}`, `${s})`, `„${s}`, `„${s}“`, `»${s}«`, `"${s}`);
  for (const b of ['(', ')', '[', ']', '{', '}', '„', '“', '»', '«', '›', '‹', '‚', '‘', '"', "'"]) ts.push(`${b} allein`, `allein ${b}`, `${b}${b}`);
  std('brackets-quotes', 'DE-0069/0070 UNPAIRED_BRACKETS + DE_UNPAIRED_QUOTES', ids, ts);
  for (const id of ids) w(`${id === 'UNPAIRED_BRACKETS' ? 'brackets' : 'quotes'}-single-de-DE`, `${id} alone (de-DE)`, [rop('de-DE', [id], lv(ts.slice(0, 80))), rop('de-DE', [id], lv(ts.slice(0, 60), 'PICKY'))]);
}
// DE-0071/0072 word repeat (beginning), word repeat
{
  const ts = [...lits('GermanWordRepeatBeginningRuleTest.java', 'GermanWordRepeatRuleTest.java', 'WordRepeatRuleTest.java'), 'Ich mag es. Ich mag das. Ich mag dies.', 'Er kam. Er sah. Er siegte.', 'Außerdem ist es gut. Außerdem ist es billig. Außerdem ist es schnell.', 'Zudem a. Zudem b. Zudem c.', 'Trotzdem a. Trotzdem b. Trotzdem c.', 'Aber es ist. Aber nicht hier. Aber warum.', 'Und eins. Und zwei. Und drei.', 'Der Hund. Der Hund. Der Hund.', 'Außerdem a. Zusätzlich b. Außerdem c. Zusätzlich d.', 'Er lief. Er sprang.\n\nEr schwamm. Er fiel.', 'Das ist ist ein Test.', 'Das ist ein ein Test.', 'Die die Frau.', 'Das das Kind.', 'Der der Mann.', 'Er hat hat gesagt.', 'Wir wir gehen.', 'Ja ja ja.', 'Nein, nein, nein!', 'sehr sehr gut', 'Tschüss tschüss', 'Ha ha ha.', 'Dem dem Hund.', 'Den den Hund.', 'Sie sie kam.', 'Ihr ihr Auto.', 'Es es regnet.', 'Ein Ein Haus.', 'Haus Haus', 'Paris Paris', '1 1 2', 'bla bla bla bla', 'Straße Straße', ...EDGE];
  for (const s of pick(sentences, 30)) { const f = s.split(' ')[0]; ts.push(`${s} ${s}`, `${s} ${f} ist ${f}. ${f} da. ${f} dort.`, s.replace(/ (\w+) /, ' $1 $1 ')); }
  std('wordrepeatbeginning', 'DE-0071 GERMAN_WORD_REPEAT_BEGINNING_RULE', ['GERMAN_WORD_REPEAT_BEGINNING_RULE'], ts);
  std('wordrepeat', 'DE-0072 GERMAN_WORD_REPEAT_RULE', ['GERMAN_WORD_REPEAT_RULE'], ts);
}
// DE-0073/0189 wrong word in context
{
  const ents = lines(path.join(RES, 'wrongWordInContext.txt')).map((l) => l.split('\t'));
  const ts = [...lits('GermanWrongWordInContextRuleTest.java')];
  const base = (x) => x.replace(/[\[\]()?+*]|\|.*/g, '').replace(/\.\*/g, '');
  for (const e of ents) {
    if (e.length < 6) continue;
    const c1 = base(e[4].split('|')[0]), c2 = base(e[5].split('|')[0]), wa = base(e[0]), wb = base(e[1]);
    ts.push(`Der ${c1} ${wa} hier.`, `Der ${c1} ${wb} hier.`, `Der ${c2} ${wa} hier.`, `Der ${c2} ${wb} hier.`, `${cap(wa)} und ${wb}, ${c1}.`, `${c1} ${c2} ${wa}.`, `${cap(wb)} ${c2} und ${c1}.`);
  }
  ts.push(...EDGE);
  std('wrongword', 'DE-0073/0189 GERMAN_WRONG_WORD_IN_CONTEXT entries x contexts + JUnit', ['GERMAN_WRONG_WORD_IN_CONTEXT'], ts);
}
// DE-0074 long sentence
{
  const wd = pick(corpus.split(/\s+/).filter((x) => /^[A-Za-zÄÖÜäöüß]+$/.test(x)), 400);
  const sent = (n, sep = ' ', end = '.') => cap(wd.slice(0, n).join(sep)) + end;
  const ts = [...lits('LongSentenceRuleTest.java')];
  for (const n of [1, 5, 20, 39, 40, 41, 42, 60, 100, 200]) ts.push(sent(n));
  ts.push(sent(41, ', '), `${sent(30)} ${sent(45)} ${sent(10)}`, `${sent(41)}\n\n${sent(41)}`, sent(41, ' ', '!'), sent(41, ' ', '?'), sent(41, ' ', ''), `„${sent(41)}“`, `(${sent(41)})`, wd.slice(0, 41).join('  ') + '.', Array(41).fill('a-b').join(' ') + '.', Array(41).fill('1.000').join(' ') + '.', ...EDGE);
  for (let i = 0; i < 10; i++) ts.push(pick(sentences.slice(i * 20, i * 20 + 20), 4).join(' '));
  for (const l of VARS) w(`longsentence-${l}`, `DE-0074 TOO_LONG_SENTENCE_DE (${l})`, [rop(l, ['TOO_LONG_SENTENCE_DE'], lv(ts, 'PICKY')), rop(l, ['TOO_LONG_SENTENCE_DE'], lv(ts.slice(0, 14))), ...(l === 'de-DE' ? [20, 41, 0, -1, 1, 5, 100, 101].map((n) => rop(l, ['TOO_LONG_SENTENCE_DE'], lv(ts.slice(0, 40), 'PICKY'), { config: { TOO_LONG_SENTENCE_DE: [n] } })) : [])]);
}
// DE-0081 redundant modal, DE-0085 similar names
{
  const ts = [...lits('RedundantModalOrAuxiliaryVerbTest.java'), 'Er hat es machen können.', 'Er hat es gewollt haben.', 'Sie muss es getan haben müssen.', 'Er wird es gemacht haben werden.', 'Ich kann es tun können.', 'Er hätte kommen können können.', ...EDGE, ...pick(sentences, 50)];
  std('redundantmodal', 'DE-0081 REDUNDANT_MODAL_VERB', ['REDUNDANT_MODAL_VERB'], ts);
  const sn = [...lits('SimilarNameRuleTest.java'), 'Herr Meier und Herr Meyer kamen. Frau Müller und Frau Mueller auch.', 'Anna Schmidt traf Anna Schmitt. Hans Huber sah Hans Hubar.', 'Thomas und Tomas und Tommas.', 'Peter ging. Petra kam. Pedro blieb. Peter ging wieder.', 'Mario Mayer und Maria Mayer.', 'Lena, Lina, Lana, Lene.', 'Meier\n\nMeyer\n\nMaier', 'Berlin und Berlim. Hans und Hanns. Karl und Carl.', ...EDGE, ...paras.slice(0, 4)];
  std('similarnames', 'DE-0085 DE_SIMILAR_NAMES (text-level)', ['DE_SIMILAR_NAMES'], sn);
}
// DE-0086/0186 simple replace
{
  const rep = [...lines(path.join(RES, 'replace.txt')), ...lines(path.join(RES, 'replace_custom.txt'))].map((l) => l.split('\t')[0].split('=')[0].replace(/[()?|+*\[\]\\]/g, '').trim()).filter((x) => x.length > 2);
  const ts = [];
  for (const k of pick(uniq(rep), 260)) ts.push(`Das ist ${k} hier.`, `${cap(k)} ist da.`);
  for (const k of rep.slice(0, 40)) ts.push(`Das ist ${k.toLowerCase()} hier.`, `DAS IST ${k.toUpperCase()}.`);
  ts.push('Telefonica Deutschland und Luka Doncic und Nicholas Cage.', 'Busuki und Busukis und Buklees.', 'Conversation Rate und conversation rate.', ...EDGE);
  std('simplereplace', 'DE-0086/0186 DE_SIMPLE_REPLACE replace.txt + replace_custom.txt derived', ['DE_SIMPLE_REPLACE'], ts, { n: 100 });
}
// DE-0087/0088 sentence beginning, short sentences
{
  const ts = ['Der Hund bellt. Der Mann schläft. Der Vogel singt. Die Katze miaut.', 'Er kam. Er sah. Er siegte. Er ging.', 'Ich gehe. Ich laufe. Ich bleibe.', 'Das Haus ist alt. Das Auto ist neu. Das Rad ist kaputt.', 'Der große Hund bellt. Der kleine Hund schläft. Der alte Hund frisst.', 'Er kam. Sie sah. Es siegte.', 'Es ist so. Das ist gut. Ja. Nein. Doch. Gut.', 'Ja. Nein. Doch.', 'Ich. Du. Er. Sie. Es.', 'Ich bin da. Du bist da. Er ist da. Wir sind da.', 'Hallo. Ja. Gut so. Na gut. Dann halt nicht.', '„Ja.“ „Nein.“ „Doch.“ „Gut.“', 'Er kam.\n\nEr sah.\n\nEr siegte.', ...EDGE, ...paras, ...pick(sentences, 30)];
  std('sentencebeginning', 'DE-0087 STYLE_REPEATED_SENTENCE_BEGINNING (text-level)', ['STYLE_REPEATED_SENTENCE_BEGINNING'], ts);
  std('shortsentences', 'DE-0088 STYLE_REPEATED_SHORT_SENTENCES', ['STYLE_REPEATED_SHORT_SENTENCES'], ts);
  const base = lv(ts.slice(0, 13).concat([paras[0]]), 'PICKY');
  const cfgs = [[3, 4, false], [0, 0, false], [2, 4, false], [10, 10, false], [3, 10, false], [3, 1, false], [11, 4, false], [3, 4, true], [-1, -1, false], [2, 2, true]];
  w('shortsentences-config', 'DE-0088 options [count, maxLength, excludeDirectSpeech]', cfgs.map((c) => rop('de-DE', ['STYLE_REPEATED_SHORT_SENTENCES'], base, { config: { STYLE_REPEATED_SHORT_SENTENCES: c } })));
}
// DE-0096/0187 word coherency
{
  const pairs = lines(path.join(RES, 'coherency.txt')).map((l) => l.split(';')).filter((x) => x.length >= 2);
  const ts = [...lits('WordCoherencyRuleTest.java')];
  for (const p of pick(pairs.map((x) => x.join(';')), 200).map((x) => x.split(';'))) { const [a, b] = p; ts.push(`Das ist ${a} und das ist ${b}.`, `${cap(b)} und ${a}.`, `Hier ${a}. Dort ${a}. Da ${b}.`, `THIS ${a.toUpperCase()} ${b}`); }
  ts.push('Photograph und Fotograf. Spaghetti und Spagetti.', 'Das ist 3-D und 3D.', 'Er sagte Photo.\n\nSie sagte Foto.', ...EDGE);
  std('coherency', 'DE-0096/0187 DE_WORD_COHERENCY coherency.txt pairs + JUnit', ['DE_WORD_COHERENCY'], ts, { n: 50 });
}
// full: all F57 text rules on corpus
{
  const ids = ['FILLER_WORDS_DE', 'GERMAN_PARAGRAPH_REPEAT_BEGINNING_RULE', 'READABILITY_RULE_SIMPLE_DE', 'READABILITY_RULE_DIFFICULT_DE', 'DE_REPEATEDWORDS', 'STYLE_REPEATED_WORD_RULE_DE', 'UNPAIRED_BRACKETS', 'DE_UNPAIRED_QUOTES', 'GERMAN_WORD_REPEAT_BEGINNING_RULE', 'GERMAN_WORD_REPEAT_RULE', 'GERMAN_WRONG_WORD_IN_CONTEXT', 'TOO_LONG_SENTENCE_DE', 'NON_SIGNIFICANT_VERB_DE', 'PASSIVE_SENTENCE_DE', 'REDUNDANT_MODAL_VERB', 'SENTENCE_WITH_MAN_DE', 'SENTENCE_WITH_MODAL_VERB_DE', 'DE_SIMILAR_NAMES', 'DE_SIMPLE_REPLACE', 'STYLE_REPEATED_SENTENCE_BEGINNING', 'STYLE_REPEATED_SHORT_SENTENCES', 'TOO_OFTEN_USED_VERB_DE', 'TOO_OFTEN_USED_NOUN_DE', 'TOO_OFTEN_USED_ADJECTIVE_DE', 'EINHEITEN_METRISCH', 'UNNECESSARY_PHRASES_DE', 'DE_WORD_COHERENCY'];
  for (const [l, off] of [['de-DE', 0], ['de-AT', 70], ['de-CH', 140]]) {
    const ss = sentences.slice(off, off + 70);
    w(`full-corpus-${l}`, `all F57 rules active on corpus (${l}), DEFAULT and PICKY`, [rop(l, ids, lv(ss.slice(0, 40))), rop(l, ids, lv(ss.slice(0, 40), 'PICKY')), rop(l, ids, [C(ss.slice(40, 60).join(' '), 'PICKY'), C(ss.slice(60, 70).join('\n\n'), 'PICKY'), C(paras[0], 'PICKY'), C(paras[1], 'DEFAULT')])]);
  }
  w('full-targeted', 'F57 rules together on overlapping triggers (de-DE, de-AT, de-CH)', VARS.map((l) => rop(l, ids, lv(['Man sagt (das so. Er sagte „Hallo. Das ist ist eigentlich ganz einfach halt so, und 5 Meter sind 5 Meter.', 'Meines Erachtens wurde das Haus gebaut. Meier und Meyer kamen. Photo und Foto. Der Hund bellt. Der Hund frisst. Der Hund schläft.', 'Er kam. Er sah. Er siegte. Er kann es machen. Man weiß es.'], 'PICKY'))));
}
console.log('ok');
