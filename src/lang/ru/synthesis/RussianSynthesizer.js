// Java: org.languagetool.synthesis.ru.RussianSynthesizer
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseSynthesizer } from '../../../core/tagging/synthesis/BaseSynthesizer.js';

// Java: RussianSynthesizer
export class RussianSynthesizer extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.ru.RussianSynthesizer';

  // Java: RussianSynthesizer#INSTANCE
  static get INSTANCE() {
    return sharedComponent(RussianSynthesizer.FQCN);
  }

  // Java: RussianSynthesizer#RussianSynthesizer() (the deprecated (Language) constructor delegates here)
  constructor() {
    super(null, '/ru/russian_synth.dict', '/ru/tags_russian.txt', 'ru');
  }
}

registerComponent(RussianSynthesizer.FQCN, () => new RussianSynthesizer());
