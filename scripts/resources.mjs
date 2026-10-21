// npm run resources: copies the Java runtime resources byte-exact into resources/ (classpath layout) and writes MANIFEST.sha256.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZipEntries } from './lib/zip.mjs';
import { writeBuildInfo } from './build-info.mjs';
import { buildDescriptors } from './lib/language-descriptors.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.LTJS_JAVA_SRC ?? path.join(ROOT, 'oracle/java-src');
const OUT = path.join(ROOT, 'resources');
const DIST = path.join(SRC, 'languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT/libs');

// classpath order: first module wins on duplicate paths
const MODULES = ['languagetool-core', 'languagetool-commandline', 'languagetool-server', 'languagetool-language-modules/de', 'languagetool-language-modules/en', 'languagetool-language-modules/fr', 'languagetool-language-modules/sl'];
const JARS = ['german-pos-dict', 'english-pos-dict', 'french-pos-dict', 'opennlp-chunk-models', 'opennlp-postag-models', 'opennlp-tokenize-models', 'jwordsplitter', 'language-detector'];

const files = new Map(); // relative path -> { data(): Buffer, origin }
const conflicts = [];

// a path present in several classpath entries keeps the first copy; further copies go to .dup/<n>/<path> (Java ClassLoader#getResources returns all)
function add(rel, origin, data) {
  const old = files.get(rel);
  if (old) {
    if (!old.read().equals(data())) conflicts.push(`${rel}: ${old.origin} vs ${origin} (differs, first wins for getResource)`);
    let n = 1;
    while (files.has(`.dup/${n}/${rel}`)) n++;
    files.set(`.dup/${n}/${rel}`, { origin, read: data });
    return;
  }
  files.set(rel, { origin, read: data });
}

function walk(dir, base, cb) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, `${base}${e.name}/`, cb);
    else if (e.isFile()) cb(p, `${base}${e.name}`);
  }
}

for (const m of MODULES) {
  const dir = path.join(SRC, m, 'src/main/resources');
  if (!existsSync(dir)) throw new Error(`missing ${dir}`);
  walk(dir, '', (p, rel) => add(rel, m, () => readFileSync(p)));
}
// message bundles of all other language modules (JLanguageTool.getMessageBundle resolves every UI language, X-I18N)
for (const m of readdirSync(path.join(SRC, 'languagetool-language-modules')).sort()) {
  if (MODULES.includes(`languagetool-language-modules/${m}`)) continue;
  const dir = path.join(SRC, 'languagetool-language-modules', m, 'src/main/resources');
  if (!existsSync(dir)) continue;
  walk(dir, '', (p, rel) => {
    if (/(^|\/)MessagesBundle[^/]*\.properties$/.test(rel)) add(rel, `languagetool-language-modules/${m}`, () => readFileSync(p));
  });
}
for (const j of JARS) {
  const f = path.join(DIST, `${j}.jar`);
  if (!existsSync(f)) throw new Error(`missing ${f} (build the distribution, docs/inventory/BUILD.md)`);
  for (const e of readZipEntries(f)) {
    if (e.name.startsWith('META-INF/') || e.name.endsWith('.class')) continue;
    add(e.name, `${j}.jar`, () => e.read());
  }
}

// F18 (D-051/DEV-008): language detection needs every distribution language: common_words.txt and external profiles of all modules
const DIST_ROOT = path.dirname(DIST);
walk(path.join(DIST_ROOT, 'org/languagetool/resource'), 'org/languagetool/resource/', (p, rel) => {
  if (!/^org\/languagetool\/resource\/[^/]+\/(common_words\.txt|[^/]+\.profile)$/.test(rel)) return;
  if (!files.has(rel)) add(rel, 'distribution', () => readFileSync(p));
});
// descriptors of all distribution languages in Languages.get() order (merged language-module.properties, first class name wins)
const classNames = [];
for (const line of readFileSync(path.join(DIST_ROOT, 'META-INF/org/languagetool/language-module.properties'), 'utf8').split('\n')) {
  const m = /^languageClasses\s*=\s*(.*)$/.exec(line.trim());
  if (m) for (const c of m[1].split(/\s*,\s*/)) if (c !== '' && !classNames.includes(c)) classNames.push(c);
}
const descriptors = Buffer.from(`${JSON.stringify(buildDescriptors(SRC, classNames), null, 1)}\n`);
add('ltjs/detection-languages.json', 'generated', () => descriptors);

rmSync(OUT, { recursive: true, force: true });
const manifest = [];
for (const rel of [...files.keys()].sort()) {
  const data = files.get(rel).read();
  const target = path.join(OUT, rel);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
  manifest.push(`${createHash('sha256').update(data).digest('hex')}  ${rel}`);
}
writeFileSync(path.join(OUT, 'MANIFEST.sha256'), `${manifest.join('\n')}\n`);
writeBuildInfo(SRC, OUT);
console.log(`resources: ${files.size} files, ${conflicts.length} conflicts`);
for (const c of conflicts) console.log(`  conflict ${c}`);
if (!statSync(OUT).isDirectory()) process.exit(1);
