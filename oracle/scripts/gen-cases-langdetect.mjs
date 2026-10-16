// Authors oracle/cases/X-LANGDETECT/*.json (inputs only). Ops lang-detect / lang-detect-resources: docs/review/F18-oracle.md.
import { writeFileSync, mkdirSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'oracle/cases/X-LANGDETECT');
const LTSRC = '/home/valueerror/STUFF/DEV/LanguageTool/languagetool/languagetool-language-modules';
mkdirSync(DIR, { recursive: true });
for (const f of readdirSync(DIR)) rmSync(path.join(DIR, f));
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
const call = (calls) => ({ op: 'lang-detect', args: { calls } });

// ---- inputs ----
const corpus = {};
for (const l of ['de', 'en', 'fr']) corpus[l] = readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 40);
// deterministic LCG
let seed = 18;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const pick = (arr, k) => { const a = [...arr], o = []; while (o.length < k && a.length) o.push(a.splice(rnd(a.length), 1)[0]); return o; };
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
const examples = {};
for (const l of ['de', 'en', 'fr']) {
  const x = readFileSync(`${LTSRC}/${l}/src/main/resources/org/languagetool/rules/${l}/grammar.xml`, 'utf8');
  const all = [...x.matchAll(/<example[^>]*>([\s\S]*?)<\/example>/g)].map((m) => decode(m[1].replace(/<\/?marker>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())).filter((s) => s.length > 3);
  examples[l] = pick([...new Set(all)], 60);
}

const OOS = {
  es: ['Hola, ¿cómo estás hoy?', 'Esta mañana fui al mercado para comprar frutas y verduras frescas para la comida de mañana.', 'El gobierno anunció ayer nuevas medidas económicas que afectarán a millones de ciudadanos durante los próximos meses, según informaron fuentes oficiales.'],
  it: ['Ciao, come stai oggi?', 'Questa mattina sono andato al mercato per comprare frutta e verdura fresca per il pranzo.', 'Il governo ha annunciato ieri nuove misure economiche che riguarderanno milioni di cittadini nei prossimi mesi, secondo fonti ufficiali.'],
  pt: ['Olá, como você está hoje?', 'Esta manhã fui ao mercado comprar frutas e legumes frescos para o almoço de amanhã.', 'O governo anunciou ontem novas medidas económicas que vão afetar milhões de cidadãos nos próximos meses, segundo fontes oficiais.'],
  nl: ['Hallo, hoe gaat het vandaag?', 'Vanochtend ben ik naar de markt gegaan om verse groenten en fruit te kopen voor het eten.', 'De regering heeft gisteren nieuwe economische maatregelen aangekondigd die de komende maanden miljoenen burgers zullen treffen.'],
  pl: ['Cześć, jak się dzisiaj masz?', 'Dziś rano poszedłem na targ, żeby kupić świeże owoce i warzywa na jutrzejszy obiad.', 'Rząd ogłosił wczoraj nowe środki gospodarcze, które w ciągu najbliższych miesięcy dotkną miliony obywateli, jak podają oficjalne źródła.'],
  ru: ['Привет, как дела сегодня?', 'Сегодня утром я пошёл на рынок, чтобы купить свежие фрукты и овощи на завтрашний обед.', 'Правительство вчера объявило о новых экономических мерах, которые затронут миллионы граждан в ближайшие месяцы, сообщают официальные источники.'],
  uk: ['Привіт, як справи сьогодні?', 'Сьогодні вранці я пішов на ринок, щоб купити свіжі фрукти та овочі на завтрашній обід.', 'Уряд учора оголосив про нові економічні заходи, які торкнуться мільйонів громадян протягом найближчих місяців, повідомляють офіційні джерела.'],
  be: ['Прывітанне, як справы сёння?', 'Сёння раніцай я пайшоў на рынак, каб купіць свежыя садавіну і гародніну на заўтрашні абед.'],
  ca: ['Hola, com estàs avui?', 'Aquest matí he anat al mercat a comprar fruita i verdura fresca per al dinar de demà.', 'El govern va anunciar ahir noves mesures econòmiques que afectaran milions de ciutadans durant els pròxims mesos, segons fonts oficials.'],
  sv: ['Hej, hur mår du idag?', 'I morse gick jag till marknaden för att köpa färsk frukt och grönsaker till middagen i morgon.', 'Regeringen meddelade igår nya ekonomiska åtgärder som kommer att påverka miljontals medborgare under de kommande månaderna.'],
  da: ['Hej, hvordan har du det i dag?', 'I morges gik jeg på markedet for at købe frisk frugt og grøntsager til middagen i morgen.', 'Regeringen offentliggjorde i går nye økonomiske tiltag, som vil påvirke millioner af borgere i de kommende måneder.'],
  no: ['Hei, hvordan har du det i dag?', 'I morges gikk jeg til markedet for å kjøpe frisk frukt og grønnsaker til middagen i morgen.', 'Regjeringen kunngjorde i går nye økonomiske tiltak som vil påvirke millioner av innbyggere de kommende månedene.'],
  el: ['Γεια σου, πώς είσαι σήμερα;', 'Σήμερα το πρωί πήγα στην αγορά για να αγοράσω φρέσκα φρούτα και λαχανικά για το αυριανό γεύμα.', 'Η κυβέρνηση ανακοίνωσε χθες νέα οικονομικά μέτρα που θα επηρεάσουν εκατομμύρια πολίτες τους επόμενους μήνες.'],
  zh: ['你好，你今天怎么样？', '今天早上我去市场买了新鲜的水果和蔬菜，准备明天的午饭。', '政府昨天宣布了新的经济措施，据官方消息，这些措施将在未来几个月内影响数百万公民的生活。'],
  ja: ['こんにちは、今日はお元気ですか。', '今朝、明日の昼食のために新鮮な果物と野菜を買いに市場へ行きました。', '政府は昨日、今後数か月で数百万人の市民に影響を与える新しい経済対策を発表したと、公式筋が伝えている。'],
  ar: ['مرحبا، كيف حالك اليوم؟', 'هذا الصباح ذهبت إلى السوق لشراء الفواكه والخضروات الطازجة لغداء الغد.', 'أعلنت الحكومة أمس عن إجراءات اقتصادية جديدة ستؤثر على ملايين المواطنين خلال الأشهر المقبلة، بحسب مصادر رسمية.'],
  fa: ['سلام، امروز حال شما چطور است؟', 'امروز صبح به بازار رفتم تا میوه و سبزی تازه برای ناهار فردا بخرم.', 'دولت دیروز اقدامات اقتصادی جدیدی را اعلام کرد که در ماه‌های آینده میلیون‌ها شهروند را تحت تأثیر قرار خواهد داد.'],
  ta: ['வணக்கம், இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?', 'இன்று காலை நாளைய மதிய உணவிற்காக புதிய பழங்களையும் காய்கறிகளையும் வாங்க சந்தைக்குச் சென்றேன்.'],
  km: ['សួស្តី តើអ្នកសុខសប្បាយជាទេថ្ងៃនេះ?', 'ព្រឹកនេះខ្ញុំបានទៅផ្សារដើម្បីទិញផ្លែឈើនិងបន្លែស្រស់សម្រាប់អាហារថ្ងៃត្រង់ស្អែក។'],
  ga: ['Dia duit, conas atá tú inniu?', 'Ar maidin chuaigh mé go dtí an margadh chun torthaí agus glasraí úra a cheannach don dinnéar amárach.', 'D\'fhógair an rialtas inné bearta nua eacnamaíocha a dhéanfaidh difear do mhilliúin saoránach sna míonna amach romhainn.'],
  eo: ['Saluton, kiel vi fartas hodiaŭ?', 'Hodiaŭ matene mi iris al la bazaro por aĉeti freŝajn fruktojn kaj legomojn por la morgaŭa tagmanĝo.', 'La registaro anoncis hieraŭ novajn ekonomiajn rimedojn, kiuj tuŝos milionojn da civitanoj dum la venontaj monatoj.'],
  sk: ['Ahoj, ako sa dnes máš?', 'Dnes ráno som išiel na trh kúpiť čerstvé ovocie a zeleninu na zajtrajší obed.', 'Vláda včera oznámila nové hospodárske opatrenia, ktoré sa v nasledujúcich mesiacoch dotknú miliónov občanov.'],
  sl: ['Živjo, kako si danes?', 'Danes zjutraj sem šel na tržnico kupit svežega sadja in zelenjave za jutrišnje kosilo.', 'Vlada je včeraj napovedala nove gospodarske ukrepe, ki bodo v prihodnjih mesecih prizadeli milijone državljanov.'],
  br: ['Demat, penaos emañ ganeoc\'h hiziv?', 'Er mintin-mañ on aet d\'ar marc\'had da brenañ frouezh ha legumaj fresk evit lein warc\'hoazh.'],
  ro: ['Salut, ce mai faci astăzi?', 'Azi dimineață am mers la piață să cumpăr fructe și legume proaspete pentru prânzul de mâine.', 'Guvernul a anunțat ieri noi măsuri economice care vor afecta milioane de cetățeni în lunile următoare.'],
  gl: ['Ola, como estás hoxe?', 'Esta mañá fun ao mercado para mercar froitas e verduras frescas para o xantar de mañá.'],
  ast: ['Hola, ¿cómo tas güei?', 'Esta mañana fui al mercáu pa mercar fruta y verdura fresca pa la comida de mañana.'],
  tl: ['Kumusta, kumusta ka ngayon?', 'Kaninang umaga pumunta ako sa palengke para bumili ng sariwang prutas at gulay para sa tanghalian bukas.'],
  hi: ['नमस्ते, आज आप कैसे हैं?', 'आज सुबह मैं कल के दोपहर के खाने के लिए ताज़े फल और सब्ज़ियाँ खरीदने बाज़ार गया था।'],
  mr: ['नमस्कार, आज तुम्ही कसे आहात?', 'आज सकाळी मी उद्याच्या जेवणासाठी ताजी फळे आणि भाज्या घेण्यासाठी बाजारात गेलो होतो.'],
  th: ['สวัสดี วันนี้คุณเป็นอย่างไรบ้าง', 'เมื่อเช้านี้ฉันไปตลาดเพื่อซื้อผลไม้และผักสดสำหรับมื้อเที่ยงพรุ่งนี้'],
  he: ['שלום, מה שלומך היום?', 'הבוקר הלכתי לשוק לקנות פירות וירקות טריים לארוחת הצהריים של מחר.'],
  ko: ['안녕하세요, 오늘 어떻게 지내세요?', '오늘 아침에 나는 내일 점심을 위해 신선한 과일과 채소를 사러 시장에 갔습니다.'],
  tr: ['Merhaba, bugün nasılsın?', 'Bu sabah yarınki öğle yemeği için taze meyve ve sebze almak üzere pazara gittim.'],
  fi: ['Hei, mitä kuuluu tänään?', 'Tänä aamuna menin torille ostamaan tuoreita hedelmiä ja vihanneksia huomisen lounasta varten.'],
  cs: ['Ahoj, jak se dnes máš?', 'Dnes ráno jsem šel na trh koupit čerstvé ovoce a zeleninu na zítřejší oběd.'],
  hu: ['Szia, hogy vagy ma?', 'Ma reggel elmentem a piacra, hogy friss gyümölcsöt és zöldséget vegyek a holnapi ebédhez.'],
  la: ['Salve, quid agis hodie?', 'Hodie mane ad forum ivi ut fructus et olera recentia emerem.'],
  id: ['Halo, apa kabar hari ini?', 'Pagi ini saya pergi ke pasar untuk membeli buah dan sayuran segar untuk makan siang besok.'],
  vi: ['Xin chào, hôm nay bạn thế nào?', 'Sáng nay tôi đã đi chợ để mua trái cây và rau tươi cho bữa trưa ngày mai.'],
};
const mixed = [
  'Das ist ein Satz. This is a sentence. Ceci est une phrase.',
  'Ich habe das gestern gesehen, and then I went home to sleep because it was late.',
  'Bonjour tout le monde, ich möchte euch heute etwas erzählen über my new project.',
  'The meeting is at 10 am. Die Besprechung beginnt um zehn Uhr. La réunion commence à dix heures.',
  'Привет, my friend! Wie geht es dir?',
  '日本語 and English and Deutsch',
  'Hello мир world 世界',
];
const special = [
  '', ' ', '   ', '\n', '\t', 'a', 'ab', 'x'.repeat(20), '1234567890', '12345 67890 123.45', '...', '!?!?!?', '()[]{}', '-----', '€$%&/()=?', '😀😀😀😀😀', '😀 Hello 😀',
  'See https://example.com/path?x=1&y=2 for details', 'https://example.com/a/b/c', 'Mail me at john.doe@example.com please', 'john.doe@example.com',
  'Contact: info@example.org or visit http://example.org/index.html today and read about the new rules',
  'Das ist ein Test.\n-- \nMax Mustermann\nMusterstraße 1\n12345 Musterstadt', 'This is a test.\n-- \nJohn Smith\nSome Street 5', 'Text\n--\nnot a signature line here and more words after it',
  '@alice @bob_1 hello there, how are you doing today my friend', 'Hello @user_name_1 this is a test sentence for the language identification', '@ @@ @a',
  'Das ist ein Test mit geschützten Leerzeichen.', 'This is a test with nbsp.', 'Das﻿ ist⁣ ein Test﻿﻿ mit unsichtbaren Zeichen.', '﻿⁣﻿',
  'Zażółć gęślą jaźń', 'ÄÖÜ äöü ß', 'Straße Maße große Füße', 'çà éè êë îï ôœ ùû ÿ', 'ñ¿¡', 'ĳ ǆ ǈ', 'Ǆ ǅ', 'İstanbul ıı', 'ΑΒΓ αβγ', 'АБВ абв',
  'Hello', 'Hello world', 'Hello world, this is a test.', 'Guten Tag', 'Guten Tag, wie geht es Ihnen?', 'Bonjour', 'Bonjour le monde',
  'a b c d e f g h i j k l m n o p', 'the the the the the the the', 'der die das der die das', 'le la les le la les',
  '0', '-1', '2147483647', '9223372036854775807', 'NaN', 'null', 'undefined',
  'Wort '.repeat(300), 'Hello world. '.repeat(120), 'Ceci est une phrase. '.repeat(100),
];
const long1 = (l) => corpus[l].join('\n\n').slice(0, 5000);

// ---- clean ----
{
  const texts = [...special, ...mixed, ...corpus.de.slice(0, 3), ...corpus.en.slice(0, 2), 'x'.repeat(999), 'x'.repeat(1000), 'x'.repeat(1001), 'ab\n-- \nsig', 'Mail a@b.cc x'];
  const lens = [10, 11, 20, 50, 100, 1000];
  const calls = [];
  for (const text of texts) for (const maxLength of lens) calls.push({ fn: 'clean', text, maxLength });
  // boundary: cut inside URL / signature / surrogate pair
  const base = 'Look at https://example.com/very/long/path?query=1 and mail a.b@c.de now.';
  for (let n = 10; n <= base.length + 1; n++) calls.push({ fn: 'clean', text: base, maxLength: n });
  const sur = 'ab😀cd😀ef😀gh😀ij😀kl';
  for (let n = 10; n <= 20; n++) calls.push({ fn: 'clean', text: sur, maxLength: n });
  const sig = 'Hello there\n-- \nSig line one\nSig two';
  for (let n = 10; n <= sig.length + 1; n++) calls.push({ fn: 'clean', text: sig, maxLength: n });
  for (const maxLength of [9, 5, 1, 0, -1, -2147483648, 2147483647, 100000]) for (const text of ['Hello world, this is some text for the cut.', '']) calls.push({ fn: 'clean', text, maxLength });
  for (const maxLength of [9, 0, -1, 10, 100, 2147483647]) calls.push({ fn: 'construct', maxLength });
  write('clean', 'cleanAndShortenText over inputs x maxLength (URLs, e-mails, signatures, mentions, NBSP, invisible separators, surrogates), constructor maxLength<10 exception', chunk(calls, 200).map(call));
}

// ---- unicode ----
{
  const calls = [];
  const scripts = { ar: 'مرحبا بالعالم هذا اختبار', cyr: 'Привет мир это тест', cjk: '你好世界这是测试', hira: 'こんにちは世界です', kata: 'コンニチハセカイ', khmer: 'សួស្តីពិភពលោក', tamil: 'வணக்கம் உலகம்', greek: 'Γειά σου κόσμε', greekExt: 'ἀγαθός ἄνθρωπος', dev: 'नमस्ते दुनिया', thai: 'สวัสดีชาวโลก', hebrew: 'שלום עולם', hebrewPres: 'ﭏﭐﭑ', hangul: '안녕하세요 세계', hangulJamo: 'ᄀᄁᄂᄃᄅ', hangulCompat: 'ㄱㄴㄷㄹㅁ', hangulExtA: 'ꥠꥡꥢꥣ', hangulExtB: 'ힰힱힲힳ' };
  const texts = [...Object.values(scripts), ...Object.values(OOS).flat(), ...mixed, ...special.filter((s) => s.length < 200)];
  for (const l of ['de', 'en', 'fr']) texts.push(...corpus[l].slice(0, 3));
  for (const t of texts) calls.push({ fn: 'unicode', text: t });
  // threshold and prefix-length boundaries (pad with latin)
  const mk = (sc, n, lat) => sc.repeat(n).slice(0, n) + 'a'.repeat(lat);
  for (const [k, sc] of Object.entries(scripts)) for (const [n, lat] of [[1, 1], [2, 1], [1, 2], [3, 3], [5, 4], [5, 5], [5, 6], [25, 25], [25, 26], [26, 25], [60, 0], [10, 60], [60, 10], [49, 1], [50, 1]]) calls.push({ fn: 'unicode', text: mk([...sc].join(''), n, lat) });
  for (const [k, sc] of Object.entries(scripts).slice(0, 8)) for (const m of [0, 1, 5, 10, 100, -1]) calls.push({ fn: 'unicode', text: sc + ' abc def', maxCheckLength: m });
  // mixed scripts: two dominant (needs >=50% each -> only with ties) and digits/whitespace/dots not significant
  calls.push({ fn: 'unicode', text: 'ab' }, { fn: 'unicode', text: '12 34 .. 5' }, { fn: 'unicode', text: 'Привет12 34' }, { fn: 'unicode', text: 'Привет你好' }, { fn: 'unicode', text: 'ПриветمرحباПривет' }, { fn: 'unicode', text: 'ааааمرحبا' });
  // non-BMP and digits of other scripts
  calls.push({ fn: 'unicode', text: '𠀀𠀁𠀂' }, { fn: 'unicode', text: '٣٤٥ ٦٧٨' }, { fn: 'unicode', text: '१२३ ४५६' }, { fn: 'unicode', text: '   x' });
  write('unicode', 'UnicodeBasedDetector#getDominantLangCodes over scripts, threshold/prefix boundaries, maxCheckLength', chunk(calls, 400).map(call));
}

// ---- common words ----
{
  const calls = [];
  const texts = [];
  for (const l of Object.keys(OOS)) for (const t of OOS[l]) texts.push(t);
  for (const l of ['de', 'en', 'fr']) { texts.push(...corpus[l].slice(0, 6)); texts.push(...examples[l].slice(0, 25)); }
  texts.push(...mixed, ...special.filter((s) => s.length < 400));
  texts.push('el gobierno de la ciudad cion acion ón estaban cantaban', 'la presentació de la ciutat l\'home d\'en pere', 'o governo da cidade história memória', 'estação ação coração', 'fabrikation nation', 'mañana canción comían', 'ss çà l·l', 'ns', 'cáio', 'mário ário', 'história', 'ria périodes', 'kaj la estas', 'der-die-das la-le-les', 'a b', 'a b ', ' a b', 'wort.', 'wort. text', 'text, ', '„Hallo“ »Welt«', '12,5 % und 3.14 - 5', '1.000,00 € and the', 'THE HOUSE IS THE', 'Ein Ä Ö', 'İSTANBUL', 'ß', 'ǅ', 'house is', '(the) [house] {is}');
  for (const t of texts) { calls.push({ fn: 'common', text: t }); }
  for (const l of ['de', 'en', 'fr']) for (const n of [10, 20, 30, 50, 51, 100]) calls.push({ fn: 'common', text: corpus[l][0].slice(0, n) });
  write('common', 'CommonWordsDetector#getKnownWordsPerLanguage (full distribution common_words.txt) over texts of all languages', chunk(calls, 150).map(call));
}

// ---- detect: arg variants ----
// each text is run with these (noop, preferred, force) combinations; force null = 3-arg overload
const VARS = [
  { name: 'v3' },
  { name: 'v4f', force: false },
  { name: 'pref-own', pref: 'own' },
  { name: 'pref-own-force', pref: 'own', force: true },
  { name: 'pref-other', preferred: ['fr', 'es'], force: false },
  { name: 'pref-other-force', preferred: ['fr', 'es'], force: true },
  { name: 'noop', noop: ['es', 'it', 'zz'] },
  { name: 'noop-pref', noop: ['xx', 'tr', 'fi'], preferred: ['de', 'en'], force: false },
];
function detectCalls(text, own, opts = {}) {
  const calls = [];
  for (const v of VARS) {
    const c = { fn: 'detect', text };
    if (opts.maxLength) c.maxLength = opts.maxLength;
    if (v.noop) c.noop = v.noop;
    if (v.preferred) c.preferred = v.preferred;
    if (v.pref === 'own') c.preferred = [own];
    if (v.force !== undefined) c.force = v.force;
    calls.push(c);
  }
  return calls;
}
const cuts = (t) => [...new Set([10, 20, 30, 50, 51, 100, 1000].map((n) => t.slice(0, n)))];

// corpus whole + truncated
for (const l of ['de', 'en', 'fr']) {
  const calls = [];
  for (const p of corpus[l].slice(0, 5)) for (const t of [p, ...cuts(p)]) calls.push(...detectCalls(t, l));
  for (const p of examples[l]) calls.push(...detectCalls(p, l).slice(0, 4));
  for (const p of pick(corpus[l], 3)) for (const maxLength of [10, 11, 50, 100, 500]) calls.push({ fn: 'detect', text: p.repeat(3), maxLength }, { fn: 'detect', text: p.repeat(3), maxLength, preferred: [l], force: true });
  calls.push(...detectCalls(long1(l), l), ...detectCalls(corpus[l].join(' ').slice(0, 20000), l));
  write(`detect-${l}`, `DefaultLanguageIdentifier#detectLanguage (clean first as TextChecker) over ${l} corpus paragraphs, truncations 10/20/30/50/51/100/1000, rule examples, maxLength variants, 8 arg variants`, chunk(calls, 120).map(call));
}

// out-of-scope languages
{
  const calls = [];
  for (const [l, ts] of Object.entries(OOS)) {
    for (const t of ts) for (const c of detectCalls(t, l)) calls.push(c);
    const all = ts.join(' ');
    for (const n of [10, 20, 30, 50, 51]) calls.push({ fn: 'detect', text: all.slice(0, n) });
    calls.push({ fn: 'detect', text: all.slice(0, 51), noop: [l], preferred: [l], force: false }, { fn: 'detect', text: all, noop: [l] }, { fn: 'detect1', text: all });
    calls.push({ fn: 'detect', text: all.slice(0, 30), preferred: ['de', 'en', 'fr'], force: true });
    calls.push({ fn: 'detect', text: all.slice(0, 30), preferred: [l] , force: true});
  }
  write('detect-oos', 'detectLanguage for texts in ~40 languages (in/out of scope; scripts: latin, cyrillic, greek, arabic, cjk, indic, thai, hebrew, hangul, khmer, tamil) with 8 arg variants and truncations', chunk(calls, 150).map(call));
}

// mixed + special
{
  const calls = [];
  for (const t of [...mixed, ...special]) calls.push(...detectCalls(t, 'de'));
  for (const t of special.slice(0, 40)) calls.push({ fn: 'detect', text: t, clean: false });
  write('detect-special', 'detectLanguage for mixed-language texts, URLs/e-mails/signatures/mentions/NBSP, digits-only, punctuation-only, empty, very long', chunk(calls, 150).map(call));
}

// preferred/noop code variants
{
  const calls = [];
  const T = ['Das ist ein kleiner Test und er funktioniert gut.', 'Hallo Welt', 'This is a small test and it works well.', 'Ceci est un petit test.', 'Hei, hvordan har du det i dag, jeg har det bra', 'Regjeringen kunngjorde i går nye økonomiske tiltak som vil påvirke millioner av innbyggere.', 'Regeringen offentliggjorde i går nye økonomiske tiltag, som vil påvirke millioner af borgere.', 'Привет мир, это тест', '你好世界', 'مرحبا', 'สวัสดี', 'שלום', '안녕하세요', 'नमस्ते दुनिया', 'Hello', 'a'];
  const P = [[], ['de'], ['en'], ['de', 'en'], ['en', 'de'], ['fr'], ['zz'], ['xx'], ['no'], ['nb'], ['nb', 'da'], ['no', 'da'], ['da'], ['da', 'no'], ['nn'], ['en-US'], ['de-DE'], ['de', 'en-GB'], [''], [' '], ['de', ''], ['', 'de'], [null], ['DE'], ['ru'], ['uk'], ['be'], ['zh'], ['hi'], ['mr'], ['ru', 'de'], ['ca'], ['pt'], ['es', 'ca'], ['ja'], ['ar'], ['el'], ['ta'], ['km'], ['ko'], ['th'], ['he'], ['crh'], ['eo'], ['ast'], ['gl']];
  const N = [[], ['zz'], ['nb'], ['no'], ['th'], ['xx', 'yy'], ['tr', 'fi', 'cs'], ['de'], ['ru'], [''], ['en-US'], ['zz', 'ru']];
  for (const t of T) for (const p of P) for (const f of [undefined, false, true]) { const c = { fn: 'detect', text: t, preferred: p }; if (f !== undefined) c.force = f; calls.push(c); }
  for (const t of T) for (const n of N) for (const p of [[], ['de']]) calls.push({ fn: 'detect', text: t, noop: n, preferred: p, force: false });
  write('detect-prefs', 'preferredLangs / noopLangs code variants (zz, nb, no/da rule, variants -> IllegalArgumentException, blank, script-dominant codes, th/he/ko/hi->noop) x texts x force', chunk(calls, 150).map(call));
}

// scores
{
  const calls = [];
  const T = [...corpus.de.slice(0, 2), ...corpus.en.slice(0, 2), ...corpus.fr.slice(0, 2), ...Object.values(OOS).flat().filter((_, i) => i % 3 === 0), ...mixed, 'Hello', 'Hallo Welt', 'Guten Tag', '', 'Привет мир', 'こんにちは', '1234', ...cuts(corpus.de[1]), ...cuts(corpus.fr[1])];
  for (const t of T) for (const count of [1, 2, 3, 5, 10, 100, 0, -1]) calls.push({ fn: 'scores', text: t, count });
  for (const t of T.slice(0, 30)) for (const [preferred, force] of [[['de', 'en'], true], [['de', 'en'], false], [['fr'], true], [['no'], false], [['zz'], true]]) calls.push({ fn: 'scores', text: t, count: 5, preferred, force }, { fn: 'scores', text: t, count: 3, noop: ['zz', 'es'], preferred, force });
  write('scores', 'getDetectedLanguageScores (count 1,2,3,5,10,100,0,-1; confidence float rounded to 2 decimals for count>1; preferred/noop)', chunk(calls, 150).map(call));
}

// server (real V2TextChecker#detectLanguageOfString)
{
  const calls = [];
  const T = [corpus.de[0], corpus.en[0], corpus.fr[0], corpus.de[1].slice(0, 30), corpus.en[1].slice(0, 30), corpus.fr[1].slice(0, 30), ...Object.values(OOS).map((x) => x[1]), '', '1234', 'Hello', ...mixed.slice(0, 3), '안녕하세요', 'Привет мир'];
  const V = [[], ['en-GB'], ['en-US', 'de-AT'], ['de-CH'], ['fr-CA'], ['pt-BR'], ['en'], ['en', 'de-AT'], ['xx-YY'], ['en-XX'], ['de-DE', 'en-AU'], ['ca-ES-valencia'], ['es-AR'], ['nl-BE'], ['pt-PT'], ['zh-CN'], ['']];
  const PR = [[[], [], false], [[], ['de', 'en'], false], [[], ['de', 'en'], true], [['zz'], [], false], [['es'], ['fr'], true], [[], ['en-US'], false], [[], ['nb'], true]];
  for (const t of T) for (const [noop, preferred, force] of PR) calls.push({ fn: 'server', text: t, variants: [], noop, preferred, force });
  for (const t of T.slice(0, 12)) for (const v of V) calls.push({ fn: 'server', text: t, variants: v, noop: [], preferred: [], force: false });
  for (const t of T.slice(0, 6)) calls.push({ fn: 'server', text: t, fallback: 'fr', variants: [], noop: [], preferred: [] }, { fn: 'server', text: '1234', fallback: 'xx', variants: [] , noop: [], preferred: [] }, { fn: 'server', text: '안녕하세요', fallback: 'de', variants: [], noop: [], preferred: [] });
  write('server', 'V2TextChecker#detectLanguageOfString (cleanAndShortenText + detectLanguage + default variant / preferredVariants mapping + BadRequestException texts + fallback language)', chunk(calls, 100).map(call));
}

// service
write('service', 'LanguageIdentifierService singleton/factory (cached first identifier, maxLength 0 -> 1000, clear), canLanguageBeDetected, getLanguageForShortCode(code, additionalLangs)', [call([{ fn: 'svc', steps: [
  { fn: 'getInitialized' }, { fn: 'getDefault', maxLength: 0 }, { fn: 'getDefault', maxLength: 50 }, { fn: 'getInitialized' }, { fn: 'getDefault', maxLength: 5 },
  { fn: 'clear', type: 'default' }, { fn: 'getInitialized' }, { fn: 'getDefault', maxLength: 50 }, { fn: 'getDefault', maxLength: 0 },
  { fn: 'clear', type: 'both' }, { fn: 'getInitialized' }, { fn: 'getDefault', maxLength: 5 }, { fn: 'getDefault', maxLength: 10 }, { fn: 'getDefault', maxLength: -3 },
  { fn: 'clear', type: 'simple' }, { fn: 'getInitialized' }, { fn: 'clear', type: 'bogus' }, { fn: 'getInitialized' }, { fn: 'getDefault', maxLength: 1 },
  ...['de', 'en', 'fr', 'de-DE', 'en-US', 'fr-FR', 'es', 'zz', 'xx', 'th', 'he', 'ko', 'hi', 'mr', 'ru', 'zh', 'zh-CN', 'zh-TW', 'ja', 'ja-JP', 'no', 'nb', 'da', 'ast', 'gl', 'eo', 'crh', 'ca', 'ca-ES', 'ca-ES-valencia', 'pt-BR', 'en-XX', 'EN', 'De', '', ' ', 'de-', '-de', null]
    .flatMap((code) => [{ fn: 'canDetect', code, additional: [] }, { fn: 'canDetect', code, additional: [code] }, { fn: 'canDetect', code, additional: ['zz', 'th', 'he'] }, { fn: 'langForShortCode', code, additional: [] }, { fn: 'langForShortCode', code, additional: [code] }, { fn: 'langForShortCode', code, additional: ['th', 'he', 'ko', 'hi', 'mr', 'zz'] }]),
] }])]);

// resources (porter info)
write('resources', 'resources read by the identifier: common_words.txt of every language module (path, size, sha256, entries), optimaize profile codes/resources, external profiles eo/crh', [{ op: 'lang-detect-resources', args: {} }]);
console.log(`X-LANGDETECT cases written to ${DIR}`);
