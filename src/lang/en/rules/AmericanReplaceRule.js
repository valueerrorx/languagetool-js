// org.languagetool.rules.en.AmericanReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Locale } from '../../../lib/java/Locale.js';
import { AmericanEnglish } from '../language/AmericanEnglish.js';

const EN_US_LOCALE = new Locale('en-US');

// Java: AmericanReplaceRule
export class AmericanReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.AmericanReplaceRule';
  static AMERICAN_SIMPLE_REPLACE_RULE = 'EN_US_SIMPLE_REPLACE';

  // Java: AmericanReplaceRule#getFileNames()
  getFileNames() {
    return [this.path];
  }

  // Java: AmericanReplaceRule(ResourceBundle,String)
  constructor(messages, path) {
    super(messages, AmericanEnglish.getInstance());
    this.path = Objects.requireNonNull(path);
    this.useSubRuleSpecificIds();
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.LocaleViolation);
    this.addExamplePair(Example.wrong('Are baked <marker>crisps</marker> healthy?'),
      Example.fixed('Are baked <marker>chips</marker> healthy?'));
  }

  // Java: AmericanReplaceRule#getId()
  getId() {
    return AmericanReplaceRule.AMERICAN_SIMPLE_REPLACE_RULE;
  }

  // Java: AmericanReplaceRule#getDescription()
  getDescription() {
    return 'British words easily confused in American English: $match';
  }

  // Java: AmericanReplaceRule#getShort()
  getShort() {
    return 'British word';
  }

  // Java: AmericanReplaceRule#getMessage()
  getMessage() {
    return "'$match' is a common British expression. Consider using expressions more common to American English.";
  }

  // Java: AmericanReplaceRule#getLocale()
  getLocale() {
    return EN_US_LOCALE;
  }
}
