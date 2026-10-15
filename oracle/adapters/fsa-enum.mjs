// JS twin of harness op "fsa-enum" (FsaOps#enumerate).
import { createHash } from 'node:crypto';
import { ByteSequenceIterator } from '../../src/lib/fsa/FSA.js';
import { DictionaryLookup } from '../../src/lib/fsa/DictionaryLookup.js';
import { err, open } from './fsa-common.mjs';

const hex = (b, len) => Buffer.from(b.buffer, b.byteOffset, len).toString('hex');

// Java: FsaOps#enumerate(JsonNode)
export function run(a) {
  const d = open(a);
  const mode = a.mode ?? 'fsa';
  const md = createHash('sha256');
  let count = 0;
  let maxLen = 0;
  const first = [];
  const last = [];
  let error = null;
  try {
    if (mode === 'fsa') {
      const root = d.fsa.getRootNode();
      const it = root === 0 ? null : new ByteSequenceIterator(d.fsa, root);
      const cs = d.metadata.charset;
      const lenBytes = Buffer.alloc(4);
      while (it !== null && it.hasNext()) {
        const n = it.next();
        const b = it.buffer;
        lenBytes.writeInt32BE(n);
        md.update(lenBytes);
        md.update(b.subarray(0, n));
        count++;
        if (n > maxLen) maxLen = n;
        const e = { hex: hex(b, n), text: cs.decodeLenient(b, 0, n) };
        if (first.length < 100) first.push(e);
        last.push(e);
        if (last.length > 100) last.shift();
      }
    } else {
      for (const wd of new DictionaryLookup(d)) {
        const w = wd.getWord();
        const st = wd.getStem();
        const tg = wd.getTag();
        const line = `${w === null ? '\u0000null' : w}\t${st === null ? '\u0000null' : st}\t${tg === null ? '\u0000null' : tg}\n`;
        md.update(Buffer.from(line, 'utf8'));
        count++;
        const e = [w, st, tg];
        if (first.length < 100) first.push(e);
        last.push(e);
        if (last.length > 100) last.shift();
      }
    }
  } catch (t) {
    error = err(t);
  }
  return { dict: a.dict, mode, count, maxLength: maxLen, sha256: md.digest('hex'), error, first100: first, last100: last };
}
