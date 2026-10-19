// org.languagetool.rules.en.BritishReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Locale } from '../../../lib/java/Locale.js';
import { BritishEnglish } from '../language/BritishEnglish.js';

const EN_GB_LOCALE = new Locale('en-GB');

// Java: BritishReplaceRule
export class BritishReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.BritishReplaceRule';
  static BRITISH_SIMPLE_REPLACE_RULE = 'EN_GB_SIMPLE_REPLACE';

  // Java: BritishReplaceRule#getFileNames()
  getFileNames() {
    return [this.path];
  }

  // Java: BritishReplaceRule(ResourceBundle,String)
  constructor(messages, path) {
    super(messages, BritishEnglish.getInstance());
    this.path = Objects.requireNonNull(path);
    this.useSubRuleSpecificIds();
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.LocaleViolation);
    this.addExamplePair(Example.wrong("We can produce <marker>drapes</marker> of any size or shape from a choice of over 500 different fabrics."),
      Example.fixed("We can produce <marker>curtains</marker> of any size or shape from a choice of over 500 different fabrics."));
  }

  // Java: BritishReplaceRule#getId()
  getId() {
    return BritishReplaceRule.BRITISH_SIMPLE_REPLACE_RULE;
  }

  // Java: BritishReplaceRule#getDescription()
  getDescription() {
    return 'American words easily confused in British English: $match';
  }

  // Java: BritishReplaceRule#getShort()
  getShort() {
    return 'American word';
  }

  // Java: BritishReplaceRule#getMessage()
  getMessage() {
    return "'$match' is a common American expression. Consider using expressions more common to British English.";
  }

  // Java: BritishReplaceRule#getLocale()
  getLocale() {
    return EN_GB_LOCALE;
  }
}
