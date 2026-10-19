// org.languagetool.tagging.en.EnglishHybridDisambiguator (spelling_global + multiwords chunkers, then XML rules)
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';

// Java: EnglishHybridDisambiguator
export class EnglishHybridDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.en.EnglishHybridDisambiguator';

  // Java: EnglishHybridDisambiguator#EnglishHybridDisambiguator(Language)
  constructor(lang) {
    super();
    this.chunker = MultiWordChunker.getInstance('/en/multiwords.txt', true, true, false);
    this.chunkerGlobal = MultiWordChunker.getInstance('/spelling_global.txt', true, true, false, MultiWordChunker.tagForNotAddingTags);
    this.disambiguator = new XmlRuleDisambiguator(lang, true);
    this.chunker.setIgnoreSpelling(true);
    this.chunker.setRemovePreviousTags(true);
    this.chunkerGlobal.setIgnoreSpelling(true);
  }

  // Java: EnglishHybridDisambiguator#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, checkCanceled = null) {
    return this.disambiguator.disambiguate(this.chunker.disambiguate(this.chunkerGlobal.disambiguate(input, checkCanceled), checkCanceled), checkCanceled);
  }
}

registerComponent(EnglishHybridDisambiguator.FQCN, (lang) => new EnglishHybridDisambiguator(lang));
