// Java: org.languagetool.rules.sk.MorfologikSlovakSpellerRule
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { registerComponent } from '../../../core/language/components.js';

const RESOURCE_FILENAME = '/sk/hunspell/sk_SK.dict';

// Java: MorfologikSlovakSpellerRule
export class MorfologikSlovakSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.sk.MorfologikSlovakSpellerRule';

  // Java: MorfologikSlovakSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
  }

  // Java: MorfologikSlovakSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikSlovakSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_SK_SK';
  }
}

registerComponent(MorfologikSlovakSpellerRule.FQCN, (...args) => new MorfologikSlovakSpellerRule(...args));
