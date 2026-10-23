// npm run build: creates dist/packages/<name>/ (@ltjs/core + @ltjs/lang-<code> x9) from src/ and resources/, then `npm pack` into dist/tarballs/ (D-060).
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
const VERSION = '0.1.0';
const CODES = ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk', 'sl'];
const NAMES = { de: 'German', en: 'English', es: 'Spanish', fr: 'French', it: 'Italian', pl: 'Polish', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian' };
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

// rewrites a relative import of a language file that leaves src/lang/<code>/ into an @ltjs/core specifier
function rewriteImports(file, code, text) {
  const langDir = path.join(SRC, 'lang', code);
  return text.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]+)\2/g, (all, pre, q, spec) => {
    const target = path.resolve(path.dirname(file), spec);
    if (target === langDir || target.startsWith(langDir + path.sep)) return all;
    if (!target.startsWith(SRC + path.sep)) throw new Error(`${file}: import ${spec} leaves src/`);
    if (target.startsWith(path.join(SRC, 'lang') + path.sep)) throw new Error(`${file}: import ${spec} reaches into another language`);
    if (!existsSync(target)) throw new Error(`${file}: import ${spec} does not exist`);
    return `${pre}${q}@ltjs/core/src/${path.relative(SRC, target).split(path.sep).join('/')}${q}`;
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

rmSync(DIST, { recursive: true, force: true });
mkdirSync(PKGS, { recursive: true });
mkdirSync(TARBALLS, { recursive: true });
const rootPkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const byPackage = new Map([['core', []], ...CODES.map((c) => [c, []])]);
for (const [rel, abs] of walk(RES)) byPackage.get(classify(rel)).push([rel, abs]);

const commonPackageFields = {
  version: VERSION,
  license: 'GPL-3.0-or-later',
  type: 'module',
  engines: { node: '>=24' },
  homepage: 'https://languagetool.org',
};

// ---- @ltjs/core
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
    `${coreLines.join('\n').trimEnd()}\nimport { discoverLanguagePackages } from './discover.js';\n\n// registers the installed @ltjs/lang-<code> packages\nexport const installedLanguages = await discoverLanguagePackages();\n`);
  for (const f of readdirSync(path.join(ROOT, 'bin'))) copyTo(path.join(dir, 'bin', f), path.join(ROOT, 'bin', f));
  for (const [rel, abs] of byPackage.get('core')) copyTo(path.join(dir, 'resources', rel), abs);
  copyTo(path.join(dir, 'LICENSE'), path.join(ROOT, 'packaging/licenses/GPL-3.0.txt'));
  copyTo(path.join(dir, 'licenses/LGPL-2.1.txt'), path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));
  writeFileSync(path.join(dir, 'NOTICE'), [
    'LT-JS (@ltjs/core) is a JavaScript port of LanguageTool (https://languagetool.org, LGPL-2.1-or-later, licenses/LGPL-2.1.txt), distributed under GPL-3.0-or-later (LICENSE).',
    'Data files keep their own licenses (see licenses/).',
    '',
    'resources/ holds the LanguageTool core resources (rules, message bundles, segment.srx, language detection data) unchanged.',
    'resources/LICENSE (Apache License 2.0) and the files below resources/ keep the licenses of the bundled third-party data.',
    'Language data (dictionaries, rules) ships in the @ltjs/lang-<code> packages with their own NOTICE.',
    '',
  ].join('\n'));
  writeFileSync(path.join(dir, 'README.md'), `# @ltjs/core\n\nJavaScript port of LanguageTool: library API (\`check\`, \`startServer\`, \`listLanguages\`), CLI (\`ltjs\`) and LT-compatible HTTP server (\`ltjs-server\`).\nInstall at least one language package (@ltjs/lang-de, @ltjs/lang-en, ...). See docs/EMBEDDING.md of the repository.\n`);
  writeJson(path.join(dir, 'package.json'), {
    name: '@ltjs/core',
    description: 'LanguageTool port to JavaScript: core, server and CLI (languages in @ltjs/lang-* packages)',
    ...commonPackageFields,
    main: './src/index.js',
    exports: { '.': './src/index.js', './register': './src/lang/register.js', './src/*': './src/*', './package.json': './package.json' },
    bin: { ltjs: 'bin/lt-cli.mjs', 'ltjs-server': 'bin/lt-server.mjs' },
    files: ['src', 'bin', 'resources', 'licenses', 'LICENSE', 'NOTICE', 'README.md'],
    dependencies: { express: rootPkg.dependencies.express },
    peerDependencies: Object.fromEntries(CODES.map((c) => [`@ltjs/lang-${c}`, `^${VERSION}`])),
    peerDependenciesMeta: Object.fromEntries(CODES.map((c) => [`@ltjs/lang-${c}`, { optional: true }])),
  });
}

// ---- @ltjs/lang-<code>
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
  if (DICT_JAR[code]) copyTo(path.join(dir, 'licenses', `${DICT_JAR[code]}.pom.xml`), path.join(ROOT, `packaging/licenses/${DICT_JAR[code]}.pom.xml`));
  copyTo(path.join(dir, 'licenses/LGPL-2.1.txt'), path.join(ROOT, 'packaging/licenses/LGPL-2.1.txt'));
  copyTo(path.join(dir, 'LICENSE'), path.join(ROOT, 'packaging/licenses/GPL-3.0.txt'));
  writeFileSync(path.join(dir, 'resource-root.js'),
    `// registers the resources/ directory of this package as an additional resource root of @ltjs/core\nimport { addResourceRoot } from '@ltjs/core/src/core/resources/ResourceDataBroker.js';\n\naddResourceRoot(new URL('./resources/', import.meta.url));\n`);
  const own = registerLines.filter((l) => l.startsWith(`import './${code}/`)).map((l) => l.replace(`import './${code}/`, `import './src/lang/${code}/`));
  writeFileSync(path.join(dir, 'index.js'),
    `// ${NAMES[code]}: registers the language classes (Java: language-module.properties of languagetool-language-modules/${code}) and the resource root\nimport './resource-root.js';\n${own.join('\n')}\n`);
  const notice = [
    `@ltjs/lang-${code}: ${NAMES[code]} language data and code of LT-JS, a JavaScript port of LanguageTool (https://languagetool.org).`,
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
  writeFileSync(path.join(dir, 'README.md'), `# @ltjs/lang-${code}\n\n${NAMES[code]} language package of LT-JS (LanguageTool port). Install together with @ltjs/core; @ltjs/core discovers it at runtime.\n`);
  writeJson(path.join(dir, 'package.json'), {
    name: `@ltjs/lang-${code}`,
    description: `${NAMES[code]} language data and rules for @ltjs/core`,
    ...commonPackageFields,
    main: './index.js',
    exports: { '.': './index.js', './package.json': './package.json' },
    sideEffects: true,
    files: ['index.js', 'resource-root.js', 'src', 'resources', 'licenses', 'LICENSE', 'NOTICE', 'README.md'],
    peerDependencies: { '@ltjs/core': `^${VERSION}` },
  });
}

// ---- npm pack
const sizes = [];
for (const name of ['core', ...CODES.map((c) => `lang-${c}`)]) {
  const dir = path.join(PKGS, name);
  execFileSync('npm', ['pack', '--pack-destination', TARBALLS, '--silent'], { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] });
  const tgz = path.join(TARBALLS, `ltjs-${name}-${VERSION}.tgz`);
  sizes.push(`${name}: ${(statSync(tgz).size / 1048576).toFixed(1)} MB tarball`);
}
console.log(`packages in ${path.relative(ROOT, PKGS)}, tarballs in ${path.relative(ROOT, TARBALLS)}`);
for (const s of sizes) console.log(`  ${s}`);
