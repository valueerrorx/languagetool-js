// Java: org.languagetool.synthesis.FrenchSynthesizer
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const exceptionsEgrave = ['burkinabè', 'koinè', 'épistémè'];

// Java: FrenchSynthesizer
export class FrenchSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.FrenchSynthesizer';

  // Java: FrenchSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(FrenchSynthesizer.FQCN);
  }

  // Java: FrenchSynthesizer#FrenchSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super('fr/fr.sor', '/fr/french_synth.dict', '/fr/french_tags.txt', 'fr');
  }

  // Java: FrenchSynthesizer#isException(String)
  isException(w) {
    // remove: qq, qqe...
    if (w.startsWith('qq')) {
      return true;
    }
    // informè V ind pres 1 s
    if (w.endsWith('è') && !exceptionsEgrave.includes(toLowerCase(w))) {
      return true;
    }
    return false;
  }
}

registerComponent(FrenchSynthesizer.FQCN, () => new FrenchSynthesizer());
