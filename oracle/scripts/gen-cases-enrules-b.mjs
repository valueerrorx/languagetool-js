// Authors oracle/cases/X-ENRULES-B (F48, inputs only). Op: replace-check mode rules (StyleOps). Unit rules reuse X-UNIT. Docs: docs/review/F48-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-ENRULES-B'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const RES = path.join(ROOT, 'resources/org/languagetool');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lines = (f) => readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('#'));
const rop = (lang, ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang, ids, ...extra, cases } });
const C = (text, level = 'DEFAULT') => ({ text, level });
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — “quoted” ‘text’.', 'a'.repeat(300), 'Line one.\nLine two.', 'Tab\tseparated.', '1234 5678.', '😀 emoji 😀.'];
const VARS = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/en/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 220), 400);
const words = corpus.split(/\s+/).filter((x) => /^[A-Za-z]+$/.test(x));

// EN-0053/0183 AvsAn
{
  const a = lines(path.join(RES, 'rules/en/det_a.txt')).map((l) => l.replace(/^\*/, '').trim());
  const an = lines(path.join(RES, 'rules/en/det_an.txt')).map((l) => l.replace(/^\*/, '').trim());
  const common = ['hour', 'honest', 'house', 'umbrella', 'university', 'unicorn', 'MBA', 'FBI', 'NASA', 'URL', 'SQL', 'hotel', 'heir', 'one', 'once', 'user', 'European', 'x-ray', 'hour-long', 'apple', 'orange', 'elephant', 'unit', 'uniform', '8', '11', '18', '80', '1800', '€5', '$5', 'α', 'ice', 'eight', 'eighth', 'historic', 'hotel', 'Ukrainian', 'FAQ', 'HTML', 'LCD', 'IBM', 'ex-wife'];
  const ts = [];
  for (const x of [...pick(a, 100), ...pick(an, 100), ...common]) ts.push(`This is a ${x} here.`, `This is an ${x} here.`, `An ${x} is it.`, `A ${x.toUpperCase()}.`);
  ts.push('a unusual idea', 'an usual idea', 'a  hour', 'a\thour', 'a hour. an unit.', 'a-hour', 'A. B', 'a', 'an', 'a an', 'an a', 'a "hour"', 'an "unit"', "a 'hour'", 'a (hour)', 'a ‘hour’', 'a 1 and an 8 and a 11 and an 11', 'a 1990s boy, an 1990s boy', 'a 10% rise, an 80% rise', 'a US$5 note', 'an $5 note', "a hour's work", 'an historic day', 'a historic day', 'an hotel, a hotel', 'a one-off, an one-off', 'the a', 'a\nhour', 'a ', 'a.', 'an.', ...EDGE);
  for (const l of VARS) w(`avsan-${l}`, `EN-0053/0183 EN_A_VS_AN data-derived (det_a/det_an) + targeted (${l})`, chunks(lv(ts), 50).slice(0, l === 'en-US' ? 99 : 3).map((c) => rop(l, ['EN_A_VS_AN'], c)));
}
// EN-0054/0058/0174 compounds + dash
{
  const raw = lines(path.join(RES, 'resource/en/compounds.txt')).map((l) => l.replace(/\s+#.*$/, '').trim()).filter(Boolean);
  const cl = pick(raw, 160);
  const ts = [];
  for (const c0 of cl) {
    const c = c0.replace(/[+$]$/, '');
    ts.push(`This is ${c.replace(/-/g, ' ')} here.`, `This is ${c} here.`, `${cap(c.replace(/-/g, ' '))} is it.`, `This is ${c.replace(/-/g, ' – ')} here.`, `This is ${c.replace(/-/g, '–')} here.`, `This is ${c.replace(/-/g, '')} here.`, `THIS IS ${c.replace(/-/g, ' ').toUpperCase()}.`);
  }
  ts.push('The by product and the by-product.', 'a long term plan', 'a long-term plan', 'an e mail', 'e - mail', 'e — mail', 'e‐mail', 'co operate and co-operate and co – operate', 'Re use and re-use and re- use.', ...EDGE);
  for (const l of VARS) {
    const ch = chunks(lv(ts), 60);
    w(`compound-${l}`, `EN-0054/0174 EN_COMPOUNDS data-derived (compounds.txt) + targeted (${l})`, (l === 'en-US' ? ch : ch.slice(0, 2)).map((c) => rop(l, ['EN_COMPOUNDS'], c)));
    w(`dash-${l}`, `EN-0058/0174 EN_DASH_RULE (picky) data-derived + targeted (${l}), PICKY and DEFAULT`, [...(l === 'en-US' ? ch : ch.slice(0, 2)).map((c) => rop(l, ['EN_DASH_RULE'], c.map((x) => C(x.text, 'PICKY')))), rop(l, ['EN_DASH_RULE'], lv(ts.slice(0, 30)))]);
  }
}
// EN-0055 apostrophes
{
  const ts = ["It doesn’t work and isn't done.", "It doesn't work and isn’t done.", "It doesn't work.", "It doesn’t work.", "Don't’ ’tis 'tis", "John’s car and Mary's car.", "'quoted' and ‘quoted’ and don't.", "ʼ and ʻ and ’ and ' mixed don't, don’t.", 'Para one with don’t.\n\nPara two with don\'t.', "Here’s one. Here's two. Here’s three.", "Rock ’n’ roll and rock 'n' roll.", "don't don't don’t don’t", ...EDGE];
  for (const s of pick(sentences, 40)) ts.push(s, s.replace(/'/g, '’'), `${s} It doesn’t and it isn't.`);
  w('apostrophes', 'EN-0055 EN_CONSISTENT_APOS (text-level, default off, enabled by id); also ids active in en-GB/en-CA', [...['en-US', 'en-GB', 'en-CA', 'en-AU'].map((l) => rop(l, ['EN_CONSISTENT_APOS'], lv(ts))), rop('en-US', ['EN_CONSISTENT_APOS'], lv(ts.slice(0, 20), 'PICKY'))]);
}
// EN-0056/0184 contractions
{
  const ents = lines(path.join(RES, 'rules/en/contractions.txt')).map((l) => l.split('=')).filter((x) => x.length === 2);
  const ts = [];
  for (const [k, v] of pick(ents.map((x) => x.join('=')), 130).map((x) => x.split('='))) ts.push(`I think ${k} here.`, `${cap(k)} is it.`, `I think ${v} here.`, `THIS IS ${k.toUpperCase()}.`);
  ts.push('I cant go and I can’t go.', 'Wont you? Dont! Isnt it? isnt, Isnt, ISNT', 'Its a dog, it\'s a dog, its’ fine', "he'd hed shed she'd", 'Ill be ill.', 'were were we\'re', 'well we\'ll', 'id I\'d', ...EDGE);
  for (const l of VARS) w(`contraction-${l}`, `EN-0056/0184 EN_CONTRACTION_SPELLING data-derived + targeted (${l})`, chunks(lv(ts), 60).slice(0, l === 'en-US' ? 99 : 2).map((c) => rop(l, ['EN_CONTRACTION_SPELLING'], c)));
}
// EN-0064/0191 repeated words
{
  const syn = lines(path.join(RES, 'rules/en/synonyms.txt')).filter((l) => l.includes('=') && !l.includes('/')).map((l) => l.split('=')[0].trim());
  const ts = [];
  for (const k of syn) ts.push(`This is ${k} and that is ${k} too.`, `I find it ${k}. Later it is ${k} again. And so ${k}.`, `The ${k} thing. The ${cap(k)} idea. Really ${k}.`, `${cap(k)}, ${k}, ${k}, ${k}!`, `It was ${k}.\n\nIt was ${k} indeed and ${k}.`);
  ts.push('We need to talk. I need to see it. We need it and need that. Needed needs needing.', 'I definitely agree. It is definitely good. Definitely so.', 'I chose it. I choose it. I choose to choose.', ...EDGE);
  for (const s of pick(sentences, 60)) ts.push(`${s} ${s}`);
  const ids = ['EN_REPEATEDWORDS'];
  for (const l of VARS) w(`repeatedwords-${l}`, `EN-0064/0191 EN_REPEATEDWORDS (picky) data-derived + targeted (${l}), PICKY and DEFAULT`, [...chunks(lv(ts, 'PICKY'), 40).slice(0, l === 'en-US' ? 99 : 2).map((c) => rop(l, ids, c)), rop(l, ids, lv(ts.slice(0, 20)))]);
  w('repeatedwords-subrules', 'EN-0064 EN_REPEATEDWORDS_DEFINITELY / _CHOOSE and EN_REPEATEDWORDS (explicit ids) on targeted text', [rop('en-US', ['EN_REPEATEDWORDS_DEFINITELY', 'EN_REPEATEDWORDS_CHOOSE', 'EN_REPEATEDWORDS'], lv(ts.slice(-80, -60), 'PICKY').concat(lv(['I definitely agree. It is definitely good. Definitely so.', 'I chose it. I choose it. I choose to choose.'], 'PICKY')))]);
}
// EN-0066/0067 unpaired
{
  const br = ['(', ')', '[', ']', '{', '}'];
  const ts = ['He said (hello.', 'He said hello).', 'He said [hello.', 'He said hello].', 'He said {hello.', 'He said hello}.', 'He said (hello) [world] {x}.', 'He said (hello [world) ].', '1) First item. 2) Second item. a) third. b) fourth', '(a) one (b) two', 'Smiley :) and :( and ;-) and :-(', 'a) b) c)', '(see section 1.2', 'f(x = [1, 2, 3', 'Text (with “quotes) and” stuff.', '"Unpaired quote here.', 'He said "hello.', 'He said hello".', 'He said "hello" and "bye".', 'He said “hello and “bye”.', 'He said “hello” and bye”.', "He said 'hello.", "He said hello'.", "It's the dogs' bone and rock 'n' roll.", "'Tis the season, 'twas the night.", 'He said ‘hello.', 'He said hello’.', 'He said ‘hello’ and ’bye’.', "The 90's and the '90s.", 'He is 5\' 10" tall.', 'The 5" screen and 3\' room.', 'He said, "Hi.\n\nHe said, "Bye."', 'Paragraph one (open.\n\nParagraph two close).', '“Nested ‘single’ quotes” here.', '“Nested ‘single quotes” here.', "He said \"it's “fine” isn't it\".", ...EDGE];
  for (const s of pick(sentences, 50)) { ts.push(s, `(${s}`, `${s})`, `"${s}`, `“${s}”`, `‘${s}`); }
  for (const b of br) ts.push(`${b} alone`, `alone ${b}`, `${b}${b}`);
  for (const l of VARS) w(`unpaired-${l}`, `EN-0066/0067 EN_UNPAIRED_BRACKETS / EN_UNPAIRED_QUOTES targeted + corpus (${l})`, chunks(lv(ts), 60).slice(0, l === 'en-US' ? 99 : 2).map((c) => rop(l, ['EN_UNPAIRED_BRACKETS', 'EN_UNPAIRED_QUOTES'], c)));
  w('unpaired-single', 'EN_UNPAIRED_BRACKETS and EN_UNPAIRED_QUOTES each alone (en-US), DEFAULT and PICKY', ['EN_UNPAIRED_BRACKETS', 'EN_UNPAIRED_QUOTES'].flatMap((id) => [rop('en-US', [id], lv(ts.slice(0, 60))), rop('en-US', [id], lv(ts.slice(0, 40), 'PICKY'))]));
}
// EN-0068/0069 word repeat (beginning) and word repeat
{
  const ts = ['I like it. I like that. I like this.', 'He came. He saw. He conquered.', 'First, we eat. Second, we drink. Third, we sleep.', 'Also, it is good. Also, it is cheap. Also, it is fast.', 'However, it rains. However, we go. However, we stay.', 'Moreover, a. Moreover, b. Moreover, c.', 'Furthermore, a. Furthermore, b.', 'In addition, a. In addition, b. In addition, c.', 'Then we left. Then we ate. Then we slept.', 'But it is. But not here. But why.', 'And one. And two. And three.', 'The cat. The dog. The bird.', 'He ran. He jumped.\n\nHe swam. He fell.', 'Yes. Yes. Yes.', 'Also, a. Additionally, b. Also, c. Additionally, d.', 'Besides, a. Besides, b. Besides, c.', 'Fur- thermore. Fur- thermore.', '1. One. 1. Two. 1. Three.',
    'This is is a test.', 'This is a a test.', 'He had had enough.', 'That that is is that that is not is not.', 'It is what it is.', 'We have to have to go.', 'Hello hello hello.', 'No, no, no!', 'very very good', 'bye bye', 'so so', 'You can can the food.', 'Is is is.', 'The the cat.', 'The The cat.', 'had had had', 'will will', 'might might', 'must must', 'We we go.', 'I I am.', 'etc etc', 'Ha ha ha.', 'tick-tock tick-tock', '1 1 2', 'Paris Paris', 'a a', 'x x', 'is is.', '... ...', 'Mary had a little little lamb.', 'Rock and roll roll.', 'Win win situation, win-win win win.', 'blah blah blah blah', 'Ça ça', 'Straße Straße', ...EDGE];
  for (const s of pick(sentences, 30)) { const f = s.split(' ')[0]; ts.push(`${s} ${s}`, `${s} ${f} is ${f}. ${f} here. ${f} there.`, s.replace(/ (\w+) /, ' $1 $1 ')); }
  for (const l of VARS) {
    w(`wordrepeatbeginning-${l}`, `EN-0068 ENGLISH_WORD_REPEAT_BEGINNING_RULE targeted + corpus (${l}), DEFAULT and PICKY`, [...chunks(lv(ts), 60).slice(0, l === 'en-US' ? 99 : 1).map((c) => rop(l, ['ENGLISH_WORD_REPEAT_BEGINNING_RULE'], c)), rop(l, ['ENGLISH_WORD_REPEAT_BEGINNING_RULE'], lv(ts.slice(0, 30), 'PICKY'))]);
    w(`wordrepeat-${l}`, `EN-0069 ENGLISH_WORD_REPEAT_RULE targeted + corpus (${l})`, chunks(lv(ts), 60).slice(0, l === 'en-US' ? 99 : 1).map((c) => rop(l, ['ENGLISH_WORD_REPEAT_RULE'], c)));
  }
}
// EN-0070/0192 wrong word in context
{
  const ents = lines(path.join(RES, 'rules/en/wrongWordInContext.txt')).map((l) => l.split('\t'));
  const ts = [];
  for (const e of ents) {
    if (e.length < 6) continue;
    const ctx1 = e[4].split('|')[0].replace(/[.*?\[\]()+]/g, ''), ctx2 = e[5].split('|')[0].replace(/[.*?\[\]()+]/g, '');
    const m1 = e[2], m2 = e[3];
    for (const [a, b] of [[e[0], e[1]]]) {
      const base = (x) => x.replace(/[\[\]()?+*]|\|.*/g, '');
      const wa = base(a), wb = base(b);
      ts.push(`The ${ctx1} ${wa} here.`, `The ${ctx1} ${wb} here.`, `The ${ctx2} ${wa} here.`, `The ${ctx2} ${wb} here.`, `${cap(wa)} and ${wb}, ${ctx1}.`, `${ctx1} ${ctx2} ${wa}.`, `${cap(wb)} ${ctx2} and ${ctx1}.`);
      void m1; void m2;
    }
  }
  ts.push('He will prescribe medication to the doctor.', 'He wants to proscribe theft.', 'The heroin addict and the heroine of the novel.', 'The heroine addict. The heroin of the story.', ...EDGE);
  for (const l of VARS) w(`wrongword-${l}`, `EN-0070/0192 ENGLISH_WRONG_WORD_IN_CONTEXT data-derived (wrongWordInContext.txt entries x contexts) + targeted (${l})`, chunks(lv(ts), 60).slice(0, l === 'en-US' ? 99 : 2).map((c) => rop(l, ['ENGLISH_WRONG_WORD_IN_CONTEXT'], c)));
}
// EN-0071 long sentence
{
  const wd = pick(words, 400);
  const sent = (n, sep = ' ', end = '.') => cap(wd.slice(0, n).join(sep)) + end;
  const ts = [];
  for (const n of [1, 5, 20, 39, 40, 41, 42, 60, 100, 200]) ts.push(sent(n));
  ts.push(sent(41, ', '), `${sent(30)} ${sent(45)} ${sent(10)}`, `${sent(41)}\n\n${sent(41)}`, sent(41, ' ', '!'), sent(41, ' ', '?'), sent(41, ' ', ''), wd.slice(0, 20).join(' ') + '; ' + wd.slice(20, 41).join(' ') + '.', wd.slice(0, 20).join(' ') + ', and ' + wd.slice(20, 41).join(' ') + '.', Array(41).fill('a').join(' ') + '.', Array(41).fill('a-b').join(' ') + '.', Array(20).fill("don't").join(' ') + '.', Array(41).fill('1,000').join(' ') + '.', `"${sent(41)}"`, `(${sent(41)})`, wd.slice(0, 41).join(' ') + '.', wd.slice(0, 41).join('  ') + '.', wd.slice(0, 41).join('\n') + '.', ...EDGE);
  for (let i = 0; i < 10; i++) ts.push(pick(sentences.slice(i * 20, i * 20 + 20), 4).join(' '));
  for (const l of VARS) w(`longsentence-${l}`, `EN-0071 TOO_LONG_SENTENCE (en, 40 words, picky) targeted around the boundary + corpus (${l})`, [rop(l, ['TOO_LONG_SENTENCE'], lv(ts, 'PICKY')), rop(l, ['TOO_LONG_SENTENCE'], lv(ts.slice(0, 12))), ...(l === 'en-US' ? [20, 41, 0, -1, 1, 100].map((n) => rop(l, ['TOO_LONG_SENTENCE'], lv(ts.slice(0, 30), 'PICKY'), { config: { TOO_LONG_SENTENCE: [n] } })) : [])]);
}
// EN-0074 too often used
{
  const ids = ['TOO_OFTEN_USED_VERB_EN', 'TOO_OFTEN_USED_NOUN_EN', 'TOO_OFTEN_USED_ADJECTIVE_EN'];
  const paras = [];
  for (let i = 0; i < 8; i++) paras.push(sentences.slice(i * 45, i * 45 + 45).join(' '));
  const rep = (a) => Array(40).fill(a).join(' ');
  const targeted = [rep('The big dog runs. The big dog eats. The big dog sleeps.'), rep('We make things. We make plans. We make food. We have time.'), rep('A good man did a good thing in a good way for a good cause.'), rep('She went to the house and saw the house near the house.'), 'Short text.', ...EDGE];
  for (const l of ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA']) w(`tooofteen-${l}`, `EN-0074 TOO_OFTEN_USED_{VERB,NOUN,ADJECTIVE}_EN (default off; enabled by id) on corpus paragraphs and repeated text (${l})`, [rop(l, ids, lv(paras, 'PICKY')), rop(l, ids, lv(targeted, 'PICKY')), ...ids.map((id) => rop(l, [id], lv([...paras.slice(0, 6), ...targeted.slice(0, 4)], 'PICKY'))), rop(l, ids, lv(paras.slice(0, 4)))]);
  w('tooofteen-config', 'EN-0074 TOO_OFTEN_USED_* with config values (percent thresholds)', [1, 3, 5, 10, 20, 30, 100].map((n) => rop('en-US', ids, lv([...paras.slice(0, 5), ...targeted.slice(0, 4)], 'PICKY'), { config: Object.fromEntries(ids.map((i) => [i, [n]])) })));
}
// all rules of F48 together (explicit ids) on corpus
{
  const ids = ['EN_A_VS_AN', 'EN_COMPOUNDS', 'EN_CONSISTENT_APOS', 'EN_CONTRACTION_SPELLING', 'EN_DASH_RULE', 'EN_REPEATEDWORDS', 'EN_UNPAIRED_BRACKETS', 'EN_UNPAIRED_QUOTES', 'ENGLISH_WORD_REPEAT_BEGINNING_RULE', 'ENGLISH_WORD_REPEAT_RULE', 'ENGLISH_WRONG_WORD_IN_CONTEXT', 'TOO_LONG_SENTENCE', 'METRIC_UNITS_EN_GENERAL', 'METRIC_UNITS_EN_US', 'METRIC_UNITS_EN_IMPERIAL'];
  for (const [l, off] of [['en-US', 0], ['en-GB', 70], ['en-NZ', 140]]) {
    const ss = sentences.slice(off, off + 70);
    w(`corpus-${l}`, `all F48 rules active on corpus sentences (${l}), DEFAULT, PICKY, multi-sentence text`, [rop(l, ids, lv(ss.slice(0, 40))), rop(l, ids, lv(ss.slice(0, 40), 'PICKY')), rop(l, ids, [C(ss.slice(40, 60).join(' '), 'PICKY'), C(ss.slice(60, 70).join('\n\n'), 'PICKY')])]);
  }
  w('combined-targeted', 'F48 rules together: overlapping triggers in one text (en-US, en-GB)', ['en-US', 'en-GB'].map((l) => rop(l, ids, lv(['I cant find a hour in the long term plan (see it. He said "hello.', 'An unit is 6 feet long, a 10 kg unit, an e mail, it is is a a test. Also, it is. Also, no.', 'The heroin addict doesn’t know it isn\'t a e-mail and co – operate.'], 'PICKY'))));
}
console.log('ok');
