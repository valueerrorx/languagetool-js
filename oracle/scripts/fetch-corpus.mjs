// Builds oracle/corpus/<lang>/corpus.txt from public-domain Project Gutenberg texts (D-045).
// Deterministic: fixed sources, fixed stride, first N paragraphs of 3-8 sentences. Run once; output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const SOURCES = {
  de: { id: 2591, url: 'https://www.gutenberg.org/cache/epub/2591/pg2591.txt', title: 'Kinder- und Hausmaerchen (Brueder Grimm)', author: 'Jacob and Wilhelm Grimm (d. 1863, 1859)' },
  en: { id: 1342, url: 'https://www.gutenberg.org/cache/epub/1342/pg1342.txt', title: 'Pride and Prejudice', author: 'Jane Austen (d. 1817)' },
  fr: { id: 4650, url: 'https://www.gutenberg.org/cache/epub/4650/pg4650.txt', title: 'Candide', author: 'Voltaire (d. 1778)' },
};
const WANT_SENTENCES = 320;

for (const [lang, src] of Object.entries(SOURCES)) {
  const raw = (await (await fetch(src.url)).text()).replace(/\r\n/g, '\n');
  const start = raw.indexOf('*** START OF');
  const end = raw.indexOf('*** END OF');
  const body = raw.slice(raw.indexOf('\n', start) + 1, end);
  const paras = body.split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 150 && p.length < 900 && !/^[A-ZÄÖÜ ]+$/.test(p) && !/gutenberg|Illustration|\[/i.test(p));
  const count = (p) => (p.match(/[.!?]["»”']?(\s|$)/g) ?? []).length;
  const chosen = [];
  let sentences = 0;
  const stride = Math.max(1, Math.floor(paras.length / 400));
  for (let i = Math.floor(paras.length * 0.05); i < paras.length && sentences < WANT_SENTENCES; i += stride) {
    const c = count(paras[i]);
    if (c >= 3 && c <= 8) { chosen.push(paras[i]); sentences += c; }
  }
  const dir = path.join(ROOT, 'oracle/corpus', lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'corpus.txt'), chosen.join('\n\n') + '\n');
  writeFileSync(path.join(dir, 'SOURCE.md'), `# ${lang} corpus\n\nSource: Project Gutenberg #${src.id}, "${src.title}", ${src.author}. ${src.url}\nLicence: public domain (author died more than 70 years ago; Gutenberg text used without the Gutenberg licence header/footer).\nSelection: oracle/scripts/fetch-corpus.mjs (every ${stride}th paragraph of 150-900 chars with 3-8 sentences from 5% into the text, until ${WANT_SENTENCES} sentences). ${chosen.length} paragraphs, about ${sentences} sentences.\nUsed as test input only (D-045).\n`);
  console.log(lang, chosen.length, 'paragraphs', sentences, 'sentences');
}
