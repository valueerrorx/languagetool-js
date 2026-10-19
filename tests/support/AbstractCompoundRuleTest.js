// Ported from AbstractCompoundRuleTest (core test jar; abstract base of the CompoundRule tests of the language modules)
import { expect } from 'vitest';
import { javaReplace } from '../../src/lib/java/strings.js';

// Java: AbstractCompoundRuleTest (fields lt/rule are set by the subclass)
export class AbstractCompoundRuleTest {
  // Java: AbstractCompoundRuleTest#check(int,String) and #check(int,String,String...) (no expected suggestions given = null)
  check(expectedErrors, text, ...expSuggestions) {
    expect(this.lt, 'Please initialize langTool!').not.toBeNull();
    expect(this.rule, "Please initialize 'rule'!").not.toBeNull();
    const ruleMatches = this.rule.match(this.lt.getAnalyzedSentence(text));
    expect(ruleMatches.length, `Expected ${expectedErrors} error(s), but got: [${ruleMatches.join(', ')}]`).toBe(expectedErrors);
    const given = expSuggestions.length > 0;
    if (given && expectedErrors !== 1) {
      throw new Error("Sorry, test case can only check suggestion if there's one rule match");
    }
    if (given) {
      const ruleMatch = ruleMatches[0];
      const errorMessage = `Got these suggestions: [${ruleMatch.getSuggestedReplacements().join(', ')}], expected [${expSuggestions.join(', ')}] `;
      expect(ruleMatch.getSuggestedReplacements().length, errorMessage).toBe(expSuggestions.length);
      let i = 0;
      for (const element of ruleMatch.getSuggestedReplacements()) {
        expect(element).toBe(expSuggestions[i]);
        i++;
      }
    }
  }

  // Java: AbstractCompoundRuleTest#testAllCompounds()
  testAllCompounds() {
    for (const compound of this.rule.getCompoundRuleData().getIncorrectCompounds()) {
      let suggestion = '';
      if (this.rule.getCompoundRuleData().getDashSuggestion().has(compound)) {
        suggestion = javaReplace(compound, ' ', '-');
        if (this.rule.isMisspelled(suggestion)) {
          this.printWarning(suggestion);
        }
      }
      if (this.rule.getCompoundRuleData().getJoinedSuggestion().has(compound)) {
        suggestion = this.rule.mergeCompound(compound, this.rule.getCompoundRuleData().getJoinedLowerCaseSuggestion().has(compound));
        if (this.rule.isMisspelled(suggestion)) {
          this.printWarning(suggestion);
        }
      }
    }
  }

  // Java: AbstractCompoundRuleTest#printWarning(String)
  printWarning(suggestion) {
    process.stderr.write(`WARNING: Suggested compound word is possibly misspelled: ${suggestion}\n`);
  }
}
