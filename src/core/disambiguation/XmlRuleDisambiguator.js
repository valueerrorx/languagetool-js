// org.languagetool.tagging.disambiguation.rules.XmlRuleDisambiguator (rule-based disambiguator: language file + optional global file)
import { RuntimeException } from '../../lib/java/errors.js';
import { Objects } from '../../lib/java/Objects.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { RuleSet } from '../patterns/RuleSet.js';
import { AbstractDisambiguator } from '../tagging/disambiguation/AbstractDisambiguator.js';
import { DisambiguationRuleLoader } from './DisambiguationRuleLoader.js';

const DISAMBIGUATION_FILE = 'disambiguation.xml';
const GLOBAL_DISAMBIGUATION_FILE = 'disambiguation-global.xml';

// Java: XmlRuleDisambiguator
export class XmlRuleDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.XmlRuleDisambiguator';

  // Java: XmlRuleDisambiguator(Language) / XmlRuleDisambiguator(Language,boolean); by default no global disambiguation
  constructor(language, useGlobalDisambiguation = false) {
    super();
    Objects.requireNonNull(language);
    const disambiguationFile = `${language.getShortCode()}/${DISAMBIGUATION_FILE}`;
    let disambiguationRulesList;
    try {
      disambiguationRulesList = this.loadPatternRules(disambiguationFile, language);
    } catch (e) {
      if (e.notPorted === true) throw e;
      throw new RuntimeException(`Problems with loading disambiguation file: ${disambiguationFile}`, e);
    }
    if (useGlobalDisambiguation) {
      // disambiguation-global.xml
      try {
        disambiguationRulesList.push(...this.loadPatternRules(GLOBAL_DISAMBIGUATION_FILE, language));
      } catch (e) {
        if (e.notPorted === true) throw e;
        throw new RuntimeException(`Problems with loading global disambiguation file: ${GLOBAL_DISAMBIGUATION_FILE}`, e);
      }
    }
    this.disambiguationRules = RuleSet.textHinted(disambiguationRulesList);
  }

  // Java: XmlRuleDisambiguator#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(sentence, checkCanceled = null) {
    for (const rule of this.disambiguationRules.rulesForSentence(sentence)) {
      if (checkCanceled !== null && checkCanceled.checkCancelled()) {
        break;
      }
      sentence = rule.replace(sentence);
    }
    return sentence;
  }

  // Java: XmlRuleDisambiguator#loadPatternRules(String,Language)
  loadPatternRules(filename, language) {
    const ruleLoader = new DisambiguationRuleLoader();
    return ruleLoader.getRules(getDataBroker().getFromResourceDirAsStream(filename), language, filename);
  }
}
