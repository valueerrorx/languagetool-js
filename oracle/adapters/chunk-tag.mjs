// JS twin of harness op "chunk-tag" (ChunkOps#chunkTag): ChunkTag construction, accessors, equals/matches.
import { ChunkTag } from '../../src/core/chunking/ChunkTag.js';
import { err } from './_disamb-common.mjs';

// Java: ChunkOps#chunkTag(JsonNode)
export function run(a) {
  const objs = [];
  const items = [];
  for (const it of a.items) {
    try {
      const c = it.re !== undefined ? new ChunkTag(it.tag, it.re) : new ChunkTag(it.tag);
      objs.push(c);
      items.push({ tag: c.getChunkTag(), re: c.isRegexp(), str: c.toString(), hash: c.hashCode() });
    } catch (t) {
      objs.push(null);
      items.push(err(t));
    }
  }
  const pairs = a.pairs.map(([i, j]) => {
    const x = objs[i];
    const y = objs[j];
    const o = {};
    try {
      if (x === null) { const e = new TypeError('null'); e.javaClass = 'java.lang.NullPointerException'; throw e; }
      o.eq = x.equals(y);
      o.eqNull = x.equals(null);
      o.eqStr = x.equals(x.getChunkTag());
      o.m = x.matches(y);
    } catch (t) { o.error = err(t).error; }
    return o;
  });
  return { items, pairs };
}
