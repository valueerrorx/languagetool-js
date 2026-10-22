// Ported from AbstractLanguageConcurrencyTest and PolishConcurrencyTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java pl module tests run without the en module on the classpath

const LONG = 3600000;
const SAMPLE_TEXT = 'Wiedźmin – postać stworzona przez polskiego pisarza fantasy Andrzeja Sapkowskiego.';

// Java: AbstractLanguageConcurrencyTest#testSpellCheckerFailure (threads run sequentially in JS)
function spellCheckerFailure(threadCount, testRuns) {
  const language = new Polish();
  for (let t = 0; t < threadCount; t++) {
    for (let i = 0; i < testRuns; i++) {
      expect(new JLanguageTool(language).check(SAMPLE_TEXT)).not.toBeNull();
    }
  }
}

describe('PolishConcurrencyTest', () => {
  // JUnit: PolishConcurrencyTest#testSpellCheckerFailure (@Ignore "too slow to run every time")
  it.skip('testSpellCheckerFailure', () => {
    spellCheckerFailure(10, 100);
  });

  // JUnit: PolishConcurrencyTest#testSpellCheckerFailure (reduced, sequential)
  it('testSpellCheckerFailure (reduced, sequential)', () => {
    spellCheckerFailure(1, 2);
  }, LONG);

  // JUnit: PolishConcurrencyTest (parallel checks give identical results, PL-0075)
  it('parallel checks give identical results', async () => {
    const language = new Polish();
    const key = (ms) => JSON.stringify(ms.map((m) => [m.getRule().getId(), m.getFromPos(), m.getToPos(), m.getMessage(), m.getSuggestedReplacements()]));
    const expected = key(new JLanguageTool(language).check(SAMPLE_TEXT));
    const results = await Promise.all(Array.from({ length: 8 }, async () => key(new JLanguageTool(language).check(SAMPLE_TEXT))));
    for (const r of results) expect(r).toBe(expected);
  }, LONG);
});
