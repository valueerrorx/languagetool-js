// org.languagetool.tagging.disambiguation.xx.DemoDisambiguator (copies input to output)
import { registerComponent } from '../../../language/components.js';
import { AbstractDisambiguator } from '../AbstractDisambiguator.js';

// Java: DemoDisambiguator
export class DemoDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.xx.DemoDisambiguator';

  // Java: DemoDisambiguator#disambiguate(AnalyzedSentence)
  disambiguate(input) {
    return input;
  }
}

registerComponent(DemoDisambiguator.FQCN, () => new DemoDisambiguator());
