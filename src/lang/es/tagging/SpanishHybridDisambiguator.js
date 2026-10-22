// Java: org.languagetool.tagging.disambiguation.es.SpanishHybridDisambiguator
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';

// Java: SpanishHybridDisambiguator
export class SpanishHybridDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.es.SpanishHybridDisambiguator';

  // Java: SpanishHybridDisambiguator#SpanishHybridDisambiguator(Language) (field initialisers run first)
  constructor(lang) {
    super();
    this.chunker = MultiWordChunker.getInstance('/es/multiwords.txt', true, true, false);
    this.chunkerGlobal = MultiWordChunker.getInstance('/spelling_global.txt', false, true, false, 'NPCN000');
    this.disambiguator = new XmlRuleDisambiguator(lang, true);
    this.chunker.setRemovePreviousTags(true);
  }

  // Java: SpanishHybridDisambiguator#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, checkCanceled = null) {
    return this.disambiguator.disambiguate(this.chunker.disambiguate(this.chunkerGlobal.disambiguate(input, checkCanceled),
      checkCanceled), checkCanceled);
  }
}

registerComponent(SpanishHybridDisambiguator.FQCN, (lang) => new SpanishHybridDisambiguator(lang));
