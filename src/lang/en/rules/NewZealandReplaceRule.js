// org.languagetool.rules.en.NewZealandReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Locale } from '../../../lib/java/Locale.js';
import { NewZealandEnglish } from '../language/NewZealandEnglish.js';

const EN_NZ_LOCALE = new Locale('en-NZ');

// Java: NewZealandReplaceRule
export class NewZealandReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.NewZealandReplaceRule';
  static NEW_ZEALAND_SIMPLE_REPLACE_RULE = 'EN_NZ_SIMPLE_REPLACE';

  // Java: NewZealandReplaceRule#getFileNames()
  getFileNames() {
    return [this.path];
  }

  // Java: NewZealandReplaceRule(ResourceBundle,String)
  constructor(messages, path) {
    super(messages, new NewZealandEnglish());
    this.path = Objects.requireNonNull(path);
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.LocaleViolation);
    this.addExamplePair(Example.wrong('A <marker>sidewalk</marker> is a path along the side of a road.'),
      Example.fixed('A <marker>footpath</marker> is a path along the side of a road.'));
  }

  // Java: NewZealandReplaceRule#getId()
  getId() {
    return NewZealandReplaceRule.NEW_ZEALAND_SIMPLE_REPLACE_RULE;
  }

  // Java: NewZealandReplaceRule#getDescription()
  getDescription() {
    return 'English words easily confused in New Zealand English';
  }

  // Java: NewZealandReplaceRule#getShort()
  getShort() {
    return 'Not a New Zealand English word';
  }

  // Java: NewZealandReplaceRule#getMessage()
  getMessage() {
    return "'$match' is a non-standard expression. Consider using expressions more common to New Zealand English.";
  }

  // Java: NewZealandReplaceRule#getLocale()
  getLocale() {
    return EN_NZ_LOCALE;
  }
}
