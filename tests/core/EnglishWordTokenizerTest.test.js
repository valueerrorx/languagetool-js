// Ported from EnglishWordTokenizerTest (languagetool-language-modules/en).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { EnglishWordTokenizer } from '../../src/lang/en/tokenizers/EnglishWordTokenizer.js';

// Java: List#toString()
const str = (l) => `[${l.join(', ')}]`;

describe('EnglishWordTokenizerTest', () => {
  // Java: EnglishWordTokenizerTest#testTokenize()
  it('testTokenize', () => {
    const wordTokenizer = new EnglishWordTokenizer();
    let tokens;
    tokens = wordTokenizer.tokenize("This is\u00A0a test");
    expect(tokens.length).toBe(7);
    expect(str(tokens)).toBe("[This,  , is, \u00A0, a,  , test]");
    const tokens2 = wordTokenizer.tokenize("This\rbreaks");
    expect(tokens2.length).toBe(3);
    expect(str(tokens2)).toBe("[This, \r, breaks]");
    //hyphen with no whitespace
    const tokens3 = wordTokenizer.tokenize("Now this is-really!-a test.");
    expect(tokens3.length).toBe(11);
    expect(str(tokens3)).toBe("[Now,  , this,  , is-really, !, -, a,  , test, .]");
    //hyphen at the end of the word
    const tokens4 = wordTokenizer.tokenize("Now this is- really!- a test.");
    expect(tokens4.length).toBe(15);
    expect(str(tokens4)).toBe("[Now,  , this,  , is, -,  , really, !, -,  , a,  , test, .]");
    //mdash
    const tokens5 = wordTokenizer.tokenize("Now this is—really!—a test.");
    expect(tokens5.length).toBe(13);
    expect(str(tokens5)).toBe("[Now,  , this,  , is, —, really, !, —, a,  , test, .]");
    //exception
    const tokens6 = wordTokenizer.tokenize("fo'c'sle");
    expect(tokens6.length).toBe(1);
    //contractions
    const tokens7 = wordTokenizer.tokenize("I'm John.");
    expect(str(tokens7)).toBe("[I, 'm,  , John, .]");
    expect(tokens7.length).toBe(5);
    const tokens8 = wordTokenizer.tokenize("You hadn’t.");
    expect(str(tokens8)).toBe("[You,  , had, n’t, .]");
    expect(tokens7.length).toBe(5);
    const tokens9 = wordTokenizer.tokenize("We'are");
    expect(str(tokens9)).toBe("[We, ', are]");
    expect(tokens9.length).toBe(3);
    const tokens10 = wordTokenizer.tokenize("'We're'");
    expect(str(tokens10)).toBe("[', We, 're, ']");
    expect(tokens10.length).toBe(4);
    const tokens11 = wordTokenizer.tokenize("'We’re the best.'");
    expect(str(tokens11)).toBe("[', We, ’re,  , the,  , best, ., ']");
    expect(tokens11.length).toBe(9);
    const tokens12 = wordTokenizer.tokenize("'Don't do it'");
    expect(str(tokens12)).toBe("[', Do, n't,  , do,  , it, ']");
    expect(tokens12.length).toBe(8);
    const tokens13 = wordTokenizer.tokenize("‘Don’t do it’");
    expect(str(tokens13)).toBe("[‘, Do, n’t,  , do,  , it, ’]");
    expect(tokens13.length).toBe(8);
    const tokens14 = wordTokenizer.tokenize("Don't do it");
    expect(str(tokens14)).toBe("[Do, n't,  , do,  , it]");
    expect(tokens14.length).toBe(6);
    const tokens15 = wordTokenizer.tokenize("My address is address@email.com");
    expect(str(tokens15)).toBe("[My,  , address,  , is,  , address@email.com]");
    expect(tokens15.length).toBe(7);
    const tokens16 = wordTokenizer.tokenize("@test@test.social you are aweesome!");
    expect(str(tokens16)).toBe("[@test@test.social,  , you,  , are,  , aweesome, !]");
    expect(tokens16.length).toBe(8);
    const tokens17 = wordTokenizer.tokenize("My address is address@email.com or other@email.com.");
    expect(str(tokens17)).toBe("[My,  , address,  , is,  , address@email.com,  , or,  , other@email.com, .]");
    expect(tokens17.length).toBe(12);
    const tokens18 = wordTokenizer.tokenize("doin' that");
    expect(str(tokens18)).toBe("[doin',  , that]");
    expect(tokens18.length).toBe(3);
    const tokens19 = wordTokenizer.tokenize("ne’er e'er o’er jack-o'-lantern");
    expect(str(tokens19)).toBe("[ne’er,  , e'er,  , o’er,  , jack-o'-lantern]");
    expect(tokens19.length).toBe(7);
    //vertical tab
    const tokens20 = wordTokenizer.tokenize("I'm a cool test\u000Bwith a line");
    expect(str(tokens20)).toBe("[I, 'm,  , a,  , cool,  , test, \u000B, with,  , a,  , line]");
    expect(tokens20.length).toBe(14);

    const tokens21 = wordTokenizer.tokenize("fast⇿superfast");
    expect(str(tokens21)).toBe("[fast, ⇿, superfast]");
    expect(tokens21.length).toBe(3);
  });
});
