// Writes the resource manifest for preloadResources() in browsers/workers (fetch cannot list directories):
//   node scripts/browser-manifest.mjs <out.json> <resourcesDir>=<urlPrefix> [<resourcesDir>=<urlPrefix> ...]
// Each resourcesDir is a resource root in class-path layout, in lookup order (e.g. node_modules/@valueerror/ltjs-core/resources
// then node_modules/@valueerror/ltjs-lang-de/resources); urlPrefix is where the web server serves that directory.
// Output: { entries: [{ url, name }] } — name is the class-path key; a name found again (later root, or .dup/<n>/ of a root)
// becomes copy n (.dup/<n>/<name>), the layout getResources() reads in the memory backend as on the file system.
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [out, ...roots] = process.argv.slice(2);
if (!out || roots.length === 0 || roots.some((r) => !r.includes('='))) {
  throw new Error('usage: browser-manifest.mjs <out.json> <resourcesDir>=<urlPrefix> ...');
}

// all files below dir as relative posix paths
function walk(dir, base = '') {
  const files = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) files.push(...walk(path.join(dir, e.name), `${base}${e.name}/`));
    else if (e.isFile()) files.push(`${base}${e.name}`);
  }
  return files;
}

const copies = new Map(); // class-path name -> [url of copy 0, copy 1, ...]
for (const spec of roots) {
  const eq = spec.indexOf('=');
  const dir = spec.slice(0, eq);
  const prefix = spec.slice(eq + 1).replace(/\/?$/, '/');
  const files = walk(dir).sort((a, b) => {
    const dup = (f) => (f.startsWith('.dup/') ? Number(f.split('/')[1]) : 0);
    return dup(a) - dup(b) || a.localeCompare(b);
  });
  for (const rel of files) {
    const name = rel.startsWith('.dup/') ? rel.split('/').slice(2).join('/') : rel;
    if (!copies.has(name)) copies.set(name, []);
    copies.get(name).push(prefix + rel.split('/').map(encodeURIComponent).join('/'));
  }
}

const entries = [];
for (const [name, urls] of copies) urls.forEach((url, n) => entries.push({ url, name: n === 0 ? name : `.dup/${n}/${name}` }));
writeFileSync(out, `${JSON.stringify({ entries }, null, 0)}\n`);
console.log(`${entries.length} entries -> ${out}`);
