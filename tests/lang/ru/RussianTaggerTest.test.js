// Ported from RussianTaggerTest (ru module); plus tokenizer, yo and stress cases
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { RussianTagger } from '../../../src/lang/ru/tagging/RussianTagger.js';
import { RussianWordTokenizer } from '../../../src/lang/ru/tokenizers/RussianWordTokenizer.js';
import { WordTokenizer } from '../../../src/core/text/tokenizers/WordTokenizer.js';
import { myAssert, testDictionary } from '../../support/TestTools.js';

describe('RussianTaggerTest', () => {
  // Java: RussianTaggerTest#testDictionary
  it('testDictionary', () => {
    testDictionary(RussianTagger.INSTANCE);
  });

  // Java: RussianTaggerTest#testTagger
  it('testTagger', () => {
    const tokenizer = new WordTokenizer();
    const tagger = RussianTagger.INSTANCE;
    myAssert('Все счастливые семьи похожи друг на друга,  каждая  несчастливая  семья несчастлива по-своему.',
      'Все/[весь]ADJ:MPR:PL:Nom|Все/[весь]ADJ:MPR:PL:V|Все/[все]PNN:PL:Nom|Все/[все]PNN:PL:V|Все/[все]PNN:Sin:Nom|Все/[все]PNN:Sin:V -- счастливые/[счастливый]ADJ:Posit:PL:Nom|счастливые/[счастливый]ADJ:Posit:PL:V -- семьи/[семья]NN:Inanim:Fem:PL:Nom|семьи/[семья]NN:Inanim:Fem:PL:V|семьи/[семья]NN:Inanim:Fem:Sin:R -- похожи/[похожий]ADJ:Short:PL -- друг/[друг]NN:Anim:Masc:Sin:Nom -- на/[на]PREP -- друга/[друг]NN:Anim:Masc:Sin:R|друга/[друг]NN:Anim:Masc:Sin:V -- каждая/[каждый]ADJ:MPR:Fem:Nom -- несчастливая/[несчастливый]ADJ:Posit:Fem:Nom -- семья/[семья]NN:Inanim:Fem:Sin:Nom -- несчастлива/[несчастливый]ADJ:Short:Fem -- по-своему/[по-своему]ADV', tokenizer, tagger);
    myAssert('Все смешалось в доме Облонских.',
      'Все/[весь]ADJ:MPR:PL:Nom|Все/[весь]ADJ:MPR:PL:V|Все/[все]PNN:PL:Nom|Все/[все]PNN:PL:V|Все/[все]PNN:Sin:Nom|Все/[все]PNN:Sin:V -- смешалось/[смешаться]VB:Past:INTR:PFV:Neut -- в/[в]PREP -- доме/[дом]NN:Inanim:Masc:Sin:P -- Облонских/[null]null', tokenizer, tagger);
    myAssert('Абдуллаевы', 'Абдуллаевы/[абдуллаев]NN:Fam:PL:Nom', tokenizer, tagger);
    myAssert('блукать', 'блукать/[блукать]VB:INF:', tokenizer, tagger);
  });

  it('strips stress marks and flags a word that may miss yo', () => {
    const tagger = RussianTagger.INSTANCE;
    const stressed = tagger.tag(['доме́'])[0];
    expect(stressed.getToken()).toBe('доме'); // stress mark stripped before lookup
    expect(stressed.getChunkTags().length).toBe(0);
    const yo = tagger.tag(['ежик'])[0];
    expect(yo.getChunkTags().map((t) => t.getChunkTag())).toEqual(['MayMissingYO']);
  });
});

describe('RussianWordTokenizer', () => {
  const t = new RussianWordTokenizer();
  it('keeps б/у and б/н together and splits dots and apostrophes', () => {
    expect(t.tokenize('машина б/у и б/н')).toEqual(['машина', ' ', 'б/у', ' ', 'и', ' ', 'б/н']);
    expect(t.tokenize('а . б')).toEqual(['а', ' ', '.', ' ', 'б']);
    expect(t.tokenize('а .. б')).toEqual(['а', ' ', '.', '.', ' ', 'б']);
    expect(t.tokenize('а .б')).toEqual(['а', ' ', '.б']); // placeholder keeps the dot glued (Java behaviour)
    expect(t.tokenize("д'Артаньян")).toEqual(['д', "'", 'Артаньян']);
  });
});
