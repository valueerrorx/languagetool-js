// MultiThreadedJLanguageToolTest (Demo language -> en-US + test rules; no thread pool in the port, S9)
import { describe, it, expect } from 'vitest';
import { EN, englishMessages, useNoopAnalysis } from '../support/ruleTestSupport.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { MultiThreadedJLanguageTool } from '../../src/core/MultiThreadedJLanguageTool.js';
import { ExecutionException, IllegalStateException, RejectedExecutionException, RuntimeException } from '../../src/lib/java/errors.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { UppercaseSentenceStartRule } from '../../src/core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../src/core/rules/MultipleWhitespaceRule.js';

useNoopAnalysis(EN);

// stands in for the Demo pattern rules: one match per token equal to a word
class WordRule extends Rule {
  constructor(id, word) {
    super();
    this.id = id;
    this.word = word;
  }

  getId() { return this.id; }

  getDescription() { return 'desc'; }

  match(sentence) {
    return sentence.getTokensWithoutWhitespace().filter((t) => t.getToken() === this.word)
      .map((t) => new RuleMatch(this, sentence, t.getStartPos(), t.getEndPos(), 'msg'));
  }
}

const rules = () => [new WordRule('R_GO', 'go'), new WordRule('R_TOAST', 'toast'), new WordRule('R_THERE', 'there'), new WordRule('R_FIRST', 'First')];
const getRuleMatchIds = (lt) => lt.check('A small toast. No error here. Foo go bar. First goes last there, please!').map((x) => x.getRule().getId());
const newMt = (r) => new MultiThreadedJLanguageTool(EN, [], null, null, null, null, true, false, r);

describe('MultiThreadedJLanguageToolTest', () => {
  // Java: MultiThreadedJLanguageToolTest#testCheck
  it('testCheck', () => {
    const lt1 = newMt(rules());
    lt1.setCleanOverlappingMatches(false);
    const ids1 = getRuleMatchIds(lt1);
    expect(ids1.length).toBe(4);
    lt1.shutdown();
    const lt2 = new JLanguageTool(EN, [], null, null, null, null, true, false, rules());
    lt2.setCleanOverlappingMatches(false);
    expect(getRuleMatchIds(lt2)).toEqual(ids1);
  });

  // Java: MultiThreadedJLanguageToolTest#testTextAnalysis
  it('testTextAnalysis', () => {
    const lt = newMt([]);
    const analyzedSentences = lt.analyzeText('This is a sentence. And another one.');
    expect(analyzedSentences.length).toBe(2);
    expect(analyzedSentences[0].getTokens().length).toBe(10);
    expect(analyzedSentences[0].getTokensWithoutWhitespace().length).toBe(6);
    expect(analyzedSentences[1].getTokens().length).toBe(7);
    expect(analyzedSentences[1].getTokensWithoutWhitespace().length).toBe(5);
    expect(analyzedSentences[1].getTokens()[6].isParagraphEnd()).toBe(true);
    lt.shutdown();
  });

  // Java: MultiThreadedJLanguageToolTest#testTwoRulesOnly
  it('testTwoRulesOnly', () => {
    const messages = englishMessages();
    const lt = newMt([new UppercaseSentenceStartRule(messages, EN), new MultipleWhitespaceRule(messages)]);
    expect(lt.check('my test  text').length).toBe(2);
    lt.shutdown();
  });

  // Java: MultiThreadedJLanguageTool#analyzeSentences(List): >= 2 sentences do not reset unknownWords (single sentence does)
  it('analyzeSentences keeps unknownWords for >= 2 sentences', () => {
    const lt = newMt([]);
    lt.setListUnknownWords(true);
    lt.unknownWords.add('stale');
    lt.analyzeText('Foo. Bar.');
    expect(lt.unknownWords.has('stale')).toBe(true);
    lt.analyzeText('Baz.');
    expect(lt.unknownWords.has('stale')).toBe(false);
  });

  // Java: MultiThreadedJLanguageToolTest#testShutdownException
  it('testShutdownException', () => {
    const tool = newMt([]);
    tool.shutdown();
    expect(() => tool.check('a test')).toThrow(RejectedExecutionException);
    const tool2 = newMt([]);
    tool2.shutdownWhenDone();
    expect(() => tool2.check('a test. b test.')).toThrow(RejectedExecutionException);
  });

  // Java: MultiThreadedJLanguageTool#performCheck: rule failures surface as RuntimeException(ExecutionException(re-created RuntimeException(original)))
  it('rule errors are wrapped in ExecutionException', () => {
    class Boom extends WordRule {
      match() { throw new IllegalStateException('boom'); }
    }
    const lt = newMt([new Boom('R_BOOM', 'go')]);
    let err;
    try { lt.check('Foo go bar.'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(RuntimeException);
    expect(err.getMessage()).toMatch(/^java\.util\.concurrent\.ExecutionException: java\.lang\.RuntimeException: java\.lang\.RuntimeException: Could not check sentence/);
    expect(err.getCause()).toBeInstanceOf(ExecutionException);
    lt.shutdown();
  });
});
// skipped: testConfigurableThreadPoolSize (getThreadPoolSize not ported, sequential S9)
