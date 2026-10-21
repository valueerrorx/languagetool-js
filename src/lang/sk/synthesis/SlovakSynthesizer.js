// Java: org.languagetool.synthesis.sk.SlovakSynthesizer
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';

const RESOURCE_FILENAME = '/sk/slovak_synth.dict';
const TAGS_FILE_NAME = '/sk/slovak_tags.txt';

// Java: SlovakSynthesizer
export class SlovakSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.sk.SlovakSynthesizer';

  // Java: SlovakSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(SlovakSynthesizer.FQCN);
  }

  // Java: SlovakSynthesizer#SlovakSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super(null, RESOURCE_FILENAME, TAGS_FILE_NAME, 'sk');
  }
}

registerComponent(SlovakSynthesizer.FQCN, () => new SlovakSynthesizer());
