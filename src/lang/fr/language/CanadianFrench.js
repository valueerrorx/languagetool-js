// Java: org.languagetool.language.CanadianFrench
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { French } from './French.js';

let instantiationTrace = null; // Java: CanadianFrench#instantiationTrace

// Java: CanadianFrench
export class CanadianFrench extends French {
  static FQCN = 'org.languagetool.language.CanadianFrench';

  // Java: CanadianFrench#CanadianFrench()
  constructor() {
    super(true);
    const trace = instantiationTrace;
    if (trace !== null) {
      throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
    }
    instantiationTrace = new Throwable();
  }

  // Java: CanadianFrench#getName()
  getName() {
    return 'French (Canada)';
  }

  // Java: CanadianFrench#getCountries()
  getCountries() {
    return ['CA'];
  }

  // Java: CanadianFrench#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return ['DOUBLER_UNE_CLASSE'];
  }
}

registerClass(CanadianFrench.FQCN, CanadianFrench);
