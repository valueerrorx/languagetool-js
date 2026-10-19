// Ported from TestTools (languagetool-core test) - tagger helpers only.
import { expect } from 'vitest';
import { DictionaryLookup } from '../../src/lib/fsa/DictionaryLookup.js';
import { Dictionary } from '../../src/lib/fsa/DictionaryLookup.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { SENTENCE_START_TAGNAME } from '../../src/core/JLanguageToolConstants.js';

// Java: TestTools#isWord(String)
export function isWord(token) {
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (/^\p{L}$/u.test(c) || /^\p{Nd}$/u.test(c)) return true;
  }
  return false;
}

// Java: TestTools#getNoWhitespaceTokens(List)
function getNoWhitespaceTokens(tokens) {
  return tokens.filter((t) => isWord(t));
}

// Java: TestTools#getAsString(AnalyzedToken)
function getAsString(t) {
  return `${t.getToken()}/[${t.getLemma()}]${t.getPOSTag()}`;
}

// Java: TestTools#getAsStrings(AnalyzedTokenReadings)
function getAsStrings(tokenReadings) {
  const readings = [];
  for (const t of tokenReadings) readings.push(getAsString(t));
  // Collections.sort on Strings: UTF-16 code unit order
  readings.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return readings;
}

// Java: TestTools#myAssert(String,String,Tokenizer,Tagger)
export function myAssert(input, expected, tokenizer, tagger) {
  const tokens = tokenizer.tokenize(input);
  const output = tagger.tag(getNoWhitespaceTokens(tokens));
  expect(output.map((tr) => getAsStrings(tr).join('|')).join(' -- ')).toBe(expected);
}

// Java: TestTools#testDictionary(BaseTagger,Language)
export function testDictionary(tagger) {
  const dictionary = Dictionary.read(getDataBroker().getFromResourceDirAsUrl(tagger.getDictionaryPath()));
  const lookup = new DictionaryLookup(dictionary);
  let missing = 0;
  for (const wordData of lookup) {
    if (wordData.getTag() === null || wordData.getTag().length === 0) missing++;
  }
  return missing;
}

// Java: TestTools#myAssert(String,String,Tokenizer,SentenceTokenizer,Tagger,Disambiguator)
export function myAssertDisambiguated(input, expected, tokenizer, sentenceTokenizer, tagger, disambiguator) {
  let outputStr = '';
  for (const sentence of sentenceTokenizer.tokenize(input)) {
    const tokens = tokenizer.tokenize(sentence);
    const aTokens = tagger.tag(getNoWhitespaceTokens(tokens));
    const tokenArray = [new AnalyzedTokenReadings([new AnalyzedToken('', SENTENCE_START_TAGNAME, null)], 0)];
    let startPos = 0;
    let noWhitespaceCount = 0;
    for (const tokenStr of tokens) {
      let posTag;
      if (isWord(tokenStr)) {
        posTag = aTokens[noWhitespaceCount];
        posTag.setStartPos(startPos);
        noWhitespaceCount++;
      } else {
        posTag = tagger.createNullToken(tokenStr, startPos);
      }
      tokenArray.push(posTag);
      startPos += tokenStr.length;
    }
    const output = disambiguator.disambiguate(new AnalyzedSentence(tokenArray)).getTokens();
    for (let i = 0; i < output.length; i++) {
      outputStr += getAsStrings(output[i]).join('|');
      if (i < output.length - 1) outputStr += ' ';
    }
  }
  expect(outputStr).toBe(expected);
}
