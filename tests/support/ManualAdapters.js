// Ported from ManualTaggerAdapter and ManualSynthesizerAdapter (languagetool-core test)
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { BaseSynthesizer } from '../../src/core/tagging/synthesis/BaseSynthesizer.js';
import { toLowerCase } from '../../src/lib/java/strings.js';

// Java: ManualTaggerAdapter
export class ManualTaggerAdapter {
  static FQCN = 'org.languagetool.tokenizers.ManualTaggerAdapter';

  // Java: ManualTaggerAdapter(ManualTagger)
  constructor(manualTagger) {
    this.manualTagger = manualTagger;
  }

  // Java: ManualTaggerAdapter#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (const word of sentenceTokens) {
      const l = [];
      const manualTags = this.manualTagger.tag(toLowerCase(word));
      for (const manualTag of manualTags) {
        l.push(new AnalyzedToken(word, manualTag.getPosTag(), manualTag.getLemma()));
      }
      if (l.length === 0) {
        l.push(new AnalyzedToken(word, null, null));
      }
      tokenReadings.push(new AnalyzedTokenReadings(l, pos));
      pos += word.length;
    }
    return tokenReadings;
  }

  // Java: ManualTaggerAdapter#createNullToken(String,int)
  createNullToken(token, startPos) {
    return new AnalyzedTokenReadings(new AnalyzedToken(token, null, null), startPos);
  }

  // Java: ManualTaggerAdapter#createToken(String,String)
  createToken(token, posTag) {
    return new AnalyzedToken(token, posTag, null);
  }
}

// Java: ManualSynthesizerAdapter
export class ManualSynthesizerAdapter extends BaseSynthesizer {
  static FQCN = 'org.languagetool.synthesis.ManualSynthesizerAdapter';

  // Java: ManualSynthesizerAdapter(ManualSynthesizer,Language)
  constructor(manualSynthesizer, lang) {
    super(null, null, null, lang.getShortCode()); // no file
    this.adapterSynthesizer = manualSynthesizer; // Java field manualSynthesizer (BaseSynthesizer has its own)
  }

  // Java: ManualSynthesizerAdapter#createStemmer()
  createStemmer() {
    return { lookup: () => [] };
  }

  // Java: ManualSynthesizerAdapter#initPossibleTags()
  initPossibleTags() {
    if (this.possibleTags === null) {
      this.possibleTags = [...this.adapterSynthesizer.getPossibleTags()];
    }
  }

  // Java: ManualSynthesizerAdapter#lookup(String,String)
  lookup(lemma, posTag) {
    const results = super.lookup(lemma, posTag);
    const manualForms = this.adapterSynthesizer.lookup(toLowerCase(lemma), posTag);
    if (manualForms !== null) {
      results.push(...manualForms);
    }
    return results;
  }
}
