// org.languagetool.UserConfig and org.languagetool.LinguServices (null path: no LinguServices in CLI/server)
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Long } from '../../../lib/java/long.js';
import { javaCompare, javaSplit } from '../../../lib/java/strings.js';
import { listHashCode, mapHashCode, stringHashCode } from '../../../lib/java/hash.js';

// Java: org.languagetool.LinguServices
export class LinguServices {
  static FQCN = 'org.languagetool.LinguServices';

  // Java: LinguServices#getSynonyms(String,Language)
  getSynonyms() {
    return [];
  }

  // Java: LinguServices#isCorrectSpell(String,Language)
  isCorrectSpell() {
    return false;
  }

  // Java: LinguServices#getNumberOfSyllables(String,Language)
  getNumberOfSyllables() {
    return 0;
  }

  // Java: LinguServices#setThesaurusRelevantRule(Rule)
  setThesaurusRelevantRule() {
  }
}

// Java: UserConfig.TokenType
export class TokenType extends JavaEnum {
  static FQCN = 'org.languagetool.UserConfig.TokenType';
}
TokenType.INVALID_TOKEN = new TokenType('INVALID_TOKEN', 0);
TokenType.NO_TOKEN = new TokenType('NO_TOKEN', 1);
TokenType.TEST_TOKEN = new TokenType('TEST_TOKEN', 2);
TokenType.TRIAL_TOKEN = new TokenType('TRIAL_TOKEN', 3);

let abTestEnabled = false;

// Java: commons-lang3 HashCodeBuilder(3, 11) step for an int contribution
const step = (total, h) => (Math.imul(total, 11) + h) | 0;

export class UserConfig {
  static FQCN = 'org.languagetool.UserConfig';
  static TokenType = TokenType;

  // Java: UserConfig#enableABTests()
  static enableABTests() {
    abTestEnabled = true;
  }

  // Java: UserConfig#hasABTestsEnabled()
  static hasABTestsEnabled() {
    return abTestEnabled;
  }

  // Java: UserConfig constructors, dispatched on argument count/types:
  // () (List) (Map) (Map,LinguServices) (List,Map) (List,Map,int,Long,String,Long,LinguServices) and the 13/16/17/18 argument forms
  // (List words, List rules, Map ruleValues, int maxSpellingSuggestions, Long premiumUid, String userDictName, Long userDictCacheSize,
  //  LinguServices, boolean filterDictionaryMatches, List abTest, Long textSessionId, boolean hidePremiumMatches, List preferredLanguages,
  //  [boolean trustedSource, boolean optInThirdPartyAI, boolean isPremium, [TokenType, [boolean suggestionsEnabled]]]); Long = BigInt
  constructor(...a) {
    let args;
    switch (a.length) {
      case 0: args = [[], [], new Map()]; break;
      case 1: args = Array.isArray(a[0]) ? [a[0], [], new Map()] : [[], [], Objects.requireNonNull(a[0])]; break;
      case 2: args = Array.isArray(a[0]) ? [a[0], [], a[1]] : [[], [], Objects.requireNonNull(a[0]), 0, 0n, null, 0n, a[1]]; break;
      case 7: args = [a[0], [], a[1], a[2], a[3], a[4], a[5], a[6]]; break;
      default: args = a;
    }
    const [userSpecificSpellerWords, userSpecificRules, ruleValues, maxSpellingSuggestions = 0, premiumUid = null, userDictName = null,
      userDictCacheSize = null, linguServices = null, filterDictionaryMatches = false, abTest = null, textSessionId = null,
      hidePremiumMatches = false, preferredLanguages = null, trustedSource = false, optInThirdPartyAI = false, isPremium = false,
      tokenType = TokenType.NO_TOKEN, suggestionsEnabled = true] = args;
    this.configurableRuleValues = new Map();
    this.userSpecificSpellerWords = Objects.requireNonNull(userSpecificSpellerWords);
    this.userSpecificRules = Objects.requireNonNull(userSpecificRules);
    for (const [k, v] of ruleValues) {
      this.configurableRuleValues.set(k, v);
    }
    this.maxSpellingSuggestions = maxSpellingSuggestions;
    this.premiumUid = premiumUid;
    this.userDictName = userDictName === null || userDictName === undefined ? 'default' : userDictName;
    this.userDictCacheSize = userDictCacheSize;
    this.linguServices = linguServices;
    this.filterDictionaryMatches_ = filterDictionaryMatches;
    this.abTest = abTest;
    this.textSessionId = textSessionId;
    this.hidePremiumMatches = hidePremiumMatches;
    this.acceptedPhrases = this.#buildAcceptedPhrases();
    this.preferredLanguages = UserConfig.#removeAllButMainLanguagesAndSort(preferredLanguages);
    this.trustedSource = trustedSource;
    this.optInThirdPartyAI = optInThirdPartyAI;
    this.premium = isPremium;
    this.tokenType = tokenType;
    this.suggestionsEnabled = suggestionsEnabled;
  }

  // Java: UserConfig#removeAllButMainLanguagesAndSort(List)
  static #removeAllButMainLanguagesAndSort(preferredLanguages) {
    const cleanLangList = preferredLanguages !== null && preferredLanguages !== undefined ? [...preferredLanguages] : [];
    const kept = cleanLangList.filter((language) => language === 'de' || language === 'en' || language === 'es' || language === 'fr' || language === 'nl' || language === 'pt');
    kept.sort(javaCompare);
    return kept.length >= 2 ? kept.join(',') : '';
  }

  // Java: UserConfig#getAcceptedWords()
  getAcceptedWords() {
    return this.userSpecificSpellerWords;
  }

  // Java: UserConfig#buildAcceptedPhrases()
  #buildAcceptedPhrases() {
    const phrases = new Set();
    for (const wordOrPhrase of this.userSpecificSpellerWords) {
      if (wordOrPhrase.includes(' ')) {
        phrases.add(wordOrPhrase);
      }
    }
    return phrases;
  }

  // Java: UserConfig#getAcceptedPhrases()
  getAcceptedPhrases() {
    return this.acceptedPhrases;
  }

  // Java: UserConfig#getRules()
  getRules() {
    return this.userSpecificRules;
  }

  // Java: UserConfig#getMaxSpellingSuggestions()
  getMaxSpellingSuggestions() {
    return this.maxSpellingSuggestions;
  }

  // Java: UserConfig#getConfigValues()
  getConfigValues() {
    return this.configurableRuleValues;
  }

  // Java: UserConfig#insertConfigValues(Map)
  insertConfigValues(ruleValues) {
    for (const [k, v] of ruleValues) {
      this.configurableRuleValues.set(k, v);
    }
  }

  // Java: UserConfig#getConfigValueByID(String)
  getConfigValueByID(ruleID) {
    if (this.configurableRuleValues.has(ruleID)) {
      return this.configurableRuleValues.get(ruleID);
    }
    return null;
  }

  // Java: UserConfig#hasLinguServices()
  hasLinguServices() {
    return this.linguServices !== null;
  }

  // Java: UserConfig#getLinguServices()
  getLinguServices() {
    return this.linguServices;
  }

  // Java: UserConfig#getUserDictCacheSize()
  getUserDictCacheSize() {
    return this.userDictCacheSize;
  }

  // Java: UserConfig#getUserDictName()
  getUserDictName() {
    return this.userDictName;
  }

  // Java: UserConfig#getPremiumUid()
  getPremiumUid() {
    return this.premiumUid;
  }

  // Java: UserConfig#isSuggestionsEnabled()
  isSuggestionsEnabled() {
    return this.suggestionsEnabled;
  }

  // Java: UserConfig#isTrustedSource() (lombok @Getter)
  isTrustedSource() {
    return this.trustedSource;
  }

  // Java: UserConfig#isOptInThirdPartyAI() (lombok @Getter)
  isOptInThirdPartyAI() {
    return this.optInThirdPartyAI;
  }

  // Java: UserConfig#isPremium() (lombok @Getter of isPremium)
  isPremium() {
    return this.premium;
  }

  // Java: UserConfig#getTokenType() (lombok @Getter)
  getTokenType() {
    return this.tokenType;
  }

  // Java: sum of userSpecificRules.stream().mapToLong(k -> k.getId().hashCode()).sum()
  #rulesIdHashSum() {
    let sum = 0n;
    for (const k of this.userSpecificRules) sum = BigInt.asIntN(64, sum + BigInt(stringHashCode(k.getId())));
    return sum;
  }

  // Java: UserConfig#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return mapEquals(this.configurableRuleValues, o.configurableRuleValues)
      && this.#rulesIdHashSum() === o.#rulesIdHashSum()
      && Objects.equals(this.premiumUid, o.premiumUid)
      && Objects.equals(this.userDictName, o.userDictName)
      && listEquals(this.userSpecificSpellerWords, o.userSpecificSpellerWords)
      && this.filterDictionaryMatches_ === o.filterDictionaryMatches_
      && listEquals(this.abTest, o.abTest)
      && this.hidePremiumMatches === o.hidePremiumMatches
      && this.preferredLanguages === o.preferredLanguages
      && this.trustedSource === o.trustedSource
      && this.optInThirdPartyAI === o.optInThirdPartyAI
      && this.premium === o.premium
      && this.tokenType === o.tokenType
      && this.suggestionsEnabled === o.suggestionsEnabled;
  }

  // Java: UserConfig#hashCode() (HashCodeBuilder(3, 11); Object[] values hash by identity as in Java)
  hashCode() {
    const longH = (v) => Long.hashCode(v);
    const bool = (b) => (b ? 0 : 1);
    let t = 3;
    t = step(t, this.maxSpellingSuggestions);
    t = step(t, longH(this.#rulesIdHashSum()));
    t = step(t, this.premiumUid === null ? 0 : longH(this.premiumUid));
    t = step(t, this.userDictName === null ? 0 : stringHashCode(this.userDictName));
    t = step(t, this.userDictCacheSize === null ? 0 : longH(this.userDictCacheSize));
    t = step(t, mapHashCode(this.configurableRuleValues));
    t = step(t, this.abTest === null ? 0 : listHashCode(this.abTest));
    t = step(t, bool(this.filterDictionaryMatches_));
    t = step(t, bool(this.hidePremiumMatches));
    t = step(t, stringHashCode(this.preferredLanguages));
    t = step(t, bool(this.trustedSource));
    t = step(t, bool(this.optInThirdPartyAI));
    t = step(t, bool(this.premium));
    t = step(t, Objects.hashCode(this.tokenType));
    t = step(t, bool(this.suggestionsEnabled));
    return t;
  }

  // Java: UserConfig#toString()
  toString() {
    const entries = [...this.configurableRuleValues].map(([k, v]) => `${k}=[Ljava.lang.Object;@${(Objects.hashCode(v) >>> 0).toString(16)}`);
    return 'UserConfig{'
      + `dictionarySize=${this.userSpecificSpellerWords.length}`
      + `, maxSpellingSuggestions=${this.maxSpellingSuggestions}`
      + `, userDictName='${this.userDictName}'`
      + `, configurableRuleValues={${entries.join(', ')}}`
      + `, linguServices=${this.linguServices === null ? 'null' : this.linguServices}`
      + `, filterDictionaryMatches=${this.filterDictionaryMatches_}`
      + `, textSessionId=${this.textSessionId === null ? 'null' : this.textSessionId}`
      + `, hidePremiumMatches=${this.hidePremiumMatches}`
      + `, abTest='${this.abTest === null ? 'null' : `[${this.abTest.join(', ')}]`}'`
      + `, optInThirdPartyAI=${this.optInThirdPartyAI}`
      + `, suggestionsEnabled=${this.suggestionsEnabled}`
      + '}';
  }

  // Java: UserConfig#getTextSessionId()
  getTextSessionId() {
    return this.textSessionId;
  }

  // Java: UserConfig#getAbTest()
  getAbTest() {
    return this.abTest;
  }

  // Java: UserConfig#filterDictionaryMatches()
  filterDictionaryMatches() {
    return this.filterDictionaryMatches_;
  }

  // Java: UserConfig#getHidePremiumMatches()
  getHidePremiumMatches() {
    return this.hidePremiumMatches;
  }

  // Java: UserConfig#getPreferredLanguages()
  getPreferredLanguages() {
    return javaSplit(this.preferredLanguages, ',');
  }
}

// Java: AbstractMap#equals for Map<String,Object[]> (array values compare by identity, as Object[].equals)
function mapEquals(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (!b.has(k) || b.get(k) !== v) return false;
  }
  return true;
}

// Java: EqualsBuilder#append(Object,Object) for lists/null (element-wise equals)
function listEquals(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.length === b.length && a.every((x, i) => Objects.equals(x, b[i]));
}
