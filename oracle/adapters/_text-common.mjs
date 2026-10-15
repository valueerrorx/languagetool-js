// Shared helpers of the X-TEXT adapters (annotated-text, string-tools, context-tools, analyzed-token).
import { Throwable } from '../../src/lib/java/errors.js';

// Java: TextOps#err(Throwable)
export function err(t) {
  return { error: { class: t.javaClass ?? `js:${t.constructor.name}`, message: t.message ?? null } };
}

// Java: TextOps#safe(Callable)
export function safe(fn) {
  try {
    return fn();
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    return err(t);
  }
}

// Java: java.lang.reflect.InvocationTargetException (reflective constructor call in the harness)
export class InvocationTargetException extends Throwable {
  static FQCN = 'java.lang.reflect.InvocationTargetException';
}

// Java: TextOps#str(JsonNode)
export const str = (n) => (n === undefined || n === null ? null : String(n));
