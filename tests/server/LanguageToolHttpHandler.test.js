// Java: LanguageToolHttpHandler#readerToString chunking (InputStreamReader over the 8192-byte decoder buffer), body guard
import { describe, expect, it } from 'vitest';
import { LanguageToolHttpHandler } from '../../src/server/LanguageToolHttpHandler.js';
import { TextTooLongException } from '../../src/server/exceptions.js';

describe('LanguageToolHttpHandler#readerToString', () => {
  const handler = Object.create(LanguageToolHttpHandler.prototype);
  it('read sizes follow the decoder buffer', () => {
    expect(LanguageToolHttpHandler.readSizes('a'.repeat(4001))).toEqual([4000, 1]);
    expect(LanguageToolHttpHandler.readSizes('a'.repeat(24000))).toEqual([4000, 4000, 192, 4000, 4000, 192, 4000, 3616]);
    expect(LanguageToolHttpHandler.readSizes('')).toEqual([]);
  });
  it('hard limit is checked before each chunk', () => {
    expect(handler.readerToString(Buffer.from('a'.repeat(4000)), 0)).toHaveLength(4000);
    expect(() => handler.readerToString(Buffer.from('a'.repeat(4001)), 0)).toThrow(TextTooLongException);
    expect(handler.readerToString(Buffer.from('a'.repeat(20001)), 2000)).toHaveLength(20001);
    expect(() => handler.readerToString(Buffer.from('a'.repeat(24000)), 2000)).toThrow("hard limit of 20000 characters.");
  });
});
