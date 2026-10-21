// Extra tests for parseConfigFile (SRV-0030..0059): unknown-key warning order, stored values, dynamic language validation.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '../../src/lang/register.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
afterEach(() => vi.restoreAllMocks());

const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-cfg-'));
let n = 0;
function config(text, args = []) {
  const f = path.join(dir, `c${n++}.properties`);
  writeFileSync(f, text, 'latin1');
  return new HTTPServerConfig(['--config', f, ...args]);
}
function stderrOf(fn) {
  const lines = [];
  process.stderr.write.mockImplementation((c) => { lines.push(String(c)); return true; });
  fn();
  return lines;
}

describe('HTTPServerConfig#parseConfigFile', () => {
  // Java: HTTPServerConfig#parseConfigFile(File,boolean) - props.keySet() is a ConcurrentHashMap: hash order, not file order
  it('unknown keys are reported in java.util.Properties hash order', () => {
    const lines = stderrOf(() => config('foo=1\nMaxTextLength=5\nmaxtextlength=5\nbar.baz=1\n'));
    const keys = lines.filter((l) => l.startsWith('Key ')).map((l) => /^Key '([^']*)'/.exec(l)[1]);
    expect(keys).toEqual(['maxtextlength', 'bar.baz', 'foo', 'MaxTextLength']);
  });

  // Java: HTTPServerConfig#parseConfigFile(File,boolean)
  it('db, redis, prometheus and limit keys are stored', () => {
    const c = config('dbDriver=d\ndbUrl=u\ndbUsername=x\ndbPassword=y\ndbLogging=true\ndbTimeoutSeconds=7\nredisPort=1\nsentinelPort=2\nprometheusPort=3\n'
      + 'dictLimitUser=4\nstyleGuideLimitTeam=5\nslowRuleLoggingThreshold=6\njwtSecret=s\nexternalRolloutServiceUrl=e\n');
    expect([c.dbDriver, c.dbUrl, c.dbUsername, c.dbPassword, c.dbLogging, c.dbTimeoutSeconds]).toEqual(['d', 'u', 'x', 'y', true, 7]);
    expect([c.redisPort, c.sentinelPort, c.prometheusPort, c.dictLimitUser, c.styleGuideLimitTeam, c.slowRuleLoggingThreshold]).toEqual([1, 2, 3, 4, 5, 6]);
    expect([c.jwtSecret, c.externalRolloutServiceUrl]).toEqual(['s', 'e']);
  });

  // Java: HTTPServerConfig#addDynamicLanguages(Properties)
  it('dynamic language keys are validated in order', () => {
    expect(() => config('lang-x=Name\n')).toThrow("code is supposed to be a 2 (or rarely 3) character code (unless it uses a format with variant, like xx-YY): 'x'");
    expect(() => config('lang-tr=Turkish\n')).toThrow('lang-tr-dictPath must be set');
    expect(() => config('lang-tr=Turkish\nlang-tr-dictPath=/does/not/exist.dic\n')).toThrow("dictionary file does not exist or is not a file: '/does/not/exist.dic'");
    const d = path.join(dir, 'dd');
    mkdirSync(d);
    expect(() => config(`lang-tr=Turkish\nlang-tr-dictPath=${d}\n`)).toThrow('is not a file');
  });

  // Java: HTTPServerConfig#parseConfigFile(File,boolean)
  it('languageModel from the file is ignored when --languageModel is on the command line', () => {
    expect(() => config('languageModel=/does/not/exist\n')).toThrow('LanguageModel directory not found or is not a directory: /does/not/exist');
    expect(config('languageModel=/does/not/exist\n', ['--languageModel', dir]).languageModelDir.toString()).toBe(dir);
  });

  // Java: HTTPServerConfig#HTTPServerConfig(String[]) - String#matches("--[a-zA-Z]+=.+") has no DOTALL
  it('--opt=value warning uses Java matches() semantics (no match across a line terminator)', () => {
    expect(stderrOf(() => new HTTPServerConfig(['--a=b'])).length).toBe(1);
    expect(stderrOf(() => new HTTPServerConfig(['--a=b\nc'])).length).toBe(0);
    expect(stderrOf(() => new HTTPServerConfig(['--a=b\u0085c'])).length).toBe(0);
  });
});
