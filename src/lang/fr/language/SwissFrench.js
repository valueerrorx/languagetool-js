// Java: org.languagetool.language.SwissFrench
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { French } from './French.js';

let instantiationTrace = null; // Java: SwissFrench#instantiationTrace

// Java: SwissFrench
export class SwissFrench extends French {
  static FQCN = 'org.languagetool.language.SwissFrench';

  // Java: SwissFrench#SwissFrench()
  constructor() {
    super(true);
    const trace = instantiationTrace;
    if (trace !== null) {
      throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
    }
    instantiationTrace = new Throwable();
  }

  // Java: SwissFrench#getName()
  getName() {
    return 'French (Switzerland)';
  }

  // Java: SwissFrench#getCountries()
  getCountries() {
    return ['CH'];
  }

  // Java: SwissFrench#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return ['DOUBLER_UNE_CLASSE'];
  }
}

registerClass(SwissFrench.FQCN, SwissFrench);
