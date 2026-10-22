// Java: org.languagetool.rules.ru.RussianDashRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { AbstractDashRule } from '../../../core/rules/AbstractDashRule.js';

const PATTERN = Pattern.compile('[Ѐ-ӿ]');
let trie = null; // Java: static volatile trie

// Java: RussianDashRule
export class RussianDashRule extends AbstractDashRule {
  static FQCN = 'org.languagetool.rules.ru.RussianDashRule';

  // Java: RussianDashRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setTags([]);
  }

  // Java: RussianDashRule#getId()
  getId() {
    return 'RU_DASH_RULE';
  }

  // Java: RussianDashRule#getDescription()
  getDescription() {
    return 'Тире вместо дефиса («из — за» вместо «из-за»).';
  }

  // Java: RussianDashRule#getMessage()
  getMessage() {
    return 'Использовано тире вместо дефиса.';
  }

  // Java: RussianDashRule#isBoundary(String)
  isBoundary(s) {
    return !PATTERN.matcher(s).matches();
  }

  // Java: RussianDashRule#getCompoundsData()
  getCompoundsData() {
    if (trie === null) {
      trie = AbstractDashRule.loadCompoundFile('/ru/compounds.txt');
    }
    return trie;
  }
}
