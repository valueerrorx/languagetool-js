// org.languagetool.rules.patterns.PatternRuleId
import { IllegalArgumentException, NullPointerException } from '../../lib/java/errors.js';

// Java: Validate#notEmpty(CharSequence,String) (commons-lang3)
function notEmpty(chars, message) {
  if (chars === null || chars === undefined) throw new NullPointerException(message);
  if (chars.length === 0) throw new IllegalArgumentException(message);
}

// Java: PatternRuleId
export class PatternRuleId {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleId';

  // Java: PatternRuleId(String) / PatternRuleId(String,String)
  constructor(id, subId) {
    notEmpty(id, 'id must be set');
    if (subId === undefined) {
      this.id = id;
      this.subId = null;
    } else {
      notEmpty(subId, 'subId must be set, if specified');
      this.id = id;
      this.subId = subId;
    }
  }

  // Java: PatternRuleId#getId()
  getId() {
    return this.id;
  }

  // Java: PatternRuleId#getSubId()
  getSubId() {
    return this.subId;
  }

  // Java: PatternRuleId#toString()
  toString() {
    if (this.subId !== null) {
      return `${this.id}[${this.subId}]`;
    }
    return this.id;
  }
}
