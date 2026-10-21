package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-RULEINFRA: infra-harvest, regex-match, rule-transform, rule-text-match, rule-filter, hints-real. Format: docs/review/F30-oracle.md. */
final class RuleInfraOps {
  private RuleInfraOps() {}

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  static Object err(Throwable t) {
    while ((t instanceof java.lang.reflect.InvocationTargetException) && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t instanceof NullPointerException ? null : t.getMessage());
    List<Object> causes = new ArrayList<>();
    for (Throwable c = t.getCause(); c != null && causes.size() < 20; c = c.getCause()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("class", c.getClass().getName());
      m.put("message", c instanceof NullPointerException ? null : c.getMessage());
      causes.add(m);
    }
    e.put("causes", causes);
    return Collections.singletonMap("error", e);
  }

  // ---- rule loading ----
  private static final Map<String, List<AbstractPatternRule>> INLINE = new HashMap<>();

  static List<AbstractPatternRule> rules(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    if (a.has("xml")) {
      String xml = a.get("xml").asText();
      String key = l.getShortCodeWithCountryAndVariant() + "|" + xml;
      List<AbstractPatternRule> r = INLINE.get(key);
      if (r == null) {
        r = new PatternRuleLoader().getRules(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), "inline.xml", l);
        INLINE.put(key, r);
      }
      return r;
    }
    List<String> names = l.getRuleFileNames();
    List<AbstractPatternRule> all = new ArrayList<>();
    if (a.has("files")) {
      for (JsonNode f : a.get("files")) all.addAll(RuleLoadOps.loadFile(l, names.get(f.asInt())));
    } else {
      for (String n : names) {
        try { all.addAll(RuleLoadOps.loadFile(l, n)); } catch (Throwable t) { /* unloadable file skipped, as in harvest */ }
      }
    }
    return all;
  }

  static AbstractPatternRule resolve(JsonNode src, JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<AbstractPatternRule> rules;
    if (!src.has("file")) {
      ObjectNodeHolder h = new ObjectNodeHolder(a);
      rules = rules(h.a);
    } else {
      rules = RuleLoadOps.loadFile(l, l.getRuleFileNames().get(src.get("file").asInt()));
    }
    return rules.get(src.has("rule") ? src.get("rule").asInt() : 0);
  }

  private static final class ObjectNodeHolder {
    final JsonNode a;
    ObjectNodeHolder(JsonNode a) {
      com.fasterxml.jackson.databind.node.ObjectNode o = a.deepCopy();
      o.remove("files");
      this.a = o;
    }
  }

  static List<AnalyzedSentence> sentences(Language l, String text) throws Exception {
    JLanguageTool lt = SeqMatchOps.tool(l);
    List<AnalyzedSentence> out = new ArrayList<>();
    for (String s : lt.sentenceTokenize(text)) out.add(RuleMatchOps.sentence(l, JsonNodeFactory.instance.textNode(s)));
    return out;
  }

  private static Object fld(Object o, Class<?> c, String n) {
    try {
      Field f = c.getDeclaredField(n);
      f.setAccessible(true);
      return f.get(o);
    } catch (Exception e) { throw new RuntimeException(e); }
  }

  private static String kind(AbstractPatternRule r) {
    if (r instanceof RegexPatternRule) return "regex";
    if (r instanceof PatternRule) return "pattern";
    return r.getClass().getName();
  }

  // ---- infra-harvest: {lang} -> {files, rules:[[f,r,kind,id,subId,minPrev,distTokens,filterClass,filterArgs,correct[],incorrect[],premium]]} ----
  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<String> names = l.getRuleFileNames();
    List<Object> out = new ArrayList<>();
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rules;
      try { rules = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rules.size(); r++) {
        AbstractPatternRule ar = rules.get(r);
        List<String> cs = new ArrayList<>(), is = new ArrayList<>();
        for (CorrectExample e : ar.getCorrectExamples()) cs.add(RuleMatchOps.clean(e.getExample()));
        for (IncorrectExample e : ar.getIncorrectExamples()) is.add(RuleMatchOps.clean(e.getExample()));
        String fc = null;
        Object rf = ar instanceof RegexPatternRule ? fld(ar, RegexPatternRule.class, "regexFilter") : ar.getFilter();
        if (rf != null) fc = rf.getClass().getName();
        out.add(Arrays.asList(f, r, kind(ar), ar.getId(), ar.getSubId(), ar.getMinPrevMatches(), ar.getDistanceTokens(), fc, ar.getFilterArguments(), cs, is, ar.isPremium()));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("files", names);
    o.put("rules", out);
    return o;
  }

  // ---- regex-match ----
  private static Object regexRuleDump(AbstractPatternRule r) throws Exception {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("kind", kind(r));
    o.put("id", r.getId());
    o.put("subId", r.getSubId());
    o.put("fullId", r.getFullId());
    o.put("description", r.getDescription());
    o.put("message", r.getMessage());
    o.put("suggestionsOutMsg", r.getSuggestionsOutMsg());
    o.put("filterArgs", r.getFilterArguments());
    if (r instanceof RegexPatternRule) {
      RegexPatternRule rr = (RegexPatternRule) r;
      o.put("pattern", rr.getPattern().pattern());
      o.put("flags", rr.getPattern().flags());
      o.put("markGroup", fld(rr, RegexPatternRule.class, "markGroup"));
      o.put("caseSensitive", fld(rr, RegexPatternRule.class, "caseSensitive"));
      o.put("shortMessage", fld(rr, RegexPatternRule.class, "shortMessage"));
      Object rf = fld(rr, RegexPatternRule.class, "regexFilter");
      o.put("regexFilter", rf == null ? null : rf.getClass().getName());
      o.put("toString", rr.toString());
      o.put("estimateContextForSureMatch", rr.estimateContextForSureMatch());
    }
    return o;
  }

  /** {lang, xml?, texts:[string], jobs:[{src:{file,rule}|{rule}, texts:[i]}]} -> {texts, jobs:[{rule, per:[{matches[],sug,sugOut}|{error}]}|{error}]} */
  static Object regexMatch(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<Object> info = new ArrayList<>();
    List<AnalyzedSentence> texts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      try {
        AnalyzedSentence s = RuleMatchOps.sentence(l, tn);
        texts.add(s);
        info.add(s.getTokensWithoutWhitespace().length);
      } catch (Throwable t) { texts.add(null); info.add(err(t)); }
    }
    List<Object> jobs = new ArrayList<>();
    Method outM;
    try {
      outM = AbstractPatternRule.class.getDeclaredMethod("getSuggestionMatchesOutMsg");
      outM.setAccessible(true);
    } catch (Exception e) { throw new RuntimeException(e); }
    for (JsonNode job : a.get("jobs")) {
      try {
        AbstractPatternRule rule = resolve(job.get("src"), a);
        Map<String, Object> jo = new LinkedHashMap<>();
        jo.put("rule", regexRuleDump(rule));
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          AnalyzedSentence s = texts.get(ti.asInt());
          if (s == null) { per.add(null); continue; }
          try {
            RuleMatch[] ms = rule.match(s);
            Map<String, Object> o = new LinkedHashMap<>();
            List<Object> md = new ArrayList<>();
            for (RuleMatch m : ms) md.add(RuleMatchOps.dump(m));
            o.put("matches", md);
            o.put("sug", rule.getSuggestionMatches().size());
            o.put("sugOut", ((List<?>) outM.invoke(rule)).size());
            per.add(o);
          } catch (Throwable t) { per.add(err(t)); }
        }
        jo.put("per", per);
        jobs.add(jo);
      } catch (Throwable t) { jobs.add(err(t)); }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", info);
    o.put("jobs", jobs);
    return o;
  }

  // ---- rule-transform ----
  private static PatternRuleTransformer transformer(String name, Language l) {
    return "repeated".equals(name) ? new RepeatedPatternRuleTransformer(l) : new ConsistencyPatternRuleTransformer(l);
  }

  private static final String[] SUPPORT = {"de-DE", "de-AT", "en-US", "en-GB", "fr"};

  private static Object ruleBrief(Rule r) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("class", r.getClass().getName());
    o.put("id", r.getId());
    o.put("subId", r.getSubId());
    if (r instanceof AbstractPatternRule) {
      o.put("kind", kind((AbstractPatternRule) r));
      o.put("fullId", ((AbstractPatternRule) r).getFullId());
    }
    return o;
  }

  private static Object transformedDump(Rule r) throws Exception {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("class", r.getClass().getName());
    o.put("id", r.getId());
    o.put("description", r.getDescription());
    o.put("premium", r.isPremium());
    o.put("minToCheckParagraph", ((TextLevelRule) r).minToCheckParagraph());
    List<AbstractPatternRule> wrapped;
    if (r instanceof RepeatedPatternRuleTransformer.RepeatedPatternRule) wrapped = ((RepeatedPatternRuleTransformer.RepeatedPatternRule) r).getWrappedRules();
    else wrapped = ((ConsistencyPatternRuleTransformer.ConsistencyPatternRule) r).getWrappedRules();
    List<Object> w = new ArrayList<>();
    for (AbstractPatternRule x : wrapped) w.add(Arrays.asList(x.getFullId(), x.getMinPrevMatches(), x.getDistanceTokens()));
    o.put("wrapped", w);
    Map<String, Object> sup = new LinkedHashMap<>();
    for (String c : SUPPORT) sup.put(c, r.supportsLanguage(RuleLoadOps.lang(c)));
    o.put("supports", sup);
    return o;
  }

  /** {lang, xml?|files?, transformer:"repeated"|"consistency"|"tool"} -> {n, remaining:[brief], transformed:[dump]} ; "tool" = JLanguageTool#transformPatternRules (private, reflective) */
  static Object ruleTransform(JsonNode a) {
    try {
      return ruleTransform0(a);
    } catch (Throwable t) {
      return err(t);
    }
  }

  private static Object ruleTransform0(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<AbstractPatternRule> rules = rules(a);
    String which = a.get("transformer").asText();
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("n", rules.size());
    if (which.equals("tool")) {
      Method m = JLanguageTool.class.getDeclaredMethod("transformPatternRules", List.class, Language.class);
      m.setAccessible(true);
      JLanguageTool lt = SeqMatchOps.tool(l);
      @SuppressWarnings("unchecked") List<Rule> res = (List<Rule>) m.invoke(lt, rules, l);
      List<Object> out = new ArrayList<>();
      for (Rule r : res) out.add(ruleBrief(r));
      o.put("result", out);
      return o;
    }
    PatternRuleTransformer.TransformedRules tr = transformer(which, l).apply(rules);
    List<Object> rem = new ArrayList<>();
    for (AbstractPatternRule r : tr.getRemainingRules()) rem.add(ruleBrief(r));
    List<Object> trans = new ArrayList<>();
    for (Rule r : tr.getTransformedRules()) trans.add(transformedDump(r));
    o.put("remaining", rem);
    o.put("transformed", trans);
    return o;
  }

  // ---- rule-text-match ----
  /** {lang, xml?|files?, transformer, texts:[string], jobs:[{rule:i, texts:[i]}]} -> {nTransformed, sentences:[n per text], jobs:[{id, per:[{matches[]}|{error}]}|{error}]} */
  static Object ruleTextMatch(JsonNode a) {
    try {
      return ruleTextMatch0(a);
    } catch (Throwable t) {
      return err(t);
    }
  }

  private static Object ruleTextMatch0(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    l.getDisambiguator(); // loads disambiguation.xml (unifier config used by antipatterns), as JLanguageTool does
    SeqMatchOps.tool(l);
    List<AbstractPatternRule> rules = rules(a);
    PatternRuleTransformer.TransformedRules tr = transformer(a.get("transformer").asText(), l).apply(rules);
    List<Rule> trans = tr.getTransformedRules();
    List<List<AnalyzedSentence>> texts = new ArrayList<>();
    List<Object> counts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      try {
        List<AnalyzedSentence> ss = sentences(l, tn.asText());
        texts.add(ss);
        counts.add(ss.size());
      } catch (Throwable t) { texts.add(null); counts.add(err(t)); }
    }
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      try {
        TextLevelRule r = (TextLevelRule) trans.get(job.get("rule").asInt());
        Map<String, Object> jo = new LinkedHashMap<>();
        jo.put("id", r.getId());
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          List<AnalyzedSentence> ss = texts.get(ti.asInt());
          if (ss == null) { per.add(null); continue; }
          try {
            RuleMatch[] ms = r.match(ss);
            List<Object> md = new ArrayList<>();
            for (RuleMatch m : ms) md.add(RuleMatchOps.dump(m));
            per.add(Collections.singletonMap("matches", md));
          } catch (Throwable t) { per.add(err(t)); }
        }
        jo.put("per", per);
        jobs.add(jo);
      } catch (Throwable t) { jobs.add(err(t)); }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("nTransformed", trans.size());
    o.put("sentences", counts);
    o.put("jobs", jobs);
    return o;
  }

  // ---- rule-filter ----
  static final class Echo extends RuleFilter {
    Object seen;

    @Override
    public RuleMatch acceptRuleMatch(RuleMatch match, Map<String, String> arguments, int patternTokenPos, AnalyzedTokenReadings[] patternTokens, List<Integer> tokenPositions) throws IOException {
      Map<String, Object> s = new LinkedHashMap<>();
      s.put("args", pairs(arguments));
      s.put("patternTokenPos", patternTokenPos);
      List<Object> toks = new ArrayList<>();
      for (AnalyzedTokenReadings t : patternTokens) toks.add(t.getToken());
      s.put("tokens", toks);
      s.put("tokenPositions", new ArrayList<>(tokenPositions));
      s.put("match", match == null ? null : Arrays.asList(match.getFromPos(), match.getToPos(), match.getMessage()));
      seen = s;
      if (arguments.containsKey("throw")) throw new IllegalStateException("boom");
      if (arguments.containsKey("io")) throw new IOException("io-boom");
      if (arguments.containsKey("reject")) return null;
      return match;
    }

    String getRequired_(String k, Map<String, String> m) { return getRequired(k, m); }
    String getOptional_(String k, Map<String, String> m) { return getOptional(k, m); }
    String getOptional_(String k, Map<String, String> m, String d) { return getOptional(k, m, d); }
    int getPosition_(String s, AnalyzedTokenReadings[] t, RuleMatch m) { return getPosition(s, t, m); }
    boolean isMatchAtSentenceStart_(AnalyzedTokenReadings[] t, RuleMatch m) { return isMatchAtSentenceStart(t, m); }
    int getSkipCorrectedReference_(List<Integer> p, int r) { return getSkipCorrectedReference(p, r); }
  }

  static List<Object> pairs(Map<String, String> m) {
    List<Object> l = new ArrayList<>();
    for (Map.Entry<String, String> e : m.entrySet()) l.add(Arrays.asList(e.getKey(), e.getValue()));
    return l;
  }

  private static Map<String, String> pairMap(JsonNode n) {
    Map<String, String> m = new HashMap<>();
    if (n != null) for (JsonNode p : n) m.put(p.get(0).asText(), str(p.get(1)));
    return m;
  }

  private static List<Integer> ints(JsonNode n) {
    List<Integer> l = new ArrayList<>();
    if (n != null) for (JsonNode x : n) l.add(x.asInt());
    return l;
  }

  private static AnalyzedTokenReadings[] tokens(Language l, JsonNode a) throws Exception {
    AnalyzedTokenReadings[] all;
    if (a.has("text")) {
      all = RuleMatchOps.sentence(l, a.get("text")).getTokensWithoutWhitespace();
    } else {
      List<AnalyzedTokenReadings> li = new ArrayList<>();
      int pos = 0;
      for (JsonNode t : a.get("tokens")) {
        li.add(new AnalyzedTokenReadings(new AnalyzedToken(t.asText(), null, null), pos));
        pos += t.asText().length();
      }
      all = li.toArray(new AnalyzedTokenReadings[0]);
    }
    if (a.has("window")) return Arrays.copyOfRange(all, a.get("window").get(0).asInt(), a.get("window").get(1).asInt());
    return all;
  }

  private static final class FakeRule extends Rule {
    @Override public String getId() { return "FAKE_ID"; }
    @Override public String getDescription() { return "fake"; }
    @Override public RuleMatch[] match(AnalyzedSentence sentence) { return RuleMatch.EMPTY_ARRAY; }
  }

  /** {kind:"resolve"|"run"|"helper", lang, ...} see docs/review/F30-oracle.md */
  static Object ruleFilter(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    String kind = a.get("kind").asText();
    try {
      Echo echo = new Echo();
      switch (kind) {
        case "resolve": {
          AnalyzedTokenReadings[] t = tokens(l, a);
          Map<String, String> r = new RuleFilterEvaluator(echo).getResolvedArguments(a.get("filterArgs").asText(), t, a.get("patternTokenPos").asInt(), ints(a.get("tokenPositions")));
          return Collections.singletonMap("pairs", pairs(r));
        }
        case "run": {
          AnalyzedTokenReadings[] t = tokens(l, a);
          Rule rule = a.has("src") ? resolve(a.get("src"), a) : new FakeRule();
          RuleMatch m = new RuleMatch(rule, null, a.has("from") ? a.get("from").asInt() : 0, a.has("to") ? a.get("to").asInt() : 1, "msg");
          RuleMatch res = new RuleFilterEvaluator(echo).runFilter(a.get("filterArgs").asText(), m, t, a.get("patternTokenPos").asInt(), ints(a.get("tokenPositions")));
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("result", res == null ? null : (res == m ? "same" : "other"));
          o.put("seen", echo.seen);
          return o;
        }
        case "helper": {
          String method = a.get("method").asText();
          Map<String, String> map = pairMap(a.get("map"));
          switch (method) {
            case "getRequired": return Collections.singletonMap("value", echo.getRequired_(a.get("key").asText(), map));
            case "getOptional": return Collections.singletonMap("value", echo.getOptional_(a.get("key").asText(), map));
            case "getOptional3": return Collections.singletonMap("value", echo.getOptional_(a.get("key").asText(), map, str(a.get("default"))));
            case "getSkipCorrectedReference": return Collections.singletonMap("value", echo.getSkipCorrectedReference_(ints(a.get("tokenPositions")), a.get("ref").asInt()));
            case "matches": {
              AnalyzedTokenReadings[] t = tokens(l, a);
              boolean b = echo.matches(map, t, a.get("first").asInt(), ints(a.get("tokenPositions")));
              Map<String, Object> o = new LinkedHashMap<>();
              o.put("value", b);
              o.put("seen", echo.seen);
              return o;
            }
            case "getPosition":
            case "isMatchAtSentenceStart": {
              AnalyzedTokenReadings[] t = tokens(l, a);
              Rule rule = a.has("src") ? resolve(a.get("src"), a) : new FakeRule();
              RuleMatch m = new RuleMatch(rule, null, a.get("from").asInt(), a.has("to") ? a.get("to").asInt() : a.get("from").asInt() + 1, "msg");
              if (method.equals("getPosition")) return Collections.singletonMap("value", echo.getPosition_(a.get("str").asText(), t, m));
              return Collections.singletonMap("value", echo.isMatchAtSentenceStart_(t, m));
            }
            case "getLanguageFromRuleMatch": {
              Rule rule = a.has("src") ? resolve(a.get("src"), a) : new FakeRule();
              RuleMatch m = new RuleMatch(rule, null, 0, 1, "msg");
              if (a.has("setLang")) echo.setLanguage(a.get("setLang").isNull() ? null : RuleLoadOps.lang(a.get("setLang").asText()));
              Language r = echo.getLanguageFromRuleMatch(m);
              Map<String, Object> o = new LinkedHashMap<>();
              o.put("value", r == null ? null : r.getShortCodeWithCountryAndVariant());
              o.put("getLanguage", echo.getLanguage() == null ? null : echo.getLanguage().getShortCodeWithCountryAndVariant());
              return o;
            }
            default: throw new IllegalArgumentException("unknown helper " + method);
          }
        }
        default: throw new IllegalArgumentException("unknown kind " + kind);
      }
    } catch (Throwable t) {
      return err(t);
    }
  }

  // ---- hints-real ----
  private static List<Object> matchSummary(List<Rule> rules, List<Integer> idx, AnalyzedSentence s) {
    List<Object> out = new ArrayList<>();
    for (int i : idx) {
      Rule r = rules.get(i);
      try {
        List<RuleMatch> ms = Arrays.asList(r.match(s));
        for (RuleMatch m : ms) out.add(Arrays.asList(i, m.getFromPos(), m.getToPos(), m.getMessage(), new ArrayList<>(m.getSuggestedReplacements())));
      } catch (Throwable t) {
        Throwable c = t;
        while (c instanceof java.lang.reflect.InvocationTargetException && c.getCause() != null) c = c.getCause();
        out.add(Arrays.asList(i, "error", c.getClass().getName(), c instanceof NullPointerException ? null : c.getMessage()));
      }
    }
    return out;
  }

  private static List<Integer> indexOf(List<Rule> all, List<Rule> sub) {
    // rules are distinct objects; walk in order (rulesForSentence keeps list order)
    IdentityHashMap<Rule, Integer> pos = new IdentityHashMap<>();
    for (int i = 0; i < all.size(); i++) pos.put(all.get(i), i);
    List<Integer> idx = new ArrayList<>();
    for (Rule r : sub) idx.add(pos.get(r));
    return idx;
  }

  private static final Map<String, Object[]> HINT_CACHE = new HashMap<>();

  /** {lang, files?, text} -> {n, nSentence tokens, plain:[matches], text:{idx,matches,equal}, lemma:{idx,matches,equal}} for the raw analyzed sentence */
  static Object hintsReal(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    String key = l.getShortCodeWithCountryAndVariant() + "|" + a.path("files");
    Object[] c = HINT_CACHE.get(key);
    if (c == null) {
      List<Rule> all = new ArrayList<>(rules(a));
      c = new Object[] {all, RuleSet.textHinted(all), RuleSet.textLemmaHinted(all)};
      HINT_CACHE.put(key, c);
    }
    @SuppressWarnings("unchecked") List<Rule> all = (List<Rule>) c[0];
    RuleSet th = (RuleSet) c[1], lh = (RuleSet) c[2];
    AnalyzedSentence s = RuleMatchOps.sentence(l, a.get("text"));
    List<Integer> everything = new ArrayList<>();
    for (int i = 0; i < all.size(); i++) everything.add(i);
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("n", all.size());
    o.put("tokens", s.getTokensWithoutWhitespace().length);
    List<Object> plain = matchSummary(all, everything, s);
    o.put("plain", plain);
    for (int k = 0; k < 2; k++) {
      RuleSet rs = k == 0 ? th : lh;
      List<Integer> idx = indexOf(all, rs.rulesForSentence(s));
      List<Object> ms = matchSummary(all, idx, s);
      Map<String, Object> h = new LinkedHashMap<>();
      h.put("idx", idx);
      h.put("matches", ms);
      h.put("equal", ms.equals(plain));
      o.put(k == 0 ? "text" : "lemma", h);
    }
    return o;
  }
}
