// JS twin of harness op "check" (ContentOps#check).
import { run as runCheck, tool, results } from './_content-common.mjs';

export { beginCase } from './_content-common.mjs';

// Java: ContentOps#check(JsonNode)
export function run(a) {
  const lt = tool(a);
  return results(runCheck(lt, a.text, a));
}
