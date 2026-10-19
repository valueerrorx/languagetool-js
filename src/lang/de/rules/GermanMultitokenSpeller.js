// org.languagetool.rules.de.GermanMultitokenSpeller
import { MultitokenSpeller } from '../../../core/rules/spelling/multitoken/MultitokenSpeller.js';
import { Languages } from '../../../core/Languages.js';
import { registerComponent } from '../../../core/language/components.js';
import { substring } from '../../../lib/java/strings.js';

// Java: GermanMultitokenSpeller (INSTANCE is the shared component 'org.languagetool.rules.de.GermanMultitokenSpeller')
export class GermanMultitokenSpeller extends MultitokenSpeller {
  static FQCN = 'org.languagetool.rules.de.GermanMultitokenSpeller';

  // Java: GermanMultitokenSpeller()
  constructor() {
    super(Languages.getLanguageForShortCode('de-DE'), ['/de/multitoken-suggest.txt', '/spelling_global.txt', 'de/hunspell/spelling.txt']);
  }

  // Java: GermanMultitokenSpeller#isException(String,String)
  isException(original, candidate) {
    if (substring(original, 0, original.length - 1) === candidate) {
      if (original.endsWith('s') || original.endsWith('-')) {
        return true;
      }
    }
    return false;
  }
}
registerComponent(GermanMultitokenSpeller.FQCN, () => new GermanMultitokenSpeller());
