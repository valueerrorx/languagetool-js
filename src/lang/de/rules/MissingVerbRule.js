// org.languagetool.rules.de.MissingVerbRule
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { PatternToken } from '../../../core/patterns/PatternToken.js';
import { PatternRule } from '../../../core/patterns/PatternRule.js';
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { isCapitalizedWord, lowercaseFirstChar } from '../../../core/text/StringTools.js';

const MIN_TOKENS_FOR_ERROR = 5; // Java: MissingVerbRule#MIN_TOKENS_FOR_ERROR

// Java: MissingVerbRule
export class MissingVerbRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.MissingVerbRule';

  // Java: MissingVerbRule(ResourceBundle,German)
  constructor(messages, language) {
    super();
    this.language = language;
    this.rule1 = new PatternRule('internal', language, [
      new PatternToken('Vielen', true, false, false),
      new PatternToken('Dank', true, false, false)], '', '', '');
    this.rule2 = new PatternRule('internal', language, [
      new PatternToken('Herzlichen', true, false, false),
      new PatternToken('Glückwunsch', true, false, false)], '', '', '');
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setDefaultOff();
    this.addExamplePair(Example.wrong('<marker>In diesem Satz kein Wort.</marker>'),
      Example.fixed('In diesem Satz <marker>fehlt</marker> kein Wort.'));
  }

  // Java: MissingVerbRule#getId()
  getId() {
    return 'MISSING_VERB';
  }

  // Java: MissingVerbRule#getDescription()
  getDescription() {
    return 'Satz ohne Verb';
  }

  // Java: MissingVerbRule#match(AnalyzedSentence)
  match(sentence) {
    if (!this.isRealSentence(sentence) || this.isSpecialCase(sentence)) {
      return RuleMatch.EMPTY_ARRAY;
    }
    let verbFound = false;
    let lastToken = null;
    let i = 0;
    for (const readings of sentence.getTokensWithoutWhitespace()) {
      if (readings.hasPosTagStartingWith('VER')
          || (!readings.isTagged() && !isCapitalizedWord(readings.getToken()) // ignore unknown words to avoid false alarms
          || (i === 1 && this.verbAtSentenceStart(readings)))) {
        verbFound = true;
        break;
      }
      lastToken = readings;
      i++;
    }
    if (!verbFound && lastToken !== null && sentence.getTokensWithoutWhitespace().length >= MIN_TOKENS_FOR_ERROR) {
      const match = new RuleMatch(this, sentence, 0, lastToken.getStartPos() + lastToken.getToken().length, 'Dieser Satz scheint kein Verb zu enthalten');
      return [match];
    }
    return RuleMatch.EMPTY_ARRAY;
  }

  // Java: MissingVerbRule#isRealSentence(AnalyzedSentence) (we want to ignore headlines, and these usually don't end with [.?!])
  isRealSentence(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      return lastToken.hasPosTag('PKT') && equalsAny(lastToken.getToken(), '.', '?', '!');
    }
    return false;
  }

  // Java: MissingVerbRule#isSpecialCase(AnalyzedSentence)
  isSpecialCase(sentence) {
    return this.rule1.match(sentence).length > 0 || this.rule2.match(sentence).length > 0;
  }

  // Java: MissingVerbRule#verbAtSentenceStart(AnalyzedTokenReadings)
  verbAtSentenceStart(readings) {
    // start of sentence is mis-tagged because of the uppercase first character, work around that:
    const lowercased = lowercaseFirstChar(readings.getToken());
    const lcReadings = this.language.getTagger().tag([lowercased]);
    return lcReadings.length > 0 && lcReadings[0].hasPosTagStartingWith('VER');
  }
}
