// org.languagetool.tagging.disambiguation.rules.de.GermanRuleDisambiguator (multitoken chunkers, then XML rules)
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { MultiWordChunker } from '../../../core/tagging/disambiguation/MultiWordChunker.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';

// Java: GermanRuleDisambiguator
export class GermanRuleDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.de.GermanRuleDisambiguator';

  // Java: GermanRuleDisambiguator#GermanRuleDisambiguator(Language) (field initialisers run before the constructor body)
  constructor(lang) {
    super();
    this.multitokenSpeller = MultiWordChunker.getInstance('/de/multitoken-ignore.txt', true, true, false, MultiWordChunker.tagForNotAddingTags);
    this.multitokenSpeller2 = MultiWordChunker.getInstance('/de/multitoken-suggest.txt', true, true, false, MultiWordChunker.tagForNotAddingTags);
    this.multitokenSpeller3 = MultiWordChunker.getInstance('/spelling_global.txt', false, true, false, MultiWordChunker.tagForNotAddingTags);
    this.disambiguator = new XmlRuleDisambiguator(lang, true);
    // TODO in Java: merge in one disambiguator
    this.multitokenSpeller.setIgnoreSpelling(true);
    this.multitokenSpeller2.setIgnoreSpelling(true);
    this.multitokenSpeller3.setIgnoreSpelling(true);
  }

  // Java: GermanRuleDisambiguator#disambiguate(AnalyzedSentence) (final: only the XML rules) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, ...rest) {
    if (rest.length === 0) {
      return this.disambiguator.disambiguate(input);
    }
    const checkCanceled = rest[0];
    return this.disambiguator.disambiguate(this.multitokenSpeller2.disambiguate(this.multitokenSpeller3.disambiguate(
      this.multitokenSpeller.disambiguate(input, checkCanceled), checkCanceled), checkCanceled), checkCanceled);
  }
}

registerComponent(GermanRuleDisambiguator.FQCN, (lang) => new GermanRuleDisambiguator(lang));
