// Java: org.languagetool.synthesis.BaseSynthesizer
import { DictionaryLookup } from '../../../lib/fsa/DictionaryLookup.js';
import { IOException, NullPointerException, RuntimeException } from '../../../lib/java/errors.js';
import { decodeUtf8, readerLines } from '../../../lib/java/io.js';
import { Pattern, PatternSyntaxException } from '../../../lib/java/regex/index.js';
import { Soros } from '../../../lib/soros/Soros.js';
import { getDictionaryWithCaching } from '../../rules/spelling/morfologik/MorfologikSpeller.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { ManualSynthesizer } from './ManualSynthesizer.js';
import { loadWords } from './SynthesizerTools.js';

// helpers for the helpful NPE texts of token.getToken()/getLemma() on a null token
function tokenToken(token) {
  if (token === null || token === undefined) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedToken.getToken()" because "token" is null');
  return token.getToken();
}

function tokenLemma(token) {
  if (token === null || token === undefined) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedToken.getLemma()" because "token" is null');
  return token.getLemma();
}

// Java: BaseSynthesizer
export class BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.BaseSynthesizer';

  SPELLNUMBER_TAG = '_spell_number_';
  SPELLNUMBER_FEMININE_TAG = '_spell_number_:feminine';
  SPELLNUMBER_ROMAN_TAG = '_spell_number_:Roman';

  // Java: BaseSynthesizer#BaseSynthesizer(String,String,String,String) (the 3-arg form passes sorosFileName null)
  constructor(sorosFileName, resourceFileName, tagFileName, langShortCode) {
    this.possibleTags = null;
    this.dictionary = null;
    this.language = null;
    this.resourceFileName = resourceFileName;
    this.tagFileName = tagFileName;
    this.stemmer = this.createStemmer();
    this.sorosFileName = sorosFileName;
    this.numberSpeller = this.createNumberSpeller(langShortCode);
    this.romanNumberer = this.createRomanNumberer();
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

  // Java: BaseSynthesizer#createNumberSpeller(String)
  createNumberSpeller(langcode) {
    return BaseSynthesizer.loadSoros(this.sorosFileName, langcode);
  }

  // Java: BaseSynthesizer#createRomanNumberer()
  createRomanNumberer() {
    return BaseSynthesizer.loadSoros('Roman.sor', 'Roman');
  }

  // shared body of createNumberSpeller/createRomanNumberer: any Exception -> null (Java: catch (Exception e) { return null; })
  static loadSoros(fileName, langcode) {
    try {
      if (fileName === null || fileName === undefined) {
        throw new NullPointerException();
      }
      const stream = getDataBroker().getFromResourceDirAsStream(fileName);
      let sb = '';
      for (const line of readerLines(decodeUtf8(stream))) {
        sb += line;
        sb += '\n';
      }
      return new Soros(sb, langcode);
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      return null;
    }
  }

  // Java: BaseSynthesizer#lookup(String,String)
  lookup(lemma, posTag) {
    let results = [];
    // perf: tagFilter (set by synthesizeForPosTags for its lemma) tells which tags have dictionary entries
    if (this.tagFilterLemma === undefined || this.tagFilterLemma !== lemma || this.tagFilter(posTag)) {
      const wordForms = this.stemmer.lookup(`${lemma}|${posTag}`);
      for (const wd of wordForms) {
        results.push(String(wd.getStem()));
      }
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

  // Java: BaseSynthesizer#synthesize(AnalyzedToken,String) / synthesize(AnalyzedToken,String,boolean) (overload by argument count)
  synthesize(token, posTag, posTagRegExp) {
    return posTagRegExp === undefined ? this.synthesize2(token, posTag) : this.synthesize3(token, posTag, posTagRegExp);
  }

  // Java: BaseSynthesizer#synthesize(AnalyzedToken,String)
  synthesize2(token, posTag) {
    if (posTag === null || posTag === undefined) {
      throw new NullPointerException('Cannot invoke "String.equals(Object)" because "posTag" is null');
    }
    if (posTag === this.SPELLNUMBER_TAG) {
      return [this.getSpelledNumber(tokenToken(token))];
    }
    if (posTag === this.SPELLNUMBER_FEMININE_TAG) {
      return [this.getSpelledNumber(`feminine ${tokenToken(token)}`)];
    }
    if (posTag === this.SPELLNUMBER_ROMAN_TAG) {
      return [this.getRomanNumber(tokenToken(token))];
    }
    const wordForms = this.lookup(tokenLemma(token), posTag);
    return this.removeExceptions(wordForms);
  }

  // Java: BaseSynthesizer#synthesize(AnalyzedToken,String,boolean)
  synthesize3(token, posTag, posTagRegExp) {
    if (posTagRegExp) {
      try {
        const p = Pattern.compile(posTag);
        return this.synthesizeForPosTags(tokenLemma(token), (tag) => p.matcher(tag).matches());
      } catch (e) {
        if (e instanceof PatternSyntaxException) {
          throw new RuntimeException(`Error trying to synthesize POS tag ${posTag} (posTagRegExp: true) from token ${tokenToken(token)}`, e);
        }
        throw e;
      }
    }
    return this.removeExceptions(this.synthesize2(token, posTag));
  }

  // Java: BaseSynthesizer#synthesizeForPosTags(String,Predicate)
  synthesizeForPosTags(lemma, acceptTag) {
    this.initPossibleTags();
    const results = [];
    const prevLemma = this.tagFilterLemma;
    const prevFilter = this.tagFilter;
    const filter = typeof lemma === 'string' && typeof this.stemmer.tagFilterForPrefix === 'function' ? this.stemmer.tagFilterForPrefix(`${lemma}|`) : null;
    this.tagFilterLemma = filter === null ? undefined : lemma;
    this.tagFilter = filter;
    try {
      for (const tag of this.possibleTags) {
        if (acceptTag(tag)) {
          results.push(...this.lookup(lemma, tag));
        }
      }
    } finally {
      this.tagFilterLemma = prevLemma;
      this.tagFilter = prevFilter;
    }
    return this.removeExceptions(results);
  }

  // Java: BaseSynthesizer#getSpelledNumber(String)
  getSpelledNumber(arabicNumeral) {
    if (this.numberSpeller !== null) {
      return this.numberSpeller.run(arabicNumeral);
    }
    return arabicNumeral;
  }

  // Java: BaseSynthesizer#getRomanNumber(String)
  getRomanNumber(arabicNumeral) {
    if (this.romanNumberer !== null) {
      return this.romanNumberer.run(arabicNumeral);
    }
    return arabicNumeral;
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
    if (posTags === null || posTags === undefined) {
      throw new NullPointerException('Cannot invoke "java.util.List.isEmpty()" because "posTags" is null');
    }
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
