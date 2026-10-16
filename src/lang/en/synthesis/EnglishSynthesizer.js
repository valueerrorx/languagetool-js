// Java: org.languagetool.synthesis.en.EnglishSynthesizer
import { getMessageBundleForLanguage } from '../../../core/resources/ResourceBundleTools.js';
import { Languages } from '../../../core/Languages.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';
import { lowercaseFirstCharIfCapitalized } from '../../../core/text/StringTools.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { substring } from '../../../lib/java/strings.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { AvsAnRule } from '../rules/AvsAnRule.js';

const RESOURCE_FILENAME = '/en/english_synth.dict';
const TAGS_FILE_NAME = '/en/english_tags.txt';
const SOR_FILE_NAME = '/en/en.sor';

const exceptions = ["ne'er", "e'er", "o'er", "ol'", "ma'am", "n't", 'informations'];

// A special tag to add determiners.
const ADD_DETERMINER = '+DT';

// A special tag to add only indefinite articles.
const ADD_IND_DETERMINER = '+INDT';

// Java: EnglishSynthesizer
export class EnglishSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.en.EnglishSynthesizer';

  // Java: EnglishSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(EnglishSynthesizer.FQCN);
  }

  // Java: EnglishSynthesizer#EnglishSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super(SOR_FILE_NAME, RESOURCE_FILENAME, TAGS_FILE_NAME, 'en');
    this.aVsAnRule = new AvsAnRule(getMessageBundleForLanguage(Languages.getLanguageForShortCode('en')));
  }

  // Java: EnglishSynthesizer#synthesize(AnalyzedToken,String)
  synthesize2(token, posTag) {
    if (posTag === null || posTag === undefined) {
      throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "posTag" is null');
    }
    if (posTag.startsWith(this.SPELLNUMBER_TAG)) {
      return super.synthesize2(token, posTag);
    }
    if (token === null || token === undefined) {
      throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedToken.getToken()" because "token" is null');
    }
    const aOrAn = this.aVsAnRule.suggestAorAn(token.getToken());
    if (ADD_DETERMINER === posTag) {
      return [aOrAn, `the ${lowercaseFirstCharIfCapitalized(token.getToken())}`];
    } else if (ADD_IND_DETERMINER === posTag) {
      return [aOrAn];
    }
    return this.removeExceptions(super.synthesize2(token, posTag));
  }

  // Java: EnglishSynthesizer#synthesize(AnalyzedToken,String,boolean)
  synthesize3(token, posTag, posTagRegExp) {
    if (posTag === null || posTag === undefined) {
      throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "posTag" is null');
    }
    if (posTag.startsWith(this.SPELLNUMBER_TAG)) {
      return this.synthesize2(token, posTag);
    }
    if (posTagRegExp) {
      let myPosTag = posTag;
      let det = '';
      if (posTag.endsWith(ADD_IND_DETERMINER)) {
        myPosTag = substring(myPosTag, 0, myPosTag.indexOf(ADD_IND_DETERMINER) - '\\'.length);
        det = this.aVsAnRule.suggestAorAn(token.getLemma());
        det = det.substring(0, det.indexOf(' ') + ' '.length);
      } else if (posTag.endsWith(ADD_DETERMINER)) {
        myPosTag = substring(myPosTag, 0, myPosTag.indexOf(ADD_DETERMINER) - '\\'.length);
        det = 'the ';
      }

      this.initPossibleTags();
      const p = Pattern.compile(myPosTag);
      const results = [];

      for (const tag of this.possibleTags) {
        const m = p.matcher(tag);
        if (m.matches() && token.getLemma() !== null) {
          this.lookupWithDeterminer(token.getLemma(), tag, results, det);
        }
      }
      return this.removeExceptions(results);
    }
    return this.removeExceptions(this.synthesize2(token, posTag));
  }

  // Java: EnglishSynthesizer#lookup(String,String,List,String)
  lookupWithDeterminer(lemma, posTag, results, determiner) {
    const lookup = super.lookup(lemma, posTag);
    for (const result of lookup) {
      results.push(determiner + result);
    }
  }

  // Java: EnglishSynthesizer#isException(String)
  isException(w) {
    // remove: 've, 's, 're...
    return w.startsWith("'") || exceptions.includes(w);
  }
}

registerComponent(EnglishSynthesizer.FQCN, () => new EnglishSynthesizer());
