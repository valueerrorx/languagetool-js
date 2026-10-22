// Java: org.languagetool.tagging.disambiguation.pl.PolishHybridDisambiguator
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';
import { Polish } from '../language/Polish.js';

// Java: PolishHybridDisambiguator
export class PolishHybridDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.pl.PolishHybridDisambiguator';

  // Java: PolishHybridDisambiguator#PolishHybridDisambiguator() (field initialisers: chunker, then a second Polish instance)
  constructor() {
    super();
    this.chunker = MultiWordChunker.getInstance('/pl/multiwords.txt');
    this.disambiguator = new XmlRuleDisambiguator(new Polish());
  }

  // Java: PolishHybridDisambiguator#disambiguate(AnalyzedSentence)
  disambiguate(input, checkCanceled = null) {
    return this.chunker.disambiguate(this.disambiguator.disambiguate(input, checkCanceled), checkCanceled);
  }
}

registerComponent(PolishHybridDisambiguator.FQCN, () => new PolishHybridDisambiguator());
