// JS twin of harness op "probe-collections" (ProbeCollections.java): dispatches to the src/lib/java collection helpers; unported JDK classes -> notPorted.
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';
import { JavaHashSet } from '../../src/lib/java/collections/JavaHashSet.js';
import { JavaConcurrentHashMap } from '../../src/lib/java/collections/JavaConcurrentHashMap.js';
import { shuffle as collectionsShuffle } from '../../src/lib/java/collections/Collections.js';
import { Random } from '../../src/lib/java/Random.js';
import { scannerLines, readerLines } from '../../src/lib/java/io.js';
import { lines as stringLines, javaCompare, CASE_INSENSITIVE_ORDER } from '../../src/lib/java/strings.js';
import { doubleToString } from '../../src/lib/java/toString.js';
import { abstractCollectionToString, abstractMapToString } from '../../src/lib/java/toString.js';
import { setHashCode, mapHashCode } from '../../src/lib/java/hash.js';
import { IllegalArgumentException, NullPointerException } from '../../src/lib/java/errors.js';

// marker error: JDK class without a port (parity runner drops the request on both sides)
class NotPorted extends Error {
  constructor(what) {
    super(`NOT PORTED: ${what}`);
    this.notPorted = true;
    this.javaClass = 'NOT PORTED';
  }
}

const units = (s) => Array.from({ length: s.length }, (_, i) => s.charCodeAt(i));

// Java: Probe#units2(String)
const units2 = (s) => (s === null ? null : { s, units: units(s) });

// Java: Probe#num(String,Object) for int/long
const numInt = (v) => ({ t: 'int', v: String(v) });
const numLong = (v) => ({ t: 'long', v: String(v) });

// Java: Probe#num(String,Object) for double
function numDouble(d) {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, d);
  return { t: 'double', v: doubleToString(d), bits: `0x${dv.getBigUint64(0).toString(16).padStart(16, '0')}` };
}

// Java: Probe#key(String,JsonNode) for the key types that have a faithful JS value (int, string)
function key(type, n) {
  if (n === null || n === undefined) return null;
  const v = String(n);
  switch (type) {
    case 'string': return v;
    case 'int': return Number(v) | 0;
    default: throw new NotPorted(`key type ${type}`);
  }
}

// Java: Probe#repr(Object) for int keys/values, strings, booleans, null
function repr(o) {
  if (o === null || o === undefined || typeof o === 'string' || typeof o === 'boolean') return o;
  if (typeof o === 'number') return numInt(o);
  if (Array.isArray(o)) return o.map(repr);
  throw new NotPorted('repr');
}

// Java: ProbeCollections#map(JsonNode); HashMap, HashSet and ConcurrentHashMap only
function map(a) {
  const kind = a.kind;
  const kt = a.keyType !== undefined ? a.keyType : 'string';
  const ctor = a.ctor !== undefined ? a.ctor : 'default';
  if (!['HashMap', 'HashSet', 'ConcurrentHashMap'].includes(kind)) {
    if (!['LinkedHashMap', 'LinkedHashSet', 'Hashtable', 'TreeMap', 'TreeSet'].includes(kind)) throw new IllegalArgumentException(`unknown kind: ${kind}`);
    throw new NotPorted(kind);
  }
  if (a.cmp !== undefined && a.cmp !== null) throw new NotPorted('comparator');
  const isMap = !kind.endsWith('Set');
  let coll;
  if (ctor.startsWith('copy')) {
    if (kind === 'ConcurrentHashMap') throw new NotPorted('ConcurrentHashMap(Map)');
    const src = a.keys.map((k) => key(kt, k));
    if (isMap) {
      const lhm = new Map();
      for (const k of src) lhm.set(k, k);
      const s = lhm.size;
      // Java: HashMap#putMapEntries sizing (threshold = tableSizeFor((int)(s / 0.75f + 1.0f)))
      coll = s > 0 ? new JavaHashMap(Math.trunc(Math.fround(Math.fround(s / Math.fround(0.75)) + 1))) : new JavaHashMap();
      for (const [k, v] of lhm) coll.put(k, v);
    } else {
      coll = new JavaHashSet(Array.from(new Set(src)));
    }
  } else {
    if (ctor.includes(':lf:')) throw new NotPorted('load factor');
    const cap = ctor.startsWith('cap:') ? Number.parseInt(ctor.substring(4).split(':')[0], 10) : -1;
    switch (kind) {
      case 'HashMap': coll = cap < 0 ? new JavaHashMap() : new JavaHashMap(cap); break;
      case 'ConcurrentHashMap':
        if (cap >= 0) throw new NotPorted('ConcurrentHashMap(int)');
        coll = new JavaConcurrentHashMap();
        break;
      default: coll = cap < 0 ? new JavaHashSet() : new JavaHashSet(cap); break;
    }
  }
  const trace = [];
  if (a.ops !== undefined && a.ops !== null) {
    for (const op of a.ops) {
      const name = String(op[0]);
      const step = { op: JSON.stringify(op) };
      try {
        const k = op.length > 1 ? key(kt, op[1]) : null;
        let r;
        switch (name) {
          case 'put': r = isMap ? coll.put(k, op.length > 2 ? String(op[2]) : 'v') : coll.add(k); break;
          case 'putIfAbsent': throw new NotPorted('putIfAbsent');
          case 'remove':
            if (kind === 'ConcurrentHashMap') throw new NotPorted('ConcurrentHashMap#remove');
            r = coll.remove(k);
            break;
          case 'get':
            if (!isMap) throw new NotPorted('Set#get cast');
            r = coll.get(k);
            break;
          case 'contains': r = isMap ? coll.containsKey(k) : coll.contains(k); break;
          case 'clear': throw new NotPorted('clear');
          case 'size': r = coll.size(); break;
          default: throw new NotPorted(`op ${name}`);
        }
        step.result = repr(r);
      } catch (e) {
        if (e && e.notPorted === true) throw e;
        step.error = `${e.javaClass ?? e.constructor.name}: ${e.message ?? null}`;
      }
      trace.push(step);
    }
  } else {
    for (const k of a.keys) {
      if (isMap) coll.put(key(kt, k), `v${trace.length}`);
      else coll.add(key(kt, k));
      trace.push(null);
    }
  }
  if ((coll.map ?? coll).treeBinsNeeded === true) throw new NotPorted('HashMap tree bins');
  const m = {};
  if (a.ops !== undefined && a.ops !== null) m.trace = trace;
  if (isMap) {
    const entries = coll.entrySet();
    m.keys = repr(entries.map((e) => e[0]));
    m.values = repr(entries.map((e) => e[1]));
    m.toString = abstractMapToString({ entries: () => entries });
    m.size = coll.size();
    m.hashCode = mapHashCode(entries);
  } else {
    const ks = [...coll];
    m.keys = repr(ks);
    m.toString = abstractCollectionToString(ks);
    m.size = coll.size();
    m.hashCode = setHashCode(ks);
  }
  return m;
}

// Java: ProbeCollections#cmp(String); natural comparator only (null)
function cmp(name) {
  if (name === undefined || name === null || name === 'natural') return null;
  switch (name) {
    case 'ci': return CASE_INSENSITIVE_ORDER;
    case 'reverse': return (x, y) => javaCompare(y, x);
    case 'len': return (x, y) => Math.sign(x.length - y.length) || 0;
    default: throw new NotPorted(`comparator ${name}`);
  }
}

// Java: ProbeCollections#sort(JsonNode); string lists with a comparator, stable sort
function sort(a) {
  const type = a.type;
  const how = a.how !== undefined ? a.how : 'list';
  if (type !== 'string') throw new NotPorted(`sort of ${type}`);
  if (!['list', 'array', 'stream', 'max'].includes(how)) throw new NotPorted(`sort how ${how}`);
  if (how === 'max') throw new NotPorted('Collections.max');
  const l = a.values.map((v) => key(type, v));
  const c = cmp(a.cmp);
  if (l.some((v) => v === null)) throw new NotPorted('null elements');
  l.sort(c === null ? javaCompare : c); // Java: Collections.sort / List.sort / Arrays.sort / stream sorted (stable)
  return { sorted: repr(l) };
}

// Java: ProbeCollections#random(JsonNode)
function random(a) {
  const r = new Random(BigInt(a.seed));
  const out = [];
  for (const cn of a.calls) {
    const p = String(cn).split(':');
    const step = { call: String(cn) };
    let v;
    switch (p[0]) {
      case 'nextInt':
        if (p.length === 3) throw new NotPorted('Random#nextInt(int,int)');
        v = numInt(p.length === 1 ? r.nextInt() : r.nextInt(Number.parseInt(p[1], 10)));
        break;
      case 'nextLong':
        if (p.length !== 1) throw new NotPorted('Random#nextLong(long)');
        v = numLong(r.nextLong());
        break;
      case 'nextDouble': v = numDouble(r.nextDouble()); break;
      case 'nextBoolean': v = r.nextBoolean(); break;
      case 'nextGaussian': v = numDouble(r.nextGaussian()); break;
      case 'setSeed': r.setSeed(BigInt(p[1])); v = null; break;
      default: throw new NotPorted(`Random#${p[0]}`);
    }
    step.value = v;
    out.push(step);
  }
  return out;
}

// Java: ProbeCollections#shuffle(JsonNode)
function shuffle(a) {
  const l = a.list.map((e) => (e === null ? null : String(e)));
  collectionsShuffle(l, new Random(BigInt(a.seed)));
  return l;
}

// Java: ProbeCollections#scanner(JsonNode); mode "lines" only
function scanner(a) {
  const text = a.text;
  const mode = a.mode !== undefined ? a.mode : 'lines';
  if (mode === 'lines') {
    return {
      scannerLines: scannerLines(text).map(units2),
      readerLines: readerLines(text).map(units2),
      stringLines: stringLines(text).map(units2),
    };
  }
  if (mode === 'tokens' || mode === 'intThenLine') throw new NotPorted(`Scanner mode ${mode}`);
  throw new IllegalArgumentException(`unknown mode: ${mode}`);
}

// Java: ProbeCollections#run(JsonNode)
export function run(a) {
  if (a.fn === undefined || a.fn === null) throw new NullPointerException();
  switch (a.fn) {
    case 'map':
      try {
        return map(a);
      } catch (e) {
        if (e && e.message === 'ConcurrentHashMap: tree bins not modelled') throw new NotPorted('ConcurrentHashMap tree bins');
        throw e;
      }
    case 'sort': return sort(a);
    case 'random': return random(a);
    case 'shuffle': return shuffle(a);
    case 'scanner': return scanner(a);
    case 'properties': case 'pq': case 'list': throw new NotPorted(`probe-collections ${a.fn}`);
    default: throw new IllegalArgumentException(`unknown fn: ${a.fn}`);
  }
}
