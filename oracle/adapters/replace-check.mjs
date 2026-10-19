// JS twin of harness op "replace-check" (ReplaceOps#check, docs/review/F37-oracle.md); F37 classes are not ported yet.
import { notPorted } from './_pipe-common.mjs';

// Java: ReplaceOps#check(JsonNode)
export function run(a) {
  throw notPorted(`replace-check: mode ${a.mode ?? 'rules'} (F37 rule classes / AhoCorasickDoubleArrayTrie / ConfusionSetLoader / ShortDescriptionProvider not ported)`);
}
