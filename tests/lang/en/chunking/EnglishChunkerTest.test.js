// Ported from EnglishChunkerTest (languagetool-language-modules/en)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { javaReplaceAll, javaTrim } from '../../../../src/lib/java/strings.js';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../../src/core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../../src/core/chunking/ChunkTag.js';
import { English } from '../../../../src/lang/en/language/English.js';
import { newLt } from '../../../support/ruleTestSupport.js'; // new JLanguageTool(English) without built-in rules (F50), analysis is unaffected
import { EnglishChunker } from '../../../../src/lang/en/chunking/EnglishChunker.js';

// Java: List#toString() of objects with toString()
const ls = (l) => `[${l.map((x) => x.toString()).join(', ')}]`;

// Java: EnglishChunkerTest#createReadingsList(String) (StringTokenizer with " " delimiters returned)
function createReadingsList(sentence) {
  const result = [];
  let pos = 0;
  for (const token of sentence.match(/ |[^ ]+/g) ?? []) {
    if (javaTrim(token).length === 0) {
      result.push(new AnalyzedTokenReadings(new AnalyzedToken(token, null, null), pos));
    } else {
      result.push(new AnalyzedTokenReadings(new AnalyzedToken(token, 'fake', 'fake'), pos));
    }
    pos += token.length;
  }
  return result;
}

// Java: EnglishChunkerTest#getChunksAsString(String,EnglishChunker,JLanguageTool)
function getChunksAsString(input, chunker, lt) {
  const l = [...lt.getAnalyzedSentence(input).getTokens()];
  chunker.addChunkTags(l);
  return l.map((k) => ls(k.getChunkTags()));
}

// Java: EnglishChunkerTest#getPosTagsAsString(String,JLanguageTool)
function getPosTagsAsString(input, lt) {
  return [...lt.getAnalyzedSentence(input).getTokens()].map((k) => ls(k.getReadings()));
}

describe('EnglishChunkerTest', () => {
  // Java: EnglishChunkerTest#testAddChunkTags()
  it('testAddChunkTags', () => {
    const chunker = new EnglishChunker();
    const readingsList = createReadingsList('A short test of the bicycle is needed');
    chunker.addChunkTags(readingsList);
    expect(readingsList.length).toBe(15);
    expect(ls(readingsList[0].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(readingsList[2].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(readingsList[4].getChunkTags())).toBe('[E-NP-singular]');
    expect(ls(readingsList[8].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(readingsList[10].getChunkTags())).toBe('[E-NP-singular]');
    expect(ls(readingsList[12].getChunkTags())).toBe('[B-VP]');
    expect(ls(readingsList[14].getChunkTags())).toBe('[I-VP]');
  });

  // Java: EnglishChunkerTest#testInteractive() / testInteractive2() (@Ignore "interactive use only")
  it.skip('testInteractive', () => {});
  it.skip('testInteractive2', () => {});

  // Java: EnglishChunkerTest#testSingularNounAtEndOfNounPhrase()
  it('testSingularNounAtEndOfNounPhrase', () => {
    const lt = newLt(new English());
    const res1 = [...lt.analyzeText('The aircraft manager is here.')[0].getTokens()];
    expect(ls(res1[1].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(res1[3].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(res1[5].getChunkTags())).toBe('[E-NP-singular]');

    const res2 = [...lt.analyzeText('The aircraft maintenance manager is here.')[0].getTokens()];
    expect(ls(res2[1].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(res2[3].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(res2[5].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(res2[7].getChunkTags())).toBe('[E-NP-singular]');

    const res3 = [...lt.analyzeText('Does your box converter operate correctly?')[0].getTokens()];
    expect(ls(res3[3].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(res3[5].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(res3[7].getChunkTags())).toBe('[E-NP-singular]');

    const res5 = [...lt.analyzeText('I’d like a fish pie.')[0].getTokens()];
    expect(ls(res5[6].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(res5[8].getChunkTags())).toBe('[I-NP-singular]');
    expect(ls(res5[10].getChunkTags())).toBe('[E-NP-singular]');
  });

  // Java: EnglishChunkerTest#testAddChunkTagsSingular()
  it('testAddChunkTagsSingular', () => {
    const chunker = new EnglishChunker();
    const lt = newLt(new English());
    const readingsList = [...lt.analyzeText('The abacus shows how numbers can be stored')[0].getTokens()];
    chunker.addChunkTags(readingsList);
    expect(ls(readingsList[1].getChunkTags())).toBe('[B-NP-singular]');
    expect(ls(readingsList[3].getChunkTags())).toBe('[E-NP-singular]');
    expect(ls(readingsList[9].getChunkTags())).toBe('[B-NP-plural, E-NP-plural]');
  });

  // Java: EnglishChunkerTest#testContractions()
  it('testContractions', () => {
    const lt = newLt(new English());
    const tokens = lt.getAnalyzedSentence("I'll be there").getTokens();
    expect(tokens[1].getChunkTags()[0].equals(new ChunkTag('B-NP-singular'))).toBe(true);
    expect(tokens[2].getChunkTags()[0].equals(new ChunkTag('B-VP'))).toBe(true);
    expect(tokens[4].getChunkTags()[0].equals(new ChunkTag('I-VP'))).toBe(true);
    expect(tokens[6].getChunkTags()[0].equals(new ChunkTag('I-VP'))).toBe(true);
  });

  // Java: EnglishChunkerTest#testTokenize()
  it('testTokenize', () => {
    const chunker = new EnglishChunker();
    const expected = "[I, 'm, going, to, London]";
    expect(`[${chunker.tokenize("I'm going to London").join(', ')}]`).toBe(expected);
    expect(`[${chunker.tokenize('I’m going to London').join(', ')}]`).toBe(expected);
  });

  // Java: EnglishChunkerTest#testNonBreakingSpace()
  it('testNonBreakingSpace', () => {
    const expectedTags = '[[/SENT_START], [away/JJ, away/NN, away/RB, away/RP, away/UH], [from/IN, from/RP], ' +
      '[home/NN:UN], [often/RB], [?/SENT_END, ?/PCT]]';
    const expectedChunks = '[[], [B-ADVP], [], [B-PP], [], [B-NP-singular, E-NP-singular], [], [B-ADVP], [O]]';
    const chunker = new EnglishChunker();
    const lt = newLt(new English());
    const strip = (s) => javaReplaceAll(s, '\\[./null\\], ', '');
    const input1 = 'Away from home often?';
    expect(strip(`[${getPosTagsAsString(input1, lt).join(', ')}]`)).toBe(expectedTags);
    expect(`[${getChunksAsString(input1, chunker, lt).join(', ')}]`).toBe(expectedChunks);
    const input2 = 'Away from home often?';
    expect(strip(`[${getPosTagsAsString(input2, lt).join(', ')}]`)).toBe(expectedTags);
    expect(`[${getChunksAsString(input2, chunker, lt).join(', ')}]`).toBe(expectedChunks);
  });

  // Java: EnglishChunkerTest#testZeroWidthNoBreakSpace() (@Ignore "active when #2119 is fixed")
  it.skip('testZeroWidthNoBreakSpace', () => {});
});
