// Ported from UnitConversionRuleTest, UnitConversionRuleImperialTest and UnitConversionRuleUSTest (en module)
import { describe, it } from 'vitest';
import { Languages } from '../../../src/core/Languages.js';
import { getMessageBundleForLanguage } from '../../../src/core/resources/ResourceBundleTools.js';
import { UnitConversionRule } from '../../../src/lang/en/rules/UnitConversionRule.js';
import { UnitConversionRuleImperial } from '../../../src/lang/en/rules/UnitConversionRuleImperial.js';
import { UnitConversionRuleUS } from '../../../src/lang/en/rules/UnitConversionRuleUS.js';
import { UnitConversionRuleTestHelper } from '../../support/UnitConversionRuleTestHelper.js';
import { newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

const en = Languages.getLanguageForShortCode('en');
const enGB = Languages.getLanguageForShortCode('en-GB');
const enUS = Languages.getLanguageForShortCode('en-US');
useNoopAnalysis(en, enGB, enUS);

describe('UnitConversionRuleTest (en)', () => {
  const helper = new UnitConversionRuleTestHelper();

  // Java: UnitConversionRuleTest#match
  it('match', () => {
    const lt = newLt(en);
    const rule = new UnitConversionRule(getMessageBundleForLanguage(en));
    helper.assertMatches('I am 6 feet tall.', 1, '1.83 m', rule, lt);
    helper.assertMatches('I am 6 feet (2.02 m) tall.', 1, '1.83 m', rule, lt);
    helper.assertMatches('I am 6 feet (1.82 m) tall.', 0, null, rule, lt);
    helper.assertMatches('Heat up to 18 °C (64.4 °F).', 0, null, rule, lt);
    helper.assertMatches('Heat up to 18 °C (64.4 °F).', 0, null, rule, lt);
    helper.assertMatches('Heat up to 18 °C (64.4 °F).', 0, null, rule, lt);
    helper.assertMatches('The path is 100 miles long.', 1, '160.93 km', rule, lt);
    helper.assertMatches('The path is 100 miles (160.93 km) long.', 0, null, rule, lt);
    helper.assertMatches('The shipment weighs 10,000.75 pounds.', 1, '4.54 t', rule, lt);
    helper.assertMatches('She is 5\'6".', 1, '1.68 m', rule, lt);
    helper.assertMatches('My new apartment is 500 sq ft.', 1, '46.45 m²', rule, lt);
    helper.assertMatches('It is 100 degrees Fahrenheit outside.', 1, '37.78 °C', rule, lt);
    helper.assertMatches('It is 100 °F outside.', 1, '37.78 °C', rule, lt);
    helper.assertMatches('It is -22 °F outside.', 1, '-30 °C', rule, lt);
    helper.assertMatches('It is -22 degrees Fahrenheit outside.', 1, '-30 °C', rule, lt);

    // https://github.com/languagetool-org/languagetool/issues/2357
    helper.assertMatches("Millions watched the 1989's Superbowl.", 0, null, rule, lt);

    // https://github.com/languagetool-org/languagetool/issues/2255
    helper.assertMatches('Coordinates: 34°09′22″N 118°7′55″W', 0, null, rule, lt);
  });
});

describe('UnitConversionRuleImperialTest', () => {
  const helper = new UnitConversionRuleTestHelper();

  // Java: UnitConversionRuleImperialTest#match
  it('match', () => {
    const lt = newLt(enGB);
    const rule = new UnitConversionRuleImperial(getMessageBundleForLanguage(enGB));
    helper.assertMatches('I just drank 3 pints.', 1, '1.7 l', rule, lt);
    helper.assertMatches('I am 6 feet (2.02 m) tall.', 1, '1.83 metres', rule, lt);
  });
});

describe('UnitConversionRuleUSTest', () => {
  const helper = new UnitConversionRuleTestHelper();

  // Java: UnitConversionRuleUSTest#match
  it('match', () => {
    const lt = newLt(enUS);
    const rule = new UnitConversionRuleUS(getMessageBundleForLanguage(enUS));
    helper.assertMatches('I just drank 3 pints.', 1, '1.42 l', rule, lt);
    helper.assertMatches('I am 6 feet (2.02 m) tall.', 1, '1.83 meters', rule, lt);
    helper.assertMatches('16 kilometers (10 miles)', 1, null, rule, lt);
    helper.assertMatches('16 kilometers (ca. 10 miles)', 0, null, rule, lt);
    helper.assertMatches('16 kilometers (9.94 mi)', 0, null, rule, lt);
    // matched by antipattern;
    helper.assertMatches('Use 3-5 pounds of butter.', 0, null, rule, lt);
    helper.assertMatches("It's 1/4 mile away", 0, null, rule, lt);
    helper.assertMatches('A 2:1 cup', 0, null, rule, lt);
    helper.assertMatches('1⁄4 cup', 0, null, rule, lt);
    // matched by special case in the case as long as "x ft y inch" is not parsed properly:
    helper.assertMatches('It is 0.76 metres (2 ft 6 inch)', 0, null, rule, lt);
  });
});
