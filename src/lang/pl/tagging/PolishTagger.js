// Java: org.languagetool.tagging.pl.PolishTagger
import { Locale } from '../../../lib/java/Locale.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { CachingWordListLoader } from '../../../core/rules/spelling/CachingWordListLoader.js';
import { asString, isMixedCase, uppercaseFirstChar } from '../../../core/text/StringTools.js';

const NEGATION_PREFIX = 'nie';
const COMPAR_SUPERL = Pattern.compile('(adv|adj:.+):(com|sup)'); // Java: PolishTagger#COMPAR_SUPERL
const MIN_NEGATED_LENGTH = NEGATION_PREFIX.length + 4;
const NEGATION_EXCEPTIONS_FILE = '/pl/nie_compar_exceptions.txt';

// Java: PolishTagger
export class PolishTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.pl.PolishTagger';

  // Java: PolishTagger#PolishTagger()
  constructor() {
    super('/pl/polish.dict', new Locale('pl'));
    this.negationExceptions = new Set(new CachingWordListLoader().loadWords(NEGATION_EXCEPTIONS_FILE));
  }

  // Java: PolishTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (const word of sentenceTokens) {
      const l = [];
      const lowerWord = toLowerCase(word, this.locale);
      const taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(word));
      const isLowercase = word === lowerWord;
      // normal case
      this.plAddTokens(taggerTokens, l);
      if (!isLowercase) {
        // lowercase
        const lowerTaggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(lowerWord));
        this.plAddTokens(lowerTaggerTokens, l);
      }
      // uppercase
      if (l.length === 0 && isLowercase) {
        const upperTaggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(uppercaseFirstChar(word)));
        this.plAddTokens(upperTaggerTokens, l);
      }
      // additional language-dependent tagging, e.g. joined "nie"
      if (l.length === 0) {
        this.plAddTokens(this.additionalTags(word, this.getWordTagger()), l);
      }
      if (l.length === 0) {
        l.push(new AnalyzedToken(word, null, null));
      }
      tokenReadings.push(new AnalyzedTokenReadings(l, pos));
      pos += word.length;
    }
    return tokenReadings;
  }

  // Java: PolishTagger#additionalTags(String,WordTagger)
  additionalTags(word, wordTagger) {
    const lowerWord = toLowerCase(word, this.locale);
    if (lowerWord.length < MIN_NEGATED_LENGTH
        || !lowerWord.startsWith(NEGATION_PREFIX)
        || isMixedCase(word)
        || this.negationExceptions.has(lowerWord)) {
      return null;
    }
    // Only one lookup, so "nienielepiej" stays untagged.
    const base = lowerWord.substring(NEGATION_PREFIX.length);
    const result = [];
    for (const baseToken of this.asAnalyzedTokenListForTaggedWords(word, wordTagger.tag(base))) {
      const posTag = baseToken.getPOSTag();
      if (posTag !== null && baseToken.getLemma() !== null && COMPAR_SUPERL.matcher(posTag).matches()) {
        result.push(new AnalyzedToken(word, posTag, NEGATION_PREFIX + baseToken.getLemma()));
      }
    }
    return result.length === 0 ? null : result;
  }

  // Java: PolishTagger#addTokens(List,List) (private; renamed so BaseTagger#addTokens keeps its behaviour)
  plAddTokens(taggedTokens, l) {
    if (taggedTokens !== null) {
      for (const at of taggedTokens) {
        const tagsArr = javaSplit(asString(at.getPOSTag()), '\\+');
        for (const currTag of tagsArr) {
          l.push(new AnalyzedToken(at.getToken(), currTag, at.getLemma()));
        }
      }
    }
  }
}

registerComponent(PolishTagger.FQCN, () => new PolishTagger());
