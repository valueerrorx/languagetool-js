// Ported from CommonWordsTest (languagetool-standalone); es/pt/ca are detection descriptors (DEV-008).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { CommonWordsDetector } from '../../../../src/core/language/identifier/detector/CommonWordsDetector.js';
import { getLanguageForShortCode } from '../../../../src/core/language/identifier/DetectionLanguages.js';

// Java: Map#get on the result (absent key -> null)
const get = (m, l) => m.get(l) ?? null;

describe('CommonWordsTest', () => {
  // Java: CommonWordsTest#test
  it('test', () => {
    const de = getLanguageForShortCode('de');
    const en = getLanguageForShortCode('en');
    const es = getLanguageForShortCode('es');
    const pt = getLanguageForShortCode('pt');
    const ca = getLanguageForShortCode('ca');
    const cw = new CommonWordsDetector();

    const res1 = cw.getKnownWordsPerLanguage('Das ist bequem');
    expect(get(res1, en)).toBeNull();
    expect(get(res1, de)).toBe(2);

    const res2 = cw.getKnownWordsPerLanguage('Das ist bequem ');
    expect(get(res2, en)).toBeNull();
    expect(get(res2, de)).toBe(3);

    const res3 = cw.getKnownWordsPerLanguage('bequem');
    expect(get(res3, en)).toBeNull();
    expect(get(res3, de)).toBe(1);

    const res4 = cw.getKnownWordsPerLanguage('this is a test');
    expect(get(res4, en)).toBe(3);

    const res5 = cw.getKnownWordsPerLanguage('Ideábamos una declaracion con el.');
    expect(get(res5, es)).toBe(5);

    const res6 = cw.getKnownWordsPerLanguage('Ideábamos una declaracion con el; desassigna mencions.');
    expect(get(res6, es)).toBe(3);

    const res7 = cw.getKnownWordsPerLanguage("Estagiário de desenvolvedor 'web' ou relacionados a programador.");
    expect(get(res7, es)).toBe(3);
    expect(get(res7, pt)).toBe(4);
    expect(get(res7, ca)).toBe(2);

    const res8 = cw.getKnownWordsPerLanguage('Autohaus-Wirklichkeit'); // "Wirklichkeit" is in common_words.txt
    expect(get(res8, en)).toBeNull();
    expect(get(res8, de)).toBe(1);

    const res9 = cw.getKnownWordsPerLanguage('Costum de certes cultures que imposa a un pare l’adopció d’un comportament idèntic al de la mare en el període anterior o posterior al part');
    expect(get(res9, ca)).toBe(20);
    expect(get(res9, es)).toBe(10);
  });
});
