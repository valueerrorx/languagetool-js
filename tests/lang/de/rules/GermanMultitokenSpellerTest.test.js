// Ported from JLanguageToolTest#testMultitokenSpeller (de module); SpellingCheckRuleTest (de) is SpellingCheckRuleTest.test.js
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';

const ls = (l) => `[${l.join(', ')}]`; // Java: List#toString()

describe('GermanMultitokenSpellerTest', () => {
  // Java: JLanguageToolTest#testMultitokenSpeller
  it('testMultitokenSpeller', () => {
    const lang = Languages.getLanguageForShortCode('de-DE'); // Java: GermanyGerman.getInstance()
    const s = (w) => ls(lang.getMultitokenSpeller().getSuggestions(w));
    expect(s('KarlHeinz Rummenigge')).toEqual('[Karl-Heinz Rummenigge]');
    expect(s('Leonardo Di-Caprio')).toEqual('[Leonardo DiCaprio]');
    expect(s('Marshall Mc-Luhan')).toEqual('[Marshall McLuhan]');
    expect(s('Jochen Striebeck')).toEqual('[]');
    expect(s('Ricardo Simoneti')).toEqual('[Ricardo Simonetti]');
    expect(s('Clint Eastwoods')).toEqual('[]');
    expect(s('otto dvd')).toEqual('[]');
    expect(s('one place')).toEqual('[]');
    expect(s('Yuval Noha Harari')).toEqual('[Yuval Noah Harari]');
    expect(s('Homos Sapiens')).toEqual('[Homo sapiens]');
    expect(s('à la carte')).toEqual('[]');
    expect(s('a la carte')).toEqual('[à la carte]');
    expect(s('dierser Straße')).toEqual('[]');
    expect(s('Tum Universität')).toEqual('[]');
    expect(s('fuer Trump')).toEqual('[]');
  });
});
