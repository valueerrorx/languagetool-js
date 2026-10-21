// Ported from AbstractLanguageConcurrencyTest and the six English *ConcurrencyTest subclasses (en module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { AmericanEnglish } from '../../../src/lang/en/language/AmericanEnglish.js';
import { BritishEnglish } from '../../../src/lang/en/language/BritishEnglish.js';
import { CanadianEnglish } from '../../../src/lang/en/language/CanadianEnglish.js';
import { AustralianEnglish } from '../../../src/lang/en/language/AustralianEnglish.js';
import { NewZealandEnglish } from '../../../src/lang/en/language/NewZealandEnglish.js';
import { SouthAfricanEnglish } from '../../../src/lang/en/language/SouthAfricanEnglish.js';

const SAMPLE_TEXT = "A sentence with a error in the Hitchhiker's Guide tot he Galaxy";

// Java: AbstractLanguageConcurrencyTest#testSpellCheckerFailure (threads run sequentially in JS)
function spellCheckerFailure(createLanguage, threadCount, testRuns) {
  const language = createLanguage();
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

const variants = {
  AmericanEnglishConcurrencyTest: () => AmericanEnglish.getInstance(),
  AustralianEnglishConcurrencyTest: () => new AustralianEnglish(),
  BritishEnglishConcurrencyTest: () => BritishEnglish.getInstance(),
  CanadianEnglishConcurrencyTest: () => CanadianEnglish.getInstance(),
  NewZealandEnglishConcurrencyTest: () => new NewZealandEnglish(),
  SouthAfricanEnglishConcurrencyTest: () => new SouthAfricanEnglish(),
};

for (const [name, create] of Object.entries(variants)) {
  describe(name, () => {
    // Java: @Ignore("too slow to run every time") testSpellCheckerFailure: 10 x availableProcessors threads x 100 runs
    it.skip('testSpellCheckerFailure', () => {
      spellCheckerFailure(create, 10, 100);
    });
    // reduced sequential-equivalent check (1 thread x 2 runs)
    it('testSpellCheckerFailure (reduced, sequential)', () => {
      spellCheckerFailure(create, 1, 2);
    });
  });
}
