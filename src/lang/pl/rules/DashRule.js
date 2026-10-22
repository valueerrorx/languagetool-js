// Java: org.languagetool.rules.pl.DashRule
import { AbstractDashRule } from '../../../core/rules/AbstractDashRule.js';

let trie = null; // Java: DashRule#trie (static, loaded once)

// Java: DashRule
export class DashRule extends AbstractDashRule {
  static FQCN = 'org.languagetool.rules.pl.DashRule';

  // Java: DashRule(ResourceBundle)
  constructor(messages) {
    super(messages);
  }

  // Java: DashRule#getDescription()
  getDescription() {
    return 'Sprawdza, czy wyrazy pisane z łącznikiem zapisano z myślnikami (np. „Lądek — Zdrój” zamiast „Lądek-Zdrój”).';
  }

  // Java: DashRule#getMessage()
  getMessage() {
    return 'Błędne użycie myślnika zamiast łącznika.';
  }

  // Java: DashRule#getCompoundsData()
  getCompoundsData() {
    if (trie === null) {
      trie = AbstractDashRule.loadCompoundFile('/pl/compounds.txt');
    }
    return trie;
  }
}
