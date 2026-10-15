// org.languagetool.chunking.ChunkTag
import { Pattern } from '../../lib/java/regex/index.js';
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { javaTrim, stringHashCode as stringHash } from '../../lib/java/strings.js';

export class ChunkTag {
  static FQCN = 'org.languagetool.chunking.ChunkTag';

  // Java: ChunkTag#ChunkTag(String) / ChunkTag(String,boolean)
  constructor(chunkTag, isRegexp = false) {
    if (chunkTag === null || chunkTag === undefined || javaTrim(chunkTag).length === 0) {
      throw new IllegalArgumentException(`chunkTag cannot be null or empty: '${chunkTag ?? null}'`);
    }
    this.chunkTag = chunkTag;
    this.isRegexpFlag = isRegexp;
    this.pattern = isRegexp ? Pattern.compile(chunkTag) : null;
  }

  // Java: ChunkTag#getChunkTag()
  getChunkTag() {
    return this.chunkTag;
  }

  // Java: ChunkTag#isRegexp()
  isRegexp() {
    return this.isRegexpFlag;
  }

  // Java: ChunkTag#matches(ChunkTag)
  matches(tag) {
    return this.pattern !== null ? this.pattern.matcher(tag.getChunkTag()).matches() : this.chunkTag === tag.getChunkTag();
  }

  // Java: ChunkTag#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || o.constructor !== this.constructor) return false;
    return this.chunkTag === o.chunkTag;
  }

  // Java: ChunkTag#hashCode()
  hashCode() {
    return stringHash(this.chunkTag);
  }

  // Java: ChunkTag#toString()
  toString() {
    return this.chunkTag + (this.isRegexpFlag ? '[regex]' : '');
  }
}
