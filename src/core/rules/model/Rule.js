// org.languagetool.rules.Rule (abstract base class of all rules)
import { AbstractMethodError, IOException, NullPointerException, RuntimeException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Categories, Category, CategoryIds } from './Category.js';
import { IncorrectExample } from './Examples.js';
import { ITSIssueType } from './ITSIssueType.js';
import { Tag, ToneTag } from './Tag.js';
import { UserConfig } from './UserConfig.js';
import { getMessageBundle } from '../../resources/ResourceBundleTools.js';

const MISC = new Category(CategoryIds.MISC, 'Miscellaneous');

const ERRORS_THAT_CAN_BE_CORRECTED_ALL_AT_ONCE = new Set([
  'FALSCHES_ANFUEHRUNGSZEICHEN',
  'TYPOGRAFISCHE_ANFUEHRUNGSZEICHEN',
  'TYPOGRAFISCHE_ANFUEHRUNGSZEICHEN_CH',
  'TYPOGRAFISCHE_ANFUEHRUNGSZEICHEN_2',
  'TYPOGRAFISCHE_APOSTROPHE',
  'EN_QUOTES',
  'WRONG_APOSTROPHE',
  'PARAGRAF_LEERZEICHEN',
  'CONSISTENCYRULE_JE_F',
  'CONSISTENCYRULE_JE_M',
  'COMILLAS_TIPOGRAFICAS',
  'COMETES_TIPOGRAFIQUES',
  'TYPOGRAFISCHE_AANHALINGSTEKENS',
  'PT_SMART_QUOTES',
  'GL_SMART_QUOTES',
]);

export class Rule {
  static FQCN = 'org.languagetool.rules.Rule';
  // set by the DisambiguationPatternRule port (used by makeAntiPatterns); class with static DisambiguatorAction
  static disambiguationPatternRuleClass = null;

  #tags = null;
  #toneTags = null;
  #isGoalSpecific = false;
  #correctExamples = null;
  #incorrectExamples = null;
  #errorTriggeringExamples = null;
  #locQualityIssueType = ITSIssueType.Uncategorized;
  #category = null;
  #url = null;
  #isPremium = false;
  #defaultOff = false;
  #defaultTempOff = false;
  #officeDefaultOn = false;
  #officeDefaultOff = false;
  #includedInHiddenMatches = true;
  #minPrevMatches = 0; // minimum number of previous matches to show the rule
  #distanceTokens = -1; // distance (number of tokens) between matches to consider a repetition
  #priority = 0;

  // Java: Rule#Rule() / Rule(ResourceBundle)
  constructor(messages = null) {
    this.messages = messages;
    if (messages !== null && messages !== undefined) {
      this.setCategory(Categories.MISC.getCategory(messages)); // the default, sub classes may overwrite this
    } else {
      this.setCategory(MISC);
    }
  }

  // Java: Rule#getId()
  getId() {
    throw new AbstractMethodError('org.languagetool.rules.Rule.getId()');
  }

  // Java: Rule#getFullId()
  getFullId() {
    if (this.getSubId() !== null) {
      return `${this.getId()}[${this.getSubId()}]`;
    }
    return this.getId();
  }

  // Java: Rule#getSubId()
  getSubId() {
    return null;
  }

  // Java: Rule#getSourceFile()
  getSourceFile() {
    return null;
  }

  // Java: Rule#getDescription()
  getDescription() {
    throw new AbstractMethodError('org.languagetool.rules.Rule.getDescription()');
  }

  // Java: Rule#match(AnalyzedSentence)
  match() {
    throw new AbstractMethodError('org.languagetool.rules.Rule.match(AnalyzedSentence)');
  }

  // Java: Rule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 0;
  }

  // Java: Rule#getAntiPatterns()
  getAntiPatterns() {
    return [];
  }

  // Java: Rule#getRuleOptions()
  getRuleOptions() {
    return null;
  }

  // Java: Rule#getSentenceWithImmunization(AnalyzedSentence)
  getSentenceWithImmunization(sentence) {
    const antiPatterns = this.getAntiPatterns();
    if (antiPatterns.length !== 0) {
      // we need a copy of the sentence, not reference to the old one
      let immunizedSentence = sentence.copy(sentence);
      for (let i = 0; i < antiPatterns.length; i++) {
        try {
          immunizedSentence = antiPatterns[i].replace(immunizedSentence);
        } catch (e) {
          if (e instanceof IOException) throw new RuntimeException(e);
          throw e;
        }
      }
      return immunizedSentence;
    }
    return sentence;
  }

  // Java: Rule#makeAntiPatterns(List,Language)
  static makeAntiPatterns(patternList, language) {
    const DPR = Rule.disambiguationPatternRuleClass;
    if (DPR === null) throw Object.assign(new Error('not ported: DisambiguationPatternRule'), { notPorted: true });
    const rules = [];
    for (const patternTokens of patternList) {
      rules.push(new DPR('INTERNAL_ANTIPATTERN', '(no description)', language, patternTokens, null, null, DPR.DisambiguatorAction.IMMUNIZE));
    }
    return rules;
  }

  // Java: Rule#cacheAntiPatterns(Language,List) (Suppliers.memoize)
  static cacheAntiPatterns(language, antiPatterns) {
    let done = false;
    let value;
    return () => {
      if (!done) {
        value = Rule.makeAntiPatterns(antiPatterns, language);
        done = true;
      }
      return value;
    };
  }

  // Java: Rule#supportsLanguage(Language)
  supportsLanguage(language) {
    try {
      const config = new UserConfig();
      const relevantRules = [...language.getRelevantRules(getMessageBundle(), config, null, [])]; // empty UserConfig has to be added to prevent null pointer exception
      relevantRules.push(...language.getRelevantLanguageModelCapableRules(getMessageBundle(), null, null, config, null, []));
      const relevantRuleClasses = relevantRules.map((r) => r.constructor);
      return relevantRuleClasses.includes(this.constructor);
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // Java: Rule#isDictionaryBasedSpellingRule()
  isDictionaryBasedSpellingRule() {
    return false;
  }

  // Java: Rule#useDictionaryBasedFilterForMatches()
  useDictionaryBasedFilterForMatches() {
    return this.isDictionaryBasedSpellingRule();
  }

  // Java: Rule#useInOffice()
  useInOffice() {
    return false;
  }

  // Java: Rule#setCorrectExamples(List)
  setCorrectExamples(correctExamples) {
    this.#correctExamples = correctExamples.length === 0 ? null : correctExamples;
  }

  // Java: Rule#getCorrectExamples()
  getCorrectExamples() {
    return this.#correctExamples === null ? [] : this.#correctExamples;
  }

  // Java: Rule#setIncorrectExamples(List)
  setIncorrectExamples(incorrectExamples) {
    this.#incorrectExamples = incorrectExamples.length === 0 ? null : incorrectExamples;
  }

  // Java: Rule#getIncorrectExamples()
  getIncorrectExamples() {
    return this.#incorrectExamples === null ? [] : this.#incorrectExamples;
  }

  // Java: Rule#setErrorTriggeringExamples(List)
  setErrorTriggeringExamples(examples) {
    this.#errorTriggeringExamples = examples.length === 0 ? null : examples;
  }

  // Java: Rule#getErrorTriggeringExamples()
  getErrorTriggeringExamples() {
    return this.#errorTriggeringExamples === null ? [] : this.#errorTriggeringExamples;
  }

  // Java: Rule#getCategory()
  getCategory() {
    return this.#category;
  }

  // Java: Rule#setCategory(Category)
  setCategory(category) {
    this.#category = Objects.requireNonNull(category, 'category cannot be null');
  }

  // Java: Rule#toRuleMatchArray(List)
  toRuleMatchArray(ruleMatches) {
    return ruleMatches.slice();
  }

  // Java: Rule#isDefaultOff()
  isDefaultOff() {
    return this.#defaultOff;
  }

  // Java: Rule#isDefaultTempOff()
  isDefaultTempOff() {
    return this.#defaultTempOff;
  }

  // Java: Rule#setDefaultOff()
  setDefaultOff() {
    this.#defaultOff = true;
  }

  // Java: Rule#setDefaultTempOff()
  setDefaultTempOff() {
    this.#defaultOff = true;
    this.#defaultTempOff = true;
  }

  // Java: Rule#setDefaultOn()
  setDefaultOn() {
    this.#defaultOff = false;
  }

  // Java: Rule#isOfficeDefaultOff()
  isOfficeDefaultOff() {
    return this.#officeDefaultOff;
  }

  // Java: Rule#isOfficeDefaultOn()
  isOfficeDefaultOn() {
    return this.#officeDefaultOn;
  }

  // Java: Rule#setOfficeDefaultOff()
  setOfficeDefaultOff() {
    this.#officeDefaultOff = true;
  }

  // Java: Rule#setOfficeDefaultOn()
  setOfficeDefaultOn() {
    this.#officeDefaultOn = true;
  }

  // Java: Rule#getUrl()
  getUrl() {
    return this.#url;
  }

  // Java: Rule#setUrl(URL)
  setUrl(url) {
    this.#url = url;
  }

  // Java: Rule#getLocQualityIssueType()
  getLocQualityIssueType() {
    return this.#locQualityIssueType;
  }

  // Java: Rule#setLocQualityIssueType(ITSIssueType)
  setLocQualityIssueType(locQualityIssueType) {
    this.#locQualityIssueType = Objects.requireNonNull(locQualityIssueType);
  }

  // Java: Rule#addExamplePair(IncorrectExample,CorrectExample)
  addExamplePair(incorrectSentence, correctSentence) {
    if (this.#correctExamples === null) {
      this.#correctExamples = [];
    }
    if (this.#incorrectExamples === null) {
      this.#incorrectExamples = [];
    }
    const correctExample = correctSentence.getExample();
    const markerStart = correctExample.indexOf('<marker>');
    const markerEnd = correctExample.indexOf('</marker>');
    if (markerStart !== -1 && markerEnd !== -1) {
      const correction = [correctExample.substring(markerStart + '<marker>'.length, markerEnd)];
      this.#incorrectExamples.push(new IncorrectExample(incorrectSentence.getExample(), correction));
    } else {
      this.#incorrectExamples.push(incorrectSentence);
    }
    this.#correctExamples.push(correctSentence);
  }

  // Java: Rule#setExamplePair(IncorrectExample,CorrectExample)
  setExamplePair(incorrectSentence, correctSentence) {
    if (this.#incorrectExamples !== null) {
      this.#incorrectExamples.length = 0;
    }
    if (correctSentence !== null && correctSentence !== undefined) {
      if (this.#correctExamples === null) throw new NullPointerException();
      this.#correctExamples.length = 0;
    }
    this.addExamplePair(incorrectSentence, correctSentence);
  }

  // Java: Rule#addTags(List)
  addTags(tags) {
    if (tags.length === 0) return;
    let myTags = this.#tags;
    if (myTags === null) {
      this.#tags = myTags = [];
    }
    for (const tag of tags) {
      if (myTags.every((k) => k.name() !== tag)) {
        myTags.push(Tag.valueOf(tag));
      }
    }
  }

  // Java: Rule#setTags(List)
  setTags(tags) {
    this.#tags = tags.length === 0 ? null : Objects.requireNonNull(tags);
  }

  // Java: Rule#getTags()
  getTags() {
    return this.#tags === null ? [] : this.#tags;
  }

  // Java: Rule#hasTag(Tag)
  hasTag(tag) {
    return this.#tags !== null && this.#tags.includes(tag);
  }

  // Java: Rule#addToneTags(List)
  addToneTags(toneTags) {
    if (toneTags === null || toneTags === undefined || toneTags.length === 0) {
      return;
    }
    let tags = this.#toneTags;
    if (tags === null) {
      this.#toneTags = tags = [];
    }
    for (const toneTag of toneTags) {
      if (tags.every((k) => k.name() !== toneTag)) {
        tags.push(ToneTag.valueOf(toneTag));
      }
    }
  }

  // Java: Rule#setToneTags(List)
  setToneTags(toneTags) {
    this.#toneTags = toneTags.length === 0 ? null : Objects.requireNonNull(toneTags);
  }

  // Java: Rule#getToneTags()
  getToneTags() {
    return this.#toneTags === null ? [] : this.#toneTags;
  }

  // Java: Rule#hasToneTag(ToneTag)
  hasToneTag(toneTag) {
    return this.#toneTags !== null && this.#toneTags.includes(toneTag);
  }

  // Java: Rule#isPremium()
  isPremium() {
    return this.#isPremium;
  }

  // Java: Rule#setPremium(boolean)
  setPremium(premium) {
    this.#isPremium = premium;
  }

  // Java: Rule#setMinPrevMatches(int)
  setMinPrevMatches(i) {
    this.#minPrevMatches = i;
  }

  // Java: Rule#getMinPrevMatches()
  getMinPrevMatches() {
    return this.#minPrevMatches;
  }

  // Java: Rule#setDistanceTokens(int)
  setDistanceTokens(i) {
    this.#distanceTokens = i;
  }

  // Java: Rule#getDistanceTokens()
  getDistanceTokens() {
    return this.#distanceTokens;
  }

  // Java: Rule#isGoalSpecific()
  isGoalSpecific() {
    return this.#isGoalSpecific;
  }

  // Java: Rule#setGoalSpecific(boolean)
  setGoalSpecific(goalSpecific) {
    this.#isGoalSpecific = goalSpecific;
  }

  // Java: Rule#getPriority()
  getPriority() {
    return this.#priority;
  }

  // Java: Rule#setPriority(int)
  setPriority(priority) {
    this.#priority = priority;
  }

  // Java: Rule#isIncludedInHiddenMatches()
  isIncludedInHiddenMatches() {
    return this.#includedInHiddenMatches;
  }

  // Java: Rule#setIncludedInHiddenMatches(boolean)
  setIncludedInHiddenMatches(includedInHiddenMatches) {
    this.#includedInHiddenMatches = includedInHiddenMatches;
  }

  // Java: Rule#isIncludedInErrorsCorrectedAllAtOnce()
  isIncludedInErrorsCorrectedAllAtOnce() {
    return ERRORS_THAT_CAN_BE_CORRECTED_ALL_AT_ONCE.has(this.getId());
  }
}
