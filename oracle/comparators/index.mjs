// Comparators of docs/ORACLE.md section 3. Harness comparators take (expectedEnvelopeLines, actualEnvelopeLines);
// cli/http comparators take the case result objects (see compareResult).
import { isDeepStrictEqual } from 'node:util';
import { compareCheck, compareEnvelope } from './check.mjs';
import { compareAnalyze } from './analyze.mjs';
import { compareRuleExamples, compareDisambiguationExamples, compareRulesList } from './examples.mjs';
import { compareApi } from './api.mjs';
import { compareCli } from './cli.mjs';

// jsonl: per line deep-equal after parsing; doubles are strings (text + bits) in the protocol.
export function compareJsonl(expectedLines, actualLines) {
  const diffs = [];
  const n = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < n; i++) {
    const e = expectedLines[i];
    const a = actualLines[i];
    if (e === undefined || a === undefined || !isDeepStrictEqual(e, a)) {
      diffs.push(`line ${i + 1}\n- ${JSON.stringify(e)}\n+ ${JSON.stringify(a)}`);
    }
  }
  return diffs;
}

const RESULT = {
  check: compareCheck,
  analyze: compareAnalyze,
  'rule-examples': compareRuleExamples,
  'disambiguation-examples': compareDisambiguationExamples,
  'rules-list': compareRulesList,
};

function envelopeComparator(resultCmp) {
  return (expectedLines, actualLines) => {
    const diffs = [];
    if (expectedLines.length !== actualLines.length) diffs.push(`responses: count ${expectedLines.length} != ${actualLines.length}`);
    for (let i = 0; i < Math.min(expectedLines.length, actualLines.length); i++) {
      for (const d of compareEnvelope(expectedLines[i], actualLines[i], resultCmp)) diffs.push(`id ${expectedLines[i].id}: ${d}`);
    }
    return diffs;
  };
}

// Result comparators for non-harness kinds
export const KIND_COMPARATORS = { api: compareApi, cli: compareCli };

export async function getComparator(name) {
  if (name === 'jsonl' || name === 'bytes') return compareJsonl;
  if (RESULT[name]) return envelopeComparator(RESULT[name]);
  if (name === 'api') return compareApi;
  if (name === 'cli') return compareCli;
  if (name.startsWith('structure:')) {
    const f = new URL(`../../tests/parity/comparators/${name.slice(10)}.mjs`, import.meta.url);
    try {
      return (await import(f.href)).default;
    } catch {
      throw new Error(`comparator ${name} not available (${f.pathname})`);
    }
  }
  throw new Error(`unknown comparator ${name}`);
}
