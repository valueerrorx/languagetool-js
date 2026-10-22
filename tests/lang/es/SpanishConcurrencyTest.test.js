// Ported from AbstractLanguageConcurrencyTest and SpanishConcurrencyTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../src/lang/es/language/Spanish.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java es module tests run without the en module on the classpath

const LONG = 3600000;
const SAMPLE_TEXT = 'También puede que la página que buscas haya sido borrada.';

describe('SpanishConcurrencyTest', () => {
  // JUnit: AbstractLanguageConcurrencyTest#testSpellCheckerFailure (reduced, sequential)
  it('testSpellCheckerFailure (reduced, sequential)', () => {
    const language = Spanish.getInstance();
    for (let i = 0; i < 2; i++) expect(new JLanguageTool(language).check(SAMPLE_TEXT)).not.toBeNull();
  }, LONG);

  // JUnit: SpanishConcurrencyTest (parallel checks give identical results, ES-0113)
  it('parallel checks give identical results', async () => {
    const language = Spanish.getInstance();
    const key = (ms) => JSON.stringify(ms.map((m) => [m.getRule().getId(), m.getFromPos(), m.getToPos(), m.getMessage(), m.getSuggestedReplacements()]));
    const expected = key(new JLanguageTool(language).check(SAMPLE_TEXT));
    const results = await Promise.all(Array.from({ length: 8 }, async () => key(new JLanguageTool(language).check(SAMPLE_TEXT))));
    for (const r of results) expect(r).toBe(expected);
  }, LONG);
});
