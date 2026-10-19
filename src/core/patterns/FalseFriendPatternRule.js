// org.languagetool.rules.patterns.FalseFriendPatternRule (pattern rule tagged picky)
import { Tag } from '../rules/model/Tag.js';
import { PatternRule } from './PatternRule.js';

// Java: FalseFriendPatternRule
export class FalseFriendPatternRule extends PatternRule {
  static FQCN = 'org.languagetool.rules.patterns.FalseFriendPatternRule';

  // Java: FalseFriendPatternRule#FalseFriendPatternRule(String,Language,List,String,String,String)
  constructor(id, language, patternTokens, description, message, shortMessage) {
    super(id, language, patternTokens, description, message, shortMessage);
    this.setTags([Tag.picky]);
  }
}
