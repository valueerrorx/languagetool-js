// Extra tests (no JUnit class): lazy BufferedReader line splitting (perf round 2); expectations are java.io.BufferedReader#readLine
import { describe, it, expect } from 'vitest';
import { BufferedReader } from '../../../src/lib/java/io.js';

function readAll(text) {
  const r = new BufferedReader(text);
  const out = [];
  for (let l = r.readLine(); l !== null; l = r.readLine()) out.push(l);
  expect(r.readLine()).toBeNull();
  return out;
}

describe('BufferedReader lazy line splitting', () => {
  it('splits on \\n', () => { expect(readAll('a\nb\nc')).toEqual(['a', 'b', 'c']); });
  it('splits on \\r\\n', () => { expect(readAll('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']); });
  it('splits on \\r', () => { expect(readAll('a\rb\rc')).toEqual(['a', 'b', 'c']); });
  it('mixed terminators', () => { expect(readAll('a\r\n\rb\n\nc\r')).toEqual(['a', '', 'b', '', 'c']); });
  it('trailing newline gives no extra empty line', () => {
    expect(readAll('a\nb\n')).toEqual(['a', 'b']);
    expect(readAll('a\r\n')).toEqual(['a']);
    expect(readAll('a\r')).toEqual(['a']);
  });
  it('empty file', () => { expect(readAll('')).toEqual([]); });
  it('only a newline is one empty line', () => { expect(readAll('\n')).toEqual(['']); });
  it('thunk is evaluated on the first readLine only, once', () => {
    let calls = 0;
    const r = new BufferedReader(() => { calls++; return 'x\ny'; });
    expect(calls).toBe(0);
    expect(r.readLine()).toBe('x');
    expect(r.readLine()).toBe('y');
    expect(r.readLine()).toBeNull();
    expect(calls).toBe(1);
  });
  it('null text throws', () => { expect(() => new BufferedReader(null)).toThrow(); });
});
