// Authors oracle/cases/X-FRRULES (F61, inputs only). Ops: replace-check mode rules (StyleOps), sr-check/sr-word (SpellRuleOps), enspell-misc prepare. Docs: docs/review/F61-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-FRRULES'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n, salt = '') => [...a].sort((x, y) => (sha(salt + x) < sha(salt + y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const C = (text, level = 'DEFAULT') => ({ text, level });
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
const rop = (ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang: 'fr', ids, ...extra, cases } });
// one op per chunk and level
const rops = (ids, texts, n = 40, levels = ['DEFAULT', 'PICKY']) => chunks(texts, n).flatMap((ch) => levels.map((l) => rop(ids, lv(ch, l))));
const JT = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/fr/src/test/java/org/languagetool/rules/fr');
const RES = path.join(ROOT, 'resources/org/languagetool');
const unesc = (s) => s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => c[0] === 'u' && c.length === 5 ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
function lits(name) {
  const src = readFileSync(path.join(JT, `${name}.java`), 'utf8').replace(/\/\/[^\n]*/g, (m) => (m.includes('"') ? m : '')).replace(/\/\*[\s\S]*?\*\//g, '');
  const res = []; const re = /"((?:[^"\\\n]|\\.)*)"/g; let m;
  while ((m = re.exec(src))) { const s = unesc(m[1]); if (s.length >= 1 && /[A-Za-zÀ-ÿ0-9]/.test(s) && !res.includes(s)) res.push(s); }
  return res;
}
const lines = (f) => readFileSync(path.join(RES, f), 'utf8').split('\n');
const EDGE = ['', ' ', 'x', 'Élève à l’école — « cité » œuvre.', 'a'.repeat(300), 'Ligne un.\nLigne deux.', 'Tab\tséparé.', '1234 5678.', '😀 Emoji 😀 ?', 'Le le le le.', '  Début et fin  ', '. . .', '!!', '??', '?!', '...', '…'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/fr/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 240), 400);
const paras = chunks(sentences.slice(0, 160), 8).map((c) => c.join(' '));

const IDS = { compounds: 'FR_COMPOUNDS', qws: 'FRENCH_WHITESPACE', qwstrict: 'FRENCH_WHITESPACE_STRICT', replace: 'FR_SIMPLE_REPLACE_SIMPLE', repeated: 'FR_REPEATEDWORDS', speller: 'FR_SPELLING_RULE' };

// ---- FR-0009 prepareLineForSpeller
{
  const sp = lines('resource/fr/hunspell/spelling.txt').filter((l) => l.trim());
  const L = ['', ' ', 'foo', 'maison', 'Ho Chi Minh', ' Ho Chi Minh ', 'Ho Chi Minh;N m s', 'Ho Chi Minh\tZ', 'foo;N m s', 'foo\tN m s', 'foo;Z', 'foo;A', 'foo;A m s', 'foo;V inf', 'foo;J e sp', 'foo;Zm', 'foo;Nx # comment', 'foo # comment', 'foo;V # N', '#', '#foo', 'foo;', ';foo', '\tfoo', 'foo;;N', 'foo;N;Z', ' foo ; N ', ' foo ; A ', 'foo ;A', 'foo; Z', 'foo\t\tZ', 'é;N', 'œuf;Z m s', 'ÉCOLE;N f s', 'a#b;N', 'a;N#b;Z', 'l’homme;N', "l'homme;V", 'x;a', 'x;n', 'x;z'];
  w('prepare-line', 'FR-0009 French#prepareLineForSpeller on crafted lines and 40 spelling.txt lines', [{ op: 'enspell-misc', args: { kind: 'prepare', lang: 'fr', lines: [...L, ...pick(sp, 40, 'prep')] } }]);
}

// ---- FR_COMPOUNDS (FR-0041, FR-0174)
{
  const T = uniq([...lits('CompoundRuleTest'), 'Jésus Christ', 'Jésus-Christ', 'Jésus- Christ', 'Jésus -Christ', 'Jésus - Christ', 'rez-de-chaussée', 'rez de chaussée', 'rez-de chaussée', 'rez de-chaussée', 'Un rez de chaussée.', 'Le vidéo clip est beau.', 'Le vidéo-clip est beau.', 'Une anglo saxonne.', 'Les anglo- saxons.', 'Tout-à-fait', 'tout à fait', 'peut être', 'peut-être', 'Il est peut être là.', 'Il est peut-être là.', 'c’est-à-dire', 'c’est à dire', 'C’est à dire que oui.', 'ce-ci', 'Porte monnaie', 'porte-monnaie', 'Porte -monnaie', 'Après midi', 'après-midi', 'Grand-mère et grand mère.', 'Chef d’oeuvre et chef-d’oeuvre.', 'Week end', 'week-end', 'Weekend', 'week- end', 'Vis-à-vis', 'vis à vis', 'Va et vient', 'va-et-vient', 'Là-bas et là bas.', 'Celui ci et celui-ci.', 'Celle là.', 'Ceux-là.', ...EDGE]);
  w('cmp-targeted', 'FR-0041 FR_COMPOUNDS: CompoundRuleTest literals + targeted + edge', rops([IDS.compounds], T));
  w('cmp-corpus', 'FR_COMPOUNDS corpus sentences', rops([IDS.compounds], sentences.slice(0, 200)));
  w('cmp-paras', 'FR_COMPOUNDS corpus paragraphs', rops([IDS.compounds], paras, 8));
  const entries = uniq(lines('resource/fr/compounds.txt').map((l) => l.replace(/\s*#.*$/, '').trim().replace(/[*+?]$/, '')).filter((l) => l && !/[\\^$|()[\]{}]/.test(l)));
  const hy = entries.filter((e) => /^[^\s-]+(-[^\s-]+)+$/.test(e));
  const mk = (e, f) => `Il y a ${f(e)} ici.`;
  const sets = { apart: (e) => e.replace(/-/g, ' '), lower: (e) => e.toLowerCase(), hyphen: (e) => e, joined: (e) => e.replace(/-/g, ''), spaceHy: (e) => e.replace(/-/g, '- '), hySpace: (e) => e.replace(/-/g, ' -'), upper: (e) => e[0].toUpperCase() + e.slice(1), tight: (e) => e.replace(/-/g, ' - ') };
  for (const [k, f] of Object.entries(sets)) w(`cmp-data-${k}`, `FR-0174 compounds.txt entries (${k}) in sentences`, rops([IDS.compounds], pick(hy, 160, k).map((e) => mk(e, f)), 40, ['DEFAULT']));
  w('cmp-data-bare', 'FR-0174 compounds.txt entries as bare text (apart / start of sentence)', rops([IDS.compounds], pick(hy, 120, 'bare').flatMap((e) => [e.replace(/-/g, ' '), `${e.replace(/-/g, ' ')}.`]), 40, ['DEFAULT']));
}

// ---- FRENCH_WHITESPACE (FR-0042) and FRENCH_WHITESPACE_STRICT (FR-0043)
{
  const tq = lits('QuestionWhitespaceRuleTest'), ts = lits('QuestionWhitespaceStrictRuleTest');
  const SP = ['', ' ', ' ', ' ', ' ', '\t', '  ', '  ', '  ', '​'];
  const P = ['?', '!', ';', ':', '»', '«'];
  const grid = [];
  for (const sp of SP) for (const p of P) {
    if (p === '«') grid.push(`Il dit ${p}${sp}bonjour et part.`, `${p}${sp}Bonjour.`);
    else if (p === '»') grid.push(`Il dit « bonjour${sp}${p} et part.`, `Il dit « bonjour${sp}${p}.`);
    else grid.push(`C'est vrai${sp}${p}`, `Qu'est ce que c'est${sp}${p} Et alors.`, `Ils disent oui${sp}${p} puis non.`);
  }
  const X = ['L’adresse est http://exemple.fr/a?b=1&c=2 ici.', 'Voir https://exemple.fr:8080/x ici.', 'Il est 12:30 ou 5:08.', 'Le ratio 1:2 est bon.', 'Heure 23:59:59 fin.', 'Mac 00:80:41:ae:fd:7e fin.', 'Mail a@b.fr;c@d.fr;e@f.fr', '1;2;3', 'Bonjour :) ça va ;) oui :D', 'Bonjour :-) et ;-) et :-(', '(?) puis [!] puis (:) fin', 'Texte (?) fin', 'Il crie (!) fort', 'Il dit [?] oui', 'Je suis.[!]', 'Je suis[?]', 'Je suis(?)', '« Je suis Chris… »', '« Je suis Chris ! »', '«Je suis»', '« Je suis»', '«Je suis »', '« Je suis »', '« Je suis »', 'Il dit «oui» et «non» puis « peut-être ».', 'Le « mot » et le «mot».', 'Il dit: « Ok »; puis: «ok»; fin !', '☀️9:00', 'À 9:00 : début', 'Quoi ?? Non !! Si ?!', 'Quoi?? Non!! Si?!', 'Quoi ??', 'Quoi ?!', 'Quoi?!', 'Il dit :\n« Bonjour »', 'Ligne un ?\nLigne deux!', 'Texte :', 'Texte?', '?', '!', ':', ';', '»', '«', ' ?', ' :', 'a :b', 'a: b', 'a : b', 'A :', ': a', '; a', 'Pourquoi ? Parce que : voilà ; fin.', 'Pourquoi? Parce que: voilà; fin.', 'Pourquoi ? Parce que : voilà ; fin.', 'Pourquoi ? Parce que : voilà ; fin.', 'prix : 5 € ; total : 10 €.', 'Voici 5% : ok', 'Titre – sous-titre : suite', 'etc. : fin', "Qu'est-ce que c'est ? Je sais pas!", 'Il dit : "Salut!" puis : "Au revoir?"', 'Ok::', 'Ok;;', 'Ok ;;', 'Ok ::'];
  const T = uniq([...tq, ...ts, ...grid, ...X, ...EDGE]);
  w('qw-targeted', 'FR-0042/0043 FRENCH_WHITESPACE + FRENCH_WHITESPACE_STRICT together: JUnit literals, whitespace x punctuation grid, edge', rops([IDS.qws, IDS.qwstrict], T));
  w('qw-only-ws-targeted', 'FR-0042 FRENCH_WHITESPACE alone: JUnit literals + grid + edge', rops([IDS.qws], T));
  w('qw-only-strict-targeted', 'FR-0043 FRENCH_WHITESPACE_STRICT alone: JUnit literals + grid + edge', rops([IDS.qwstrict], T));
  const punct = (s, i) => { const m = i % 6; const sp = [' ', '', ' ', ' '][i % 4]; return s.replace(/\.$/, `${sp}${['?', '!', ';', ':', '!', '?'][m]}`).replace(/, /, `${sp}${[',', ':', ';', ':', ',', ';'][m] === ',' ? ', ' : [',', ':', ';', ':', ',', ';'][m] + ' '}`); };
  const variants = sentences.slice(0, 120).map(punct);
  w('qw-corpus', 'FR-0042/0043 corpus sentences with injected ? ! ; : and spacing variants', rops([IDS.qws, IDS.qwstrict], variants));
  w('qw-corpus-plain', 'FR-0042/0043 plain corpus sentences', rops([IDS.qws, IDS.qwstrict], sentences.slice(0, 150)));
  const q = sentences.slice(0, 60).map((s, i) => { const k = i % 3; const t = s.replace(/[«»]/g, ''); return k === 0 ? `Il dit «${t}».` : k === 1 ? `Il dit « ${t} ».` : `Il dit « ${t} ».`; });
  w('qw-corpus-quotes', 'FR-0042/0043 corpus sentences quoted with guillemets, 3 spacing styles', rops([IDS.qws, IDS.qwstrict], q));
  w('qw-paras', 'FR-0042/0043 paragraphs (text-level behaviour)', rops([IDS.qws, IDS.qwstrict], paras.map((p, i) => (i % 2 ? p.replace(/;/g, ' ;').replace(/:/g, ' :') : p.replace(/ ([;:?!])/g, '$1'))), 8));
}

// ---- FR_SIMPLE_REPLACE_SIMPLE (FR-0044, FR-0179)
{
  const T = uniq([...lits('SimpleReplaceRuleTest'), "J'ai pas de quoi", 'jai pas de quoi', 'Jai pas de quoi', 'JAI pas de quoi', 'jai', 'Jai.', 'Le jai est là.', ...EDGE]);
  w('sr-targeted', 'FR-0044 FR_SIMPLE_REPLACE_SIMPLE: JUnit literals + targeted + edge', rops([IDS.replace], T));
  const ent = [];
  for (const f of ['rules/fr/replace.txt', 'rules/fr/replace_custom.txt']) for (const l of lines(f)) {
    const t = l.replace(/\s*#.*$/, '').trim(); if (!t || !t.includes('=')) continue;
    const [k] = t.split('='); if (k.trim()) ent.push(k.trim());
  }
  const ks = uniq(ent);
  const S = [(k) => `Il dit ${k} ici.`, (k) => `${k} est ici.`, (k) => `${k[0].toUpperCase() + k.slice(1)} est ici.`, (k) => `Il dit ${k.toUpperCase()} ici.`, (k) => `Voir « ${k} », ok.`, (k) => `${k}.`, (k) => k, (k) => `Il dit ${k}s ici.`, (k) => `x${k} ${k}x ${k}-y.`];
  S.forEach((f, i) => w(`sr-data-${i}`, `FR-0179 replace*.txt keys (${ks.length}) in template ${i}`, rops([IDS.replace], ks.map(f), 40, ['DEFAULT'])));
  w('sr-corpus', 'FR_SIMPLE_REPLACE_SIMPLE corpus sentences', rops([IDS.replace], sentences.slice(0, 150)));
  w('sr-corpus-injected', 'FR_SIMPLE_REPLACE_SIMPLE corpus sentences with replace keys inserted', rops([IDS.replace], sentences.slice(0, 80).map((s, i) => `${s} ${ks[i % ks.length]} fin.`)));
}

// ---- FR_REPEATEDWORDS (FR-0045, FR-0180)
{
  const T = uniq([...lits('FrenchRepeatedWordsRuleTest'), 'Elle est notamment phénoménale. Les choses sont notamment compliquées.', 'Elle est notamment phénoménale. Les choses sont notamment compliquées. Il est notamment grand.', 'Elle est maintenant phénoménale. Les choses sont maintenant compliquées.', 'Elle est maintenant phénoménale.\n\nLes choses sont maintenant compliquées.', 'Elle est maintenant phénoménale. Les choses sont Maintenant compliquées.', 'Maintenant. Maintenant.', 'Maintenant maintenant maintenant.', 'Il est parti. Il est parti.', 'Elle est notamment là, notamment ici. Et notamment là.', 'Une phrase sans répétition. Une autre phrase différente. Encore une autre.', ...EDGE]);
  w('rw-targeted', 'FR-0045 FR_REPEATEDWORDS: JUnit literals + targeted + edge', rops([IDS.repeated], T, 20));
  const syn = lines('rules/fr/synonyms.txt').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => l.split('=')[0].split('/')[0]).filter((x) => /^[\p{L}'’-]+$/u.test(x));
  const ks = uniq(syn);
  const mk = [(k) => `Elle est ${k} contente. Les choses sont ${k} compliquées.`, (k) => `Il dit ${k} oui. Nous avons ${k} fini. Vous voyez ${k} bien.`, (k) => `${k[0].toUpperCase() + k.slice(1)} il vient. Puis ${k} il part.`, (k) => `Voici ${k} un mot.\n\nVoici ${k} un autre mot.`, (k) => `Voici ${k} un mot. Voici un autre mot. Encore un. Et un. Et un. Et un. Et ${k} fin.`];
  mk.forEach((f, i) => w(`rw-data-${i}`, `FR-0180 synonyms.txt lemmas (${ks.length}) in text template ${i}`, rops([IDS.repeated], ks.map(f), 20, ['DEFAULT', 'PICKY'])));
  w('rw-corpus-paras', 'FR_REPEATEDWORDS corpus paragraphs', rops([IDS.repeated], paras, 8));
  w('rw-corpus-paras-long', 'FR_REPEATEDWORDS long paragraphs (24 sentences)', rops([IDS.repeated], chunks(sentences, 24).map((c) => c.join(' ')), 4));
}

// ---- FR_SPELLING_RULE (FR-0040, FR-0177, FR-0178)
{
  const J = lits('MorfologikFrenchSpellerRuleTest');
  const jw = J.filter((s) => !/\s/.test(s));
  const jt = J.filter((s) => /\s/.test(s) || s.length > 25);
  w('junit-words', 'FR-0040 FR_SPELLING_RULE sr-word with suggestions: single-token literals of MorfologikFrenchSpellerRuleTest', [{ op: 'sr-word', args: { lang: 'fr', id: IDS.speller, words: jw, sugg: true } }]);
  w('junit-check', 'FR-0040 FR_SPELLING_RULE sr-check: all literals of MorfologikFrenchSpellerRuleTest', chunks(J, 40).map((ch) => ({ op: 'sr-check', args: { lang: 'fr', ids: [IDS.speller], cases: ch.map((t) => ({ text: t })) } })));
  const els = ['lenfant', 'lhomme', 'dhomme', 'dIsraël', 'dorien', 'ladolescence', 'darriver', 'sétait', 'nest', 'cest', 'cétait', 'qu', 'jai', 'tas', 'mapelle', 'mhabille', 'lécole', 'léléphant', 'dun', 'dune', 'quil', 'quelle', 'lorsquil', 'jusquà', 'ntend', 'sexcuse', 'lun', 'lautre', 'mhonorer', 'nhésite', 'thabille', 'lhopital', 'lhôpital', 'dhiver', 'sil', 'silvous', 'lui-meme', 'luimeme'];
  const hy = [];
  for (const v of ['allons', 'allez', 'est', 'a', 'peut', 'va', 'dit', 'fait', 'avait', 'étais', 'etais', 'ecoute', 'écoute', 'dépêche', 'depeche', 'buvez', 'prends', 'donne', 'regarde', 'cliquez', 'avais', 'ai', 'sont', 'veux', 'vais', 'doit', 'faut', 'mange', 'parle']) for (const p of ['il', 'elle', 'ce', 'on', 'je', 'tu', 'nous', 'vous', 'ils', 'elles', 'moi', 'toi', 'le', 'la', 'lui', 'les', 'leur', 'y', 'en']) hy.push(`${v}${p}`, `${v}-${p}`, `${v}’${p}`);
  const pre = [];
  for (const p of ['agro', 'anti', 'archi', 'auto', 'aéro', 'cardio', 'co', 'cyber', 'demi', 'ex', 'extra', 'hyper', 'inter', 'macro', 'micro', 'mini', 'mono', 'multi', 'néo', 'pan', 'para', 'poly', 'post', 'pro', 'pré', 'pseudo', 'psycho', 're', 'ré', 'semi', 'super', 'trans', 'tri', 'ultra', 'vice', 'éco']) for (const x of ['sociale', 'chimique', 'américain', 'ordinateur', 'histoire', 'musée', 'verre', 'terrain']) pre.push(`${p}${x}`, `${p} ${x}`, `${p}-${x}`);
  const tok = [];
  for (const t of ['non', 'en', 'a', 'le', 'la', 'les', 'pour', 'de', 'du', 'des', 'un', 'une', 'mon', 'ma', 'mes', 'ton', 'ta', 'son', 'sa', 'leur', 'ce', 'cet']) for (const x of ['maison', 'chien', 'voiture', 'sante', 'ville', 'monde']) tok.push(`${t}${x}`, `${t[0].toUpperCase() + t.slice(1)}${x}`);
  const dg = [];
  for (const d of ['et', 'ou', 'de', 'en', 'à', 'aux', 'des', 'sur']) for (const n of ['1930', '12', '300', '2020']) dg.push(`${d}${n}`, `${n}${d}`, `${d} ${n}`);
  const pat = uniq([...els, ...hy, ...pre, ...tok, ...dg]);
  for (const [i, ch] of chunks(pat, 150).entries()) w(`words-patterns-${i}`, 'FR-0040 orderSuggestions pattern words (elision, hyphen pronouns, prefixes, leading tokens, digits) with suggestions', [{ op: 'sr-word', args: { lang: 'fr', id: IDS.speller, words: ch, sugg: true } }]);
  const sp = lines('resource/fr/hunspell/spelling.txt').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && /^[\p{L}'’-]+$/u.test(l));
  const AL = 'abcdefghijklmnopqrstuvwxyzéèêàçùô';
  const typo = (x, i) => { const cs = [...x]; const j = (sha(x).charCodeAt(0) + i) % cs.length; const k = i % 4; if (k === 0) cs.splice(j, 0, AL[(j + i) % AL.length]); else if (k === 1 && cs.length > 2) cs.splice(j, 1); else if (k === 2 && cs.length > 2) { const m = Math.min(j, cs.length - 2); [cs[m], cs[m + 1]] = [cs[m + 1], cs[m]]; } else cs[j] = AL[(j * 7 + i) % AL.length]; return cs.join(''); };
  const spp = pick(sp, 300, 'sp');
  w('words-spelling-ok', 'FR-0177 spelling.txt words (accepted by the speller) with suggestions', [{ op: 'sr-word', args: { lang: 'fr', id: IDS.speller, words: spp.slice(0, 150), sugg: true } }]);
  w('words-spelling-typo', 'FR-0177 spelling.txt words with one seeded typo, suggestions', [{ op: 'sr-word', args: { lang: 'fr', id: IDS.speller, words: spp.slice(0, 150).map(typo), sugg: true } }]);
  const ign = lines('resource/fr/hunspell/ignore.txt').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const prh = lines('resource/fr/hunspell/prohibit.txt').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  w('words-ignore-prohibit', 'FR-0178 ignore.txt (60 words + typo variants) and prohibit.txt (all) words, suggestions', [{ op: 'sr-word', args: { lang: 'fr', id: IDS.speller, words: [...pick(ign, 60, 'ig'), ...pick(ign, 30, 'ig2').map(typo), ...prh, ...prh.map((x) => x[0].toUpperCase() + x.slice(1)), ...prh.map((x) => `${x}s`)], sugg: true } }]);
  w('check-spelling-sentences', 'FR-0177 spelling.txt words embedded in sentences (ok and typo)', chunks([...spp.slice(0, 80).map((x) => `Le ${x} est ici.`), ...spp.slice(150, 230).map((x, i) => `Le ${typo(x, i)} est ici.`)], 40).map((ch) => ({ op: 'sr-check', args: { lang: 'fr', ids: [IDS.speller], cases: ch.map((t) => ({ text: t })) } })));
  w('check-ignore-prohibit', 'FR-0178 ignore.txt / prohibit.txt words embedded in sentences', [{ op: 'sr-check', args: { lang: 'fr', ids: [IDS.speller], cases: [...pick(ign, 40, 'ig3').map((x) => ({ text: `Le ${x} est ici.` })), ...prh.map((x) => ({ text: `Le ${x} est ici.` })), ...prh.map((x) => ({ text: `Les ${x}s sont ici.` }))] } }]);
  w('check-patterns', 'FR-0040 FR_SPELLING_RULE sr-check with pattern words in sentences (matches + ordered suggestions)', chunks(pick(pat, 240, 'pc').map((x) => `Il dit ${x} maintenant.`), 40).map((ch) => ({ op: 'sr-check', args: { lang: 'fr', ids: [IDS.speller], cases: ch.map((t) => ({ text: t })) } })));
  w('check-edge', 'FR_SPELLING_RULE edge inputs (empty, digits, urls, apostrophes, mixed script, long)', [{ op: 'sr-check', args: { lang: 'fr', ids: [IDS.speller], cases: EDGE.concat(['L\'Haÿ-les-Roses, d’Orient et l\'Orient.', 'Aujourd\'hui, aujourd’hui, AUJOURD’HUI.', 'Le cœur, la sœur, l\'œuf, l’œil.', 'Mot-composé inconnu-quelquechose et machin-chose.', 'xyzzyq qwertzx abcdefgh.', 'Ça va très bien, merci à vous toutes et tous.', 'A.B.C. 12h30 3e 1er 2ème N°5 n°5.']).map((t) => ({ text: t })) } }]);
}

// ---- all five rules together
w('combined-all', 'FR-0040..0045 all French Java rules enabled together: corpus + paragraphs + edge', [
  ...chunks(sentences.slice(0, 120), 40).flatMap((ch) => ['DEFAULT', 'PICKY'].map((l) => rop(Object.values(IDS), lv(ch, l)))),
  ...chunks(paras, 8).flatMap((ch) => ['DEFAULT', 'PICKY'].map((l) => rop(Object.values(IDS), lv(ch, l)))),
  rop(Object.values(IDS), lv(EDGE)),
]);
