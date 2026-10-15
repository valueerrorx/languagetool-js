// Port of net.loomchild.segment.srx.{SrxTextIterator,RuleManager,RuleMatcher} for CharSequence input (the Reader/buffer mode is not used by LanguageTool).
import { IllegalArgumentException, IllegalStateException, NullPointerException } from '../java/errors.js';
import { compile, finitize, setDefaultPatternFlags } from './Util.js';

export const MARGIN_PARAMETER = 'margin';
export const MAX_LOOKBEHIND_CONSTRUCT_LENGTH_PARAMETER = 'maxLookbehindConstructLength';
export const DEFAULT_PATTERN_FLAGS_PARAMETER = 'defaultPatternFlags';
const DEFAULT_MARGIN = 128;
const DEFAULT_MAX_LOOKBEHIND_CONSTRUCT_LENGTH = 100;

// Java: Util#getParameter(Object,Object)
const getParameter = (value, defaultValue) => (value !== undefined && value !== null ? value : defaultValue);

// Java: AbstractTextIterator#toString(List)
function languageRulesToString(languageRuleList) {
  let s = '';
  for (const lr of languageRuleList) s += lr.getName();
  return s;
}

// Java: net.loomchild.segment.srx.RuleManager
class RuleManager {
  // Java: RuleManager#RuleManager(SrxDocument,List,int)
  constructor(document, languageRuleList, maxLookbehindConstructLength) {
    this.document = document;
    this.maxLookbehindConstructLength = maxLookbehindConstructLength;
    this.breakRuleList = [];
    this.exceptionPatternMap = new Map();
    let exceptionPatternStringBuilder = '';
    for (const languageRule of languageRuleList) {
      for (const rule of languageRule.getRuleList()) {
        if (rule.isBreak()) {
          this.breakRuleList.push(rule);
          const exceptionPattern = exceptionPatternStringBuilder.length > 0
            ? compile(this.document, exceptionPatternStringBuilder) : null;
          this.exceptionPatternMap.set(rule, exceptionPattern);
        } else {
          if (exceptionPatternStringBuilder.length > 0) exceptionPatternStringBuilder += '|';
          exceptionPatternStringBuilder += this.createExceptionPatternString(rule);
        }
      }
    }
  }

  // Java: RuleManager#getBreakRuleList()
  getBreakRuleList() {
    return this.breakRuleList;
  }

  // Java: RuleManager#getExceptionPattern(Rule)
  getExceptionPattern(rule) {
    const p = this.exceptionPatternMap.get(rule);
    return p === undefined ? null : p;
  }

  // Java: RuleManager#createExceptionPatternString(Rule)
  createExceptionPatternString(rule) {
    const before = finitize(rule.getBeforePattern(), this.maxLookbehindConstructLength);
    const after = rule.getAfterPattern();
    let sb = '(?:';
    if (before.length > 0) sb += `(?<=${before})`;
    if (after.length > 0) sb += `(?=${after})`;
    sb += ')';
    return sb;
  }
}

// Java: net.loomchild.segment.srx.RuleMatcher; a region [pos,length) with default (opaque) bounds is a matcher on text.substring(pos)
class RuleMatcher {
  // Java: RuleMatcher#RuleMatcher(SrxDocument,Rule,CharSequence)
  constructor(document, rule, text) {
    this.document = document;
    this.rule = rule;
    this.text = text;
    const beforePattern = compile(document, rule.getBeforePattern());
    const afterPattern = compile(document, rule.getAfterPattern());
    this.beforePattern = beforePattern;
    this.afterPattern = afterPattern;
    this.beforeMatcher = beforePattern.matcher(text);
    this.beforeOffset = 0;
    this.afterMatcher = afterPattern.matcher(text);
    this.afterOffset = 0;
    this.found = true;
  }

  // Java: RuleMatcher#find()
  find() {
    this.found = false;
    while (!this.found && this.beforeMatcher.find()) {
      this.afterOffset = this.beforeOffset + this.beforeMatcher.end();
      this.afterMatcher = this.afterPattern.matcher(this.text.substring(this.afterOffset));
      this.found = this.afterMatcher.lookingAt();
    }
    return this.found;
  }

  // Java: RuleMatcher#find(int)
  findFrom(startPosition) {
    this.beforeOffset = startPosition;
    this.beforeMatcher = this.beforePattern.matcher(this.text.substring(startPosition));
    return this.find();
  }

  // Java: RuleMatcher#hitEnd()
  hitEnd() {
    return !this.found;
  }

  // Java: RuleMatcher#getStartPosition()
  getStartPosition() {
    return this.beforeOffset + this.beforeMatcher.start();
  }

  // Java: RuleMatcher#getBreakPosition()
  getBreakPosition() {
    return this.afterOffset + this.afterMatcher.start();
  }

  // Java: RuleMatcher#getRule()
  getRule() {
    return this.rule;
  }
}

// Java: net.loomchild.segment.srx.SrxTextIterator (CharSequence constructor)
export class SrxTextIterator {
  // Java: SrxTextIterator#SrxTextIterator(SrxDocument,String,CharSequence,Map)
  constructor(document, languageCode, text, parameterMap = new Map()) {
    const parameters = new Map(parameterMap);
    parameters.set(MARGIN_PARAMETER, 0);
    if (text === null || text === undefined) {
      throw new NullPointerException('Cannot invoke "java.lang.CharSequence.length()" because "text" is null');
    }
    this.text = String(text);
    this.init(document, languageCode, parameters);
  }

  // Java: SrxTextIterator#init(SrxDocument,String,TextManager,Map)
  init(document, languageCode, parameterMap) {
    const margin = getParameter(parameterMap.get(MARGIN_PARAMETER), DEFAULT_MARGIN);
    const maxLookbehindConstructLength = getParameter(
      parameterMap.get(MAX_LOOKBEHIND_CONSTRUCT_LENGTH_PARAMETER), DEFAULT_MAX_LOOKBEHIND_CONSTRUCT_LENGTH);
    const defaultPatternFlags = getParameter(parameterMap.get(DEFAULT_PATTERN_FLAGS_PARAMETER), 0);
    setDefaultPatternFlags(defaultPatternFlags);
    if (this.text.length > 0 && this.text.length <= margin) { // textManager.getBufferLength() is the text length
      throw new IllegalArgumentException(`Margin: ${margin} must be smaller than buffer itself: ${this.text.length}.`);
    }
    this.document = document;
    this.segment = null;
    this.start = 0;
    this.end = 0;
    this.margin = margin;
    this.ruleMatcherList = [];
    const languageRuleList = document.getLanguageRuleList(languageCode);
    const key = `RULE_MANAGER_${languageRulesToString(languageRuleList)}_${maxLookbehindConstructLength}`;
    let ruleManager = document.getCache().get(key);
    if (ruleManager === null) {
      ruleManager = new RuleManager(document, languageRuleList, maxLookbehindConstructLength);
      document.getCache().put(key, ruleManager);
    }
    this.ruleManager = ruleManager;
  }

  // Java: SrxTextIterator#next()
  next() {
    if (this.hasNext()) {
      if (this.segment === null) this.initMatchers();
      let endFound = false;
      while (!endFound) {
        const matcher = this.getMinMatcher();
        if (matcher === null) { // no more text can be read, so the last segment ends with the text
          endFound = true;
          this.end = this.text.length;
        } else {
          this.end = matcher.getBreakPosition();
          if (this.end > this.start) {
            endFound = this.isException(matcher);
            if (endFound) this.cutMatchers();
          }
        }
        this.moveMatchers();
      }
      this.segment = this.text.substring(this.start, this.end);
      this.start = this.end;
      return this.segment;
    }
    return null;
  }

  // Java: SrxTextIterator#hasNext()
  hasNext() {
    return this.start < this.text.length;
  }

  // Java: SrxTextIterator#initMatchers()
  initMatchers() {
    this.ruleMatcherList = [];
    for (const rule of this.ruleManager.getBreakRuleList()) {
      const ruleMatcher = new RuleMatcher(this.document, rule, this.text);
      ruleMatcher.find();
      if (!ruleMatcher.hitEnd()) this.ruleMatcherList.push(ruleMatcher);
    }
  }

  // Java: SrxTextIterator#moveMatchers()
  moveMatchers() {
    const kept = [];
    for (const ruleMatcher of this.ruleMatcherList) {
      let removed = false;
      while (ruleMatcher.getBreakPosition() <= this.end) {
        ruleMatcher.find();
        if (ruleMatcher.hitEnd()) {
          removed = true;
          break;
        }
      }
      if (!removed) kept.push(ruleMatcher);
    }
    this.ruleMatcherList = kept;
  }

  // Java: SrxTextIterator#cutMatchers()
  cutMatchers() {
    const kept = [];
    for (const ruleMatcher of this.ruleMatcherList) {
      let removed = false;
      if (ruleMatcher.getStartPosition() < this.end) {
        ruleMatcher.findFrom(this.end);
        if (ruleMatcher.hitEnd()) removed = true;
      }
      if (!removed) kept.push(ruleMatcher);
    }
    this.ruleMatcherList = kept;
  }

  // Java: SrxTextIterator#getMinMatcher()
  getMinMatcher() {
    let min = 2147483647;
    let minMatcher = null;
    for (const ruleMatcher of this.ruleMatcherList) {
      if (ruleMatcher.getBreakPosition() < min) {
        min = ruleMatcher.getBreakPosition();
        minMatcher = ruleMatcher;
      }
    }
    return minMatcher;
  }

  // Java: SrxTextIterator#isException(RuleMatcher); true when no exception rule matches at the break
  isException(ruleMatcher) {
    const pattern = this.ruleManager.getExceptionPattern(ruleMatcher.getRule());
    if (pattern !== null) {
      return !pattern.matcher(this.text).match(ruleMatcher.getBreakPosition(), 0); // lookingAt() on region [break,length) with transparent bounds
    }
    return true;
  }
}
