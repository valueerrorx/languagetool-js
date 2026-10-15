// JS twin of harness op "lang-typo" (MetaOps#typo).
import { lang, safe } from './_meta-common.mjs';

// Java: MetaOps#typo(JsonNode)
export function run(a) {
  const l = lang(a);
  return a.strings.map((s) => safe(() => l.toAdvancedTypography(String(s))));
}
