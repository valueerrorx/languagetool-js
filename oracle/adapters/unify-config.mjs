// JS twin of harness op "unify-config" (UnifyOps#config): UnifierConfiguration dumps in Java map iteration order.
import { resetState, lang, preload, inline } from './_unify-common.mjs';

// Java: UnifyOps#cfgDump(UnifierConfiguration)
function cfgDump(c) {
  const features = c.getEquivalenceFeatures().entrySet().map(([k, v]) => [k, Array.from(v)]);
  const types = c.getEquivalenceTypes().entrySet().map(([k, p]) => [k.feature, k.type, p.getString(), p.getPOStag(), p.isInflected(), p.getNegation(), p.getPOSNegation()]);
  return { features, types };
}

// Java: UnifyOps#config(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  if (a.xml !== undefined) inline(l, a.xml);
  else await preload(l, a.disamb === true);
  return { grammar: cfgDump(l.getUnifierConfiguration()), disamb: cfgDump(l.getDefaultLanguageVariant().getDisambiguationUnifierConfiguration()) };
}

// parity hook: fresh state per case file (Java: one JVM per case)
export function beginCase() { resetState(); }
