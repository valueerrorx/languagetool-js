// Base class for ported Java enums (ARCHITECTURE.md section 3).
import { IllegalArgumentException, IllegalStateException, NullPointerException } from './errors.js';

const VALUES = Symbol('enumValues');

// Java: Enum#getDeclaringClass() (walks from a constant-body subclass up to the class extending JavaEnum)
function declaringClass(C) {
  while (Object.getPrototypeOf(C) !== JavaEnum && Object.getPrototypeOf(C) !== Function.prototype) C = Object.getPrototypeOf(C);
  return C;
}

// Java: java.lang.Enum
export class JavaEnum {
  // Java: Enum#Enum(String,int); registers the constant in declaration order
  constructor(name, ordinal) {
    this._name = name;
    this._ordinal = ordinal;
    const C = declaringClass(new.target);
    if (!Object.hasOwn(C, 'FQCN')) throw new IllegalStateException(`enum class ${C.name} must declare static FQCN`);
    if (!Object.hasOwn(C, VALUES)) Object.defineProperty(C, VALUES, { value: [], enumerable: false });
    C[VALUES].push(this);
  }

  // Java: Enum#name()
  name() {
    return this._name;
  }

  // Java: Enum#ordinal()
  ordinal() {
    return this._ordinal;
  }

  // Java: Enum#toString()
  toString() {
    return this._name;
  }

  // Java: Enum#compareTo(E)
  compareTo(o) {
    if (o === null || o === undefined) throw new NullPointerException();
    return this._ordinal - o._ordinal;
  }

  // Java: Enum#equals(Object)
  equals(o) {
    return this === o;
  }

  // Java: Enum#getDeclaringClass()
  getDeclaringClass() {
    return declaringClass(this.constructor);
  }

  // Java: Enum#values() (synthetic static)
  static values() {
    return Object.hasOwn(this, VALUES) ? this[VALUES].slice() : [];
  }

  // Java: Enum#valueOf(Class,String) (synthetic static valueOf(String))
  static valueOf(name) {
    if (name === null || name === undefined) throw new NullPointerException('Name is null');
    for (const v of this.values()) if (v._name === name) return v;
    throw new IllegalArgumentException(`No enum constant ${this.FQCN}.${name}`); // canonical name: nested enums use '.'
  }
}
