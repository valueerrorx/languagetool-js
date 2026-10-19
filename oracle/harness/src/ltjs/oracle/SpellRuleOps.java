package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.spelling.*;
import org.languagetool.rules.spelling.multitoken.MultitokenSpeller;
import org.languagetool.rules.spelling.symspell.implementation.*;
import org.languagetool.tools.Tools;

import java.io.*;
import java.lang.reflect.*;
import java.util.*;

/** Ops for X-SPELLRULE (F42): sr-check, sr-word, sr-misc. Format: docs/review/F42-oracle.md. */
final class SpellRuleOps {
  private SpellRuleOps() {}

  static Map<String, Object> err(Throwable t) {
    if (t instanceof InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    if (t.getCause() != null) e.put("cause", err(t.getCause()));
    return e;
  }

  static List<String> strs(JsonNode a, String k) {
    List<String> r = new ArrayList<>();
    if (a.has(k)) for (JsonNode n : a.get(k)) r.add(n.isNull() ? null : n.asText());
    return r;
  }

  static UserConfig userConfig(JsonNode a) {
    if (!a.has("userWords")) return null;
    Long cache = a.has("userCache") ? a.get("userCache").asLong() : null;
    return new UserConfig(strs(a, "userWords"), new ArrayList<>(), new HashMap<>(), 0, 1L, a.has("userName") ? a.get("userName").asText() : null, cache, null, false, null, null, false, new ArrayList<>(), false, false, false);
  }

  static Object call(Object o, String name, Class<?>[] types, Object... args) throws Throwable {
    for (Class<?> c = o.getClass(); c != null; c = c.getSuperclass()) {
      try {
        Method m = c.getDeclaredMethod(name, types);
        m.setAccessible(true);
        return m.invoke(o, args);
      } catch (NoSuchMethodException e) { /* up */ }
      catch (InvocationTargetException e) { throw e.getCause(); }
    }
    throw new NoSuchMethodException(name);
  }

  private static Object safe(Callable0 c) {
    try { return c.call(); } catch (Throwable t) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", err(t)); return m; }
  }
  interface Callable0 { Object call() throws Throwable; }

  /** {lang, ids, userWords?, userCache?, userName?, ignoreTokens?, acceptPhrases?, considerIgnore?, cases:[{text,level?}]} */
  static Object check(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Map<String, Object> res = new LinkedHashMap<>();
    CheckPipeOps.HarnessLT lt;
    try { lt = new CheckPipeOps.HarnessLT(l, userConfig(a)); }
    catch (Throwable t) { res.put("buildError", err(t)); return res; }
    lt.setCleanOverlappingMatches(false);
    Set<String> enabled = new LinkedHashSet<>(strs(a, "ids"));
    List<String> selected = new ArrayList<>();
    for (Rule r : lt.getAllRules()) {
      if (enabled.contains(r.getId())) {
        selected.add(r.getFullId() + "|" + r.getClass().getName());
        if (r instanceof SpellingCheckRule) {
          SpellingCheckRule s = (SpellingCheckRule) r;
          if (a.has("ignoreTokens")) s.addIgnoreTokens(strs(a, "ignoreTokens"));
          if (a.has("acceptPhrases")) s.acceptPhrases(strs(a, "acceptPhrases"));
          if (a.has("considerIgnore")) s.setConsiderIgnoreWords(a.get("considerIgnore").asBoolean());
        }
      }
    }
    Tools.selectRules(lt, new LinkedHashSet<>(), new LinkedHashSet<>(), new LinkedHashSet<>(), enabled, true, false);
    res.put("selected", selected);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) out.add(CheckPipeOps.runCase(lt, c));
    res.put("cases", out);
    return res;
  }

  static SpellingCheckRule find(CheckPipeOps.HarnessLT lt, String id) {
    for (Rule r : lt.getAllRules()) if (r.getId().equals(id) && r instanceof SpellingCheckRule) return (SpellingCheckRule) r;
    return null;
  }

  /** {lang, id, userWords?, ignoreTokens?, acceptPhrases?, considerIgnore?, words, lists?, sugg?, filter?, expand?} */
  static Object word(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Map<String, Object> res = new LinkedHashMap<>();
    SpellingCheckRule r;
    try {
      CheckPipeOps.HarnessLT lt = new CheckPipeOps.HarnessLT(l, userConfig(a));
      r = find(lt, a.get("id").asText());
    } catch (Throwable t) { res.put("buildError", err(t)); return res; }
    if (r == null) { res.put("noRule", true); return res; }
    res.put("class", r.getClass().getName());
    res.put("meta", safe(() -> {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("desc", r.getDescription());
      m.put("dictBased", r.isDictionaryBasedSpellingRule());
      m.put("spellingFile", r.getSpellingFileName());
      m.put("additionalSpellingFiles", r.getAdditionalSpellingFileNames());
      m.put("variantFile", r.getLanguageVariantSpellingFileName());
      m.put("ignoreFile", call(r, "getIgnoreFileName", new Class<?>[0]));
      m.put("prohibitFile", call(r, "getProhibitFileName", new Class<?>[0]));
      m.put("addProhibitFiles", call(r, "getAdditionalProhibitFileNames", new Class<?>[0]));
      m.put("latin", call(r, "isLatinScript", new Class<?>[0]));
      m.put("tokenizeNew", call(r, "tokenizeNewWords", new Class<?>[0]));
      return m;
    }));
    try {
      if (a.has("ignoreTokens")) r.addIgnoreTokens(strs(a, "ignoreTokens"));
      if (a.has("acceptPhrases")) r.acceptPhrases(strs(a, "acceptPhrases"));
      if (a.has("considerIgnore")) r.setConsiderIgnoreWords(a.get("considerIgnore").asBoolean());
    } catch (Throwable t) { res.put("setupError", err(t)); }
    List<Object> ws = new ArrayList<>();
    boolean sugg = a.has("sugg") && a.get("sugg").asBoolean();
    for (String w : strs(a, "words")) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("w", w);
      o.put("ignoreWord", safe(() -> call(r, "ignoreWord", new Class<?>[]{String.class}, w)));
      o.put("prohibited", safe(() -> call(r, "isProhibited", new Class<?>[]{String.class}, w)));
      o.put("inIgnoredSet", safe(() -> call(r, "isInIgnoredSet", new Class<?>[]{String.class}, w)));
      o.put("ignoredNoCase", safe(() -> call(r, "isIgnoredNoCase", new Class<?>[]{String.class}, w)));
      o.put("potentially", safe(() -> call(r, "ignorePotentiallyMisspelledWord", new Class<?>[]{String.class}, w)));
      o.put("startsCS", safe(() -> call(r, "startsWithIgnoredWord", new Class<?>[]{String.class, boolean.class}, w, true)));
      o.put("startsCI", safe(() -> call(r, "startsWithIgnoredWord", new Class<?>[]{String.class, boolean.class}, w, false)));
      o.put("url", safe(() -> call(r, "isUrl", new Class<?>[]{String.class}, w)));
      o.put("email", safe(() -> call(r, "isEMail", new Class<?>[]{String.class}, w)));
      o.put("misspelled", safe(() -> r.isMisspelled(w)));
      if (sugg) {
        o.put("suggestions", safe(() -> {
          try { return call(r, "getSpellingSuggestions", new Class<?>[]{String.class}, w); }
          catch (NoSuchMethodException e) { return call(r, "getSuggestions", new Class<?>[]{String.class}, w); }
        }));
      }
      ws.add(o);
    }
    res.put("words", ws);
    List<Object> ls = new ArrayList<>();
    if (a.has("lists")) for (JsonNode lst : a.get("lists")) {
      List<String> words = new ArrayList<>();
      for (JsonNode n : lst.get("words")) words.add(n.asText());
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("words", words);
      List<Object> rs = new ArrayList<>();
      for (int i = -1; i <= words.size(); i++) { final int ii = i; rs.add(safe(() -> call(r, "ignoreWord", new Class<?>[]{List.class, int.class}, words, ii))); }
      o.put("ignoreWordIdx", rs);
      ls.add(o);
    }
    res.put("lists", ls);
    if (a.has("expand")) {
      List<Object> es = new ArrayList<>();
      for (String s : strs(a, "expand")) es.add(safe(() -> call(r, "expandLine", new Class<?>[]{String.class}, s)));
      res.put("expand", es);
    }
    if (a.has("filter")) {
      List<Object> fs = new ArrayList<>();
      for (JsonNode lst : a.get("filter")) {
        List<SuggestedReplacement> in = new ArrayList<>();
        for (JsonNode n : lst) in.add(new SuggestedReplacement(n.asText()));
        fs.add(safe(() -> {
          List<String> o = new ArrayList<>();
          for (Object x : (List<?>) call(r, "filterSuggestions", new Class<?>[]{List.class}, in)) o.add(((SuggestedReplacement) x).getReplacement());
          return o;
        }));
        fs.add(safe(() -> {
          List<String> o = new ArrayList<>();
          for (Object x : (List<?>) call(r, "filterNoSuggestWords", new Class<?>[]{List.class}, in)) o.add(((SuggestedReplacement) x).getReplacement());
          return o;
        }));
      }
      res.put("filter", fs);
    }
    return res;
  }

  /** {kind: filetypes|vague|multitoken|symspell|foreign, ...} */
  static Object misc(JsonNode a) throws Exception {
    String kind = a.get("kind").asText();
    Map<String, Object> res = new LinkedHashMap<>();
    switch (kind) {
      case "filetypes": {
        res.put("pattern", CommonFileTypes.getSuffixPattern().pattern());
        res.put("flags", CommonFileTypes.getSuffixPattern().flags());
        List<Object> o = new ArrayList<>();
        for (String s : strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", s);
          m.put("matches", CommonFileTypes.getSuffixPattern().matcher(s).matches());
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "vague": {
        Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
        VagueSpellChecker v = new VagueSpellChecker();
        List<Object> o = new ArrayList<>();
        for (String s : strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", s);
          m.put("valid", safe(() -> v.isValidWord(s, l)));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "multitoken": {
        Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
        MultitokenSpeller ms = (MultitokenSpeller) safe(l::getMultitokenSpeller);
        List<Object> o = new ArrayList<>();
        if (ms == null || !(((Object) ms) instanceof MultitokenSpeller)) { res.put("speller", String.valueOf(ms)); break; }
        for (String s : strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", s);
          m.put("sugg", safe(() -> ms.getSuggestions(s)));
          m.put("suggAccepted", safe(() -> ms.getSuggestions(s, true)));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "symspell": {
        int maxDist = a.get("maxDist").asInt();
        SymSpell sp = new SymSpell(a.has("capacity") ? a.get("capacity").asInt() : -1, maxDist, a.has("prefix") ? a.get("prefix").asInt() : 7, a.has("threshold") ? a.get("threshold").asInt() : 1);
        StringBuilder sb = new StringBuilder();
        for (String s : strs(a, "lines")) sb.append(s).append('\n');
        res.put("loaded", safe(() -> sp.loadDictionary(new BufferedReader(new StringReader(sb.toString())), a.get("termIdx").asInt(), a.get("countIdx").asInt())));
        List<Object> o = new ArrayList<>();
        for (String s : strs(a, "words")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("w", s);
          for (SymSpell.Verbosity v : SymSpell.Verbosity.values()) {
            m.put("lookup" + v, safe(() -> items(sp.lookup(s, v))));
            m.put("lookup" + v + "1", safe(() -> items(sp.lookup(s, v, Math.min(1, maxDist)))));
          }
          m.put("compound", safe(() -> items(sp.lookupCompound(s))));
          m.put("compound1", safe(() -> items(sp.lookupCompound(s, Math.min(1, maxDist)))));
          m.put("segment", safe(() -> {
            Object seg = sp.wordSegmentation(s);
            Map<String, Object> q = new LinkedHashMap<>();
            for (String f : new String[]{"segmentedString", "correctedString", "distanceSum", "probabilityLogSum"}) {
              Field fl = seg.getClass().getDeclaredField(f);
              fl.setAccessible(true);
              q.put(f, fl.get(seg));
            }
            return q;
          }));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "foreign": {
        List<Object> o = new ArrayList<>();
        for (JsonNode c : a.get("cases")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("case", c);
          m.put("result", safe(() -> new ForeignLanguageChecker(c.get("lang").asText(), c.get("sentence").asText(), c.get("length").asLong(), strs(c, "preferred")).check(c.get("matches").asInt())));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      default: throw new IllegalArgumentException("kind " + kind);
    }
    return res;
  }

  private static List<String> items(List<SuggestItem> l) {
    List<String> r = new ArrayList<>();
    for (SuggestItem i : l) r.add(i.term + "|" + i.distance + "|" + i.count + "|" + i);
    return r;
  }
}
