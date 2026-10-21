// Ported from DictionarySpellMatchFilterTest (languagetool-server); testLoading is @Ignore'd (performance estimate) and not ported
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { Languages } from '../../src/core/Languages.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { FakeRule } from '../../src/core/rules/FakeRule.js';
import { DictionarySpellMatchFilter } from '../../src/core/rules/DictionarySpellMatchFilter.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { PipelinePool } from '../../src/server/PipelinePool.js';
import { PipelineSettings } from '../../src/server/PipelineSettings.js';
import { getDemoLanguage, useXxTestResources } from '../support/DemoLanguage.js';

// Java: DictionarySpellMatchFilterTest.SpellingFakeRule
class SpellingFakeRule extends FakeRule {
  isDictionaryBasedSpellingRule() { return true; }
}

describe('DictionarySpellMatchFilterTest', () => {
  useXxTestResources();

  // Java: DictionarySpellMatchFilterTest#testGetPhrases
  it('testGetPhrases', () => {
    const text = 'This is aa bb and then xx yyy zzzz';
    const aText = new AnnotatedTextBuilder().addText(text).build();
    const sentence = new JLanguageTool(getDemoLanguage()).getAnalyzedSentence(text);
    const rule = new SpellingFakeRule();
    const matches = [
      new RuleMatch(rule, sentence, 8, 10, 'fake msg'),
      new RuleMatch(rule, sentence, 11, 13, 'fake msg'),
      new RuleMatch(rule, sentence, 23, 25, 'fake msg'),
      new RuleMatch(rule, sentence, 26, 29, 'fake msg'),
      new RuleMatch(rule, sentence, 30, 34, 'fake msg'),
    ];
    const filter = new DictionarySpellMatchFilter(new UserConfig());
    const result = filter.getPhrases(matches, aText);
    expect(result.size()).toBe(3);
    expect(result.containsKey('aa bb')).toBe(true);
    expect(result.containsKey('xx yyy')).toBe(true);
    expect(result.containsKey('xx yyy zzzz')).toBe(true);
  });

  // Java: DictionarySpellMatchFilterTest#testFilterMorfologik
  it('testFilterMorfologik', () => {
    const english = Languages.getLanguageForShortCode('en-US');
    const lt = new JLanguageTool(english);
    expect(lt.check('This is a mistak.').length).toBe(1);
    expect(lt.check('This is baad.').length).toBe(1);
    expect(lt.check('This is a baad mistak.').length).toBe(2);

    const userConfig = new UserConfig(['baad mistak']);
    const pool = new PipelinePool(new HTTPServerConfig(), null, true);
    const ltWithPhrase = pool.getPipeline(new PipelineSettings(english, userConfig));
    expect(ltWithPhrase.check('This is a mistak.').length).toBe(1);
    expect(ltWithPhrase.check('This is baad.').length).toBe(1);
    expect(ltWithPhrase.check('This is a baad mistak.').length).toBe(0);
  });

  // Java: DictionarySpellMatchFilterTest#testPartialMatches
  it('testPartialMatches', () => {
    const english = Languages.getLanguageForShortCode('en-US');
    const lt = new JLanguageTool(english);
    expect(lt.check('This is a mistake.').length).toBe(0);
    expect(lt.check('This is baad.').length).toBe(1);
    expect(lt.check('This is a baad mistake.').length).toBe(1);

    const userConfig = new UserConfig(['baad mistake']);
    const pool = new PipelinePool(new HTTPServerConfig(), null, true);
    const ltWithPhrase = pool.getPipeline(new PipelineSettings(english, userConfig));
    expect(ltWithPhrase.check('This is a mistake.').length).toBe(0);
    expect(ltWithPhrase.check('This is baad.').length).toBe(1);
    expect(ltWithPhrase.check('This is a baad mistake.').length).toBe(0);
  });

  // Java: DictionarySpellMatchFilterTest#testFilterHunspell
  it('testFilterHunspell', () => {
    const german = Languages.getLanguageForShortCode('de-DE');
    const lt = new JLanguageTool(german);
    expect(lt.check('Das ist ein Fehlar.').length).toBe(1);
    expect(lt.check('Das ist schlim.').length).toBe(1);
    expect(lt.check('Das ist ein schlim Fehlar.').length).toBe(2);

    const userConfig = new UserConfig(['schlim Fehlar']);
    const pool = new PipelinePool(new HTTPServerConfig(), null, true);
    const ltWithPhrase = pool.getPipeline(new PipelineSettings(german, userConfig));
    expect(ltWithPhrase.check('Das ist ein Fehlar.').length).toBe(1);
    expect(ltWithPhrase.check('Das ist schlim.').length).toBe(1);
    expect(ltWithPhrase.check('Das ist ein schlim Fehlar.').length).toBe(0);
  });
});
