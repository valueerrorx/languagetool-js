// org.apache.commons.pool2.impl.GenericKeyedObjectPool 2.12 subset used by PipelinePool: maxTotal, maxIdlePerKey, maxTotalPerKey, no blocking, LIFO idle objects
import { IllegalStateException, NoSuchElementException } from '../lib/java/errors.js';
import { Objects } from '../lib/java/Objects.js';
import { currentTimeMillis } from '../lib/java/clock.js';

// Java: PooledObjectState
const IDLE = 0;
const ALLOCATED = 1;

export class GenericKeyedObjectPool {
  static FQCN = 'org.apache.commons.pool2.impl.GenericKeyedObjectPool';

  // factory: {makeObject(key)}; config: {maxTotal, maxIdlePerKey, maxTotalPerKey}
  constructor(factory, config) {
    this.factory = factory;
    this.maxTotal = config.maxTotal;
    this.maxIdlePerKey = config.maxIdlePerKey;
    this.maxTotalPerKey = config.maxTotalPerKey;
    this.keys = []; // [{key, hash, idle: [], all: [], createCount}]
    this.numTotal = 0;
    this.seq = 0;
  }

  find(key) {
    const hash = Objects.hashCode(key);
    for (const d of this.keys) if (d.hash === hash && Objects.equals(d.key, key)) return d;
    return null;
  }

  register(key) {
    let d = this.find(key);
    if (d === null) {
      d = { key, hash: Objects.hashCode(key), idle: [], all: [], createCount: 0 };
      this.keys.push(d);
    }
    return d;
  }

  // Java: GenericKeyedObjectPool#getNumActive() / getNumIdle()
  getNumIdle() {
    return this.keys.reduce((n, d) => n + d.idle.length, 0);
  }

  getNumActive() {
    return this.keys.reduce((n, d) => n + d.all.length - d.idle.length, 0);
  }

  // Java: GenericKeyedObjectPool#borrowObject(Object); blockWhenExhausted = false: NoSuchElementException when nothing can be created
  borrowObject(key) {
    const d = this.register(key);
    let p = d.idle.length > 0 ? d.idle.shift() : null;
    if (p === null) p = this.create(key);
    if (p === null) {
      this.deregister(d);
      throw new NoSuchElementException('Pool exhausted');
    }
    p.state = ALLOCATED;
    return p.object;
  }

  // Java: GenericKeyedObjectPool#create(Object)
  create(key) {
    const maxTotalPerKey = this.maxTotalPerKey < 0 ? 2147483647 : this.maxTotalPerKey;
    const d = this.register(key);
    for (;;) {
      this.numTotal++;
      if (this.maxTotal > -1 && this.numTotal > this.maxTotal) {
        this.numTotal--;
        if (this.getNumIdle() === 0) return null;
        this.clearOldest();
      } else {
        break;
      }
    }
    d.createCount++;
    if (d.createCount > maxTotalPerKey) {
      d.createCount--;
      this.numTotal--;
      return null;
    }
    let p;
    try {
      p = { object: this.factory.makeObject(key), state: IDLE, lastReturn: currentTimeMillis(), seq: this.seq++ };
    } catch (e) {
      d.createCount--;
      this.numTotal--;
      throw e;
    }
    d.all.push(p);
    return p;
  }

  // Java: GenericKeyedObjectPool#clearOldest(): destroys the oldest 15 % (plus one) of the idle objects of all keys
  clearOldest() {
    const all = [];
    for (const d of this.keys) for (const p of d.idle) all.push({ p, d });
    all.sort((a, b) => (a.p.lastReturn - b.p.lastReturn) || (a.p.seq - b.p.seq));
    let itemsToRemove = Math.trunc(all.length * 0.15) + 1;
    for (const { p, d } of all) {
      if (itemsToRemove <= 0) break;
      this.destroy(d, p);
      itemsToRemove--;
    }
  }

  // Java: GenericKeyedObjectPool#destroy(Object,PooledObject,boolean,DestroyMode)
  destroy(d, p) {
    const i = d.idle.indexOf(p);
    if (i >= 0) d.idle.splice(i, 1);
    d.all.splice(d.all.indexOf(p), 1);
    d.createCount--;
    this.numTotal--;
    this.deregister(d);
  }

  // Java: GenericKeyedObjectPool#deregister(Object): a key without objects and users is removed
  deregister(d) {
    if (d.createCount === 0 && d.all.length === 0) {
      const i = this.keys.indexOf(d);
      if (i >= 0) this.keys.splice(i, 1);
    }
  }

  // Java: GenericKeyedObjectPool#returnObject(Object,Object)
  returnObject(key, obj) {
    const d = this.find(key);
    if (d === null) throw new IllegalStateException('No keyed pool found under the given key.');
    const p = d.all.find((x) => x.object === obj);
    if (p === undefined) throw new IllegalStateException('Returned object not currently part of this pool');
    if (p.state !== ALLOCATED) throw new IllegalStateException('Object has already been returned to this pool or is invalid');
    p.state = IDLE;
    p.lastReturn = currentTimeMillis();
    if (this.maxIdlePerKey > -1 && this.maxIdlePerKey <= d.idle.length) {
      this.destroy(d, p);
    } else {
      d.idle.unshift(p); // LIFO
    }
  }
}
