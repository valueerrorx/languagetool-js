// java.util.Base64 basic decoder: results and JDK 17 error texts
import { describe, it, expect } from 'vitest';
import { Base64 } from '../../../src/lib/java/Base64.js';

const dec = (s) => Buffer.from(Base64.decode(Buffer.from(s, 'latin1'))).toString('latin1');

describe('Base64 decoder', () => {
  it('decodes padded and unpadded input', () => {
    expect(dec('')).toBe('');
    expect(dec('YQ==')).toBe('a');
    expect(dec('YQ')).toBe('a');
    expect(dec('YWI=')).toBe('ab');
    expect(dec('YWJj')).toBe('abc');
    expect(dec('dTpw')).toBe('u:p');
  });

  it('throws the JDK texts', () => {
    expect(() => dec('Y')).toThrow('Input byte[] should at least have 2 bytes for base64 bytes');
    expect(() => dec('YW Jj')).toThrow('Illegal base64 character 20');
    expect(() => dec('=AAA')).toThrow('Input byte array has wrong 4-byte ending unit');
    expect(() => dec('YWJjZ')).toThrow('Last unit does not have enough valid bits');
    expect(() => dec('YQ==YQ==')).toThrow('Input byte array has incorrect ending byte at 4');
    expect(() => Base64.decode(Uint8Array.from([0xe4, 0x41]))).toThrow('Illegal base64 character -1c');
  });
});
