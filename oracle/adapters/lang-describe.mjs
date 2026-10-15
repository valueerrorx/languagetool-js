// JS twin of harness op "lang-describe" (LangOps#describeOp).
import { Languages } from '../../src/core/Languages.js';
import { langResult, safe } from './_lang-common.mjs';

// Java: LangOps#describeOp(JsonNode)
export function run(a) {
  const level = a.level ?? 2;
  return a.codes.map((c) => safe(() => langResult(Languages.getLanguageForShortCode(String(c)), level)));
}
