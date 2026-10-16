// Java: org.languagetool.synthesis.GermanSynthesizer (F22 subset: lookup for synthesizeForPosTags; synthesize() and compound forms follow in F24)
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';
import { startsWithLowercase } from '../../../core/text/StringTools.js';

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
      if (lcLemma === lcLookup || lemma === 'mein' || (lemma === 'ich' && !REMOVE.has(s))) { // mein/ich wegen Ihr/Sie
        results.push(s);
      }
    }
    return results;
  }
}

registerComponent(GermanSynthesizer.FQCN, () => new GermanSynthesizer());
