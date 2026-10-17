// Java array element access with bounds check (ArrayIndexOutOfBoundsException).
import { ArrayIndexOutOfBoundsException, IllegalArgumentException, IndexOutOfBoundsException } from './errors.js';

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

// Java: Arrays#copyOfRange(T[],int,int) (pads with null beyond the end; the arraycopy message of the out-of-range case is not modelled)
export function copyOfRange(a, from, to) {
  const newLength = to - from;
  if (newLength < 0) throw new IllegalArgumentException(`${from} > ${to}`);
  if (from < 0 || from > a.length) throw new ArrayIndexOutOfBoundsException(`arraycopy: source index ${from} out of bounds for object array[${a.length}]`);
  const out = new Array(newLength).fill(null);
  for (let i = 0; i < Math.min(newLength, a.length - from); i++) out[i] = a[from + i];
  return out;
}
