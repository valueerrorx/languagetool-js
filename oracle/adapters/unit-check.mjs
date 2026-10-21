// JS twin of harness op "unit-check" (StyleOps#check on the unit conversion rules, docs/review/F38-oracle.md).
import { run as styleRun } from './style-check.mjs';

// Java: StyleOps#check(JsonNode)
export function run(a) {
  return styleRun(a);
}
