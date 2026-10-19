// Tests for the small tools classes of F40 (no Java JUnit exists for them; expectations from the X-TOOLS fixtures and the Java sources)
import { describe, it, expect } from 'vitest';
import { FakeRule } from '../../../src/core/rules/FakeRule.js';
import { TranslationEntry } from '../../../src/core/rules/translation/TranslationEntry.js';
import { InterruptibleCharSequence } from '../../../src/core/tools/InterruptibleCharSequence.js';
import { LoggingTools, getMarker } from '../../../src/core/tools/LoggingTools.js';
import { MostlySingularMultiMap } from '../../../src/core/tools/MostlySingularMultiMap.js';
import { PseudoMatch } from '../../../src/core/tools/PseudoMatch.js';
import { Thread } from '../../../src/lib/java/Thread.js';

describe('tools utilities', () => {
  it('MostlySingularMultiMap', () => {
    const m = new MostlySingularMultiMap(new Map([['a', ['x']], ['b', ['y', 'z']], ['c', []]]));
    expect(m.getList('a')).toEqual(['x']);
    expect(m.getList('b')).toEqual(['y', 'z']);
    expect(m.getList('c')).toEqual([]);
    expect(m.getList('d')).toBeNull();
  });

  it('InterruptibleCharSequence', () => {
    const q = new InterruptibleCharSequence('abc');
    expect(q.subSequence(1, 3).toString()).toBe('bc');
    expect(() => q.charAt(3)).toThrow('String index out of range: 3');
    Thread.currentThread().interrupt();
    expect(() => q.charAt(0)).toThrow('java.lang.InterruptedException');
    expect(Thread.currentThread().isInterrupted()).toBe(false);
  });

  it('TranslationEntry', () => {
    const t = new TranslationEntry(['a', 'b'], ['c'], 1);
    expect(t.toString()).toBe('[a, b] -> [c]');
    expect(t.equals(new TranslationEntry(['a', 'b'], ['c'], 2))).toBe(true);
    expect(t.hashCode()).toBe(new TranslationEntry(['a', 'b'], ['c'], 5).hashCode());
    expect(() => new TranslationEntry(null, [], 1)).toThrow();
  });

  it('PseudoMatch, FakeRule, LoggingTools', () => {
    expect(new PseudoMatch('x', 1, 2).toString()).toBe('1-2-[x]');
    expect(new FakeRule().getId()).toBe('FAKE-RULE');
    expect(new FakeRule('A').getDescription()).toBe('<none>');
    expect(LoggingTools.REQUEST).toBe(getMarker('REQUEST'));
  });
});
