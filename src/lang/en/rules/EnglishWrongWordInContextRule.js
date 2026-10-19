// org.languagetool.rules.en.EnglishWrongWordInContextRule
import { WrongWordInContextRule } from '../../../core/rules/WrongWordInContextRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

// Java: EnglishWrongWordInContextRule
export class EnglishWrongWordInContextRule extends WrongWordInContextRule {
  static FQCN = 'org.languagetool.rules.en.EnglishWrongWordInContextRule';

  // Java: EnglishWrongWordInContextRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages, lang);
    this.addExamplePair(Example.wrong('I have <marker>proscribed</marker> you a course of antibiotics.'),
      Example.fixed('I have <marker>prescribed</marker> you a course of antibiotics.'));
  }

  // Java: EnglishWrongWordInContextRule#getCategoryString()
  getCategoryString() {
    return 'Commonly Confused Words';
  }

  // Java: EnglishWrongWordInContextRule#getId()
  getId() {
    return 'ENGLISH_WRONG_WORD_IN_CONTEXT';
  }

  // Java: EnglishWrongWordInContextRule#getDescription()
  getDescription() {
    return 'commonly confused words: $match';
  }

  // Java: EnglishWrongWordInContextRule#getFilename()
  getFilename() {
    return '/en/wrongWordInContext.txt';
  }

  // Java: EnglishWrongWordInContextRule#getMessageString()
  getMessageString() {
    return "Possibly confused word: Did you mean <suggestion>$SUGGESTION</suggestion> instead of '$WRONGWORD'?";
  }

  // Java: EnglishWrongWordInContextRule#getShortMessageString()
  getShortMessageString() {
    return 'Possibly confused word';
  }

  // Java: EnglishWrongWordInContextRule#getLongMessageString()
  getLongMessageString() {
    return "Possibly confused word: Did you mean <suggestion>$SUGGESTION</suggestion> (= $EXPLANATION_SUGGESTION) instead of '$WRONGWORD' (= $EXPLANATION_WRONGWORD)?";
  }
}
