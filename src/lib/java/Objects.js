// java.util.Objects (plus String/Double hash helpers used by Objects.hash).
import { NullPointerException, IndexOutOfBoundsException, UnsupportedOperationException } from './errors.js';
import { doubleToString } from './toString.js';

const identityHashes = new WeakMap();
let nextIdentityHash = 0x1b6d3586;

const dv = new DataView(new ArrayBuffer(8));

// Java: String#hashCode()
export function stringHashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// Java: Double#hashCode(double)
function doubleHashCode(d) {
  if (Number.isNaN(d)) dv.setBigUint64(0, 0x7ff8000000000000n);
  else dv.setFloat64(0, d);
  const bits = dv.getBigUint64(0);
  return Number(BigInt.asIntN(32, bits ^ (bits >> 32n)));
}

// Java: Object#hashCode() for any JS value (integral numbers hash like Integer)
function hashCodeOf(o) {
  if (o === null || o === undefined) return 0;
  if (typeof o === 'string') return stringHashCode(o);
  if (typeof o === 'boolean') return o ? 1231 : 1237;
  if (typeof o === 'number') return Number.isInteger(o) && o >= -2147483648 && o <= 2147483647 && !Object.is(o, -0) ? o : doubleHashCode(o);
  if (typeof o.hashCode === 'function') return o.hashCode();
  let h = identityHashes.get(o);
  if (h === undefined) {
    nextIdentityHash = (Math.imul(nextIdentityHash, 1103515245) + 12345) & 0x7fffffff;
    h = nextIdentityHash;
    identityHashes.set(o, h);
  }
  return h;
}

// Java: String#valueOf(Object) (single shared helper, SEMANTICS P14)
export function valueOf(o) {
  if (o === null || o === undefined) return 'null';
  if (typeof o === 'number') return Number.isSafeInteger(o) && !Object.is(o, -0) ? String(o) : doubleToString(o);
  if (typeof o === 'object' && (Array.isArray(o) || o.toString === Object.prototype.toString)) {
    throw new UnsupportedOperationException('Object.toString() identity form (Name@hash) is not ported');
  }
  return String(o);
}

// Java: java.util.Objects
export class Objects {
  // Java: Objects#equals(Object,Object)
  static equals(a, b) {
    if (typeof a === 'number') return Object.is(a, b); // SEMANTICS P14
    if (a === b) return true;
    if (a === null || a === undefined) return b === null || b === undefined;
    if (typeof a === 'object' && typeof a.equals === 'function') return a.equals(b);
    return false;
  }

  // Java: Objects#deepEquals(Object,Object)
  static deepEquals(a, b) {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return false;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => Objects.deepEquals(x, b[i]));
    return Objects.equals(a, b);
  }

  // Java: Objects#hashCode(Object)
  static hashCode(o) {
    return hashCodeOf(o);
  }

  // Java: Objects#hash(Object...)
  static hash(...values) {
    if (values.length === 0) return 1; // Arrays.hashCode(null) is 0, but varargs is never null here
    let result = 1;
    for (const e of values) result = (Math.imul(31, result) + hashCodeOf(e)) | 0;
    return result;
  }

  // Java: Objects#toString(Object) / Objects#toString(Object,String)
  static toString(o, nullDefault) {
    if (arguments.length >= 2) return o !== null && o !== undefined ? valueOf(o) : nullDefault;
    return valueOf(o);
  }

  // Java: Objects#compare(T,T,Comparator)
  static compare(a, b, c) {
    return a === b ? 0 : c(a, b);
  }

  // Java: Objects#requireNonNull(T) / (T,String) / (T,Supplier)
  static requireNonNull(obj, messageOrSupplier) {
    if (obj === null || obj === undefined) {
      if (arguments.length < 2) throw new NullPointerException();
      throw new NullPointerException(typeof messageOrSupplier === 'function' ? messageOrSupplier() : messageOrSupplier);
    }
    return obj;
  }

  // Java: Objects#isNull(Object)
  static isNull(obj) {
    return obj === null || obj === undefined;
  }

  // Java: Objects#nonNull(Object)
  static nonNull(obj) {
    return obj !== null && obj !== undefined;
  }

  // Java: Objects#requireNonNullElse(T,T)
  static requireNonNullElse(obj, defaultObj) {
    return obj !== null && obj !== undefined ? obj : Objects.requireNonNull(defaultObj, 'defaultObj');
  }

  // Java: Objects#requireNonNullElseGet(T,Supplier)
  static requireNonNullElseGet(obj, supplier) {
    return obj !== null && obj !== undefined ? obj : Objects.requireNonNull(Objects.requireNonNull(supplier, 'supplier')(), 'supplier.get()');
  }

  // Java: Objects#checkIndex(int,int)
  static checkIndex(index, length) {
    if (index < 0 || index >= length) throw new IndexOutOfBoundsException(`Index ${index} out of bounds for length ${length}`);
    return index;
  }
}
