// Java: org.languagetool.tagging.de.SwissGermanTagger (adds the readings of the "ß" spelling to untagged words containing "ss")
import { Pattern } from '../../../lib/java/regex/index.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { registerComponent } from '../../../core/language/components.js';
import { GermanTagger } from './GermanTagger.js';

const SS_PATTERN = Pattern.compile('ss', Pattern.LITERAL);

// Java: SwissGermanTagger
export class SwissGermanTagger extends GermanTagger {
  static FQCN = 'org.languagetool.tagging.de.SwissGermanTagger';

  // Java: SwissGermanTagger#tag(List,boolean)
  tagTokens(sentenceTokens, ignoreCase) {
    const tokens = super.tagTokens(sentenceTokens, ignoreCase);
    for (const reading of tokens) {
      if (reading !== null
        && reading.getToken() !== null
        && reading.getToken().includes('ss')
        && !reading.isTagged()) {
        const replacementReading = this.lookup(SS_PATTERN.matcher(reading.getToken()).replaceAll('ß'));
        if (replacementReading !== null) {
          for (const at of replacementReading.getReadings()) {
            reading.addReading(new AnalyzedToken(reading.getToken(), at.getPOSTag(), at.getLemma()), 'SwissGermanTagger');
          }
        }
      }
    }
    return tokens;
  }
}

registerComponent(SwissGermanTagger.FQCN, () => new SwissGermanTagger());
