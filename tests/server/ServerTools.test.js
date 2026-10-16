// Ports of ServerToolsTest plus getMode/getLevel/siteMatches/print (SRV-0091, 0110).
import { describe, it, expect, vi } from 'vitest';
import { Mode, Level } from '../../src/core/JLanguageTool.js';
import { cleanUserTextFromMessage, getLevel, getMode, siteMatches, print, setAllowOrigin, getAuthHeader } from '../../src/server/ServerTools.js';
import { Headers } from '../../src/server/HttpExchange.js';

describe('ServerTools', () => {
  it('testCleanUserTextFromMessage', () => {
    const loggingOn = new Map();
    const loggingOff = new Map([['inputLogging', 'no']]);
    expect(cleanUserTextFromMessage('my test', loggingOn)).toBe('my test');
    expect(cleanUserTextFromMessage('my test', loggingOff)).toBe('my test');
    expect(cleanUserTextFromMessage('<sentcontent>my test</sentcontent>', loggingOn)).toBe('<sentcontent>my test</sentcontent>');
    expect(cleanUserTextFromMessage('<sentcontent>my test</sentcontent>', loggingOff)).toBe('<< content removed >>');
    expect(cleanUserTextFromMessage('<sentcontent>my\ntest</sentcontent>', loggingOff)).toBe('<< content removed >>');
  });

  it('getMode', () => {
    expect(getMode(new Map())).toBe(Mode.ALL);
    expect(getMode(new Map([['mode', 'textLevelOnly']]))).toBe(Mode.TEXTLEVEL_ONLY);
    expect(getMode(new Map([['mode', 'allButTextLevelOnly']]))).toBe(Mode.ALL_BUT_TEXTLEVEL_ONLY);
    expect(getMode(new Map([['mode', 'batch']]))).toBe(Mode.ALL);
    expect(() => getMode(new Map([['mode', 'bogus']]))).toThrow("Mode must be one of 'textLevelOnly', 'allButTextLevelOnly', or 'all' but was: 'bogus'");
  });

  it('getLevel', () => {
    expect(getLevel(new Map())).toBe(Level.DEFAULT);
    expect(getLevel(new Map([['level', 'picky']]))).toBe(Level.PICKY);
    expect(() => getLevel(new Map([['level', 'bogus']]))).toThrow("Unknown value 'bogus' for parameter 'level'. Valid values: default, picky, academic, clarity, professional, creative, customer, jobapp, objective, elegant");
    expect(() => getLevel(new Map([['level', 'toString']]))).toThrow("Unknown value 'toString'");
  });

  it('siteMatches', () => {
    expect(siteMatches('https://www.example.org/x', 'example.org')).toBe(true);
    expect(siteMatches('http://example.org', 'example.org')).toBe(true);
    expect(siteMatches('https://other.org', 'example.org')).toBe(false);
  });

  it('print prefixes a UTC timestamp', () => {
    const w = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    print('hello');
    expect(w.mock.calls[0][0]).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d \+0000 hello\n$/);
    w.mockRestore();
  });

  it('setAllowOrigin and getAuthHeader', () => {
    const ex = { h: new Headers(), getResponseHeaders() { return this.h; } };
    setAllowOrigin(ex, null);
    expect(ex.h.getFirst('Access-Control-Allow-Origin')).toBeNull();
    setAllowOrigin(ex, '*');
    expect(ex.h.getFirst('access-control-allow-origin')).toBe('*');
    const hs = new Headers();
    expect(getAuthHeader(hs)).toBeNull();
    hs.set('Authorization', '  ');
    expect(getAuthHeader(hs)).toBeNull();
    hs.set('Authorization', 'Bearer x');
    expect(getAuthHeader(hs)).toBe('Bearer x');
  });
});
