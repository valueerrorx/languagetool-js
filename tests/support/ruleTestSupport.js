// Helpers for the rule JUnit ports: en-US stands in for the Demo/Fake languages (not ported); no-op disambiguator/chunker (F32/F44 pending).
import { beforeAll, afterAll } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';

export const EN = Languages.getLanguageForShortCode('en-US');

// Java: TestTools#getEnglishMessages()
export const englishMessages = () => getMessageBundleForLanguage(Languages.getLanguageForShortCode('en'));

// Java: TestTools#getMessages(String)
export const messagesFor = (lang) => getMessageBundleForLanguage(lang);

// swaps in no-op analysis for the tests of the calling describe block
export function useNoopAnalysis(...langs) {
  let saved;
  beforeAll(() => {
    saved = langs.map((l) => [l, l.getDisambiguator(), l.getChunker()]);
    for (const l of langs) {
      l.setDisambiguator(new NoopDisambiguator());
      l.setChunker(new NoopChunker());
    }
  });
  afterAll(() => {
    for (const [l, d, c] of saved) {
      l.setDisambiguator(d);
      l.setChunker(c);
    }
  });
}

// runs fn with the default (real) disambiguator and chunker of the language, then puts the previous ones back
export function withRealAnalysis(language, fn) {
  const d = language.disambiguator ?? null;
  const c = language.chunker ?? null;
  language.setDisambiguator(null);
  language.setChunker(null);
  try {
    return fn();
  } finally {
    language.setDisambiguator(d);
    language.setChunker(c);
  }
}

// new JLanguageTool(language) without built-in rules (stands in for "disable all rules, add one")
export function newLt(language = EN, ...rules) {
  const lt = new JLanguageTool(language, [], null, null, null, null, true, false, []);
  for (const r of rules) lt.addRule(r);
  return lt;
}
