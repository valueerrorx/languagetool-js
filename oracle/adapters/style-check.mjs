// JS twin of harness op "style-check" (StyleOps#check, docs/review/F36-oracle.md); the F36 rule classes are not ported yet.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const notPorted = (what) => Object.assign(new Error(`not ported yet: ${what}`), { notPorted: true });

// rule id / extra class -> source file of the port (convention: src/core/rules/<Class>.js)
const FILES = {
  TOO_LONG_SENTENCE: 'src/core/rules/LongSentenceRule.js', TOO_LONG_SENTENCE_DE: 'src/core/rules/LongSentenceRule.js',
  TOO_LONG_PARAGRAPH: 'src/core/rules/LongParagraphRule.js',
  EMPTY_LINE: 'src/core/rules/EmptyLineRule.js', EmptyLineRule: 'src/core/rules/EmptyLineRule.js',
  PUNCTUATION_PARAGRAPH_END: 'src/core/rules/PunctuationMarkAtParagraphEnd.js', PunctuationMarkAtParagraphEnd: 'src/core/rules/PunctuationMarkAtParagraphEnd.js',
  PUNCTUATION_PARAGRAPH_END2: 'src/core/rules/PunctuationMarkAtParagraphEnd2.js', PunctuationMarkAtParagraphEnd2: 'src/core/rules/PunctuationMarkAtParagraphEnd2.js',
  WHITESPACE_PARAGRAPH_BEGIN: 'src/core/rules/WhiteSpaceAtBeginOfParagraph.js', WhiteSpaceAtBeginOfParagraph: 'src/core/rules/WhiteSpaceAtBeginOfParagraph.js',
  WHITESPACE_PARAGRAPH: 'src/core/rules/WhiteSpaceBeforeParagraphEnd.js', WhiteSpaceBeforeParagraphEnd: 'src/core/rules/WhiteSpaceBeforeParagraphEnd.js',
  PARAGRAPH_REPEAT_BEGINNING_RULE: 'src/core/rules/ParagraphRepeatBeginningRule.js', ParagraphRepeatBeginningRule: 'src/core/rules/ParagraphRepeatBeginningRule.js',
  WordRepeatBeginningRule: 'src/core/rules/WordRepeatBeginningRule.js', PhraseRepeatRule: 'src/core/rules/PhraseRepeatRule.js',
  READABILITY_RULE_SIMPLE: 'src/core/rules/ReadabilityRule.js', READABILITY_RULE_DIFFICULT: 'src/core/rules/ReadabilityRule.js',
};

// Java: StyleOps#check(JsonNode); needs UserConfig (config values) and per-language rule lists, both still missing in the port
export function run(a) {
  for (const k of [...a.ids, ...(a.extra ?? [])]) {
    const f = FILES[k];
    if (f === undefined || !existsSync(path.join(ROOT, f))) throw notPorted(`${k} (F36 rule class)`);
  }
  throw notPorted('style-check: UserConfig / language rule lists (F17, F36 port)');
}
