// Lazy access to French (import cycle French -> rules -> French); same class as the Java static import
import { getClassBroker } from '../../../core/resources/LtStatics.js';

export const French = {
  // Java: French#getInstance()
  getInstance() {
    return getClassBroker().forName('org.languagetool.language.French').getInstance();
  },
};
