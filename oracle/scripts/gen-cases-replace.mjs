// Authors oracle/cases/X-REPLACE/*.json (inputs only). Op replace-check: docs/review/F37-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-REPLACE');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const M = path.join(ROOT, 'oracle/java-src/languagetool-language-modules');
const res = (l, kind, rel) => path.join(M, l, 'src/main/resources/org/languagetool', kind, l, rel);
const lines = (f) => readFileSync(f, 'utf8').split('\n').filter((x) => x && !x.startsWith('#'));
const pick = (arr, n) => { const st = Math.max(1, Math.floor(arr.length / n)); return arr.filter((_, i) => i % st === 0).slice(0, n); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const op = (lang, ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang, ids, ...extra, cases } });
const C = (text, level = 'DEFAULT', more = {}) => ({ text, level, ...more });
const LV = (texts) => texts.map((t) => C(t));
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
// variant spellings of a phrase
const variants = (p) => [p, cap(p), p.toUpperCase(), p.toLowerCase()];

// ---- CORE-0265 WrongWordInContext
{
  const en = [
    'The doctor will prescribe medication for the patient.', 'The doctor will proscribe medication for the patient.', 'The law will prescribe theft and murder.', 'The law will proscribe theft and murder.', 'The king proscribes murder.',
    'The heroin addict took morphine.', 'The heroine addict took morphine.', 'The heroine of the novel is brave.', 'The heroin of the novel is brave.', 'Heroin is a drug. Heroine is in the story.',
    'We went to the bazaar to buy goods.', 'We went to the bizarre to buy goods.', 'That was a bizarre incident.', 'That was a bazaar incident.',
    'The bridal dress was in the shop.', 'The bridle dress was in the shop.', 'The horse wore a bridal and harness.', 'The horse wore a bridle and harness.',
    'The dessert menu has chocolate cakes.', 'The desert menu has chocolate cakes.', 'The camels crossed the dessert.', 'The camels crossed the desert.', 'Desserts and cookies, deserts and camels.',
    'The statutes of the senators were passed.', 'The statues of the senators were passed.', 'The marble statutes stood in the temple.', 'The marble statues stood in the temple.',
    '', 'prescribe', 'PRESCRIBE medication', 'Prescribe medication. Proscribe theft.', 'He had to prescribe medicine; the law will proscribe murder.', 'heroin heroine heroin heroine addict literature',
  ];
  const de = [
    'Der Laib Brot liegt auf dem Tisch.', 'Der Leib Brot liegt auf dem Tisch.', 'Der Leib und die Seele sind eins.', 'Der Laib und die Seele sind eins.', 'Der Laib Käse wiegt viel.',
    'Der Laich der Fische liegt im Wasser.', 'Die Leichen der Fische liegen im Wasser.', 'Die Laichen sind gestorben.', 'Die Leichen sind gestorben.',
    'Die Mine explodierte unterirdisch.', 'Die Miene explodierte unterirdisch.', 'Sie verzog die Mine.', 'Sie verzog die Miene.', 'Eine neue Mine im Kugelschreiber.',
    'Die Sole ist eine Lösung mit Salz.', 'Die Sohle ist eine Lösung mit Salz.', 'Die Sole des Schuhs ist ruhig.', 'Die Sohle des Schuhs ist ruhig.',
    'Der Vers verletzt den Fuß.', 'Die Fersen des Gedichts.', 'Das Neutron und das Proton im Atomkern.', 'Das Neuron und das Proton im Atomkern.', 'Das Neuron und das Axon im Cortex.', 'Das Neutron und das Axon im Cortex.',
    '', 'Laib', 'LAIB Brot', 'Minen ... Mienen. Der Laib Brot.', 'Überschrift: Käse und Laibe, Leibe und Blut.',
  ];
  write('wrongword-en-US', 'CORE-0265 en', chunks(LV(en), 8).map((c) => op('en-US', ['ENGLISH_WRONG_WORD_IN_CONTEXT'], c)));
  write('wrongword-de-DE', 'CORE-0265 de', chunks(LV(de), 8).map((c) => op('de-DE', ['GERMAN_WRONG_WORD_IN_CONTEXT'], c)));
}

// ---- CORE-0270 AbstractSimpleReplaceRule (EN_CONTRACTION_SPELLING) / CORE-0271 AbstractSimpleReplaceRule2 (EN/DE replace) / 0426 CheckCase (nl, ca)
{
  const con = lines(res('en', 'rules', 'contractions.txt')).map((l) => l.split('=')[0]);
  const ts = [];
  for (const w of pick(con, 40)) ts.push(`I think ${w} fine.`, `${cap(w)} is it.`);
  ts.push('', 'dont', 'Dont. Cant. Wont.', 'He said dont and cant and wont.', 'dont-cant', '"dont"', 'DONT', "don't", 'I dont, you cant, we wont, they shouldnt.', 'Ünï dont');
  write('contractions-en-US', 'CORE-0270 EN_CONTRACTION_SPELLING', chunks(LV(ts), 16).map((c) => op('en-US', ['EN_CONTRACTION_SPELLING'], c)));
  const rep = (f) => lines(f).map((l) => l.split('=')[0].split('|')).flat();
  const en = rep(res('en', 'rules', 'replace.txt'));
  const ens = [];
  for (const w of pick(en, 50)) ens.push(`This is ${w} here.`, `${cap(w)} is it.`, `THIS IS ${w.toUpperCase()}.`);
  ens.push('', 'bussines', 'Bussines. bussiness.', 'a bussines, bussiness and disencourage', 'crohns disease and chron\'s disease', 'Crohns Disease', 'The kickass, kickass-like thing', 'x bussines y\nz bussiness');
  const enops = chunks(LV(ens), 20).map((c) => op('en-US', ['EN_SIMPLE_REPLACE'], c));
  enops.push(op('en-US', ['EN_US_SIMPLE_REPLACE', 'EN_SIMPLE_REPLACE'], LV(['The colour of the centre.', 'The color of the center.', 'I like favourite things and favorite things.'])));
  write('replace-en-US', 'CORE-0270/0271 EN replace', enops);
  for (const v of ['en-GB', 'en-NZ', 'en-AU', 'en-CA', 'en-ZA']) {
    write(`replace-${v}`, `CORE-0271 ${v} variant replace`, [op(v, ['EN_GB_SIMPLE_REPLACE', 'EN_US_SIMPLE_REPLACE', 'EN_NZ_SIMPLE_REPLACE', 'EN_SIMPLE_REPLACE', 'EN_AU_SIMPLE_REPLACE', 'EN_CA_SIMPLE_REPLACE', 'EN_ZA_SIMPLE_REPLACE'],
      LV(['The colour of the centre was nice.', 'The color of the center was nice.', 'I realise my favourite organisation, but the organization is grey/gray.', 'The program and the programme; tyre and tire; the cheque and check.', 'Aluminium and aluminum. Licence and license.']))]);
  }
  write('profanity-en-US', 'CORE-0271 profanity/plain english/diacritics', [op('en-US', ['PROFANITY', 'EN_PLAIN_ENGLISH_REPLACE', 'EN_DIACRITICS_REPLACE_ORTHOGRAPHY', 'EN_DIACRITICS_REPLACE'],
    LV(['The shit hit the fan.', 'In the event that you ask, a number of people utilize the cafe.', 'The naive facade of the cafe at the resume.', 'The naïve façade of the café.', 'We will utilize and facilitate. In order to; due to the fact that.', 'Fuck this.', 'I will assist you, a majority of the time.']))]);
  const de = rep(res('de', 'rules', 'replace.txt'));
  const des = [];
  for (const w of pick(de, 50)) des.push(`Das ist ${w} hier.`, `${w.toLowerCase()} dort.`, `${w.toUpperCase()}!`);
  des.push('', 'Jo Biden', 'jo biden', 'Jo Biden und Nicky Minaj.', 'Nicholas Cage, Nicholas  Cage', 'Conversation Rate\nConversation Raten', 'Das war Jo Bidens Rede. Jo-Biden.');
  write('replace-de-DE', 'CORE-0270/0271 DE replace', chunks(LV(des), 20).map((c) => op('de-DE', ['DE_SIMPLE_REPLACE'], c)));
  // check case (AbstractCheckCaseRule via nl, ca)
  const nl = lines(res('nl', 'rules', 'check_case.txt')).map((l) => l.split('=')[0]);
  const nls = [];
  for (const p of pick(nl, 30)) nls.push(...variants(p).map((v) => `Dat is ${v} hier.`), `${p.toLowerCase()} begint.`);
  nls.push('', 'aaw', 'Wat is aaw?', 'AAW AOW abw', 'Dit is 3d en 3D.');
  write('checkcase-nl', 'CORE-0426 NL_CHECKCASE', chunks(LV(nls), 20).map((c) => op('nl', ['NL_CHECKCASE'], c)));
  const ca = lines(res('ca', 'rules', 'check_case.txt')).map((l) => l.split('=')[0]);
  const cas = [];
  for (const p of pick(ca, 30)) cas.push(...variants(p).map((v) => `Aquest és ${v} aquí.`), `${p.toLowerCase()} comença.`);
  cas.push('', 'joan pau', 'Joan pau i josep maria.', 'JOAN PAU', 'Joan Pau.');
  write('checkcase-ca', 'CORE-0426 CA_CHECKCASE', chunks(LV(cas), 20).map((c) => op('ca-ES', ['CA_CHECKCASE'], c)));
}

// ---- CORE-0272 compound, 0273 dash
{
  const en = lines(res('en', 'rules', 'compounds.txt').replace('/rules/', '/resource/'));
  const ts = [];
  const ent = pick(en, 60).map((l) => l.replace(/[+*?$]$/, ''));
  for (const w of ent) { const sp = w.replace(/-/g, ' '); ts.push(`This is a ${sp} here.`, `This is a ${w} here.`, `This is a ${sp.replace(/ /g, '')} here.`, `${cap(sp)} is it.`, `THIS ${sp.toUpperCase()}.`); }
  ts.push('', 'back fire', 'back fired back fires', 'The back fire and the back-fire and backfire.', 'a b c d e f g h i j', 'fish bowls fish hook fish hooks', 'an other', 'another an-other');
  write('compound-en-US', 'CORE-0272 EN_COMPOUNDS', chunks(LV(ts), 25).map((c) => op('en-US', ['EN_COMPOUNDS'], c)));
  const de = [...lines(res('de', 'resource', 'compounds.txt')), ...lines(res('de', 'resource', 'compound-cities.txt'))];
  const dts = [];
  for (const w of pick(de, 70).map((l) => l.replace(/[+*?$]$/, ''))) { const sp = w.replace(/-/g, ' '); dts.push(`Das ist ${sp} hier.`, `Das ist ${w} hier.`, `Das ist ${sp.replace(/ /g, '')} hier.`, `${cap(sp)} ist es.`, `Das ist ${sp.toLowerCase()}.`); }
  dts.push('', 'After Show Party', 'After Work Partys und Chat Room', 'Chat Room Chat Rooms', 'Cliff hanger', 'Annaberg Buchholz', 'Gau Algesheim und Gau Algesheims', 'Das ist ein Chat-Room.', 'Chatroom');
  write('compound-de-DE', 'CORE-0272 DE_COMPOUNDS', chunks(LV(dts), 25).map((c) => op('de-DE', ['DE_COMPOUNDS'], c)));
  // dash rule (AhoCorasick user)
  const hy = en.filter((l) => !/[+?]$/.test(l)).map((l) => l.replace(/[*$]$/, '')).filter((w) => w.includes('-'));
  const dts2 = [];
  for (const w of pick(hy, 40)) for (const d of [' – ', '–', ' — ', '—', ' - ', ' -- ']) dts2.push(`This is ${w.replace(/-/g, d)} here.`);
  dts2.push('', 'T — shirt', 'T – shirt', 'T—shirt', 'T-shirt', 'T – shirt and T — shirt', 'x-ray x – ray X – ray', '—T–shirt', 'back – fire – fired', 'back–fire–s', 'pre–  empt', 'e – mail, e–mail, e — mail');
  write('dash-en-US', 'CORE-0273/0449 EN_DASH_RULE', [...chunks(dts2, 30).map((c) => op('en-US', ['EN_DASH_RULE'], c.map((t) => C(t, 'PICKY')))), op('en-US', ['EN_DASH_RULE'], LV(dts2.slice(0, 12)))]);
}

// ---- CORE-0449 AhoCorasickDoubleArrayTrie direct
{
  const E = (...a) => a.map((k) => [k, k.toUpperCase()]);
  const sets = {
    simple: E('he', 'she', 'his', 'hers'),
    overlap: E('a', 'ab', 'abc', 'bc', 'c', 'abcd', 'bcd', 'cd'),
    nested: E('t-shirt', 'shirt', 'e-mail', 'mail', 'x-ray'),
    unicode: E('über', 'ÜBER', 'straße', 'ß', 'groß-', 'é', '日本', '日本語', '😀', '😀😀'),
    prefix: E('a', 'aa', 'aaa', 'aaaa'),
    dashlike: [['T-shirt', 'T-shirt'], ['T – shirt', 'T-shirt'], ['e-mail', 'e-mail'], ['x – ray', 'x-ray']],
    single: E('x'),
    empty: [],
    dupkey: [['k', 'first'], ['k', 'second']],
    emptykey: [['', 'EMPTY'], ['a', 'A']],
    sparse: E('zzz', 'abc', 'abd', 'abe', 'xbc', 'xbd'),
  };
  const texts = ['', 'a', 'ushers', 'ahishers', 'abcd', 'aaaa', 'aaaaa', 'abcabcd', 'T-shirt and e-mail, x-ray', 'T – shirt, x – ray', 'Über ÜBER über straße groß-ß', 'é日本語日本😀😀😀', 'x', 'xx', 'abcdbcd', 'zzzabcxbdabe', 'kk', 'a\nab\tabc', 'ABC', 'cdabc'];
  const ops = [];
  for (const [n, entries] of Object.entries(sets)) for (const map of ['tree', 'linked', 'hash']) ops.push({ op: 'replace-check', args: { mode: 'aho', map, entries, texts, get: [...entries.map((e) => e[0]), 'nokey', ''] } });
  // many keys (double-array resize), longer texts
  const many = Array.from({ length: 400 }, (_, i) => `w${i.toString(36)}x${i % 7}`);
  const big = many.slice(0, 120).join(' ') + ' wrongw5x2 w1x1w2x2';
  for (const map of ['tree', 'linked']) ops.push({ op: 'replace-check', args: { mode: 'aho', map, entries: many.map((k) => [k, `v-${k}`]), texts: [big, big.toUpperCase(), 'w1x1 w2x2 w3x3'], get: many.slice(0, 5) } });
  write('aho-corasick', 'CORE-0449 AhoCorasickDoubleArrayTrie 1.2.2', ops);
}

// ---- CORE-0274 confusion set loader, CORE-0279 short descriptions
{
  const files = {
    basic: 'their; there; 10\nto; too; 5\n',
    desc: 'affect|to influence; effect|result; 20\nthan; then; 3\n',
    oneway: 'bad -> bat; 4\nfoo -> bar; 8\n',
    comment: '# comment\n\nlie; lay; 7 # trailing\nsee; sea; 2 #x\n',
    unordered: 'zebra; apple; 3\n',
    twice: 'a; a; 3\n',
    badfactor: 'a; b; x\n',
    twoparts: 'a; b\n',
    fourparts: 'a; b; c; 3\n',
    bigfactor: 'a; b; 9223372036854775807\nc; d; 9223372036854775808\n',
    negfactor: 'a; b; -5\nc; d; 0\n',
    multi: 'a; b; 1\na; c; 2\nb; c; 3\n',
    unicode: 'Über; über; 3\nschon; schön; 4\nGroß|große; Gross|kleine; 5\n',
    upper: 'cat; dog; 3\nCat; Dog; 4\n',
    crlf: 'a; b; 1\r\nc; d; 2\r\n',
    emptyfile: '',
    spaces: ' a ; b ; 3\n',
    tabsep: 'a\t; b; 3\n',
    defs: 'accept; except; 2\nabstruse; abstract; 1\naccess; excess; 5\n',
    pipeempty: 'a|; b; 2\n',
    pipetwo: 'a|x|y; b; 2\n',
    mixeddir: 'a; b; 1 # -> not oneway\nc -> d; 1 # ; e\n',
  };
  const ops = [];
  for (const lang of ['en-US', 'de-DE']) for (const [n, f] of Object.entries(files)) ops.push({ op: 'replace-check', args: { mode: 'confusion', lang, file: f } });
  ops.push({ op: 'replace-check', args: { mode: 'confusion', lang: 'de-DE', file: 'Biest; Briest; 1\nach; als; 2\nalso; auch; 3\n' } });
  // real files
  for (const [lang, f] of [['en-US', 'confusion_sets.txt'], ['de-DE', 'confusion_sets.txt']]) {
    const p = path.join(ROOT, 'oracle/java-src/languagetool-language-modules', lang.slice(0, 2), 'src/main/resources/org/languagetool/resource', lang.slice(0, 2), f);
    try { ops.push({ op: 'replace-check', args: { mode: 'confusion', lang, file: readFileSync(p, 'utf8') } }); } catch { /* missing file */ }
  }
  write('confusion-sets', 'CORE-0274 ConfusionSetLoader/Pair/String', ops);
  const wd = (l) => lines(res(l, 'resource', 'word_definitions.txt')).map((x) => x.split('\t')[0]);
  const sd = [];
  for (const l of ['en-US', 'de-DE', 'fr', 'es', 'nl']) {
    const real = l === 'en-US' || l === 'de-DE' ? wd(l.slice(0, 2)) : [];
    sd.push({ op: 'replace-check', args: { mode: 'shortdesc', lang: l, words: [...pick(real, 60), '', 'nonexistent', 'ABSTRUSE', 'accept', 'Biest', 'biest', 'als', 'auch ', ' auch', '#able', 'zzz'] } });
  }
  write('shortdesc', 'CORE-0279 ShortDescriptionProvider', sd);
  // short descriptions visible in suggestions are exercised via confusion files (defs) and replace rules
}

// ---- CORE-0275 word coherency
{
  const pairs = (f) => lines(f).map((l) => l.split(';'));
  const en = pairs(res('en', 'rules', 'coherency.txt').replace('/en/en/', '/en/'));
  const sample = pick(en, 30);
  const ts = [];
  for (const [a, b] of sample) { ts.push(`We use ${a} here. And later we use ${b} there.`, `We use ${b} here. Then ${a} there. Then ${b} again.`, `${cap(a)} first.\n\nThen ${b}.`, `${a} ${a} ${a}.`, `${a} and ${b}`); }
  ts.push('', 'x', 'We organise and then organize.', 'We organize and then organise. We organize again. We organise.', 'Organise! Organize? organise, organize; ORGANISE and ORGANIZE.', 'colour or color', 'absolutise absolutize absolutise', 'Absolutisation. absolutization.');
  const mk = (id, lang, arr) => chunks(LV(arr), 15).map((c) => op(lang, [id], c));
  write('coherency-en-US', 'CORE-0275 EN_WORD_COHERENCY', mk('EN_WORD_COHERENCY', 'en-US', ts));
  const de = pairs(res('de', 'rules', 'coherency.txt').replace('/de/de/', '/de/'));
  const dts = [];
  for (const [a, b] of pick(de, 40)) { dts.push(`Wir nutzen ${a} hier. Und später ${b} dort.`, `Wir nutzen ${b} hier. Dann ${a} dort. Dann ${b} wieder.`, `${a}\n\n${b}`, `${a} ${a}.`, `${a} und ${b}`); }
  dts.push('', 'Das 3-D und 3D Bild.', 'Abnützung und Abnutzung.', 'Abnutzung. Abnützung. abnützung.', 'ABNÜTZUNG und abnutzung', 'Der Audiorecorder und der Audiorekorder. Der Audiorekorder.');
  write('coherency-de-DE', 'CORE-0275 DE_WORD_COHERENCY', mk('DE_WORD_COHERENCY', 'de-DE', dts));
  // paragraph mode and level
  write('coherency-modes', 'CORE-0275 paraMode/levels', [
    op('en-US', ['EN_WORD_COHERENCY'], [C('We organise.\n\nWe organize.', 'DEFAULT', { paraMode: 'NORMAL' }), C('We organise.\n\nWe organize.', 'DEFAULT', { paraMode: 'ONLYPARA' }), C('We organise. We organize.', 'PICKY'), C('We organise.\n\nWe organize.', 'DEFAULT', { paraMode: 'ONLYNONPARA' })]),
  ]);
}

// ---- CORE-0425 specific case (EN)
{
  const ph = pick(lines(res('en', 'resource', 'specific_case.txt')), 50);
  const ts = [];
  for (const p of ph) ts.push(`I like ${p.toLowerCase()} very much.`, `${cap(p.toLowerCase())} is great.`, `I like ${p.toUpperCase()}.`, `I like ${p}.`, `Visit ${p.split(' ').map((w) => w.toLowerCase()).join(' ')}, then go on.`);
  ts.push('', 'harry potter', 'Harry potter', 'harry Potter and elon musk. Elon musk', 'I met harry potter and stephen hawking.', 'air france, air canada and Air canada', 'empire state building', '"empire state building"', 'Harry  Potter', "harry potter's book", 'the empire state building. The Empire State Building.', 'Dr. harry potter');
  write('specificcase-en-US', 'CORE-0425 EN_SPECIFIC_CASE', chunks(LV(ts), 25).map((c) => op('en-US', ['EN_SPECIFIC_CASE'], c)));
}

// ---- CORE-0423 punctuation check (uk), 0424 space before conjunction (fa, km)
{
  const ps = ['', 'Привіт, світ.', 'Привіт,, світ.', 'Привіт.. світ.', 'Привіт... світ.', 'Привіт!!! Як справи???', 'Привіт ?! ', 'Що?!! Ні.', 'Привіт , , світ.', 'Привіт ,. світ', 'Привіт: - світ', 'Привіт, - світ', 'Привіт,- світ', 'Привіт - - світ', 'Привіт??? ... світ', 'Привіт ?? світ', 'Привіт.!', 'Привіт?..', 'Привіт!..', 'Привіт !!!', 'Ну... ну?!! Та...', 'А ,, б. В;; г.', '.', ',', ',,', '..', '. .', '!?', '?!!', '?.. ', '!!! ', 'Раз, два;; три. Чотири  ,  п\'ять.', ' ,,', 'Слово .. слово'];
  write('punctuation-uk', 'CORE-0423 uk PUNCTUATION_GENERIC_CHECK', [op('uk', [], LV(ps), { extra: ['uk.PunctuationCheckRule'] })]);
  const fa = ['', 'من و تو', 'من وتو', 'او به خانه رفت', 'او به خانه رفت و برگشت', 'رفت وبرگشت', 'گفت(و) رفت', '(و)', '(وتو)', 'با من بیا چون او رفت', 'بامن بیا چونکه رفت', 'آمد زیرا گرسنه بود', 'آمد،زیرا گرسنه بود', 'بنابراین', ' و', 'و', 'تا', 'او تا', 'او،تا', 'او تا\nما تا', 'ازتا'];
  write('spacebefore-fa', 'CORE-0424 FA_SPACE_BEFORE_CONJUNCTION', [op('fa', ['FA_SPACE_BEFORE_CONJUNCTION'], LV(fa))]);
  const km = ['', 'ខ្ញុំ និង អ្នក', 'ខ្ញុំនិង អ្នក', 'ខ្ញុំ(និង) អ្នក', 'ខ្ញុំ ដើម្បី ទៅ', 'ទៅដើម្បី', 'ទៅ ពីព្រោះ ខ្ញុំ', 'ទៅពីព្រោះខ្ញុំ', 'និង', ' និង', '(និង', 'ខ្ញុំ  និង', 'ខ្ញុំ\tនិង', 'អ្នកនិងខ្ញុំនិងគេ', 'ពីព្រោះ។ និង', 'ABC និង def', 'abc និងdef'];
  write('spacebefore-km', 'CORE-0424 KM_SPACE_BEFORE_CONJUNCTION', [op('km', ['KM_SPACE_BEFORE_CONJUNCTION'], LV(km))]);
}
