// Java: org.languagetool.language.SwissGerman
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { StringIndexOutOfBoundsException } from '../../../lib/java/errors.js';
import { German } from './German.js';

// Java: String#substring(int,int)
function javaSubstring(str, begin, end) {
  if (begin < 0 || begin > end || end > str.length) {
    throw new StringIndexOutOfBoundsException(`begin ${begin}, end ${end}, length ${str.length}`);
  }
  return str.substring(begin, end);
}

// Java: SwissGerman
export class SwissGerman extends German {
  static FQCN = 'org.languagetool.language.SwissGerman';

  // Java: SwissGerman#createDefaultTagger()
  createDefaultTagger() {
    return createComponent('org.languagetool.tagging.de.SwissGermanTagger');
  }

  // Java: SwissGerman#getCountries()
  getCountries() {
    return ['CH'];
  }

  // Java: SwissGerman#getName()
  getName() {
    return 'German (Swiss)';
  }

  // Java: SwissGerman#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('SwissGerman#getRelevantRules (F17)');
  }

  // Java: SwissGerman#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.de.SwissGermanSpellerRule', messages, this);
  }

  // Java: SwissGerman#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('SwissGerman#getRelevantLanguageModelCapableRules (F17)');
  }

  // Java: SwissGerman#isVariant()
  isVariant() {
    return true;
  }

  // Java: SwissGerman#filterRuleMatches(List,AnnotatedText,Set)
  filterRuleMatches(ruleMatches, text, enabledRules) {
    // First, use the filter in German.java
    ruleMatches = super.filterRuleMatches(ruleMatches, text, enabledRules);
    const newRuleMatches = [];
    for (const rm of ruleMatches) {
      // TODO: replace this by supporting remote-rule-filter for language variants
      const ruleId = rm.getRule().getId();
      if (ruleId === 'AI_DE_GGEC_REPLACEMENT_ORTHOGRAPHY_SPELL' || ruleId === 'AI_DE_GGEC_REPLACEMENT_ADJECTIVE_FORM') {
        let matchingString = null;
        if (rm.getSentence() !== null) {
          if (rm.getFromPos() > -1 && rm.getToPos() > -1) {
            const sentenceStr = rm.getSentence().getText();
            if (sentenceStr.length !== 0) {
              matchingString = javaSubstring(sentenceStr, rm.getFromPos(), rm.getToPos());
            }
          }
        }
        const finalMatchingString = matchingString;
        if (finalMatchingString !== null && finalMatchingString.includes('ss')
          && rm.getSuggestedReplacements().some((suggestion) => suggestion === finalMatchingString.replaceAll('ss', 'ß'))) {
          continue; // Java logs "Remove match with ruleID" at INFO here
        }
      }

      const replacements = rm.getSuggestedReplacementObjects();
      const newReplacements = [];
      for (const s of replacements) {
        const newReplStr = s.getReplacement().replaceAll('ß', 'ss');
        const newRepl = new SuggestedReplacement(s);
        newRepl.setReplacement(newReplStr);
        newReplacements.push(newRepl);
      }
      const newMatch = new RuleMatch(rm, newReplacements);
      newRuleMatches.push(newMatch);
    }
    return newRuleMatches;
  }

  // Java: SwissGerman#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '«';
  }

  // Java: SwissGerman#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '»';
  }
}

registerClass(SwissGerman.FQCN, SwissGerman);
