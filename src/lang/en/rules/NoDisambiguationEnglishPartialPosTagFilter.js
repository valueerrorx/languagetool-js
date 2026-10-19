// org.languagetool.rules.en.NoDisambiguationEnglishPartialPosTagFilter (pulled forward from F49 for the English disambiguation.xml)
import { Languages } from '../../../core/Languages.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { PartialPosTagFilter } from '../../../core/rules/PartialPosTagFilter.js';

// Java: NoDisambiguationEnglishPartialPosTagFilter
export class NoDisambiguationEnglishPartialPosTagFilter extends PartialPosTagFilter {
  static FQCN = 'org.languagetool.rules.en.NoDisambiguationEnglishPartialPosTagFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.NoDisambiguationEnglishPartialPosTagFilter()' }];

  // Java: NoDisambiguationEnglishPartialPosTagFilter field initializer (tagger of "en")
  constructor() {
    super();
    this.tagger = Languages.getLanguageForShortCode('en').getTagger();
  }

  // Java: NoDisambiguationEnglishPartialPosTagFilter#tag(String)
  tag(token) {
    return [...this.tagger.tag([token])];
  }
}

registerClass(NoDisambiguationEnglishPartialPosTagFilter.FQCN, NoDisambiguationEnglishPartialPosTagFilter);
