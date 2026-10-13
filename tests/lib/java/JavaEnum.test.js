import { describe, it, expect } from 'vitest';
import { JavaEnum } from '../../../src/lib/java/JavaEnum.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

class Color extends JavaEnum {
  static FQCN = 'org.example.Color';
  static RED = new Color('RED', 0);
  static GREEN = new Color('GREEN', 1);
}

class Op extends JavaEnum {
  static FQCN = 'org.example.Op';
  static A = new Op('A', 0);
  static B = new (class extends Op { toString() { return 'bb'; } })('B', 1);
}

describe('JavaEnum (X-ERRORS)', () => {
  it('name, ordinal, toString, compareTo, values', () => {
    expect(Color.GREEN.name()).toBe('GREEN');
    expect(Color.GREEN.ordinal()).toBe(1);
    expect(Color.RED.toString()).toBe('RED');
    expect(Color.RED.compareTo(Color.GREEN)).toBe(-1);
    expect(Color.values()).toEqual([Color.RED, Color.GREEN]);
  });
  it('valueOf', () => {
    expect(Color.valueOf('RED')).toBe(Color.RED);
    assertThrowsJava(() => Color.valueOf('red'), 'java.lang.IllegalArgumentException', 'No enum constant org.example.Color.red');
    assertThrowsJava(() => Color.valueOf(null), 'java.lang.NullPointerException', 'Name is null');
  });
  it('constant with class body is registered on the declaring class', () => {
    // JDK 17: Arrays.toString(E.values()) = [A, bb]; E.B.getDeclaringClass() = E
    expect(Op.values().map(String)).toEqual(['A', 'bb']);
    expect(Op.valueOf('B')).toBe(Op.B);
    expect(Op.B.getDeclaringClass()).toBe(Op);
    assertThrowsJava(() => Op.valueOf('C'), 'java.lang.IllegalArgumentException', 'No enum constant org.example.Op.C');
  });
  it('missing FQCN fails loudly', () => {
    class NoName extends JavaEnum {}
    assertThrowsJava(() => new NoName('X', 0), 'java.lang.IllegalStateException');
  });
});
