// Ported from AbstractEnglishSpellerRuleTest (en module; abstract base of the Morfologik*SpellerRuleTest classes, has no tests of its own)
import { expect } from 'vitest';
import { newLt } from './ruleTestSupport.js';

// Java: AbstractEnglishSpellerRuleTest (instance state lt/rule per call)
export class AbstractEnglishSpellerRuleTest {
  // Java: AbstractEnglishSpellerRuleTest#testNonVariantSpecificSuggestions(Rule,Language)
  testNonVariantSpecificSuggestions(rule, language) {
    this.lt = newLt(language);
    this.rule = rule;
    const lt = this.lt;
    this.assertFirstMatch('teh', 'the');

    // from http://waxy.org/2003/04/typo_popularity/:
    this.assertFirstMatch('seperate', 'separate');
    this.assertFirstMatch('definately', 'definitely');
    this.assertFirstMatch('recieve', 'receive');
    this.assertFirstMatch('offical', 'official');
    this.assertFirstMatch('managment', 'management');
    this.assertFirstMatch('goverment ', 'government');
    this.assertFirstMatch('Febuary', 'February');
    this.assertFirstMatch('enviroment', 'environment');
    this.assertFirstMatch('occurence', 'occurrence');
    this.assertFirstMatch('commision', 'commission');
    this.assertFirstMatch('assocation', 'association');
    this.assertFirstMatch('Cincinatti', 'Cincinnati');
    this.assertFirstMatch('milennium', 'millennium');
    this.assertFirstMatch('accomodation', 'accommodation');
    this.assertFirstMatch('foriegn', 'foreign');
    this.assertFirstMatch('chemcial', 'chemical');
    this.assertFirstMatch('developement', 'development');
    this.assertFirstMatch('maintainance', 'maintenance');
    this.assertFirstMatch('restaraunt', 'restaurant');
    this.assertFirstMatch('garentee', 'guarantee');
    this.assertFirstMatch('greatful', 'grateful');
    this.assertFirstMatch('hipocrit', 'hypocrite');
    this.assertFirstMatch('mischevious', 'mischievous');
    this.assertFirstMatch('hygeine', 'hygiene');
    this.assertFirstMatch('ur', 'your');
    this.assertFirstMatch('doublecheck', 'double-check');
    this.assertAllMatches(lt, rule, 'campaignt', 'campaign', 'campaigns');
    this.assertAllMatches(lt, rule, 'campaignd', 'campaign', 'campaigns', 'campaigned');
    this.assertAllMatches(lt, rule, 'campaignll', 'campaign', 'campaigns', 'campaigned', 'campaigner');
    this.assertAllMatches(lt, rule, 'spreaded', 'spread', 'spreader');
    this.assertAllMatches(lt, rule, 'slimiar', 'similar', 'slimier');

    expect(rule.match(lt.getAnalyzedSentence("You couldn't; he didn't; it doesn't; they aren't; I hadn't; etc.")).length).toBe(0);

    // currently solved as a special case, also see https://github.com/morfologik/morfologik-stemming/issues/32:
    this.assertFirstMatch('alot', 'a lot');
    // currently solved as a special case (AbstractEnglishSpellerRule.getAdditionalTopSuggestions()):
    this.assertFirstMatch('speach', 'speech');
    this.assertFirstMatch('qualifys', 'qualifies');
    this.assertFirstMatch('nicefys', 'nicely');

    this.assertFirstMatch('vacume', 'value', 'volume', 'acute', 'vacuum');
  }

  // Java: AbstractEnglishSpellerRuleTest#testHyphenatedWordSuggestions(Rule,Language)
  testHyphenatedWordSuggestions(rule, language) {
    this.lt = newLt(language);
    this.rule = rule;

    this.assertFirstMatch('long-trem', 'long-term');
    this.assertFirstMatch('self-sefficient', 'self-sufficient');
    this.assertFirstMatch('parple-people-eater', 'purple-people-eater');
  }

  // Java: AbstractEnglishSpellerRuleTest#assertFirstMatch(String,String...)
  assertFirstMatch(text, ...expectedSuggestions) {
    const matches = this.rule.match(this.lt.getAnalyzedSentence(text));
    expect(matches.length === 1, `Expected 1 match for '${text}', got ${matches.length}`).toBe(true);
    const suggestions = matches[0].getSuggestedReplacements();
    expect(suggestions.length > 0, `Expected at least one suggestion for '${text}'`).toBe(true);
    let i = 0;
    for (const expectedSuggestion of expectedSuggestions) {
      expect(suggestions[i], `Expected suggestion '${expectedSuggestion}' not found at position ${i} in suggestions: [${suggestions.join(', ')}]`).toBe(expectedSuggestion);
      i++;
    }
  }

  // Java: AbstractEnglishSpellerRuleTest#assertAllMatches(JLanguageTool,Rule,String,String...)
  assertAllMatches(lt, rule, text, ...expectedSuggestions) {
    const matches = rule.match(lt.getAnalyzedSentence(text));
    expect(matches.length, `Expected 1 match for '${text}', got ${matches.length}`).toBe(1);
    const suggestions = matches[0].getSuggestedReplacements();
    expect(expectedSuggestions.length, `Expected ${expectedSuggestions.length} suggestions for '${text}', got: [${suggestions.join(', ')}]`).toBe(suggestions.length);
    let i = 0;
    for (const expectedSuggestion of expectedSuggestions) {
      expect(suggestions[i], `Expected suggestion '${expectedSuggestion}' not found at position ${i} in suggestions: [${suggestions.join(', ')}]`).toBe(expectedSuggestion);
      i++;
    }
  }
}
