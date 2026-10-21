// Java: org.languagetool.tagging.disambiguation.rules.it.ItalianRuleDisambiguator
import { registerComponent } from '../../../core/language/components.js';
import { AbstractDisambiguator } from '../../../core/tagging/disambiguation/AbstractDisambiguator.js';
import { XmlRuleDisambiguator } from '../../../core/disambiguation/XmlRuleDisambiguator.js';
import { Italian } from '../language/Italian.js';

// Java: ItalianRuleDisambiguator
export class ItalianRuleDisambiguator extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.it.ItalianRuleDisambiguator';

  // Java: ItalianRuleDisambiguator#disambiguator (field initialiser: a second Italian instance)
  constructor() {
    super();
    this.disambiguator = new XmlRuleDisambiguator(new Italian());
  }

  // Java: ItalianRuleDisambiguator#disambiguate(AnalyzedSentence)
  disambiguate(input, checkCanceled = null) {
    return this.disambiguator.disambiguate(input, checkCanceled);
  }
}

registerComponent(ItalianRuleDisambiguator.FQCN, () => new ItalianRuleDisambiguator());
