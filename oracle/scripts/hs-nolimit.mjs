// DEV-009: classify golden Hunspell suggestions as "java-timing-cut" via native Hunspell 1.7.5 with all TIMELIMIT_* effectively disabled.
// Builds oracle/tools/hunspell-nolimit (tag v1.7.5 + scripts/hunspell-1.7.5-hash64.patch, TIMELIMIT_* = 1 h), runs suggest for every dict-de-* golden word,
// words whose no-limit suggestions differ from golden are added to tests/golden/X-HUNSPELL/<case>/unstable.json (reason "java-timing-cut"; existing entries get reason "java-unstable").
// usage: node oracle/scripts/hs-nolimit.mjs   (run after hs-stability.mjs)
import { existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { ROOT } from '../lib/env.mjs';

const B = path.join(ROOT, 'oracle/tools/hunspell-nolimit');
const SRC = path.join(B, 'hunspell'), BIN = path.join(B, 'hs-nolimit');
const RES = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/main/resources/org/languagetool/resource/de/hunspell');
const sh = (c, a, o = {}) => execFileSync(c, a, { stdio: 'inherit', ...o });
if (!existsSync(BIN)) {
  rmSync(SRC, { recursive: true, force: true });
  sh('git', ['clone', '--branch', 'v1.7.5', '--depth', '1', 'https://github.com/hunspell/hunspell', SRC]);
  sh('git', ['apply', path.join(ROOT, 'scripts/hunspell-1.7.5-hash64.patch')], { cwd: SRC });
  sh('sed', ['-i', 's/std::chrono::milliseconds([0-9]*)/std::chrono::milliseconds(3600000)/', 'src/hunspell/atypes.hxx'], { cwd: SRC });
  const cxx = ['affentry', 'affixmgr', 'csutil', 'filemgr', 'hashmgr', 'hunspell', 'hunspelltrace', 'hunzip', 'phonet', 'replist', 'suggestmgr'].map((f) => `src/hunspell/${f}.cxx`);
  sh('g++', ['-O2', '-DHUNSPELL_STATIC', '-Isrc/hunspell', ...cxx, path.join(ROOT, 'oracle/scripts/hs-nolimit.cxx'), '-o', BIN], { cwd: SRC });
}
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');
const unhex = (h) => Buffer.from(h, 'hex').toString('utf8');
const rl = (p) => createInterface({ input: p.stdout });
for (const lang of ['DE', 'AT', 'CH']) {
  const c = `dict-de-${lang}`, dir = path.join(ROOT, 'tests/golden/X-HUNSPELL', c);
  const gold = readFileSync(path.join(dir, 'responses.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const p = spawn(BIN, [`${RES}/de_${lang}.aff`, `${RES}/de_${lang}.dic`], { stdio: ['pipe', 'pipe', 'inherit'] });
  const it = rl(p)[Symbol.asyncIterator]();
  const un = JSON.parse(readFileSync(path.join(dir, 'unstable.json'), 'utf8'));
  const known = new Set(un.unstable.map((u) => `${u.id}\u0000${u.w}`));
  for (const u of un.unstable) u.reason ??= 'java-unstable';
  let n = 0, cut = 0;
  for (const e of gold) for (const r of e.result.results ?? []) {
    if (!r.suggest) continue;
    n++;
    p.stdin.write(hex(r.w) + '\n');
    const [, s] = (await it.next()).value.split('\t');
    const got = s ? s.split(',').map(unhex) : [];
    if (JSON.stringify(got) !== JSON.stringify(r.suggest) && !known.has(`${e.id}\u0000${r.w}`)) {
      un.unstable.push({ id: e.id, w: r.w, reason: 'java-timing-cut' }); cut++;
    }
  }
  p.stdin.end();
  writeFileSync(path.join(dir, 'unstable.json'), JSON.stringify(un, null, 1) + '\n');
  console.log(c, { words: n, timingCut: cut, unstableTotal: un.unstable.length });
}
