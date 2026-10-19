// org.languagetool.rules.en.EnglishMultitokenSpeller
import { MultitokenSpeller } from '../../../core/rules/spelling/multitoken/MultitokenSpeller.js';
import { Languages } from '../../../core/Languages.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: EnglishMultitokenSpeller (INSTANCE is the shared component 'org.languagetool.rules.en.EnglishMultitokenSpeller')
export class EnglishMultitokenSpeller extends MultitokenSpeller {
  static FQCN = 'org.languagetool.rules.en.EnglishMultitokenSpeller';

  // Java: EnglishMultitokenSpeller()
  constructor() {
    super(Languages.getLanguageForShortCode('en'), ['/en/multiwords.txt', '/spelling_global.txt']); // , "/en/hyphenated_words.txt"
  }
}
registerComponent(EnglishMultitokenSpeller.FQCN, () => new EnglishMultitokenSpeller());
