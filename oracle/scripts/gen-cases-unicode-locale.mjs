// Authors oracle/cases/X-UNICODE/*.json and oracle/cases/X-LOCALE/*.json (inputs only).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function write(id, name, description, ops) {
  const dir = path.join(ROOT, 'oracle/cases', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
}

const U = (args) => ({ op: 'unicode-dump', args });
write('X-UNICODE', 'props', 'All code points 0..10FFFF: Character.getType, predicates bitmask, numeric value, digit(10/16/36), directionality, UnicodeScript, UnicodeBlock (RLE)', [U({ part: 'props' })]);
write('X-UNICODE', 'case-simple', 'Character.toUpperCase/toLowerCase/toTitleCase(int) exceptions for all code points', [U({ part: 'case' })]);
write('X-UNICODE', 'case-string', 'String.toUpperCase/toLowerCase of every 1-char string: ROOT, then diffs for en tr az lt de fr el', [U({ part: 'strcase' })]);

const locales = ['ROOT', 'en', 'en_US', 'tr', 'az', 'lt', 'de', 'fr', 'el', 'new:en-US', 'nl', 'es'];
const strings = [
  'ΑΣ', 'ΑΣΑ', 'ΑΣ ', 'Σ', 'ΑΣ.', 'Α.Σ', 'ΑΣ́', 'ΑΣ­', 'Σͅ', 'ΑΣΣ', 'ΑΣΑΣ', 'ΟΔΟΣ ΟΔΟΣ', 'ΑΣ’', "AΣ'", 'ΑΣ1', '1Σ', 'ΑΣ‍', '𝐀Σ', 'ΑΣ𝐀',
  'I', 'i', 'İ', 'ı', 'İ', 'i̇', 'İI', 'iI', 'ıi', 'Ì̇', 'İ̀', 'Ị̇', 'IȦ', 'TITLE', 'title', 'Istanbul', 'ISTANBUL', 'İSTANBUL', 'istanbul', 'iğdır', 'IĞDIR', 'DIYARBAKIR', 'diyarbakır',
  'J̇', 'j̇', 'Į̇', 'į̇', 'Į̇', 'Ì', 'Í', 'Ĩ', 'ì', 'í', 'ĩ', 'ǰ', 'J̌', 'J̌', 'ŉ', 'ʼN',
  'ß', 'ẞ', 'SS', 'ss', 'straße', 'STRASSE', 'STRAẞE', 'ﬁ', 'ﬂ', 'ﬃ', 'ﬆ', 'ﬅ', 'ǅ', 'ǆ', 'Ǆ', 'ǈ', 'ǋ', 'ǲ', 'ΐ', 'ΰ', 'ᾳ', 'ᾼ', 'ᾈ', 'ᾀ', 'ᾷ', 'ῇ', 'ῷ', 'ᾲ', 'ῂ', 'ῲ', 'ὐ', 'ὒ', 'ἀ', 'ΐ', 'ﬓ', 'ﬗ', 'և',
  'ä', 'Ä', 'ö', 'ü', 'Ü', 'é', 'É', 'è', 'ç', 'Ç', 'œ', 'Œ', 'æ', 'Æ', 'ø', 'Ø', 'å', 'Å', 'ñ', 'Ñ', 'ÿ', 'Ÿ', 'µ', 'ſ', 'K', 'Å', 'Ω', 'ǀ', 'ϐ', 'ϑ', 'ϕ', 'ϖ', 'ς', 'ᲀ', 'ẛ', 'ǰ',
  'Ω', 'ω', 'Σ', 'σ', 'ς', 'Ὀ', 'ὀ', 'Ά', 'ά', 'ΐ', 'Ï', 'ï', 'ή', 'Ή', 'ΰ',
  'aḃc', 'AḂC', 'à', 'À', 'é', 'É', 'ñ', 'ǆ́', '𐐀', '𐐨', '😀', '\uD801', '\uDC00', 'a\uD801b', '\uDC00\uD801', '𐐀\uD801',
  '', ' ', 'a', 'A', '0', 'Hello World', 'HELLO WORLD', 'hello world', 'ÄÖÜß', 'äöüẞ', 'ÀÉÎÕÜ', 'Ǳ', 'ǳ', 'ǲ', 'Dž',
  'ΣΑΣ', 'ΑΣΑΣΑΣ', 'ΣΣ', 'ΑΣΣΑ', 'ᾼΣ', 'ΑΣͅ', 'Σ́', 'ΑΣ́Α', 'ΑΣ́ ', 'Ὀδυσσεύς', 'ΌΔΥΣΣΕΎΣ',
  'ΣΑΣ.', '(ΑΣ)', '«ΑΣ»', 'ΑΣ-ΑΣ', 'ΑΣ_ΑΣ', 'ΑΣ ', 'ΑΣ\n', 'ΑΣ　', 'AΣ', 'aΣ', "ΑΣ'Α",
  'AΣ', 'aΣ', 'ΑΣa', 'Σa', '1ΑΣ', 'ΑΣʰ', 'ΑΣ́ͅ', 'ΑΣ́ͅ', 'ΑΣ᪰', 'ΑΣ⃐',
];
const normStrings = ['é', 'é', 'Å', 'Å', 'Å', 'ﬁ', '①', 'ｱ', 'ẛ̣', '̈́', 'क़', '가', '가', '각', 'ạ̇', 'ạ̇', 'ä', 'ä', 'ö', 'ü', 'ß', 'ǆ', '㌀', 'שּׁ', 'é̀', 'è́', '𝅗𝅥', '𝟘', '丽', 'ﷺ', 'Ω', 'Å', '̀', 'ཱི', 'H₂O', 'x²', '…', '“', 'ﬃ', ' ', ' ', '　', '᠎', '', 'abc', '\uD801', '\uDC00', 'a\uD801'];
write('X-UNICODE', 'strings-context', 'Context-sensitive and multi-char case mapping per locale (final sigma, Lithuanian dot, Turkish i, sharp s, ligatures, lone surrogates)', [U({ part: 'strctx', locales, strings })]);
write('X-UNICODE', 'normalizer', 'Normalizer NFC/NFD/NFKC/NFKD for every code point whose result differs, plus selected sequences', [U({ part: 'normalizer', strings: normStrings })]);

// Pattern classes: java.util.regex names that the regex translator may need
const posix = ['Lower', 'Upper', 'ASCII', 'Alpha', 'Digit', 'Alnum', 'Punct', 'Graph', 'Print', 'Blank', 'Cntrl', 'XDigit', 'Space'];
const java = ['javaLowerCase', 'javaUpperCase', 'javaWhitespace', 'javaMirrored', 'javaLetter', 'javaDigit', 'javaLetterOrDigit', 'javaAlphabetic', 'javaIdeographic', 'javaTitleCase', 'javaSpaceChar', 'javaJavaIdentifierStart', 'javaJavaIdentifierPart', 'javaDefined', 'javaISOControl', 'javaIdentifierIgnorable', 'javaUnicodeIdentifierStart', 'javaUnicodeIdentifierPart'];
const cats = ['L', 'Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'LC', 'M', 'Mn', 'Mc', 'Me', 'N', 'Nd', 'Nl', 'No', 'P', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po', 'S', 'Sm', 'Sc', 'Sk', 'So', 'Z', 'Zs', 'Zl', 'Zp', 'C', 'Cc', 'Cf', 'Cs', 'Co', 'Cn'];
const binary = ['IsAlphabetic', 'IsIdeographic', 'IsLetter', 'IsLowercase', 'IsUppercase', 'IsTitlecase', 'IsPunctuation', 'IsControl', 'IsWhite_Space', 'IsDigit', 'IsHex_Digit', 'IsJoin_Control', 'IsNoncharacter_Code_Point', 'IsAssigned', 'IsEmoji', 'IsLatin', 'IsGreek', 'IsCyrillic', 'IsHan', 'IsArabic', 'IsHebrew', 'IsCommon', 'IsInherited', 'IsHiragana', 'IsKatakana', 'IsThai', 'IsDevanagari', 'IsArmenian', 'IsGeorgian', 'IsHangul'];
const blocks = ['InBasicLatin', 'InLatin-1Supplement', 'InLatinExtended-A', 'InLatinExtended-B', 'InGreek', 'InGreekandCoptic', 'InCyrillic', 'InCombiningDiacriticalMarks', 'InGeneralPunctuation', 'InCJKUnifiedIdeographs', 'InHiragana', 'InKatakana', 'InArabic', 'InHebrew', 'InPrivateUseArea', 'InSpecials', 'InLatinExtendedAdditional', 'InGreekExtended'];
const classes = [];
for (const n of [...posix, ...java, ...cats, ...binary, ...blocks]) classes.push({ name: n, regex: `\\p{${n}}` });
for (const n of ['Lu', 'Ll', 'IsAlphabetic', 'javaLowerCase']) classes.push({ name: `not:${n}`, regex: `\\P{${n}}` });
for (const n of ['Lower', 'Upper', 'Alpha', 'Alnum', 'Punct', 'Space', 'Digit', 'Graph', 'Print', 'Blank', 'Cntrl', 'XDigit']) classes.push({ name: `UCC:${n}`, regex: `\\p{${n}}`, flags: 256 });
for (const [n, r] of [['w', '\\w'], ['W', '\\W'], ['d', '\\d'], ['D', '\\D'], ['s', '\\s'], ['S', '\\S'], ['h', '\\h'], ['H', '\\H'], ['v', '\\v'], ['R', '\\R'], ['dot', '.'], ['dotDOTALL', '.']]) {
  classes.push({ name: n, regex: r, flags: n === 'dotDOTALL' ? 32 : 0 });
  if (n.length === 1) classes.push({ name: `UCC:${n}`, regex: r, flags: 256 });
}
classes.push({ name: 'CI:a', regex: 'a', flags: 2 }, { name: 'CIU:a', regex: 'a', flags: 2 | 64 }, { name: 'CI:k', regex: 'k', flags: 2 }, { name: 'CIU:k', regex: 'k', flags: 2 | 64 }, { name: 'CIU:s', regex: 's', flags: 2 | 64 }, { name: 'CI:s', regex: 's', flags: 2 }, { name: 'CIU:i', regex: 'i', flags: 2 | 64 }, { name: 'CIU:ss', regex: 'ss', flags: 2 | 64 }, { name: 'CIU:sigma', regex: 'σ', flags: 2 | 64 }, { name: 'CIU:ae', regex: 'ä', flags: 2 | 64 }, { name: 'CI:ae', regex: 'ä', flags: 2 }, { name: 'CIU:Ae', regex: 'Ä', flags: 2 | 64 }, { name: 'CIU:ß', regex: 'ß', flags: 2 | 64 }, { name: 'CIU:omega', regex: 'ω', flags: 2 | 64 }, { name: 'CIU:Ǆ', regex: 'ǆ', flags: 2 | 64 }, { name: 'CIU:ist', regex: 'ı', flags: 2 | 64 });
const chunk = 24;
for (let i = 0, k = 1; i < classes.length; i += chunk, k++) {
  write('X-UNICODE', `pattern-classes-${String(k).padStart(2, '0')}`, `Pattern class membership over all code points (matches() on the code point string), classes ${i}..${Math.min(i + chunk, classes.length) - 1}`, [U({ part: 'pattern', classes: classes.slice(i, i + chunk) })]);
}

const L = (args) => ({ op: 'locale-dump', args });
const locs = ['en', 'en_US', 'en_GB', 'de', 'de_DE', 'de_AT', 'de_CH', 'fr', 'fr_FR', 'fr_BE', 'fr_CA', 'fr_CH', 'ROOT', 'new:en-US', 'new:en-GB', 'new:en-NZ'];
write('X-LOCALE', 'locales-main', 'Locale names, DecimalFormatSymbols, NumberFormat patterns, DateFormatSymbols, Calendar week data, date patterns for the LT locales incl. malformed new Locale("en-US")', locs.map((l) => L({ locales: [l] })));
write('X-LOCALE', 'locales-extra', 'Same dump for other locales that LT languages map to (Locale.GERMANY etc. equivalents, es, it, pt, nl, ru, tr, ja, ca, pl, uk, el, ar)', ['en_AU', 'en_CA', 'en_NZ', 'en_ZA', 'de_LU', 'de_LI', 'es', 'es_ES', 'it', 'pt', 'pt_BR', 'pt_PT', 'nl', 'ru', 'pl', 'uk', 'el', 'ca', 'tr', 'ja', 'zh', 'ar', 'sv', 'da', 'ga', 'gl', 'sk', 'sl', 'ro', 'fa', 'br', 'eo', 'tl', 'km', 'be', 'lt', 'ta'].map((l) => L({ locales: [l] })));
console.log('written');
