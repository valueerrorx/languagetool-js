// Ported from UnsyncStackTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { UnsyncStack, EmptyStackException } from '../../../src/core/rules/UnsyncStack.js';

describe('UnsyncStackTest', () => {
  // Java: UnsyncStackTest#testStack
  it('testStack', () => {
    const stack = new UnsyncStack();
    expect(stack.empty()).toBe(true);
    stack.push('test');
    expect(stack.peek()).toBe('test');
    expect(stack.empty()).toBe(false);
    expect(stack.pop()).toBe('test');
    expect(stack.empty()).toBe(true);
    expect(() => stack.pop()).toThrow(EmptyStackException);
    expect(() => stack.peek()).toThrow(EmptyStackException);
    stack.push('a');
    stack.push('b');
    expect(stack.search('a')).toBe(2);
    expect(stack.search('x')).toBe(-1);
  });
});
