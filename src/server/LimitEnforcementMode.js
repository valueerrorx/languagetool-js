// Java: org.languagetool.server.LimitEnforcementMode
import { JavaEnum } from '../lib/java/JavaEnum.js';

export class LimitEnforcementMode extends JavaEnum {
  static FQCN = 'org.languagetool.server.LimitEnforcementMode';

  // Java: LimitEnforcementMode#LimitEnforcementMode(int)
  constructor(name, ordinal, id) {
    super(name, ordinal);
    this.id = id;
  }

  // Java: LimitEnforcementMode#parse(Integer)
  static parse(value) {
    if (value === null || value === undefined || value <= 0) {
      return LimitEnforcementMode.DISABLED;
    }
    for (const mode of LimitEnforcementMode.values()) {
      if (mode.id === value) {
        return mode;
      }
    }
    process.stderr.write(`Invalid value for limit enforcement mode encountered: '${value}'; Falling back to DISABLED mode.\n`);
    return LimitEnforcementMode.DISABLED;
  }

  // Java: LimitEnforcementMode#getId()
  getId() {
    return this.id;
  }
}
LimitEnforcementMode.DISABLED = new LimitEnforcementMode('DISABLED', 0, 1);
LimitEnforcementMode.PER_DAY = new LimitEnforcementMode('PER_DAY', 1, 2);
