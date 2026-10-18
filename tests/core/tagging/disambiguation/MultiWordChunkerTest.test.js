// Ported from MultiWordChunkerTest (languagetool-core)
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import '../../../../src/lang/register.js';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { getDataBroker } from '../../../../src/core/resources/LtStatics.js';
import { MultiWordChunker } from '../../../../src/core/tagging/disambiguation/MultiWordChunker.js';
import { MultiWordChunker2 } from '../../../../src/core/tagging/disambiguation/MultiWordChunker2.js';
import { DemoTagger } from '../../../../src/core/tagging/xx/DemoTagger.js';
import { FakeLanguage } from '../../../support/FakeLanguage.js';

const MULTIWORDS = 'ah this\tfake\nah for shame\tadv\nnot for this either\tfake\n';

// Java: MultiWordChunkerTest anonymous FakeLanguage with DemoTagger adding FakePosTag
class TestLanguage extends FakeLanguage {
  // Java: FakeLanguage#createDefaultTagger()
  createDefaultTagger() {
    const tagger = new DemoTagger();
    const orig = tagger.tag.bind(tagger);
    tagger.tag = (sentenceTokens) => {
      const tokenReadings = orig(sentenceTokens);
      for (const readings of tokenReadings) {
        if (readings.isWhitespace()) continue;
        readings.addReading(new AnalyzedToken(readings.getToken(), 'FakePosTag', readings.getToken()), '');
      }
      return tokenReadings;
    };
    return tagger;
  }
}

describe('MultiWordChunkerTest', () => {
  let spy;
  const lt = new JLanguageTool(new TestLanguage());
  beforeAll(() => {
    const broker = getDataBroker();
    const orig = broker.getFromResourceDirAsStream.bind(broker);
    spy = vi.spyOn(broker, 'getFromResourceDirAsStream').mockImplementation((p) => (p === '/yy/multiwords.txt' ? Buffer.from(MULTIWORDS, 'utf8') : orig(p)));
  });
  afterAll(() => spy.mockRestore());

  const str = (t) => t.getReadings().map((r) => r.toString()).join(', ');

  // Java: MultiWordChunkerTest#testDisambiguate1
  it('testDisambiguate1', () => {
    const multiWordChunker = MultiWordChunker.getInstance('/yy/multiwords.txt', true, true, true);
    const analyzedSentence = lt.getAnalyzedSentence('ah for shame');
    const tokens = multiWordChunker.disambiguate(analyzedSentence).getTokens();
    expect(str(tokens[1])).toContain('<adv>');
    expect(str(tokens[3])).not.toContain('adv');
    expect(str(tokens[5])).toContain('</adv>');
    expect(str(tokens[1])).toContain('FakePosTag');
    expect(str(tokens[3])).toContain('FakePosTag');
    expect(str(tokens[5])).toContain('FakePosTag');
  });

  // Java: MultiWordChunkerTest#testDisambiguate2
  it('testDisambiguate2', () => {
    const multiWordChunker = new MultiWordChunker2('/yy/multiwords.txt', true);
    const analyzedSentence = lt.getAnalyzedSentence('Ah for shame');
    const tokens = multiWordChunker.disambiguate(analyzedSentence).getTokens();
    expect(str(tokens[1])).toContain('<adv>');
    expect(str(tokens[3])).toContain('<adv>');
    expect(str(tokens[5])).toContain('<adv>');
    expect(str(tokens[1])).toContain('FakePosTag');
    expect(str(tokens[3])).toContain('FakePosTag');
    expect(str(tokens[5])).toContain('FakePosTag');
  });

  // Java: MultiWordChunkerTest#testDisambiguate2NoMatch
  it('testDisambiguate2NoMatch', () => {
    const multiWordChunker = new MultiWordChunker2('/yy/multiwords.txt', true);
    const analyzedSentence = lt.getAnalyzedSentence('ahh for shame');
    const tokens = multiWordChunker.disambiguate(analyzedSentence).getTokens();
    expect(str(tokens[1])).not.toContain('<adv>');
  });

  // Java: MultiWordChunkerTest#testDisambiguate2RemoveOtherReadings
  it('testDisambiguate2RemoveOtherReadings', () => {
    const multiWordChunker = new MultiWordChunker2('/yy/multiwords.txt', true);
    multiWordChunker.setRemoveOtherReadings(true);
    multiWordChunker.setWrapTag(false);
    const analyzedSentence = lt.getAnalyzedSentence('ah for shame');
    const tokens = multiWordChunker.disambiguate(analyzedSentence).getTokens();
    expect(str(tokens[1])).toContain('adv');
    expect(str(tokens[3])).toContain('adv');
    expect(str(tokens[5])).toContain('adv');
    expect(str(tokens[1])).not.toContain('FakePosTag');
    expect(str(tokens[3])).not.toContain('FakePosTag');
    expect(str(tokens[5])).not.toContain('FakePosTag');
  });

  // Java: MultiWordChunkerTest#testLettercaseVariants
  it('testLettercaseVariants', () => {
    const multiWordChunker = MultiWordChunker.getInstance('/yy/multiwords.txt', true, true, true);
    const map = new Map();
    map.set('rhythm and blues', new AnalyzedToken('rhythm and blues', 'NCMS000_', 'rhythm and blues'));
    map.set('Vênus de Milo', new AnalyzedToken('Vênus de Milo', 'NCFSS00_', 'Vênus de Milo'));
    const tokenVariantsRnB = multiWordChunker.getTokenLettercaseVariants('rhythm and blues', map);
    expect(tokenVariantsRnB).toContain('Rhythm and blues'); // simple upcase of first word
    expect(tokenVariantsRnB).toContain('Rhythm And Blues'); // naive titlecase
    expect(tokenVariantsRnB).toContain('Rhythm and Blues'); // smarter titlecase
    expect(tokenVariantsRnB).toContain('RHYTHM AND BLUES'); // all caps
    const tokenVariantsVenus = multiWordChunker.getTokenLettercaseVariants('Vênus de Milo', map);
    expect(tokenVariantsVenus).not.toContain('Vênus De Milo'); // naive titlecase
    expect(tokenVariantsVenus).not.toContain('vênus de milo'); // downcased
    expect(tokenVariantsVenus).toContain('VÊNUS DE MILO'); // all caps
  });
});
