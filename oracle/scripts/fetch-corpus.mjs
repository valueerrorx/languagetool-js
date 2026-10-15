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
};
const WANT_SENTENCES = 320;

const ONLY = process.argv[2];
for (const [lang, src0] of Object.entries(SOURCES)) {
  if (ONLY && ONLY !== lang) continue;
  const parts = src0.parts ?? [{ ...src0, want: WANT_SENTENCES }];
  const chosen = [];
  let sentences = 0;
  const notes = [];
  for (const src of parts) {
  src.url = `https://www.gutenberg.org/cache/epub/${src.id}/pg${src.id}.txt`;
  const raw = (await (await fetch(src.url)).text()).replace(/\r\n/g, '\n');
  const start = raw.indexOf('*** START OF');
  const end = raw.indexOf('*** END OF');
  const body = raw.slice(raw.indexOf('\n', start) + 1, end);
  const paras = body.split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 150 && p.length < 900 && !/^[A-ZÄÖÜ ]+$/.test(p) && !/gutenberg|Illustration|\[/i.test(p));
  const count = (p) => (p.match(/[.!?]["»”']?(\s|$)/g) ?? []).length;
  const stride = Math.max(1, Math.floor(paras.length / 400));
  const before = sentences;
  for (let i = Math.floor(paras.length * 0.05); i < paras.length && sentences - before < src.want; i += stride) {
    const c = count(paras[i]);
    if (c >= 3 && c <= 8) { chosen.push(paras[i]); sentences += c; }
  }
  notes.push(`Project Gutenberg #${src.id}, "${src.title}", ${src.author}, ${src.url} (${sentences - before} sentences, stride ${stride})`);
  }
  const dir = path.join(ROOT, 'oracle/corpus', lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'corpus.txt'), chosen.join('\n\n') + '\n');
  writeFileSync(path.join(dir, 'SOURCE.md'), `# ${lang} corpus\n\nSources:\n${notes.map((n) => `- ${n}`).join('\n')}\nLicence: public domain (authors died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer).\nSelection: oracle/scripts/fetch-corpus.mjs (every strideth paragraph of 150-900 chars with 3-8 sentences from 5% into each text, until the per-source sentence quota). ${chosen.length} paragraphs, about ${sentences} sentences.\nUsed as test input only (D-045).\n`);
  console.log(lang, chosen.length, 'paragraphs', sentences, 'sentences');
}
