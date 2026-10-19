// org.languagetool.rules.en.EnglishSpecificCaseRule
import { AbstractSpecificCaseRule } from '../../../core/rules/AbstractSpecificCaseRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

// Java: EnglishSpecificCaseRule
export class EnglishSpecificCaseRule extends AbstractSpecificCaseRule {
  static FQCN = 'org.languagetool.rules.en.EnglishSpecificCaseRule';

  // Java: EnglishSpecificCaseRule#getPhrasesPath()
  getPhrasesPath() {
    return '/en/specific_case.txt';
  }

  // Java: EnglishSpecificCaseRule#getInitialCapitalMessage()
  getInitialCapitalMessage() {
    return 'If the term is a proper noun, use initial capitals.';
  }

  // Java: EnglishSpecificCaseRule#getOtherCapitalizationMessage()
  getOtherCapitalizationMessage() {
    return 'If the term is a proper noun, use the suggested capitalization.';
  }

  // Java: EnglishSpecificCaseRule#getShortMessage()
  getShortMessage() {
    return 'Proper noun';
  }

  // Java: EnglishSpecificCaseRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setUrl(getUrl('https://languagetool.org/insights/post/spelling-capital-letters/'));
    this.addExamplePair(Example.wrong('I really like <marker>Harry potter</marker>.'),
      Example.fixed('I really like <marker>Harry Potter</marker>.'));
  }

  // Java: EnglishSpecificCaseRule#getId()
  getId() {
    return 'EN_SPECIFIC_CASE';
  }

  // Java: EnglishSpecificCaseRule#getDescription()
  getDescription() {
    return 'Checks upper/lower case spelling of some proper nouns';
  }
}
