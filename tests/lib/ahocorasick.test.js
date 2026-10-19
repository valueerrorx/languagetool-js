// Tests for src/lib/ahocorasick.js (com.hankcs AhoCorasickDoubleArrayTrie 1.2.2 behaviour); expected values from the X-REPLACE aho-corasick fixtures
import { describe, it, expect } from 'vitest';
import { AhoCorasickDoubleArrayTrie } from '../../src/lib/ahocorasick.js';

const build = (entries) => {
  const t = new AhoCorasickDoubleArrayTrie();
  t.build(entries);
  return t;
};

describe('AhoCorasickDoubleArrayTrie', () => {
  // overlapping keys, hits ordered by end position then descending key index
  it('parseText', () => {
    const t = build([['he', 'HE'], ['hers', 'HERS'], ['his', 'HIS'], ['she', 'SHE']]);
    expect(t.size()).toBe(4);
    expect(t.parseText('ushers').map((h) => [h.begin, h.end, h.value])).toEqual([[1, 4, 'SHE'], [2, 4, 'HE'], [2, 6, 'HERS']]);
    expect(t.matches('ushers')).toBe(true);
    expect(t.matches('abc')).toBe(false);
    expect(t.findFirst('ushers').value).toBe('SHE');
    expect(t.findFirst('abc')).toBeNull();
    expect(t.get('his')).toBe('HIS');
    expect(t.get('nokey')).toBeNull();
    expect(t.get('')).toBeNull();
  });

  // empty map: first transition reads check[c + 1] of a length-1 array
  it('empty map', () => {
    const t = build([]);
    expect(t.size()).toBe(0);
    expect(t.parseText('')).toEqual([]);
    expect(() => t.parseText('a')).toThrow('Index 98 out of bounds for length 1');
  });
});
