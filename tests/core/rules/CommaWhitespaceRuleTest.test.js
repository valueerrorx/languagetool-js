// Ported from CommaWhitespaceRuleTest (languagetool-core); Demo language replaced by en-US (no-op disambiguation)
import { describe, it, expect, beforeEach } from 'vitest';
import { CommaWhitespaceRule } from '../../../src/core/rules/CommaWhitespaceRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('CommaWhitespaceRuleTest', () => {
  useNoopAnalysis(EN);
  let rule;
  let lt;
  beforeEach(() => {
    rule = new CommaWhitespaceRule(englishMessages());
    lt = newLt(EN);
  });

  const assertMatches = (text, expectedMatches) => expect(rule.match(lt.getAnalyzedSentence(text)).length).toBe(expectedMatches);
  const assertMatchesForText = (text, expectedMatches) => {
    let matchCount = 0;
    for (const s of lt.analyzeText(text)) matchCount += rule.match(s).length;
    expect(matchCount).toBe(expectedMatches);
  };

  // Java: CommaWhitespaceRuleTest#testRule
  it('testRule', () => {
    assertMatches('This is a test sentence.', 0);
    assertMatches('I work with the technology .Net and Azure.', 0);
    assertMatches('I work with the technology .NET and Azure.', 0);
    assertMatches('I use .MP3 or .WAV file suffix', 0);
    assertMatches('This, is, a test sentence.', 0);
    assertMatches('This (foo bar) is a test!.', 0);
    assertMatches('Das kostet €2,45.', 0);
    assertMatches('Das kostet 50,- Euro', 0);
    assertMatches('This is a sentence with ellipsis ...', 0);
    assertMatches("This is a figure: .5 and it's correct.", 0);
    assertMatches('This is $1,000,000.', 0);
    assertMatches('This is 1,5.', 0);
    assertMatches("This is a ,,test''.", 0);
    assertMatches('Run ./validate.sh to check the file.', 0);
    assertMatches('This is,\u00A0really,\u00A0non-breaking whitespace.', 0);
    // test OpenOffice field codes:
    assertMatches('In his book,\u0002 Einstein proved this to be true.', 0);
    assertMatches('- [ ] A checkbox at GitHub', 0);
    assertMatches('- [x] A checked checkbox at GitHub', 0);
    assertMatches('A sentence \'with\' ten "correct" examples of ’using’ quotation “marks” at «once» in it.', 0);
    assertMatches("I'd recommend resaving the .DOC as a PDF file.", 0);
    assertMatches("I'd recommend resaving the .mp3 as a WAV file.", 0);
    assertMatches("I'd suggest buying the .org domain.", 0);
    assertMatches(". This isn't good.", 0);
    assertMatches("), this isn't good.", 0);
    assertMatches('Das sind .exe-Dateien', 0);
    assertMatches('I live in .Los Angeles', 1);
    assertMatchesForText('Die Vertriebsniederlassu\u00ADng der Versorgungstechnik..\u00AD.', 1);
    assertMatchesForText('Die Vertriebsniederlassu\u00ADng der Versorgungstechnik..\u00AD.\n', 1);

    // errors:
    assertMatches('This,is a test sentence.', 1);
    assertMatches('This , is a test sentence.', 1);
    assertMatches('This ,is a test sentence.', 2);
    assertMatches(',is a test sentence.', 2);
    assertMatches('This ( foo bar) is a test!.', 1);
    assertMatches('This (foo bar ) is a test!.', 1);
    assertMatches('This is a sentence with an orphaned full stop .', 1);
    assertMatches('This is a test with a OOo footnote\u0002, which is denoted by 0x2 in the text.', 0);
    assertMatches('A sentence \' with \' ten " incorrect " examples of ’ using ’ quotation “ marks ” at « once » in it.', 10);
    assertMatches("A sentence ' with' one examples of wrong quotations marks in it.", 1);
    assertMatches("A sentence 'with ' one examples of wrong quotations marks in it.", 1);

    let matches = rule.match(lt.getAnalyzedSentence('ABB (  z.B. )'));
    expect(matches.length).toBe(2);
    expect(matches[0].getFromPos()).toBe(4);
    expect(matches[0].getToPos()).toBe(6);
    expect(matches[1].getFromPos()).toBe(11);
    expect(matches[1].getToPos()).toBe(13);

    matches = rule.match(lt.getAnalyzedSentence('This ,'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe(',');
    matches = rule.match(lt.getAnalyzedSentence('This ,is a test sentence.'));
    expect(matches.length).toBe(2);
    expect(matches[0].getSuggestedReplacements()[0]).toBe(', ');
    matches = rule.match(lt.getAnalyzedSentence('This , is a test sentence.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe(',');

    matches = rule.match(lt.getAnalyzedSentence('You " fixed" it.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('" ');
    expect(matches[0].getSuggestedReplacements()[1]).toBe(' "');
    expect(matches[0].getFromPos()).toBe(3);
    expect(matches[0].getToPos()).toBe(6);
    matches = rule.match(lt.getAnalyzedSentence('You "fixed " it.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('" ');
    expect(matches[0].getSuggestedReplacements()[1]).toBe(' "');
    expect(matches[0].getFromPos()).toBe(10);
    expect(matches[0].getToPos()).toBe(13);

    assertMatches('Ellipsis . . . as suggested by The Chicago Manual of Style', 3);
    assertMatches('Ellipsis . . . . as suggested by The Chicago Manual of Style', 4);
  });
});
