// Ported from GermanCompoundTokenizerTest (languagetool-language-modules/de); class pulled forward from F23 for the German tagger
import { describe, it, expect } from 'vitest';
import { GermanCompoundTokenizer } from '../../../src/lang/de/tokenizers/GermanCompoundTokenizer.js';
import { InputTooLongException } from '../../../src/lib/wordsplitter/InputTooLongException.js';
import { German } from '../../../src/lang/de/language/German.js';
import { GermanWordSplitter } from '../../../src/lib/wordsplitter/GermanWordSplitter.js';

// Java: List#toString() of a List<String>
const ls = (l) => `[${l.join(', ')}]`;

describe('GermanCompoundTokenizerTest', () => {
  // Java: GermanCompoundTokenizerTest#test()
  it('test', () => {
    const tokenizer = new GermanCompoundTokenizer(true);
    expect(ls(tokenizer.tokenize('Bahnhofsuhr'))).toBe('[Bahnhofs, uhr]');
    expect(ls(tokenizer.tokenize('natofreundlich'))).toBe('[nato, freundlich]');
    expect(ls(tokenizer.tokenize('natofreundliches'))).toBe('[nato, freundliches]');
    expect(ls(tokenizer.tokenize('Firefox-Add-on'))).toBe('[Firefox, , Add-on]'); // why the space?
  });

  // Java: GermanCompoundTokenizerTest#testInteractively() is @Ignore'd (interactive use only)
  it.skip('testInteractively', () => {});

  // extra: InputTooLongException is mapped to the unsplit word; splitter edge cases (jwordsplitter 4.7 semantics)
  it('splitterEdges', () => {
    const tokenizer = GermanCompoundTokenizer.getStrictInstance();
    const long = 'a'.repeat(71);
    expect(tokenizer.tokenize(long)).toEqual([long]);
    expect(tokenizer.tokenize(null)).toEqual([]);
    const splitter = new GermanWordSplitter(false);
    expect(() => splitter.splitWord(long)).toThrow(InputTooLongException);
    try {
      splitter.splitWord(long);
    } catch (e) {
      expect(e.getMessage()).toBe(`Input too long (71 characters), maximum is 70 characters to avoid potentially long processing times: '${long}'`);
    }
    expect(ls(splitter.splitWord('Verkehrsamt'))).toBe('[Verkehrs, amt]');
    expect(GermanCompoundTokenizer.getNonStrictInstance().tokenize('Haustür')).toEqual(['Haus', 'tür']);
  });

  // extra: German#getStrictCompoundTokenizer / getNonStrictCompoundSplitter (memoised instances, fresh lists)
  it('germanAccessors', () => {
    const g = new German();
    expect(g.getStrictCompoundTokenizer()).toBe(GermanCompoundTokenizer.getStrictInstance());
    const r1 = g.getNonStrictCompoundSplitter().tokenize('Haustür');
    expect(r1).toEqual(['Haus', 'tür']);
    expect(g.getNonStrictCompoundSplitter().tokenize('Haustür')).not.toBe(r1);
  });

  // extra: GermanCompoundTokenizer#main
  it('main', () => {
    let out = '';
    GermanCompoundTokenizer.main(['Haustür', 'Xyzzy'], (t) => { out += t; });
    expect(out).toBe('[Haus, tür]\n[Xyzzy]\n');
    out = '';
    let code = null;
    GermanCompoundTokenizer.main([], (t) => { out += t; }, (c) => { code = c; });
    expect(out).toBe('Usage: GermanCompoundTokenizer <wordsToSplit... or file>\n');
    expect(code).toBe(1);
  });

  // extra: jwordsplitter String bounds and null handling
  it('boundsAndNull', () => {
    const splitter = new GermanWordSplitter(false);
    expect(() => splitter.getAllSplits(null)).toThrow('Cannot invoke "String.length()" because "word" is null');
    splitter.setMinimumWordLength(-1);
    expect(() => splitter.splitWord('Haustür')).toThrow('begin 0, end 8, length 7');
  });
});
