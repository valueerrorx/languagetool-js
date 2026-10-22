// Java: org.languagetool.rules.es.SpanishWordRepeatBeginningRule
import { WordRepeatBeginningRule } from '../../../core/rules/WordRepeatBeginningRule.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { Character } from '../../../lib/java/Character.js';
import { toLowerCase } from '../../../lib/java/strings.js';

// adverbs used to add to what the previous sentence mentioned
const ADD_ADVERBS = new JavaHashSet();
// adverbs used to express contrast to what the previous sentence mentioned
const CONTRAST_CONJ = new JavaHashSet();
// adverbs used to express emphasis to what the previous sentence mentioned
const EMPHASIS_ADVERBS = new JavaHashSet();
// adverbs used to explain what the previous sentence mentioned
const EXPLAIN_ADVERBS = new JavaHashSet();
// personal pronouns
const PERSONAL_PRONOUNS = new JavaHashSet();

// linking expressions that can be used instead of the ADD_ADVERBS
const ADD_EXPRESSIONS = ['Así mismo'];
// linking expressions that can be used instead of the CONTRAST_ADVERBS
const CONTRAST_EXPRESSIONS = ['Aun así', 'Por otra parte', 'Sin embargo'];
const EXCEPCIONS_START = ['el', 'la', 'los', 'las', 'punto', 'artículo',
  'módulo', 'parte', 'sesión', 'unidad', 'tema', 'n'];
const SENTENCE_EXCEPCIONS = ['por un', 'por otro', 'por otra', 'por una'];

// Java: SpanishWordRepeatBeginningRule static initializer
// based on https://www.pinterest.com/pin/229542912245527548/
ADD_ADVERBS.add('Asimismo');
ADD_ADVERBS.add('Igualmente');
ADD_ADVERBS.add('Además');
ADD_ADVERBS.add('También');
ADD_ADVERBS.add('Adicionalmente');
CONTRAST_CONJ.add('Pero');
CONTRAST_CONJ.add('Empero');
CONTRAST_CONJ.add('Mas');
EMPHASIS_ADVERBS.add('Obviamente');
EMPHASIS_ADVERBS.add('Claramente');
EMPHASIS_ADVERBS.add('Absolutamente');
EMPHASIS_ADVERBS.add('Definitivamente');
EXPLAIN_ADVERBS.add('Específicamente');
EXPLAIN_ADVERBS.add('Concretamente');
EXPLAIN_ADVERBS.add('Particularmente');
EXPLAIN_ADVERBS.add('Precisamente');
for (const p of ['yo', 'tú', 'él', 'ella', 'nosostros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'usted', 'ustedes']) {
  PERSONAL_PRONOUNS.add(p);
}

// Java: SpanishWordRepeatBeginningRule
export class SpanishWordRepeatBeginningRule extends WordRepeatBeginningRule {
  static FQCN = 'org.languagetool.rules.es.SpanishWordRepeatBeginningRule';

  // Java: SpanishWordRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    super.setTags([Tag.picky]);
    // super.setDefaultTempOff();
    this.addExamplePair(Example.wrong('Asimismo, la calle es casi toda residencial. <marker>Asimismo</marker>, lleva el nombre de un poeta.'),
      Example.fixed('Además, la calle es casi toda residencal. También lleva el nombre de un poeta.'));
  }

  // Java: SpanishWordRepeatBeginningRule#getId()
  getId() {
    return 'SPANISH_WORD_REPEAT_BEGINNING_RULE';
  }

  // Java: SpanishWordRepeatBeginningRule#isException(String)
  isException(token) {
    return super.isException(token) || Character.isDigit(token.charCodeAt(0))
        || EXCEPCIONS_START.includes(toLowerCase(token));
  }

  // Java: SpanishWordRepeatBeginningRule#isAdverb(AnalyzedTokenReadings)
  isAdverb(token) {
    if (token.hasPosTag('RG') || token.hasPosTag('LOC_ADV')) {
      return true;
    }
    const tok = token.getToken();
    return ADD_ADVERBS.contains(tok) || CONTRAST_CONJ.contains(tok) || EMPHASIS_ADVERBS.contains(tok)
        || EXPLAIN_ADVERBS.contains(tok);
  }

  // Java: SpanishWordRepeatBeginningRule#getSuggestions(AnalyzedTokenReadings)
  getSuggestions(token) {
    const tok = token.getToken();
    const lowerTok = toLowerCase(tok);
    // the repeated word is a personal pronoun
    if (PERSONAL_PRONOUNS.contains(lowerTok)) {
      return ['Además, ' + lowerTok, 'Igualmente, ' + lowerTok,
        'No solo eso, sino que ' + lowerTok];
    } else if (ADD_ADVERBS.contains(tok)) {
      const addSuggestions = this.getDifferentAdverbsOfSameCategory(tok, ADD_ADVERBS);
      addSuggestions.push(...ADD_EXPRESSIONS);
      return addSuggestions;
    } else if (CONTRAST_CONJ.contains(tok)) {
      return CONTRAST_EXPRESSIONS;
    } else if (EMPHASIS_ADVERBS.contains(tok)) {
      return this.getDifferentAdverbsOfSameCategory(tok, EMPHASIS_ADVERBS);
    } else if (EXPLAIN_ADVERBS.contains(tok)) {
      return this.getDifferentAdverbsOfSameCategory(tok, EXPLAIN_ADVERBS);
    }
    return [];
  }

  // Java: SpanishWordRepeatBeginningRule#getDifferentAdverbsOfSameCategory(String,Set)
  getDifferentAdverbsOfSameCategory(adverb, adverbsOfCategory) {
    return [...adverbsOfCategory].filter((adv) => adv !== adverb);
  }

  // Java: SpanishWordRepeatBeginningRule#isSentenceException(AnalyzedSentence)
  isSentenceException(sentence) {
    const s = sentence.getText();
    for (const exception of SENTENCE_EXCEPCIONS) {
      if (toLowerCase(s).startsWith(exception)) {
        return true;
      }
    }
    return false;
  }
}
