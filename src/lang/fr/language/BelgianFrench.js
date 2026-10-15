// Java: org.languagetool.language.BelgianFrench
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { French } from './French.js';

let instantiationTrace = null; // Java: BelgianFrench#instantiationTrace

// Java: BelgianFrench
export class BelgianFrench extends French {
  static FQCN = 'org.languagetool.language.BelgianFrench';

  // Java: BelgianFrench#BelgianFrench()
  constructor() {
    super(true);
    const trace = instantiationTrace;
    if (trace !== null) {
      throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
    }
    instantiationTrace = new Throwable();
  }

  // Java: BelgianFrench#getName()
  getName() {
    return 'French (Belgium)';
  }

  // Java: BelgianFrench#getCountries()
  getCountries() {
    return ['BE'];
  }

  // Java: BelgianFrench#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return ['DOUBLER_UNE_CLASSE'];
  }
}

registerClass(BelgianFrench.FQCN, BelgianFrench);
