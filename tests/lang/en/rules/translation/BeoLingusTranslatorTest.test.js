// Ported from BeoLingusTranslatorTest (standalone module)
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../../../src/lang/register.js';
import { GlobalConfig } from '../../../../../src/core/rules/model/GlobalConfig.js';
import { File } from '../../../../../src/lib/java/io/File.js';
import { BeoLingusTranslator } from '../../../../../src/lang/en/rules/translation/BeoLingusTranslator.js';
import { abstractCollectionToString } from '../../../../../src/lib/java/toString.js';

const s = (l) => abstractCollectionToString(l);

describe('BeoLingusTranslatorTest', () => {
  let translator;

  // Java: BeoLingusTranslatorTest#init
  beforeAll(() => {
    const globalConfig = new GlobalConfig();
    globalConfig.setBeolingusFile(new File('tests/resources/beolingus_test.txt'));
    translator = BeoLingusTranslator.getInstance(globalConfig);
  });

  // Java: BeoLingusTranslatorTest#testTranslateInflectedForm
  it('testTranslateInflectedForm', () => {
    const result1 = translator.translate('Luftpumpen', 'de', 'en');
    expect(result1.length).toBe(1);
    expect(result1[0].getL2()).toContain('tyre pumps [Br.]');
    expect(result1[0].getL2()).toContain('tire pumps [Am.]');
    expect(result1[0].getL2()).toContain('tyre inflators [Br.]');
    expect(result1[0].getL2()).toContain('tire inflators [Am.]');
  });

  // Java: BeoLingusTranslatorTest#testTranslate
  it('testTranslate', () => {
    const result1 = translator.translate('Haus', 'de', 'en');
    expect(result1.length).toBe(3);
    expect(result1[0].getL2()).toContain('house');
    expect(result1[1].getL2()).toContain('home');
    expect(result1[2].getL2()).toContain('volta bracket (sheet music)');

    const result2 = translator.translate('haus', 'de', 'en');
    expect(result2.length).toBe(3);
    expect(result2[0].getL2()).toContain('house');
    expect(result2[1].getL2()).toContain('home');
    expect(result2[2].getL2()).toContain('volta bracket (sheet music)');

    const result4 = translator.translate('suchwort', 'de', 'en');
    expect(result4.length).toBe(1);
    expect(result4[0].getL2()).toContain('search word {one; to}');
    expect(result4[0].getL2()).toContain('another item');
  });

  // Java: BeoLingusTranslatorTest#testSplit
  it('testSplit', () => {
    expect(s(translator.split('foo'))).toBe('[foo]');
    expect(s(translator.split('foo { bar } foo'))).toBe('[foo { bar } foo]');
    expect(s(translator.split('foo { bar }; foo'))).toBe('[foo { bar }, foo]');
    expect(s(translator.split('foo; bar; foo'))).toBe('[foo, bar, foo]');
    expect(s(translator.split('foo; bar { blah }; foo'))).toBe('[foo, bar { blah }, foo]');
    expect(s(translator.split('foo; bar { blah; blubb }; foo'))).toBe('[foo, bar { blah; blubb }, foo]');
    expect(s(translator.split('foo; bar { blah; blubb; three four }; foo'))).toBe('[foo, bar { blah; blubb; three four }, foo]');
  });

  // Java: BeoLingusTranslatorTest#testAmericanBritishVariants
  it('testAmericanBritishVariants', () => {
    const result1 = translator.translate('Luftpumpe', 'de', 'en');
    expect(result1.length).toBe(1);
    expect(result1[0].getL2()).toContain('tyre pump [Br.]');
    expect(result1[0].getL2()).toContain('tire pump [Am.]');
    expect(result1[0].getL2()).toContain('tyre inflator [Br.]');
    expect(result1[0].getL2()).toContain('tire inflator [Am.]');

    const result2 = translator.translate('Testluftpumpe', 'de', 'en');
    expect(result2.length).toBe(1);
    expect(result2[0].getL2()).toContain('tyre pump [Br.]');
    expect(result2[0].getL2()).toContain('tire pump [Am.]');

    const result3 = translator.translate('Reifen wechseln', 'de', 'en');
    expect(result3.length).toBe(1);
    expect(result3[0].getL2()).toContain('to change the tyres [Br.]');
    expect(result3[0].getL2()).toContain('to change the tires [Am.]');
  });

  // Java: BeoLingusTranslatorTest#testCleanTranslationForReplace
  it('testCleanTranslationForReplace', () => {
    expect(translator.cleanTranslationForReplace('', null)).toBe('');
    expect(translator.cleanTranslationForReplace('to go', null)).toBe('go');
    expect(translator.cleanTranslationForReplace('to go', 'need')).toBe('to go');
    expect(translator.cleanTranslationForReplace('to go', 'will')).toBe('go');
    expect(translator.cleanTranslationForReplace('to go', 'foo')).toBe('go');
    expect(translator.cleanTranslationForReplace('to go', 'to')).toBe('go');
    expect(translator.cleanTranslationForReplace('foo (bar) {mus}', null)).toBe('foo');
    expect(translator.cleanTranslationForReplace('some thing [Br.], something', null)).toBe('some thing , something'); // not quite clean yet...
    expect(translator.cleanTranslationForReplace('Friday /Fri/', null)).toBe('Friday');
    expect(translator.cleanTranslationForReplace('demise [poet.] <death>', null)).toBe('demise');
  });

  // Java: BeoLingusTranslatorTest#testGetTranslationSuffix
  it('testGetTranslationSuffix', () => {
    expect(translator.getTranslationSuffix('')).toBe('');
    expect(translator.getTranslationSuffix(' ')).toBe('');
    expect(translator.getTranslationSuffix('foo bar')).toBe('');
    expect(translator.getTranslationSuffix('foo bar [Br.]')).toBe('[Br.]');
    expect(translator.getTranslationSuffix('foo bar {ugs} [Br.]')).toBe('{ugs} [Br.]');
    expect(translator.getTranslationSuffix('foo bar {ugs} [Br.] (Blah)')).toBe('{ugs} [Br.] (Blah)');
    expect(translator.getTranslationSuffix('foo bar <blah>')).toBe('<blah>');
  });
});
