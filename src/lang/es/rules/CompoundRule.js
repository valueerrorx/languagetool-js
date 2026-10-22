// Java: org.languagetool.rules.es.CompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { SpanishTagger } from '../tagging/SpanishTagger.js';

let compoundData = null; // Java: static volatile compoundData

// Java: CompoundRule (es)
export class CompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.es.CompoundRule';

  // Java: CompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Se escribe con un guion.',
      'Se escribe junto sin espacio ni guion.',
      'Se escribe junto o con un guion.',
      'Error de palabra compuesta');
    super.useSubRuleSpecificIds();
    this.addExamplePair(Example.wrong('<marker>Guinea Conakri</marker>.'),
      Example.fixed('<marker>Guinea-Conakri</marker>.'));
  }

  // Java: CompoundRule#getId()
  getId() {
    return 'ES_COMPOUNDS';
  }

  // Java: CompoundRule#getDescription()
  getDescription() {
    return 'Palabras compuestas con guion: $match';
  }

  // Java: CompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/es/compounds.txt');
    }
    return compoundData;
  }

  // Java: CompoundRule#isMisspelled(String)
  isMisspelled(word) {
    return !SpanishTagger.INSTANCE.tag([word])[0].isTagged();
  }
}
