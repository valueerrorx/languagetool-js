// Ported from AbstractLanguageConcurrencyTest and SlovakConcurrencyTest (sk module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Slovak } from '../../../src/lang/sk/language/Slovak.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java sk module tests run without the en module on the classpath

const LONG = 3600000;
const SAMPLE_TEXT = 'Wikipédia neobsahuje článok s takýmto názvom.';

// Java: AbstractLanguageConcurrencyTest#testSpellCheckerFailure (threads run sequentially in JS)
function spellCheckerFailure(threadCount, testRuns) {
  const language = new Slovak();
  let failedTests = 0;
  for (let t = 0; t < threadCount; t++) {
    for (let i = 0; i < testRuns; i++) {
      try {
        const tool = new JLanguageTool(language);
        expect(tool.check(SAMPLE_TEXT)).not.toBeNull();
      } catch (e) {
        failedTests += 1;
        throw new Error(String(e), { cause: e });
      }
    }
  }
  expect(failedTests).toBe(0);
}

describe('SlovakConcurrencyTest', () => {
  // JUnit: SlovakConcurrencyTest#testSpellCheckerFailure (@Ignore "too slow to run every time": 10 x availableProcessors threads x 100 runs)
  it.skip('testSpellCheckerFailure', () => {
    spellCheckerFailure(10, 100);
  });

  // JUnit: SlovakConcurrencyTest#testSpellCheckerFailure (reduced, sequential: 1 thread x 2 runs)
  it('testSpellCheckerFailure (reduced, sequential)', () => {
    spellCheckerFailure(1, 2);
  }, LONG);

  // JUnit: SlovakConcurrencyTest#testSpellCheckerFailure (parallel checks give identical results, SK/SL concurrency inventory)
  it('parallel checks give identical results', async () => {
    const language = new Slovak();
    const key = (ms) => JSON.stringify(ms.map((m) => [m.getRule().getId(), m.getFromPos(), m.getToPos(), m.getMessage(), m.getSuggestedReplacements()]));
    const expected = key(new JLanguageTool(language).check(SAMPLE_TEXT));
    const results = await Promise.all(Array.from({ length: 8 }, async () => key(new JLanguageTool(language).check(SAMPLE_TEXT))));
    for (const r of results) expect(r).toBe(expected);
  }, LONG);
});
