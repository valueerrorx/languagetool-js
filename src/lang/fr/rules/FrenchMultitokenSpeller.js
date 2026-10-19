// org.languagetool.rules.fr.FrenchMultitokenSpeller
import { MultitokenSpeller } from '../../../core/rules/spelling/multitoken/MultitokenSpeller.js';
import { Languages } from '../../../core/Languages.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: FrenchMultitokenSpeller (INSTANCE is the shared component 'org.languagetool.rules.fr.FrenchMultitokenSpeller')
export class FrenchMultitokenSpeller extends MultitokenSpeller {
  static FQCN = 'org.languagetool.rules.fr.FrenchMultitokenSpeller';

  // Java: FrenchMultitokenSpeller()
  constructor() {
    super(Languages.getLanguageForShortCode('fr'), ['/fr/multiwords.txt', '/spelling_global.txt', '/fr/hyphenated_words.txt']);
  }
}
registerComponent(FrenchMultitokenSpeller.FQCN, () => new FrenchMultitokenSpeller());
