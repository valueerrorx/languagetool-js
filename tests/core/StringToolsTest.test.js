// Ported from StringToolsTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import * as ST from '../../src/core/text/StringTools.js';
import { StringReader } from '../../src/lib/java/io.js';
import { assertThrowsJava } from '../support/javaAssert.js';

const fake = (code) => ({ getShortCode: () => code });
const NPE = 'java.lang.NullPointerException';

describe('StringToolsTest', () => {
  // Java: StringToolsTest#testAssureSet
  it('testAssureSet', () => {
    assertThrowsJava(() => ST.assureSet('', 'varName'), 'java.lang.IllegalArgumentException');
    assertThrowsJava(() => ST.assureSet(' \t', 'varName'), 'java.lang.IllegalArgumentException');
    assertThrowsJava(() => ST.assureSet(null, 'varName'), NPE);
    ST.assureSet('foo', 'varName');
  });

  // Java: StringToolsTest#testToId
  it('testToId', () => {
    expect('ß'.toUpperCase()).toBe('SS');
    expect(ST.toId(" Bl'a (übel öäßÖ ", fake('de'))).toBe('BL_Q_A__UEBEL_OEAESSOE');
    expect(ST.toId('üß çãÔ-où Ñ', fake('pt'))).toBe('ÜSS_ÇÃÔ_OÙ_Ñ');
    expect(ST.toId('fooóéÉ', fake('de'))).toBe('FOOÓÉÉ');
  });

  // Java: StringToolsTest#testReadStream
  it('testReadStream', () => {
    const content = ST.readStream(Buffer.from('one\ntwo\nöäüß\nșțîâăȘȚÎÂĂ\n', 'utf8'), 'utf-8');
    expect(content).toBe('one\ntwo\nöäüß\nșțîâăȘȚÎÂĂ\n');
  });

  // Java: StringToolsTest#testIsAllUppercase
  it('testIsAllUppercase', () => {
    for (const s of ['A', 'ABC', 'ASV-EDR', 'ASV-ÖÄÜ', '']) expect(ST.isAllUppercase(s)).toBe(true);
    for (const s of ['ß', 'AAAAAAAAAAAAq', 'a', 'abc']) expect(ST.isAllUppercase(s)).toBe(false);
  });

  // Java: StringToolsTest#testIsMixedCase
  it('testIsMixedCase', () => {
    for (const s of ['AbC', 'MixedCase', 'iPod', 'AbCdE']) expect(ST.isMixedCase(s)).toBe(true);
    for (const s of ['', 'ABC', 'abc', '!', 'Word']) expect(ST.isMixedCase(s)).toBe(false);
  });

  // Java: StringToolsTest#testIsCapitalizedWord
  it('testIsCapitalizedWord', () => {
    for (const s of ['Abc', 'Uppercase', 'Ipod']) expect(ST.isCapitalizedWord(s)).toBe(true);
    for (const s of ['', 'ABC', 'abc', '!', 'wOrD']) expect(ST.isCapitalizedWord(s)).toBe(false);
  });

  // Java: StringToolsTest#testStartsWithUppercase
  it('testStartsWithUppercase', () => {
    expect(ST.startsWithUppercase('A')).toBe(true);
    expect(ST.startsWithUppercase('ÄÖ')).toBe(true);
    expect(ST.startsWithUppercase('')).toBe(false);
    expect(ST.startsWithUppercase('ß')).toBe(false);
    expect(ST.startsWithUppercase('-')).toBe(false);
  });

  // Java: StringToolsTest#testUppercaseFirstChar
  it('testUppercaseFirstChar', () => {
    expect(ST.uppercaseFirstChar(null)).toBe(null);
    expect(ST.uppercaseFirstChar('')).toBe('');
    expect(ST.uppercaseFirstChar('A')).toBe('A');
    expect(ST.uppercaseFirstChar('öäü')).toBe('Öäü');
    expect(ST.uppercaseFirstChar('ßa')).toBe('ßa');
    expect(ST.uppercaseFirstChar("'test'")).toBe("'Test'");
    expect(ST.uppercaseFirstChar("''test")).toBe("''Test");
    expect(ST.uppercaseFirstChar("''t")).toBe("''T");
    expect(ST.uppercaseFirstChar("'''")).toBe("'''");
  });

  // Java: StringToolsTest#testLowercaseFirstChar
  it('testLowercaseFirstChar', () => {
    expect(ST.lowercaseFirstChar(null)).toBe(null);
    expect(ST.lowercaseFirstChar('')).toBe('');
    expect(ST.lowercaseFirstChar('A')).toBe('a');
    expect(ST.lowercaseFirstChar('Öäü')).toBe('öäü');
    expect(ST.lowercaseFirstChar('ßa')).toBe('ßa');
    expect(ST.lowercaseFirstChar("'Test'")).toBe("'test'");
    expect(ST.lowercaseFirstChar("''Test")).toBe("''test");
    expect(ST.lowercaseFirstChar("''T")).toBe("''t");
    expect(ST.lowercaseFirstChar("'''")).toBe("'''");
  });

  // Java: StringToolsTest#testReaderToString
  it('testReaderToString', () => {
    expect(ST.readerToString(new StringReader('bla\nöäü'))).toBe('bla\nöäü');
    const longStr = `${'x'.repeat(4000)}1234567`;
    expect(longStr.length).toBe(4007);
    expect(ST.readerToString(new StringReader(longStr))).toBe(longStr);
  });

  // Java: StringToolsTest#testContainsLineBreak
  it('testContainsLineBreak', () => {
    for (const s of ['', 'foo bar', 'foo\tbar']) expect(ST.containsLineBreak(s)).toBe(false);
    for (const s of ['foo\nbar', 'foo\rbar', 'foo\r\nbar', 'foo\fbar', 'foo\u000Bbar', 'foo\u0085bar', 'foo bar', 'foo bar']) expect(ST.containsLineBreak(s)).toBe(true);
  });

  // Java: StringToolsTest#testIsAllWhitespace
  it('testIsAllWhitespace', () => {
    for (const s of ['', '   ', '  \t']) expect(ST.isAllWhitespace(s)).toBe(true);
    for (const s of [' foo ', 'foo']) expect(ST.isAllWhitespace(s)).toBe(false);
  });

  // Java: StringToolsTest#testEscapeXMLandHTML
  it('testEscapeXMLandHTML', () => {
    expect(ST.escapeXML('foo bar')).toBe('foo bar');
    expect(ST.escapeXML('!ä"<>&&')).toBe('!ä&quot;&lt;&gt;&amp;&amp;');
    expect(ST.escapeHTML('!ä"<>&&')).toBe('!ä&quot;&lt;&gt;&amp;&amp;');
  });

  // Java: StringToolsTest#testListToString
  it('testListToString', () => {
    const list = ['foo', 'bar', ','];
    expect(list.join(',')).toBe('foo,bar,,');
    expect(list.join('\t')).toBe('foo\tbar\t,');
  });

  // Java: StringToolsTest#testTrimWhitespace
  it('testTrimWhitespace', () => {
    assertThrowsJava(() => ST.trimWhitespace(null), NPE);
    expect(ST.trimWhitespace('')).toBe('');
    expect(ST.trimWhitespace(' ')).toBe('');
    expect(ST.trimWhitespace(' \nXX\t Y')).toBe('XXY');
    expect(ST.trimWhitespace(' \r\nXX\t Y')).toBe('XXY');
    expect(ST.trimWhitespace('word')).toBe('word');
    // only one space in the middle of the word is significant:
    expect(ST.trimWhitespace('1 234,56')).toBe('1 234,56');
    expect(ST.trimWhitespace('1  234,56')).toBe('1234,56');
  });

  // Java: StringToolsTest#testAddSpace
  it('testAddSpace', () => {
    const demoLanguage = fake('xx');
    expect(ST.addSpace('word', demoLanguage)).toBe(' ');
    expect(ST.addSpace(',', demoLanguage)).toBe('');
    expect(ST.addSpace('.', fake('fr'))).toBe('');
    expect(ST.addSpace('.', fake('de'))).toBe('');
    expect(ST.addSpace('!', fake('fr'))).toBe(' ');
    expect(ST.addSpace('!', fake('de'))).toBe('');
  });

  // Java: StringToolsTest#testIsWhitespace
  it('testIsWhitespace', () => {
    for (const s of ['﻿', '  ', '\t', ' ', ' ', ' ']) expect(ST.isWhitespace(s)).toBe(true);
    for (const s of ['abc', '\\u02', '\u0001']) expect(ST.isWhitespace(s)).toBe(false);
  });

  // Java: StringToolsTest#testIsPositiveNumber
  it('testIsPositiveNumber', () => {
    expect(ST.isPositiveNumber('3'.charCodeAt(0))).toBe(true);
    expect(ST.isPositiveNumber('a'.charCodeAt(0))).toBe(false);
  });

  // Java: StringToolsTest#testIsEmpty
  it('testIsEmpty', () => {
    expect(ST.isEmpty('')).toBe(true);
    expect(ST.isEmpty(null)).toBe(true);
    expect(ST.isEmpty('a')).toBe(false);
  });

  // Java: StringToolsTest#testFilterXML
  it('testFilterXML', () => {
    expect(ST.filterXML('test')).toBe('test');
    expect(ST.filterXML('<<test>>')).toBe('<<test>>');
    expect(ST.filterXML('<b>test</b>')).toBe('test');
    expect(ST.filterXML('A sentence with a <em>test</em>')).toBe('A sentence with a test');
  });

  // Java: StringToolsTest#testAsString
  it('testAsString', () => {
    expect(ST.asString(null)).toBe(null);
  });

  // Java: StringToolsTest#testIsCamelCase
  it('testIsCamelCase', () => {
    expect(ST.isCamelCase('abc')).toBe(false);
    expect(ST.isCamelCase('ABC')).toBe(false);
    for (const s of ['iSomething', 'iSomeThing', 'mRNA', 'microRNA', 'microSomething', 'iSomeTHING']) expect(ST.isCamelCase(s)).toBe(true);
  });

  // Java: StringToolsTest#testStringForSpeller
  it('testStringForSpeller', () => {
    const arabicChars = 'ً ٌ ٍ َ ُ ِ ّ ْ ٰ';
    expect(ST.stringForSpeller(arabicChars)).toBe(arabicChars);
    const russianChars = 'а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я';
    expect(ST.stringForSpeller(russianChars)).toBe(russianChars);
    expect(ST.stringForSpeller('🧡 Prueva')).toBe('   Prueva');
    expect(ST.stringForSpeller('🧡🚴🏽♂️ Prueva')).toBe('         Prueva');
  });

  // Java: StringToolsTest#testTitlecaseGlobal
  it('testTitlecaseGlobal', () => {
    expect(ST.titlecaseGlobal('the lord of the rings')).toBe('The Lord of the Rings');
    expect(ST.titlecaseGlobal('rhythm And blues')).toBe('Rhythm and Blues');
    expect(ST.titlecaseGlobal('memória de leitura')).toBe('Memória de Leitura');
    expect(ST.titlecaseGlobal('fond du lac')).toBe('Fond du Lac');
    expect(ST.titlecaseGlobal('el niño de Las islas')).toBe('El Niño de las Islas');
  });

  // Java: StringToolsTest#testAllStartWithLowercase
  it('testAllStartWithLowercase', () => {
    expect(ST.allStartWithLowercase('the lord of the rings')).toBe(true);
    expect(ST.allStartWithLowercase('the Fellowship of the Ring')).toBe(false);
    expect(ST.allStartWithLowercase('bilbo')).toBe(true);
    expect(ST.allStartWithLowercase('Baggins')).toBe(false);
  });
});
