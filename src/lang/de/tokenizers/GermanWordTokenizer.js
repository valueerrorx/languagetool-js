// Java: org.languagetool.tokenizers.de.GermanWordTokenizer
import { registerComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';

// Java: GermanWordTokenizer
export class GermanWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.de.GermanWordTokenizer';

  // Java: GermanWordTokenizer#deTokenizingChars (field initializer)
  deTokenizingChars = `${super.getTokenizingCharacters()}_‚`; // "‚" is not a comma, but a single quotation mark

  // Java: GermanWordTokenizer#getTokenizingCharacters()
  getTokenizingCharacters() {
    return this.deTokenizingChars;
  }
}

registerComponent(GermanWordTokenizer.FQCN, () => new GermanWordTokenizer());
