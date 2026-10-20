package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.language.*;
import org.languagetool.rules.*;
import org.languagetool.rules.de.*;
import org.languagetool.rules.spelling.*;
import org.languagetool.tools.Tools;

import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Ops for X-DESPELL (F52/F53), reached through sr-misc kinds "de-*". Format: docs/review/F52-oracle.md. */
final class DeSpellOps {
  private DeSpellOps() {}

  private static Object safe(SpellRuleOps.Callable0 c) {
    try { return c.call(); } catch (Throwable t) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", SpellRuleOps.err(t)); return m; }
  }

  private static List<String> repl(Object l) {
    List<String> o = new ArrayList<>();
    for (Object x : (List<?>) l) o.add(x instanceof SuggestedReplacement ? ((SuggestedReplacement) x).getReplacement() : String.valueOf(x));
    return o;
  }

  private static String sha(Collection<String> c) throws Exception {
    List<String> l = new ArrayList<>(c);
    Collections.sort(l);
    MessageDigest md = MessageDigest.getInstance("SHA-1");
    for (String s : l) { md.update(s.getBytes(StandardCharsets.UTF_8)); md.update((byte) 10); }
    StringBuilder sb = new StringBuilder();
    for (byte b : md.digest()) sb.append(String.format("%02x", b));
    return sb.toString();
  }

  private static Object field(Class<?> c, Object o, String name) throws Exception {
    Field f = c.getDeclaredField(name);
    f.setAccessible(true);
    return f.get(o);
  }

  static Object misc(JsonNode a) throws Exception {
    String kind = a.get("kind").asText();
    Map<String, Object> res = new LinkedHashMap<>();
    switch (kind) {
      // {lines}: LineExpander#expandLine
      case "de-lineexpand": {
        org.languagetool.rules.de.LineExpander le = new org.languagetool.rules.de.LineExpander();
        List<Object> o = new ArrayList<>();
        for (String s : SpellRuleOps.strs(a, "lines")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("line", s);
          m.put("result", safe(() -> le.expandLine(s)));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      // {lang, id, words, texts?}: per word candidates / onlySuggestions / message / suggestions / sortSuggestionByQuality
      case "de-gsr": {
        Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
        SpellingCheckRule r;
        try { r = SpellRuleOps.find(new CheckPipeOps.HarnessLT(l, SpellRuleOps.userConfig(a)), a.get("id").asText()); }
        catch (Throwable t) { res.put("buildError", SpellRuleOps.err(t)); return res; }
        if (r == null) { res.put("noRule", true); return res; }
        res.put("class", r.getClass().getName());
        List<Object> o = new ArrayList<>();
        for (String w : SpellRuleOps.strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", w);
          m.put("misspelled", safe(() -> r.isMisspelled(w)));
          m.put("candidates", safe(() -> r instanceof GermanSpellerRule ? ((GermanSpellerRule) r).getCandidates(w) : null));
          m.put("onlySuggestions", safe(() -> repl(SpellRuleOps.call(r, "getOnlySuggestions", new Class<?>[]{String.class}, w))));
          m.put("noSuggest", safe(() -> repl(SpellRuleOps.call(r, "filterNoSuggestWords", new Class<?>[]{List.class}, new ArrayList<>(Arrays.asList(new SuggestedReplacement(w), new SuggestedReplacement(w + "s"), new SuggestedReplacement(w.toLowerCase())))))));
          m.put("suggestions", safe(() -> ((GermanSpellerRule) r).getSuggestions(w)));
          m.put("sorted", safe(() -> SpellRuleOps.call(r, "sortSuggestionByQuality", new Class<?>[]{String.class, List.class}, w, new ArrayList<>(((GermanSpellerRule) r).getSuggestions(w)))));
          m.put("message", safe(() -> {
            List<String> sg = ((GermanSpellerRule) r).getSuggestions(w);
            return SpellRuleOps.call(r, "getMessage", new Class<?>[]{String.class, SuggestedReplacement.class}, w, sg.isEmpty() ? null : new SuggestedReplacement(sg.get(0)));
          }));
          o.add(m);
        }
        res.put("results", o);
        // explicit (word, firstSuggestion) message pairs
        if (a.has("messages")) {
          List<Object> ms = new ArrayList<>();
          for (JsonNode p : a.get("messages")) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("pair", p);
            m.put("message", safe(() -> SpellRuleOps.call(r, "getMessage", new Class<?>[]{String.class, SuggestedReplacement.class}, p.get(0).asText(), p.get(1).isNull() ? null : new SuggestedReplacement(p.get(1).asText()))));
            ms.add(m);
          }
          res.put("messages", ms);
        }
        // addIgnoreWords(line) then word checks
        if (a.has("addIgnore")) {
          List<Object> ai = new ArrayList<>();
          for (String s : SpellRuleOps.strs(a, "addIgnore")) ai.add(safe(() -> { SpellRuleOps.call(r, "addIgnoreWords", new Class<?>[]{String.class}, s); return true; }));
          res.put("addIgnore", ai);
          List<Object> after = new ArrayList<>();
          for (String w : SpellRuleOps.strs(a, "afterWords")) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("w", w);
            m.put("misspelled", safe(() -> r.isMisspelled(w)));
            m.put("ignoreWord", safe(() -> SpellRuleOps.call(r, "ignoreWord", new Class<?>[]{String.class}, w)));
            m.put("potentially", safe(() -> SpellRuleOps.call(r, "ignorePotentiallyMisspelledWord", new Class<?>[]{String.class}, w)));
            after.add(m);
          }
          res.put("afterWords", after);
        }
        break;
      }
      // {lang, id, probes}: size + hash of the data sets loaded by GermanSpellerRule, membership of probe words
      case "de-data": {
        Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
        SpellingCheckRule r;
        try { r = SpellRuleOps.find(new CheckPipeOps.HarnessLT(l, (org.languagetool.UserConfig) null), a.get("id").asText()); }
        catch (Throwable t) { res.put("buildError", SpellRuleOps.err(t)); return res; }
        Class<?> c = GermanSpellerRule.class;
        Map<String, Object> sets = new LinkedHashMap<>();
        for (String n : new String[]{"verbStems", "verbPrefixes", "otherPrefixes", "oldSpelling", "wordsToBeIgnoredInCompounds", "wordStartsToBeProhibited", "wordEndingsToBeProhibited", "wordsNeedingInfixS", "lcDoNotSuggestWords"}) {
          sets.put(n, safe(() -> {
            Object v = field(c, Modifier.isStatic(c.getDeclaredField(n).getModifiers()) ? null : r, n);
            Collection<String> cs = (Collection<String>) v;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("size", cs.size());
            m.put("sha1", sha(cs));
            List<Object> has = new ArrayList<>();
            for (String p : SpellRuleOps.strs(a, "probes")) has.add(cs.contains(p));
            m.put("contains", has);
            return m;
          }));
        }
        res.put("sets", sets);
        res.put("additionalSuggestions", safe(() -> ((Map<?, ?>) field(c, null, "ADDITIONAL_SUGGESTIONS")).size()));
        res.put("preventSuggestionPatterns", safe(() -> ((List<?>) field(c, null, "PREVENT_SUGGESTION_PATTERNS")).size()));
        break;
      }
      // {lang, words, texts}: MorfologikGermanyGermanSpellerRule (not registered) on de_DE.dict
      case "de-morfologik": {
        Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
        MorfologikGermanyGermanSpellerRule r;
        try { r = new MorfologikGermanyGermanSpellerRule(JLanguageTool.getMessageBundle(l), l, null, new ArrayList<>()); }
        catch (Throwable t) { res.put("buildError", SpellRuleOps.err(t)); return res; }
        res.put("id", r.getId());
        res.put("file", r.getFileName());
        res.put("desc", safe(() -> r.getDescription()));
        res.put("examples", safe(() -> { List<String> e = new ArrayList<>(); for (IncorrectExample x : r.getIncorrectExamples()) e.add(x.getExample()); return e; }));
        List<Object> o = new ArrayList<>();
        for (String w : SpellRuleOps.strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", w);
          m.put("misspelled", safe(() -> SpellRuleOps.call(r, "isMisspelled", new Class<?>[]{String.class}, w)));
          m.put("suggestions", safe(() -> SpellRuleOps.call(r, "getSuggestions", new Class<?>[]{String.class}, w)));
          o.add(m);
        }
        res.put("results", o);
        CheckPipeOps.HarnessLT lt = new CheckPipeOps.HarnessLT(l, (Language) null);
        lt.addRule(r);
        lt.setCleanOverlappingMatches(false);
        Tools.selectRules(lt, new LinkedHashSet<>(), new LinkedHashSet<>(), new LinkedHashSet<>(), new LinkedHashSet<>(Arrays.asList(r.getId())), true, false);
        List<Object> cs = new ArrayList<>();
        for (JsonNode c : a.get("cases")) cs.add(CheckPipeOps.runCase(lt, c));
        res.put("cases", cs);
        break;
      }
      default: throw new IllegalArgumentException("kind " + kind);
    }
    return res;
  }
}
