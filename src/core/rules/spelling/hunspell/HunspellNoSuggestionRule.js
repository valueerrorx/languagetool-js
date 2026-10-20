// org.languagetool.rules.spelling.hunspell.HunspellNoSuggestionRule (like HunspellRule, but without suggestions)
import { HunspellRule } from './HunspellRule.js';
import { registerComponent } from '../../../language/components.js';

// Java: HunspellNoSuggestionRule
export class HunspellNoSuggestionRule extends HunspellRule {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.HunspellNoSuggestionRule';
  static RULE_ID = 'HUNSPELL_NO_SUGGEST_RULE';

  // Java: HunspellNoSuggestionRule(ResourceBundle,Language,UserConfig,List[,IncorrectExample,CorrectExample])
  constructor(messages, language, userConfig, altLanguages, incorrectExample, correctedExample) {
    super(messages, language, userConfig, altLanguages);
    if (incorrectExample !== undefined) {
      this.addExamplePair(incorrectExample, correctedExample);
    }
  }

  // Java: HunspellNoSuggestionRule#getId()
  getId() {
    return HunspellNoSuggestionRule.RULE_ID;
  }

  // Java: HunspellNoSuggestionRule#getDescription()
  getDescription() {
    return this.messages.getString('desc_spelling_no_suggestions');
  }

  // Java: HunspellNoSuggestionRule#getSuggestions(String)
  getSuggestions() {
    return [];
  }
}
registerComponent(HunspellNoSuggestionRule.FQCN, (...args) => new HunspellNoSuggestionRule(...args));
