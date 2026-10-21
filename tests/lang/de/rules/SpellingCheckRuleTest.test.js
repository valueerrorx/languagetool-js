// Ported from SpellingCheckRuleTest (de module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { SpellingCheckRule } from '../../../../src/core/rules/spelling/SpellingCheckRule.js';
import { GermanSpellerRule } from '../../../../src/lang/de/rules/GermanSpellerRule.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

describe('SpellingCheckRuleTest', () => {
  // Java: SpellingCheckRuleTest#testIgnoreSuggestionsWithHunspell
  it('testIgnoreSuggestionsWithHunspell', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));

    expect(lt.check('Das ist ein einPseudoWortFürLanguageToolTests').length).toBe(0); // no error, as this word is in ignore.txt

    const matches = lt.check('Das ist ein Tibbfehla');
    expect(matches.length).toBe(1);
    expect(matches[0].getRule().getId()).toBe(GermanSpellerRule.RULE_ID);
  }, 120000);

  // Java: SpellingCheckRuleTest#testIgnorePhrases
  it('testIgnorePhrases', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    expect(lt.check('Ein Test mit Auriensis Fantasiewortus').length).toBe(2);
    for (const rule of lt.getAllActiveRules()) {
      if (rule instanceof SpellingCheckRule) {
        rule.acceptPhrases(['Auriensis Fantasiewortus', 'fudeldu laberwort']);
      } else {
        lt.disableRule(rule.getId());
      }
    }
    expect(lt.check('Ein Test mit Auriensis Fantasiewortus').length).toBe(0);
    expect(lt.check('Ein Test mit Auriensis und Fantasiewortus').length).toBe(2); // the words on their own are not ignored
    expect(lt.check('fudeldu laberwort').length).toBe(0);
    expect(lt.check('Fudeldu laberwort').length).toBe(0); // Uppercase at sentence start is okay
    expect(lt.check('Fudeldu Laberwort').length).toBe(1); // Different case somewhere other than at sentence start is not okay
  }, 120000);

  // Java: SpellingCheckRuleTest#testMultitokenSpelling
  it('testMultitokenSpelling', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    expect(lt.check('Bresegard bei Eldena').length).toBe(0);
    expect(lt.check('Feichten an der Alz').length).toBe(0);
    expect(lt.check('Groß Oesingen').length).toBe(0);
    expect(lt.check('Eching am Ammersee').length).toBe(0);

    expect(lt.check('Gross Oesingen').length).toBe(2);
    expect(lt.check('Groß Oessingen').length).toBe(1);
    expect(lt.check('Eching am Ammerse').length).toBe(2);
  }, 120000);

  // Java: SpellingCheckRuleTest#testProhibitedWordFollowedByDot
  it('testProhibitedWordFollowedByDot', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    expect(lt.check('Bestanteil.').length).toBe(1);
  }, 120000);
});
