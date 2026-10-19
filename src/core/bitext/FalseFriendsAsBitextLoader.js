// org.languagetool.rules.patterns.bitext.FalseFriendsAsBitextLoader (false friend rules of both directions paired as bitext rules)
import { getDataBroker } from '../resources/LtStatics.js';
import { FalseFriendRuleLoader } from '../patterns/FalseFriendRuleLoader.js';
import { BitextPatternRule } from './BitextPatternRule.js';

// Java: FalseFriendsAsBitextLoader
export class FalseFriendsAsBitextLoader {
  static FQCN = 'org.languagetool.rules.patterns.bitext.FalseFriendsAsBitextLoader';

  // Java: FalseFriendsAsBitextLoader#getFalseFriendsAsBitext(String,Language,Language)
  getFalseFriendsAsBitext(filename, motherTongue, language) {
    const ruleLoader = new FalseFriendRuleLoader(motherTongue);
    const bRules = [];
    const rules1 = ruleLoader.getRules(getDataBroker().getFromRulesDirAsStream(filename), motherTongue, language);
    const rules2 = ruleLoader.getRules(getDataBroker().getFromRulesDirAsStream(filename), language, motherTongue);
    const srcRules = new Map();
    for (const rule of rules1) {
      srcRules.set(rule.getId(), rule);
    }
    for (const rule of rules2) {
      if (srcRules.has(rule.getId())) {
        const bRule = new BitextPatternRule(srcRules.get(rule.getId()), rule);
        bRule.setSourceLanguage(motherTongue);
        bRule.setCategory(rule.getCategory());
        bRules.push(bRule);
      }
    }
    return bRules;
  }
}
