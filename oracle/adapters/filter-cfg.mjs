// JS twin of harness op "filter-cfg" (FilterOps#filterCfg): registers a named filter configuration for the case file.
import { CFG } from './_filters-common.mjs';

// Java: FilterOps#filterCfg(JsonNode)
export function run(a) {
  CFG.set(a.name, a.cfg);
  return 'ok';
}
