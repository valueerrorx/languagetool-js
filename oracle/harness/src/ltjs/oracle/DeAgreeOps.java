package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.de.*;
import org.languagetool.tagging.de.GermanToken;

import java.lang.reflect.*;
import java.util.*;

/** Op lang-deagree (F54/F55): direct calls into DE agreement helpers. Format: docs/review/F54-oracle.md. */
final class DeAgreeOps {
  private DeAgreeOps() {}

  static Object run(JsonNode a) throws Exception {
    switch (a.get("mode").asText()) {
      case "suggest": return suggest(a);
      case "helper": return helper(a);
      case "tools": return tools(a);
      case "names": return names();
      default: throw new IllegalArgumentException("mode");
    }
  }

  private static AnalyzedTokenReadings tok(List<AnalyzedTokenReadings> t, JsonNode c, String k) {
    return c.has(k) && !c.get(k).isNull() ? t.get(c.get(k).asInt()) : null;
  }

  /** {lang, cases:[{text, det, adj1?, adj2?, noun, type?, prep?, skipped?}]} -> per case tokens + suggestions (all, filtered) */
  private static Object suggest(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    JLanguageTool lt = new JLanguageTool(l);
    Class<?> sc = Class.forName("org.languagetool.rules.de.AgreementSuggestor2");
    Class<?> rt = Class.forName("org.languagetool.rules.de.AgreementRule$ReplacementType");
    Constructor<?> ctor = sc.getDeclaredConstructor(org.languagetool.synthesis.Synthesizer.class, AnalyzedTokenReadings.class, AnalyzedTokenReadings.class, AnalyzedTokenReadings.class, AnalyzedTokenReadings.class, rt);
    ctor.setAccessible(true);
    Method gs = sc.getDeclaredMethod("getSuggestions", boolean.class); gs.setAccessible(true);
    Method sp = sc.getDeclaredMethod("setPreposition", AnalyzedTokenReadings.class); sp.setAccessible(true);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        List<AnalyzedTokenReadings> t = Arrays.asList(lt.getAnalyzedSentence(c.get("text").asText()).getTokensWithoutWhitespace());
        List<String> toks = new ArrayList<>();
        for (AnalyzedTokenReadings x : t) toks.add(x.getToken());
        r.put("tokens", toks);
        Object type = null;
        if (c.has("type") && !c.get("type").isNull()) type = rt.getField(c.get("type").asText()).get(null);
        Object s = ctor.newInstance(l.getSynthesizer(), tok(t, c, "det"), tok(t, c, "adj1"), tok(t, c, "adj2"), tok(t, c, "noun"), type);
        if (c.has("prep")) sp.invoke(s, tok(t, c, "prep"));
        if (c.has("skipped")) sc.getMethod("setSkipped", String.class).invoke(s, c.get("skipped").asText());
        r.put("suggestions", gs.invoke(s, false));
        r.put("suggestionsFiltered", gs.invoke(s, true));
      } catch (Throwable e) { r.put("error", CheckPipeOps.errorOf(e)); }
      out.add(r);
    }
    return Collections.singletonMap("cases", out);
  }

  /** {posTags:[..], chars:[..], types: bool, text?, tokens?:[idx]} -> GermanHelper getters, GermanTools.isVowel, hasReadingOfType */
  private static Object helper(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    List<Object> tags = new ArrayList<>();
    if (a.has("posTags")) for (JsonNode p : a.get("posTags")) {
      Map<String, Object> r = new LinkedHashMap<>();
      String s = p.isNull() ? null : p.asText();
      r.put("posTag", s);
      for (String m : new String[]{"getNounCase", "getNounNumber", "getNounGender", "getDeterminerDefiniteness", "getComparison", "getDeterminerCase", "getDeterminerNumber", "getDeterminerGender"}) {
        try { r.put(m, GermanHelper.class.getMethod(m, String.class).invoke(null, s)); } catch (Throwable e) { r.put(m, Collections.singletonMap("error", CheckPipeOps.errorOf(e))); }
      }
      tags.add(r);
    }
    res.put("posTags", tags);
    List<Object> vowels = new ArrayList<>();
    if (a.has("chars")) for (JsonNode ch : a.get("chars")) {
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("char", ch.asText());
      r.put("isVowel", GermanTools.isVowel(ch.asText().charAt(0)));
      vowels.add(r);
    }
    res.put("vowels", vowels);
    if (a.has("texts")) {
      Language l = Languages.getLanguageForShortCode(a.has("lang") ? a.get("lang").asText() : "de-DE");
      JLanguageTool lt = new JLanguageTool(l);
      List<Object> rs = new ArrayList<>();
      for (JsonNode tx : a.get("texts")) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("text", tx.asText());
        List<Object> toks = new ArrayList<>();
        for (AnalyzedTokenReadings t : lt.getAnalyzedSentence(tx.asText()).getTokensWithoutWhitespace()) {
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("token", t.getToken());
          List<String> types = new ArrayList<>();
          for (Field f : GermanToken.POSType.class.getFields()) if (f.getType() == GermanToken.POSType.class && GermanHelper.hasReadingOfType(t, (GermanToken.POSType) f.get(null))) types.add(f.getName());
          o.put("types", types);
          o.put("nullType", GermanHelper.hasReadingOfType(null, GermanToken.POSType.NOMEN));
          toks.add(o);
        }
        r.put("tokens", toks);
        rs.add(r);
      }
      res.put("texts", rs);
    }
    return res;
  }

  /** {prepositions:[..], lang, texts:[..], omits:[[..]]} -> PrepositionToCases.getCasesFor, AgreementTools.getAgreementCategories */
  private static Object tools(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    Class<?> pc = Class.forName("org.languagetool.rules.de.PrepositionToCases");
    Method gc = pc.getDeclaredMethod("getCasesFor", String.class); gc.setAccessible(true);
    List<Object> ps = new ArrayList<>();
    if (a.has("prepositions")) for (JsonNode p : a.get("prepositions")) {
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("prep", p.isNull() ? null : p.asText());
      try { List<?> cs = (List<?>) gc.invoke(null, p.isNull() ? null : p.asText()); List<String> o = null; if (cs != null) { o = new ArrayList<>(); for (Object x : cs) o.add(x.toString()); } r.put("cases", o); }
      catch (Throwable e) { r.put("error", CheckPipeOps.errorOf(e)); }
      ps.add(r);
    }
    res.put("prepositions", ps);
    if (a.has("texts")) {
      Language l = Languages.getLanguageForShortCode(a.has("lang") ? a.get("lang").asText() : "de-DE");
      JLanguageTool lt = new JLanguageTool(l);
      Class<?> at = Class.forName("org.languagetool.rules.de.AgreementTools");
      Class<?> gcat = Class.forName("org.languagetool.rules.de.AgreementRule$GrammarCategory");
      Method m1 = at.getDeclaredMethod("getAgreementCategories", AnalyzedTokenReadings.class, Set.class, boolean.class); m1.setAccessible(true);
      Method m2 = at.getDeclaredMethod("getAgreementSOLCategories", AnalyzedTokenReadings.class, Set.class); m2.setAccessible(true);
      List<Object> rs = new ArrayList<>();
      for (JsonNode tx : a.get("texts")) {
        List<Object> toks = new ArrayList<>();
        for (AnalyzedTokenReadings t : lt.getAnalyzedSentence(tx.asText()).getTokensWithoutWhitespace()) {
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("token", t.getToken());
          List<Object> vs = new ArrayList<>();
          for (JsonNode om : a.get("omits")) {
            Set<Object> omit = new HashSet<>();
            for (JsonNode n : om) omit.add(Enum.valueOf((Class) gcat, n.asText()));
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("omit", om);
            for (boolean skip : new boolean[]{false, true}) {
              try { v.put("cats_skipSol=" + skip, new TreeSet<>((Set<String>) m1.invoke(null, t, omit, skip))); } catch (Throwable e) { v.put("cats_skipSol=" + skip, CheckPipeOps.errorOf(e)); }
            }
            try { v.put("sol", new TreeSet<>((Set<String>) m2.invoke(null, t, omit))); } catch (Throwable e) { v.put("sol", CheckPipeOps.errorOf(e)); }
            vs.add(v);
          }
          o.put("variants", vs);
          toks.add(o);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("text", tx.asText()); r.put("tokens", toks);
        rs.add(r);
      }
      res.put("texts", rs);
    }
    return res;
  }

  private static Object names() {
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("names", new ArrayList<>(LanguageNames.get()));
    r.put("regex", LanguageNames.getAsRegex());
    return r;
  }
}
