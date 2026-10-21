// JS twin of harness op "exec-pipeline-settings" (LtjsBridge#pipelineSettings, SRV-0150): equals/hashCode matrices of PipelineSettings.
import { settings } from './_exec-common.mjs';

// Java: LtjsBridge#pipelineSettings(JsonNode)
export function run(a) {
  const ss = a.settings.map((s) => settings(s));
  const eq = [];
  const hc = [];
  for (const x of ss) {
    eq.push(ss.map((y) => x.equals(y)));
    hc.push(ss.map((y) => x.hashCode() === y.hashCode()));
  }
  return { equals: eq, hashEqual: hc };
}
