// Extra tests for src/lib/java/collections/TreeSet.js (no Java original)
import { describe, it, expect } from 'vitest';
import { TreeSet } from '../../../src/lib/java/collections/TreeSet.js';
import { CASE_INSENSITIVE_ORDER, javaCompare } from '../../../src/lib/java/strings.js';

describe('TreeSet', () => {
  it('keeps the first of comparator-equal elements and sorts', () => {
    const s = new TreeSet(CASE_INSENSITIVE_ORDER);
    expect(s.add('Hund')).toBe(true);
    expect(s.add('hund')).toBe(false);
    expect(s.add('Äpfel')).toBe(true);
    expect(s.add('ZUG')).toBe(true);
    expect(s.toArray()).toEqual(['Hund', 'ZUG', 'Äpfel']);
    expect(s.contains('HUND')).toBe(true);
    expect(s.contains('äpfel')).toBe(true);
    expect(s.contains('Hunde')).toBe(false);
    expect(s.size()).toBe(3);
  });

  it('uses natural order and rejects null', () => {
    const s = new TreeSet(javaCompare);
    s.add('b');
    s.add('a');
    expect([...s]).toEqual(['a', 'b']);
    expect(() => s.add(null)).toThrow();
    expect(() => s.contains(null)).toThrow();
  });
});
