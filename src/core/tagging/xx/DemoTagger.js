// org.languagetool.tagging.xx.DemoTagger (assigns null tags to words)
import { AnalyzedToken } from '../../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../AnalyzedTokenReadings.js';
import { registerComponent } from '../../language/components.js';

// Java: DemoTagger
export class DemoTagger {
  static FQCN = 'org.languagetool.tagging.xx.DemoTagger';

  // Java: DemoTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    for (const word of sentenceTokens) {
      const l = [];
      // a real tagger would need to assign a POS tag
      // in the next line instead of null:
      l.push(new AnalyzedToken(word, null, null));
      tokenReadings.push(new AnalyzedTokenReadings(l, 0));
    }
    return tokenReadings;
  }

  // Java: DemoTagger#createNullToken(String,int)
  createNullToken(token, startPos) {
    return new AnalyzedTokenReadings(new AnalyzedToken(token, null, null), startPos);
  }

  // Java: DemoTagger#createToken(String,String)
  createToken(token, posTag) {
    return new AnalyzedToken(token, posTag, null);
  }
}

registerComponent(DemoTagger.FQCN, () => new DemoTagger());
