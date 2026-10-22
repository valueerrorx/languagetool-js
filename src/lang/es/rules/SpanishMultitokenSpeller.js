// Java: org.languagetool.rules.es.SpanishMultitokenSpeller
import { MultitokenSpeller } from '../../../core/rules/spelling/multitoken/MultitokenSpeller.js';
import { Languages } from '../../../core/Languages.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: SpanishMultitokenSpeller (INSTANCE is the shared component 'org.languagetool.rules.es.SpanishMultitokenSpeller')
export class SpanishMultitokenSpeller extends MultitokenSpeller {
  static FQCN = 'org.languagetool.rules.es.SpanishMultitokenSpeller';

  // Java: SpanishMultitokenSpeller()
  constructor() {
    super(Languages.getLanguageForShortCode('es'), ['/es/multiwords.txt', '/spelling_global.txt', '/es/hyphenated_words.txt']);
  }
}
registerComponent(SpanishMultitokenSpeller.FQCN, () => new SpanishMultitokenSpeller());
