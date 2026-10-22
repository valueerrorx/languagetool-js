// Java: org.languagetool.rules.ru.RussianPartialPosTagFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { PartialPosTagFilter } from '../../../core/rules/PartialPosTagFilter.js';
import { Russian } from '../language/Russian.js';

// Java: RussianPartialPosTagFilter
export class RussianPartialPosTagFilter extends PartialPosTagFilter {
  static FQCN = 'org.languagetool.rules.ru.RussianPartialPosTagFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.RussianPartialPosTagFilter()' }];

  // Java: RussianPartialPosTagFilter#tag(String)
  tag(token) {
    try {
      const russianLanguage = Russian.getInstance();
      const tags = russianLanguage.getTagger().tag([token]);
      const atr = [...tags];
      const disambiguated = russianLanguage.getDisambiguator().disambiguate(new AnalyzedSentence(atr));
      return [...disambiguated.getTokens()];
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
      throw e;
    }
  }
}

registerClass(RussianPartialPosTagFilter.FQCN, RussianPartialPosTagFilter);
