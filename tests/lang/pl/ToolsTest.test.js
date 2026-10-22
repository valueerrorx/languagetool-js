// Ported from ToolsTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { correctText } from '../../../src/core/Tools.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule();

const LONG = 3600000;

describe('ToolsTest (pl)', () => {
  // Java: ToolsTest#testCheck
  it('testCheck', () => {
    const tool = new JLanguageTool(new Polish());
    expect(tool.check('To jest całkowicie prawidłowe zdanie.').length).toBe(0);
    const matches2 = tool.check('To jest problem problem.');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getRule().getId()).toBe('WORD_REPEAT_RULE');
  }, LONG);

  // Java: ToolsTest#testCorrect
  it('testCorrect', () => {
    const tool = new JLanguageTool(new Polish());
    tool.setCleanOverlappingMatches(false);
    expect(correctText('To jest całkowicie prawidłowe zdanie.', tool)).toBe('To jest całkowicie prawidłowe zdanie.');
    expect(correctText('To jest jest problem.', tool)).toBe('To jest problem.');
    expect(correctText('To jest jest problem. Ale to już już nie jest problem.', tool)).toBe('To jest problem. Ale to już nie jest problem.');
    expect(correctText('To jest jest problem. Ale to już już nie jest problem. Tak sie nie robi. W tym zdaniu brakuje przecinka bo go zapomniałem.', tool))
      .toBe('To jest problem. Ale to już nie jest problem. Tak się nie robi. W tym zdaniu brakuje przecinka, bo go zapomniałem.');
  }, LONG);
});
