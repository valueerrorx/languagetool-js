// org.languagetool.chunking.EnglishChunker (OpenNLP tokenizer, POS tagger and chunker mapped to LT tokens)
import { RuntimeException } from '../../../lib/java/errors.js';
import { javaSplit, javaTrim } from '../../../lib/java/strings.js';
import { isSpaceChar } from '../../../lib/java/Character.js';
import { registerComponent } from '../../../core/language/components.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../core/chunking/ChunkTaggedToken.js';
import { loadModels } from '../../../lib/opennlp/Models.js';
import { TokenizerME } from '../../../lib/opennlp/TokenizerME.js';
import { POSTaggerME } from '../../../lib/opennlp/POSTaggerME.js';
import { ChunkerME } from '../../../lib/opennlp/ChunkerME.js';
import { EnglishChunkFilter } from './EnglishChunkFilter.js';

// Java: EnglishChunker
export class EnglishChunker {
  static FQCN = 'org.languagetool.chunking.EnglishChunker';

  // Java: EnglishChunker#EnglishChunker() (models are static, loaded once)
  constructor() {
    try {
      this.models = loadModels();
      this.chunkFilter = new EnglishChunkFilter();
    } catch (e) {
      if (e.notPorted === true) throw e;
      throw new RuntimeException('Could not initialize English chunker', e);
    }
  }

  // Java: EnglishChunker#addChunkTags(List)
  addChunkTags(tokenReadings) {
    const origChunkTags = this.getChunkTagsForReadings(tokenReadings);
    const chunkTags = this.chunkFilter.filter(origChunkTags);
    this.assignChunksToReadings(chunkTags);
  }

  // Java: EnglishChunker#getChunkTagsForReadings(List)
  getChunkTagsForReadings(tokenReadings) {
    const sentence = this.getSentence(tokenReadings);
    const tokens = this.cleanZeroWidthWhitespaces(this.tokenize(sentence));
    const posTags = this.posTag(tokens);
    const chunkTags = this.chunk(tokens, posTags);
    if (tokens.length !== posTags.length || tokens.length !== chunkTags.length) {
      throw new RuntimeException(`Length of results must be the same: ${tokens.length}, ${posTags.length}, ${chunkTags.length}`);
    }
    return this.getTokensWithTokenReadings(tokenReadings, tokens, chunkTags);
  }

  // Java: EnglishChunker#cleanZeroWidthWhitespaces(String[])
  cleanZeroWidthWhitespaces(tokens) {
    const cleanTokens = [];
    for (const token of tokens) {
      const splits = javaSplit(token, '﻿');
      for (const split of splits) {
        if (split.length === 0) {
          cleanTokens.push('');
        } else {
          cleanTokens.push(token);
        }
      }
    }
    return cleanTokens;
  }

  // Java: EnglishChunker#tokenize(String)
  tokenize(sentence) {
    const tokenizer = new TokenizerME(this.models.tm);
    const cleanString = sentence.replaceAll('’', "'");
    return tokenizer.tokenize(cleanString);
  }

  // Java: EnglishChunker#posTag(String[])
  posTag(tokens) {
    return new POSTaggerME(this.models.pm).tag(tokens);
  }

  // Java: EnglishChunker#chunk(String[],String[])
  chunk(tokens, posTags) {
    return new ChunkerME(this.models.cm).chunk(tokens, posTags);
  }

  // Java: EnglishChunker#getTokensWithTokenReadings(List,String[],String[])
  getTokensWithTokenReadings(tokenReadings, tokens, chunkTags) {
    const result = [];
    let i = 0;
    let pos = 0;
    for (const chunkTag of chunkTags) {
      const startPos = pos;
      const endPos = startPos + tokens[i].length;
      const readings = this.getAnalyzedTokenReadingsFor(startPos, endPos, tokenReadings);
      result.push(new ChunkTaggedToken(tokens[i], [new ChunkTag(chunkTag)], readings));
      pos = endPos;
      i++;
    }
    return result;
  }

  // Java: EnglishChunker#assignChunksToReadings(List)
  assignChunksToReadings(chunkTaggedTokens) {
    for (const taggedToken of chunkTaggedTokens) {
      const readings = taggedToken.getReadings();
      if (readings !== null && readings !== undefined) {
        readings.setChunkTags(taggedToken.getChunkTags());
      }
    }
  }

  // Java: EnglishChunker#getSentence(List)
  getSentence(sentenceTokens) {
    let sb = '';
    for (const token of sentenceTokens) {
      sb += token.getToken();
    }
    return sb;
  }

  // Java: EnglishChunker#getAnalyzedTokenReadingsFor(int,int,List)
  getAnalyzedTokenReadingsFor(startPos, endPos, tokenReadings) {
    let pos = 0;
    for (const tokenReading of tokenReadings) {
      const token = tokenReading.getToken();
      if (javaTrim(token).length === 0 || (token.length === 1 && isSpaceChar(token.charCodeAt(0)))) {
        continue;
      }
      const tokenStart = pos;
      const tokenEnd = pos + token.length;
      if (tokenStart === startPos && tokenEnd === endPos) {
        return tokenReading;
      }
      pos = tokenEnd;
    }
    return null;
  }
}

registerComponent(EnglishChunker.FQCN, () => new EnglishChunker());
