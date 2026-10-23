import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const LOG = process.env.TRACE_LOG;
const seen = new Set();
const rec = (p) => { try { const s = String(p); if (s.includes('/resources/') && !seen.has(s)) { seen.add(s); fs.appendFileSync(LOG, s + '\n'); } } catch {} };
for (const n of ['readFileSync', 'openSync', 'readFile', 'createReadStream', 'open', 'existsSync', 'statSync', 'readdirSync']) {
  const o = fs[n]; if (typeof o !== 'function') continue;
  fs[n] = function (p, ...a) { if (n !== 'existsSync' && n !== 'statSync' && n !== 'readdirSync') rec(p); return o.call(this, p, ...a); };
}
for (const n of ['readFile', 'open']) { const o = fs.promises[n]; fs.promises[n] = function (p, ...a) { rec(p); return o.call(this, p, ...a); }; }
syncBuiltinESMExports();
