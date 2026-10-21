// Ports of HTTPServerConfigTest#testArgumentParsing plus the option/error paths of HTTPServerConfig(String[]) (SRV-0006, 0008, 0011, 0013, 0061).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HTTPServerConfig, DEFAULT_PORT } from '../../src/server/HTTPServerConfig.js';

afterEach(() => vi.restoreAllMocks());

describe('HTTPServerConfig argument parsing', () => {
  it('testArgumentParsing', () => {
    const config1 = new HTTPServerConfig([]);
    expect(config1.getPort()).toBe(DEFAULT_PORT);
    expect(config1.isPublicAccess()).toBe(false);
    expect(config1.isVerbose()).toBe(false);

    const config2 = new HTTPServerConfig('--public'.split(' '));
    expect(config2.getPort()).toBe(DEFAULT_PORT);
    expect(config2.isPublicAccess()).toBe(true);
    expect(config2.isVerbose()).toBe(false);

    const config3 = new HTTPServerConfig('--port 80'.split(' '));
    expect(config3.getPort()).toBe(80);
    expect(config3.isPublicAccess()).toBe(false);
    expect(config3.isVerbose()).toBe(false);

    const config4 = new HTTPServerConfig('--port 80 --public'.split(' '));
    expect(config4.getPort()).toBe(80);
    expect(config4.isPublicAccess()).toBe(true);
    expect(config4.isVerbose()).toBe(false);
  });

  it('short options, verbose, stoppable', () => {
    const c = new HTTPServerConfig(['-p', '1234', '-v', '--stoppable']);
    expect(c.getPort()).toBe(1234);
    expect(c.isVerbose()).toBe(true);
    expect(c.isStoppable()).toBe(true);
  });

  it('--allow-origin takes a value, defaults to * without value or before another option', () => {
    expect(new HTTPServerConfig(['--allow-origin', 'https://a.example']).getAllowOriginUrl()).toBe('https://a.example');
    expect(new HTTPServerConfig(['--allow-origin']).getAllowOriginUrl()).toBe('*');
    const c = new HTTPServerConfig(['--allow-origin', '--public']);
    expect(c.getAllowOriginUrl()).toBe('*');
    expect(c.isPublicAccess()).toBe(true);
    expect(new HTTPServerConfig([]).getAllowOriginUrl()).toBeNull();
  });

  it('bad or missing port value', () => {
    expect(() => new HTTPServerConfig(['--port', 'abc'])).toThrow('For input string: "abc"');
    expect(() => new HTTPServerConfig(['--port', ''])).toThrow('For input string: ""');
    expect(() => new HTTPServerConfig(['--port', '2147483648'])).toThrow('For input string: "2147483648"');
    expect(() => new HTTPServerConfig(['--port'])).toThrow('Missing value for option --port'); // DEV-020
    expect(() => new HTTPServerConfig(['--config'])).toThrow('Missing value for option --config'); // DEV-020
  });

  it('unknown options print a warning on stdout, --opt=value also warns on stderr', () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    new HTTPServerConfig(['--bogus', '--x=1']);
    expect(out.mock.calls.map((c) => c[0])).toEqual([
      'WARNING: unknown option: --bogus\n',
      "WARNING: unknown option: --x=1 - please note that parameters are given as '--arg param', i.e. without '=' between argument and parameter\n",
    ]);
    expect(err.mock.calls.map((c) => c[0])).toEqual(['WARNING: use `--option value`, not `--option=value`, parameters will be ignored otherwise: --x=1\n']);
  });

  it('--premiumAlways is rejected in the non-premium build', () => {
    expect(() => new HTTPServerConfig(['--premiumAlways'])).toThrow('Cannot use --premiumAlways with non-premium version');
  });

  it('--logIpMatchingPattern needs an argument', () => {
    expect(new HTTPServerConfig(['--logIpMatchingPattern', 'abc']).logIpMatchingPattern).toBe('abc');
    expect(() => new HTTPServerConfig(['--logIpMatchingPattern'])).toThrow("Missing argument for '--logIpMatchingPattern'");
    expect(() => new HTTPServerConfig(['--logIpMatchingPattern', '--x'])).toThrow("Missing argument for '--logIpMatchingPattern'");
    expect(new HTTPServerConfig(['--notLogIP']).logIp).toBe(false);
  });

  it('--languageModel must be an existing directory', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-cfg-'));
    mkdirSync(path.join(dir, 'languageModelDirectory'));
    const c = new HTTPServerConfig(['--languageModel', path.join(dir, 'languageModelDirectory')]);
    expect(c.languageModelDir).not.toBeNull();
    expect(c.languageModelDir.toString().endsWith('languageModelDirectory')).toBe(true);
    expect(() => new HTTPServerConfig(['--languageModel', path.join(dir, 'nope')])).toThrow('LanguageModel directory not found or is not a directory');
  });
});

describe('HTTPServerConfig --config file', () => {
  const write = (text) => {
    const f = path.join(mkdtempSync(path.join(tmpdir(), 'ltjs-cfg-')), 'server.properties');
    writeFileSync(f, text, 'latin1');
    return f;
  };

  it('limits, serverURL and list keys', () => {
    const c = new HTTPServerConfig(['--config', write('maxTextLength=30\nmaxTextHardLength=40\nserverURL=http://localhost:8081/lt\nblockedReferrers=a.com, b.com\nmaxCheckThreads=2\n')]);
    expect(c.getMaxTextLengthAnonymous()).toBe(30);
    expect(c.getMaxTextHardLength()).toBe(40);
    expect(c.getServerURL().getRawPath()).toBe('/lt');
    expect(c.getBlockedReferrers()).toEqual(['a.com', 'b.com']);
    expect(c.getMaxTextCheckerThreads()).toBe(2);
  });

  it('defaults of an empty file', () => {
    const c = new HTTPServerConfig(['--config', write('# comment\n')]);
    expect(c.getMaxTextLengthAnonymous()).toBe(2147483647);
    expect(c.getBlockedReferrers()).toEqual(['']);
    expect(c.getDisabledRuleIds()).toEqual(['']);
    expect(c.getMaxCheckThreads()).toBe(10);
    expect(c.getServerURL()).toBeNull();
  });

  it('errors keep their Java texts', () => {
    expect(() => new HTTPServerConfig(['--config', write('maxTextLength=abc\n')])).toThrow('For input string: "abc"');
    expect(() => new HTTPServerConfig(['--config', write('maxCheckThreads=0\n')])).toThrow('Invalid value for maxCheckThreads, must be >= 1: 0');
    expect(() => new HTTPServerConfig(['--config', write('maxWorkQueueSize=-1\n')])).toThrow('maxWorkQueueSize must be >= 0: -1');
    expect(() => new HTTPServerConfig(['--config', write('cacheTTLSeconds=5\n')])).toThrow('Use of cacheTTLSeconds without also setting cacheSize has no effect.');
    expect(() => new HTTPServerConfig(['--config', write('mode=AfterTheDeadline\n')])).toThrow('The AfterTheDeadline mode is not supported anymore');
    let thrown;
    try {
      new HTTPServerConfig(['--config', '/does/not/exist.properties']);
    } catch (e) {
      thrown = e;
    }
    expect(thrown.toString()).toBe("java.lang.RuntimeException: Could not load properties from '/does/not/exist.properties'");
    expect(thrown.getCause().toString()).toBe('java.io.FileNotFoundException: /does/not/exist.properties (No such file or directory)');
  });

  it('unknown key warning', () => {
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    new HTTPServerConfig(['--config', write('allowOriginUrl=x\n')]);
    expect(err.mock.calls.map((c) => c[0]).join('')).toContain("Key 'allowOriginUrl' from configuration file");
  });
});
