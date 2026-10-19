package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.markup.AnnotatedText;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.RuleSet;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.util.*;
import java.util.regex.Pattern;

/** Ops for X-PIPE (F35): pipe-check, pipe-office, pipe-config. Format: docs/review/F35-oracle.md. */
final class PipeOps {
  private PipeOps() {}

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  /** Word rule that throws (kind boom) or sets newLanguageMatches (kind newlang) on each full-token regex match. */
  static final class XRule extends Rule {
    final String id, kind, how;
    final Pattern pattern;
    final Map<String, Float> langs = new LinkedHashMap<>();
    XRule(JsonNode spec) {
      id = s(spec, "id"); kind = s(spec, "kind"); how = s(spec, "throw");
      pattern = Pattern.compile(spec.get("regex").asText());
      if (spec.has("newLanguages")) {
        Iterator<Map.Entry<String, JsonNode>> it = spec.get("newLanguages").fields();
        while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); langs.put(e.getKey(), (float) e.getValue().asDouble()); }
      }
    }
    @Override public String getId() { return id; }
    @Override public String getDescription() { return "Synthetic " + id; }
    private static int depth(int n) { return depth(n + 1) + 1; }
    @Override public RuleMatch[] match(AnalyzedSentence sentence) throws java.io.IOException {
      List<RuleMatch> out = new ArrayList<>();
      AnalyzedTokenReadings[] toks = sentence.getTokensWithoutWhitespace();
      for (int i = 1; i < toks.length; i++) {
        String tok = toks[i].getToken();
        if (tok.isEmpty() || !pattern.matcher(tok).matches()) continue;
        if (kind.equals("boom")) {
          switch (how) {
            case "runtime": throw new RuntimeException("boom in " + id);
            case "io": throw new java.io.IOException("io boom in " + id);
            case "illegal": throw new IllegalStateException("illegal boom");
            case "so": depth(0);
            case "assert": throw new AssertionError("assert boom");
            default: throw new IllegalArgumentException(how);
          }
        }
        RuleMatch m = new RuleMatch(this, sentence, toks[i].getStartPos(), toks[i].getEndPos(), "new language " + tok);
        m.setNewLanguageMatches(new LinkedHashMap<>(langs));
        out.add(m);
      }
      return out.toArray(new RuleMatch[0]);
    }
  }

  static Rule build(JsonNode spec) throws Exception {
    String kind = s(spec, "kind");
    Rule r = "boom".equals(kind) || "newlang".equals(kind) ? new XRule(spec) : SynthRules.make(spec);
    if (spec.has("officeDefaultOff") && spec.get("officeDefaultOff").asBoolean()) r.setOfficeDefaultOff();
    if (spec.has("officeDefaultOn") && spec.get("officeDefaultOn").asBoolean()) r.setOfficeDefaultOn();
    if (spec.has("defaultOff") && spec.get("defaultOff").asBoolean() && r instanceof XRule) r.setDefaultOff();
    return r;
  }

  static List<Rule> buildAll(JsonNode specs) throws Exception {
    List<Rule> l = new ArrayList<>();
    if (specs != null) for (JsonNode sp : specs) l.add(build(sp));
    return l;
  }

  static RuleMatchFilter filter(JsonNode f) {
    String k = f.get("kind").asText();
    return new RuleMatchFilter() {
      @Override public List<RuleMatch> filter(List<RuleMatch> ms, AnnotatedText text) {
        List<RuleMatch> out = new ArrayList<>();
        if (k.equals("dropRule")) { for (RuleMatch m : ms) if (!m.getRule().getId().equals(f.get("id").asText())) out.add(m); return out; }
        if (k.equals("reverse")) { out.addAll(ms); Collections.reverse(out); return out; }
        if (k.equals("suffix")) { for (RuleMatch m : ms) { m.setMessage(m.getMessage() + f.get("suffix").asText() + ms.size()); out.add(m); } return out; }
        throw new IllegalArgumentException(k);
      }
    };
  }

  private static Object ranges(CheckResults cr, Map<String, Object> res) {
    List<Object> sr = new ArrayList<>();
    for (SentenceRange s : cr.getSentenceRanges()) sr.add(Arrays.asList(s.getFromPos(), s.getToPos()));
    res.put("sentenceRanges", sr);
    List<Object> er = new ArrayList<>();
    for (ExtendedSentenceRange s : cr.getExtendedSentenceRanges()) er.add(Arrays.asList(s.getFromPos(), s.getToPos(), s.getLanguageConfidenceRates()));
    res.put("extendedSentenceRanges", er);
    List<Object> ir = new ArrayList<>();
    for (Range s : cr.getIgnoredRanges()) ir.add(Arrays.asList(s.getFromPos(), s.getToPos(), s.getLang()));
    res.put("ignoredRanges", ir);
    return null;
  }

  private static Set<ToneTag> tones(JsonNode c) {
    Set<ToneTag> t = new LinkedHashSet<>();
    for (String s : ContentOps.strs(c, "toneTags")) t.add(ToneTag.valueOf(s));
    return t;
  }

  private static Map<String, Object> cacheStats(ResultCache c) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("requestCount", c.requestCount());
    m.put("hitCount", c.hitCount());
    m.put("hitRate", c.hitRate());
    m.put("matchesSize", c.getMatchesCache().size());
    m.put("sentenceSize", c.getSentenceCache().size());
    return m;
  }

  /** {lang, rules, opts:{cleanOverlapping, maxErrorsPerWordRate, threads, cache, filters, listener, verbose, listUnknownWords}, cases:[...]} -> {cases:[...]} */
  static Object check(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    JsonNode o = a.has("opts") ? a.get("opts") : com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
    ResultCache cache = o.has("cache") && !o.get("cache").isNull() ? new ResultCache(o.get("cache").asLong()) : null;
    boolean mt = o.has("threads") && !o.get("threads").isNull();
    JLanguageTool lt;
    if (mt) {
      lt = new MultiThreadedJLanguageTool(l, null, o.get("threads").asInt(), null);
      for (Rule r : buildAll(a.get("rules"))) lt.addRule(r);
      for (Rule r : lt.getAllRules()) if (!r.getId().startsWith(SynthRules.PREFIX) && !r.getId().startsWith("SYN")) lt.disableRule(r.getFullId());
    } else {
      lt = new JLanguageTool(l, Collections.emptyList(), null, cache, null, null, true, false, buildAll(a.get("rules")));
    }
    try {
      if (o.has("cleanOverlapping")) lt.setCleanOverlappingMatches(o.get("cleanOverlapping").asBoolean());
      if (o.has("maxErrorsPerWordRate")) lt.setMaxErrorsPerWordRate((float) o.get("maxErrorsPerWordRate").asDouble());
      if (o.has("listUnknownWords")) lt.setListUnknownWords(o.get("listUnknownWords").asBoolean());
      if (o.has("filters")) for (JsonNode f : o.get("filters")) lt.addMatchFilter(filter(f));
      List<String> listener = new ArrayList<>();
      RuleMatchListener rl = o.has("listener") && o.get("listener").asBoolean() ? m -> listener.add(m.getRule().getFullId() + "|" + m.getFromPos() + "|" + m.getToPos()) : null;
      boolean verbose = o.has("verbose") && o.get("verbose").asBoolean();
      List<Object> out = new ArrayList<>();
      for (JsonNode c : a.get("cases")) {
        Map<String, Object> res = new LinkedHashMap<>();
        listener.clear();
        PrintStream oldOut = System.out;
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        ByteArrayOutputStream vo = new ByteArrayOutputStream();
        try {
          System.setOut(new PrintStream(bo, true, "UTF-8"));
          if (verbose) lt.setOutput(new PrintStream(vo, true, "UTF-8"));
          if (mt && c.has("shutdownBefore") && c.get("shutdownBefore").asBoolean()) ((MultiThreadedJLanguageTool) lt).shutdown();
          if (mt && c.has("shutdownWhenDoneBefore") && c.get("shutdownWhenDoneBefore").asBoolean()) ((MultiThreadedJLanguageTool) lt).shutdownWhenDone();
          JLanguageTool.Level level = c.has("level") ? JLanguageTool.Level.valueOf(c.get("level").asText()) : JLanguageTool.Level.DEFAULT;
          JLanguageTool.Mode mode = c.has("mode") ? JLanguageTool.Mode.valueOf(c.get("mode").asText()) : JLanguageTool.Mode.ALL;
          JLanguageTool.ParagraphHandling ph = c.has("paraMode") ? JLanguageTool.ParagraphHandling.valueOf(c.get("paraMode").asText()) : JLanguageTool.ParagraphHandling.NORMAL;
          boolean tokenize = !c.has("tokenizeText") || c.get("tokenizeText").asBoolean();
          CheckResults cr = lt.check2(CheckPipeOps.annotated(c), tokenize, ph, rl, mode, level, tones(c), null);
          List<Object> ms = new ArrayList<>();
          for (RuleMatch m : cr.getRuleMatches()) ms.add(CheckPipeOps.matchDump(m));
          res.put("matches", ms);
          ranges(cr, res);
        } catch (Throwable t) {
          res.putAll(CheckPipeOps.errorOf(t));
        } finally {
          System.setOut(oldOut);
          if (verbose) lt.setOutput(null);
        }
        res.put("stdout", bo.toString("UTF-8"));
        if (verbose) res.put("verbose", vo.toString("UTF-8"));
        if (rl != null) res.put("listener", new ArrayList<>(listener));
        if (c.has("unknown") && c.get("unknown").asBoolean()) {
          try { res.put("unknownWords", lt.getUnknownWords()); } catch (Throwable t) { res.put("unknownError", CheckPipeOps.errorOf(t).get("error")); }
        }
        if (cache != null) res.put("cache", cacheStats(cache));
        out.add(res);
      }
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("cases", out);
      return r;
    } finally {
      if (mt) ((MultiThreadedJLanguageTool) lt).shutdown();
      GlobalConfig.setVerbose(false);
    }
  }

  private static List<String> fullIds(Collection<Rule> rules) {
    List<String> l = new ArrayList<>();
    for (Rule r : rules) l.add(r.getFullId());
    return l;
  }

  private static List<String> sorted(Collection<String> c) {
    List<String> l = new ArrayList<>(c);
    Collections.sort(l);
    return l;
  }

  /** {lang, rules, steps:[{do: active|disable|enable|disableCategory|state|select|check}]} -> {steps:[...]} */
  static Object office(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    JLanguageTool lt = new JLanguageTool(l, Collections.emptyList(), null, null, null, null, true, false, buildAll(a.get("rules")));
    lt.setCleanOverlappingMatches(false);
    Field ef = JLanguageTool.class.getDeclaredField("enabledRules");
    ef.setAccessible(true);
    List<Object> out = new ArrayList<>();
    for (JsonNode st : a.get("steps")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        switch (st.get("do").asText()) {
          case "office": r.put("result", fullIds(lt.getAllActiveOfficeRules())); break;
          case "active": r.put("result", fullIds(lt.getAllActiveRules())); break;
          case "disable": lt.disableRule(st.get("id").asText()); break;
          case "enable": lt.enableRule(st.get("id").asText()); break;
          case "disableCategory": lt.disableCategory(new CategoryId(st.get("id").asText())); break;
          case "state": {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("disabled", sorted(lt.getDisabledRules()));
            @SuppressWarnings("unchecked") Set<String> en = (Set<String>) ef.get(lt);
            m.put("enabled", sorted(en));
            r.put("result", m);
            break;
          }
          default: throw new IllegalArgumentException(st.get("do").asText());
        }
      } catch (Throwable t) {
        r.putAll(CheckPipeOps.errorOf(t));
      }
      out.add(r);
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("steps", out);
    return res;
  }

  private static Object typed(Object v) {
    if (v == null) return null;
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("t", v.getClass().getSimpleName());
    m.put("v", String.valueOf(v));
    return m;
  }

  private static Object untyped(JsonNode n) {
    if (n.isNull()) return null;
    String t = n.get("t").asText();
    String v = n.get("v").asText();
    switch (t) {
      case "Integer": return Integer.valueOf(v);
      case "Long": return Long.valueOf(v);
      case "Double": return Double.valueOf(v);
      case "Float": return Float.valueOf(v);
      case "Boolean": return Boolean.valueOf(v);
      case "String": return v;
      default: throw new IllegalArgumentException(t);
    }
  }

  /** {lang, steps:[{do: set{map:{id:[typed]|null}}|setNull|get{id}}]} -> {steps:[{result|error}]} with typed values {t:SimpleName, v:String.valueOf} */
  static Object config(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    UserConfig uc = new UserConfig();
    JLanguageTool lt = new JLanguageTool(l, Collections.emptyList(), null, null, null, uc, true, false, new ArrayList<>());
    List<Object> out = new ArrayList<>();
    for (JsonNode st : a.get("steps")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        switch (st.get("do").asText()) {
          case "set": {
            Map<String, Object[]> m = new LinkedHashMap<>();
            Iterator<Map.Entry<String, JsonNode>> it = st.get("map").fields();
            while (it.hasNext()) {
              Map.Entry<String, JsonNode> e = it.next();
              if (e.getValue().isNull()) { m.put(e.getKey(), null); continue; }
              List<Object> vs = new ArrayList<>();
              for (JsonNode x : e.getValue()) vs.add(untyped(x));
              m.put(e.getKey(), vs.toArray());
            }
            lt.setConfigValues(m);
            break;
          }
          case "setNull": lt.setConfigValues(null); break;
          case "get": {
            Object[] v = uc.getConfigValueByID(st.get("id").asText());
            if (v == null) r.put("result", null);
            else { List<Object> l2 = new ArrayList<>(); for (Object x : v) l2.add(typed(x)); r.put("result", l2); }
            break;
          }
          default: throw new IllegalArgumentException(st.get("do").asText());
        }
      } catch (Throwable t) {
        r.putAll(CheckPipeOps.errorOf(t));
      }
      out.add(r);
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("steps", out);
    return res;
  }
}
