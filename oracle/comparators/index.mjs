// Comparators of docs/ORACLE.md section 4/9. structure:* live in tests/parity/comparators/ (not written yet).
import { isDeepStrictEqual } from 'node:util';

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

export async function getComparator(name) {
  if (name === 'jsonl' || name === 'bytes') return compareJsonl;
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
