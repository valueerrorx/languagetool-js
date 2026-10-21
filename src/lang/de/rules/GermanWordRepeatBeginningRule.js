// org.languagetool.rules.de.GermanWordRepeatBeginningRule
import { WordRepeatBeginningRule } from '../../../core/rules/WordRepeatBeginningRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const ADVERBS = new Set([
  'Auch', 'Anschließend', 'Außerdem', 'Danach', 'Ferner',
  'Nebenher', 'Nebenbei', 'Überdies', 'Weiterführend', 'Zudem', 'Zusätzlich',
]);

// Java: GermanWordRepeatBeginningRule
export class GermanWordRepeatBeginningRule extends WordRepeatBeginningRule {
  static FQCN = 'org.languagetool.rules.de.GermanWordRepeatBeginningRule';

  // Java: GermanWordRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Dann hatten wir Freizeit. Dann gab es Essen. <marker>Dann</marker> gingen wir schlafen.'),
      Example.fixed('Dann hatten wir Freizeit. Danach gab es Essen. <marker>Schließlich</marker> gingen wir schlafen.'));
  }

  // Java: GermanWordRepeatBeginningRule#getId()
  getId() {
    return 'GERMAN_WORD_REPEAT_BEGINNING_RULE';
  }

  // Java: GermanWordRepeatBeginningRule#isAdverb(AnalyzedTokenReadings)
  isAdverb(token) {
    return ADVERBS.has(token.getToken());
  }
}
