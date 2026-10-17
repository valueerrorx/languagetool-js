// org.languagetool.rules.patterns.Unifier (F28 stub: construction works, any use is not ported yet)
import { notPortedYet } from '../language/components.js';

// Java: Unifier
export class Unifier {
  static FQCN = 'org.languagetool.rules.patterns.Unifier';

  // Java: Unifier(Map,Map)
  constructor(equivalenceTypes = null, equivalenceFeatures = null) {
    this.equivalenceTypes = equivalenceTypes;
    this.equivalenceFeatures = equivalenceFeatures;
  }

  // Java: Unifier#reset()
  reset() {
    throw notPortedYet('Unifier#reset (F28)');
  }

  // Java: Unifier#addNeutralElement(AnalyzedTokenReadings)
  addNeutralElement() {
    throw notPortedYet('Unifier#addNeutralElement (F28)');
  }

  // Java: Unifier#isUnified(AnalyzedToken,Map,boolean)
  isUnified() {
    throw notPortedYet('Unifier#isUnified (F28)');
  }

  // Java: Unifier#getFinalUnified()
  getFinalUnified() {
    throw notPortedYet('Unifier#getFinalUnified (F28)');
  }
}
