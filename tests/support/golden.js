// Test helpers: read golden fixtures (read-only).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// parsed lines of tests/golden/<id>/<name>/<file>.jsonl
export function readGoldenJsonl(id, name, file = 'responses.jsonl') {
  const text = readFileSync(path.join(ROOT, 'tests/golden', id, name, file), 'utf8');
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
