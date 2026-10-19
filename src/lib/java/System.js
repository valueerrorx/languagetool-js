// java.lang.System properties (S10: extra properties come from env LTJS_JAVA_OPTS as -Dk=v)
const props = new Map();
for (const opt of (process.env.LTJS_JAVA_OPTS ?? '').split(/\s+/)) {
  const m = /^-D([^=]+)=(.*)$/.exec(opt);
  if (m !== null) props.set(m[1], m[2]);
}

// Java: java.lang.System
export class System {
  // Java: System#getProperty(String)
  static getProperty(key) {
    return props.has(key) ? props.get(key) : null;
  }

  // Java: System#setProperty(String,String)
  static setProperty(key, value) {
    const old = props.has(key) ? props.get(key) : null;
    props.set(key, value);
    return old;
  }
}
