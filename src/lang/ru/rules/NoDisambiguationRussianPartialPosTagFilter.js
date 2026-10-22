// Java: org.languagetool.rules.ru.NoDisambiguationRussianPartialPosTagFilter (pulled forward from W28 for the Russian disambiguation.xml)
import { Languages } from '../../../core/Languages.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { PartialPosTagFilter } from '../../../core/rules/PartialPosTagFilter.js';

// Java: NoDisambiguationRussianPartialPosTagFilter
export class NoDisambiguationRussianPartialPosTagFilter extends PartialPosTagFilter {
  static FQCN = 'org.languagetool.rules.ru.NoDisambiguationRussianPartialPosTagFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.NoDisambiguationRussianPartialPosTagFilter()' }];

  // Java: NoDisambiguationRussianPartialPosTagFilter field initializer (tagger of "ru")
  constructor() {
    super();
    this.tagger = Languages.getLanguageForShortCode('ru').getTagger();
  }

  // Java: NoDisambiguationRussianPartialPosTagFilter#tag(String)
  tag(token) {
    return [...this.tagger.tag([token])];
  }
}

registerClass(NoDisambiguationRussianPartialPosTagFilter.FQCN, NoDisambiguationRussianPartialPosTagFilter);
