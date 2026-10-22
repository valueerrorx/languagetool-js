// Ported from PolishWordRepeatRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { PolishWordRepeatRule } from '../../../../src/lang/pl/rules/PolishWordRepeatRule.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('PolishWordRepeatRuleTest', () => {
  // Java: PolishWordRepeatRuleTest#testRule
  it('testRule', () => {
    const rule = new PolishWordRepeatRule(englishMessages());
    const lt = new JLanguageTool(new Polish());
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;
    expect(n('To jest zdanie próbne.')).toBe(0);
    expect(n('On tak się bardzo nie martwił, bo przecież musiał się umyć.')).toBe(0);
    expect(n('Na dyskotece tańczył jeszcze, choć był na bani.')).toBe(0);
    expect(n('Żadnych „ale”.')).toBe(0);
    expect(n('Był on bowiem pięknym strzelcem bowiem.')).toBe(1);
    expect(n('Mówiła długo, żeby tylko mówić długo.')).toBe(2);
  });
});
