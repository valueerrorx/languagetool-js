// JS twin of harness op "srx-segment" (SrxOps#srxSegment): SrxTools.createSrxDocument/tokenize with the production parameters.
import { createSrxDocument, tokenize } from '../../src/core/text/tokenizers/SrxTools.js';
import { safe, str } from './_text-common.mjs';

// Java: SrxOps#srxSegment(JsonNode)
export function run(a) {
  let d;
  try {
    d = createSrxDocument(a.srx);
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    return safe(() => { throw t; });
  }
  const code = str(a.code);
  return a.texts.map((t) => safe(() => tokenize(str(t), d, code)));
}
