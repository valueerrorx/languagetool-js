// npm run oracle -- <ID> [<case>] | --all | --selftest   (docs/ORACLE.md section 9)
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, GENERATOR_VERSION, InfraError, PIN, FIXED_TIME, LT, preflight, sha256File } from './lib/env.mjs';
import { runHarness } from './lib/harness-run.mjs';

const CASES = path.join(ROOT, 'oracle/cases');
const GOLDEN = path.join(ROOT, 'tests/golden');

function selectCases(argv) {
  if (argv.includes('--selftest')) return [['X-SELFTEST', null]];
  if (argv.includes('--all')) return readdirSync(CASES).map((id) => [id, null]);
  const [id, cs] = argv.filter((a) => !a.startsWith('--'));
  if (!id) throw new InfraError('usage: npm run oracle -- <ID> [<case>] | --all | --selftest');
  return [[id, cs ?? null]];
}

async function generate(id, caseName, javaLine) {
  const dir = path.join(CASES, id);
  if (!existsSync(dir)) throw new InfraError(`no case definitions: ${dir}`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && (!caseName || f === `${caseName}.json`));
  if (!files.length) throw new InfraError(`no matching case in ${dir}`);
  let n = 0;
  for (const f of files) {
    const name = f.replace(/\.json$/, '');
    const raw = readFileSync(path.join(dir, f));
    const cs = JSON.parse(raw);
    if (cs.kind !== 'harness') throw new InfraError(`kind ${cs.kind} not supported yet (${id}/${name})`);
    const r = await runHarness(cs);
    const tmp = path.join(GOLDEN, id, `.${name}.tmp`);
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    writeFileSync(path.join(tmp, 'case.json'), raw);
    writeFileSync(path.join(tmp, 'requests.jsonl'), r.requests);
    writeFileSync(path.join(tmp, 'responses.jsonl'), r.responses);
    writeFileSync(path.join(tmp, 'stderr.bin'), r.stderr);
    writeFileSync(path.join(tmp, 'exit.txt'), `${r.exitCode}\n`);
    writeFileSync(path.join(tmp, 'meta.json'), JSON.stringify({
      java: javaLine, pin: PIN, entryJarSha256: sha256File(path.join(LT, 'languagetool-server.jar')),
      clock: cs.clock === 'fixed' ? `fixed @${FIXED_TIME} Europe/Vienna` : 'real',
      generator: GENERATOR_VERSION, generated: new Date().toISOString(),
      workDir: r.workDir, tmpDir: r.tmpDir,
    }, null, 2) + '\n');
    const final = path.join(GOLDEN, id, name);
    rmSync(final, { recursive: true, force: true });
    renameSync(tmp, final);
    rmSync(r.workDir, { recursive: true, force: true });
    n++;
    console.log(`  ${id}/${name}: exit ${r.exitCode}, ${r.responses.split('\n').filter(Boolean).length} responses`);
  }
  return n;
}

function checkSelftest() {
  const p = path.join(GOLDEN, 'X-SELFTEST/probe/responses.jsonl');
  const res = JSON.parse(readFileSync(p, 'utf8').split('\n')[0]).result;
  const ok = res.timeZone === 'Europe/Vienna' && res.calendar === '2026-3-15 10:0'
    && res.date === 'Sun Mar 15 10:00:00 CET 2026' && res.zonedNow.startsWith('2026-03-15T10:00+01:00');
  console.log(ok ? 'selftest: fixed clock OK (2026-03-15 10:00 Europe/Vienna)' : 'selftest: FAILED, clock not fixed');
  return ok;
}

try {
  const argv = process.argv.slice(2);
  const sel = selectCases(argv);
  const javaLine = preflight();
  let total = 0;
  for (const [id, cs] of sel) total += await generate(id, cs, javaLine);
  console.log(`oracle: ${total} cases written`);
  if (argv.includes('--selftest') && !checkSelftest()) process.exitCode = 1;
} catch (e) {
  if (e instanceof InfraError) { console.error(`oracle: ${e.message}`); process.exit(2); }
  throw e;
}
