// org.languagetool.rules.fr.FrenchPartialPosTagFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { PartialPosTagFilter } from '../../../core/rules/PartialPosTagFilter.js';
import { French } from './FrenchLazy.js';

// Java: FrenchPartialPosTagFilter
export class FrenchPartialPosTagFilter extends PartialPosTagFilter {
  static FQCN = 'org.languagetool.rules.fr.FrenchPartialPosTagFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.FrenchPartialPosTagFilter()' }];

  // Java: FrenchPartialPosTagFilter#tag(String)
  tag(token) {
    try {
      const frenchLanguage = French.getInstance();
      const tags = frenchLanguage.getTagger().tag([token]);
      const atr = [...tags];
      const disambiguated = frenchLanguage.getDisambiguator().disambiguate(new AnalyzedSentence(atr));
      return [...disambiguated.getTokens()];
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
      throw e;
    }
  }
}

registerClass(FrenchPartialPosTagFilter.FQCN, FrenchPartialPosTagFilter);
