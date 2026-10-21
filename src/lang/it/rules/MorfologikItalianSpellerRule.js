// Java: org.languagetool.rules.it.MorfologikItalianSpellerRule
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { registerComponent } from '../../../core/language/components.js';
import { isCapitalizedWord } from '../../../core/text/StringTools.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const RESOURCE_FILENAME = '/it/hunspell/it_IT.dict';

// Java: MorfologikItalianSpellerRule
export class MorfologikItalianSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.it.MorfologikItalianSpellerRule';

  // Java: MorfologikItalianSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
  }

  // Java: MorfologikItalianSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikItalianSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_IT_IT';
  }

  // Java: MorfologikItalianSpellerRule#orderSuggestions(List,String)
  orderSuggestions(suggestions, word) {
    const newSuggestions = [];
    const originalSuggestionsStr = [];
    for (const suggestion of suggestions) {
      originalSuggestionsStr.push(suggestion.getReplacement());
    }
    for (const suggestion of suggestions) {
      const suggestionStr = suggestion.getReplacement();
      // original word is not capitalized, suggestion is capitalized, and lowercase suggestion also exists
      if (!isCapitalizedWord(word) && isCapitalizedWord(suggestionStr)
          && originalSuggestionsStr.includes(toLowerCase(suggestionStr))) {
        continue;
      }
      newSuggestions.push(suggestion);
    }
    return newSuggestions;
  }
}

registerComponent(MorfologikItalianSpellerRule.FQCN, (...args) => new MorfologikItalianSpellerRule(...args));
