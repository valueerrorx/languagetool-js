// org.languagetool.rules.de.MorfologikGermanyGermanSpellerRule (deprecated plain morfologik speller without compound support, not registered)
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const RESOURCE_FILENAME = '/de/hunspell/de_DE.dict'; // Java: MorfologikGermanyGermanSpellerRule#RESOURCE_FILENAME

// Java: MorfologikGermanyGermanSpellerRule
export class MorfologikGermanyGermanSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.de.MorfologikGermanyGermanSpellerRule';

  // Java: MorfologikGermanyGermanSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.addExamplePair(Example.wrong('LanguageTool kann mehr als eine <marker>nromale</marker> Rechtschreibprüfung.'),
      Example.fixed('LanguageTool kann mehr als eine <marker>normale</marker> Rechtschreibprüfung.'));
  }

  // Java: MorfologikGermanyGermanSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikGermanyGermanSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_DE_DE';
  }
}
