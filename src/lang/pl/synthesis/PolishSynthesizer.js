// Java: org.languagetool.synthesis.pl.PolishSynthesizer
import { DictionaryLookup } from '../../../lib/fsa/DictionaryLookup.js';
import { Pattern, PatternSyntaxException } from '../../../lib/java/regex/index.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { javaSplit, javaReplace } from '../../../lib/java/strings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';
import { loadWords } from '../../../core/tagging/synthesis/SynthesizerTools.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';

const RESOURCE_FILENAME = '/pl/polish_synth.dict';
const TAGS_FILE_NAME = '/pl/polish_tags.txt';

const POTENTIAL_NEGATION_TAG = ':aff';
const NEGATION_TAG = ':neg';
const NEGATION_TAG_PATTERN = Pattern.compile(NEGATION_TAG);
const COMP_TAG = 'com';
const SUP_TAG = 'sup';
const PATTERN = Pattern.compile('.*[a-z]\\.[a-z].*');
const DOT = Pattern.compile('.', Pattern.LITERAL);

// Java: PolishSynthesizer
export class PolishSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.pl.PolishSynthesizer';

  // Java: PolishSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(PolishSynthesizer.FQCN);
  }

  // Java: PolishSynthesizer#PolishSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super(null, RESOURCE_FILENAME, TAGS_FILE_NAME, 'pl');
    this.plPossibleTags = null; // Java: PolishSynthesizer#possibleTags (private field, separate from BaseSynthesizer's)
  }

  // Java: PolishSynthesizer#synthesize(AnalyzedToken,String) / synthesize(AnalyzedToken,String,boolean) (overload by argument count)
  synthesize(token, posTag, posTagRegExp) {
    return posTagRegExp === undefined ? this.synthesize2(token, posTag) : this.synthesize3(token, posTag, posTagRegExp);
  }

  // Java: PolishSynthesizer#synthesize(AnalyzedToken,String)
  synthesize2(token, posTag) {
    if (posTag === null || posTag === undefined) {
      return null;
    }
    const synthesizer = new DictionaryLookup(this.getDictionary());
    let isNegated = false;
    if (token.getPOSTag() !== null) {
      isNegated = posTag.indexOf(NEGATION_TAG) > 0
          || (token.getPOSTag().indexOf(NEGATION_TAG) > 0
          && !(posTag.indexOf(COMP_TAG) > 0) && !(posTag.indexOf(SUP_TAG) > 0));
    }
    if (posTag.indexOf('+') > 0) {
      return this.synthesize3(token, posTag, true);
    }
    return this.getWordForms(token, posTag, isNegated, synthesizer);
  }

  // Java: PolishSynthesizer#synthesize(AnalyzedToken,String,boolean)
  synthesize3(token, pos, posTagRegExp) {
    if (pos === null || pos === undefined) {
      return null;
    }
    let posTag = pos;
    if (posTagRegExp) {
      if (this.plPossibleTags === null) {
        this.plPossibleTags = loadWords(getDataBroker().getFromResourceDirAsStream(TAGS_FILE_NAME));
      }
      const synthesizer = new DictionaryLookup(this.getDictionary());
      let results = [];

      let isNegated = false;
      if (token.getPOSTag() !== null) {
        isNegated = posTag.indexOf(NEGATION_TAG) > 0
            || (token.getPOSTag().indexOf(NEGATION_TAG) > 0
            && !(posTag.indexOf(COMP_TAG) > 0)
            && !(posTag.indexOf(SUP_TAG) > 0));
      }

      if (isNegated) {
        posTag = javaReplace(posTag, NEGATION_TAG, POTENTIAL_NEGATION_TAG + '?');
      }

      try {
        const p = Pattern.compile(javaReplace(posTag, '+', '|'));
        for (const tag of this.plPossibleTags) {
          const m = p.matcher(tag);
          if (m.matches()) {
            const wordForms = this.getWordForms(token, tag, isNegated, synthesizer);
            if (wordForms !== null) {
              results.push(...wordForms);
            }
          }
        }
      } catch (e) {
        if (!(e instanceof PatternSyntaxException)) throw e;
        // Java: e.printStackTrace() (rare invalid regexp, issue 1651); results so far are kept
      }
      // remove duplicates (HashSet iteration order)
      results = [...new JavaHashSet(results)];
      return results;
    }
    return this.synthesize2(token, posTag);
  }

  // Java: PolishSynthesizer#getPosTagCorrection(String)
  getPosTagCorrection(posTag) {
    if (posTag.includes('.')) {
      const tags = javaSplit(posTag, ':');
      let pos = -1;
      for (let i = 0; i < tags.length; i++) {
        if (PATTERN.matcher(tags[i]).matches()) {
          tags[i] = '(.*' + DOT.matcher(tags[i]).replaceAll('.*|.*') + '.*)';
          pos = i;
        }
      }
      if (pos === -1) {
        return posTag;
      }
      return tags.join(':');
    }
    return posTag;
  }

  // Java: PolishSynthesizer#getWordForms(AnalyzedToken,String,boolean,IStemmer)
  getWordForms(token, posTag, isNegated, synthesizer) {
    const forms = [];
    if (isNegated) {
      const wordForms = synthesizer.lookup(token.getLemma() + '|'
          + NEGATION_TAG_PATTERN.matcher(posTag).replaceFirst(POTENTIAL_NEGATION_TAG));
      if (wordForms !== null) {
        for (const wd of wordForms) {
          forms.push('nie' + wd.getStem());
        }
      }
    } else {
      const wordForms = synthesizer.lookup(token.getLemma() + '|' + posTag);
      for (const wd of wordForms) {
        if (wd.getStem() !== null) {
          forms.push(String(wd.getStem()));
        }
      }
    }
    return forms;
  }
}

registerComponent(PolishSynthesizer.FQCN, () => new PolishSynthesizer());
