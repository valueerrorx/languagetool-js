// Authors oracle/cases/X-FRFILTERS (F62, inputs only). Rule-driven cases: replace-check mode rules over the fr XML rules that use FR-0060..0071 filters; direct cases: filter-run (FilterOps). Docs: docs/review/F61-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-FRFILTERS'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const W = (name, description, ops, env) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ...(env ? { env } : {}), ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n, salt = '') => [...a].sort((x, y) => (sha(salt + x) < sha(salt + y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const RR = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/fr/src/main/resources/org/languagetool/rules/fr');
const FILT = ['AdvancedSynthesizerFilter', 'DateCheckFilter', 'DMYDateCheckFilter', 'NewYearDateFilter', 'FindSuggestionsFilter', 'FrenchNumberInWordFilter', 'FrenchSuppressMisspelledSuggestionsFilter', 'InterrogativeVerbFilter', 'MakeContractionsFilter', 'PostponedAdjectiveConcordanceFilter', 'SuggestionsFilter', 'WordWithDeterminerFilter'];

// ---- rule + example extraction (regex based, no XML parser needed)
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const plain = (s) => s.replace(/<\/?marker>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\s+/g, ' ').trim();
function collect() {
  const res = Object.fromEntries(FILT.map((f) => [f, new Map()]));
  for (const file of ['grammar.xml', 'style.xml']) {
    const src = strip(readFileSync(path.join(RR, file), 'utf8'));
    // split into top-level rulegroup / rule blocks
    const re = /<(rulegroup|rule)\b([^>]*)>([\s\S]*?)<\/\1>/g; let m;
    const seen = new Set();
    // rulegroups first (they contain nested rules)
    const groups = []; let g;
    const gre = /<rulegroup\b([^>]*)>([\s\S]*?)<\/rulegroup>/g;
    while ((g = gre.exec(src))) groups.push([g.index, g.index + g[0].length, g[1], g[2]]);
    const inGroup = (i) => groups.some(([a, b]) => i >= a && i < b);
    const blocks = groups.map(([, , at, body]) => [at, body]);
    const rre = /<rule\b([^>]*)>([\s\S]*?)<\/rule>/g; let r;
    while ((r = rre.exec(src))) if (!inGroup(r.index)) blocks.push([r[1], r[2]]);
    for (const [at, body] of blocks) {
      const id = (/\bid="([^"]*)"/.exec(at) || [])[1];
      const fs = [...body.matchAll(/<filter\b[^>]*class="([^"]*)"/g)].map((x) => x[1].split('.').pop());
      const exs = [...body.matchAll(/<example\b[^>]*>([\s\S]*?)<\/example>/g)].map((x) => plain(x[1]));
      for (const f of uniq(fs)) if (res[f] && id) { const cur = res[f].get(id) ?? []; res[f].set(id, uniq([...cur, ...exs])); }
    }
  }
  return res;
}
const R = collect();
const rop = (ids, texts, level, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang: 'fr', ids, ...extra, cases: texts.map((text) => ({ text, level })) } });
const rops = (ids, texts, n = 40) => chunks(texts, n).flatMap((ch) => ['DEFAULT', 'PICKY'].map((l) => rop(ids, ch, l)));
const idsOf = (f) => [...R[f].keys()];
const CAP = 300; // rule examples per filter (sha-picked) to bound the run time
const exOf = (f) => pick(uniq([...R[f].values()].flat()).filter(Boolean), CAP, f);
const EDGE = ['', ' ', 'x', '1', 'Test.', 'Élève à l’école — « cité » œuvre.', 'Le 31 février fut long.', 'Le 1er et le 2 et le 3 mai.', 'a'.repeat(300) + '.', 'Ligne un.\nLigne deux.', '😀 Emoji 😀 ?'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/fr/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 200), 300);
const date = (name, desc, ops) => {
  W(name, desc, ops);
  for (const [tag, ft] of [['jan', '@2027-01-05 12:00:00'], ['dec', '@2026-12-31 12:00:00']]) W(`${name}-${tag}`, `${desc} [clock ${ft.slice(1)}]`, ops.map((o) => (o.op === 'filter-run' ? { ...o, args: { ...o.args, clockAt: `${ft.slice(1, 11)}T12:00:00+01:00` } } : o)), { FAKETIME: ft });
};
const counts = {};

// ---- rules-<Filter>: rule examples + edge texts, via XML rules; targeted extras per filter below
const T = {};
const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim', 'Lundi', 'VENDREDI', 'Dimanche'];
const months = ['janvier', 'janv', 'février', 'févr', 'fév', 'mars', 'mar', 'avril', 'avr', 'mai', 'juin', 'juillet', 'juil', 'août', 'aout', 'aoû', 'septembre', 'sept', 'sep', 'octobre', 'oct', 'novembre', 'nov', 'décembre', 'déc'];
{
  const t = [];
  for (const d of days.slice(0, 9)) for (const s of ['15 mars 2026', '16 mars 2026', '29 février 2024', '29 février 2026', '31 avril 2026', '1er janvier 2026', '3/12/2025', '1/1/2000', '0 mars 2026', '32 mars 2026', '3-12-2025', '2026/03/15', '2026-03-16']) { t.push(`Le ${d} ${s}.`); t.push(`${d}, ${s}`); }
  for (const m of months) t.push(`Lundi 5 ${m} 2027 va.`, `Vendredi, 10 ${m} 2026 va.`, `Samedi 1er ${m} 2026.`);
  t.push('Jeudi 28 août 2014.', 'Vendredi 28 août 2014.', 'Ven 28/8/2014.', 'Dimanche 99999999999999999999 mars 2026', 'Lundi 15 mars 0000', 'Mardi 15 mars 10000');
  T.DateCheckFilter = t;
  const ny = [];
  for (const p of ['1 janvier', '7 octobre', '31 décembre', '2 février', 'janvier', 'décembre', 'le 1er janvier', 'en janvier', 'à Noël', '7/octobre/', '07/01/', '15/03/', '1-12-', '5 de mars de l’année']) for (const y of ['2024', '2025', '2026', '2027', '2013', '1999', '2099', '10000']) ny.push(`${p} ${y}`, `${p} ${y}.`);
  ny.push('Bonne année 2025 !', 'En 2025 tout a changé.', 'Depuis 2026, le 31 décembre 2026 était loin.');
  T.NewYearDateFilter = ny;
  T.DMYDateCheckFilter = ['Vendredi 28-8-2014.', 'Jeudi 28-08-2014', 'Lundi 15-03-2026', 'Dimanche, 15-03-2026'];
}
T.FrenchNumberInWordFilter = [...['mè1re', 'p4tit', 'gr0s', 'h1er', 'Ma1son', 'ch4t', 'b0nne', 'v1ande', 'caf3', 'c0eur', 'l1vre', 'm0t', 'tr0is', 'quatr3', 'Pa1x', 'ég4lité', 'dév3loppement', 'x1y2z3', 'ab12cd', 'a1', 'H2O', 'é1é', 'œ1uf', 'ïl2'].map((w) => `La ${w} est là !`), 'Je vends un grip vg-c3em pour le modèle A9.', 'Servez-vous de dev.copy2eps et puis le graphicx package.', 'mp3 et mp4 et 3D et 4x4.'];
T.MakeContractionsFilter = ['Le nouveau chef est pareil que le précédent.', 'Il est pareil que les autres.', 'Elle est pareille que la voisine.', 'Elles sont pareilles que les siennes.', 'Pareils qu’un autre.', 'Pareil que le le chat.', 'Ils sont pareils que ses amis.', 'C’est pareil que de le dire.', 'C’est pareil que à le dire.', 'Pareil que les.', 'pareil que le', 'PAREIL QUE LE précédent.', 'Pareil que l’autre.', 'Pareil que ce jour.', 'Pareil qu’une mère.'];
T.InterrogativeVerbFilter = ['Pourquoi il est venu ?', 'Pourquoi est il venu ?', 'Pourquoi est-il venu ?', 'Comment il va ?', 'Où elle habite ?', 'Quand ils partent ?', 'Que je fais ?', 'Pourquoi je suis là ?', 'Pourquoi tu viens ?', 'Pourquoi nous venons ?', 'Pourquoi vous partez ?', 'Qui il est ?', 'Pourquoi a il dit non ?', 'Pourquoi a-t-il dit non ?', 'Pourquoi elle a fait ça ?', 'Quand on mange ?', 'Où ce sera ?', 'Pourquoi on y va ?', 'Pourquoi il y a du bruit ?', 'Ne pas savoir pourquoi il vient ?', 'Mange-t il ?', 'Vient il ?', 'Peut il venir ?', 'Pourquoi j’ai peur ?', 'Pourquoi elles chantent ?', 'Comment ça va ?', 'Où tu vas ?', 'Quel âge il a ?', 'Combien ils coûtent ?', 'Pourquoi cela arrive-t-elle ?'];
T.WordWithDeterminerFilter = ['Un grande maison.', 'Une grand maison.', 'Le belle fille.', 'La beau garçon.', 'Les grand maison.', 'Ces belles fille.', 'Cet maison.', 'Ce arbre.', 'Ces arbre.', 'Ma ami.', 'Mon amie.', 'Mon maison.', 'Ma école.', 'Ton idée.', 'Ta ordinateur.', 'Sa amie est là.', 'Un vieil homme.', 'Un vieux arbre.', 'Une vieux maison.', 'Le vieil ami.', 'Ces vieil hommes.', 'Cette homme.', 'Ce femme.', 'Les ancien élèves.', 'Leurs ami.', 'Du ami.', 'Des ami.', 'Un nouveau amie.', 'Une nouveau ami.', 'Cet nouvel élève.', 'Le même enfants.', 'Notre grande enfants.', 'Mes ancien amis.', 'Mon nouvelle voiture.', 'Un belle homme.', 'Un bel arbre.', 'Un bel femme.', 'Ce bel enfant.'];
T.AdvancedSynthesizerFilter = ['Les enfants et la mère est venus.', 'Elle et lui est parti.', 'Le chat et le chien dort.', 'Marie et Pierre est content.', 'Nous et eux sommes là.', 'Je suis venu et parti.', 'Elle est venu et parti.', 'Elles sont venu et parti.', 'Il faut que tu viens.', 'Il faut que tu es là.', 'Bien que tu es là, il part.', 'Pour que nous sommes bien.', 'Avant que je suis parti.', 'Quoique il est tard.', 'Il a mangé et boit.', 'Elle a vue et entendu.', 'La femme et l’homme est parti.', 'Mes amis et moi allons bien.', 'Toi et moi sommes là.', 'Ma sœur et mon frère viennent.', 'Le garçon et la fille aimé jouer.', 'Les maisons et les voitures est cher.'];
T.PostponedAdjectiveConcordanceFilter = ['La réunion suivant.', 'Un climat tropicale.', 'Elle a des épaules haute et fermes.', 'La maison du village blanches.', 'Les dossiers triées par ordre.', 'La présidentielle américain.', 'Des problèmes complexes résolu.', 'Une femme et un homme content.', 'Un homme et une femme contente.', 'Les chats et les chiens gentille.', 'Le livre et la table ancien.', 'Une voiture et un vélo rouge.', 'La fille et le garçon intelligente.', 'Des fleurs rouges et jaune.', 'Une robe longues.', 'Un mur blanche.', 'Des murs blancs et sale.', 'Une pomme verts.', 'Un homme grande.', 'Cette idée nouveau.', 'Le travail effectuée hier.', 'La tâche effectué hier.', 'Des idées brillant.', 'Le prix demandé élevé.'];
T.FindSuggestionsFilter = ['Il a écris un livre.', 'Nous avont mangé.', 'Je vais mangé.', 'Tu a raison.', 'Ils sont aller au marché.', 'Elle ont chanté.', 'Il faut que je vais.', 'Je suis allé.', 'Vous êtes venus hier.', 'Il à mangé.', 'Il a venu.', 'Elle est mangé.', 'Je m’appelle Paul et j’ai manger.', 'Il la regarde.', 'Qu’il vienne.', 'Mon ami est parti.', 'Nous mangeons.', 'Il pleuvoit.', 'Cest bien.', 'Jai vu.', 'Lenfant joue.', 'Ils on mangé.', 'Ca va.', 'Je ne sais pa.', 'Tu veux du pain ou du fromage ?', 'Nous ne pouvont pas.', 'Ils chantaient et danse.'];
T.FrenchSuppressMisspelledSuggestionsFilter = T.FindSuggestionsFilter;
T.SuggestionsFilter = ['Je vais adresser un courrier.', 'Il faut aller à Paris.', 'J’apprécie ce livre.', 'Il apprend le français.', 'Elle aime ce film.', 'Il a un beau jardin.', 'Cette chose est bien.', 'Ils font des choses.', 'Il y a beaucoup de gens.', 'Je pense à toi.', 'Il faut mettre la table.', 'Il fait beau.', 'Nous avons besoin d’aide.', 'Ils ont lieu demain.', 'Un très grand homme.', 'C’est très bon.', 'Il est très gentil.', 'Je suis très content.', 'Voici un truc.', 'Il me dit qu’il va venir.', 'Elle commence à parler.', 'Il adresse la parole.', 'Il adresse ses salutations.', 'Tu dois aller chez le médecin.', 'Je vais aller au cinéma.', 'On a vu un bon film.'];

const cnt = {};
for (const f of FILT) {
  const ids = idsOf(f); if (!ids.length) { cnt[f] = 0; continue; }
  const ex = exOf(f);
  const targ = uniq([...(T[f] ?? []), ...EDGE]);
  const texts = uniq([...ex, ...targ]);
  if (/Date|NewYear/.test(f)) date(`rules-${f}`, `${f} via fr rules ${ids.slice(0, 6)}: rule examples + targeted + edge, clock 2026-03-15`, rops(ids, texts));
  else W(`rules-${f}`, `${f} via fr rules ${ids.slice(0, 6)}${ids.length > 6 ? '...' : ''} (${ids.length} ids): rule examples + targeted + edge`, rops(ids, texts));
  cnt[f] = [ids.length, texts.length];
  // corpus + typo'd corpus for the frequent filters
  if (['FindSuggestionsFilter', 'FrenchSuppressMisspelledSuggestionsFilter', 'SuggestionsFilter', 'WordWithDeterminerFilter', 'AdvancedSynthesizerFilter', 'PostponedAdjectiveConcordanceFilter', 'InterrogativeVerbFilter'].includes(f)) {
    const cs = sentences.slice(0, 120);
    W(`corpus-${f}`, `${f} rules (${ids.length} ids) over corpus sentences`, rops(ids, cs));
    const ty = sentences.slice(120, 220).map((s, i) => s.replace(/\b(\p{L}{4,})\b/u, (m) => (i % 3 === 0 ? m.slice(0, -1) : i % 3 === 1 ? m + m.slice(-1) : m.slice(1))));
    W(`corpus-typo-${f}`, `${f} rules (${ids.length} ids) over corpus sentences with a seeded typo`, rops(ids, ty));
  }
}
// all rules that use any filter, over corpus (hints-real-fr style)
{
  const all = uniq(FILT.flatMap(idsOf));
  W('rules-all-filters-corpus', `all ${all.length} fr rules that use FR-0060..0071 filters, corpus + examples`, rops(all, [...sentences.slice(0, 60), ...pick(uniq(FILT.flatMap(exOf)), 120, 'all')], 40));
}

// ---- targeted date texts (dedicated, also at the other clocks)
{
  const ids = uniq(['DateCheckFilter', 'NewYearDateFilter'].flatMap(idsOf));
  date('dates-targeted', 'FR_DATE_WEEKDAY / DATE_NEW_YEAR targeted dates, 3 clocks', rops(ids, uniq([...T.DateCheckFilter, ...T.NewYearDateFilter]), 40));
}

// ---- direct filter-run requests (language class + args, no XML rule)
const CLOCK = '2026-03-15T10:00:00+01:00';
const PKG = 'org.languagetool.rules.fr.';
const words = (text) => text.match(/[\p{L}\d]+['’]|[^\s,.;:!?'’]+|[,.;:!?]/gu) ?? [];
function req(text, cls, args, o = {}) {
  const w = o.words ?? words(text);
  return { op: 'filter-run', args: { lang: 'fr', text, filter: { cls: PKG + cls }, args, from: o.from ?? 0, to: o.to ?? text.length, patternTokenPos: o.pos ?? 0, tokenPositions: o.tokenPositions ?? w.map(() => 1), window: o.window ?? [1, w.length + 1], message: o.message ?? 'msg {year} {realYear} {realDay} {day} {month}', shortMessage: 'sm', ...(o.suggestions ? { suggestions: o.suggestions } : {}), clockAt: o.clockAt ?? CLOCK } };
}
const wr = (name, desc, ops, env) => { W(name, desc, ops, env); };
// DateCheckFilter / DMYDateCheckFilter direct (FR-0061): fr DateCheckFilter args are 1-based token references into the pattern tokens (weekDay:1 day:2 month:3 year:4)
{
  const grid = [];
  for (const day of ['lundi', 'vendredi', 'Dim', 'mer.', 'xyz', 'LUNDI', 'jeudi', 'samedi', 'Mardi']) for (const [d, m, y] of [['28', 'août', '2014'], ['15', 'mars', '2026'], ['16', 'mars', '2026'], ['29', 'février', '2024'], ['29', 'février', '2023'], ['1er', 'janvier', '2026'], ['31', 'avril', '2026'], ['5', 'déc', '2026'], ['5', 'décembre', '1900'], ['0', 'mai', '2026'], ['15', '03', '2026'], ['15', '3', '2026'], ['15', '13', '2026'], ['x', 'juin', '2026'], ['10', 'juil', 'abc'], ['15', 'mars', '2027'], ['31', 'décembre', '2026'], ['1', 'janvier', '2027']]) grid.push([day, d, m, y]);
  const dc = [];
  for (const [day, d, m, y] of grid) dc.push(req(`${day} ${d} ${m} ${y}`, 'DateCheckFilter', [['weekDay', '1'], ['day', '2'], ['month', '3'], ['year', '4']], { words: [day, d, m, y], message: 'wd {realDay} / {day} / {currentYear}', suggestions: [] }));
  for (const [day, d, m] of grid.slice(0, 40)) dc.push(req(`${day} ${d} ${m}`, 'DateCheckFilter', [['weekDay', '1'], ['day', '2'], ['month', '3']], { words: [day, d, m], message: 'wd {realDay} / {day} / {currentYear}', suggestions: [] }));
  const t = 'lundi 15 mars 2026'; const tw = ['lundi', '15', 'mars', '2026'];
  for (const a of [[['weekDay', '1'], ['day', '2']], [['day', '2'], ['month', '3'], ['year', '4']], [['weekDay', '1'], ['month', '3'], ['year', '4']], [['weekDay', '9'], ['day', '2'], ['month', '3'], ['year', '4']], [['weekDay', '0'], ['day', '2'], ['month', '3'], ['year', '4']], [['weekDay', 'x'], ['day', '2'], ['month', '3'], ['year', '4']], [['weekDay', '1'], ['day', '2'], ['month', '3'], ['year', '4'], ['date', '2']], [], [['weekDay', '1'], ['day', '2'], ['month', '3'], ['year', '4'], ['preferredYear', '2']]]) dc.push(req(t, 'DateCheckFilter', a, { words: tw, message: 'wd {realDay} / {day}', suggestions: ['a', 'b'] }));
  date('direct-DateCheckFilter', 'FR-0061 fr DateCheckFilter direct filter-run (token-reference args): weekday x date grid, missing/invalid args, 3 clocks', dc);
  const dm = [];
  for (const dt of ['15-03-2026', '16-03-2026', '28-08-2014', '1-1-2000', '29-02-2024', '29-02-2023', '31-04-2026', 'xx', '1-2', 'a-b-c', '', '15-03-2026-1', '99-99-9999']) dm.push(req(`lundi ${dt}`, 'DMYDateCheckFilter', [['weekDay', '1'], ['date', dt]], { words: ['lundi', dt], message: 'wd {realDay} / {day}', suggestions: [] }));
  for (const a of [[['weekDay', '1'], ['date', '2']], [['weekDay', '1'], ['date', '2'], ['year', '2']], [['weekDay', '1'], ['date', '2'], ['month', '2']], [['weekDay', '1'], ['date', '2'], ['day', '2']], [['date', '15-03-2026']], [['weekDay', '1']], []]) dm.push(req('lundi 15-03-2026', 'DMYDateCheckFilter', a, { words: ['lundi', '15-03-2026'], message: 'wd' }));
  date('direct-DMYDateCheckFilter', 'FR-0061 fr DMYDateCheckFilter direct filter-run (no active XML use; date literal split "dd-mm-yyyy", then day/month/year are used as token references by the parent): errors and arg validation, 3 clocks', dm);
}
// NewYearDateFilter direct (FR-0062)
{
  const ops = [];
  for (const [d, m, y] of [['7', 'octobre', '2013'], ['7', '10', '2013'], ['1', 'janvier', '2026'], ['1', 'janvier', '2025'], ['31', 'décembre', '2025'], ['31', 'décembre', '2026'], ['5', 'janv', '2027'], ['15', 'mars', '2026'], ['15', 'mars', '2025'], ['2', 'févr', '2024'], ['3', 'décembre', '2025'], ['x', 'y', 'z'], ['1', 'janvier', ''], ['32', 'janvier', '2026'], ['1', 'xyz', '2026'], ['1', 'août', '10000']]) ops.push(req(`${d} ${m} ${y}`, 'NewYearDateFilter', [['day', d], ['month', m], ['year', y]], { words: [d, m, y], message: 'Vouliez-vous dire {realYear} ?', suggestions: [] }));
  for (const a of [[['year', '2025']], [['month', '1'], ['year', '2025']], [['day', '1'], ['year', '2025']], []]) ops.push(req('1 janvier 2025', 'NewYearDateFilter', a, { words: ['1', 'janvier', '2025'], message: '{realYear}' }));
  date('direct-NewYearDateFilter', 'FR-0062 fr NewYearDateFilter direct filter-run at 3 clocks', ops.map((o) => o));
}
// FrenchNumberInWordFilter direct (FR-0064)
{
  const ops = [];
  for (const w of ['mè1re', 'p4tit', 'gr0s', 'h1er', 'Ma1son', 'x1y2z3', 'ab12cd', '1', '42', 'H2O', 'é1é', 'œ1uf', 'caf3', 'mot', '', 'a1', '1a', 'l0', 'd3ux', 'c4'] ) ops.push(req(w, 'FrenchNumberInWordFilter', [['word', w]], { words: [w], message: 'num', suggestions: [] }));
  ops.push(req('mè1re', 'FrenchNumberInWordFilter', [], { words: ['mè1re'], message: 'num' }));
  wr('direct-FrenchNumberInWordFilter', 'FR-0064 FrenchNumberInWordFilter direct filter-run', ops);
}
// MakeContractionsFilter direct (FR-0068)
{
  const ops = [];
  const sug = [['de le chat'], ['à le chat'], ['de les chats'], ['à les chats'], ['De le chat'], ['À LES chats'], ['de le chat', 'à les chats', 'rien'], ['de lequel'], ['de l’ami'], ['pareil à le'], ['de le'], ['de  le chat'], ['de le chat'], ['dÉ le'], ['de lE chat'], ['ide les'], ['à les à le de le de les'], [], ['']];
  for (const s of sug) ops.push(req('pareil que le chat', 'MakeContractionsFilter', [], { words: ['pareil', 'que', 'le', 'chat'], suggestions: s, message: 'c' }));
  wr('direct-MakeContractionsFilter', 'FR-0068 MakeContractionsFilter direct filter-run on suggestion lists', ops);
}
// FrenchSuppressMisspelledSuggestionsFilter direct (FR-0066)
{
  const ops = [];
  const sug = ['le', 'maison', 'qwertzx', 'un chien', 'chiens', 'mange', 'Le', 'mangé', 'mangeons', 'maisson', 'l’ami', 'c’est', 'cest', 'aujourd’hui', 'peut-être', 'peutêtre', 'xyzzyq', 'été', 'ete', 'œuf', 'oeuf'];
  const text = 'Le chat manje la sourie .'; const w = ['Le', 'chat', 'manje', 'la', 'sourie', '.'];
  for (const args of [[['suppressMatch', 'true']], [['suppressMatch', 'false']], [['suppressMatch', 'true'], ['SuppressPostag', 'N .*']], [['suppressMatch', 'false'], ['FilterPostag', 'N .*']], [['suppressMatch', 'true'], ['FilterPostag', 'V .*']], [['suppressMatch', 'false'], ['SuppressPostag', 'D .*']], [], [['suppressMatch', 'maybe']]]) {
    ops.push(req(text, 'FrenchSuppressMisspelledSuggestionsFilter', args, { from: 8, to: 13, words: w, suggestions: sug, message: 'sup' }));
    ops.push(req(text, 'FrenchSuppressMisspelledSuggestionsFilter', args, { from: 8, to: 13, words: w, suggestions: ['qwertzx', 'xyzzyq'], message: 'sup' }));
    ops.push(req(text, 'FrenchSuppressMisspelledSuggestionsFilter', args, { from: 8, to: 13, words: w, suggestions: [], message: 'sup' }));
  }
  wr('direct-FrenchSuppressMisspelledSuggestionsFilter', 'FR-0066 FrenchSuppressMisspelledSuggestionsFilter direct filter-run on suggestion lists', ops);
}
// FrenchPartialPosTagFilter direct (FR-0065, no XML use)
{
  const ops = [];
  const cases = [['Il va refaire les chats et désabuser .', ['désabuser'], 8, ['regexp', 'dés(.*)'], 'V .*'], ['Il mange les pommes .', ['mange'], 1, ['regexp', '(.*)'], 'V .*'], ['Il lit des re-livres .', ['re-livres'], 3, ['regexp', 're-(.*)'], 'N .*'], ['Elle est super-contente .', ['super-contente'], 2, ['regexp', 'super-(.*)'], 'J .*'], ['Des anti-bruits .', ['anti-bruits'], 1, ['regexp', 'anti-(.*)'], 'N m p']];
  for (const [text, , no, rx, pos] of cases) {
    const w = words(text);
    for (const neg of ['', 'yes', 'no']) for (const pr of [pos, 'X .*', 'N.*', '.*']) {
      const args = [['no', String(no)], rx, ['postag_regexp', 'yes'], ['postag', pr]]; if (neg) args.push(['negate_pos', neg]);
      ops.push(req(text, 'FrenchPartialPosTagFilter', args, { words: w, message: 'pp', from: 0, to: 2, window: [1, w.length + 1] }));
    }
  }
  ops.push(req('Il va refaire les chats et désabuser .', 'FrenchPartialPosTagFilter', [], { message: 'pp', from: 0, to: 2 }));
  ops.push(req('Il va refaire les chats et désabuser .', 'FrenchPartialPosTagFilter', [['no', '99'], ['regexp', 'x'], ['postag_regexp', 'V']], { message: 'pp', from: 0, to: 2 }));
  wr('direct-FrenchPartialPosTagFilter', 'FR-0065 FrenchPartialPosTagFilter direct filter-run (runs the disambiguator; no XML use)', ops);
}
console.log(JSON.stringify(cnt));
