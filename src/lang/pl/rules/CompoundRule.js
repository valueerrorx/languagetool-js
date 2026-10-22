// Java: org.languagetool.rules.pl.CompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Example } from '../../../core/rules/model/Examples.js';

let compoundData = null; // Java: static volatile compoundData

// Java: CompoundRule (pl)
export class CompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.pl.CompoundRule';

  // Java: CompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Ten wyraz pisze się z łącznikiem.',
      'Ten wyraz pisze się razem (bez spacji ani łącznika).',
      'Ten wyraz pisze się z łącznikiem lub bez niego.',
      'Brak łącznika lub zbędny łącznik');
    this.addExamplePair(Example.wrong('Witamy w <marker>Rabce Zdroju</marker>.'),
      Example.fixed('Witamy w <marker>Rabce-Zdroju</marker>.'));
  }

  // Java: CompoundRule#getId()
  getId() {
    return 'PL_COMPOUNDS';
  }

  // Java: CompoundRule#getDescription()
  getDescription() {
    return 'Sprawdza wyrazy z łącznikiem, np. „łapu capu” zamiast „łapu-capu”';
  }

  // Java: CompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/pl/compounds.txt');
    }
    return compoundData;
  }
}
