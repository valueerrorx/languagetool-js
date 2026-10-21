// BasicAuthentication (SRV-0106)
import { describe, it, expect } from 'vitest';
import { BasicAuthentication } from '../../src/server/BasicAuthentication.js';
import { AuthException } from '../../src/server/exceptions.js';

const b64 = (s) => `Basic ${Buffer.from(s, 'utf8').toString('base64')}`;

describe('BasicAuthentication', () => {
  it('parses user and password (first colon splits)', () => {
    const a = new BasicAuthentication(b64('usär:pa:ss'));
    expect(a.getUser()).toBe('usär');
    expect(a.getPassword()).toBe('pa:ss');
  });

  it('rejects malformed headers', () => {
    for (const h of ['Bearer x', 'basic dTpw', b64('nocolon'), b64(':p'), b64('u:'), b64(' :p'), b64('u: ')]) {
      expect(() => new BasicAuthentication(h), h).toThrow(AuthException);
    }
    expect(() => new BasicAuthentication('Basic ***')).toThrow('Illegal base64 character 2a');
  });
});
