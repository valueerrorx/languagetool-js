// Java: org.languagetool.tagging.disambiguation.ru.RussianHybridDisambiguator
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';
import { Russian } from '../language/Russian.js';

// Java: RussianHybridDisambiguator
export class RussianHybridDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.ru.RussianHybridDisambiguator';

  // Java: RussianHybridDisambiguator#RussianHybridDisambiguator() (field initialisers: chunker, then XML rules)
  constructor() {
    super();
    this.chunker = MultiWordChunker.getInstance('/ru/multiwords.txt');
    this.disambiguator = new XmlRuleDisambiguator(Russian.getInstance());
  }

  // Java: RussianHybridDisambiguator#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, checkCanceled = null) {
    return this.disambiguator.disambiguate(this.chunker.disambiguate(input, checkCanceled), checkCanceled);
  }

  // Java: RussianHybridDisambiguator#getInstance()
  static getInstance() {
    return sharedComponent(RussianHybridDisambiguator.FQCN);
  }
}

registerComponent(RussianHybridDisambiguator.FQCN, () => new RussianHybridDisambiguator());
