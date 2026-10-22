// Ported from WordCoherencyRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { WordCoherencyRule } from '../../../../src/lang/pl/rules/WordCoherencyRule.js';
import { disableAllRulesExcept } from '../../../support/TestTools.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('WordCoherencyRuleTest (pl)', () => {
  const lt = new JLanguageTool(Languages.getLanguageForShortCode('pl-PL'));
  disableAllRulesExcept(lt, 'PL_WORD_COHERENCY'); // Java: @Before
  const list = (m) => `[${m.getSuggestedReplacements().join(', ')}]`;
  const matchCount = (s) => new WordCoherencyRule(englishMessages()).match(lt.analyzeText(s));
  const assertGood = (s) => expect(matchCount(s).length).toBe(0);
  const assertError = (s, sug) => {
    const m = matchCount(s);
    expect(m.length).toBe(1);
    expect(list(m[0])).toBe(`[${sug}]`);
  };

  // Java: WordCoherencyRuleTest#testRule
  it('testRule', () => {
    assertGood('To jest grejpfrut. Dobry grejpfrut.');
    assertGood('Lubię Twoje blefy. Blef to jest coś.');
    assertError('To jest grapefruit. Dobry grejpfrut.', 'grapefruit');
    const matches1 = lt.check('To jest jego bluff. A może blef?');
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(27);
    expect(matches1[0].getToPos()).toBe(31);
    expect(list(matches1[0])).toBe('[bluff]');
    const matches2 = lt.check('To jest jego bluff. Nie chwalił się tym blefem.');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(40);
    expect(matches2[0].getToPos()).toBe(46);
    expect(list(matches2[0])).toBe('[bluffem]');
  });

  // Java: WordCoherencyRuleTest#testCallIndependence
  it('testCallIndependence', () => {
    assertGood('To jest blef.');
    assertGood('A to nie bluff.');
  });

  // Java: WordCoherencyRuleTest#testMatchPosition
  it('testMatchPosition', () => {
    const ruleMatches = lt.check('To jest blef. Ale nie bluff.');
    expect(ruleMatches.length).toBe(1);
    expect(ruleMatches[0].getFromPos()).toBe(22);
    expect(ruleMatches[0].getToPos()).toBe(27);
  });

  // Java: WordCoherencyRuleTest#testRuleCompleteTexts
  it('testRuleCompleteTexts', () => {
    expect(lt.check('To jest blef. Nie wierzysz? To naprawdę blef!').length).toBe(0);
    expect(lt.check('To jest blef. Nie wierzysz? To naprawdę bluff!').length).toBe(1);
    expect(lt.check('To jest bluff. Nie wierzysz? To naprawdę blef!').length).toBe(1);
    expect(lt.check('To jest blef. Nie wierzysz? Nie widzisz blefu!').length).toBe(0);
    expect(lt.check('To jest blef. Nie wierzysz? Nie widzisz bluffu!').length).toBe(1);
    expect(lt.check('Chwalił się blefem.\n\nTak było nie zmyślam. Ale bluff mu nie wyszedł.').length).toBe(1);
  });
});
