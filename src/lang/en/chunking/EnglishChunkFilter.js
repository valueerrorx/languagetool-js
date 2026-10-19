// org.languagetool.chunking.EnglishChunkFilter (adds singular/plural to OpenNLP noun phrase chunks)
import { IllegalStateException } from '../../../lib/java/errors.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../core/chunking/ChunkTaggedToken.js';

const BEGIN_NOUN_PHRASE_TAG = new ChunkTag('B-NP');
const IN_NOUN_PHRASE_TAG = new ChunkTag('I-NP');

const ChunkType = Object.freeze({ SINGULAR: 'SINGULAR', PLURAL: 'PLURAL' });

// Java: EnglishChunkFilter
export class EnglishChunkFilter {
  static FQCN = 'org.languagetool.chunking.EnglishChunkFilter';

  // Java: EnglishChunkFilter#filter(List)
  filter(tokens) {
    const result = [];
    let newChunkTag = null;
    let i = 0;
    for (const taggedToken of tokens) {
      const chunkTags = [];
      if (this.isBeginningOfNounPhrase(taggedToken)) {
        const chunkType = this.getChunkType(tokens, i);
        if (chunkType === ChunkType.SINGULAR || this.endOfNounPhraseIsSingular(tokens, i)) {
          chunkTags.push(new ChunkTag('B-NP-singular'));
          newChunkTag = 'NP-singular';
        } else if (chunkType === ChunkType.PLURAL) {
          chunkTags.push(new ChunkTag('B-NP-plural'));
          newChunkTag = 'NP-plural';
        } else {
          throw new IllegalStateException(`Unknown chunk type: ${chunkType}`);
        }
      }
      if (newChunkTag !== null && this.isEndOfNounPhrase(tokens, i)) {
        chunkTags.push(new ChunkTag(`E-${newChunkTag}`));
        newChunkTag = null;
      }
      if (newChunkTag !== null && this.isContinuationOfNounPhrase(taggedToken)) {
        chunkTags.push(new ChunkTag(`I-${newChunkTag}`));
      }
      if (chunkTags.length > 0) {
        result.push(new ChunkTaggedToken(taggedToken.getToken(), chunkTags, taggedToken.getReadings()));
      } else {
        result.push(taggedToken);
      }
      i++;
    }
    return result;
  }

  // Java: EnglishChunkFilter#endOfNounPhraseIsSingular(List,int)
  endOfNounPhraseIsSingular(tokens, i) {
    for (let j = i; j < tokens.length; j++) {
      if (this.isEndOfNounPhrase(tokens, j)) {
        return this.getChunkType(tokens, j) === ChunkType.SINGULAR;
      }
    }
    return false;
  }

  // Java: EnglishChunkFilter#isBeginningOfNounPhrase(ChunkTaggedToken)
  isBeginningOfNounPhrase(taggedToken) {
    return taggedToken.getChunkTags().some((t) => t.equals(BEGIN_NOUN_PHRASE_TAG));
  }

  // Java: EnglishChunkFilter#isEndOfNounPhrase(List,int)
  isEndOfNounPhrase(tokens, i) {
    if (i > tokens.length - 2) {
      return true;
    }
    if (!this.isContinuationOfNounPhrase(tokens[i + 1])) {
      return true;
    }
    return false;
  }

  // Java: EnglishChunkFilter#isContinuationOfNounPhrase(ChunkTaggedToken)
  isContinuationOfNounPhrase(taggedToken) {
    return taggedToken.getChunkTags().some((t) => t.equals(IN_NOUN_PHRASE_TAG));
  }

  // Java: EnglishChunkFilter#getChunkType(List,int)
  getChunkType(tokens, chunkStartPos) {
    let isPlural = false;
    for (let i = chunkStartPos; i < tokens.length; i++) {
      const token = tokens[i];
      if (!this.isBeginningOfNounPhrase(token) && !this.isContinuationOfNounPhrase(token)) {
        break;
      }
      if (this.hasNounWithPluralReading(token)) {
        isPlural = true;
      }
    }
    return isPlural ? ChunkType.PLURAL : ChunkType.SINGULAR;
  }

  // Java: EnglishChunkFilter#hasNounWithPluralReading(ChunkTaggedToken)
  hasNounWithPluralReading(token) {
    if (token.getReadings() !== null && token.getReadings() !== undefined) {
      for (const analyzedToken of token.getReadings().getReadings()) {
        if (analyzedToken.getPOSTag() === 'NNS') {
          return true;
        }
      }
    }
    return false;
  }
}
