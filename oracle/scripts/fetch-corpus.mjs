// Builds oracle/corpus/<lang>/corpus.txt from public-domain Project Gutenberg texts (D-045).
// Deterministic: fixed sources, fixed stride, first N paragraphs of 3-8 sentences. Run once; output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const SOURCES = {
  // de: genuine German originals (the former #2591 was the English Grimm translation); `want` = sentence quota per part
  de: { parts: [
    { id: 7205, want: 90, title: 'Also sprach Zarathustra', author: 'Friedrich Nietzsche (d. 1900)' },
    { id: 40739, want: 100, title: 'Die Traumdeutung', author: 'Sigmund Freud (d. 1939)' },
    { id: 5323, want: 80, title: 'Effi Briest', author: 'Theodor Fontane (d. 1898)' },
    { id: 22367, want: 50, title: 'Die Verwandlung', author: 'Franz Kafka (d. 1924)' },
  ] },
  en: { id: 1342, url: 'https://www.gutenberg.org/cache/epub/1342/pg1342.txt', title: 'Pride and Prejudice', author: 'Jane Austen (d. 1817)' },
  fr: { id: 4650, url: 'https://www.gutenberg.org/cache/epub/4650/pg4650.txt', title: 'Candide', author: 'Voltaire (d. 1778)' },
  // wave-2 (W42): older prose, partly pre-reform / OCR-ish spelling
  it: { parts: [
    { id: 52484, want: 90, title: 'Le avventure di Pinocchio', author: 'Carlo Collodi (d. 1890)' },
    { id: 45334, want: 120, title: 'I promessi sposi, vol. 1', author: 'Alessandro Manzoni (d. 1873)' },
    { id: 25179, want: 110, title: 'La carità del prossimo', author: 'Vittorio Bersezio (d. 1900)' },
  ] },
  pl: { parts: [
    { id: 8119, want: 90, title: 'Sklepy cynamonowe', author: 'Bruno Schulz (d. 1942)' },
    { id: 34635, want: 110, title: 'Menazerya ludzka', author: 'Gabriela Zapolska (d. 1921)' },
    { id: 38459, want: 120, title: 'Bez przewodnika', author: 'Cecylia Niewiadomska (d. 1925)' },
    { id: 28014, want: 100, title: 'Jeden miesiąc życia', author: 'Ludwik Bruner (d. 1913)' },
  ] },
  sl: { parts: [
    { id: 75797, want: 190, title: 'Deseti brat', author: 'Josip Jurčič (d. 1881)' },
    { id: 59722, want: 130, title: 'Bahovi huzarji in Iliri (Janeza Trdine zbrani spisi 1)', author: 'Janez Trdina (d. 1905)' },
  ] },
  sk: { parts: [
    { wiki: 'sk.wikisource.org', page: 'Dva dni v Chujave', want: 320, title: 'Dva dni v Chujave', author: 'Jonáš Záborský (d. 1876)' },
  ] },
  ru: { parts: [
    { wiki: 'ru.wikisource.org', page: Array.from({ length: 19 }, (_, i) => `Палата № 6 (Чехов)/Глава ${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX'][i]}`), want: 320, title: 'Палата № 6', author: 'Anton Chekhov (d. 1904)' },
  ] },
  es: { parts: [
    { id: 320, want: 60, title: 'Vida de Lazarillo de Tormes', author: 'Anonymous (16th century)' },
    { id: 52597, want: 130, title: 'Insolación y Morriña', author: 'Emilia Pardo Bazán (d. 1921)' },
    { id: 25777, want: 130, title: 'El idilio de un enfermo', author: 'Armando Palacio Valdés (d. 1938)' },
  ] },
};
const WANT_SENTENCES = 320;

// fetch with retries (Gutenberg is flaky)
async function getRetry(url) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'LT-JS-oracle-corpus/1.0 (valueerror@gmail.com)' } });
      if (r.ok) return r;
      throw new Error(`HTTP ${r.status} ${url}`);
    } catch (e) { if (i >= 8) throw e; await new Promise((res) => setTimeout(res, 15000)); }
  }
}

const ONLY = process.argv[2];
for (const [lang, src0] of Object.entries(SOURCES)) {
  if (ONLY && ONLY !== lang) continue;
  const parts = src0.parts ?? [{ ...src0, want: WANT_SENTENCES }];
  const chosen = [];
  let sentences = 0;
  const notes = [];
  for (const src of parts) {
  let body;
  if (src.wiki) {
    const pages = [].concat(src.page);
    src.url = `https://${src.wiki}/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=${encodeURIComponent(pages.join('|'))}`;
    body = '';
    for (const pg of pages) {
      const j = await (await getRetry(`https://${src.wiki}/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=${encodeURIComponent(pg)}`)).json();
      let t = Object.values(j.query.pages)[0].extract ?? '';
      if (!t) { // no plain-text extract: wikitext, template header dropped, markup stripped
        t = await (await getRetry(`https://${src.wiki}/w/index.php?action=raw&title=${encodeURIComponent(pg.replace(/ /g, '_'))}`)).text();
        if (t.startsWith('{{')) t = t.slice(t.indexOf('\n}}') + 3);
        t = t.replace(/&nbsp;/g, ' ').replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]*>/g, '').replace(/^==.*==$/gm, '');
      }
      body += t.replace(/\r\n/g, '\n') + '\n';
    }
  } else {
  src.url = `https://www.gutenberg.org/cache/epub/${src.id}/pg${src.id}.txt`;
  const raw = (await (await getRetry(src.url)).text()).replace(/\r\n/g, '\n');
  const start = raw.indexOf('*** START OF');
  const end = raw.indexOf('*** END OF');
  body = raw.slice(raw.indexOf('\n', start) + 1, end);
  }
  const paras = body.split(src.wiki ? /\n+/ : /\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 150 && p.length < 900 && !/^[A-ZÄÖÜ ]+$/.test(p) && !/gutenberg|Illustration|\[/i.test(p));
  const count = (p) => (p.match(/[.!?]["»”']?(\s|$)/g) ?? []).length;
  const stride = Math.max(1, Math.floor(paras.length / 400));
  const before = sentences;
  for (let i = Math.floor(paras.length * 0.05); i < paras.length && sentences - before < src.want; i += stride) {
    const c = count(paras[i]);
    if (c >= 3 && c <= 8) { chosen.push(paras[i]); sentences += c; }
  }
  notes.push(`${src.wiki ? `Wikisource (${src.wiki}, page "${src.page}")` : `Project Gutenberg #${src.id}`}, "${src.title}", ${src.author}, ${src.url} (${sentences - before} sentences, stride ${stride})`);
  }
  const dir = path.join(ROOT, 'oracle/corpus', lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'corpus.txt'), chosen.join('\n\n') + '\n');
  writeFileSync(path.join(dir, 'SOURCE.md'), `# ${lang} corpus\n\nSources:\n${notes.map((n) => `- ${n}`).join('\n')}\nLicence: public domain (authors died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer, Wikisource text as plain extract).\nSelection: oracle/scripts/fetch-corpus.mjs (every strideth paragraph of 150-900 chars with 3-8 sentences from 5% into each text, until the per-source sentence quota). ${chosen.length} paragraphs, about ${sentences} sentences.\nUsed as test input only (D-045).\n`);
  console.log(lang, chosen.length, 'paragraphs', sentences, 'sentences');
}
