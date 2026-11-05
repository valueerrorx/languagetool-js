// FQCN registry replacing Class.forName; later steps register their classes (rule filters, services).
import { ClassNotFoundException, NullPointerException } from '../../lib/java/errors.js';

const registry = new Map(); // fully qualified Java class name -> class/constructor

// JDK classes that exist on every classpath (Class.forName succeeds, e.g. Languages.getOrAddLanguageByClassName("java.lang.String"))
registry.set('java.lang.Object', class JavaObject { static FQCN = 'java.lang.Object'; });
registry.set('java.lang.String', class JavaString {
  static FQCN = 'java.lang.String';
  // Class#getConstructors() of java.lang.String on JDK 17 (15 public constructors)
  static JAVA_CONSTRUCTORS = ['', 'java.lang.String', 'char[]', 'char[],int,int', 'int[],int,int', 'byte[],int,int,int', 'byte[],int',
    'byte[],int,int,java.lang.String', 'byte[],int,int,java.nio.charset.Charset', 'byte[],java.lang.String', 'byte[],java.nio.charset.Charset',
    'byte[],int,int', 'byte[]', 'java.lang.StringBuffer', 'java.lang.StringBuilder'].map((p) => ({ params: p === '' ? [] : p.split(','), text: `public java.lang.String(${p})` }));
});

// registers a ported class under its Java FQCN (registry mechanism, entries are added by later steps)
export function registerClass(fqcn, cls) {
  registry.set(fqcn, cls);
}

// Java: org.languagetool.broker.DefaultClassBroker
export class DefaultClassBroker {
  static FQCN = 'org.languagetool.broker.DefaultClassBroker';

  // Java: DefaultClassBroker#forName(String) -> Class.forName(String)
  forName(qualifiedName) {
    if (qualifiedName === null || qualifiedName === undefined) throw new NullPointerException();
    if (!registry.has(qualifiedName)) throw new ClassNotFoundException(qualifiedName);
    return registry.get(qualifiedName);
  }
}

// registry lookup without Class.forName semantics (used to register placeholders only where no ported class exists)
export function hasClass(fqcn) {
  return registry.has(fqcn);
}

// returns classes registered under an FQCN prefix (no Language import → no cycle); Languages filters instanceof
export function getRegisteredClassesWithPrefix(prefix) {
  const out = [];
  for (const [fqcn, cls] of registry) {
    if (fqcn.startsWith(prefix)) out.push(cls);
  }
  return out;
}

// Java: Class#getConstructors(); a class declares them in static JAVA_CONSTRUCTORS ({params, text}), default is one public no-arg constructor
export function getConstructors(cls) {
  if (Object.hasOwn(cls, 'JAVA_CONSTRUCTORS')) return cls.JAVA_CONSTRUCTORS;
  return [{ params: [], text: `public ${cls.FQCN}()` }];
}
