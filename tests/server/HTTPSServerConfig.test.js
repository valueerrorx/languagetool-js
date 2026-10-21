// Port of HTTPSServerConfigTest plus the HTTPSServer startup errors (SRV-0177, SRV-0178 only to the point where Java fails).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DEFAULT_PORT } from '../../src/server/HTTPServerConfig.js';
import { HTTPSServerConfig } from '../../src/server/HTTPSServerConfig.js';
import { HTTPSServer } from '../../src/server/HTTPSServer.js';
import { IllegalConfigurationException } from '../../src/server/exceptions.js';

const res = (name) => path.resolve('tests/resources/server', name); // Java: getResource("/org/languagetool/server/" + name).getFile()

describe('HTTPSServerConfigTest', () => {
  // Java: HTTPSServerConfigTest#testArgumentParsing()
  it('testArgumentParsing', () => {
    expect(() => new HTTPSServerConfig([])).toThrow(IllegalConfigurationException);
    const propertyFile = res('https-server.properties');
    const config1 = new HTTPSServerConfig(`--public --config ${propertyFile}`.split(' '));
    expect(config1.getPort()).toBe(DEFAULT_PORT);
    expect(config1.isPublicAccess()).toBe(true);
    expect(config1.isVerbose()).toBe(false);
    expect(config1.getKeystore().toString()).toBe('src/test/resources/org/languagetool/server/test-keystore.jks');
    expect(config1.getKeyStorePassword()).toBe('mytest');
    expect(config1.getMaxTextLengthAnonymous()).toBe(50000);

    const config2 = new HTTPSServerConfig(`-p 9999 --config ${propertyFile}`.split(' '));
    expect(config2.getPort()).toBe(9999);
    expect(config2.isPublicAccess()).toBe(false);
    expect(config2.isVerbose()).toBe(false);
    expect(config2.getKeystore().toString()).toBe('src/test/resources/org/languagetool/server/test-keystore.jks');
    expect(config2.getKeyStorePassword()).toBe('mytest');
    expect(config2.getMaxTextLengthAnonymous()).toBe(50000);
  });

  // Java: HTTPSServerConfigTest#testMinimalPropertyFile()
  it('testMinimalPropertyFile', () => {
    const config = new HTTPSServerConfig(`--config ${res('https-server-minimal.properties')}`.split(' '));
    expect(config.getPort()).toBe(8081);
    expect(config.isPublicAccess()).toBe(false);
    expect(config.isVerbose()).toBe(false);
    expect(config.getKeystore().toString()).toBe('src/test/resources/org/languagetool/server/test-keystore.jks');
    expect(config.getKeyStorePassword()).toBe('mytest');
    expect(config.getMaxTextLengthAnonymous()).toBe(2147483647);
  });

  // Java: HTTPSServerConfigTest#testMissingPropertyFile()
  it('testMissingPropertyFile', () => {
    expect(() => new HTTPSServerConfig('--config /does-not-exist'.split(' '))).toThrow();
  });

  // Java: HTTPSServerConfigTest#testIncompletePropertyFile()
  it('testIncompletePropertyFile', () => {
    expect(() => new HTTPSServerConfig(`--config ${res('https-server-incomplete.properties')}`.split(' ')))
      .toThrow(IllegalConfigurationException);
    expect(() => new HTTPSServerConfig(`--config ${res('https-server-incomplete.properties')}`.split(' ')))
      .toThrow(/^Property 'password' must be set in .*https-server-incomplete.properties$/);
  });
});

describe('HTTPSServer startup errors', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-https-'));
  const config = (keystore) => {
    const cfg = path.join(dir, 'c.properties');
    writeFileSync(cfg, `keystore=${keystore}\npassword=p\n`);
    return new HTTPSServerConfig(['--config', cfg, '--port', '0']);
  };

  // Java: HTTPSServer#getSslContext(File,String)
  it('missing keystore file: RuntimeException "Could not set up SSL context" caused by FileNotFoundException', async () => {
    const e = await HTTPSServer.create(config('/nonexistent/k.jks')).catch((x) => x);
    expect(e.getMessage()).toBe('LanguageTool HTTPS server could not be started on host "localhost", port 0');
    expect(e.getCause().getMessage()).toBe('Could not set up SSL context');
    expect(e.getCause().getCause().toString()).toBe('java.io.FileNotFoundException: /nonexistent/k.jks (No such file or directory)');
  });

  // Java: HTTPSServer#getSslContext(File,String)
  it('keystore of another format: IOException "Invalid keystore format"', async () => {
    const k = path.join(dir, 'k.jks');
    writeFileSync(k, 'not a keystore');
    const e = await HTTPSServer.create(config(k)).catch((x) => x);
    expect(e.getCause().getCause().toString()).toBe('java.io.IOException: Invalid keystore format');
  });
});
