// org.languagetool.AnalyzedToken
import { Objects } from '../lib/java/Objects.js';
import { toLowerCase, javaTrim } from '../lib/java/strings.js';
import { SENTENCE_END_TAGNAME, PARAGRAPH_END_TAGNAME } from './JLanguageToolConstants.js';

export class AnalyzedToken {
  static FQCN = 'org.languagetool.AnalyzedToken';

  // Java: AnalyzedToken#AnalyzedToken(String,String,String)
  constructor(token, posTag, lemma) {
    if (posTag === undefined) posTag = null;
    if (lemma === undefined) lemma = null;
    this.token = Objects.requireNonNull(token, 'token cannot be null');
    this.posTag = posTag !== null ? javaTrim(posTag) : null;
    this.lemma = lemma;
    if (this.lemma === null) {
      this.lemmaOrToken = this.token;
    } else {
      this.lemmaOrToken = this.lemma;
    }
    this.lemmaOrTokenLowerCase = null;
    this.isWhitespaceBeforeFlag = false;
    this.hasNoPOSTag = (posTag === null
        || SENTENCE_END_TAGNAME === posTag
        || PARAGRAPH_END_TAGNAME === posTag);
  }

  // Java: AnalyzedToken#getToken()
  getToken() {
    return this.token;
  }

  // Java: AnalyzedToken#getPOSTag()
  getPOSTag() {
    return this.posTag;
  }

  // Java: AnalyzedToken#getLemma()
  getLemma() {
    return this.lemma;
  }

  // Java: AnalyzedToken#getLemmaOrTokenLowerCase() (package-private)
  getLemmaOrTokenLowerCase() {
    let result = this.lemmaOrTokenLowerCase;
    if (result === null) {
      result = toLowerCase(this.lemmaOrToken);
      this.lemmaOrTokenLowerCase = result;
    }
    return result;
  }

  // Java: AnalyzedToken#setWhitespaceBefore(boolean)
  setWhitespaceBefore(whitespaceBefore) {
    this.isWhitespaceBeforeFlag = whitespaceBefore;
  }

  // Java: AnalyzedToken#isWhitespaceBefore()
  isWhitespaceBefore() {
    return this.isWhitespaceBeforeFlag;
  }

  // Java: AnalyzedToken#matches(AnalyzedToken)
  matches(an) {
    if (this.equals(an)) {
      return true;
    }
    // empty tokens never match anything
    if (an.getToken().length === 0 && an.getLemma() === null
        && an.getPOSTag() === null) {
      return false;
    }
    let found = true;
    if (an.getToken().length !== 0) { // token cannot be null
      found = an.getToken() === this.token;
    }
    if (an.getLemma() !== null) {
      found &&= an.getLemma() === this.lemma;
    }
    if (an.getPOSTag() !== null) {
      found &&= an.getPOSTag() === this.posTag;
    }
    return found;
  }

  // Java: AnalyzedToken#hasNoTag()
  hasNoTag() {
    return this.hasNoPOSTag;
  }

  // Java: AnalyzedToken#setNoPOSTag(boolean)
  setNoPOSTag(noTag) {
    this.hasNoPOSTag = noTag;
  }

  // Java: AnalyzedToken#toString()
  toString() {
    return `${this.lemmaOrToken}/${this.posTag}`;
  }

  // Java: AnalyzedToken#hashCode()
  hashCode() {
    return Objects.hash(this.isWhitespaceBeforeFlag, this.lemma, this.posTag, this.token);
  }

  // Java: AnalyzedToken#equals(Object)
  equals(o) {
    if (o === null || o === undefined) return false;
    if (o === this) return true;
    if (o.constructor !== this.constructor) return false;
    return Objects.equals(this.token, o.token)
        && Objects.equals(this.posTag, o.posTag)
        && Objects.equals(this.lemma, o.lemma)
        && this.isWhitespaceBeforeFlag === o.isWhitespaceBeforeFlag;
  }
}
