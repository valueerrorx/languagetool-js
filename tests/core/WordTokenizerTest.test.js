// Ported from WordTokenizerTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { WordTokenizer } from '../../src/core/text/tokenizers/WordTokenizer.js';

// Java: List#toString()
const str = (l) => `[${l.join(', ')}]`;

describe('WordTokenizerTest', () => {
  const wordTokenizer = new WordTokenizer();

  // Java: WordTokenizerTest#tokenize(String)
  function tokenize(text) {
    return wordTokenizer.tokenize(text).join('|');
  }

  // Java: WordTokenizerTest#testTokenize()
  it('testTokenize', () => {
    const wordTokenizer = new WordTokenizer();
    let tokens = wordTokenizer.tokenize("This is\u00A0a test");
    expect(tokens.length).toBe(7);
    expect(str(tokens)).toBe("[This,  , is, \u00A0, a,  , test]");
    tokens = wordTokenizer.tokenize("This\rbreaks");
    expect(tokens.length).toBe(3);
    expect(str(tokens)).toBe("[This, \r, breaks]");
    tokens = wordTokenizer.tokenize("dev.all@languagetool.org");
    expect(tokens.length).toBe(1);
    tokens = wordTokenizer.tokenize("dev.all@languagetool.org.");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("dev.all@languagetool.org:");
    expect(tokens.length).toBe(2);
    tokens = wordTokenizer.tokenize("Schreiben Sie Hr. Meier (meier@mail.com).");
    expect(tokens.length).toBe(13);
    tokens = wordTokenizer.tokenize("Get more at languagetool.org/foo, and via twitter");
    expect(tokens.length).toBe(14);
    expect(tokens).toContain("languagetool.org/foo");
    tokens = wordTokenizer.tokenize("Get more at sub.languagetool.org/foo, and via twitter");
    expect(tokens.length).toBe(14);
    expect(tokens).toContain("sub.languagetool.org/foo");
  });

  // Java: WordTokenizerTest#testIsUrl()
  it('testIsUrl', () => {
    expect(WordTokenizer.isUrl("www.languagetool.org")).toBe(true);
    expect(WordTokenizer.isUrl("languagetool.org/")).toBe(true);
    expect(WordTokenizer.isUrl("languagetool.org/foo")).toBe(true);
    expect(WordTokenizer.isUrl("subdomain.languagetool.org/")).toBe(true);
    expect(WordTokenizer.isUrl("http://www.languagetool.org")).toBe(true);
    expect(WordTokenizer.isUrl("https://www.languagetool.org")).toBe(true);
    expect(WordTokenizer.isUrl("languagetool.org")).toBe(false);  // not detected yet
    expect(WordTokenizer.isUrl("sub.languagetool.org")).toBe(false);  // not detected yet
    expect(WordTokenizer.isUrl("something-else")).toBe(false);
  });

  // Java: WordTokenizerTest#testIsEMail()
  it('testIsEMail', () => {
    expect(WordTokenizer.isEMail("martin.mustermann@test.de")).toBe(true);
    expect(WordTokenizer.isEMail("martin.mustermann@test.languagetool.de")).toBe(true);
    expect(WordTokenizer.isEMail("martin-mustermann@test.com")).toBe(true);
    expect(WordTokenizer.isEMail("@test.de")).toBe(false);
    expect(WordTokenizer.isEMail("f.test@test")).toBe(false);
    expect(WordTokenizer.isEMail("f@t.t")).toBe(false);
  });

  // Java: WordTokenizerTest#testUrlTokenize()
  it('testUrlTokenize', () => {
    expect(tokenize("\"This http://foo.org.\"")).toBe("\"|This| |http://foo.org|.|\"");
    expect(tokenize("«This http://foo.org.»")).toBe("«|This| |http://foo.org|.|»");
    expect(tokenize("This http://foo.org...")).toBe("This| |http://foo.org|.|.|.");
    expect(tokenize("This http://foo.org.")).toBe("This| |http://foo.org|.");
    expect(tokenize("This http://foo.org blah")).toBe("This| |http://foo.org| |blah");
    expect(tokenize("This http://foo.org and ftp://bla.com blah")).toBe("This| |http://foo.org| |and| |ftp://bla.com| |blah");
    expect(tokenize("foo http://localhost:32000/?ch=1 bar")).toBe("foo| |http://localhost:32000/?ch=1| |bar");
    expect(tokenize("foo ftp://localhost:32000/ bar")).toBe("foo| |ftp://localhost:32000/| |bar");
    expect(tokenize("foo http://google.de/?aaa bar")).toBe("foo| |http://google.de/?aaa| |bar");
    expect(tokenize("foo http://www.flickr.com/123@N04/hallo#test bar")).toBe("foo| |http://www.flickr.com/123@N04/hallo#test| |bar");
    expect(tokenize("foo http://www.youtube.com/watch?v=wDN_EYUvUq0 bar")).toBe("foo| |http://www.youtube.com/watch?v=wDN_EYUvUq0| |bar");
    expect(tokenize("foo http://example.net/index.html?s=A54C6FE2%23info bar")).toBe("foo| |http://example.net/index.html?s=A54C6FE2%23info| |bar");
    expect(tokenize("foo https://writerduet.com/script/#V6922~***~branch=-MClu-LnPrTNz8oz_rJb bar")).toBe("foo| |https://writerduet.com/script/#V6922~***~branch=-MClu-LnPrTNz8oz_rJb| |bar");
    expect(tokenize("foo https://joe:passwd@example.net:8080/index.html?action=x&session=A54C6FE2#info bar")).toBe("foo| |https://joe:passwd@example.net:8080/index.html?action=x&session=A54C6FE2#info| |bar");
  });

  // Java: WordTokenizerTest#testUrlTokenizeWithQuote()
  it('testUrlTokenizeWithQuote', () => {
    expect(tokenize("This 'http://foo.org' blah")).toBe("This| |'|http://foo.org|'| |blah");
    expect(tokenize("This \"http://foo.org\" blah")).toBe("This| |\"|http://foo.org|\"| |blah");
    expect(tokenize("This (\"http://foo.org\") blah")).toBe("This| |(|\"|http://foo.org|\"|)| |blah");   // issue #1226
  });

  // Java: WordTokenizerTest#testUrlTokenizeWithAppendedCharacter()
  it('testUrlTokenizeWithAppendedCharacter', () => {
    expect(tokenize("foo (http://ex.net/p?a=x#i) bar")).toBe("foo| |(|http://ex.net/p?a=x#i|)| |bar");
    expect(tokenize("foo http://ex.net/p?a=x#i, bar")).toBe("foo| |http://ex.net/p?a=x#i|,| |bar");
    expect(tokenize("foo http://ex.net/p?a=x#i. bar")).toBe("foo| |http://ex.net/p?a=x#i|.| |bar");
    expect(tokenize("foo http://ex.net/p?a=x#i: bar")).toBe("foo| |http://ex.net/p?a=x#i|:| |bar");
    expect(tokenize("foo http://ex.net/p?a=x#i? bar")).toBe("foo| |http://ex.net/p?a=x#i|?| |bar");
    expect(tokenize("foo http://ex.net/p?a=x#i! bar")).toBe("foo| |http://ex.net/p?a=x#i|!| |bar");
  });

  // Java: WordTokenizerTest#testIncompleteUrlTokenize()
  it('testIncompleteUrlTokenize', () => {
    expect(tokenize("http:/")).toBe("http|:|/");
    expect(tokenize("http://")).toBe("http://");
    expect(tokenize("http://a")).toBe("http://a");
    expect(tokenize("foo http bar")).toBe("foo| |http| |bar");
    expect(tokenize("foo http: bar")).toBe("foo| |http|:| |bar");
    expect(tokenize("foo http:/ bar")).toBe("foo| |http|:|/| |bar");
    expect(tokenize("foo http:// bar")).toBe("foo| |http://| |bar");
    expect(tokenize("foo http://a bar")).toBe("foo| |http://a| |bar");
    expect(tokenize("foo http://? bar")).toBe("foo| |http://|?| |bar");
  });

  // Java: WordTokenizerTest#testCheckCurrencyExpression()
  it('testCheckCurrencyExpression', () => {
    expect(wordTokenizer.isCurrencyExpression("US$45")).toBe(true);
    expect(wordTokenizer.isCurrencyExpression("5,000€")).toBe(true);
    expect(wordTokenizer.isCurrencyExpression("£1.50")).toBe(true);
    expect(wordTokenizer.isCurrencyExpression("R$1.999.99")).toBe(true);
    expect(wordTokenizer.isCurrencyExpression("US$")).toBe(false);
    expect(wordTokenizer.isCurrencyExpression("X€")).toBe(false);
    expect(wordTokenizer.isCurrencyExpression(".50£")).toBe(false);
    expect(wordTokenizer.isCurrencyExpression("5R$5")).toBe(false);
  });

  // Java: WordTokenizerTest#testSplitCurrencyExpression()
  it('testSplitCurrencyExpression', () => {
    expect(wordTokenizer.splitCurrencyExpression("US$45")).toEqual(["US$", "45"]);
    expect(wordTokenizer.splitCurrencyExpression("5,000€")).toEqual(["5,000", "€"]);
    expect(wordTokenizer.splitCurrencyExpression("£1.50")).toEqual(["£", "1.50"]);
    expect(wordTokenizer.splitCurrencyExpression("R$1.999.99")).toEqual(["R$", "1.999.99"]);
    // not currency expr
    expect(wordTokenizer.splitCurrencyExpression("US$X")).toEqual(["US$X"]);
    expect(wordTokenizer.splitCurrencyExpression("foobar")).toEqual(["foobar"]);
  });

});
