// java-diff-utils subset: Myers diff and SPLITTER_BY_WORD (expectations verified against java-diff-utils 4.12 via X-TOOLS diffs fixtures)
import { describe, it, expect } from 'vitest';
import { DEFAULT_EQUALIZER, DeltaType, SPLITTER_BY_WORD, diff } from '../../../src/lib/diff/MyersDiff.js';

describe('MyersDiff', () => {
  it('SPLITTER_BY_WORD keeps delimiters', () => {
    expect(SPLITTER_BY_WORD('a, b  c.')).toEqual(['a', ',', ' ', 'b', '  ', 'c', '.']);
    expect(SPLITTER_BY_WORD('')).toEqual([]);
  });

  it('diff types and order', () => {
    const d = diff(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'e'], DEFAULT_EQUALIZER);
    expect(d.map((x) => [x.type, x.source.position, x.source.lines, x.target.lines])).toEqual([
      [DeltaType.CHANGE, 1, ['b'], ['x']],
      [DeltaType.INSERT, 4, [], ['e']],
    ]);
    expect(diff(['a'], ['a'], DEFAULT_EQUALIZER)).toEqual([]);
    expect(diff(['a', 'b'], [], DEFAULT_EQUALIZER)[0].type).toBe(DeltaType.DELETE);
  });
});
