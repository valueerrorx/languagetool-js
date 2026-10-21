// Java: org.languagetool.rules.sl.MorfologikSlovenianSpellerRule
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { registerComponent } from '../../../core/language/components.js';

const RESOURCE_FILENAME = '/sl/hunspell/sl_SI.dict';

// Java: MorfologikSlovenianSpellerRule
export class MorfologikSlovenianSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.sl.MorfologikSlovenianSpellerRule';

  // Java: MorfologikSlovenianSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
  }

  // Java: MorfologikSlovenianSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikSlovenianSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_SL_SI';
  }
}

registerComponent(MorfologikSlovenianSpellerRule.FQCN, (...args) => new MorfologikSlovenianSpellerRule(...args));
