// org.languagetool.rules.patterns.UnifierConfiguration (equivalence types and features for unification; createUnifier comes with F28)
import { JavaConcurrentHashMap } from '../../lib/java/collections/JavaConcurrentHashMap.js';
import { notPortedYet, registerComponent } from '../language/components.js';
import { registerClass } from '../resources/ClassBroker.js';
import { EquivalenceTypeLocator } from './EquivalenceTypeLocator.js';

// Java: UnifierConfiguration
export class UnifierConfiguration {
  static FQCN = 'org.languagetool.rules.patterns.UnifierConfiguration';

  // Java: UnifierConfiguration#UnifierConfiguration()
  constructor() {
    // workaround for issue #13
    this.equivalenceTypes = new JavaConcurrentHashMap();
    this.equivalenceFeatures = new JavaConcurrentHashMap();
  }

  /**
   * Prepares equivalence types for features to be tested. All equivalence
   * types are given as PatternTokens. They create an equivalence set (with abstraction).
   */
  // Java: UnifierConfiguration#setEquivalence(String,String,PatternToken)
  setEquivalence(feature, type, elem) {
    const typeKey = new EquivalenceTypeLocator(feature, type);
    if (this.equivalenceTypes.containsKey(typeKey)) {
      return;
    }
    this.equivalenceTypes.put(typeKey, elem);

    let lTypes;
    if (this.equivalenceFeatures.containsKey(feature)) {
      lTypes = this.equivalenceFeatures.get(feature);
    } else {
      lTypes = [];
      this.equivalenceFeatures.put(feature, lTypes);
    }
    lTypes.push(type);
  }

  // Java: UnifierConfiguration#getEquivalenceTypes()
  getEquivalenceTypes() {
    return this.equivalenceTypes; // Collections.unmodifiableMap view in Java
  }

  // Java: UnifierConfiguration#getEquivalenceFeatures()
  getEquivalenceFeatures() {
    return this.equivalenceFeatures; // Collections.unmodifiableMap view in Java
  }

  // Java: UnifierConfiguration#createUnifier()
  createUnifier() {
    throw notPortedYet('Unifier (F28)');
  }
}

registerComponent(UnifierConfiguration.FQCN, () => new UnifierConfiguration());
registerClass(UnifierConfiguration.FQCN, UnifierConfiguration);
