package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import morfologik.stemming.Dictionary;
import org.languagetool.*;
import org.languagetool.rules.spelling.morfologik.*;
import org.languagetool.rules.spelling.morfologik.suggestions_ordering.*;

import java.io.*;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.*;

/** Ops for X-SPELL (F41): spell-speller, spell-multi, spell-rank. Format: docs/review/F41-oracle.md. */
final class SpellOps {
  private SpellOps() {}

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    if (t.getCause() != null) e.put("cause", err(t.getCause()));
    return e;
  }

  private static List<String> ws(List<WeightedSuggestion> l) {
    List<String> r = new ArrayList<>();
    for (WeightedSuggestion w : l) r.add(w.toString());
    return r;
  }

  private static boolean b(JsonNode a, String k) { return a.has(k) && a.get(k).asBoolean(); }

  /** {dict, info?, dist, words, extra?} -> per word isMisspelled / getFrequency / getSuggestions (word/weight) [/ findReplacements / findSimilarWords] */
  static Object speller(JsonNode a) throws Exception {
    Map<String, Object> out = new LinkedHashMap<>();
    int dist = a.has("dist") ? a.get("dist").asInt() : 1;
    MorfologikSpeller sp;
    try {
      if (a.has("info")) {
        Dictionary d = FsaOps.open(a);
        Constructor<MorfologikSpeller> c = MorfologikSpeller.class.getDeclaredConstructor(Dictionary.class, int.class);
        c.setAccessible(true);
        sp = c.newInstance(d, dist);
      } else {
        sp = new MorfologikSpeller(a.get("dict").asText(), dist);
      }
    } catch (java.lang.reflect.InvocationTargetException e) {
      out.put("error", err(e.getCause()));
      return out;
    } catch (Throwable t) {
      out.put("error", err(t));
      return out;
    }
    out.put("toString", sp.toString());
    out.put("convertsCase", sp.convertsCase());
    List<Object> res = new ArrayList<>();
    for (JsonNode w : a.get("words")) {
      String word = w.asText();
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("w", word);
      try { r.put("mis", sp.isMisspelled(word)); } catch (Throwable t) { r.put("misErr", err(t)); }
      try { r.put("freq", sp.getFrequency(word)); } catch (Throwable t) { r.put("freqErr", err(t)); }
      if (!b(a, "noSugg")) try { r.put("sugg", ws(sp.getSuggestions(word))); } catch (Throwable t) { r.put("suggErr", err(t)); }
      if (b(a, "extra")) {
        try { r.put("repl", sp.findReplacements(word)); } catch (Throwable t) { r.put("replErr", err(t)); }
        try { r.put("similar", sp.findSimilarWords(word)); } catch (Throwable t) { r.put("similarErr", err(t)); }
      }
      res.add(r);
    }
    out.put("results", res);
    return out;
  }

  /** {binary, dist, lists?:[{path, lines}], paths?, variant?, variantLines?, lang?, userWords?, userCache?, userName?, words} */
  static Object multi(JsonNode a) throws Exception {
    Map<String, Object> out = new LinkedHashMap<>();
    int dist = a.has("dist") ? a.get("dist").asInt() : 1;
    Language lang = a.has("lang") ? Languages.getLanguageForShortCode(a.get("lang").asText()) : null;
    UserConfig uc = null;
    if (a.has("userWords")) {
      List<String> uw = new ArrayList<>();
      for (JsonNode n : a.get("userWords")) uw.add(n.asText());
      Long cache = a.has("userCache") ? a.get("userCache").asLong() : null;
      uc = new UserConfig(uw, new ArrayList<>(), new HashMap<>(), 0, 1L, a.has("userName") ? a.get("userName").asText() : null, cache, null, false, null, null, false, new ArrayList<>(), false, false, false);
    }
    MorfologikMultiSpeller ms;
    try {
      String bin = a.get("binary").asText();
      if (a.has("lists")) {
        List<String> paths = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        for (JsonNode l : a.get("lists")) {
          paths.add(l.get("path").asText());
          for (JsonNode x : l.get("lines")) sb.append(x.asText()).append('\n');
        }
        BufferedReader rd = new BufferedReader(new StringReader(sb.toString()));
        BufferedReader vr = null;
        String vp = null;
        if (a.has("variantLines")) {
          StringBuilder vb = new StringBuilder();
          for (JsonNode x : a.get("variantLines")) vb.append(x.asText()).append('\n');
          vr = new BufferedReader(new StringReader(vb.toString()));
          vp = a.get("variant").asText();
        }
        ms = new MorfologikMultiSpeller(bin, rd, paths, vr, vp, uc, dist, lang);
      } else {
        List<String> paths = new ArrayList<>();
        for (JsonNode n : a.get("paths")) paths.add(n.isNull() ? null : n.asText());
        ms = new MorfologikMultiSpeller(bin, paths, a.has("variant") ? a.get("variant").asText() : null, uc, dist, lang);
      }
    } catch (Throwable t) {
      out.put("error", err(t));
      return out;
    }
    out.put("convertsCase", ms.convertsCase());
    List<Object> res = new ArrayList<>();
    for (JsonNode w : a.get("words")) {
      String word = w.asText();
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("w", word);
      try { r.put("mis", ms.isMisspelled(word)); } catch (Throwable t) { r.put("misErr", err(t)); }
      try { r.put("freq", ms.getFrequency(word)); } catch (Throwable t) { r.put("freqErr", err(t)); }
      try { r.put("sugg", ms.getSuggestions(word)); } catch (Throwable t) { r.put("suggErr", err(t)); }
      try { r.put("def", ws(ms.getWeightedSuggestionsFromDefaultDicts(word))); } catch (Throwable t) { r.put("defErr", err(t)); }
      try { r.put("user", ws(ms.getWeightedSuggestionsFromUserDicts(word))); } catch (Throwable t) { r.put("userErr", err(t)); }
      res.add(r);
    }
    out.put("results", res);
    return out;
  }

  private static DetailedDamerauLevenstheinDistance.EditOperation edit(String name, long seed) throws Exception {
    DetailedDamerauLevenstheinDistance.EditOperation op;
    switch (name) {
      case "insert": op = new DetailedDamerauLevenstheinDistance.Insert(); break;
      case "delete": op = new DetailedDamerauLevenstheinDistance.Delete(); break;
      case "replace": op = new DetailedDamerauLevenstheinDistance.Replace(); break;
      case "transpose": op = new DetailedDamerauLevenstheinDistance.Transpose(); break;
      default: throw new IllegalArgumentException(name);
    }
    Field f = DetailedDamerauLevenstheinDistance.EditOperation.class.getDeclaredField("random");
    f.setAccessible(true);
    f.set(op, new Random(seed));
    return op;
  }

  private static Object dist(DetailedDamerauLevenstheinDistance.Distance d) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("value", d.value());
    m.put("i", d.inserts); m.put("d", d.deletes); m.put("r", d.replaces); m.put("t", d.transposes);
    m.put("str", d.toString().replaceAll("@[0-9a-f]+", "@H"));
    return m;
  }

  /** {fn: compare|edits|weighted|config|distance} */
  static Object rank(JsonNode a) throws Exception {
    String fn = a.get("fn").asText();
    List<Object> out = new ArrayList<>();
    switch (fn) {
      case "compare":
        for (JsonNode p : a.get("pairs")) {
          Map<String, Object> r = new LinkedHashMap<>();
          String s1 = p.get(0).isNull() ? null : p.get(0).asText(), s2 = p.get(1).isNull() ? null : p.get(1).asText();
          r.put("a", s1); r.put("b", s2);
          try { r.put("d", dist(DetailedDamerauLevenstheinDistance.compare(s1, s2))); } catch (Throwable t) { r.put("error", err(t)); }
          out.add(r);
        }
        return out;
      case "edits": // {op, seed, inputs, repeat}
        for (JsonNode in : a.get("inputs")) {
          Map<String, Object> r = new LinkedHashMap<>();
          r.put("in", in.asText());
          List<Object> seq = new ArrayList<>();
          try {
            DetailedDamerauLevenstheinDistance.EditOperation op = edit(a.get("op").asText(), a.get("seed").asLong());
            String cur = in.asText();
            for (int i = 0; i < a.get("repeat").asInt(); i++) {
              try { String n = op.apply(cur); seq.add(n); cur = n == null ? cur : n; } catch (Throwable t) { seq.add(err(t)); }
            }
          } catch (Throwable t) { seq.add(err(t)); }
          r.put("seq", seq);
          out.add(r);
        }
        return out;
      case "distance": { // Distance value object: builds via op chain
        DetailedDamerauLevenstheinDistance.Distance d = new DetailedDamerauLevenstheinDistance.Distance();
        for (JsonNode o : a.get("chain")) {
          switch (o.asText()) {
            case "insert": d = d.insert(); break;
            case "delete": d = d.delete(); break;
            case "replace": d = d.replace(); break;
            case "transpose": d = d.transpose(); break;
            case "track-insert": d = d.track(edit("insert", 1)); break;
            case "track-delete": d = d.track(edit("delete", 1)); break;
            case "track-replace": d = d.track(edit("replace", 1)); break;
            case "track-transpose": d = d.track(edit("transpose", 1)); break;
            case "track-anon": try { d = d.track(new DetailedDamerauLevenstheinDistance.EditOperation() { public String apply(String s) { return s; } }); } catch (Throwable t) { out.add(err(t)); } break;
            default: throw new IllegalArgumentException(o.asText());
          }
          out.add(dist(d));
        }
        DetailedDamerauLevenstheinDistance.Distance e = new DetailedDamerauLevenstheinDistance.Distance(a.get("eq").get(0).asInt(), a.get("eq").get(1).asInt(), a.get("eq").get(2).asInt(), a.get("eq").get(3).asInt());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("equalsChain", d.equals(e)); m.put("equalsSelf", d.equals(d)); m.put("equalsNull", d.equals(null)); m.put("equalsOther", d.equals("x"));
        out.add(m);
        return out;
      }
      case "weighted": { // {items:[[word, weight]]} -> toString, sorted order, compareTo matrix
        List<WeightedSuggestion> l = new ArrayList<>();
        for (JsonNode it : a.get("items")) {
          try { l.add(new WeightedSuggestion(it.get(0).isNull() ? null : it.get(0).asText(), it.get(1).asInt())); } catch (Throwable t) { out.add(err(t)); }
        }
        out.add(ws(l));
        List<WeightedSuggestion> s = new ArrayList<>(l);
        Collections.sort(s);
        out.add(ws(s));
        List<Object> cmp = new ArrayList<>();
        for (WeightedSuggestion x : l) for (WeightedSuggestion y : l) cmp.add(Integer.signum(x.compareTo(y)));
        out.add(cmp);
        return out;
      }
      case "config": {
        String prev = System.getProperty("enableMLSuggestionsOrdering");
        try {
          for (JsonNode v : a.get("props")) {
            if (v.isNull()) System.clearProperty("enableMLSuggestionsOrdering"); else System.setProperty("enableMLSuggestionsOrdering", v.asText());
            out.add(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled());
          }
          SuggestionsOrdererConfig.setMLSuggestionsOrderingEnabled(true);
          out.add(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled()); out.add(System.getProperty("enableMLSuggestionsOrdering"));
          SuggestionsOrdererConfig.setMLSuggestionsOrderingEnabled(false);
          out.add(SuggestionsOrdererConfig.isMLSuggestionsOrderingEnabled()); out.add(System.getProperty("enableMLSuggestionsOrdering"));
        } finally {
          if (prev == null) System.clearProperty("enableMLSuggestionsOrdering"); else System.setProperty("enableMLSuggestionsOrdering", prev);
        }
        return out;
      }
      default: throw new IllegalArgumentException(fn);
    }
  }
}
