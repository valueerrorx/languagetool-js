// Guava com.google.common.cache LocalCache subset: maximumWeight + weigher + recordStats + expireAfterAccess (segments, access queue)
// JS: own model because ResultCache stats and sizes (hit/miss counts, evictions, expiry) are compared with Java; lru-cache cannot reproduce them.
import { NullPointerException } from '../java/errors.js';
import { hashCode as javaHashCode } from '../java/hash.js';
import { Objects } from '../java/Objects.js';

const DRAIN_THRESHOLD = 0x3f;
const MAX_SEGMENTS = 1 << 16;

// Java: CacheStats (hitRate = hitCount / requestCount, 1.0 without requests)
export class CacheStats {
  constructor(hitCount, missCount) {
    this.hits = hitCount;
    this.misses = missCount;
  }

  // Java: CacheStats#hitCount()
  hitCount() {
    return this.hits;
  }

  // Java: CacheStats#missCount()
  missCount() {
    return this.misses;
  }

  // Java: CacheStats#requestCount()
  requestCount() {
    return this.hits + this.misses;
  }

  // Java: CacheStats#hitRate()
  hitRate() {
    const requestCount = this.requestCount();
    return requestCount === 0 ? 1.0 : this.hits / requestCount;
  }
}

// Java: LocalCache#rehash(int) (any well-mixing int hash; segment choice is not observable for the keys used)
function rehash(h) {
  h = (h + (Math.imul(h, 0x8000) ^ 0xffffcd7d)) | 0;
  h ^= h >>> 10;
  h = (h + (h << 3)) | 0;
  h ^= h >>> 6;
  h = (h + (h << 2) + (h << 14)) | 0;
  return (h ^ (h >>> 16)) | 0;
}

const nowNanos = () => process.hrtime.bigint();

// Java: LocalCache.Segment
class Segment {
  constructor(maxSegmentWeight) {
    this.maxSegmentWeight = maxSegmentWeight;
    this.table = new Map(); // hash -> entries
    this.accessQueue = new Set(); // LRU order, head first
    this.count = 0;
    this.totalWeight = 0;
    this.readCount = 0;
  }
}

// Java: com.google.common.cache.Cache built by CacheBuilder (maximumWeight, weigher, expireAfterAccess, recordStats)
export class LocalCache {
  // maximumWeight < 0: no size limit; expireAfterAccessNanos null: no expiry
  constructor({ maximumWeight, weigher, expireAfterAccessNanos = null, concurrencyLevel = 4 }) {
    this.maxWeight = maximumWeight;
    this.weigher = weigher;
    this.expireAfterAccessNanos = expireAfterAccessNanos;
    this.hits = 0;
    this.misses = 0;
    let segmentShift = 0;
    let segmentCount = 1;
    while (segmentCount < concurrencyLevel && (!this.evictsBySize() || segmentCount * 20 <= this.maxWeight)) {
      ++segmentShift;
      segmentCount <<= 1;
    }
    this.segmentShift = 32 - segmentShift;
    this.segmentMask = segmentCount - 1;
    this.segments = [];
    if (this.evictsBySize()) {
      let maxSegmentWeight = Math.floor(this.maxWeight / segmentCount) + 1;
      const remainder = this.maxWeight % segmentCount;
      for (let i = 0; i < segmentCount; i++) {
        if (i === remainder) maxSegmentWeight--;
        this.segments.push(new Segment(maxSegmentWeight));
      }
    } else {
      for (let i = 0; i < Math.min(segmentCount, MAX_SEGMENTS); i++) this.segments.push(new Segment(-1));
    }
  }

  evictsBySize() {
    return this.maxWeight >= 0;
  }

  hash(key) {
    return rehash(javaHashCode(key));
  }

  segmentFor(hash) {
    if (this.segmentMask === 0) return this.segments[0];
    return this.segments[(hash >>> this.segmentShift) & this.segmentMask];
  }

  // Java: LocalCache.Segment#getEntry
  getEntry(segment, key, hash) {
    const bucket = segment.table.get(hash);
    if (bucket === undefined) return null;
    for (const e of bucket) if (Objects.equals(e.key, key)) return e;
    return null;
  }

  isExpired(entry, now) {
    return this.expireAfterAccessNanos !== null && now - entry.accessTime >= this.expireAfterAccessNanos;
  }

  // Java: LocalCache.Segment#expireEntries
  expireEntries(segment, now) {
    for (;;) {
      const head = segment.accessQueue.values().next();
      if (head.done || !this.isExpired(head.value, now)) return;
      this.removeEntry(segment, head.value);
    }
  }

  // Java: LocalCache.Segment#removeEntry
  removeEntry(segment, entry) {
    const bucket = segment.table.get(entry.hash);
    if (bucket !== undefined) {
      const i = bucket.indexOf(entry);
      if (i >= 0) bucket.splice(i, 1);
      if (bucket.length === 0) segment.table.delete(entry.hash);
    }
    segment.accessQueue.delete(entry);
    segment.totalWeight -= entry.weight;
    segment.count--;
  }

  // Java: LocalCache.Segment#postReadCleanup
  postReadCleanup(segment) {
    if ((++segment.readCount & DRAIN_THRESHOLD) === 0) {
      if (this.expireAfterAccessNanos !== null) this.expireEntries(segment, nowNanos());
    }
  }

  // Java: Cache#getIfPresent(Object)
  getIfPresent(key) {
    if (key === null || key === undefined) throw new NullPointerException();
    const hash = this.hash(key);
    const segment = this.segmentFor(hash);
    let value = null;
    try {
      if (segment.count !== 0) {
        const now = nowNanos();
        const e = this.getEntry(segment, key, hash);
        if (e !== null) {
          if (this.isExpired(e, now)) {
            this.expireEntries(segment, now);
          } else {
            e.accessTime = now;
            segment.accessQueue.delete(e);
            segment.accessQueue.add(e);
            value = e.value;
          }
        }
      }
    } finally {
      this.postReadCleanup(segment);
    }
    if (value === null) this.misses++; else this.hits++;
    return value;
  }

  // Java: Cache#put(Object,Object)
  put(key, value) {
    if (key === null || key === undefined || value === null || value === undefined) throw new NullPointerException();
    const hash = this.hash(key);
    const segment = this.segmentFor(hash);
    const now = nowNanos();
    if (this.expireAfterAccessNanos !== null) this.expireEntries(segment, now); // preWriteCleanup
    let e = this.getEntry(segment, key, hash);
    const weight = this.weigher(key, value);
    if (e !== null) {
      segment.totalWeight -= e.weight; // enqueueNotification(REPLACED)
      e.value = value;
      e.weight = weight;
      segment.totalWeight += weight;
      e.accessTime = now;
      segment.accessQueue.delete(e);
      segment.accessQueue.add(e);
    } else {
      e = { key, value, hash, weight, accessTime: now };
      let bucket = segment.table.get(hash);
      if (bucket === undefined) segment.table.set(hash, (bucket = []));
      bucket.push(e);
      segment.count++;
      segment.totalWeight += weight;
      segment.accessQueue.add(e);
    }
    this.evictEntries(segment, e);
  }

  // Java: Cache#get(Object,Callable); loader() produces the value on a miss
  get(key, loader) {
    const hash = this.hash(key);
    const segment = this.segmentFor(hash);
    let value = null;
    if (segment.count !== 0) {
      const now = nowNanos();
      const e = this.getEntry(segment, key, hash);
      if (e !== null) {
        if (this.isExpired(e, now)) {
          this.expireEntries(segment, now);
        } else {
          e.accessTime = now;
          segment.accessQueue.delete(e);
          segment.accessQueue.add(e);
          value = e.value;
        }
      }
    }
    this.postReadCleanup(segment);
    if (value !== null) {
      this.hits++;
      return value;
    }
    this.misses++;
    value = loader();
    this.put(key, value);
    return value;
  }

  // Java: LocalCache.Segment#evictEntries
  evictEntries(segment, newest) {
    if (!this.evictsBySize()) return;
    if (newest.weight > segment.maxSegmentWeight) this.removeEntry(segment, newest);
    while (segment.totalWeight > segment.maxSegmentWeight) {
      let next = null;
      for (const e of segment.accessQueue) {
        if (e.weight > 0) { next = e; break; }
      }
      if (next === null) throw new Error('AssertionError');
      this.removeEntry(segment, next);
    }
  }

  // Java: Cache#size()
  size() {
    let n = 0;
    for (const s of this.segments) n += s.count;
    return n;
  }

  // Java: Cache#stats()
  stats() {
    return new CacheStats(this.hits, this.misses);
  }
}
