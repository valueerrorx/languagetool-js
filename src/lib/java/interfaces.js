// Java interface markers with instanceof support (ARCHITECTURE.md section 3).

export const IMPLEMENTS = Symbol('implements');

// collects an interface and all its super-interfaces
function allInterfaces(list, out) {
  for (const i of list) {
    if (out.has(i)) continue;
    out.add(i);
    allInterfaces(i.extends, out);
  }
  return out;
}

// Java: interface declaration; `extendsList` = super-interfaces
export function defineInterface(fqcn, ...extendsList) {
  const marker = {
    fqcn,
    extends: extendsList,
    toString() {
      return fqcn;
    },
    // Java: instanceof <interface>
    [Symbol.hasInstance](obj) {
      if (obj === null || obj === undefined || (typeof obj !== 'object' && typeof obj !== 'function')) return false;
      if (Object.hasOwn(obj, IMPLEMENTS) && allInterfaces(obj[IMPLEMENTS], new Set()).has(marker)) return true;
      for (let p = Object.getPrototypeOf(obj); p; p = Object.getPrototypeOf(p)) {
        const c = Object.hasOwn(p, 'constructor') ? p.constructor : null;
        if (c && Object.hasOwn(c, IMPLEMENTS) && allInterfaces(c[IMPLEMENTS], new Set()).has(marker)) return true;
      }
      return false;
    },
  };
  return marker;
}
