// org.languagetool.rules.en.FindSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { AbstractFindSuggestionsFilter } from '../../../core/rules/AbstractFindSuggestionsFilter.js';
import { MorfologikSpeller } from '../../../core/rules/spelling/morfologik/MorfologikSpeller.js';
import { EnglishTagger } from '../tagging/EnglishTagger.js';

const DICT_FILENAME = '/en/english.dict';
let speller = null; // Java: FindSuggestionsFilter#speller (static)

// Java: FindSuggestionsFilter
export class FindSuggestionsFilter extends AbstractFindSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.en.FindSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.FindSuggestionsFilter() throws java.io.IOException' }];

  // Java: FindSuggestionsFilter#FindSuggestionsFilter()
  constructor() {
    super();
    // lazy init
    if (speller === null) {
      if (getDataBroker().resourceExists(DICT_FILENAME)) {
        speller = new MorfologikSpeller(DICT_FILENAME);
      }
    }
  }

  // Java: FindSuggestionsFilter#getTagger()
  getTagger() {
    return EnglishTagger.INSTANCE;
  }

  // Java: FindSuggestionsFilter#getSpellingSuggestions(AnalyzedTokenReadings)
  getSpellingSuggestions(atr) {
    if (speller === null) throw new NullPointerException();
    return speller.findSimilarWords(atr.getToken());
  }
}

registerClass(FindSuggestionsFilter.FQCN, FindSuggestionsFilter);
