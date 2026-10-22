// Java: org.languagetool.rules.ru.RussianVerbConjugationRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';

const PRONOUN = Pattern.compile('PNN:(.*):Nom:(.*)');
const FUT_REAL_VERB = Pattern.compile('VB:(Fut|Real):(.*):(.*):(.*):(.*)');
const PAST_VERB = Pattern.compile('VB:Past:(.*):(.*):(.*)');

// Java: RussianVerbConjugationRule
export class RussianVerbConjugationRule extends Rule {
  static FQCN = 'org.languagetool.rules.ru.RussianVerbConjugationRule';

  // Java: RussianVerbConjugationRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.addExamplePair(Example.wrong('<marker>Я идёт</marker>.'),
      Example.fixed('<marker>Я иду</marker>.'));
  }

  // Java: RussianVerbConjugationRule#getId()
  getId() {
    return 'RU_VERB_CONJUGATION';
  }

  // Java: RussianVerbConjugationRule#getDescription()
  getDescription() {
    return 'Согласование личных местоимений с глаголами';
  }

  // Java: RussianVerbConjugationRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokenReadings = sentence.getTokensWithoutWhitespace();
    for (let i = 1; i < tokenReadings.length - 1; i++) {
      const previousReading = tokenReadings[i - 1];
      const currentReading = tokenReadings[i];
      const nextReading = tokenReadings[i + 1];
      const previousLemmaTok = previousReading.getReadings()[0];
      const currentLemmaTok = currentReading.getReadings()[0];
      const previousToken = previousLemmaTok.getToken();
      const currentToken = currentLemmaTok.getToken();
      const currentPosTag = currentLemmaTok.getPOSTag();
      if (currentToken !== null && currentToken !== undefined && currentPosTag !== null && currentPosTag !== undefined
          && currentToken.length !== 0 && currentPosTag.length !== 0) {
        const pronounMatcher = PRONOUN.matcher(currentPosTag);
        if (pronounMatcher.find() && previousToken !== 'и') {
          const pronounPair = [pronounMatcher.group(1), pronounMatcher.group(2)];
          const nextLemmaTok = nextReading.getReadings()[0];
          let next2Token;
          if (i < tokenReadings.length - 2) {
            const next2Reading = tokenReadings[i + 2];
            const next2LemmaTok = next2Reading.getReadings()[0];
            next2Token = next2LemmaTok.getToken();
          } else {
            next2Token = '';
          }
          const nextToken = nextLemmaTok.getToken();
          const nextPosTag = nextLemmaTok.getPOSTag();
          if (nextPosTag !== null && nextPosTag !== undefined && nextPosTag.length !== 0
              && !(next2Token === 'быть' && nextToken === 'может') && nextToken !== 'целую') { // "может быть"
            let verbMatcher = FUT_REAL_VERB.matcher(nextPosTag);
            if (verbMatcher.find()) {
              const verbPair = [verbMatcher.group(4), verbMatcher.group(5)];
              if (this.isConjugationInPresentOrFutureWrong(pronounPair, verbPair)) {
                this.addRuleMatch(ruleMatches, currentReading, nextReading, sentence);
              }
            } else {
              verbMatcher = PAST_VERB.matcher(nextPosTag);
              if (verbMatcher.find()) {
                if (this.isConjugationInPastWrong(pronounMatcher.group(1), verbMatcher.group(3))) {
                  this.addRuleMatch(ruleMatches, currentReading, nextReading, sentence);
                }
              }
            }
          }
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: RussianVerbConjugationRule#isConjugationInPresentOrFutureWrong(Pair,Pair); pairs are [left, right]
  isConjugationInPresentOrFutureWrong(pronoun, verb) {
    if (pronoun[1] !== verb[1]) {
      return true;
    }
    if (['Masc', 'Fem', 'Neut'].includes(pronoun[0])) {
      return verb[0] === 'PL';
    }
    return pronoun[0] !== verb[0];
  }

  // Java: RussianVerbConjugationRule#isConjugationInPastWrong(String,String)
  isConjugationInPastWrong(pronoun, verb) {
    if (pronoun === 'Sin') {
      return verb === 'PL' || verb === 'Neut';
    }
    return pronoun !== verb;
  }

  // Java: RussianVerbConjugationRule#addRuleMatch(List,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence)
  addRuleMatch(ruleMatches, currentReading, nextReading, sentence) {
    const ruleMatch = new RuleMatch(this, sentence, currentReading.getStartPos(), nextReading.getEndPos(),
      'Неверное спряжение глагола или неверное местоимение', this.getShort());
    ruleMatches.push(ruleMatch);
  }

  // Java: RussianVerbConjugationRule#getShort()
  getShort() {
    return 'Неверное спряжение глагола';
  }
}
