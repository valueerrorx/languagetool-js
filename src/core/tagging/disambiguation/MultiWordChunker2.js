// org.languagetool.tagging.disambiguation.MultiWordChunker2 (multiword tagger-chunker, first matching entry wins)
import { AbstractDisambiguator } from './AbstractDisambiguator.js';
import { AnalyzedToken } from '../../AnalyzedToken.js';
import { AnalyzedSentence } from '../../AnalyzedSentence.js';
import { AnalyzedTokenReadings } from '../../AnalyzedTokenReadings.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { isCapitalizedWord, lowercaseFirstChar } from '../../text/StringTools.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { decodeUtf8, readerLines } from '../../../lib/java/io.js';
import { javaSplit, javaTrim } from '../../../lib/java/strings.js';

const WRAP_TAG = '<%s>';

// Java: MultiWordChunker2.MultiWordEntry
class MultiWordEntry {
  // Java: MultiWordEntry#MultiWordEntry(List,String)
  constructor(tokens, tag) {
    this.tokens = tokens;
    this.tag = tag;
  }

  // Java: MultiWordEntry#getLemma()
  getLemma() {
    return this.tokens.join(' ');
  }

  // Java: MultiWordEntry#toString()
  toString() {
    return `MultiWordEntry [tokens=[${this.tokens.join(', ')}], tag=${this.tag}]`;
  }
}

// Java: MultiWordChunker2
export class MultiWordChunker2 extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.MultiWordChunker2';

  // Java: MultiWordChunker2#MultiWordChunker2(String) / MultiWordChunker2(String,boolean)
  constructor(filename, allowFirstCapitalized = false) {
    super();
    this.filename = filename;
    this.allowFirstCapitalized = allowFirstCapitalized;
    this.removeOtherReadings = false;
    this.tagFormat = WRAP_TAG;
    this.tokenToPosTagMap = null;
  }

  // Java: MultiWordChunker2#setRemoveOtherReadings(boolean)
  setRemoveOtherReadings(removeOtherReadings) {
    this.removeOtherReadings = removeOtherReadings;
  }

  // Java: MultiWordChunker2#setWrapTag(boolean)
  setWrapTag(wrapTag) {
    this.tagFormat = wrapTag ? WRAP_TAG : null;
  }

  // Java: MultiWordChunker2#formatPosTag(String,int,int)
  formatPosTag(posTag, position, multiwordLength) {
    return this.tagFormat !== null ? `<${posTag}>` : posTag; // String.format("<%s>", posTag)
  }

  // Java: MultiWordChunker2#lazyInit()
  lazyInit() {
    if (this.tokenToPosTagMap !== null) {
      return;
    }
    const map = new Map();
    const stream = getDataBroker().getFromResourceDirAsStream(this.filename);
    const posTokens = this.loadWords(stream);
    for (const posToken of posTokens) {
      const tokenAndTag = javaSplit(posToken, '\t');
      if (tokenAndTag.length !== 2) {
        throw new RuntimeException(`Invalid format in ${this.filename}: '${posToken}', expected two tab-separated parts`);
      }
      const tokens = javaSplit(tokenAndTag[0], ' ');
      const posTag = tokenAndTag[1];
      let multiwordItems;
      if (map.has(tokens[0])) {
        multiwordItems = map.get(tokens[0]);
      } else {
        multiwordItems = [];
        map.set(tokens[0], multiwordItems);
      }
      multiwordItems.push(new MultiWordEntry(tokens.slice(), posTag));
    }
    this.tokenToPosTagMap = map;
  }

  // Java: MultiWordChunker2#disambiguate(AnalyzedSentence)
  disambiguate(input) {
    this.lazyInit();
    const inputTokens = input.getTokens();
    const outputTokens = inputTokens;
    for (let i = 1; i < inputTokens.length; i++) {
      const analyzedToken = inputTokens[i];
      const firstToken = analyzedToken.getToken();
      let multiwordItems = this.tokenToPosTagMap.get(firstToken) ?? null;
      if (multiwordItems === null) {
        if (this.allowFirstCapitalized && isCapitalizedWord(firstToken)) {
          multiwordItems = this.tokenToPosTagMap.get(lowercaseFirstChar(firstToken)) ?? null;
        }
        if (multiwordItems === null) continue;
      }
      const multiwordEntry = this.findMultiwordEntry(inputTokens, i, multiwordItems);
      if (multiwordEntry === null) continue;
      for (let multiwordPos = 0, inputTokenPos = i; multiwordPos < multiwordEntry.tokens.length; inputTokenPos++) {
        const currentToken = inputTokens[inputTokenPos];
        if (currentToken.isWhitespace()) {
          continue;
        }
        const multiwordTag = this.formatPosTag(multiwordEntry.tag, multiwordPos, multiwordEntry.tokens.length);
        outputTokens[inputTokenPos] = this.prepareNewReading(multiwordEntry.getLemma(), currentToken.getToken(), currentToken, multiwordTag);
        ++multiwordPos;
      }
    }
    return new AnalyzedSentence(outputTokens);
  }

  // Java: MultiWordChunker2#findMultiwordEntry(AnalyzedTokenReadings[],int,List)
  findMultiwordEntry(inputTokens, startingPosition, multiwordItems) {
    for (const multiWordEntry of multiwordItems) {
      if (this.isMatching(inputTokens, startingPosition, multiWordEntry)) return multiWordEntry;
    }
    return null;
  }

  // Java: MultiWordChunker2#isMatching(AnalyzedTokenReadings[],int,MultiWordEntry)
  isMatching(inputTokens, startingPosition, multiWordEntry) {
    let j = 1; // we already matched the first token from multiword
    for (let i = 1; j < multiWordEntry.tokens.length && startingPosition + i < inputTokens.length; i++) {
      if (inputTokens[startingPosition + i].isWhitespace()) {
        continue;
      }
      if (!this.matches(multiWordEntry.tokens[j], inputTokens[startingPosition + i])) return false;
      ++j;
    }
    return j === multiWordEntry.tokens.length;
  }

  // Java: MultiWordChunker2#matches(String,AnalyzedTokenReadings)
  matches(matchText, inputTokens) {
    return matchText === inputTokens.getToken();
  }

  // Java: MultiWordChunker2#prepareNewReading(String,String,AnalyzedTokenReadings,String)
  prepareNewReading(tokens, tok, token, tag) {
    const tokenStart = new AnalyzedToken(tok, tag, tokens);
    return this.setAndAnnotate(token, tokenStart);
  }

  // Java: MultiWordChunker2#setAndAnnotate(AnalyzedTokenReadings,AnalyzedToken)
  setAndAnnotate(oldReading, newReading) {
    const newAnalyzedTokenList = [];
    if (!this.removeOtherReadings) {
      newAnalyzedTokenList.push(...oldReading.getReadings());
    }
    newAnalyzedTokenList.push(newReading);
    return new AnalyzedTokenReadings(oldReading, newAnalyzedTokenList, 'MULTIWORD_CHUNKER');
  }

  // Java: MultiWordChunker2#loadWords(InputStream)
  loadWords(stream) {
    const lines = [];
    for (let line of readerLines(decodeUtf8(stream))) {
      line = javaTrim(line);
      if (line.length === 0 || line.charAt(0) === '#') { // ignore comments
        continue;
      }
      lines.push(line);
    }
    return lines;
  }
}
