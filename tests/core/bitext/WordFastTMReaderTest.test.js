// Ported from WordFastTMReaderTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WordFastTMReader } from '../../../src/core/bitext/WordFastTMReader.js';

describe('WordFastTMReaderTest', () => {
  // Java: WordFastTMReaderTest#testReader
  it('testReader', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-wf-'));
    const input = path.join(dir, 'input.txt');
    try {
      writeFileSync(input, [
        '%20100801~111517\t%UserID,AHLJat,AHLJat\t%TU=00008580\t%EN-US\t%Wordfast TM v.546/00\t%PL-PL\t%\t.',
        '20100727~145333\tAHLJat\t2\tEN-US\tObjection:\tPL-PL\tZarzut: ',
        '20100727~051350\tAHLJat\t2\tEN-US\tWhy not?&tA;\tPL-PL\tDlaczego nie?&tA; ',
      ].map((l) => l + '\n').join(''), 'utf8');
      const reader = new WordFastTMReader(input, 'UTF-8');
      const it2 = reader.iterator();
      let i = 1;
      while (it2.hasNext()) {
        const srcAndTrg = it2.next();
        expect(srcAndTrg.getSource() !== null).toBe(true);
        expect(srcAndTrg.getTarget() !== null).toBe(true);
        if (i === 1) {
          expect(srcAndTrg.getSource()).toBe('Objection:');
        } else if (i === 2) {
          expect(srcAndTrg.getSource()).toBe('Why not?&tA;');
        }
        i++;
      }
      expect(i).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
