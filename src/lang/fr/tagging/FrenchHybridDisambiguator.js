// org.languagetool.tagging.disambiguation.fr.FrenchHybridDisambiguator (spelling_global chunker, multiword chunker, then XML rules)
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';
import { French } from '../language/French.js';

// Java: FrenchHybridDisambiguator
export class FrenchHybridDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.fr.FrenchHybridDisambiguator';

  // Java: FrenchHybridDisambiguator#FrenchHybridDisambiguator() (field initialisers run before the constructor body)
  constructor() {
    super();
    this.chunker = MultiWordChunker.getInstance('/fr/multiwords.txt', true, true, false);
    this.disambiguator = new XmlRuleDisambiguator(French.getInstance(), true);
    this.chunkerGlobal = MultiWordChunker.getInstance('/spelling_global.txt', false, true, false, MultiWordChunker.tagForNotAddingTags);
    this.chunker.setRemovePreviousTags(true);
    this.chunkerGlobal.setIgnoreSpelling(true);
  }

  // Java: FrenchHybridDisambiguator#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, checkCanceled = null) {
    return this.disambiguator.disambiguate(this.chunker.disambiguate(this.chunkerGlobal.disambiguate(input, checkCanceled), checkCanceled), checkCanceled);
  }
}

registerComponent(FrenchHybridDisambiguator.FQCN, () => new FrenchHybridDisambiguator());
