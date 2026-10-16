// Ported from GermanSynthesizerTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { GermanSynthesizer } from '../../../src/lang/de/synthesis/GermanSynthesizer.js';

describe('GermanSynthesizerTest', () => {
  const synthesizer = GermanSynthesizer.INSTANCE;
  const dummyToken = (tokenStr) => new AnalyzedToken(tokenStr, tokenStr, tokenStr);
  const arr = (a) => `[${a.join(', ')}]`; // Java: Arrays#toString(Object[])
  const synth = (word, posTag, regEx) => arr(regEx === undefined ? synthesizer.synthesize(dummyToken(word), posTag) : synthesizer.synthesize(dummyToken(word), posTag, regEx));

  // Java: GermanSynthesizerTest#testSynthesizeX() is @Ignore (interactive debugging only)
  it.skip('testSynthesizeX', () => {});

  // Java: GermanSynthesizerTest#testSynthesize()
  it('testSynthesize', () => {
    expect(synth('123', '_spell_number_')).toBe('[einhundertdreiundzwanzig]');
    expect(synth('Zug', 'SUB:DAT:SIN:MAS')).toBe('[Zug]');
    expect(synth('Tisch', 'SUB:DAT:SIN:MAS')).toBe('[Tisch]');
    expect(synth('Buschfeuer', 'SUB:GEN:SIN:NEU')).toBe('[Buschfeuers]');
    expect(synth('Äußerung', 'SUB:NOM:PLU:FEM')).toBe('[Äußerungen]');
    expect(synth('Äußerung', 'SUB:NOM:PLU:MAS')).toBe('[]');
    expect(synth('Haus', 'SUB:AKK:PLU:NEU')).toBe('[Häuser]');
    expect(synth('Diabetes-Zentrum', 'SUB:GEN:SIN.*', true)).toBe('[Diabetes-Zentrums]');
    expect(synth('Diabetes-Zentrum', 'SUB:GEN:PLU.*', true)).toBe('[Diabetes-Zentren]');
    expect(synth('Xxxxxx-Zentrum', 'SUB:GEN:PLU.*', true)).toBe('[Xxxxxx-Zentren]');
    expect(synth('Xxxxxx-zentrum', 'SUB:GEN:PLU.*', true)).toBe('[Xxxxxx-zentren]');
    expect(synth('gelb-grün', 'ADJ.*', true)).toBe('[]'); // should this also work?
    expect(synth('WLAN-LAN-Kabel', 'SUB:GEN:SIN.*', true)).toBe('[WLAN-LAN-Kabels]');
    expect(synth('Haus', '.*', true)).toBe('[Häuser, Haus, Häusern, Haus, Hause, Häuser, Hauses, Häuser, Haus]');
    expect(synthesizer.synthesize(new AnalyzedToken('fake', 'FAKE', null), 'FAKE', false).length).toBe(0); // could happen with soft hyphen in the input
  });

  // Java: GermanSynthesizerTest#testSynthesizeCompounds()
  it('testSynthesizeCompounds', () => {
    expect(synth('Regelsystem', 'SUB:NOM:PLU:NEU')).toBe('[Regelsysteme]');
    expect(synth('Regelsystem', 'SUB:DAT:PLU:NEU')).toBe('[Regelsystemen]');
    expect(synth('Regelsystem', '.*:PLU:.*', true)).toBe('[Regelsysteme, Regelsystemen]');
    expect(synth('Regel-System', '.*:PLU:.*', true)).toBe('[Regelsysteme, Regelsystemen]');
    expect(synth('Kühlschrankversuch', '.*:PLU:.*', true)).toBe('[Kühlschrankversuche, Kühlschrankversuchen]');
    expect(synth('Kühlschrank-Versuch', '.*:PLU:.*', true)).toBe('[Kühlschrankversuche, Kühlschrankversuchen]');
  });

  // Java: GermanSynthesizerTest#testMorfologikBug()
  it('testMorfologikBug', () => {
    // see https://github.com/languagetool-org/languagetool/issues/586
    expect(synth('anfragen', 'VER:1:PLU:KJ1:SFT:NEB')).toBe('[anfragen]');
  });

  // extra: the F22 subset used by GermanTagger#initExpansionInfos (prefix_verb lines in spelling.txt)
  it('synthesizeForPosTags', () => {
    const forms = synthesizer.synthesizeForPosTags('geben', (s) => s.startsWith('VER:'));
    expect(forms).toContain('gab');
    expect(forms).toContain('gegeben');
    expect(forms.every((f) => !f.startsWith('Geb'))).toBe(true); // lowercase lemma -> lowercase forms only
    expect(synthesizer.synthesizeForPosTags('xyzzy', () => true)).toEqual([]);
  });
});
