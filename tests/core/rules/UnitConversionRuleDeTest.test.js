// Ported from UnitConversionRuleTest (de module)
import { describe, it, beforeAll, afterAll } from 'vitest';
import { NoopChunker } from '../../../src/core/noop/NoopChunker.js';
import { Languages } from '../../../src/core/Languages.js';
import { getMessageBundleForLanguage } from '../../../src/core/resources/ResourceBundleTools.js';
import { UnitConversionRule } from '../../../src/lang/de/rules/UnitConversionRule.js';
import { UnitConversionRuleTestHelper } from '../../support/UnitConversionRuleTestHelper.js';
import { newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

const de = Languages.getLanguageForShortCode('de');
useNoopAnalysis(de);
// the German post-disambiguation chunker (GermanChunker, F44) is not ported; the rule reads the sentence text only
let savedPost;
beforeAll(() => {
  savedPost = de.postDisambiguationChunker;
  de.postDisambiguationChunker = new NoopChunker();
});
afterAll(() => {
  de.postDisambiguationChunker = savedPost;
});

describe('UnitConversionRuleTest (de)', () => {
  const unitConversionRuleTestHelper = new UnitConversionRuleTestHelper();
  const assertMatches = (input, expectedMatches, converted, rule, lt) => unitConversionRuleTestHelper.assertMatches(input, expectedMatches, converted, rule, lt);

  // Java: UnitConversionRuleTest#match
  it('match', () => {
    const lt = newLt(de);
    const rule = new UnitConversionRule(getMessageBundleForLanguage(de));
    assertMatches('Ich bin 6 Fuß groß.', 1, '1,83 Meter', rule, lt);
    assertMatches('Ich bin 6 Fuß (2,02 m) groß.', 1, '1,83 Meter', rule, lt);
    assertMatches('Ich bin 6 Fuß (1,82 m) groß.', 0, null, rule, lt);
    assertMatches('Der Kostenvoranschlag hatte eine Höhe von 1.800 Pfund Sterling.', 0, null, rule, lt);
    assertMatches('Der Weg ist 100 Meilen lang.', 1, '160,93 Kilometer', rule, lt);
    assertMatches('Der Weg ist 10 km (20 Meilen) lang.', 1, '6,21', rule, lt);
    assertMatches('Der Weg ist 10 km (6,21 Meilen) lang.', 0, null, rule, lt);
    assertMatches('Der Weg ist 100 Meilen (160,93 Kilometer) lang.', 0, null, rule, lt);
    assertMatches('Die Ladung ist 10.000,75 Pfund schwer.', 1, '4,54 Tonnen', rule, lt);
    assertMatches('Sie ist 5\'6" groß.', 1, '1,68 m', rule, lt);
    assertMatches('Meine neue Wohnung ist 500 sq ft groß.', 1, '46,45 Quadratmeter', rule, lt);
    assertMatches("Zwischen 330'000 und 500'000/600", 0, null, rule, lt);
  });
});
