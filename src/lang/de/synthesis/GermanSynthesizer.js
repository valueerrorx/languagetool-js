// Java: org.languagetool.synthesis.GermanSynthesizer
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { lowercaseFirstChar, startsWithLowercase, startsWithUppercase, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { IllegalArgumentException, NullPointerException } from '../../../lib/java/errors.js';
import { javaSplit } from '../../../lib/java/regex/index.js';
import { GermanCompoundTokenizer } from '../tokenizers/GermanCompoundTokenizer.js';

const REMOVE = new Set(['unsren', 'unsrem', 'unsres', 'unsre', 'unsern', 'unserm', 'unsrer',
  // old spellings still in the synthesizer dict:
  'angepaßt', 'beschloß', 'biß', 'entschloß', 'ergoß', 'faßt', 'genoß', 'paßt', 'paßte', 'preßt', 'preßte', 'riß',
  'schloß', 'streßtest', 'vergißt', 'verlaß', 'verläßt', 'vermiß', 'vermißt',
  'wißt', 'wußtest', 'wüßtest']);

// Java: GermanSynthesizer
export class GermanSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.GermanSynthesizer';

  // Java: GermanSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(GermanSynthesizer.FQCN);
  }

  // Java: GermanSynthesizer#GermanSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super('de/de.sor', '/de/german_synth.dict', '/de/german_tags.txt', 'de');
  }

  // Java: GermanSynthesizer#lookup(String,String)
  lookup(lemma, posTag) {
    const lookup = super.lookup(lemma, posTag);
    const results = [];
    for (const s of lookup) {
      // don't inflect a lowercase lemma to an uppercase word and vice versa
      const lcLemma = startsWithLowercase(lemma);
      const lcLookup = startsWithLowercase(s);
      if (lcLemma !== lcLookup && (lemma === null || lemma === undefined)) {
        throw new NullPointerException('Cannot invoke "String.equals(Object)" because "lemma" is null');
      }
      if (lcLemma === lcLookup || lemma === 'mein' || (lemma === 'ich' && !REMOVE.has(s))) { // mein/ich wegen Ihr/Sie
        results.push(s);
      }
    }
    return results;
  }

  // Java: GermanSynthesizer#synthesize(AnalyzedToken,String)
  synthesize2(token, posTag) {
    const result = super.synthesize2(token, posTag);
    if (result.length === 0) {
      return this.getCompoundForms(token, posTag, false);
    }
    return result.filter((k) => !REMOVE.has(k));
  }

  // Java: GermanSynthesizer#synthesize(AnalyzedToken,String,boolean)
  synthesize3(token, posTag, posTagRegExp) {
    const result = super.synthesize3(token, posTag, posTagRegExp);
    if (result.length === 0) {
      return this.getCompoundForms(token, posTag, posTagRegExp);
    }
    return result.filter((k) => !REMOVE.has(k));
  }

  // Java: GermanSynthesizer#getCompoundForms(AnalyzedToken,String,boolean)
  getCompoundForms(token, posTag, posTagRegExp) {
    let parts = GermanCompoundTokenizer.getStrictInstance().tokenize(token.getLemma());
    if (parts.length === 0) {
      return [];
    }
    let maybeHyphen = '';
    if (parts.length === 1 && token.getLemma() !== null) {
      parts = javaSplit(token.getLemma(), '-');
      if (parts.length > 1) {
        maybeHyphen = '-';
      }
    }
    if (parts.length - 1 < 0) { // Java: Arrays.asList(..).subList(0, -1)
      throw new IllegalArgumentException(`fromIndex(0) > toIndex(${parts.length - 1})`);
    }
    const firstPart = parts.slice(0, parts.length - 1).join(maybeHyphen);
    const lastPart = uppercaseFirstChar(parts[parts.length - 1]);
    const uppercaseLastPart = maybeHyphen !== '' && startsWithUppercase(parts[parts.length - 1]);
    const lastPartToken = new AnalyzedToken(lastPart, posTag, lastPart);
    let lastPartForms;
    if (posTagRegExp) {
      lastPartForms = super.synthesize3(lastPartToken, posTag, true);
    } else {
      lastPartForms = super.synthesize2(lastPartToken, posTag);
    }
    const results = new Set(); // avoid dupes
    for (const part of lastPartForms) {
      if (uppercaseLastPart) {
        results.add(firstPart + maybeHyphen + part);
      } else {
        results.add(firstPart + maybeHyphen + lowercaseFirstChar(part));
      }
    }
    return [...results];
  }
}

registerComponent(GermanSynthesizer.FQCN, () => new GermanSynthesizer());
