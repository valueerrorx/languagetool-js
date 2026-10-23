// I06: files on the exclude list are absent from resources/, and language detection finds all the profiles it asks for
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../src/lang/register.js';
import { EXCLUDES, isExcluded } from '../../scripts/lib/resource-excludes.mjs';
import { getLanguageCodes } from '../../src/core/language/identifier/DefaultLanguageIdentifier.js';

const RES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../resources');
const manifest = readFileSync(path.join(RES, 'MANIFEST.sha256'), 'utf8').split('\n').filter((l) => l !== '').map((l) => l.slice(66));

describe('resource exclude list (I06)', () => {
  it('every group has a reason and entries', () => {
    for (const g of EXCLUDES) {
      expect(g.reason.length).toBeGreaterThan(10);
      expect(g.entries.length).toBeGreaterThan(0);
    }
  });

  it('no excluded file is present in resources/', () => {
    for (const g of EXCLUDES) {
      for (const e of g.entries) {
        if (!e.endsWith('/') && !e.includes('*')) expect(existsSync(path.join(RES, e)), e).toBe(false);
      }
    }
    expect(manifest.filter((rel) => isExcluded(rel))).toEqual([]);
    expect(existsSync(path.join(RES, 'languages.shorttext'))).toBe(false);
  });

  it('language detection finds a profile for every code it loads', () => {
    for (const code of getLanguageCodes()) expect(existsSync(path.join(RES, 'languages', code)), code).toBe(true);
  });
});
