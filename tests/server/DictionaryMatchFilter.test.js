// Ported from DictionaryMatchFilterTest (languagetool-server)
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { Languages } from '../../src/core/Languages.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { DictionaryMatchFilter } from '../../src/core/rules/DictionaryMatchFilter.js';
import { MorfologikAmericanSpellerRule } from '../../src/lang/en/rules/MorfologikAmericanSpellerRule.js';
import { disableAllRulesExcept } from '../support/TestTools.js';

// Java: DictionaryMatchFilterTest.ForbiddenWordsRule
class ForbiddenWordsRule extends Rule {
  constructor(words) {
    super();
    this.words = words;
  }

  getId() { return 'DictionaryMatchFilterTestRule'; }

  getDescription() { return 'Test'; }

  match(sentence) {
    const matches = [];
    for (const token of sentence.getTokensWithoutWhitespace()) {
      const word = token.getToken();
      if (this.words.has(word)) {
        matches.push(new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), `Forbidden word: ${word}`));
      }
    }
    return matches;
  }
}

// Java: DictionaryMatchFilterTest#getLT(Set,Set,boolean)
function getLT(forbidden, dictionary, addFilter) {
  const config = new UserConfig([...dictionary]);
  const lt = new JLanguageTool(Languages.getLanguageForShortCode('en-US'), null, config);
  const testRule = new ForbiddenWordsRule(forbidden);
  disableAllRulesExcept(lt, testRule.getId(), MorfologikAmericanSpellerRule.RULE_ID);
  lt.addRule(testRule);
  lt.enableRule(testRule.getId());
  if (addFilter) {
    lt.addMatchFilter(new DictionaryMatchFilter(config));
  }
  return lt;
}

const isForbiddenWordMatch = (word, match) => match.getMessage() === `Forbidden word: ${word}`;
const isSpellingMatch = (match) => match.getMessage().includes('Possible spelling mistake found');

describe('DictionaryMatchFilterTest', () => {
  // Java: DictionaryMatchFilterTest#matchesWithoutFilter
  it('matchesWithoutFilter', () => {
    const lt = getLT(new Set(['fooxxx', 'bar', 'foobar']), new Set(), false);
    const matches = lt.check('This is fooxxx. Very bar of you! Even foobar, one might say.');
    expect(matches.length).toBe(3);
    expect(isForbiddenWordMatch('fooxxx', matches[0])).toBe(true);
    expect(isForbiddenWordMatch('bar', matches[1])).toBe(true);
    expect(isForbiddenWordMatch('foobar', matches[2])).toBe(true);
  });

  // Java: DictionaryMatchFilterTest#spellingRuleMatches
  it('spellingRuleMatches', () => {
    const lt = getLT(new Set(), new Set(), false);
    expect(isSpellingMatch(lt.check('This is a mistak')[0])).toBe(true);
    const lt2 = getLT(new Set(), new Set(['mistak']), true);
    expect(lt2.check('This is a mistak.').length).toBe(0);
    expect(isSpellingMatch(lt2.check('This is another mistke.')[0])).toBe(true);
  });

  // Java: DictionaryMatchFilterTest#filter
  it('filter', () => {
    const lt = getLT(new Set(['foo', 'bar']), new Set(['foo']), true);
    const matches = lt.check('This is foo. This is bar.');
    expect(matches.length).toBe(1);
    expect(isForbiddenWordMatch('bar', matches[0])).toBe(true);
  });
});
