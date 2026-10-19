// org.languagetool.rules.en.EnglishDashRule
import { AbstractDashRule } from '../../../core/rules/AbstractDashRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

let trie = null; // Java: EnglishDashRule#trie (static, loaded once)

// Java: EnglishDashRule
export class EnglishDashRule extends AbstractDashRule {
  static FQCN = 'org.languagetool.rules.en.EnglishDashRule';

  // Java: EnglishDashRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.addExamplePair(Example.wrong("I'll buy a new <marker>T—shirt</marker>."),
      Example.fixed("I'll buy a new <marker>T-shirt</marker>."));
    this.setUrl(getUrl('https://languagetool.org/insights/post/hyphen/'));
  }

  // Java: EnglishDashRule#getId()
  getId() {
    return 'EN_DASH_RULE';
  }

  // Java: EnglishDashRule#getDescription()
  getDescription() {
    return "Checks if hyphenated words were spelled with dashes (e.g., 'T — shirt' instead 'T-shirt').";
  }

  // Java: EnglishDashRule#getMessage()
  getMessage() {
    return 'A dash was used instead of a hyphen.';
  }

  // Java: EnglishDashRule#getCompoundsData()
  getCompoundsData() {
    if (trie === null) {
      trie = AbstractDashRule.loadCompoundFile('/en/compounds.txt');
    }
    return trie;
  }
}
