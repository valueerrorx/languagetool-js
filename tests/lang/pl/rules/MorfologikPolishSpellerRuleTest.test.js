// Ported from MorfologikPolishSpellerRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { MorfologikPolishSpellerRule } from '../../../../src/lang/pl/rules/MorfologikPolishSpellerRule.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('MorfologikPolishSpellerRuleTest', () => {
  // Java: MorfologikPolishSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const pl = new Polish();
    const rule = new MorfologikPolishSpellerRule(messagesFor(pl), pl, null, []);
    const lt = new JLanguageTool(new Polish());
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;
    // correct sentences:
    expect(n('To jest test bez jakiegokolwiek błędu.')).toBe(0);
    expect(n('Żółw na starość wydziela dziwną woń.')).toBe(0);
    expect(n('Żółw na starość wydziela dziwną woń numer 1234.')).toBe(0);
    expect(n('W MI-6 pracuje 15-letni agent.')).toBe(0);
    expect(n('LanguageTool jest świetny!')).toBe(0);
    expect(n('Gdym to zobaczył, zdębiałem.')).toBe(0);
    expect(n(',')).toBe(0);
    expect(n('123454')).toBe(0);
    expect(n('Roztrzepać widelcem jajka razem z purée z dyni.')).toBe(0);
    expect(n('Bogactwo nie rośnie proporcjonalnie do jej rozwoju techniczno-terytorialnego.')).toBe(0);
    expect(n('Antypostmodernistyczna batalia hiperfilozofów')).toBe(0);
    expect(n('Trzynastobitowe przystawki w kolorze zgniłożółtym')).toBe(0);
    expect(n('Nie spotkałem tutaj Saint-Exupérych')).toBe(0);
    // incorrect sentences:
    let matches = rule.match(lt.getAnalyzedSentence('Zolw'));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(0);
    expect(matches[0].getToPos()).toBe(4);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Żółw');
    matches = rule.match(lt.getAnalyzedSentence('😂 Zolw'));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(3);
    expect(matches[0].getToPos()).toBe(7);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Żółw');
    matches = rule.match(lt.getAnalyzedSentence('😂😂 Zolw'));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(5);
    expect(matches[0].getToPos()).toBe(9);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Żółw');
    expect(n('aõh')).toBe(1);
    // tokenizing on prefixes niby- and quasi-
    expect(n('Niby-artysta spotkał się z quasi-opiekunem i niby-Francuzem.')).toBe(0);
    const pruned = rule.match(lt.getAnalyzedSentence('Clarkem'));
    expect(pruned.length).toBe(1);
    expect(pruned[0].getSuggestedReplacements().length).toBe(6);
    expect(pruned[0].getSuggestedReplacements()[0]).toBe('Clarke');
    expect(pruned[0].getSuggestedReplacements()[1]).toBe('Czarkę');
    expect(pruned[0].getSuggestedReplacements()[2]).toBe('Clarkiem');
    expect(pruned[0].getSuggestedReplacements()[3]).toBe('Ciarkę');
    expect(pruned[0].getSuggestedReplacements()[4]).toBe('Clarkom');
    expect(n('Saint-Exupérymu')).toBe(1);
    expect(n('premoc')).toBe(1);
    expect(n('dziwneg0')).toBe(1);
  }, 3600000);
});
