// Ported from UppercaseSentenceStartRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('UppercaseSentenceStartRuleTest (pl)', () => {
  // Java: UppercaseSentenceStartRuleTest#testPolishSpecialCases
  it('testPolishSpecialCases', () => {
    const lt = new JLanguageTool(new Polish());
    expect(lt.check('Zdanie.').length).toBe(0);
    expect(lt.check('To jest lista punktowana:\n\npunkt pierwszy,\n\npunkt drugi,\n\npunkt trzeci.').length).toBe(0);
  });
});
