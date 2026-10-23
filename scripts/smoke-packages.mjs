// npm run smoke:packages: installs the tarballs of dist/tarballs (core + lang-de + lang-en, then + lang-de-at + lang-de-ch) into temp projects and exercises check(), startServer() and /v2/languages.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARBALLS = path.join(ROOT, 'dist/tarballs');
const PORT = 19890;
const tgz = (n) => path.join(TARBALLS, readdirSync(TARBALLS).find((f) => f === `valueerror-ltjs-${n}-0.1.0.tgz`) ?? `missing-${n}`);

const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-smoke-'));
const dir2 = mkdtempSync(path.join(tmpdir(), 'ltjs-smoke-variants-'));
try {
  const run = (cmd, args, cwd = dir) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
  run('npm', ['init', '-y', '--silent']);
  run('npm', ['install', '--silent', '--no-audit', '--no-fund', tgz('core'), tgz('lang-de'), tgz('lang-en')]);
  writeFileSync(path.join(dir, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { check, startServer, listLanguages } from '@valueerror/ltjs-core';

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
  // (a) only lang-de (and lang-en): the variants behave like uninstalled languages
  writeFileSync(path.join(dir, 'novariants.mjs'), `
import assert from 'node:assert/strict';
import { check, listLanguages } from '@valueerror/ltjs-core';

const ids = listLanguages().map((l) => l.longCode);
assert.ok(ids.includes('de-DE') && !ids.includes('de-AT') && !ids.includes('de-CH'), 'variants must not be listed: ' + ids);
for (const lang of ['de-AT', 'de-CH']) {
  await assert.rejects(() => check('Das ist ein Test.', { language: lang }), (e) => { console.log('rejected ' + lang + ': ' + e.message); return true; });
}
const r = await check('Die Strasse ist gross.', { language: 'de-DE' });
assert.ok(r.matches.length > 0, 'de-DE must flag Strasse');
console.log('variants absent ok');
`);
  run('node', ['smoke.mjs']);
  run('node', ['novariants.mjs']);
  // (b) with lang-de-at and lang-de-ch: same matches as the dev repo
  const sentences = [['de-CH', 'Die Strasse ist gross.'], ['de-DE', 'Die Strasse ist gross.'], ['de-AT', 'Im Jänner kommt heuer der Schnee.'], ['de-DE', 'Im Jänner kommt heuer der Schnee.']];
  const dev = await import(path.join(ROOT, 'src/index.js'));
  const expected = [];
  for (const [language, text] of sentences) expected.push(JSON.stringify((await dev.check(text, { language })).matches.map((m) => [m.rule.id, m.offset, m.length])));
  writeFileSync(path.join(dir2, 'expected.json'), JSON.stringify({ sentences, expected }));
  run('npm', ['init', '-y', '--silent'], dir2);
  run('npm', ['install', '--silent', '--no-audit', '--no-fund', tgz('core'), tgz('lang-de'), tgz('lang-de-at'), tgz('lang-de-ch')], dir2);
  writeFileSync(path.join(dir2, 'variants.mjs'), `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, listLanguages } from '@valueerror/ltjs-core';

const { sentences, expected } = JSON.parse(readFileSync('expected.json', 'utf8'));
const ids = listLanguages().map((l) => l.longCode);
assert.ok(ids.includes('de-AT') && ids.includes('de-CH'), 'variants must be listed: ' + ids);
for (const [i, [language, text]] of sentences.entries()) {
  const got = JSON.stringify((await check(text, { language })).matches.map((m) => [m.rule.id, m.offset, m.length]));
  assert.equal(got, expected[i], language + ' ' + text);
  console.log(language + ': ' + got);
}
assert.notEqual(expected[0], expected[1], 'de-CH and de-DE should differ for Strasse');
console.log('variants ok');
`);
  run('node', ['variants.mjs'], dir2);
  console.log('smoke test passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(dir2, { recursive: true, force: true });
}
