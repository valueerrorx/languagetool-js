// Ported from ItalianWordRepeatRuleTest (it module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { ItalianWordRepeatRule } from '../../../../src/lang/it/rules/ItalianWordRepeatRule.js';
import { newLt, englishMessages } from '../../../support/ruleTestSupport.js';

describe('ItalianWordRepeatRuleTest', () => {
  // Java: ItalianWordRepeatRuleTest#testRule()
  it('testRule', () => {
    const lang = Languages.getLanguageForShortCode('it');
    const rule = new ItalianWordRepeatRule(englishMessages(), lang);
    const lt = newLt(lang);
    expect(rule.match(lt.getAnalyzedSentence('Mi è sembrato così così')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Duran Duran')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Devi mescolare piano piano')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Seguo passo passo')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Mi mi è sembrato così')).length).toBe(1);
  });
});
