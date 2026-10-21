// JS twin of harness op "unit-check" (StyleOps#check on the unit conversion rules, docs/review/F38-oracle.md).
import { run as styleRun } from './style-check.mjs';
import { f37Rules } from './replace-check.mjs';

// Java: AmericanEnglish/BritishEnglish/CanadianEnglish/AustralianEnglish/NewZealandEnglish#getRelevantRules and German#getRelevantRules (unit conversion rule position; the base list incl. UppercaseSentenceStartRule is f37Rules)
function f38Rules(l, m, uc, natives) {
  const out = f37Rules(l, m, uc, natives);
  return out;
}

// Java: StyleOps#check(JsonNode)
export function run(a) {
  return styleRun(a, f38Rules);
}
