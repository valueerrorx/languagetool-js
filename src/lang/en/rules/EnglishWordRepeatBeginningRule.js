// org.languagetool.rules.en.EnglishWordRepeatBeginningRule
import { WordRepeatBeginningRule } from '../../../core/rules/WordRepeatBeginningRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';

// ==================== ADVERBS ======================

// adverbs used to add to what the previous sentence mentioned
const ADD_ADVERBS = new JavaHashSet();

// adverbs used to express contrast to what the previous sentence mentioned
const CONTRAST_ADVERBS = new JavaHashSet();

// adverbs used to express emphasis to what the previous sentence mentioned
const EMPHASIS_ADVERBS = new JavaHashSet();

// adverbs used to explain what the previous sentence mentioned
const EXPLAIN_ADVERBS = new JavaHashSet();

// ==================== EXPRESSIONS ======================
// the expressions will be used only as additional suggestions

// linking expressions that can be used instead of the ADD_ADVERBS
const ADD_EXPRESSIONS = ['In addition', 'As well as'];

// linking expressions that can be used instead of the CONTRAST_ADVERBS
const CONTRAST_EXPRESSIONS = ['Even so', 'On the other hand'];

// Java: EnglishWordRepeatBeginningRule static initializer
// based on https://www.pinterest.com/pin/229542912245527548/
ADD_ADVERBS.add('Additionally');
ADD_ADVERBS.add('Besides');
ADD_ADVERBS.add('Furthermore');
ADD_ADVERBS.add('Moreover');
ADD_ADVERBS.add('Also');
CONTRAST_ADVERBS.add('Nevertheless');
CONTRAST_ADVERBS.add('Nonetheless');
CONTRAST_ADVERBS.add('Alternatively');
EMPHASIS_ADVERBS.add('Undoubtedly');
EMPHASIS_ADVERBS.add('Indeed');
EMPHASIS_ADVERBS.add('Obviously');
EMPHASIS_ADVERBS.add('Clearly');
EMPHASIS_ADVERBS.add('Importantly');
EMPHASIS_ADVERBS.add('Absolutely');
EMPHASIS_ADVERBS.add('Definitely');
EXPLAIN_ADVERBS.add('Particularly');
EXPLAIN_ADVERBS.add('Especially');
EXPLAIN_ADVERBS.add('Specifically');

// Java: EnglishWordRepeatBeginningRule
export class EnglishWordRepeatBeginningRule extends WordRepeatBeginningRule {
  static FQCN = 'org.languagetool.rules.en.EnglishWordRepeatBeginningRule';

  // Java: EnglishWordRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Moreover, the street is almost entirely residential. <marker>Moreover</marker>, it was named after a poet.'),
      Example.fixed('Moreover, the street is almost entirely residential. <marker>It</marker> was named after a poet.'));
  }

  // Java: EnglishWordRepeatBeginningRule#getId()
  getId() {
    return 'ENGLISH_WORD_REPEAT_BEGINNING_RULE';
  }

  // Java: EnglishWordRepeatBeginningRule#isException(String)
  isException(token) {
    return super.isException(token) || token === 'The' || token === 'A' || token === 'An';
  }

  // Java: EnglishWordRepeatBeginningRule#isAdverb(AnalyzedTokenReadings)
  isAdverb(token) {
    const tok = token.getToken();
    return ADD_ADVERBS.contains(tok) || CONTRAST_ADVERBS.contains(tok) || EMPHASIS_ADVERBS.contains(tok)
      || EXPLAIN_ADVERBS.contains(tok);
  }

  // Java: EnglishWordRepeatBeginningRule#getSuggestions(AnalyzedTokenReadings)
  getSuggestions(token) {
    const tok = token.getToken();
    // the repeated word is a personal pronoun
    if (token.hasPosTag('PRP')) {
      const adaptedToken = tok === 'I' ? tok : toLowerCase(tok);
      return ['Furthermore, ' + adaptedToken, 'Likewise, ' + adaptedToken,
        'Not only that, but ' + adaptedToken];
    } else if (ADD_ADVERBS.contains(tok)) {
      const addSuggestions = this.getDifferentAdverbsOfSameCategory(tok, ADD_ADVERBS);
      addSuggestions.push(...ADD_EXPRESSIONS);
      return addSuggestions;
    } else if (CONTRAST_ADVERBS.contains(tok)) {
      const contrastSuggestions = this.getDifferentAdverbsOfSameCategory(tok, CONTRAST_ADVERBS);
      contrastSuggestions.push(...CONTRAST_EXPRESSIONS);
      return contrastSuggestions;
    } else if (EMPHASIS_ADVERBS.contains(tok)) {
      return this.getDifferentAdverbsOfSameCategory(tok, EMPHASIS_ADVERBS);
    } else if (EXPLAIN_ADVERBS.contains(tok)) {
      return this.getDifferentAdverbsOfSameCategory(tok, EXPLAIN_ADVERBS);
    }
    return [];
  }

  // Java: EnglishWordRepeatBeginningRule#getDifferentAdverbsOfSameCategory(String,Set)
  getDifferentAdverbsOfSameCategory(adverb, adverbsOfCategory) {
    return [...adverbsOfCategory].filter((adv) => adv !== adverb);
  }
}
