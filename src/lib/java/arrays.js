// Java array element access with bounds check (ArrayIndexOutOfBoundsException).
import { ArrayIndexOutOfBoundsException } from './errors.js';

// Java: a[i] (array read)
export function arrayGet(a, i) {
  if (i < 0 || i >= a.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${a.length}`);
  return a[i];
}
