// Java hash codes of arrays and collections (String/Objects.hash live in Objects.js; boxed ones in the number helpers).
import { Objects } from './Objects.js';
import { Double } from './numbers.js';
import { Float } from './float.js';
import { Long } from './long.js';

export { stringHashCode } from './Objects.js';

// boxed Double/Float/Long/Short with Java hashCode/equals; a plain JS number hashes as Integer (P15)
function boxed(kind, value, hash, str) {
  return {
    kind,
    value,
    hashCode: () => hash(value),
    equals: (o) => o !== null && typeof o === 'object' && o.kind === kind && Object.is(o.value, value),
    toString: () => str(value),
  };
}

// Java: Double#valueOf(double) / Float#valueOf(float) / Long#valueOf(long) / Short#valueOf(short), for hashing in Objects.hash/Arrays.hashCode
export const typedHash = {
  Double: (d) => boxed('Double', d, Double.hashCode, Double.toString),
  Float: (f) => boxed('Float', f, Float.hashCode, (v) => String(Float.toString(v))),
  Long: (l) => boxed('Long', l, Long.hashCode, (v) => v.toString()),
  Short: (v) => boxed('Short', v, (x) => x, String),
};

// Java: Objects#hash(Object...)
export const objectsHash = (...values) => Objects.hash(...values);

// Java: Objects#hashCode(Object)
export const hashCode = (o) => Objects.hashCode(o);

// Java: Arrays#hashCode(Object[])
export function arraysHashCode(a) {
  if (a === null || a === undefined) return 0;
  let result = 1;
  for (const e of a) result = (Math.imul(31, result) + Objects.hashCode(e)) | 0;
  return result;
}

// Java: AbstractList#hashCode()
export function listHashCode(list) {
  let h = 1;
  for (const e of list) h = (Math.imul(31, h) + Objects.hashCode(e)) | 0;
  return h;
}

// Java: AbstractSet#hashCode()
export function setHashCode(set) {
  let h = 0;
  for (const e of set) h = (h + Objects.hashCode(e)) | 0;
  return h;
}

// Java: Map.Entry#hashCode() as in HashMap.Node
export function entryHashCode(key, value) {
  return Objects.hashCode(key) ^ Objects.hashCode(value);
}

// Java: AbstractMap#hashCode()
export function mapHashCode(map) {
  let h = 0;
  for (const [k, v] of map) h = (h + entryHashCode(k, v)) | 0;
  return h;
}
