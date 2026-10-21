// org.languagetool.rules.fr.CompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { FrenchTagger } from '../tagging/FrenchTagger.js';

let compoundData = null; // Java: static volatile compoundData

// Java: CompoundRule
export class CompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.fr.CompoundRule';

  // Java: CompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Écrivez avec un trait d’union.',
      'Écrivez avec un mot seul sans espace ni trait d’union.',
      'Écrivez avec un mot seul ou avec trait d’union.',
      'Erreur de trait d’union');
    this.addExamplePair(Example.wrong('Le <marker>Haut Rhin</marker>.'),
      Example.fixed('Le <marker>Haut-Rhin</marker>.'));
    super.useSubRuleSpecificIds();
  }

  // Java: CompoundRule#getId()
  getId() {
    return 'FR_COMPOUNDS';
  }

  // Java: CompoundRule#getDescription()
  getDescription() {
    return 'Mots avec trait d’union : $match';
  }

  // Java: CompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/fr/compounds.txt');
    }
    return compoundData;
  }

  // Java: CompoundRule#isMisspelled(String)
  isMisspelled(word) {
    return !FrenchTagger.INSTANCE.tag([word])[0].isTagged();
  }
}
