// npm run smoke:packages: installs the tarballs of dist/tarballs (core + lang-de + lang-en) into a temp project and exercises check(), startServer() and /v2/languages.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARBALLS = path.join(ROOT, 'dist/tarballs');
const PORT = 19890;
const tgz = (n) => path.join(TARBALLS, readdirSync(TARBALLS).find((f) => f === `ltjs-${n}-0.1.0.tgz`) ?? `missing-${n}`);

const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-smoke-'));
try {
  const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, stdio: ['ignore', 'inherit', 'inherit'] });
  run('npm', ['init', '-y', '--silent']);
  run('npm', ['install', '--silent', '--no-audit', '--no-fund', tgz('core'), tgz('lang-de'), tgz('lang-en')]);
  writeFileSync(path.join(dir, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { check, startServer, listLanguages } from '@ltjs/core';

const r = await check('Das ist ein Fehlr.', { language: 'de-DE' });
assert.ok(r.matches.some((m) => m.rule.id === 'GERMAN_SPELLER_RULE'), 'speller match expected: ' + JSON.stringify(r.matches));
console.log('check ok: ' + r.matches.map((m) => m.rule.id).join(','));

const en = await check('This is a tset.', { language: 'en-US' });
assert.ok(en.matches.length > 0, 'english match expected');

const server = await startServer({ port: ${PORT} });
try {
  const res = await fetch('http://localhost:${PORT}/v2/check', { method: 'POST', body: new URLSearchParams({ text: 'Das ist ein Fehlr.', language: 'de-DE' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.matches.some((m) => m.rule.id === 'GERMAN_SPELLER_RULE'));
  const langs = await (await fetch('http://localhost:${PORT}/v2/languages')).json();
  const codes = new Set(langs.map((l) => l.code));
  assert.deepEqual([...codes].sort(), ['de', 'en'], 'only de and en expected: ' + [...codes]);
  assert.deepEqual(listLanguages().map((l) => l.code).filter((c, i, a) => a.indexOf(c) === i).sort(), ['de', 'en']);
  console.log('server ok, languages: ' + langs.map((l) => l.longCode).join(','));
} finally {
  await server.close();
}
`);
  run('node', ['smoke.mjs']);
  console.log('smoke test passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
