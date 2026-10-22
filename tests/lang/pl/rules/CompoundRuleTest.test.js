// Ported from CompoundRuleTest (pl module)
import { describe, it, expect, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { getDataBroker } from '../../../../src/core/resources/LtStatics.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { CompoundRule } from '../../../../src/lang/pl/rules/CompoundRule.js';
import { MorfologikPolishSpellerRule } from '../../../../src/lang/pl/rules/MorfologikPolishSpellerRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('CompoundRuleTest (pl)', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: CompoundRuleTest#setUp
  beforeEach(() => {
    t.lt = new JLanguageTool(new Polish());
    t.rule = new CompoundRule(englishMessages(), new Polish(), null);
  });

  // Java: CompoundRuleTest#testRule
  it('testRule', () => {
    t.check(0, 'Nie róbmy nic na łapu-capu.');
    t.check(0, 'Jedzmy kogel-mogel.');
    t.check(1, 'bim bom', 'bim-bom');
  });

  // Java: CompoundRuleTest#testCompoundFile
  it('testCompoundFile', () => {
    const pl = new Polish();
    const spellRule = new MorfologikPolishSpellerRule(messagesFor(pl), pl, null, []);
    const lines = getDataBroker().getFromResourceDirAsLines('/pl/compounds.txt');
    for (let line of lines) {
      if (line.length === 0 || line.charAt(0) === '#') continue;
      if (line.endsWith('+')) {
        line = line.substring(0, line.length - 1).split('-').join(' ');
        expect(spellRule.match(t.lt.getAnalyzedSentence(line)).length, `The entry: ${line} is not found in the spelling dictionary!`).toBe(0);
      } else if (line.endsWith('*')) {
        line = line.substring(0, line.length - 1);
        expect(spellRule.match(t.lt.getAnalyzedSentence(line)).length, `The entry: ${line} is not found in the spelling dictionary!`).toBe(0);
      } else {
        expect(spellRule.match(t.lt.getAnalyzedSentence(line)).length, `The entry: ${line} is not found in the spelling dictionary!`).toBe(0);
        const joined = line.split('-').join('');
        expect(spellRule.match(t.lt.getAnalyzedSentence(joined)).length, `The entry: ${joined} is not found in the spelling dictionary!`).toBe(0);
      }
    }
  }, 3600000);
});
