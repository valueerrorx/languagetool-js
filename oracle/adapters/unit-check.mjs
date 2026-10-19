// JS twin of harness op "unit-check" (StyleOps#check on the unit conversion rules, docs/review/F38-oracle.md).
import { run as styleRun } from './style-check.mjs';
import { f37Rules } from './replace-check.mjs';
import { Example } from '../../src/core/rules/model/Examples.js';
import { getUrl } from '../../src/core/Tools.js';
import { UppercaseSentenceStartRule } from '../../src/core/rules/UppercaseSentenceStartRule.js';
import { EnglishUnpairedBracketsRule } from '../../src/lang/en/rules/EnglishUnpairedBracketsRule.js';
import { EnglishSpecificCaseRule } from '../../src/lang/en/rules/EnglishSpecificCaseRule.js';
import { UnitConversionRuleUS } from '../../src/lang/en/rules/UnitConversionRuleUS.js';
import { UnitConversionRuleImperial } from '../../src/lang/en/rules/UnitConversionRuleImperial.js';
import { UnitConversionRule as DeUnitConversionRule } from '../../src/lang/de/rules/UnitConversionRule.js';

// Java: AmericanEnglish/BritishEnglish/CanadianEnglish/AustralianEnglish/NewZealandEnglish#getRelevantRules and German#getRelevantRules (unit conversion rule position)
function f38Rules(l, m, uc, natives) {
  const code = l.getShortCode();
  const full = l.getShortCodeWithCountryAndVariant();
  const out = f37Rules(l, m, uc, natives);
  if (code === 'en') {
    // English#getRelevantRules: UppercaseSentenceStartRule near the list start, EnglishUnpairedBracketsRule after EnglishSpecificCaseRule (used by the unit-levels case)
    out.unshift(new UppercaseSentenceStartRule(m, l,
      Example.wrong('This house is old. <marker>it</marker> was built in 1950.'),
      Example.fixed('This house is old. <marker>It</marker> was built in 1950.'),
      getUrl('https://languagetool.org/insights/post/spelling-capital-letters/')));
    out.splice(out.findIndex((r) => r instanceof EnglishSpecificCaseRule) + 1, 0, new EnglishUnpairedBracketsRule(m, l));
    if (full === 'en-US') out.push(new UnitConversionRuleUS(m));
    else if (['en-GB', 'en-CA', 'en-AU', 'en-NZ'].includes(full)) out.push(new UnitConversionRuleImperial(m));
  } else if (code === 'de') {
    out.push(new DeUnitConversionRule(m));
  }
  return out;
}

// Java: StyleOps#check(JsonNode)
export function run(a) {
  return styleRun(a, f38Rules);
}
