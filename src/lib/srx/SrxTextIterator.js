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

const PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
const ZERO_WIDTH = new Set(['bound', 'look', 'begin', 'end', 'caret', 'dollar', 'lastMatch', 'empty']);

// not Java: set of code points the first (last) consumed char of the node must be in, null = unknown or the node may be empty
function edgeSet(n, last) {
  switch (n.k) {
    case 'set': return n.set;
    case 'group': case 'atomic': return edgeSet(n.body, last);
    case 'loop': return n.min >= 1 ? edgeSet(n.body, last) : null;
    case 'alt': {
      let u = null;
      for (const a of n.alts) {
        const x = edgeSet(a, last);
        if (x === null) return null;
        u = u === null ? x : u.union(x);
      }
      return u;
    }
    case 'seq': {
      for (let j = 0; j < n.items.length; j++) {
        const it = n.items[last ? n.items.length - 1 - j : j];
        if (ZERO_WIDTH.has(it.k)) continue;
        return edgeSet(it, last);
      }
      return null;
    }
    default: return null;
  }
}

// not Java: one exception rule as its own pattern with a cheap pre-check of the chars around the break
class ExceptionAlt {
  constructor(str, before, after) {
    this.str = str;
    this.before = before;
    this.after = after;
    this.info = undefined;
    this.pat = null;
  }

  // the pre-check (null sets = no constraint); a pattern that does not compile gets none
  edges(document) {
    if (this.info === undefined) {
      let lastSet = null;
      let firstSet = null;
      try {
        if (this.before.length > 0) lastSet = edgeSet(compile(document, this.before).root, true);
        if (this.after.length > 0) firstSet = edgeSet(compile(document, this.after).root, false);
      } catch (e) {
        lastSet = null;
        firstSet = null;
      }
      this.info = { lastSet, firstSet };
    }
    return this.info;
  }

  // false when the chars at pos make a match impossible (text without surrogate pairs)
  mayMatchAt(document, text, pos) {
    const { lastSet, firstSet } = this.edges(document);
    if (lastSet !== null && (pos <= 0 || pos > text.length || !lastSet.has(text.charCodeAt(pos - 1)))) return false;
    if (firstSet !== null && (pos < 0 || pos >= text.length || !firstSet.has(text.charCodeAt(pos)))) return false;
    return true;
  }

  pattern(document) {
    if (this.pat === null) this.pat = compile(document, this.str);
    return this.pat;
  }
}

// Java: net.loomchild.segment.srx.RuleManager
class RuleManager {
  // Java: RuleManager#RuleManager(SrxDocument,List,int)
  constructor(document, languageRuleList, maxLookbehindConstructLength) {
    this.document = document;
    this.maxLookbehindConstructLength = maxLookbehindConstructLength;
    this.breakRuleList = [];
    this.exceptionPatternMap = new Map();
    this.exceptionRules = []; // not Java: the exception rules in order, with the count seen by each break rule
    this.exceptionCountMap = new Map();
    let exceptionPatternStringBuilder = '';
    for (const languageRule of languageRuleList) {
      for (const rule of languageRule.getRuleList()) {
        if (rule.isBreak()) {
          this.breakRuleList.push(rule);
          const exceptionPattern = exceptionPatternStringBuilder.length > 0
            ? compile(this.document, exceptionPatternStringBuilder) : null;
          this.exceptionPatternMap.set(rule, exceptionPattern);
          this.exceptionCountMap.set(rule, this.exceptionRules.length);
        } else {
          this.exceptionRules.push(new ExceptionAlt(this.createExceptionPatternString(rule), finitize(rule.getBeforePattern(), this.maxLookbehindConstructLength), rule.getAfterPattern()));
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

  // not Java: true when one of the first n exception rules matches at pos (same result as lookingAt of the combined exception pattern)
  anyException(rule, combined, text, pos, textHasPair) {
    const n = this.exceptionCountMap.get(rule);
    if (textHasPair || !this.splitable()) return combined.matcher(text).match(pos, 0);
    for (let i = 0; i < n; i++) {
      const alt = this.exceptionRules[i];
      if (!alt.mayMatchAt(this.document, text, pos)) continue;
      if (alt.pattern(this.document).matcher(text).match(pos, 0)) return true;
    }
    return false;
  }

  // not Java: the alternatives are independent patterns unless one uses a back reference (group numbers differ)
  splitable() {
    if (this.splitOk === undefined) this.splitOk = !this.exceptionRules.some((a) => /\\[1-9k]/.test(a.before) || /\\[1-9k]/.test(a.after));
    return this.splitOk;
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
      if (this.textHasPair === undefined) this.textHasPair = PAIR.test(this.text);
      return !this.ruleManager.anyException(ruleMatcher.getRule(), pattern, this.text, ruleMatcher.getBreakPosition(), this.textHasPair); // lookingAt() on region [break,length) with transparent bounds
    }
    return true;
  }
}
