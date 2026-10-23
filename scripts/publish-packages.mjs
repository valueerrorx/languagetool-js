// npm run publish:packages [-- --dry-run]: publishes core first, then the language packages from dist/tarballs (D-065).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKGS = path.join(ROOT, 'dist/packages');
const TARBALLS = path.join(ROOT, 'dist/tarballs');
const CODES = ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk', 'sl'];
const dryRun = process.argv.includes('--dry-run');

for (const name of ['core', ...CODES.map((c) => `lang-${c}`)]) {
  const pkg = JSON.parse(readFileSync(path.join(PKGS, name, 'package.json'), 'utf8'));
  const tgz = path.join(TARBALLS, `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`);
  if (!existsSync(tgz)) {
    console.error(`missing ${path.relative(ROOT, tgz)}; run npm run build first`);
    process.exit(1);
  }
  if (!dryRun) {
    let existing = '';
    try {
      existing = execFileSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { /* not published yet (E404) */ }
    if (existing === pkg.version) {
      console.log(`skip ${pkg.name}@${pkg.version}: already on the registry`);
      continue;
    }
  }
  console.log(`${dryRun ? 'dry-run publish' : 'publish'} ${pkg.name}@${pkg.version} (${path.relative(ROOT, tgz)})`);
  try {
    execFileSync('npm', ['publish', tgz, '--access', 'public', ...(dryRun ? ['--dry-run'] : [])], { stdio: 'inherit' });
  } catch {
    console.error(`publish of ${pkg.name}@${pkg.version} failed, stopping`);
    process.exit(1);
  }
}
console.log(dryRun ? 'dry run finished' : 'done');
