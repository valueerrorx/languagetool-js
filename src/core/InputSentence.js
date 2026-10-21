// org.languagetool.InputSentence (cache key of rule matches per sentence)
import { Objects } from '../lib/java/Objects.js';
import { listHashCode, setHashCode } from '../lib/java/hash.js';
import { Long } from '../lib/java/long.js';

// JS: rule/category sets are Set (ids) or Map (id string -> CategoryId); Java equals/hashCode of Set<String> and Set<CategoryId> over the ids
const elements = (s) => (s instanceof Map ? [...s.keys()] : [...s]);
const setEquals = (a, b) => {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const x = elements(a);
  const y = new Set(elements(b));
  return x.length === y.size && x.every((e) => y.has(e));
};
const hashOf = (s) => (s === null || s === undefined ? 0 : setHashCode(elements(s)));
const listEquals = (a, b) => a.length === b.length && a.every((x, i) => Objects.equals(x, b[i]));
const toneEquals = (a, b) => a.size === b.size && [...a].every((t) => b.has(t));

export class InputSentence {
  static FQCN = 'org.languagetool.InputSentence';

  // Java: InputSentence#InputSentence(...) (11 args: textSessionID from userConfig, no tone tags; 12 args with Set toneTags; 13 args with Long textSessionID)
  constructor(text, lang, motherTongue, disabledRules, disabledRuleCategories, enabledRules, enabledRuleCategories, userConfig,
    altLanguages, mode, level, ...rest) {
    let textSessionID;
    let toneTags;
    if (rest.length === 0) {
      textSessionID = userConfig !== null && userConfig !== undefined ? userConfig.getTextSessionId() : null;
      toneTags = null;
    } else if (rest.length === 1) {
      textSessionID = userConfig !== null && userConfig !== undefined ? userConfig.getTextSessionId() : null;
      toneTags = rest[0];
    } else {
      textSessionID = rest[0];
      toneTags = rest[1];
    }
    this.analyzedSentence = text;
    this.lang = Objects.requireNonNull(lang);
    this.motherTongue = motherTongue ?? null;
    this.disabledRules = disabledRules;
    this.disabledRuleCategories = disabledRuleCategories;
    this.enabledRules = enabledRules;
    this.enabledRuleCategories = enabledRuleCategories;
    this.userConfig = userConfig ?? null;
    this.textSessionID = textSessionID ?? null;
    this.altLanguages = altLanguages;
    this.mode = Objects.requireNonNull(mode);
    this.level = Objects.requireNonNull(level);
    this.toneTags = toneTags !== null && toneTags !== undefined ? toneTags : new Set();
  }

  // Java: InputSentence#getAnalyzedSentence()
  getAnalyzedSentence() {
    return this.analyzedSentence;
  }

  // Java: InputSentence#equals(Object)
  equals(o) {
    if (o === null || o === undefined) return false;
    if (o === this) return true;
    if (o.constructor !== this.constructor) return false;
    return Objects.equals(this.analyzedSentence.getText(), o.analyzedSentence.getText())
      && Objects.equals(this.lang, o.lang)
      && Objects.equals(this.motherTongue, o.motherTongue)
      && setEquals(this.disabledRules, o.disabledRules)
      && setEquals(this.disabledRuleCategories, o.disabledRuleCategories)
      && setEquals(this.enabledRules, o.enabledRules)
      && setEquals(this.enabledRuleCategories, o.enabledRuleCategories)
      && Objects.equals(this.userConfig, o.userConfig)
      && Objects.equals(this.textSessionID, o.textSessionID)
      && listEquals(this.altLanguages, o.altLanguages)
      && this.mode === o.mode
      && this.level === o.level
      && toneEquals(this.toneTags, o.toneTags);
  }

  // Java: InputSentence#hashCode()
  hashCode() {
    return Objects.hash(this.analyzedSentence.getText(), this.lang, this.motherTongue, hashOf(this.disabledRules), hashOf(this.disabledRuleCategories),
      hashOf(this.enabledRules), hashOf(this.enabledRuleCategories), this.userConfig, this.textSessionID === null ? 0 : Long.hashCode(this.textSessionID), listHashCode(this.altLanguages),
      this.mode, this.level, setHashCode(this.toneTags));
  }

  // Java: InputSentence#toString()
  toString() {
    return this.analyzedSentence.getText();
  }
}
