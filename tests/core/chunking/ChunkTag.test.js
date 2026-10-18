// Extra test (no Java original): ChunkTag#matches(null) throws NullPointerException like Java
import { describe, it, expect } from 'vitest';
import { ChunkTag } from '../../../src/core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../src/core/chunking/ChunkTaggedToken.js';

describe('ChunkTag', () => {
  it('matches(null) throws NullPointerException', () => {
    expect(() => new ChunkTag('NP').matches(null)).toThrow(expect.objectContaining({ javaClass: 'java.lang.NullPointerException' }));
    expect(() => new ChunkTag('N.*', true).matches(null)).toThrow(expect.objectContaining({ javaClass: 'java.lang.NullPointerException' }));
  });
  it('matches regexp and equals', () => {
    expect(new ChunkTag('B-NP.*', true).matches(new ChunkTag('B-NP-singular'))).toBe(true);
    expect(new ChunkTag('NP').matches(new ChunkTag('NP', true))).toBe(true);
  });
  it('ChunkTaggedToken toString', () => {
    expect(new ChunkTaggedToken('a', [new ChunkTag('X'), new ChunkTag('Y.*', true)], null).toString()).toBe('a/X,Y.*[regex]');
  });
});
