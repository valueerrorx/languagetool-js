// npm run build: creates dist/packages/<name>/ (@valueerror/ltjs-core + @valueerror/ltjs-lang-<code> x9) from src/ and resources/, then `npm pack` into dist/tarballs/ (D-060).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const RES = path.join(ROOT, 'resources');
const DIST = path.join(ROOT, 'dist');
const PKGS = path.join(DIST, 'packages');
const TARBALLS = path.join(DIST, 'tarballs');
const VERSION = '0.2.0';
const CODES = ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk', 'sl'];
const NAMES = { de: 'German', en: 'English', es: 'Spanish', fr: 'French', it: 'Italian', pl: 'Polish', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian' };
// German variant packages (D-066): only the variant dictionaries/word lists/rules; the classes stay in lang-de, the variant is listed by its own language-module.properties
const VARIANTS = {
  'de-at': { base: 'de', name: 'German (Austria)', cls: 'AustrianGerman', example: 'de-AT', files: /^org\/languagetool\/resource\/de\/hunspell\/(de_AT[._]|spelling-de-AT\.txt$)/ },
  'de-ch': { base: 'de', name: 'German (Swiss)', cls: 'SwissGerman', example: 'de-CH', files: /^org\/languagetool\/(resource\/de\/hunspell\/(de_CH[._]|spelling-de-CH\.txt$)|rules\/de\/de-CH\/)/ },
};
const VARIANT_CODES = Object.keys(VARIANTS);
const SHARED_VARIANT_LICENSES = ['org/languagetool/resource/de/hunspell/COPYING_GPLv2.txt', 'org/languagetool/resource/de/hunspell/COPYING_GPLv3.txt'];
const DICT_JAR = { de: 'german-pos-dict', en: 'english-pos-dict', es: 'spanish-pos-dict', fr: 'french-pos-dict' };
const LICENSE_FILE = /(licen[sc]e|copying|readme)/i;

if (!existsSync(RES)) throw new Error('resources/ is missing, run `npm run resources` first');

// all files below dir as [relative posix path, absolute path]
function walk(dir, base = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, `${base}${e.name}/`));
    else if (e.isFile()) out.push([`${base}${e.name}`, p]);
  }
  return out;
}

function copyTo(target, from) {
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(from, target);
}

// which package a resources/ file belongs to: a language code or 'core'
function classify(rel) {
  for (const [v, def] of Object.entries(VARIANTS)) if (def.files.test(rel)) return v;
  let m = /^org\/languagetool\/resource\/([a-z]{2})\/(.*)$/.exec(rel);
  if (m && CODES.includes(m[1])) {
    // common words and external profiles of the language detection stay in core (detection covers every distribution language)
    if (!m[2].includes('/') && (m[2] === 'common_words.txt' || m[2].endsWith('.profile'))) return 'core';
    return m[1];
  }
  m = /^org\/languagetool\/rules\/([a-z]{2})\//.exec(rel);
  if (m && CODES.includes(m[1])) return m[1];
  if (rel.startsWith('de/danielnaber/jwordsplitter/')) return 'de';
  if (/^en-(chunker|pos-maxent|token)\.bin$/.test(rel)) return 'en';
  if (rel.endsWith('META-INF/org/languagetool/language-module.properties')) {
    const classes = readFileSync(path.join(RES, rel), 'utf8');
    for (const code of CODES) if (new RegExp(`org\\.languagetool\\.language\\.${NAMES[code]}\\b`).test(classes)) return code;
    throw new Error(`unknown language module ${rel}`);
  }
  return 'core';
}

// rewrites a relative import of a language file that leaves src/lang/<code>/ into an @valueerror/ltjs-core specifier
function rewriteImports(file, code, text) {
  const langDir = path.join(SRC, 'lang', code);
  return text.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]+)\2/g, (all, pre, q, spec) => {
    const target = path.resolve(path.dirname(file), spec);
    if (target === langDir || target.startsWith(langDir + path.sep)) return all;
    if (!target.startsWith(SRC + path.sep)) throw new Error(`${file}: import ${spec} leaves src/`);
    if (target.startsWith(path.join(SRC, 'lang') + path.sep)) throw new Error(`${file}: import ${spec} reaches into another language`);
    if (!existsSync(target)) throw new Error(`${file}: import ${spec} does not exist`);
    return `${pre}${q}@valueerror/ltjs-core/src/${path.relative(SRC, target).split(path.sep).join('/')}${q}`;
  });
}

function writeJson(file, obj) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);
}

const licenseText = readFileSync(path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));

function dictLicenseSummary(jar) {
  const pom = readFileSync(path.join(ROOT, `packaging/licenses/${jar}.pom.xml`), 'utf8');
  const m = /<license>\s*<name>([^<]*)<\/name>\s*<url>([^<]*)<\/url>/.exec(pom);
  return m ? `${m[1].trim()} (${m[2].trim()})` : 'see the pom';
}

// fails the build when paths differ only by case (they overwrite each other on macOS/Windows)
function assertNoCaseCollisions(label, paths) {
  const seen = new Map();
  const bad = [];
  for (const p of paths) {
    const k = p.toLowerCase();
    if (seen.has(k) && seen.get(k) !== p) bad.push(`${seen.get(k)} <-> ${p}`);
    else seen.set(k, p);
  }
  if (bad.length) {
    console.error(`case-only path collisions in ${label}:\n  ${bad.join('\n  ')}`);
    process.exit(1);
  }
}

assertNoCaseCollisions('git ls-files', execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean));
rmSync(DIST, { recursive: true, force: true });
mkdirSync(PKGS, { recursive: true });
mkdirSync(TARBALLS, { recursive: true });
const rootPkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const byPackage = new Map([['core', []], ...CODES.map((c) => [c, []]), ...VARIANT_CODES.map((c) => [c, []])]);
for (const [rel, abs] of walk(RES)) byPackage.get(classify(rel)).push([rel, abs]);

const commonPackageFields = {
  version: VERSION,
  license: 'GPL-3.0-or-later',
  type: 'module',
  engines: { node: '>=24' },
  author: 'Thomas Weissel',
  repository: { type: 'git', url: 'git+https://github.com/valueerrorx/languagetool-js.git' },
  homepage: 'https://github.com/valueerrorx/languagetool-js#readme',
  bugs: { url: 'https://github.com/valueerrorx/languagetool-js/issues' },
  keywords: ['languagetool', 'grammar', 'spellcheck', 'spell-checker', 'proofreading', 'grammar-checker', 'style-checker', 'nlp', 'german', 'austrian-german', 'swiss-german', 'english', 'french', 'spanish', 'italian', 'polish', 'russian', 'slovak', 'slovenian'],
  publishConfig: { access: 'public' },
};

const READMEFOOT = `
## Documentation

See the [README on GitHub](https://github.com/valueerrorx/languagetool-js#readme) and docs/EMBEDDING.md in the repository.

## Licence

GPL-3.0-or-later (see LICENSE, NOTICE and licenses/). This is a JavaScript port of [LanguageTool](https://languagetool.org) (LGPL-2.1-or-later); credit to the LanguageTool authors and to the authors of the bundled dictionaries (see NOTICE).
`;

// ---- @valueerror/ltjs-core
{
  const dir = path.join(PKGS, 'core');
  for (const [rel, abs] of walk(SRC)) {
    const m = /^lang\/([a-z]{2})\//.exec(rel);
    if (m && CODES.includes(m[1])) continue; // language code goes to the language packages
    if (rel === 'lang/register.js') continue; // generated below
    copyTo(path.join(dir, 'src', rel), abs);
  }
  // register.js: the lines of the core classes, then the installed language packages (top-level await)
  const lines = readFileSync(path.join(SRC, 'lang/register.js'), 'utf8').split('\n');
  const coreLines = lines.filter((l) => !/^import '\.\/[a-z]{2}\//.test(l));
  writeFileSync(path.join(dir, 'src/lang/register.js'),
    `${coreLines.join('\n').trimEnd()}\nimport { discoverLanguagePackages } from './discover.js';\n\n// registers the installed @valueerror/ltjs-lang-<code> packages\nexport const installedLanguages = await discoverLanguagePackages();\n`);
  for (const f of readdirSync(path.join(ROOT, 'bin'))) copyTo(path.join(dir, 'bin', f), path.join(ROOT, 'bin', f));
  for (const [rel, abs] of byPackage.get('core')) copyTo(path.join(dir, 'resources', rel), abs);
  copyTo(path.join(dir, 'LICENSE'), path.join(ROOT, 'packaging/licenses/GPL-3.0.txt'));
  copyTo(path.join(dir, 'licenses/LGPL-2.1.txt'), path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));
  writeFileSync(path.join(dir, 'NOTICE'), [
    'LT-JS (@valueerror/ltjs-core) is a JavaScript port of LanguageTool (https://languagetool.org, LGPL-2.1-or-later, licenses/LGPL-2.1.txt), distributed under GPL-3.0-or-later (LICENSE).',
    'Data files keep their own licenses (see licenses/).',
    '',
    'resources/ holds the LanguageTool core resources (rules, message bundles, segment.srx, language detection data) unchanged.',
    'resources/LICENSE (Apache License 2.0) and the files below resources/ keep the licenses of the bundled third-party data.',
    'Language data (dictionaries, rules) ships in the @valueerror/ltjs-lang-<code> packages with their own NOTICE.',
    '',
  ].join('\n'));
  writeFileSync(path.join(dir, 'README.md'), `# @valueerror/ltjs-core

JavaScript port of LanguageTool: library API (\`check\`, \`startServer\`, \`listLanguages\`), CLI (\`ltjs\`) and LT-compatible HTTP server (\`ltjs-server\`).
Install at least one language package (\`@valueerror/ltjs-lang-<code>\`: de en es fr it pl ru sk sl).

## Install

\`\`\`
npm install @valueerror/ltjs-core @valueerror/ltjs-lang-de
\`\`\`

## Usage

\`\`\`js
import { check } from '@valueerror/ltjs-core';

const result = await check('Ich glaube, das es geht.', { language: 'de-DE' });
console.log(result.matches);
\`\`\`

CLI: \`npx ltjs -l de-DE file.txt\`, server: \`npx ltjs-server --port 8081\`.
${READMEFOOT}`);
  writeJson(path.join(dir, 'package.json'), {
    name: '@valueerror/ltjs-core',
    description: 'LanguageTool port to JavaScript: core, server and CLI (languages in @valueerror/ltjs-lang-* packages)',
    ...commonPackageFields,
    main: './src/index.js',
    exports: { '.': './src/index.js', './register': './src/lang/register.js', './src/*': './src/*', './package.json': './package.json' },
    bin: { ltjs: 'bin/lt-cli.mjs', 'ltjs-server': 'bin/lt-server.mjs' },
    files: ['src', 'bin', 'resources', 'licenses', 'LICENSE', 'NOTICE', 'README.md'],
    dependencies: { express: rootPkg.dependencies.express },
    peerDependencies: Object.fromEntries([...CODES, ...VARIANT_CODES].map((c) => [`@valueerror/ltjs-lang-${c}`, `^${VERSION}`])),
    peerDependenciesMeta: Object.fromEntries([...CODES, ...VARIANT_CODES].map((c) => [`@valueerror/ltjs-lang-${c}`, { optional: true }])),
  });
}

// ---- @valueerror/ltjs-lang-<code>
const registerLines = readFileSync(path.join(SRC, 'lang/register.js'), 'utf8').split('\n');
for (const code of CODES) {
  const dir = path.join(PKGS, `lang-${code}`);
  for (const [rel, abs] of walk(path.join(SRC, 'lang', code))) {
    const target = path.join(dir, 'src/lang', code, rel);
    if (rel.endsWith('.js')) {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, rewriteImports(abs, code, readFileSync(abs, 'utf8')));
    } else {
      copyTo(target, abs);
    }
  }
  const resources = byPackage.get(code);
  const licenseFiles = [];
  for (const [rel, abs] of resources) {
    // the per-module language-module.properties is the primary one inside the language package
    const target = rel.replace(/^\.dup\/\d+\//, '');
    copyTo(path.join(dir, 'resources', target), abs);
    if (LICENSE_FILE.test(path.basename(rel)) && !rel.endsWith('.js')) {
      licenseFiles.push(rel);
      copyTo(path.join(dir, 'licenses', rel.replace(/^org\/languagetool\//, '').replace(/\//g, '_')), abs);
    }
  }
  if (code === 'de') {
    // the variants are listed by their own packages (a missing variant package behaves like an uninstalled language)
    const props = path.join(dir, 'resources/META-INF/org/languagetool/language-module.properties');
    const text = readFileSync(props, 'utf8');
    const stripped = text.replace(/,org\.languagetool\.language\.(AustrianGerman|SwissGerman)\b/g, '');
    if (stripped === text) throw new Error('German language-module.properties has no variant classes');
    writeFileSync(props, stripped);
  }
  if (DICT_JAR[code]) copyTo(path.join(dir, 'licenses', `${DICT_JAR[code]}.pom.xml`), path.join(ROOT, `packaging/licenses/${DICT_JAR[code]}.pom.xml`));
  copyTo(path.join(dir, 'licenses/LGPL-2.1.txt'), path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));
  copyTo(path.join(dir, 'LICENSE'), path.join(ROOT, 'packaging/licenses/GPL-3.0.txt'));
  writeFileSync(path.join(dir, 'resource-root.js'),
    `// registers the resources/ directory of this package as an additional resource root of @valueerror/ltjs-core\nimport { addResourceRoot } from '@valueerror/ltjs-core/src/core/resources/ResourceDataBroker.js';\n\naddResourceRoot(new URL('./resources/', import.meta.url));\n`);
  const own = registerLines.filter((l) => l.startsWith(`import './${code}/`)).map((l) => l.replace(`import './${code}/`, `import './src/lang/${code}/`));
  writeFileSync(path.join(dir, 'index.js'),
    `// ${NAMES[code]}: registers the language classes (Java: language-module.properties of languagetool-language-modules/${code}) and the resource root\nimport './resource-root.js';\n${own.join('\n')}\n`);
  const notice = [
    `@valueerror/ltjs-lang-${code}: ${NAMES[code]} language data and code of LT-JS, a JavaScript port of LanguageTool (https://languagetool.org).`,
    'LT-JS is a port of LanguageTool (LGPL-2.1-or-later, licenses/LGPL-2.1.txt), distributed under GPL-3.0-or-later (LICENSE).',
    'Data files keep their own licenses (see licenses/).',
    '',
    'The files below resources/ are unchanged copies of the LanguageTool language module (rules, dictionaries, word lists)',
    DICT_JAR[code] ? `and of the ${DICT_JAR[code]} dictionary package (license: ${dictLicenseSummary(DICT_JAR[code])}; pom in licenses/${DICT_JAR[code]}.pom.xml).` : 'and of the dictionaries bundled with it.',
    'Dictionaries, hunspell data and word lists keep their own licenses; the license and readme files of the sources are copied to licenses/:',
    ...licenseFiles.map((f) => `  - ${f}`),
    '',
  ].join('\n');
  writeFileSync(path.join(dir, 'NOTICE'), notice);
  writeFileSync(path.join(dir, 'README.md'), `# @valueerror/ltjs-lang-${code}

${NAMES[code]} language package of LT-JS (JavaScript port of LanguageTool). @valueerror/ltjs-core discovers it at runtime.

## Install

\`\`\`
npm install @valueerror/ltjs-core @valueerror/ltjs-lang-${code}
\`\`\`

## Usage

\`\`\`js
import { check } from '@valueerror/ltjs-core';

const result = await check('...', { language: '${code}' });
console.log(result.matches);
\`\`\`
${READMEFOOT}`);
  writeJson(path.join(dir, 'package.json'), {
    name: `@valueerror/ltjs-lang-${code}`,
    description: `${NAMES[code]} language data and rules for @valueerror/ltjs-core`,
    ...commonPackageFields,
    main: './index.js',
    exports: { '.': './index.js', './package.json': './package.json' },
    sideEffects: true,
    files: ['index.js', 'resource-root.js', 'src', 'resources', 'licenses', 'LICENSE', 'NOTICE', 'README.md'],
    peerDependencies: { '@valueerror/ltjs-core': `^${VERSION}` },
  });
}

// ---- @valueerror/ltjs-lang-de-at, @valueerror/ltjs-lang-de-ch (D-066)
for (const code of VARIANT_CODES) {
  const v = VARIANTS[code];
  const dir = path.join(PKGS, `lang-${code}`);
  const licenseFiles = [];
  for (const [rel, abs] of byPackage.get(code)) {
    copyTo(path.join(dir, 'resources', rel), abs);
    if (LICENSE_FILE.test(path.basename(rel))) {
      licenseFiles.push(rel);
      copyTo(path.join(dir, 'licenses', rel.replace(/^org\/languagetool\//, '').replace(/\//g, '_')), abs);
    }
  }
  for (const rel of SHARED_VARIANT_LICENSES) {
    licenseFiles.push(rel);
    copyTo(path.join(dir, 'licenses', rel.replace(/^org\/languagetool\//, '').replace(/\//g, '_')), path.join(RES, rel));
  }
  mkdirSync(path.join(dir, 'resources/META-INF/org/languagetool'), { recursive: true });
  writeFileSync(path.join(dir, 'resources/META-INF/org/languagetool/language-module.properties'), `languageClasses=org.languagetool.language.${v.cls}\n`);
  copyTo(path.join(dir, 'licenses/LGPL-2.1.txt'), path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));
  copyTo(path.join(dir, 'LICENSE'), path.join(ROOT, 'packaging/licenses/GPL-3.0.txt'));
  writeFileSync(path.join(dir, 'resource-root.js'),
    `// registers the resources/ directory of this package as an additional resource root of @valueerror/ltjs-core\nimport { addResourceRoot } from '@valueerror/ltjs-core/src/core/resources/ResourceDataBroker.js';\n\naddResourceRoot(new URL('./resources/', import.meta.url));\n`);
  writeFileSync(path.join(dir, 'index.js'),
    `// ${v.name}: variant data of @valueerror/ltjs-lang-${v.base}; the language class ${v.cls} is part of that package and is listed by this package's language-module.properties\nimport '@valueerror/ltjs-lang-${v.base}';\nimport './resource-root.js';\n`);
  writeFileSync(path.join(dir, 'NOTICE'), [
    `@valueerror/ltjs-lang-${code}: ${v.name} variant data of LT-JS, a JavaScript port of LanguageTool (https://languagetool.org).`,
    'LT-JS is a port of LanguageTool (LGPL-2.1-or-later, licenses/LGPL-2.1.txt), distributed under GPL-3.0-or-later (LICENSE).',
    'Data files keep their own licenses (see licenses/).',
    '',
    'The files below resources/ are unchanged copies of the variant files of the LanguageTool German module (variant hunspell/morfologik dictionaries, word lists, rules).',
    'The hunspell dictionary data (frami) keeps its own licenses; the license and readme files of the sources are copied to licenses/:',
    ...licenseFiles.map((f) => `  - ${f}`),
    '',
  ].join('\n'));
  writeFileSync(path.join(dir, 'README.md'), `# @valueerror/ltjs-lang-${code}

${v.name} variant data (dictionaries, word lists${code === 'de-ch' ? ', rules' : ''}) for LT-JS (JavaScript port of LanguageTool). Adds the language \`${v.example}\` to @valueerror/ltjs-lang-${v.base}; without this package \`${v.example}\` is not available.

## Install

\`\`\`
npm install @valueerror/ltjs-core @valueerror/ltjs-lang-${v.base} @valueerror/ltjs-lang-${code}
\`\`\`

## Usage

\`\`\`js
import { check } from '@valueerror/ltjs-core';

const result = await check('...', { language: '${v.example}' });
console.log(result.matches);
\`\`\`
${READMEFOOT}`);
  writeJson(path.join(dir, 'package.json'), {
    name: `@valueerror/ltjs-lang-${code}`,
    description: `${v.name} variant data for @valueerror/ltjs-lang-${v.base}`,
    ...commonPackageFields,
    main: './index.js',
    exports: { '.': './index.js', './package.json': './package.json' },
    sideEffects: true,
    files: ['index.js', 'resource-root.js', 'resources', 'licenses', 'LICENSE', 'NOTICE', 'README.md'],
    peerDependencies: { '@valueerror/ltjs-core': `^${VERSION}`, [`@valueerror/ltjs-lang-${v.base}`]: `^${VERSION}` },
  });
}

// ---- npm pack
const sizes = [];
for (const d of readdirSync(PKGS)) assertNoCaseCollisions(`package ${d}`, walk(path.join(PKGS, d)).map(([rel]) => rel));
for (const name of ['core', ...CODES.map((c) => `lang-${c}`), ...VARIANT_CODES.map((c) => `lang-${c}`)]) {
  const dir = path.join(PKGS, name);
  execFileSync('npm', ['pack', '--pack-destination', TARBALLS, '--silent'], { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] });
  const tgz = path.join(TARBALLS, `valueerror-ltjs-${name}-${VERSION}.tgz`);
  sizes.push(`${name}: ${(statSync(tgz).size / 1048576).toFixed(1)} MB tarball`);
}
console.log(`packages in ${path.relative(ROOT, PKGS)}, tarballs in ${path.relative(ROOT, TARBALLS)}`);
for (const s of sizes) console.log(`  ${s}`);
