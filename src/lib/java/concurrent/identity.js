// Integer.toHexString(System.identityHashCode(o)) over the shared identity hash of Objects.hashCode
import { Objects } from '../Objects.js';

// Java: Integer.toHexString(Object#hashCode()) for objects without their own hashCode
export function identityHashHex(o) {
  return (Objects.hashCode(o) >>> 0).toString(16);
}
