// org.languagetool.Premium and PremiumOff (PremiumOn is not part of this distribution)
import { AbstractMethodError, ClassNotFoundException, RuntimeException } from '../../../lib/java/errors.js';
import { getClassBroker } from '../../resources/LtStatics.js';

const tempNotPremiumRules = [];

export class Premium {
  static FQCN = 'org.languagetool.Premium';

  // Java: Premium#isTempNotPremium(Rule)
  static isTempNotPremium(rule) {
    return tempNotPremiumRules.includes(rule.getId());
  }

  // Java: Premium#isPremiumStatusCheck(AnnotatedText)
  static isPremiumStatusCheck(text) {
    const testRuleText = 'languagetool testrule 8634756';
    const testRuleText2 = 'The languagetool testrule 8634756.';
    return testRuleText2 === text.getOriginalText() || testRuleText === text.getOriginalText();
  }

  // Java: Premium#get()
  static get() {
    const className = 'org.languagetool.PremiumOn';
    try {
      const Cls = getClassBroker().forName(className);
      return new Cls();
    } catch (e) {
      if (e instanceof ClassNotFoundException) return new PremiumOff();
      throw new RuntimeException(`Object for class '${className}' could not be created`, e);
    }
  }

  // Java: Premium#isPremiumVersion()
  static isPremiumVersion() {
    const className = 'org.languagetool.PremiumOn';
    try {
      const Cls = getClassBroker().forName(className);
      new Cls();
      return true;
    } catch (e) {
      if (e instanceof ClassNotFoundException) return false;
      throw new RuntimeException(`Object for class '${className}' could not be created`, e);
    }
  }

  // Java: Premium#isPremiumRule(Rule)
  isPremiumRule() {
    throw new AbstractMethodError('org.languagetool.Premium.isPremiumRule(Rule)');
  }
}

// Java: org.languagetool.PremiumOff
export class PremiumOff extends Premium {
  static FQCN = 'org.languagetool.PremiumOff';

  // Java: PremiumOff#isPremiumRule(Rule)
  isPremiumRule() {
    return false;
  }
}
