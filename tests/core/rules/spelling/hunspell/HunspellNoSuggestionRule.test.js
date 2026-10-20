// Extra test (no Java original): HunspellNoSuggestionRule is not part of any language rule list, so only direct use exercises it
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { Languages } from '../../../../../src/core/Languages.js';
import { HunspellNoSuggestionRule } from '../../../../../src/core/rules/spelling/hunspell/HunspellNoSuggestionRule.js';
import { HunspellRule } from '../../../../../src/core/rules/spelling/hunspell/HunspellRule.js';
import { Example } from '../../../../../src/core/rules/model/Examples.js';
import { messagesFor, newLt } from '../../../../support/ruleTestSupport.js';

describe('HunspellNoSuggestionRule', () => {
  const de = Languages.getLanguageForShortCode('de-DE');
  const messages = messagesFor(Languages.getLanguageForShortCode('de'));

  // Java: HunspellNoSuggestionRule#getId/#getDescription/#getSuggestions
  it('has its own id and never offers suggestions', () => {
    const rule = new HunspellNoSuggestionRule(messages, de, null, []);
    expect(rule.getId()).toBe('HUNSPELL_NO_SUGGEST_RULE');
    expect(HunspellNoSuggestionRule.RULE_ID).toBe('HUNSPELL_NO_SUGGEST_RULE');
    expect(rule.getDescription()).toBe(messages.getString('desc_spelling_no_suggestions'));
    expect(rule.getSuggestions('Hauus')).toEqual([]);
    expect(rule instanceof HunspellRule).toBe(true);
  });

  // Java: HunspellRule#match with getSuggestions overridden
  it('still reports misspelled words, without replacements', () => {
    const rule = new HunspellNoSuggestionRule(messages, de, null, []);
    const lt = newLt(de);
    const matches = rule.match(lt.getAnalyzedSentence('Das ist ein Hauus.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(12);
    expect(matches[0].getToPos()).toBe(17);
    expect(matches[0].getSuggestedReplacements()).toEqual([]);
    expect(rule.match(lt.getAnalyzedSentence('Das ist ein Haus.')).length).toBe(0);
  });

  // Java: HunspellNoSuggestionRule(ResourceBundle,Language,UserConfig,List,IncorrectExample,CorrectExample)
  it('takes an example pair', () => {
    const rule = new HunspellNoSuggestionRule(messages, de, null, [], Example.wrong('Ein <marker>Hauus</marker>.'), Example.fixed('Ein <marker>Haus</marker>.'));
    expect(rule.getIncorrectExamples().length).toBe(1);
    expect(rule.getCorrectExamples().length).toBe(1);
  });
});
