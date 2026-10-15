// Port of net.loomchild.segment.srx.{SrxDocument,SrxDocumentCache,LanguageMap,LanguageRule,Rule}.
import { NullPointerException } from '../java/errors.js';
import { Pattern } from '../java/regex/index.js';

// Java: net.loomchild.segment.srx.Rule
export class Rule {
  // Java: Rule#Rule(boolean,String,String)
  constructor(breaking, beforePattern, afterPattern) {
    this.breaking = breaking;
    this.beforePattern = beforePattern;
    this.afterPattern = afterPattern;
  }

  // Java: Rule#isBreak()
  isBreak() {
    return this.breaking;
  }

  // Java: Rule#getBeforePattern()
  getBeforePattern() {
    return this.beforePattern;
  }

  // Java: Rule#getAfterPattern()
  getAfterPattern() {
    return this.afterPattern;
  }
}

// Java: net.loomchild.segment.srx.LanguageRule
export class LanguageRule {
  // Java: LanguageRule#LanguageRule(String[,List])
  constructor(name, ruleList = []) {
    this.ruleList = [...ruleList];
    this.name = name;
  }

  // Java: LanguageRule#getRuleList()
  getRuleList() {
    return this.ruleList;
  }

  // Java: LanguageRule#addRule(Rule)
  addRule(rule) {
    this.ruleList.push(rule);
  }

  // Java: LanguageRule#getName()
  getName() {
    return this.name;
  }
}

// Java: net.loomchild.segment.srx.LanguageMap
export class LanguageMap {
  // Java: LanguageMap#LanguageMap(String,LanguageRule)
  constructor(languagePattern, languageRule) {
    this.languagePattern = Pattern.compile(languagePattern);
    this.languageRule = languageRule;
  }

  // Java: LanguageMap#matches(String)
  matches(languageCode) {
    if (languageCode === null || languageCode === undefined) {
      throw new NullPointerException('Cannot invoke "java.lang.CharSequence.length()" because "this.text" is null');
    }
    return this.languagePattern.matcher(languageCode).matches();
  }

  // Java: LanguageMap#getLanguagePattern()
  getLanguagePattern() {
    return this.languagePattern;
  }

  // Java: LanguageMap#getLanguageRule()
  getLanguageRule() {
    return this.languageRule;
  }
}

// Java: net.loomchild.segment.srx.SrxDocumentCache
export class SrxDocumentCache {
  constructor() {
    this.map = new Map();
  }

  // Java: SrxDocumentCache#get(String)
  get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  // Java: SrxDocumentCache#put(String,Object)
  put(key, value) {
    this.map.set(key, value);
  }
}

// Java: net.loomchild.segment.srx.SrxDocument
export class SrxDocument {
  // Java: SrxDocument#SrxDocument([boolean])
  constructor(cascade = true) {
    this.cascade = cascade;
    this.languageMapList = [];
    this.cache = new SrxDocumentCache();
  }

  // Java: SrxDocument#setCascade(boolean)
  setCascade(cascade) {
    this.cascade = cascade;
  }

  // Java: SrxDocument#getCascade()
  getCascade() {
    return this.cascade;
  }

  // Java: SrxDocument#addLanguageMap(String,LanguageRule)
  addLanguageMap(languagePattern, languageRule) {
    this.languageMapList.push(new LanguageMap(languagePattern, languageRule));
  }

  // Java: SrxDocument#getLanguageMapList()
  getLanguageMapList() {
    return this.languageMapList;
  }

  // Java: SrxDocument#getLanguageRuleList(String)
  getLanguageRuleList(languageCode) {
    const list = [];
    for (const languageMap of this.languageMapList) {
      if (languageMap.matches(languageCode)) {
        list.push(languageMap.getLanguageRule());
        if (!this.cascade) break;
      }
    }
    return list;
  }

  // Java: SrxDocument#getCache()
  getCache() {
    return this.cache;
  }
}
