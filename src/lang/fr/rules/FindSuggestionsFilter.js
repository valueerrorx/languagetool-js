// org.languagetool.rules.fr.FindSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { arrayGet } from '../../../lib/java/arrays.js';
import { javaSplit, substring } from '../../../lib/java/strings.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { AbstractFindSuggestionsFilter } from '../../../core/rules/AbstractFindSuggestionsFilter.js';
import { makeWrong } from '../../../core/text/StringTools.js';
import { FrenchSynthesizer } from '../synthesis/FrenchSynthesizer.js';
import { FrenchTagger } from '../tagging/FrenchTagger.js';
import { French } from './FrenchLazy.js';

const ENDS_IN_VOWEL = Pattern.compile('[aeioué]$'); // Java: FindSuggestionsFilter#ENDS_IN_VOWEL
const PATTERN = Pattern.compile("^[smntl]'|^(nous|vous|le|la|les|me|te|se|leur|en|y) "); // Java: FindSuggestionsFilter#PATTERN

// Java: FindSuggestionsFilter
export class FindSuggestionsFilter extends AbstractFindSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.fr.FindSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.FindSuggestionsFilter() throws java.io.IOException' }];

  // Java: FindSuggestionsFilter#FindSuggestionsFilter()
  constructor() {
    super();
    this.morfologikRule = French.getInstance().getDefaultSpellingRule();
  }

  // Java: FindSuggestionsFilter#getTagger()
  getTagger() {
    return FrenchTagger.INSTANCE;
  }

  // Java: FindSuggestionsFilter#getSynthesizer()
  getSynthesizer() {
    return FrenchSynthesizer.INSTANCE;
  }

  // Java: FindSuggestionsFilter#getSpellingSuggestions(AnalyzedTokenReadings)
  getSpellingSuggestions(atr) {
    let w;
    if (atr.isTagged()) {
      w = makeWrong(atr.getToken());
    } else {
      w = atr.getToken();
    }
    const suggestions = [];
    const wordsToCheck = [];
    wordsToCheck.push(w);
    if (w.endsWith('s')) {
      wordsToCheck.push(substring(w, 0, w.length - 1));
    }
    if (ENDS_IN_VOWEL.matcher(w).matches()) {
      wordsToCheck.push(w + 's');
    }
    for (const word of wordsToCheck) {
      const atk = new Array(1);
      const token = new AnalyzedToken(word, null, null);
      atk[0] = new AnalyzedTokenReadings(token);
      const sentence = new AnalyzedSentence(atk);
      const matches = this.morfologikRule.match(sentence);
      if (matches.length > 0) {
        suggestions.push(...matches[0].getSuggestedReplacements());
      }
    }
    return suggestions;
  }

  // Java: FindSuggestionsFilter#cleanSuggestion(String)
  cleanSuggestion(s) {
    // remove pronouns before verbs
    let output = PATTERN.matcher(s).replaceAll('');
    // check only first element
    output = arrayGet(javaSplit(output, ' '), 0);
    return output;
  }
}

registerClass(FindSuggestionsFilter.FQCN, FindSuggestionsFilter);
