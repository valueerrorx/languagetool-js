// Ported from JLanguageToolTest (sl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Languages } from '../../../src/core/Languages.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java sl module tests run without the en module on the classpath

const LONG = 3600000;

describe('JLanguageToolTest (sl)', () => {
  // Java: JLanguageToolTest#testSlovenian
  it('testSlovenian', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('sl'));
    expect(lt.check('Kupil je npr. jajca, moko in mleko.').length).toBe(1);
  }, LONG);
});
