// Shared code of the X-LANG-REGISTRY adapters: JS twin of LangOps (describe, locale, wrap, error mapping).
import '../../src/lang/register.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { Languages } from '../../src/core/Languages.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { componentClassName } from '../../src/core/language/components.js';
import { safe } from './_text-common.mjs';

export { safe };

// DEV-006 wave 1: exactly the classes of DE-0014 / EN-0015 / FR-0013
const IN_SCOPE = new Set(['German', 'GermanyGerman', 'AustrianGerman', 'SwissGerman',
  'English', 'AmericanEnglish', 'BritishEnglish', 'AustralianEnglish', 'CanadianEnglish', 'NewZealandEnglish', 'SouthAfricanEnglish',
  'French', 'CanadianFrench', 'SwissFrench', 'BelgianFrench']);
const PRIORITY_IDS = ['TOO_LONG_SENTENCE', 'too_long_sentence', 'REPETITIONS_STYLE', 'STYLE', 'SOME_STYLE_RULE', 'STYLE_X', 'style', 'TYPOS', 'GRAMMAR', '', 'DE_COMPOUNDS', 'CONFUSION_RULE', 'PUNCTUATION', 'REDUNDANCY'];
const TYPO_SAMPLES = ['<suggestion>foo</suggestion> bar', 'He said \'hi\'... and "left".', "Don't use 'x' or 'abc' here.", "It costs 10 m. And Mr. X's car.", '"Zitat" mit \'Anführung\' und ... Punkten', '<suggestion>a</suggestion> et <suggestion>b</suggestion>?', 'L\'homme dit: "oui" ! Quoi ?', '', "'", "a'b"];

// Java: LangOps#outOfScope(Language)
export const outOfScope = (l) => !IN_SCOPE.has(l.constructor.FQCN.replace(/^org\.languagetool\.language\./, ''));

// Java: LangOps#contributors(Contributor[])
function contributors(cs) {
  if (cs === null) return null;
  return cs.map((c) => [c.getName(), c.getUrl(), c.toString()]);
}

// Java: LangOps#describe(Language,int)
export function describe(l, level) {
  const m = {};
  m.dev006OutOfScope = outOfScope(l);
  m.class = l.constructor.FQCN;
  m.shortCode = safe(() => l.getShortCode());
  m.shortCodeWithCountryAndVariant = safe(() => l.getShortCodeWithCountryAndVariant());
  m.name = safe(() => l.getName());
  m.toString = safe(() => l.toString());
  m.countries = safe(() => [...l.getCountries()]);
  m.variant = safe(() => l.getVariant());
  m.locale = safe(() => l.getLocale().toString());
  m.localeWithCountryAndVariant = safe(() => l.getLocaleWithCountryAndVariant().toString());
  m.defaultLanguageVariant = safe(() => { const d = l.getDefaultLanguageVariant(); return d === null ? null : d.getShortCodeWithCountryAndVariant(); });
  m.defaultLanguageVariantIsSelf = safe(() => l.getDefaultLanguageVariant() === l);
  m.isVariant = safe(() => l.isVariant());
  m.hasVariant = safe(() => l.hasVariant());
  m.maintainers = safe(() => contributors(l.getMaintainers()));
  m.maintainedState = safe(() => l.getMaintainedState().name());
  m.isSpellcheckOnlyLanguage = safe(() => l.isSpellcheckOnlyLanguage());
  m.isExternal = safe(() => l.isExternal());
  m.isHiddenFromGui = safe(() => l.isHiddenFromGui());
  m.hasMinMatchesRules = safe(() => l.hasMinMatchesRules());
  m.hashCode = safe(() => l.hashCode());
  for (const loc of ['en', 'de', 'fr']) {
    m[`translatedName.${loc}`] = safe(() => l.getTranslatedName(getMessageBundleForLanguage(Languages.getLanguageForShortCode(loc))));
  }
  if (level < 1) return m;
  m.commonWordsPath = safe(() => l.getCommonWordsPath());
  m.defaultEnabledRulesForVariant = safe(() => [...l.getDefaultEnabledRulesForVariant()]);
  m.defaultDisabledRulesForVariant = safe(() => [...l.getDefaultDisabledRulesForVariant()]);
  m.ruleFileNames = safe(() => [...l.getRuleFileNames()]);
  m.ignoredCharactersRegex = safe(() => l.getIgnoredCharactersRegex().pattern());
  m.quotes = safe(() => [l.getOpeningDoubleQuote(), l.getClosingDoubleQuote(), l.getOpeningSingleQuote(), l.getClosingSingleQuote()]);
  m.isAdvancedTypographyEnabled = safe(() => l.isAdvancedTypographyEnabled());
  m.consistencyRulePrefix = safe(() => l.getConsistencyRulePrefix());
  m.priorityMap = safe(() => {
    const out = {};
    for (const [k, v] of l.getPriorityMap().entrySet().sort((a, b) => javaCompare(a[0], b[0]))) out[k] = v;
    return out;
  });
  const pr = {};
  for (const id of PRIORITY_IDS) pr[id] = safe(() => l.getPriorityForId(id));
  m.priorityForId = pr;
  m.toAdvancedTypography = TYPO_SAMPLES.map((s) => safe(() => l.toAdvancedTypography(s)));
  m.adaptSuggestion = ['haus', 'Haus', '', "l'homme", "it's"].map((s) => safe(() => [l.adaptSuggestion(s, 'Orig'), l.adaptSuggestionsList([s, 'x'], 'Orig'), l.prepareLineForSpeller(s)]));
  m['hasNGramFalseFriendRule.en'] = safe(() => l.hasNGramFalseFriendRule(Languages.getLanguageForShortCode('en')));
  m['hasNGramFalseFriendRule.de'] = safe(() => l.hasNGramFalseFriendRule(Languages.getLanguageForShortCode('de')));
  m.equalsConsiderVariants = safe(() => ['de', 'de-DE', 'de-AT', 'en', 'en-US', 'en-GB', 'fr'].map((c) => {
    const o = Languages.getLanguageForShortCode(c);
    return [c, l.equals(o), l.equalsConsiderVariantsIfSpecified(o)];
  }));
  if (level < 2) return m;
  m.tagger = safe(() => componentClassName(l.getTagger()));
  m.disambiguator = safe(() => componentClassName(l.getDisambiguator()));
  m.sentenceTokenizer = safe(() => componentClassName(l.getSentenceTokenizer()));
  m.wordTokenizer = safe(() => componentClassName(l.getWordTokenizer()));
  m.chunker = safe(() => componentClassName(l.getChunker()));
  m.postDisambiguationChunker = safe(() => componentClassName(l.getPostDisambiguationChunker()));
  m.synthesizer = safe(() => componentClassName(l.getSynthesizer()));
  m.taggerCached = safe(() => l.getTagger() === l.getTagger());
  m.multitokenSpeller = safe(() => componentClassName(l.getMultitokenSpeller()));
  m.unifierConfiguration = safe(() => l.getUnifierConfiguration() !== null);
  return m;
}

// Java: LangOps#locale(JsonNode)
export function locale(n) {
  if (n === undefined || n === null) return null;
  return new Locale(n.language ?? '', n.country ?? '', n.variant ?? '');
}

// Java: LangOps#wrap(Object,boolean,String)
export function wrap(v, filtered, reason) {
  const m = { value: v, dev006Filtered: filtered };
  if (reason !== null && reason !== undefined) m.dev006Reason = reason;
  return m;
}

// Java: LangOps#langResult(Language,int)
export function langResult(l, level) {
  if (l === null) return wrap(null, false, null);
  return wrap(describe(l, level), outOfScope(l), outOfScope(l) ? 'language-out-of-scope' : null);
}

// Java: LangOps#str(JsonNode)
export const str = (n) => (n === undefined || n === null ? null : String(n));
