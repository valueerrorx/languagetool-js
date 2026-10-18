// org.languagetool.chunking.ChunkTaggedToken
import { Objects } from '../../lib/java/Objects.js';

// Java: ChunkTaggedToken
export class ChunkTaggedToken {
  static FQCN = 'org.languagetool.chunking.ChunkTaggedToken';

  // Java: ChunkTaggedToken#ChunkTaggedToken(String,List,AnalyzedTokenReadings)
  constructor(token, chunkTags, readings) {
    this.token = Objects.requireNonNull(token);
    this.chunkTags = Objects.requireNonNull(chunkTags);
    this.readings = readings;
  }

  // Java: ChunkTaggedToken#getToken()
  getToken() {
    return this.token;
  }

  // Java: ChunkTaggedToken#getChunkTags()
  getChunkTags() {
    return this.chunkTags;
  }

  // Java: ChunkTaggedToken#getReadings()
  getReadings() {
    return this.readings;
  }

  // Java: ChunkTaggedToken#toString()
  toString() {
    return this.token + '/' + this.chunkTags.map((t) => t.toString()).join(',');
  }
}
