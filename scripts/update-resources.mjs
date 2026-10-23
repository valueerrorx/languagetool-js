// npm run resources:update -- [--java <path>] [--build]: regenerates resources/ from a LanguageTool Java checkout, prints the changes and port compatibility warnings.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { diffManifests, groupByLanguage, parseManifest, scanFilterClasses } from './lib/update-resources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'resources');
const JAVA_HOME = '/usr/lib/jvm/java-17-openjdk';

// reads the manifest of resources/ (empty if absent)
function readManifest() {
  const f = path.join(OUT, 'MANIFEST.sha256');
  return existsSync(f) ? parseManifest(readFileSync(f, 'utf8')) : new Map();
}

// runs a command with inherited output, exits on failure
function run(cmd, args, opts) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.error || r.status !== 0) {
    console.error(`FAILED: ${cmd} ${r.error ? r.error.message : `exit ${r.status}`}`);
    process.exit(1);
  }
}

// Maven build of the modules needed for resources (commands from CLAUDE.md)
function build(src) {
  if (!existsSync(path.join(JAVA_HOME, 'bin/javac'))) {
    console.error(`JDK 17 not found at ${JAVA_HOME}`);
    process.exit(1);
  }
  if (spawnSync('mvn', ['-v'], { stdio: 'ignore' }).status !== 0) {
    console.error('mvn not found on PATH');
    process.exit(1);
  }
  const env = { ...process.env, JAVA_HOME };
  run('mvn', ['-B', '-q', 'install', '-DskipTests', '-pl', 'languagetool-commandline,languagetool-server', '-am'], { cwd: src, env });
  run('mvn', ['-B', '-q', 'package', '-DskipTests', '-pl', 'languagetool-standalone', '-am'], { cwd: src, env });
}

// prints one change list grouped by language
function printGroup(title, paths) {
  console.log(`${title}: ${paths.length}`);
  for (const [lang, list] of groupByLanguage(paths)) {
    console.log(`  [${lang}] ${list.length}`);
    for (const p of list) console.log(`    ${p}`);
  }
}

// lists XML files below resources/ (excluding .dup)
function xmlFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '.dup') xmlFiles(p, out); } else if (e.name.endsWith('.xml')) out.push(p);
  }
  return out;
}

// warns about Java classes the port does not register in its class registry
async function checkCompatibility() {
  const { DefaultClassBroker, hasClass } = await import(pathToFileURL(path.join(ROOT, 'src/core/resources/ClassBroker.js')));
  await import(pathToFileURL(path.join(ROOT, 'src/core/patterns/filterRegistry.js')));
  await import(pathToFileURL(path.join(ROOT, 'src/lang/register.js')));
  const refs = new Map(); // class -> Set(files)
  for (const f of xmlFiles(OUT)) {
    for (const c of scanFilterClasses(readFileSync(f, 'utf8'))) {
      if (!refs.has(c)) refs.set(c, new Set());
      refs.get(c).add(path.relative(OUT, f));
    }
  }
  let warns = 0;
  for (const [c, files] of [...refs].sort()) {
    if (!hasClass(c) || new DefaultClassBroker().forName(c).JAVA_PENDING) {
      warns++;
      console.log(`WARN rule/filter uses Java class ${c} not ported - rule will be skipped/fail (${[...files].join(', ')})`);
    }
  }
  console.log(`compatibility: ${refs.size} filter classes referenced, ${warns} not ported`);
}

// CLI entry
async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--java');
  const src = path.resolve(i >= 0 ? argv[i + 1] : (process.env.LTJS_JAVA_SRC ?? path.join(ROOT, 'oracle/java-src')));
  if (!existsSync(path.join(src, 'languagetool-core'))) {
    console.error(`not a LanguageTool checkout: ${src} (use --java <path>)`);
    process.exit(1);
  }
  console.log(`Java source: ${src}`);
  if (argv.includes('--build')) build(src);
  const before = readManifest();
  run('node', [path.join(ROOT, 'scripts/resources.mjs')], { env: { ...process.env, LTJS_JAVA_SRC: src } });
  const diff = diffManifests(before, readManifest());
  console.log(`\nresources changes: ${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed`);
  for (const [t, l] of [['added', diff.added], ['removed', diff.removed], ['changed', diff.changed]]) if (l.length > 0) printGroup(t, l);
  console.log('');
  await checkCompatibility();
  console.log('\nNext: npm test, then LTJS_CASE=<id> npm run parity.');
  console.log('Note: tests/golden/ fixtures come from the pinned Java commit; parity differences after an update are expected.');
}

await main();
