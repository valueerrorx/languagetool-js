// JS twin of harness op "wordsplit" (WordSplitOps#wordsplit).
import '../../src/lang/register.js';
import { GermanWordSplitter } from '../../src/lib/wordsplitter/GermanWordSplitter.js';
import { GermanCompoundTokenizer } from '../../src/lang/de/tokenizers/GermanCompoundTokenizer.js';
import { German } from '../../src/lang/de/language/German.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { safe, str } from './_text-common.mjs';

const notPorted = (what) => Object.assign(new Error(`${what} not ported`), { notPorted: true });

// Java: WordSplitOps#identity()
function identity() {
  const g = new German();
  const r1 = g.getNonStrictCompoundSplitter().tokenize('Haustür');
  const r2 = g.getNonStrictCompoundSplitter().tokenize('Haustür');
  return {
    strictSame: GermanCompoundTokenizer.getStrictInstance() === GermanCompoundTokenizer.getStrictInstance(),
    nonStrictSame: GermanCompoundTokenizer.getNonStrictInstance() === GermanCompoundTokenizer.getNonStrictInstance(),
    strictNotNonStrict: GermanCompoundTokenizer.getStrictInstance() !== GermanCompoundTokenizer.getNonStrictInstance(),
    ctorNotInstance: new GermanCompoundTokenizer(true) !== GermanCompoundTokenizer.getStrictInstance(),
    germanStrictIsInstance: g.getStrictCompoundTokenizer() === GermanCompoundTokenizer.getStrictInstance(),
    nonStrictResultFresh: r1 !== r2,
    nonStrictResult: r1,
  };
}

// Java: WordSplitOps#wordsplit(JsonNode)
export function run(a) {
  const impl = a.impl;
  if (impl === 'identity') return identity();
  if (impl === 'main') throw notPorted('GermanCompoundTokenizer#main');
  if (impl === 'ws') {
    const hide = a.hide === true;
    const ws = a.customWords !== undefined ? new GermanWordSplitter(hide, new Set(a.customWords)) : new GermanWordSplitter(hide);
    if (a.strict !== undefined) ws.setStrictMode(a.strict);
    if (a.min !== undefined) ws.setMinimumWordLength(a.min);
    if (a.max !== undefined) ws.setMaximumWordLength(a.max);
    if (a.exceptions !== undefined) for (const [k, v] of Object.entries(a.exceptions)) ws.addException(k, v);
    const method = a.method ?? 'splitWord';
    return a.words.map((w) => safe(() => {
      const s = str(w);
      switch (method) {
        case 'splitWord': return ws.splitWord(s);
        case 'splitWordSub': return ws.splitWord(s, true);
        case 'getAllSplits': return ws.getAllSplits(s);
        case 'getSubWords': return ws.getSubWords(s);
        default: throw new IllegalArgumentException(`unknown method: ${method}`);
      }
    }));
  }
  let tok;
  switch (impl) {
    case 'tok-strict': tok = GermanCompoundTokenizer.getStrictInstance(); break;
    case 'tok-nonstrict': tok = GermanCompoundTokenizer.getNonStrictInstance(); break;
    case 'tok-ctor-strict': tok = new GermanCompoundTokenizer(true); break;
    case 'tok-ctor-nonstrict': tok = new GermanCompoundTokenizer(false); break;
    case 'tok-default': tok = new GermanCompoundTokenizer(); break;
    case 'german-strict': tok = new German().getStrictCompoundTokenizer(); break;
    case 'german-nonstrict': { const t = new German().getNonStrictCompoundSplitter(); tok = { tokenize: (w) => t.tokenize(w) }; break; }
    default: throw new IllegalArgumentException(`unknown impl: ${impl}`);
  }
  return a.words.map((w) => safe(() => tok.tokenize(str(w))));
}
