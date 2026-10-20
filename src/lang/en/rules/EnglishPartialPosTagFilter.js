// org.languagetool.rules.en.EnglishPartialPosTagFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Languages } from '../../../core/Languages.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { PartialPosTagFilter } from '../../../core/rules/PartialPosTagFilter.js';

// Java: EnglishPartialPosTagFilter
export class EnglishPartialPosTagFilter extends PartialPosTagFilter {
  static FQCN = 'org.languagetool.rules.en.EnglishPartialPosTagFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.EnglishPartialPosTagFilter()' }];

  // Java: EnglishPartialPosTagFilter#tag(String)
  tag(token) {
    try {
      const englishLanguage = Languages.getLanguageForShortCode('en');
      const tags = englishLanguage.getTagger().tag([token]);
      const atr = [...tags];
      const disambiguated = englishLanguage.getDisambiguator().disambiguate(new AnalyzedSentence(atr));
      return [...disambiguated.getTokens()];
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
      throw e;
    }
  }
}

registerClass(EnglishPartialPosTagFilter.FQCN, EnglishPartialPosTagFilter);
