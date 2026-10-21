// java.net.URLDecoder and URI subset with JDK 17 messages (SEMANTICS S6).
import { describe, it, expect } from 'vitest';
import { decodeUrl, URI, URISyntaxException } from '../../../src/lib/java/net.js';

describe('URLDecoder.decode', () => {
  it('decodes + and %XX as UTF-8', () => {
    expect(decodeUrl('a+b%20%C3%A9%e2%82%AC')).toBe('a b é€');
    expect(decodeUrl('plain')).toBe('plain');
    expect(decodeUrl('%+5')).toBe('\u0005'); // Integer.parseInt accepts a sign
  });
  it('malformed UTF-8 gives U+FFFD', () => {
    expect(decodeUrl('%FF%FE x')).toBe('\ufffd\ufffd x');
    expect(decodeUrl('%C3 x')).toBe('\ufffd x');
  });
  it('invalid escapes use the JDK texts', () => {
    expect(() => decodeUrl('%ZZ')).toThrow('URLDecoder: Illegal hex characters in escape (%) pattern - Error at index 0 in: "ZZ"');
    expect(() => decodeUrl('abc%')).toThrow('URLDecoder: Incomplete trailing escape (%) pattern');
    expect(() => decodeUrl('abc%4')).toThrow('URLDecoder: Incomplete trailing escape (%) pattern');
    expect(() => decodeUrl('%-1x')).toThrow('URLDecoder: Illegal hex characters in escape (%) pattern - negative value');
    expect(() => decodeUrl('%41%')).toThrow('Incomplete trailing escape');
  });
});

describe('URI', () => {
  it('validates the request target', () => {
    expect(new URI('/v2/check?language=en-US&text=a+b%20c').getRawQuery()).toBe('language=en-US&text=a+b%20c');
    expect(() => new URI('/v2/check?text=%ZZ')).toThrow('Malformed escape pair at index 15: /v2/check?text=%ZZ');
    expect(() => new URI('/v2/check?text=a|b')).toThrow(URISyntaxException);
    expect(() => new URI('/a b')).toThrow('Illegal character in path at index 2: /a b');
    expect(new URI('/v2/check?text=[x]').getRawQuery()).toBe('text=[x]');
  });
  it('getPath decodes, getRawPath does not', () => {
    const u = new URI('/v2/%63heck');
    expect(u.getRawPath()).toBe('/v2/%63heck');
    expect(u.getPath()).toBe('/v2/check');
  });
  it('relativize against the serverURL path', () => {
    const base = new URI('/lt');
    expect(base.relativize(new URI('/lt/v2/check')).getRawPath()).toBe('v2/check');
    expect(base.relativize(new URI('/lt')).getRawPath()).toBe('');
    expect(base.relativize(new URI('/other/v2')).getRawPath()).toBe('/other/v2');
    expect(new URI('/a/b/').relativize(new URI('/a/v2/check')).getRawPath()).toBe('/a/v2/check');
  });
  it('parses scheme and authority', () => {
    expect(new URI('https://example.org/a/b/').getPath()).toBe('/a/b/');
    expect(new URI('mailto:x@y').getPath()).toBeNull();
  });
});

describe('URI IPv6 authority', () => {
  // Java: URI.Parser#parseServer
  it('requires the closing bracket of a literal IPv6 host', () => {
    expect(() => new URI('http://[bad')).toThrow('Expected closing bracket for IPv6 address at index 11: http://[bad');
    expect(() => new URI('http://u@[]/x')).toThrow('Expected closing bracket for IPv6 address at index 10: http://u@[]/x');
    expect(new URI('http://[::1]:80/x').getPath()).toBe('/x');
  });
});
