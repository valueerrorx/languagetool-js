// Ported from FrenchWordTokenizerTest (languagetool-language-modules/fr).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { FrenchWordTokenizer } from '../../src/lang/fr/tokenizers/FrenchWordTokenizer.js';

// Java: List#toString()
const str = (l) => `[${l.join(', ')}]`;

describe('FrenchWordTokenizerTest', () => {
  // Java: FrenchWordTokenizerTest#testTokenize()
  it('testTokenize', () => {
    const wordTokenizer = new FrenchWordTokenizer();
    let tokens;
    tokens = wordTokenizer.tokenize("name@example.com");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("name@example.com.");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("name@example.com:");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("L'origen de name@example.com.");
    expect(tokens.length).toBe(7);
    tokens = wordTokenizer.tokenize("jusqu'au bout");
    expect(tokens.length).toBe(4);
    tokens = wordTokenizer.tokenize("d’aujourd’hui");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("d'aujourd’hui");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("d'aujourd'hui");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("entr'ouvrions");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("entr’ouvrions");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("Penses-tu");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("Strauss-Kahn");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("Semble-t-elle");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("N’est-il");
    expect(tokens.length).toBe(3);    
    tokens = wordTokenizer.tokenize("Faites-le-moi");
    expect(tokens.length).toBe(3);
    tokens = wordTokenizer.tokenize("donne-t-on");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("qu'est-ce");
    expect(tokens.length).toBe(3);
    tokens = wordTokenizer.tokenize("t'es-tu");
    expect(tokens.length).toBe(3);
    tokens = wordTokenizer.tokenize("rendez-vous");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("Petit-déjeunes-tu");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("Y-a-t-il");
    expect(tokens.length).toBe(4);
    tokens = wordTokenizer.tokenize("va-t-en"); // wrong, correct: va-t'en
    expect(tokens.length).toBe(4);
    tokens = wordTokenizer.tokenize("va-t'en");
    expect(tokens.length).toBe(3);
    tokens = wordTokenizer.tokenize("va-t’en");
    expect(tokens.length).toBe(3);
    tokens = wordTokenizer.tokenize("d'1");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("Rendez-Vous");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("sous-trai\u00ADtants");
    expect(tokens.length).toBe(1);
    
    tokens = wordTokenizer.tokenize("-L'homme.");
    expect(str(tokens)).toBe("[-, L', homme, .]");
    tokens = wordTokenizer.tokenize("-Oui -l'homme.");
    expect(str(tokens)).toBe("[-, Oui,  , -, l', homme, .]");
    
    tokens = wordTokenizer.tokenize("Qu’est-ce que ç’a à voir ?");
    expect(str(tokens)).toBe("[Qu’, est, -ce,  , que,  , ç’, a,  , à,  , voir,  , ?]");
    tokens = wordTokenizer.tokenize("Qu’est-ce que ç'a à voir ?");
    expect(str(tokens)).toBe("[Qu’, est, -ce,  , que,  , ç', a,  , à,  , voir,  , ?]");
    tokens = wordTokenizer.tokenize("Ç’allait être le rêve du XVIIIe siècle.");
    expect(str(tokens)).toBe("[Ç’, allait,  , être,  , le,  , rêve,  , du,  , XVIIIe,  , siècle, .]");
    
    tokens = wordTokenizer.tokenize("10 000");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("1 000 000");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("2005 57 114");
    expect(tokens.length).toBe(3);
    expect(str(tokens)).toBe("[2005,  , 57 114]");   
    tokens = wordTokenizer.tokenize("2005 454");
    expect(tokens.length).toBe(3);
    expect(str(tokens)).toBe("[2005,  , 454]");
    tokens = wordTokenizer.tokenize("$1");
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe("[$1]");

    tokens = wordTokenizer.tokenize("Mais ça ne l'empêche pas de la « décomposer » avec humour.");
    expect(str(tokens)).toBe("[Mais,  , ça,  , ne,  , l', empêche,  , pas,  , de,  , la,  , «,  , décomposer,  , »,  , avec,  , humour, .]");
  });
});
