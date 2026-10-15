// Tests for JavaHashMap, File, StringUtils.replaceOnce and scannerLines.
import { describe, it, expect } from 'vitest';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { File } from '../../../src/lib/java/io/File.js';
import { replaceOnce } from '../../../src/lib/java/StringUtils.js';
import { scannerLines } from '../../../src/lib/java/io.js';

describe('JavaHashMap', () => {
  // Java: HashMap iteration order of small String-keyed maps (values computed with JDK 17)
  it('iterates by bucket then insertion order', () => {
    const m = new JavaHashMap();
    for (const k of ['banana', 'apple', 'cherry']) m.put(k, k.length);
    expect(m.keySet()).toEqual(['banana', 'apple', 'cherry']);
    m.put('apple', 99);
    expect(m.get('apple')).toBe(99);
    expect(m.size()).toBe(3);
    expect(m.get('nothing')).toBe(null);
  });

  // Java: HashMap#resize keeps the relative order within a bin
  it('resizes after 12 entries', () => {
    const m = new JavaHashMap();
    for (let i = 0; i < 40; i++) m.put(`k${i}`, i);
    expect(m.size()).toBe(40);
    // order printed by JDK 17 for the same puts
    expect(m.keySet().join(' ')).toBe('k31 k30 k11 k33 k10 k32 k13 k35 k12 k34 k15 k37 k14 k36 k17 k39 k16 k38 k19 k18 k0 k1 k2 k3 k20 k4 k5 k22 k6 k21 k7 k24 k8 k23 k9 k26 k25 k28 k27 k29');
    expect(m.get('k17')).toBe(17);
  });

  // Java: HashMap(int) table size
  it('initial capacity changes the order', () => {
    const a = new JavaHashMap(64);
    const b = new JavaHashMap();
    for (const k of ['de-DE', 'fr-FR', 'en-GB', 'en-US']) { a.put(k, 1); b.put(k, 1); }
    expect(a.keySet()).toEqual(['en-US', 'de-DE', 'fr-FR', 'en-GB']);
    expect(b.keySet()).not.toEqual(a.keySet());
  });
});

describe('File', () => {
  // Java: File#getName / getParentFile / normalisation
  it('paths', () => {
    expect(new File('/a//b/c.dict').getPath()).toBe('/a/b/c.dict');
    expect(new File('/a/b/c.dict').getName()).toBe('c.dict');
    expect(new File('/a/b/c.dict').getParentFile().getPath()).toBe('/a/b');
    expect(new File('c.dict').getParentFile()).toBe(null);
    expect(new File('/c.dict').getParentFile().getPath()).toBe('/');
    expect(new File('/a/b/').getPath()).toBe('/a/b');
    expect(new File(new File('/a'), 'b').getPath()).toBe('/a/b');
    expect(new File('x/y').getAbsolutePath()).toBe(`${process.cwd()}/x/y`);
  });
});

describe('StringUtils/io', () => {
  // Java: StringUtils#replaceOnce
  it('replaceOnce', () => {
    expect(replaceOnce('a-b-a', 'a', 'x')).toBe('x-b-a');
    expect(replaceOnce('abc', '', 'x')).toBe('abc');
    expect(replaceOnce('abc', 'z', 'x')).toBe('abc');
    expect(replaceOnce('abc', 'b', null)).toBe('abc');
  });

  // Java: Scanner#nextLine
  it('scannerLines', () => {
    expect(scannerLines('a\r\nb c\u0085d\re\n')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(scannerLines('')).toEqual([]);
    expect(scannerLines('\n')).toEqual(['']);
    expect(scannerLines('x')).toEqual(['x']);
  });
});
