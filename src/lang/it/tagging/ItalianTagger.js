// Java: org.languagetool.tagging.it.ItalianTagger
import { Locale } from '../../../lib/java/Locale.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: ItalianTagger
export class ItalianTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.it.ItalianTagger';

  // Java: ItalianTagger#ItalianTagger()
  constructor() {
    super('/it/italian.dict', Locale.ITALIAN);
  }
}

registerComponent(ItalianTagger.FQCN, () => new ItalianTagger());
