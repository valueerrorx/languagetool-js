// org.languagetool.rules.en.EnglishRepeatedWordsRule
import { AbstractRepeatedWordsRule } from '../../../core/rules/AbstractRepeatedWordsRule.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { getUrl } from '../../../core/Tools.js';
import { AmericanEnglish } from '../language/AmericanEnglish.js';
import { EnglishSynthesizer } from '../synthesis/EnglishSynthesizer.js';

let wordsToCheck = null; // Java: static wordsToCheck = loadWords("/en/synonyms.txt")

// Java: EnglishRepeatedWordsRule#ANTI_PATTERNS (static field, built here on first use)
function antiPatternList() {
  return [

    [
      new PatternTokenBuilder().csToken("need").matchInflectedForms().build(),   // "I still need -> require to sign in"
      token("to")
    ],

    [
      new PatternTokenBuilder().tokenRegex("solve(s|d|ing)?").setSkip(3).build(),   // "solve the problem" is a unique collocation
      tokenRegex("problems?")                                                    // "solve the issue|concern|difficulty" sounds bizarre
    ],                                                                             // lots of disables in Matomo

    [
      posRegex("SENT_START|PCT"),       // "No problem, I'm not in a rush."
      token("no"),
      token("problem"),
      pos("PCT")
    ],

    [
      tokenRegex("math|word"),       // "math/word problem"
      tokenRegex("problems?")
    ],

    [
      tokenRegex("as"),       // "doesn't apply to the group as a whole"
      tokenRegex("a"),
      tokenRegex("whole")
    ],

    [
      token("more"),
      token("often"),
      token("than"),
      token("not")
    ],

    [
      token("often"),
      token("times")
    ],

    [
      tokenRegex("details?|facts?|it|journals?|questions?|research|results?|study|studies|this|these|those|which"),
      new PatternTokenBuilder().pos("RB").min(0).build(),
      new PatternTokenBuilder().csToken("suggest").matchInflectedForms().build()
    ],

    [
      new PatternTokenBuilder().csToken("form").matchInflectedForms().build(),   // "form in the bloodstream"
      posRegex("IN|PCT|RP|TO|SENT_END")
    ],

    [
      new PatternTokenBuilder().tokenRegex("bonds?|crystals?|ions?|rocks?|.*valence").setSkip(10).build(),
      new PatternTokenBuilder().csToken("form").matchInflectedForms().build()
    ],

    [
      new PatternTokenBuilder().tokenRegex("form(s|ed|ing)?").setSkip(10).build(),
      tokenRegex("bonds?|crystals?|ions?|rocks?|.*valence")
    ],

    [
      token("interesting"),
      tokenRegex("facts?|things?")
    ],

    [
      token("several"),
      tokenRegex("hundreds?|thousands?|millions?")
    ],

    [
      token("must"),
      token("be"),
      token("nice")
    ],

    [
      token("nice"),
      token("day")
    ],

    [
      token("nice"),
      token("to"),
      new PatternTokenBuilder().token("meet").min(0).build(),
      posRegex("PRP_O.*")
    ],

    [
      new PatternTokenBuilder().csToken("be").matchInflectedForms().build(),  // nice and plump
      token("nice"),
      token("and"),
      pos("JJ"),
      posRegex("PCT|SENT_END")
    ],

    [
      posRegex("P?DT|PRP$.*"),  // the proposed agreement
      token("proposed"),
      posRegex("N.*")
    ],

    [
      new PatternTokenBuilder().csToken("propose").matchInflectedForms().build(),
      tokenRegex("to|marriage")
    ],

    [
      token("too"),
      token("literally")
    ],

    [
      token("literally"),
      token("and"),
      token("figuratively")
    ],

    [
      token("literally"),
      token("everything")
    ],

    [
      token("literally"),
      posRegex("PCT|SENT_END")
    ],

    [
      posRegex("CC"),       // "Or maybe it's because I have eyes that see!"
      token("maybe")
    ]

  ];
}

// Java: EnglishRepeatedWordsRule
export class EnglishRepeatedWordsRule extends AbstractRepeatedWordsRule {
  static FQCN = 'org.languagetool.rules.en.EnglishRepeatedWordsRule';

  // Java: EnglishRepeatedWordsRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: EnglishRepeatedWordsRule(ResourceBundle)
  constructor(messages) {
    super(messages, AmericanEnglish.getInstance());
    if (wordsToCheck === null) wordsToCheck = AbstractRepeatedWordsRule.loadWords('/en/synonyms.txt');
    this.setTags([Tag.picky]);
    this.antiPatterns = Rule.cacheAntiPatterns(AmericanEnglish.getInstance(), antiPatternList());
    const id = this.getId();
    if (id === 'EN_REPEATEDWORDS_DEFINITELY') {
      this.setUrl(getUrl('https://languagetool.org/insights/post/i-agree-synonyms/'));
    }
    if (id === 'EN_REPEATEDWORDS_CHOOSE') {
      this.setUrl(getUrl('https://languagetool.org/insights/post/choose-vs-chose/'));
    }
    // super.setDefaultTempOff();
  }

  // Java: EnglishRepeatedWordsRule#getMessage()
  getMessage() {
    return 'This word has been used in one of the immediately preceding sentences. Using a synonym could make your text more interesting to read, unless the repetition is intentional.';
  }

  // Java: EnglishRepeatedWordsRule#getDescription()
  getDescription() {
    return 'Suggest synonyms for repeated words.';
  }

  // Java: EnglishRepeatedWordsRule#getWordsToCheck()
  getWordsToCheck() {
    return wordsToCheck;
  }

  // Java: EnglishRepeatedWordsRule#getShortMessage()
  getShortMessage() {
    return 'Style: repeated word';
  }

  // Java: EnglishRepeatedWordsRule#getSynthesizer()
  getSynthesizer() {
    return EnglishSynthesizer.INSTANCE;
  }

  // Java: EnglishRepeatedWordsRule#isException(AnalyzedTokenReadings[],int,boolean,boolean,boolean)
  isException(tokens, i, sentStart, isCapitalized, isAllUppercase) {
    if (isAllUppercase || (isCapitalized && !sentStart)) {
      return true;
    }
    return tokens[i].hasPosTagStartingWith('NNP');
  }
}
