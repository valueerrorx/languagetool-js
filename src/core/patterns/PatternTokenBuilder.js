// org.languagetool.rules.patterns.PatternTokenBuilder (fluent builder for PatternTokens)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { PatternToken, PosToken } from './PatternToken.js';

// Java: PatternTokenBuilder
export class PatternTokenBuilder {
  static FQCN = 'org.languagetool.rules.patterns.PatternTokenBuilder';

  constructor() {
    this.tokenValue = null;
    this.posTag = null;
    this.marker = true;
    this.matchInflectedFormsFlag = false;
    this.caseSensitive = false;
    this.regexp = false;
    this.negation = false;
    this.isWhiteSpaceSet = false;
    this.isWhiteSpaceBefore = false;
    this.minOccurrence = 1;
    this.maxOccurrence = 1;
    this.skip = 0;
    this.tokenException = null;
  }

  // Java: PatternTokenBuilder#token(String)
  token(token) {
    this.tokenValue = Objects.requireNonNull(token);
    return this;
  }

  // Java: PatternTokenBuilder#csToken(String)
  csToken(token) {
    this.tokenValue = Objects.requireNonNull(token);
    this.caseSensitive = true;
    return this;
  }

  // Java: PatternTokenBuilder#tokenRegex(String)
  tokenRegex(token) {
    this.tokenValue = Objects.requireNonNull(token);
    this.regexp = true;
    return this;
  }

  // Java: PatternTokenBuilder#csTokenRegex(String)
  csTokenRegex(token) {
    this.tokenValue = Objects.requireNonNull(token);
    this.regexp = true;
    this.caseSensitive = true;
    return this;
  }

  // Java: PatternTokenBuilder#pos(String)
  pos(posTag) {
    return this.posImpl(posTag, false);
  }

  // Java: PatternTokenBuilder#posRegex(String)
  posRegex(posTag) {
    return this.posImpl(posTag, true);
  }

  // Java: PatternTokenBuilder#min(int)
  min(val) {
    if (val < 0) {
      throw new IllegalArgumentException(`minOccurrence must be >= 0: ${this.minOccurrence}`);
    }
    this.minOccurrence = val;
    return this;
  }

  // Java: PatternTokenBuilder#max(int)
  max(val) {
    this.maxOccurrence = val;
    return this;
  }

  // Java: PatternTokenBuilder#mark(boolean)
  mark(isMarked) {
    this.marker = isMarked;
    return this;
  }

  // Java: PatternTokenBuilder#posRegexWithStringException(String,String)
  posRegexWithStringException(posTag, tokenExceptionRegex) {
    return this.posImpl(posTag, true, tokenExceptionRegex);
  }

  // Java: PatternTokenBuilder#pos(String,boolean) / pos(String,boolean,String) (private)
  posImpl(posTag, regexp, tokenExceptionRegex) {
    this.posTag = Objects.requireNonNull(posTag);
    this.regexp = regexp;
    if (tokenExceptionRegex !== undefined) {
      this.tokenException = tokenExceptionRegex;
    }
    return this;
  }

  // Java: PatternTokenBuilder#negate()
  negate() {
    this.negation = true;
    return this;
  }

  // Java: PatternTokenBuilder#setSkip(int)
  setSkip(skip) {
    this.skip = skip;
    return this;
  }

  // Java: PatternTokenBuilder#setIsWhiteSpaceBefore(boolean)
  setIsWhiteSpaceBefore(whiteSpaceBefore) {
    this.isWhiteSpaceBefore = whiteSpaceBefore;
    this.isWhiteSpaceSet = true;
    return this;
  }

  // Java: PatternTokenBuilder#matchInflectedForms()
  matchInflectedForms() {
    this.matchInflectedFormsFlag = true;
    return this;
  }

  // Java: PatternTokenBuilder#build()
  build() {
    const patternToken = new PatternToken(this.tokenValue, this.caseSensitive, this.regexp, this.matchInflectedFormsFlag);
    if (this.posTag !== null) {
      patternToken.setPosToken(new PosToken(this.posTag, this.regexp, false));
    }
    if (this.isWhiteSpaceSet) {
      patternToken.setWhitespaceBefore(this.isWhiteSpaceBefore);
    }
    if (this.maxOccurrence < this.minOccurrence) {
      throw new IllegalArgumentException(`minOccurrence must <= maxOccurrence: minOccurrence ${this.minOccurrence}, maxOccurrence ${this.maxOccurrence}`);
    }
    if (this.tokenException !== null) {
      patternToken.setStringPosException(this.tokenException, true, false, false, false, false, null, false, false, false);
    }
    patternToken.setMinOccurrence(this.minOccurrence);
    patternToken.setMaxOccurrence(this.maxOccurrence);
    patternToken.setNegation(this.negation);
    patternToken.setSkipNext(this.skip);
    patternToken.setInsideMarker(this.marker);
    return patternToken;
  }
}
