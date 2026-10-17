// Java array element access with bounds check (ArrayIndexOutOfBoundsException).
import { ArrayIndexOutOfBoundsException, IndexOutOfBoundsException } from './errors.js';

// Java: a[i] (array read)
export function arrayGet(a, i) {
  if (i < 0 || i >= a.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${a.length}`);
  return a[i];
}

// Java: ArrayList#get(int)
export function listGet(list, i) {
  if (i < 0 || i >= list.length) throw new IndexOutOfBoundsException(`Index ${i} out of bounds for length ${list.length}`);
  return list[i];
}

// Java: ArrayList#set(int,Object)
export function listSet(list, i, v) {
  if (i < 0 || i >= list.length) throw new IndexOutOfBoundsException(`Index ${i} out of bounds for length ${list.length}`);
  const old = list[i];
  list[i] = v;
  return old;
}

// Java: a[i] = v (array write)
export function arraySet(a, i, v) {
  if (i < 0 || i >= a.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${a.length}`);
  a[i] = v;
}
