// org.languagetool.rules.de.UppercaseNounReadingFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { GermanTagger } from '../tagging/GermanTagger.js';

// Java: UppercaseNounReadingFilter
export class UppercaseNounReadingFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.UppercaseNounReadingFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.UppercaseNounReadingFilter()' }];

  // Java: UppercaseNounReadingFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const token = arguments_.get('token');
    if (token === null || token === undefined) {
      throw new RuntimeException("Set 'token' for filter " + UppercaseNounReadingFilter.FQCN + ' in rule ' + match.getRule().getId());
    }
    try {
      const uppercase = uppercaseFirstChar(token);
      const tags = GermanTagger.INSTANCE.tag([uppercase]);
      let hasNounReading = false;
      for (const tag of tags) {
        if (tag.hasPartialPosTag('SUB:') && !tag.hasPartialPosTag('ADJ')) {
          hasNounReading = true;
          break;
        }
      }
      if (hasNounReading) {
        return match;
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
    return null;
  }
}

registerClass(UppercaseNounReadingFilter.FQCN, UppercaseNounReadingFilter);
