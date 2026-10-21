// org.languagetool.rules.de.SwissCompoundRule
import { GermanCompoundRule } from './GermanCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { javaReplace } from '../../../lib/java/strings.js';

let compoundData = null; // Java: static volatile compoundData

// Java: SwissCompoundRule.SwissExpander
class SwissExpander {
  // Java: SwissCompoundRule.SwissExpander#expandLine(String)
  expandLine(line) {
    if (line.includes('ß')) {
      return [line, javaReplace(line, 'ß', 'ss')]; // accept both, assuming Swiss users sometimes deal with GermanyGerman text
    }
    return [line];
  }
}

// Java: SwissCompoundRule
export class SwissCompoundRule extends GermanCompoundRule {
  static FQCN = 'org.languagetool.rules.de.SwissCompoundRule';

  // Java: SwissCompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig);
  }

  // Java: SwissCompoundRule#getId()
  getId() {
    return 'DE_CH_COMPOUNDS';
  }

  // Java: SwissCompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    let data = compoundData;
    if (data === null) {
      compoundData = data = new CompoundRuleData(new SwissExpander(), '/de/compounds.txt', '/de/compound-cities.txt');
    }
    return data;
  }
}
