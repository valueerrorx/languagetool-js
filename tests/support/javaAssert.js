// Test helpers: assertions on Java exception class and message.
import { expect } from 'vitest';

// expects fn to throw a ported Java exception with the given FQCN and message (message undefined = not checked)
export function assertThrowsJava(fn, fqcn, message) {
  let thrown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, 'expected an exception').toBeDefined();
  expect(thrown.javaClass).toBe(fqcn);
  if (message !== undefined) expect(thrown.getMessage()).toBe(message);
  return thrown;
}
