// java.net.URL: results of 'new URL(spec)' recorded from OpenJDK 17.0.20 (UrlProbe over java.base handlers http/https/ftp/file/jar/jrt/jmod/mailto)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { URL } from '../../../src/lib/java/URL.js';

const FIXTURE = new globalThis.URL('./fixtures/url-jdk17.json', import.meta.url); // recorded cases
const q = (s) => (s === null || s === undefined ? 'null' : `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`);
const unesc = (s) => s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (m, d) => (d[0] === 'u' && d.length === 5 ? String.fromCharCode(parseInt(d.slice(1), 16)) : d === 'n' ? '\n' : d === 'r' ? '\r' : d === 't' ? '\t' : d));

// formats like UrlProbe: OK fields or the cause chain
function probe(spec) {
  try {
    const u = new URL(spec);
    return ['OK', q(u.getProtocol()), q(u.getHost()), u.getPort(), q(u.getAuthority()), q(u.getUserInfo()), q(u.getPath()), q(u.getQuery()), q(u.getRef()), q(u.getFile()), q(u.toString())].join(' ');
  } catch (t) {
    let r = 'ERR';
    for (let c = t; c; c = c.getCause ? c.getCause() : null) r += ` | ${c.javaClass}: ${q(c.getMessage())}`;
    return r;
  }
}

describe('java.net.URL (JDK 17 handlers)', () => {
  const cases = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  it('matches the recorded JDK 17 results', () => {
    const bad = [];
    for (const [spec, java] of cases) {
      const actual = probe(spec === '<null>' ? null : unesc(spec));
      if (actual !== java) bad.push(`${spec}\n  java: ${java}\n  js:   ${actual}`);
    }
    expect(bad).toEqual([]);
    expect(cases.length).toBeGreaterThan(200);
  });
  it('keeps the exception chains of the rule loader', () => {
    expect(probe('mailto:')).toBe('ERR | java.net.MalformedURLException: "No email address" | java.lang.RuntimeException: "No email address"');
    expect(probe('http://[zzz]/')).toContain('java.lang.IllegalArgumentException: "Invalid host: [zzz]"');
    expect(probe('jar:foo!/x')).toContain('java.lang.NullPointerException: "invalid url: foo!/x (java.net.MalformedURLException: no protocol: foo)"');
  });
});
