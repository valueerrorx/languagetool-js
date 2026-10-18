// JS twin of harness op "chunk-run" (ChunkOps#run): MultiWordChunker/MultiWordChunker2 chains on raw tagger sentences.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Tally } from './_partial.mjs';
import { lang, fresh, err, dumpSentence, canon, sha1 } from './_disamb-common.mjs';
import { notPortedYet } from '../../src/core/language/components.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { ChunkTag } from '../../src/core/chunking/ChunkTag.js';

const DIR = path.resolve(import.meta.dirname, '../../src/core/tagging/disambiguation');
let MODS = null;
async function mods() {
  if (MODS === null) {
    const f1 = path.join(DIR, 'MultiWordChunker.js');
    const f2 = path.join(DIR, 'MultiWordChunker2.js');
    if (!existsSync(f1) || !existsSync(f2)) throw notPortedYet('MultiWordChunker/MultiWordChunker2');
    MODS = { c1: (await import(pathToFileURL(f1).href)).MultiWordChunker, c2: (await import(pathToFileURL(f2).href)).MultiWordChunker2 };
  }
  return MODS;
}

// Java: ChunkOps.Chunker2X
function chunker2x(C2) {
  return class Chunker2X extends C2 {
    formatPosTag(posTag, position, multiwordLength) { return `${posTag}#${position}/${multiwordLength}`; }
    matches(matchText, inputTokens) { return matchText.toLowerCase() === inputTokens.getToken().toLowerCase(); }
  };
}

// Java: ChunkOps#build(JsonNode)
async function build(s) {
  const { c1, c2 } = await mods();
  const b = (k) => s[k] === true;
  if (s.kind === 'mwc') {
    let c;
    if (s.tag !== undefined) {
      const tag = s.tag === 'NONE' ? c1.tagForNotAddingTags : s.tag;
      c = c1.getInstance(s.file, b('fc'), b('au'), b('tc'), tag);
    } else if (s.fc !== undefined || s.au !== undefined || s.tc !== undefined) c = c1.getInstance(s.file, b('fc'), b('au'), b('tc'));
    else c = c1.getInstance(s.file);
    c.setIgnoreSpelling(b('ignoreSpelling'));
    c.setRemovePreviousTags(b('removePrev'));
    return c;
  }
  let c;
  if (s.kind === 'mwc2x') { const K = chunker2x(c2); c = new K(s.file, b('fc')); } else if (s.fc !== undefined) c = new c2(s.file, b('fc'));
  else c = new c2(s.file);
  if (s.removeOther !== undefined) c.setRemoveOtherReadings(b('removeOther'));
  if (s.wrap !== undefined) c.setWrapTag(b('wrap'));
  return c;
}

// Java: ChunkOps#text(Language,JsonNode)
function text(l, code, tn) {
  if (tn !== null && typeof tn === 'object' && tn.text !== undefined) {
    const s = fresh(l, code, tn.text);
    const t = s.getTokens();
    for (const [k, v] of Object.entries(tn.tags)) t[Number(k)].setChunkTags(v.map((c) => new ChunkTag(c, c.startsWith('~'))));
    return s;
  }
  return fresh(l, code, tn);
}

// Java: ChunkOps#run(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const broker = getDataBroker();
  const files = new Map(Object.entries(a.files ?? {}));
  const orig = broker.getFromResourceDirAsStream.bind(broker);
  broker.getFromResourceDirAsStream = (p) => (files.has(p) ? Buffer.from(files.get(p), 'utf8') : orig(p));
  try {
    const jobs = [];
    const T = new Tally();
    for (const job of a.jobs) {
      const per = [];
      for (const ti of job.texts) {
        try {
          const raw = text(l, a.lang, a.texts[ti]);
          const pre = AnalyzedSentence.copyReadings(raw.getTokens());
          let cur = raw;
          for (const spec of job.chain) cur = (await build(spec)).disambiguate(cur, null);
          const res = new AnalyzedSentence(cur.getTokens(), pre);
          const ds = dumpSentence(res);
          const o = {};
          if (job.digest === true) {
            o.n = res.getTokensWithoutWhitespace().length;
            o.ch = ds.p !== null;
            o.dg2 = sha1(canon(ds));
          } else o.s = ds;
          per.push(T.ok(o));
        } catch (t) { per.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
      }
      jobs.push(per);
    }
    return T.finish({ jobs });
  } finally { delete broker.getFromResourceDirAsStream; }
}
