// Ported from WordCoherencyRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { WordCoherencyRule } from '../../../../src/lang/de/rules/WordCoherencyRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('WordCoherencyRuleTest', () => {
  // Java: WordCoherencyRuleTest#before (disableAllRulesExcept DE_WORD_COHERENCY)
  const lt = newLt(Languages.getLanguageForShortCode('de-DE'), new WordCoherencyRule(englishMessages()));
  const list = (m) => `[${m.getSuggestedReplacements().join(', ')}]`;

  // Java: WordCoherencyRuleTest#assertError(String,String)
  const assertErrorSuggestion = (s, expectedSuggestion) => {
    const rule = new WordCoherencyRule(englishMessages());
    const matches = rule.match(lt.analyzeText(s));
    expect(matches.length).toBe(1);
    expect(list(matches[0])).toBe('[' + expectedSuggestion + ']');
  };
  // Java: WordCoherencyRuleTest#assertError(String)
  const assertError = (s, expectedSuggestion) => {
    if (expectedSuggestion !== undefined) return assertErrorSuggestion(s, expectedSuggestion);
    const rule = new WordCoherencyRule(englishMessages());
    expect(rule.match(lt.analyzeText(s)).length).toBe(1);
  };
  // Java: WordCoherencyRuleTest#assertGood(String)
  const assertGood = (s) => {
    const rule = new WordCoherencyRule(englishMessages());
    expect(rule.match(lt.analyzeText(s)).length).toBe(0);
  };

  // Java: WordCoherencyRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    assertGood('Das ist aufwendig, aber nicht zu aufwendig.');
    assertGood('Das ist aufwendig. Aber nicht zu aufwendig.');
    assertGood('Das ist aufwändig, aber nicht zu aufwändig.');
    assertGood('Das ist aufwändig. Aber nicht zu aufwändig.');
    // errors:
    assertError('Das ist aufwendig. Aufwändig ist das.', 'Aufwendig');
    assertError('Das ist aufwendig, aber nicht zu aufwändig.');
    assertError('Das ist aufwendig. Aber nicht zu aufwändig.');
    assertError('Das ist aufwendiger, aber nicht zu aufwändig.');
    assertError('Das ist aufwendiger. Aber nicht zu aufwändig.');
    assertError('Das ist aufwändig, aber nicht zu aufwendig.');
    assertError('Das ist aufwändig. Aber nicht zu aufwendig.');
    assertError('Das ist aufwändiger, aber nicht zu aufwendig.');
    assertError('Das ist aufwändiger. Aber nicht zu aufwendig.');
    assertError('Delfin und Delphin');
    assertError('Delfins und Delphine');
    assertError('essentiell und essenziell');
    assertError('essentieller und essenzielles');
    assertError('Differential und Differenzial');
    assertError('Differentials und Differenzials');
    assertError('Facette und Fassette');
    assertError('Facetten und Fassetten');
    assertError('Joghurt und Jogurt');
    assertError('Joghurts und Jogurt');
    assertError('Joghurt und Jogurts');
    assertError('Joghurts und Jogurts');
    assertError('Ketchup und Ketschup');
    assertError('Ketchups und Ketschups');
    assertError('Kommuniqué und Kommunikee');
    assertError('Kommuniqués und Kommunikees');
    assertError('Necessaire und Nessessär');
    assertError('Necessaires und Nessessärs');
    assertError('Orthographie und Orthografie');
    assertError('Orthographien und Orthografien');
    assertError('Potential und Potenzial');
    assertError('Potentials und Potenziale');
    assertError('Portemonnaie und Portmonee');
    assertError('Portemonnaies und Portmonees');
    assertError('potentiell und potenziell');
    assertError('potentielles und potenzieller');
    assertError('Schenke und Schänke');
    // see TODO comment in WordCoherencyRule:
    // assertError('Schenken und Schänken');
    assertError('substantiell und substanziell');
    assertError('substantieller und substanzielles');
    assertError('Thunfisch und Tunfisch');
    assertError('Thunfische und Tunfische');
    assertError('Xylophon und Xylofon');
    assertError('Xylophone und Xylofone');
    assertError('selbständig und selbstständig');
    assertError('selbständiges und selbstständiger');
    assertError('Bahnhofsplatz und Bahnhofplatz');
    // TODO: known to fail because jWordSplitters list is not complete:
    // assertError('Testketchup und Testketschup');



    const matches1 = lt.check('Eine aufwendige Untersuchung. Oder ist sie aufwändig?');
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(43);
    expect(matches1[0].getToPos()).toBe(52);
    expect(list(matches1[0])).toBe('[aufwendig]');

    const matches2 = lt.check('Eine aufwendige Untersuchung. Oder ist sie noch aufwändiger?');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(48);
    expect(matches2[0].getToPos()).toBe(59);
    expect(list(matches2[0])).toBe('[aufwendiger]');
  });

  // Java: WordCoherencyRuleTest#testCallIndependence
  it('testCallIndependence', () => {
    assertGood('Das ist aufwendig.');
    assertGood('Aber nicht zu aufwändig.'); // this won't be noticed, the calls are independent of each other
  });

  // Java: WordCoherencyRuleTest#testMatchPosition
  it('testMatchPosition', () => {
    const ruleMatches = lt.check('Das ist aufwendig. Aber nicht zu aufwändig');
    expect(ruleMatches.length).toBe(1);
    expect(ruleMatches[0].getFromPos()).toBe(33);
    expect(ruleMatches[0].getToPos()).toBe(42);
  });

  // Java: WordCoherencyRuleTest#testRuleCompleteTexts
  it('testRuleCompleteTexts', () => {
    expect(lt.check('Das ist aufwändig. Aber hallo. Es ist wirklich aufwändig.').length).toBe(0);
    expect(lt.check('Das ist aufwendig. Aber hallo. Es ist wirklich aufwändig.').length).toBe(1);
    expect(lt.check('Das ist aufwändig. Aber hallo. Es ist wirklich aufwendig.').length).toBe(1);
    
    // also find full forms:
    expect(lt.check('Das ist aufwendig. Aber hallo. Es ist wirklich aufwendiger als so.').length).toBe(0);
    expect(lt.check('Das ist aufwendig. Aber hallo. Es ist wirklich aufwändiger als so.').length).toBe(1);
    
    expect(lt.check('Das ist aufwändig. Aber hallo. Es ist wirklich aufwendiger als so.').length).toBe(1);
    expect(lt.check('Das ist das aufwändigste. Aber hallo. Es ist wirklich aufwendiger als so.').length).toBe(1);
    expect(lt.check('Das ist das aufwändigste. Aber hallo. Es ist wirklich aufwendig.').length).toBe(1);

    // cross-paragraph checks
    expect(lt.check('Das ist das aufwändigste.\n\nAber hallo. Es ist wirklich aufwendig.').length).toBe(1);
  
  });
});
