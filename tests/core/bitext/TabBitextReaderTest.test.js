// Ported from TabBitextReaderTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TabBitextReader } from '../../../src/core/bitext/TabBitextReader.js';

describe('TabBitextReaderTest', () => {
  // Java: TabBitextReaderTest#testReader
  it('testReader', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-tab-'));
    const input = path.join(dir, 'inputtxt');
    try {
      writeFileSync(input, 'This is not actual.\tTo nie jest aktualne.\nTest\tTest\nab\tVery strange data indeed, much longer than input\n', 'utf8');
      const reader = new TabBitextReader(input, 'UTF-8');
      const it2 = reader.iterator();
      let i = 1;
      while (it2.hasNext()) {
        const srcAndTrg = it2.next();
        expect(srcAndTrg.getSource() !== null).toBe(true);
        expect(srcAndTrg.getTarget() !== null).toBe(true);
        if (i === 1) {
          expect(srcAndTrg.getSource()).toBe('This is not actual.');
        } else if (i === 2) {
          expect(srcAndTrg.getSource()).toBe('Test');
        } else if (i === 3) {
          expect(srcAndTrg.getTarget()).toBe('Very strange data indeed, much longer than input');
        }
        i++;
      }
      expect(i).toBe(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
