// Registry for language components created by later steps (taggers, tokenizers, rules ...); unported ones are placeholders that fail only on use.

const factories = new Map(); // Java FQCN -> factory(...ctor args)
const sharedInstances = new Map(); // Java FQCN -> instance of a static singleton (Language.DEMO_TAGGER, GermanTagger.INSTANCE ...)

// error for behaviour whose port is scheduled in a later step (adapters report it as notPorted)
export function notPortedYet(what) {
  return Object.assign(new Error(`not ported yet: ${what}`), { notPorted: true });
}

// placeholder for a Java object whose class is not ported yet: identity and class name work, any member access throws notPorted
class PendingComponent {
  constructor(fqcn) {
    Object.defineProperty(this, 'pendingFqcn', { value: fqcn });
    return new Proxy(this, {
      get(target, prop) {
        if (prop === 'pendingFqcn') return fqcn;
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') return Reflect.get(target, prop);
        throw notPortedYet(`${fqcn}#${String(prop)}`);
      },
    });
  }
}

// registers the factory of a ported component class (called by the step that ports it)
export function registerComponent(fqcn, factory) {
  factories.set(fqcn, factory);
  sharedInstances.delete(fqcn);
}

// Java: new <fqcn>(args...)
export function createComponent(fqcn, ...args) {
  const f = factories.get(fqcn);
  return f === undefined ? new PendingComponent(fqcn) : f(...args);
}

// Java: <fqcn>.INSTANCE / static final field (one instance per class)
export function sharedComponent(fqcn) {
  if (!sharedInstances.has(fqcn)) sharedInstances.set(fqcn, createComponent(fqcn));
  return sharedInstances.get(fqcn);
}

// Java: Object#getClass().getName() of a component
export function componentClassName(o) {
  if (o === null || o === undefined) return null;
  return o.pendingFqcn ?? o.constructor.FQCN;
}
