// org.languagetool.rules.en.CompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import { Languages } from '../../../core/Languages.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { Objects } from '../../../lib/java/Objects.js';
import { getUrl } from '../../../core/Tools.js';

let compoundData = null; // Java: static to make sure this gets loaded only once
let antiPatterns = null; // Java: static ANTI_PATTERNS (built at class load, here on first use)

// Java: CompoundRule#ANTI_PATTERNS
function antiPatternsOf() {
  if (antiPatterns === null) {
    const AMERICAN_ENGLISH = Languages.getLanguageForShortCode('en-US');
    antiPatterns = Rule.makeAntiPatterns([
      [
        tokenRegex("['’`´‘]"),
        token('re'),
      ],
      [ // We well received your email
        new PatternTokenBuilder().posRegex('SENT_START|CC|PCT').build(),
        tokenRegex('we|you|they|I|s?he|it'),
        token('well'),
        new PatternTokenBuilder().posRegex('VB.*').build(),
      ],
      [
        token('how'),
        token('well'),
        new PatternTokenBuilder().posRegex('VB.*').build(),
      ],
      [
        tokenRegex('and|&'),
        token('co'),
      ],
      [ // off-key
        token('power'),
        token('off'),
        token('key'),
      ],
      [ // see saw seen
        token('see'),
        token('saw'),
        token('seen'),
      ],
      [ // moving forward looking for ...
        token('forward'),
        token('looking'),
        new PatternTokenBuilder().posRegex('IN|TO').build(),
      ],
      [ // Go through the store front door
        token('store'),
        token('front'),
        tokenRegex('doors?'),
      ],
      [ // It goes from surface to surface
        token('from'),
        token('surface'),
        token('to'),
        token('surface'),
      ],
      [ // year end
        tokenRegex('senior|junior'),
        token('year'),
        token('end'),
      ],
      [ // under investment
        token('under'),
        token('investment'),
        token('banking'),
      ],
      [ // spring clean
        token('spring'),
        tokenRegex('cleans?|cleaned|cleaning'),
        tokenRegex('up|the|my|our|his|her'),
      ],
      [ // Serie A team (A-Team)
        tokenRegex('series?'),
        tokenRegex('a'),
      ],
      [ // They had a hard time sharing their ...
        token('hard'),
        token('time'),
        new PatternTokenBuilder().pos('VBG').build(),
      ],
      [ // the first ever green bond by a municipality
        token('first'),
        tokenRegex('ever'),
        tokenRegex('green'),
      ],
      [ // inter-state.com
        tokenRegex('.+'),
        token('.'),
        tokenRegex('(com|io|de|nl|co|net|org|es)'),
      ],
    ], AMERICAN_ENGLISH);
  }
  return antiPatterns;
}

// Java: CompoundRule (en)
export class CompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.en.CompoundRule';

  // Java: CompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, english, userConfig) {
    super(messages, english, userConfig,
      'This word is normally spelled with a hyphen.',
      'This word is normally spelled as one.',
      'This expression is normally spelled as one or with a hyphen.',
      'Compound');
    this.english = english;
    super.useSubRuleSpecificIds();
    this.addExamplePair(Example.wrong('I now have a <marker>part time</marker> job.'),
      Example.fixed('I now have a <marker>part-time</marker> job.'));
    this.setUrl(getUrl('https://languagetool.org/insights/post/hyphen/'));
  }

  // Java: CompoundRule#getId()
  getId() {
    return 'EN_COMPOUNDS';
  }

  // Java: CompoundRule#getDescription()
  getDescription() {
    return 'Hyphenated words: $match';
  }

  // Java: CompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/en/compounds.txt');
    }
    return compoundData;
  }

  // Java: CompoundRule#getAntiPatterns()
  getAntiPatterns() {
    return antiPatternsOf();
  }

  // Java: CompoundRule#isMisspelled(String)
  isMisspelled(word) {
    return Objects.requireNonNull(this.english.getDefaultSpellingRule()).isMisspelled(word);
  }
}
