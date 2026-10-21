// Lazy access to GermanyGerman (import cycle German -> rules -> GermanyGerman -> German); same class as the Java static import
import { getClassBroker } from '../../../core/resources/LtStatics.js';

export const GermanyGerman = {
  // Java: GermanyGerman#getInstance()
  getInstance() {
    return getClassBroker().forName('org.languagetool.language.GermanyGerman').getInstance();
  },
};
