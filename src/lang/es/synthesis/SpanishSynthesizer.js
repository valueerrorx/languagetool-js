// Java: org.languagetool.synthesis.es.SpanishSynthesizer
import { Pattern, PatternSyntaxException } from '../../../lib/java/regex/index.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';

const RESOURCE_FILENAME = '/es/es-ES_synth.dict';
const TAGS_FILE_NAME = '/es/es-ES_tags.txt';

const pLemmaSpace = Pattern.compile('([^ ]+) (.+)');

// Java: SpanishSynthesizer
export class SpanishSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.es.SpanishSynthesizer';

  // Java: SpanishSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(SpanishSynthesizer.FQCN);
  }

  // Java: SpanishSynthesizer#SpanishSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super('/es/es.sor', RESOURCE_FILENAME, TAGS_FILE_NAME, 'es');
  }

  // Java: SpanishSynthesizer#synthesize(AnalyzedToken,String) / synthesize(AnalyzedToken,String,boolean) (overload by argument count)
  synthesize(token, posTag, posTagRegExp) {
    return posTagRegExp === undefined ? this.synthesize2(token, posTag) : this.synthesize3(token, posTag, posTagRegExp);
  }

  // Java: SpanishSynthesizer#synthesize(AnalyzedToken,String)
  synthesize2(token, posTag) {
    if (posTag === null || posTag === undefined) {
      throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "posTag" is null');
    }
    if (posTag.startsWith(this.SPELLNUMBER_TAG)) {
      return super.synthesize2(token, posTag);
    }
    let lemma = token.getLemma();
    let toAddAfter = '';
    // verbs with noun
    if (posTag.startsWith('V')) {
      const mLemmaSpace = pLemmaSpace.matcher(lemma);
      if (mLemmaSpace.matches()) {
        lemma = mLemmaSpace.group(1);
        toAddAfter = mLemmaSpace.group(2);
      }
    }
    const results = [];
    results.push(...this.lookup(lemma, posTag));
    return this.addWordsAfter(results, toAddAfter);
  }

  // Java: SpanishSynthesizer#synthesize(AnalyzedToken,String,boolean)
  synthesize3(token, posTag, posTagRegExp) {
    if (posTag === null || posTag === undefined) {
      throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "posTag" is null');
    }
    if (posTag.startsWith(this.SPELLNUMBER_TAG)) {
      return this.synthesize2(token, posTag);
    }
    if (posTagRegExp) {
      let lemma = token.getLemma();
      let toAddAfter = '';
      // verbs with noun
      if (posTag.startsWith('V')) {
        const mLemmaSpace = pLemmaSpace.matcher(lemma);
        if (mLemmaSpace.matches()) {
          lemma = mLemmaSpace.group(1);
          toAddAfter = mLemmaSpace.group(2);
        }
      }
      this.initPossibleTags();
      let p;
      try {
        p = Pattern.compile(posTag);
      } catch (e) {
        if (e instanceof PatternSyntaxException) {
          process.stderr.write(`WARNING: Error trying to synthesize POS tag ${posTag} from token ${token.getToken()}: ${e.message}\n`);
          return null;
        }
        throw e;
      }
      const results = [];
      for (const tag of this.possibleTags) {
        const m = p.matcher(tag);
        if (m.matches()) {
          results.push(...this.lookup(lemma, tag));
        }
      }
      return this.addWordsAfter(results, toAddAfter);
    }
    return this.synthesize2(token, posTag);
  }

  // Java: SpanishSynthesizer#addWordsAfter(List,String)
  addWordsAfter(results, toAddAfter) {
    if (toAddAfter.length !== 0) {
      const output = [];
      for (const result of results) {
        output.push(`${result} ${toAddAfter}`);
      }
      return output;
    }
    return results;
  }

  // Java: SpanishSynthesizer#getTargetPosTag(List,String)
  getTargetPosTag(posTags, targetPosTag) {
    if (posTags.length === 0) {
      return targetPosTag;
    }
    posTags.sort(postagCompare);
    // return the last one to keep the previous results
    return posTags[posTags.length - 1];
  }
}

// Java: SpanishSynthesizer.PostagComparator#compare(String,String)
function postagCompare(arg0, arg1) {
  // Indicative > Imperative
  const len0 = arg0.length;
  const len1 = arg1.length;
  if (len0 > 4 && len1 > 4) {
    if (arg0 === 'VMIP3S0' && arg1 === 'VMM02S0') {
      return 150;
    }
    if (arg0 === 'VMM02S0' && arg1 === 'VMIP3S0') {
      return -150;
    }
  }
  return 0;
}

registerComponent(SpanishSynthesizer.FQCN, () => new SpanishSynthesizer());
