// Ported from FrenchRuleDisambiguatorTest (languagetool-language-modules/fr)
import { describe, it, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { French } from '../../../../src/lang/fr/language/French.js';
import { FrenchTagger } from '../../../../src/lang/fr/tagging/FrenchTagger.js';
import { FrenchHybridDisambiguator } from '../../../../src/lang/fr/tagging/FrenchHybridDisambiguator.js';
import { FrenchWordTokenizer } from '../../../../src/lang/fr/tokenizers/FrenchWordTokenizer.js';
import { SRXSentenceTokenizer } from '../../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { DemoDisambiguator } from '../../../../src/core/tagging/disambiguation/xx/DemoDisambiguator.js';
import { myAssertDisambiguated as myAssert } from '../../../support/TestTools.js';

describe('FrenchRuleDisambiguatorTest', () => {
  let tagger;
  let tokenizer;
  let sentenceTokenizer;
  let disambiguator;
  let disamb2;

  // Java: FrenchRuleDisambiguatorTest#setUp()
  beforeEach(() => {
    tagger = FrenchTagger.INSTANCE;
    tokenizer = new FrenchWordTokenizer();
    const language = French.getInstance();
    sentenceTokenizer = new SRXSentenceTokenizer(language);
    disambiguator = new FrenchHybridDisambiguator();
    disamb2 = new DemoDisambiguator();
  });

  // Java: FrenchRuleDisambiguatorTest#testChunker()
  it('testChunker', () => {
    myAssert('Il a enfin publié son livre.',
      '/[null]SENT_START Il/[il]R pers suj 3 m s  /[null]null a/[avoir]V avoir ind pres 3 s  /[null]null enfin/[enfin]A  /[null]null publié/[publier]V ppa m s  /[null]null son/[son]D e s  /[null]null livre/[livre]N e s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('Je danse toutes les semaines au club.',
      '/[null]SENT_START Je/[je]R pers suj 1 s  /[null]null danse/[danser]V ind pres 1 s|danse/[danser]V sub pres 1 s  /[null]null toutes/[tout]D f p  /[null]null les/[le]D e p|les/[les]_GN_FP  /[null]null semaines/[semaine]N f p|semaines/[semaines]_GN_FP  /[null]null au/[à+le]P+D m s  /[null]null club/[club]N m s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('Je danse toutes les semaines au club.',
      '/[null]SENT_START Je/[je]R pers suj 1 s  /[null]null danse/[danse]N f s|danse/[danser]V imp pres 2 s|danse/[danser]V ind pres 1 s|danse/[danser]V ind pres 3 s|danse/[danser]V sub pres 1 s|danse/[danser]V sub pres 3 s  /[null]null toutes/[tout]A|toutes/[tout]D f p|toutes/[tout]R f p  /[null]null les/[le]D e p|les/[les]R pers obj 3 e p  /[null]null semaines/[semaine]N f p  /[null]null au/[à+le]P+D m s  /[null]null club/[club]N m s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('Quand j\'étais petit, je jouais au football.',
      '/[null]SENT_START Quand/[quand]A inte|Quand/[quand]C sub  /[null]null j\'/[je]R pers suj 1 s étais/[être]V etre ind impa 1 s  /[null]null petit/[petit]J m s ,/[null]null  /[null]null je/[je]R pers suj 1 s  /[null]null jouais/[jouer]V ind impa 1 s  /[null]null au/[à+le]P+D m s  /[null]null football/[football]N m s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('Quand j\'étais petit, je jouais au football.',
      '/[null]SENT_START Quand/[quand]A inte|Quand/[quand]C sub  /[null]null j\'/[je]R pers suj 1 s étais/[étai]N m p|étais/[être]V etre ind impa 1 s|étais/[être]V etre ind impa 2 s  /[null]null petit/[petit]J m s|petit/[petit]N m s ,/[null]null  /[null]null je/[je]R pers suj 1 s  /[null]null jouais/[jouer]V ind impa 1 s|jouais/[jouer]V ind impa 2 s  /[null]null au/[à+le]P+D m s  /[null]null football/[football]N m s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('Je suis petite.',
      '/[null]SENT_START Je/[je]R pers suj 1 s  /[null]null suis/[être]V etre ind pres 1 s  /[null]null petite/[petit]J f s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('Je suis petite.',
      '/[null]SENT_START Je/[je]R pers suj 1 s  /[null]null suis/[suivre]V imp pres 2 s|suis/[suivre]V ind pres 1 s|suis/[suivre]V ind pres 2 s|suis/[être]V etre ind pres 1 s  /[null]null petite/[petit]J f s|petite/[petit]N f s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('sous-corps.',
      '/[null]SENT_START sous-corps/[sous-corps]N m sp ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('Je suis d\'abord allé au laboratoire.',
      '/[null]SENT_START Je/[je]R pers suj 1 s  /[null]null suis/[être]V etre ind pres 1 s  /[null]null d\'/[d\'abord]A abord/[d\'abord]A  /[null]null allé/[aller]V ppa m s  /[null]null au/[à+le]P+D m s  /[null]null laboratoire/[laboratoire]N m s ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
  }, 60000);
});
