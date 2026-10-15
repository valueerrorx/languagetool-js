package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.language.Contributor;
import org.languagetool.language.LanguageBuilder;
import org.languagetool.rules.*;

import java.io.File;
import java.lang.reflect.Method;
import java.util.*;

/** Ops for X-LANG-REGISTRY: lang-lookup, lang-describe, lang-dynamic. Format: docs/review/F10-oracle.md. */
final class LangOps {
  private LangOps() {}

  // DEV-006 wave 1: exactly the classes of DE-0014 / EN-0015 / FR-0013 (SimpleGerman is not among them)
  private static final Set<String> IN_SCOPE = new HashSet<>(Arrays.asList("German", "GermanyGerman", "AustrianGerman", "SwissGerman",
      "English", "AmericanEnglish", "BritishEnglish", "AustralianEnglish", "CanadianEnglish", "NewZealandEnglish", "SouthAfricanEnglish",
      "French", "CanadianFrench", "SwissFrench", "BelgianFrench"));
  private static final String[] PRIORITY_IDS = {"TOO_LONG_SENTENCE", "too_long_sentence", "REPETITIONS_STYLE", "STYLE", "SOME_STYLE_RULE", "STYLE_X", "style", "TYPOS", "GRAMMAR", "", "DE_COMPOUNDS", "CONFUSION_RULE", "PUNCTUATION", "REDUNDANCY"};
  private static final String[] TYPO_SAMPLES = {"<suggestion>foo</suggestion> bar", "He said 'hi'... and \"left\".", "Don't use 'x' or 'abc' here.", "It costs 10 m. And Mr. X's car.", "\"Zitat\" mit 'Anführung' und ... Punkten", "<suggestion>a</suggestion> et <suggestion>b</suggestion>?", "L'homme dit: \"oui\" ! Quoi ?", "", "'", "a'b"};

  private static Map<String, Object> err(Throwable t) {
    if (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("error", e);
    return m;
  }

  private static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (Throwable t) { return err(t); }
  }

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  static boolean outOfScope(Language l) { return !IN_SCOPE.contains(l.getClass().getName().replaceFirst("^org\\.languagetool\\.language\\.", "")); }

  private static Object contributors(Contributor[] cs) {
    if (cs == null) return null;
    List<Object> l = new ArrayList<>();
    for (Contributor c : cs) { List<Object> x = new ArrayList<>(); x.add(c.getName()); x.add(c.getUrl()); x.add(c.toString()); l.add(x); }
    return l;
  }

  private static Object cls(Object o) { return o == null ? null : o.getClass().getName(); }

  /** level 0 identity, 1 + data hooks, 2 + lazily created components. */
  static Map<String, Object> describe(Language l, int level) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("dev006OutOfScope", outOfScope(l));
    m.put("class", l.getClass().getName());
    m.put("shortCode", safe(l::getShortCode));
    m.put("shortCodeWithCountryAndVariant", safe(l::getShortCodeWithCountryAndVariant));
    m.put("name", safe(l::getName));
    m.put("toString", safe(l::toString));
    m.put("countries", safe(() -> Arrays.asList(l.getCountries())));
    m.put("variant", safe(l::getVariant));
    m.put("locale", safe(() -> l.getLocale().toString()));
    m.put("localeWithCountryAndVariant", safe(() -> l.getLocaleWithCountryAndVariant().toString()));
    m.put("defaultLanguageVariant", safe(() -> { Language d = l.getDefaultLanguageVariant(); return d == null ? null : d.getShortCodeWithCountryAndVariant(); }));
    m.put("defaultLanguageVariantIsSelf", safe(() -> l.getDefaultLanguageVariant() == l));
    m.put("isVariant", safe(l::isVariant));
    m.put("hasVariant", safe(l::hasVariant));
    m.put("maintainers", safe(() -> contributors(l.getMaintainers())));
    m.put("maintainedState", safe(() -> l.getMaintainedState().name()));
    m.put("isSpellcheckOnlyLanguage", safe(l::isSpellcheckOnlyLanguage));
    m.put("isExternal", safe(l::isExternal));
    m.put("isHiddenFromGui", safe(l::isHiddenFromGui));
    m.put("hasMinMatchesRules", safe(l::hasMinMatchesRules));
    m.put("hashCode", safe(l::hashCode));
    for (String loc : new String[]{"en", "de", "fr"}) {
      m.put("translatedName." + loc, safe(() -> l.getTranslatedName(JLanguageTool.getMessageBundle(Languages.getLanguageForShortCode(loc)))));
    }
    if (level < 1) return m;
    m.put("commonWordsPath", safe(l::getCommonWordsPath));
    m.put("defaultEnabledRulesForVariant", safe(l::getDefaultEnabledRulesForVariant));
    m.put("defaultDisabledRulesForVariant", safe(l::getDefaultDisabledRulesForVariant));
    m.put("ruleFileNames", safe(l::getRuleFileNames));
    m.put("ignoredCharactersRegex", safe(() -> l.getIgnoredCharactersRegex().pattern()));
    m.put("quotes", safe(() -> Arrays.asList(l.getOpeningDoubleQuote(), l.getClosingDoubleQuote(), l.getOpeningSingleQuote(), l.getClosingSingleQuote())));
    m.put("isAdvancedTypographyEnabled", safe(l::isAdvancedTypographyEnabled));
    m.put("consistencyRulePrefix", safe(l::getConsistencyRulePrefix));
    m.put("priorityMap", safe(() -> new TreeMap<>(l.getPriorityMap())));
    Map<String, Object> pr = new LinkedHashMap<>();
    for (String id : PRIORITY_IDS) {
      pr.put(id, safe(() -> {
        for (Class<?> c = l.getClass(); c != null; c = c.getSuperclass()) {
          try { Method me = c.getDeclaredMethod("getPriorityForId", String.class); me.setAccessible(true); return me.invoke(l, id); }
          catch (NoSuchMethodException e) { /* up */ }
        }
        throw new NoSuchMethodException("getPriorityForId");
      }));
    }
    m.put("priorityForId", pr);
    List<Object> typo = new ArrayList<>();
    for (String s : TYPO_SAMPLES) typo.add(safe(() -> l.toAdvancedTypography(s)));
    m.put("toAdvancedTypography", typo);
    List<Object> adapt = new ArrayList<>();
    for (String s : new String[]{"haus", "Haus", "", "l'homme", "it's"}) adapt.add(safe(() -> Arrays.asList(l.adaptSuggestion(s, "Orig"), l.adaptSuggestionsList(new ArrayList<>(Arrays.asList(s, "x")), "Orig"), l.prepareLineForSpeller(s))));
    m.put("adaptSuggestion", adapt);
    m.put("hasNGramFalseFriendRule.en", safe(() -> l.hasNGramFalseFriendRule(Languages.getLanguageForShortCode("en"))));
    m.put("hasNGramFalseFriendRule.de", safe(() -> l.hasNGramFalseFriendRule(Languages.getLanguageForShortCode("de"))));
    m.put("equalsConsiderVariants", safe(() -> {
      List<Object> r = new ArrayList<>();
      for (String c : new String[]{"de", "de-DE", "de-AT", "en", "en-US", "en-GB", "fr"}) {
        Language o = Languages.getLanguageForShortCode(c);
        r.add(Arrays.asList(c, l.equals(o), l.equalsConsiderVariantsIfSpecified(o)));
      }
      return r;
    }));
    if (level < 2) return m;
    m.put("tagger", safe(() -> cls(l.getTagger())));
    m.put("disambiguator", safe(() -> cls(l.getDisambiguator())));
    m.put("sentenceTokenizer", safe(() -> cls(l.getSentenceTokenizer())));
    m.put("wordTokenizer", safe(() -> cls(l.getWordTokenizer())));
    m.put("chunker", safe(() -> cls(l.getChunker())));
    m.put("postDisambiguationChunker", safe(() -> cls(l.getPostDisambiguationChunker())));
    m.put("synthesizer", safe(() -> cls(l.getSynthesizer())));
    m.put("taggerCached", safe(() -> l.getTagger() == l.getTagger()));
    m.put("multitokenSpeller", safe(() -> cls(l.getMultitokenSpeller())));
    m.put("unifierConfiguration", safe(() -> l.getUnifierConfiguration() != null));
    return m;
  }

  private static Map<String, Object> entry(Language l, int level) {
    return describe(l, level);
  }

  private static Locale locale(JsonNode n) {
    if (n == null || n.isNull()) return null;
    String lang = n.has("language") ? n.get("language").asText() : "";
    String c = n.has("country") ? n.get("country").asText() : "";
    String v = n.has("variant") ? n.get("variant").asText() : "";
    return new Locale(lang, c, v);
  }

  private static Map<String, Object> wrap(Object v, boolean filtered, String reason) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("value", v);
    m.put("dev006Filtered", filtered);
    if (reason != null) m.put("dev006Reason", reason);
    return m;
  }

  private static Object langResult(Language l, int level) {
    if (l == null) return wrap(null, false, null);
    return wrap(describe(l, level), outOfScope(l), outOfScope(l) ? "language-out-of-scope" : null);
  }

  // lang-lookup {calls:[{fn, code|name|locale|noop|className, level?}]}
  static Object lookup(JsonNode a) {
    List<Object> res = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      final int level = c.has("level") ? c.get("level").asInt() : 0;
      String fn = c.get("fn").asText();
      res.add(safe(() -> {
        switch (fn) {
          case "shortCode": {
            Language l;
            if (c.has("noop")) { List<String> n = new ArrayList<>(); for (JsonNode x : c.get("noop")) n.add(str(x)); l = Languages.getLanguageForShortCode(str(c.get("code")), n); }
            else l = Languages.getLanguageForShortCode(str(c.get("code")));
            return langResult(l, level);
          }
          case "name": return langResult(Languages.getLanguageForName(str(c.get("name"))), level);
          case "supported": {
            String code = str(c.get("code"));
            boolean b = Languages.isLanguageSupported(code);
            boolean out = false;
            if (b) out = outOfScope(Languages.getLanguageForShortCode(code));
            return wrap(b, out, out ? "language-out-of-scope" : null);
          }
          case "locale": return langResult(Languages.getLanguageForLocale(locale(c.get("locale"))), level);
          case "className": return langResult(Languages.getOrAddLanguageByClassName(str(c.get("className"))), level);
          case "list": case "listWithDemo": {
            List<Object> l = new ArrayList<>();
            for (Language x : fn.equals("list") ? Languages.get() : Languages.getWithDemoLanguage()) l.add(wrap(describe(x, level), outOfScope(x), outOfScope(x) ? "language-out-of-scope" : null));
            return l;
          }
          case "longCodes": {
            List<Object> l = new ArrayList<>();
            for (Map.Entry<String, Language> e : Languages.getLongCodeToLangMapping().entrySet()) {
              List<Object> row = new ArrayList<>();
              row.add(e.getKey()); row.add(e.getValue().getShortCodeWithCountryAndVariant()); row.add(outOfScope(e.getValue()));
              l.add(row);
            }
            return l;
          }
          case "listUnmodifiable": {
            List<Language> l = Languages.get();
            try { l.add(l.get(0)); return "added"; } catch (UnsupportedOperationException e) { return "UnsupportedOperationException"; }
          }
          default: throw new IllegalArgumentException("bad fn " + fn);
        }
      }));
    }
    return res;
  }

  // lang-describe {codes:[..], level} -> per code describe or error
  static Object describeOp(JsonNode a) {
    List<Object> res = new ArrayList<>();
    int level = a.has("level") ? a.get("level").asInt() : 2;
    for (JsonNode c : a.get("codes")) {
      res.add(safe(() -> langResult(Languages.getLanguageForShortCode(c.asText()), level)));
    }
    return res;
  }

  // lang-dynamic {calls:[{fn:add|builder|byClassName|list, ...}]}: mutates the registry, one case per JVM
  static Object dynamic(JsonNode a) {
    List<Object> res = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      String fn = c.get("fn").asText();
      res.add(safe(() -> {
        switch (fn) {
          case "add": {
            Language l = Languages.addLanguage(str(c.get("name")), str(c.get("code")), c.get("path").isNull() ? null : new File(c.get("path").asText()));
            return wrap(describe(l, 1), false, null);
          }
          case "builder": {
            Language l = LanguageBuilder.makeAdditionalLanguage(new File(c.get("path").asText()));
            Map<String, Object> d = describe(l, 1);
            return wrap(d, false, null);
          }
          case "byClassName": return wrap(describe(Languages.getOrAddLanguageByClassName(str(c.get("className"))), 1), false, null);
          case "list": {
            List<Object> l = new ArrayList<>();
            for (Language x : Languages.get()) l.add(Arrays.asList(x.getClass().getName(), x.getShortCodeWithCountryAndVariant(), x.getName()));
            return l;
          }
          case "shortCode": return wrap(describe(Languages.getLanguageForShortCode(str(c.get("code"))), 0), false, null);
          case "supported": return wrap(Languages.isLanguageSupported(str(c.get("code"))), false, null);
          case "name": { Language l = Languages.getLanguageForName(str(c.get("name"))); return wrap(l == null ? null : describe(l, 0), false, null); }
          case "locale": return wrap(describe(Languages.getLanguageForLocale(locale(c.get("locale"))), 0), false, null);
          default: throw new IllegalArgumentException("bad fn " + fn);
        }
      }));
    }
    return res;
  }
}
