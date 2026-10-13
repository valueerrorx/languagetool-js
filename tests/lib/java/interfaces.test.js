import { describe, it, expect } from 'vitest';
import { defineInterface, IMPLEMENTS } from '../../../src/lib/java/interfaces.js';

const Base = defineInterface('org.example.Base');
const Sub = defineInterface('org.example.Sub', Base);
const Other = defineInterface('org.example.Other');

class A {
  static [IMPLEMENTS] = [Sub];
}
class B extends A {}

describe('interfaces (X-ERRORS)', () => {
  it('instanceof via classes, inheritance and super-interfaces', () => {
    expect(new A() instanceof Sub).toBe(true);
    expect(new A() instanceof Base).toBe(true);
    expect(new B() instanceof Base).toBe(true);
    expect(new A() instanceof Other).toBe(false);
    expect(null instanceof Base).toBe(false);
    expect('s' instanceof Base).toBe(false);
  });
  it('instance level marker', () => {
    expect({ [IMPLEMENTS]: [Other] } instanceof Other).toBe(true);
  });
});
