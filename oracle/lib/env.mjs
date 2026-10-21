import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const JDK = '/usr/lib/jvm/java-17-openjdk';
export const PIN = '9b0be9db8cb4589cd031e85bd929c95c8ce57e49';
export const LT = path.join(ROOT, 'oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT');
export const FAKETIME_LIB = path.join(ROOT, 'oracle/tools/libfaketime/src/libfaketime.so.1');
export const FIXED_TIME = '2026-03-15 10:00:00';
export const GENERATOR_VERSION = '1';

export class InfraError extends Error {}

export function javaVersionLine() {
  const r = execFileSync('sh', ['-c', `${JDK}/bin/java -version 2>&1 | head -1`], { encoding: 'utf8' });
  return r.trim();
}

export function preflight() {
  const line = javaVersionLine();
  if (!/"17\./.test(line)) throw new InfraError(`JDK 17 required, got: ${line}`);
  const head = execFileSync('git', ['-C', path.join(ROOT, 'oracle/java-src'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== PIN) throw new InfraError(`oracle/java-src at ${head}, expected ${PIN}`);
  const dirty = execFileSync('git', ['-C', path.join(ROOT, 'oracle/java-src'), 'status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (dirty) throw new InfraError('oracle/java-src has a dirty tree');
  if (!existsSync(path.join(LT, 'languagetool-server.jar'))) {
    throw new InfraError(`distribution missing: ${LT}; build per docs/inventory/BUILD.md`);
  }
  if (!existsSync(FAKETIME_LIB)) execFileSync(path.join(ROOT, 'oracle/scripts/build-faketime.sh'), { stdio: 'inherit' });
  execFileSync(path.join(ROOT, 'oracle/scripts/build-harness.sh'), { stdio: 'inherit' });
  return line;
}

export function sha256File(f) {
  return createHash('sha256').update(readFileSync(f)).digest('hex');
}

// Pinned environment of docs/ORACLE.md section 3.
export function pinnedEnv(workDir, extra = {}) {
  return {
    PATH: '/usr/bin:/bin',
    HOME: path.join(workDir, 'home'),
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    TZ: 'Europe/Vienna',
    LD_PRELOAD: FAKETIME_LIB,
    FAKETIME: `@${FIXED_TIME}`,
    FAKETIME_DONT_FAKE_MONOTONIC: '1',
    FAKETIME_DONT_RESET: '1',
    ...extra,
  };
}

// opts.realLogging: keep the jar's own logback.xml (X-LOGS) instead of the stderr config of the harness
export function pinnedJvmFlags(workDir, extra = [], opts = {}) {
  return [
    '-Duser.language=en', '-Duser.country=US', '-Dfile.encoding=UTF-8',
    `-Djava.io.tmpdir=${path.join(workDir, 'tmp')}`,
    ...(opts.realLogging ? [] : [`-Dlogback.configurationFile=${path.join(ROOT, 'oracle/harness/logback-stderr.xml')}`]),
    ...extra,
  ];
}
