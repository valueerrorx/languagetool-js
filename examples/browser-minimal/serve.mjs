// Minimal static web server for the example (any static server works the same way): this folder at /,
// the German resources of dist/packages at /res/core/, /res/de/, /res/de-at/. Port: PORT (default 8090).
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKGS = path.resolve(HERE, '../../dist/packages');
const MOUNTS = [
  ['/res/core/', path.join(PKGS, 'core/resources')],
  ['/res/de-at/', path.join(PKGS, 'lang-de-at/resources')],
  ['/res/de/', path.join(PKGS, 'lang-de/resources')],
  ['/', HERE],
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm' };

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const [prefix, dir] = MOUNTS.find(([p]) => url.startsWith(p));
  const file = path.join(dir, url === '/' ? 'index.html' : url.slice(prefix.length));
  if (!file.startsWith(dir) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT ?? 8090), () => console.log(`http://localhost:${process.env.PORT ?? 8090}/`));
