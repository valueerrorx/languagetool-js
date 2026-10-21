// Ported from LanguageAnnotatorTest (languagetool-standalone)
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { LanguageAnnotator, TokenWithLanguages, listToString } from '../../src/core/LanguageAnnotator.js';

const en = Languages.getLanguageForShortCode('en-US');
const de = Languages.getLanguageForShortCode('de-DE');
const deList = [de];
const enList = [en];
const enDe = [en, de];

// Java: LanguageAnnotatorTest#token(String,Language...)
const token = (s, ...langs) => new TokenWithLanguages(s, ...langs);
// Java: LanguageAnnotatorTest#token(String,List)
const tokenList = (s, langs) => TokenWithLanguages.ofList(s, langs);
// Java: LanguageAnnotatorTest#t(String)
const t = (s) => new TokenWithLanguages(s, en);

// Java: LanguageAnnotatorTest#getTokenRangeAsString(List)
function getTokenRangeAsString(tokenRanges) {
  let sb = '';
  for (const tokenRange of tokenRanges) {
    sb += '[';
    for (const tokenWithLanguage of tokenRange) sb += tokenWithLanguage.getToken();
    sb += ']';
  }
  return sb;
}

describe('LanguageAnnotatorTest', () => {
  // Java: LanguageAnnotatorTest#testGetTokensWithPotentialLanguages
  it('testGetTokensWithPotentialLanguages', () => {
    const annotator = new LanguageAnnotator();
    const tokens = annotator.getTokensWithPotentialLanguages('Der große Haus.', en, deList);
    expect(listToString(tokens)).toBe('[Der/en-US/de-DE,  , große,  , Haus/de-DE, .]'); // TODO (Java): why no lang for 'große'?
    const tokens2 = annotator.getTokensWithPotentialLanguages('This is a new bicycle.', en, deList);
    expect(listToString(tokens2)).toBe('[This/en-US,  , is/en-US,  , a/en-US/de-DE,  , new/en-US,  , bicycle/en-US, .]');
  });

  // Java: LanguageAnnotatorTest#testDetectLanguages
  it('testDetectLanguages', () => {
    const annotator = new LanguageAnnotator();
    expect(listToString(annotator.detectLanguages('This is an English test. Hier kommt ein deutscher Satz.', en, deList)))
      .toBe('[| en-US: This is an English test. |, | de-DE:  Hier kommt ein deutscher Satz. |]');
    expect(listToString(annotator.detectLanguages('This is an English test. Nun kommt ein deutscher Satz.', en, deList))) // "Nun" is also English
      .toBe('[| en-US: This is an English test. |, | de-DE:  Nun kommt ein deutscher Satz. |]');
    expect(listToString(annotator.detectLanguages('Nun kommt ein deutscher Satz. This is an English test.', en, deList))) // "Nun" is also English
      .toBe('[| en-US:  |, | de-DE: Nun kommt ein deutscher Satz. |, | en-US:  This is an English test. |]'); // TODO (Java): empty "en-US"
    expect(listToString(annotator.detectLanguages('Hier steht was auf Deutsch. This is English text one. '
      + 'Hier steht was auf Deutsch. "This is English text two."', en, deList)))
      .toBe('[| en-US:  |, | de-DE: Hier steht was auf Deutsch. |, | en-US:  This is English text one. |, '
        + '| de-DE:  Hier steht was auf Deutsch. |, | en-US:  "This is English text two." |]'); // TODO (Java): empty "en-US"
    expect(listToString(annotator.detectLanguages('Hier steht was auf Deutsch. This is English text one. '
      + 'Hier steht was auf Deutsch. "This is English text two."', de, enList)))
      .toBe('[| de-DE: Hier steht was auf Deutsch. |, | en-US:  This is English text one. |, '
        + '| de-DE:  Hier steht was auf Deutsch. |, | en-US:  "This is English text two." |]');
    expect(listToString(annotator.detectLanguages('Nutzen Sie es auf unserer Webseite foobar.com?', de, enList)))
      .toBe('[| de-DE: Nutzen Sie es auf unserer Webseite foobar.com? |]');
  });

  // Java: LanguageAnnotatorTest#testGetTokenRanges
  it('testGetTokenRanges', () => {
    const annotator = new LanguageAnnotator();
    const tokenRanges = annotator.getTokenRanges([
      token('This', en), token(' ', en),
      token('is', de), token(' ', en),
      token('a', de), token(' ', en),
      token('test', en),
      token('!', en),
      token('Hier', de), token(' ', de),
      token('geht', de), token(' ', de),
      token('es', de), token(' ', de),
      token('weiter', de),
      token('.', de),
    ]);
    expect(getTokenRangeAsString(tokenRanges)).toBe('[This is a test!][Hier geht es weiter.]');
    expect(listToString(annotator.getTokenRangesWithLang(tokenRanges, en, deList)))
      .toBe('[en-US: [This,  , is,  , a,  , test, !], de-DE: [Hier,  , geht,  , es,  , weiter, .]]');

    const tokenRanges2 = annotator.getTokenRanges([
      token('This', en), token(' ', en),
      token('is', de), token(' ', en),
      token('a', de), token(' ', en),
      token('test', en),
      token('!', en),
      token('Hier', de), token(' ', de),
      token('geht', de), token(' ', de),
      token('es', de), token(' ', de),
      token('weiter', de),
    ]);
    expect(getTokenRangeAsString(tokenRanges2)).toBe('[This is a test!][Hier geht es weiter]');
    expect(listToString(annotator.getTokenRangesWithLang(tokenRanges2, en, deList)))
      .toBe('[en-US: [This,  , is,  , a,  , test, !], de-DE: [Hier,  , geht,  , es,  , weiter]]');
  });

  // Java: LanguageAnnotatorTest#testGetTokenRangesAmbiguous
  it('testGetTokenRangesAmbiguous', () => {
    const annotator = new LanguageAnnotator();
    const tokenRanges = annotator.getTokenRanges([
      tokenList('Hi', enDe), token(','),
      token('\n'),
      token('\n'),
      token('this', en), token(' ', en),
      token('is', de), token(' ', en),
      token('a', de), token(' ', en),
      token('test', en),
      token('.', en),
      token('Hier', de), token(' ', de),
      token('geht', de), token(' ', de),
      token('es', de), token(' ', de),
      token('weiter', de),
      token('.', de),
    ]);
    expect(listToString(annotator.getTokenRangesWithLang(tokenRanges, de, enList)))
      .toBe('[en-US: [Hi, ,, \n], en-US: [\n], en-US: [this,  , is,  , a,  , test, .], de-DE: [Hier,  , geht,  , es,  , weiter, .]]');
  });

  // Java: LanguageAnnotatorTest#testGetTokenRanges2
  it('testGetTokenRanges2', () => {
    const annotator = new LanguageAnnotator();
    const tokenRanges3 = annotator.getTokenRanges([
      t('This'), t(' '),
      t('is'), t(' '),
      t('a'), t(' '),
      t('test'),
      t('.'),
      t('"'),
      t('Hier'), t(' '),
      t('geht'), t(' '),
      t('es'), t(' '),
      t('weiter'),
      t('"'),
    ]);
    expect(getTokenRangeAsString(tokenRanges3)).toBe('[This is a test.]["Hier geht es weiter"]');
  });

  // Java: LanguageAnnotatorTest#testGetTokenRanges3
  it('testGetTokenRanges3', () => {
    const annotator = new LanguageAnnotator();
    const tokenRanges3 = annotator.getTokenRanges([
      t('This'), t(' '),
      t('is'), t(' '),
      t('a'), t(' '),
      t('test'),
      t('.'),
      t('"'),
      t('Hier'), t(' '),
      t('geht'), t(' '),
      t('es'), t(' '),
      t('weiter'),
      t('.'),
      t('"'),
    ]);
    expect(getTokenRangeAsString(tokenRanges3)).toBe('[This is a test.]["Hier geht es weiter.]["]');
  });
});
