// Java: org.languagetool.synthesis.BaseSynthesizer (F22 subset: dictionary lookup and synthesizeForPosTags; synthesize() and Soros follow in F24)
import { DictionaryLookup } from '../../../lib/fsa/DictionaryLookup.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { notPortedYet } from '../../language/components.js';
import { getDictionaryWithCaching } from '../../rules/spelling/morfologik/MorfologikSpeller.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { ManualSynthesizer } from './ManualSynthesizer.js';
import { loadWords } from './SynthesizerTools.js';

// Java: BaseSynthesizer
export class BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.BaseSynthesizer';

  SPELLNUMBER_TAG = '_spell_number_';
  SPELLNUMBER_FEMININE_TAG = '_spell_number_:feminine';
  SPELLNUMBER_ROMAN_TAG = '_spell_number_:Roman';

  // Java: BaseSynthesizer#BaseSynthesizer(String,String,String,String) (number spellers are created in F24)
  constructor(sorosFileName, resourceFileName, tagFileName, langShortCode) {
    this.possibleTags = null;
    this.dictionary = null;
    this.language = null;
    this.resourceFileName = resourceFileName;
    this.tagFileName = tagFileName;
    this.stemmer = this.createStemmer();
    this.sorosFileName = sorosFileName;
    const broker = getDataBroker();
    const path = `/${langShortCode}/added.txt`;
    this.manualSynthesizer = broker.resourceExists(path) ? new ManualSynthesizer(broker.getFromResourceDirAsStream(path)) : null;
    const removalPath = `/${langShortCode}/removed.txt`;
    this.removalSynthesizer = broker.resourceExists(removalPath) ? new ManualSynthesizer(broker.getFromResourceDirAsStream(removalPath)) : null;
    const removalPath2 = `/${langShortCode}/do-not-synthesize.txt`;
    this.removalSynthesizer2 = broker.resourceExists(removalPath2) ? new ManualSynthesizer(broker.getFromResourceDirAsStream(removalPath2)) : null;
  }

  // Java: BaseSynthesizer#getDictionary()
  getDictionary() {
    if (this.dictionary === null) {
      this.dictionary = getDictionaryWithCaching(this.resourceFileName);
    }
    return this.dictionary;
  }

  // Java: BaseSynthesizer#createStemmer()
  createStemmer() {
    try {
      return new DictionaryLookup(this.getDictionary());
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException('Could not load dictionary', e);
      throw e;
    }
  }

  // Java: BaseSynthesizer#lookup(String,String)
  lookup(lemma, posTag) {
    let results = [];
    const wordForms = this.stemmer.lookup(`${lemma}|${posTag}`);
    for (const wd of wordForms) {
      results.push(String(wd.getStem()));
    }
    if (this.manualSynthesizer !== null) {
      const manualForms = this.manualSynthesizer.lookup(lemma, posTag);
      if (manualForms !== null) {
        results.push(...manualForms);
      }
    }
    if (this.removalSynthesizer !== null) {
      const removeForms = this.removalSynthesizer.lookup(lemma, posTag);
      if (removeForms !== null) {
        results = results.filter((r) => !removeForms.includes(r)); // Java: List#removeAll
      }
    }
    if (this.removalSynthesizer2 !== null) {
      const removeForms = this.removalSynthesizer2.lookup(lemma, posTag);
      if (removeForms !== null) {
        results = results.filter((r) => !removeForms.includes(r)); // Java: List#removeAll
      }
    }
    return results;
  }

  // Java: BaseSynthesizer#synthesize(AnalyzedToken,String[,boolean]) (F24)
  synthesize() {
    throw notPortedYet('BaseSynthesizer#synthesize (F24)');
  }

  // Java: BaseSynthesizer#synthesizeForPosTags(String,Predicate)
  synthesizeForPosTags(lemma, acceptTag) {
    this.initPossibleTags();
    const results = [];
    for (const tag of this.possibleTags) {
      if (acceptTag(tag)) {
        results.push(...this.lookup(lemma, tag));
      }
    }
    return this.removeExceptions(results);
  }

  // Java: BaseSynthesizer#getPosTagCorrection(String)
  getPosTagCorrection(posTag) {
    return posTag;
  }

  // Java: BaseSynthesizer#getStemmer()
  getStemmer() {
    return this.stemmer;
  }

  // Java: BaseSynthesizer#initPossibleTags()
  initPossibleTags() {
    if (this.possibleTags === null) {
      this.possibleTags = this.loadTags();
    }
  }

  // Java: BaseSynthesizer#loadTags()
  loadTags() {
    const tags = loadWords(getDataBroker().getFromResourceDirAsStream(this.tagFileName));
    if (this.manualSynthesizer !== null) {
      for (const tag of this.manualSynthesizer.getPossibleTags()) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
    return tags;
  }

  // Java: BaseSynthesizer#isException(String)
  isException() {
    return false;
  }

  // Java: BaseSynthesizer#removeExceptions(String[])
  removeExceptions(words) {
    const results = [];
    for (const word of words) {
      if (!this.isException(word)) {
        results.push(word);
      }
    }
    return results;
  }

  // Java: BaseSynthesizer#getTargetPosTag(List,String)
  getTargetPosTag(posTags, targetPosTag) {
    if (posTags.length === 0) {
      return targetPosTag;
    }
    // return the last one to keep the previous results
    return posTags[posTags.length - 1];
  }

  // Java: BaseSynthesizer#getPossibleTagsForSynthesis()
  getPossibleTagsForSynthesis() {
    this.initPossibleTags();
    return this.possibleTags;
  }
}
