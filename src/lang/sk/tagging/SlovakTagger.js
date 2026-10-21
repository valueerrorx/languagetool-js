// Java: org.languagetool.tagging.sk.SlovakTagger
import { Locale } from '../../../lib/java/Locale.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: SlovakTagger
export class SlovakTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.sk.SlovakTagger';

  // Java: SlovakTagger#SlovakTagger()
  constructor() {
    super('/sk/slovak.dict', new Locale('sk'));
  }
}

registerComponent(SlovakTagger.FQCN, () => new SlovakTagger());
