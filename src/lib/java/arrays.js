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

// Java: Arrays#copyOfRange(T[],int,int) (pads with null beyond the end; HotSpot arraycopy messages: from < 0 source index, from > length negative length)
export function copyOfRange(a, from, to) {
  const newLength = to - from;
  if (newLength < 0) throw new IllegalArgumentException(`${from} > ${to}`);
  if (from < 0) throw new ArrayIndexOutOfBoundsException(`arraycopy: source index ${from} out of bounds for object array[${a.length}]`);
  if (from > a.length) throw new ArrayIndexOutOfBoundsException(`arraycopy: length ${a.length - from} is negative`);
  const out = new Array(newLength).fill(null);
  for (let i = 0; i < Math.min(newLength, a.length - from); i++) out[i] = a[from + i];
  return out;
}

// Java: Arrays#binarySearch(T[],T,Comparator)
export function binarySearch(a, key, c) {
  let low = 0;
  let high = a.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = c(a[mid], key);
    if (cmp < 0) low = mid + 1;
    else if (cmp > 0) high = mid - 1;
    else return mid;
  }
  return -(low + 1);
}
