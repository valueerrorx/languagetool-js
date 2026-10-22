// Ported from PolishWordTokenizerTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { PolishWordTokenizer } from '../../../src/lang/pl/tokenizers/PolishWordTokenizer.js';

const str = (l) => `[${l.join(', ')}]`;

describe('PolishWordTokenizerTest', () => {
  // Java: PolishWordTokenizerTest#testTokenize
  it('testTokenize', () => {
    const wordTokenizer = new PolishWordTokenizer();
    const tokens = wordTokenizer.tokenize('To jest\u00A0 test');
    expect(tokens.length).toBe(6);
    expect(str(tokens)).toBe('[To,  , jest, \u00A0,  , test]');
    const tokens2 = wordTokenizer.tokenize('To\rłamie');
    expect(tokens2.length).toBe(3);
    expect(str(tokens2)).toBe('[To, \r, łamie]');
    // hyphen with no whitespace
    const tokens3 = wordTokenizer.tokenize('A to jest-naprawdę-test!');
    expect(tokens3.length).toBe(6);
    expect(str(tokens3)).toBe('[A,  , to,  , jest-naprawdę-test, !]');
    // hyphen at the end of the word
    const tokens4 = wordTokenizer.tokenize('Niemiecko- i angielsko-polski');
    expect(tokens4.length).toBe(6);
    expect(str(tokens4)).toBe('[Niemiecko, -,  , i,  , angielsko-polski]');
    // hyphen probably instead of mdash
    const tokens5 = wordTokenizer.tokenize('Widzę krowę -i to dobrze!');
    expect(tokens5.length).toBe(11);
    expect(str(tokens5)).toBe('[Widzę,  , krowę,  , -, i,  , to,  , dobrze, !]');
    // mdash
    const tokens6 = wordTokenizer.tokenize('A to jest zdanie—rzeczywiście—z wtrąceniem.');
    expect(tokens6.length).toBe(14);
    expect(str(tokens6)).toBe('[A,  , to,  , jest,  , zdanie, —, rzeczywiście, —, z,  , wtrąceniem, .]');
    // compound words with hyphens
    const compoundSentence = 'To jest kobieta-wojownik w polsko-czeskim ubraniu, która wysłała dwa SMS-y.';
    let compoundTokens = wordTokenizer.tokenize(compoundSentence);
    expect(compoundTokens.length).toBe(21);
    expect(str(compoundTokens)).toBe('[To,  , jest,  , kobieta-wojownik,  , w,  , polsko-czeskim,  , ubraniu, ,,  , która,  , wysłała,  , dwa,  , SMS-y, .]');
    // now setup the tagger...
    const pl = new Polish();
    wordTokenizer.setTagger(pl.getTagger());
    compoundTokens = wordTokenizer.tokenize(compoundSentence);
    expect(compoundTokens.length).toBe(25);
    expect(str(compoundTokens)).toBe('[To,  , jest,  , kobieta, -, wojownik,  , w,  , polsko, -, czeskim,  , ubraniu, ,,  , która,  , wysłała,  , dwa,  , SMS-y, .]');
    compoundTokens = wordTokenizer.tokenize('Miała osiemnaście-dwadzieścia lat.');
    expect(compoundTokens.length).toBe(8);
    expect(str(compoundTokens)).toBe('[Miała,  , osiemnaście, -, dwadzieścia,  , lat, .]');
    // now three-part adja-adja-adj...:
    compoundTokens = wordTokenizer.tokenize('Słownik polsko-niemiecko-indonezyjski');
    expect(compoundTokens.length).toBe(7);
    expect(str(compoundTokens)).toBe('[Słownik,  , polsko, -, niemiecko, -, indonezyjski]');
    // number ranges:
    compoundTokens = wordTokenizer.tokenize('Impreza odbędzie się w dniach 1-23 maja.');
    expect(compoundTokens.length).toBe(16);
    expect(str(compoundTokens)).toBe('[Impreza,  , odbędzie,  , się,  , w,  , dniach,  , 1, -, 23,  , maja, .]');
    compoundTokens = wordTokenizer.tokenize('Impreza odbędzie się w dniach 1--23 maja.');
    expect(compoundTokens.length).toBe(18);
    expect(str(compoundTokens)).toBe('[Impreza,  , odbędzie,  , się,  , w,  , dniach,  , 1, -, , -, 23,  , maja, .]');
  });
});
