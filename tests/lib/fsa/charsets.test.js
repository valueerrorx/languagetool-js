import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { forName } from '../../../src/lib/fsa/charsets.js';
import { ByteSequenceIterator } from '../../../src/lib/fsa/FSA.js';
import { Dictionary, DictionaryLookup } from '../../../src/lib/fsa/DictionaryLookup.js';

const RES = '/home/valueerror/STUFF/DEV/LanguageTool/languagetool/languagetool-language-modules';
const all = Uint8Array.from({ length: 256 }, (_, i) => i);

describe('single-byte charsets', () => {
  for (const [name, label, aliases] of [
    ['ISO-8859-2', 'iso-8859-2', ['iso-8859-2', 'ISO8859_2', 'latin2', 'L2']],
    ['ISO-8859-15', 'iso-8859-15', ['iso-8859-15', 'ISO8859_15', 'latin9', 'Latin-9']],
    ['KOI8-R', 'koi8-r', ['koi8-r', 'KOI8_R', 'koi8']],
  ]) {
    it(`${name} round-trips all 256 bytes and matches TextDecoder`, () => {
      const cs = forName(name);
      const s = cs.decode(all, 0, 256);
      expect(s).toBe(new TextDecoder(label).decode(all));
      const out = new Uint8Array(256);
      expect(cs.encodeInto(s, out)).toBe(256);
      expect(Array.from(out)).toEqual(Array.from(all));
      expect(cs.maxBytesPerChar).toBe(1);
      for (const a of aliases) expect(forName(a)).toBe(cs);
      expect(cs.name()).toBe(name);
    });
  }
  it('unmappable char throws', () => {
    expect(() => forName('KOI8-R').encodeInto('ä', new Uint8Array(4))).toThrow();
  });
});

describe('real dictionaries', () => {
  const load = (lang, base, sub = '') => {
    const d = `${RES}/${lang}/src/main/resources/org/languagetool/resource/${lang}/${sub}${base}`;
    return Dictionary.readImages(readFileSync(`${d}.dict`), readFileSync(`${d}.info`));
  };
  it('decodes raw FSA sequences of sl (ISO-8859-2), it (ISO-8859-15), ru (KOI8-R)', () => {
    for (const [lang, base, sub, cs] of [['sl', 'sl_SI', 'hunspell/', 'ISO-8859-2'], ['it', 'italian', '', 'ISO-8859-15'], ['ru', 'russian', '', 'KOI8-R']]) {
      const dict = load(lang, base, sub);
      expect(dict.metadata.charset.name()).toBe(cs);
      const it = new ByteSequenceIterator(dict.fsa, dict.fsa.getRootNode());
      let n = 0;
      let nonAscii = 0;
      while (it.hasNext() && n < 50000) {
        const len = it.next();
        const w = dict.metadata.charset.decode(it.buffer, 0, len);
        expect(w).not.toContain('\ufffd');
        if (/[^\x00-\x7f]/.test(w)) nonAscii++;
        n++;
      }
      expect(n).toBeGreaterThan(0);
      if (lang !== 'it') expect(nonAscii).toBeGreaterThan(0);
    }
  });
  it('looks up known words', () => {
    const ru = new DictionaryLookup(load('ru', 'russian'));
    expect(ru.lookup('дом').length).toBeGreaterThan(0);
    const it = new DictionaryLookup(load('it', 'italian'));
    expect(it.lookup('perché').length).toBeGreaterThan(0);
  });
});
