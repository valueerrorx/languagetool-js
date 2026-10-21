// Java: org.languagetool.synthesis.it.ItalianSynthesizer
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';

// Java: ItalianSynthesizer
export class ItalianSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.it.ItalianSynthesizer';

  // Java: ItalianSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(ItalianSynthesizer.FQCN);
  }

  // Java: ItalianSynthesizer#ItalianSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super(null, '/it/italian_synth.dict', '/it/italian_tags.txt', 'it');
  }
}

registerComponent(ItalianSynthesizer.FQCN, () => new ItalianSynthesizer());
