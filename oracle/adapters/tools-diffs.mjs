// JS twin of harness op "tools-diffs" (ToolsOps#diffs, docs/review/F40-oracle.md).
import { DiffsAsMatches } from '../../src/core/tools/DiffsAsMatches.js';
import { errorOf } from './_check-pipe-common.mjs';

// Java: ToolsOps#diffs(JsonNode)
export function run(a) {
  const out = [];
  for (const p of a.pairs) {
    const r = { orig: p.orig, rev: p.rev };
    try {
      const d = new DiffsAsMatches();
      const ms = d.getPseudoMatches(p.orig, p.rev);
      r.matches = ms.map((m) => [m.getFromPos(), m.getToPos(), m.getReplacements(), m.getReplacement(), m.toString()]);
      if (p.joins !== undefined) {
        r.joined = p.joins.map((j) => {
          const jm = d.getJoinedMatch(ms, p.orig, j[0], j[1]);
          return jm === null ? null : [jm.getFromPos(), jm.getToPos(), jm.getReplacements()];
        });
      }
    } catch (t) {
      r.error = errorOf(t);
    }
    out.push(r);
  }
  return out;
}
