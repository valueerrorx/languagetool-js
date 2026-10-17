// org.languagetool.rules.patterns.PatternTokenMatcher (matches one PatternToken against tokens, resolves match references, and-groups)
import { arrayGet } from '../../lib/java/arrays.js';

// Java: PatternTokenMatcher
export class PatternTokenMatcher {
  static FQCN = 'org.languagetool.rules.patterns.PatternTokenMatcher';

  // Java: PatternTokenMatcher(PatternToken)
  constructor(patternToken) {
    this.basePatternToken = patternToken;
    this.patternToken = this.basePatternToken;
    this.andGroup = null;
    this.andGroupCheck = null;
    if (this.basePatternToken.hasAndGroup()) {
      const patternTokenAndGroup = this.basePatternToken.getAndGroup();
      this.andGroup = [];
      for (const el of patternTokenAndGroup) {
        this.andGroup.push(new PatternTokenMatcher(el));
      }
    }
  }

  // Java: PatternTokenMatcher#resolveReference(int,AnalyzedTokenReadings[],Language)
  resolveReference(firstMatchToken, tokens, language) {
    if (this.basePatternToken.isReferenceElement()) {
      const refPos = firstMatchToken + this.basePatternToken.getMatch().getTokenRef();
      if (refPos < tokens.length) {
        this.patternToken = this.basePatternToken.compile(arrayGet(tokens, refPos), language.getSynthesizer());
      }
    }
  }

  // Java: PatternTokenMatcher#getPatternToken()
  getPatternToken() {
    return this.basePatternToken;
  }

  // Java: PatternTokenMatcher#isMatched(AnalyzedToken)
  isMatched(token) {
    const matched = this.patternToken.isMatched(token);
    if (this.patternToken.hasAndGroup()) {
      this.andGroupCheck[0] = this.andGroupCheck[0] || matched;
    }
    return matched;
  }

  // Java: PatternTokenMatcher#prepareAndGroup(int,AnalyzedTokenReadings[],Language)
  prepareAndGroup(firstMatchToken, tokens, language) {
    if (this.basePatternToken.hasAndGroup()) {
      for (const andMatcher of this.andGroup) {
        andMatcher.resolveReference(firstMatchToken, tokens, language);
      }
      this.andGroupCheck = new Array(this.patternToken.getAndGroup().length + 1).fill(false);
    }
  }

  // Java: PatternTokenMatcher#addMemberAndGroup(AnalyzedToken)
  addMemberAndGroup(token) {
    if (this.patternToken.hasAndGroup()) {
      const andGroupList = this.andGroup;
      for (let i = 0; i < andGroupList.length; i++) {
        if (!this.andGroupCheck[i + 1]) {
          const testAndGroup = andGroupList[i];
          if (testAndGroup.isMatched(token)) {
            this.andGroupCheck[i + 1] = true;
          }
        }
      }
    }
  }

  // Java: PatternTokenMatcher#checkAndGroup(boolean)
  checkAndGroup(previousValue) {
    if (this.patternToken.hasAndGroup()) {
      let allConditionsMatch = true;
      for (const testValue of this.andGroupCheck) {
        allConditionsMatch = allConditionsMatch && testValue;
      }
      return allConditionsMatch;
    }
    return previousValue;
  }

  // Java: PatternTokenMatcher#isMatchedByScopeNextException(AnalyzedToken)
  isMatchedByScopeNextException(token) {
    return this.patternToken.isMatchedByScopeNextException(token);
  }

  // Java: PatternTokenMatcher#isExceptionMatchedCompletely(AnalyzedToken)
  isExceptionMatchedCompletely(token) {
    return this.patternToken.isExceptionMatchedCompletely(token);
  }

  // Java: PatternTokenMatcher#hasPreviousException()
  hasPreviousException() {
    return this.patternToken.hasPreviousException();
  }

  // Java: PatternTokenMatcher#isMatchedByPreviousException(AnalyzedTokenReadings)
  isMatchedByPreviousException(token) {
    return this.patternToken.isMatchedByPreviousException(token);
  }

  // Java: PatternTokenMatcher#toString()
  toString() {
    return `PatternTokenMatcher for ${this.basePatternToken}`;
  }
}
