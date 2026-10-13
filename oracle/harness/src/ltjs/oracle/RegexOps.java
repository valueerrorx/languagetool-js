package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.*;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;
import org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader;

import java.lang.reflect.Field;
import java.util.*;
import java.util.regex.*;

/** Ops: regex (java.util.regex behaviour on inputs), regex-harvest (patterns compiled by rule loading, with exact flags). */
public class RegexOps {

  /** CharSequence with a deterministic step budget (guards catastrophic backtracking). */
  static final class Budget implements CharSequence {
    final CharSequence s; final long[] steps;
    Budget(CharSequence s, long[] steps) { this.s = s; this.steps = steps; }
    public int length() { return s.length(); }
    public char charAt(int i) {
      if (--steps[0] < 0) throw new IllegalStateException("StepBudgetExceeded");
      return s.charAt(i);
    }
    public CharSequence subSequence(int a, int b) { return new Budget(s.subSequence(a, b), steps); }
    @Override public String toString() { return s.toString(); }
  }

  static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    if (t instanceof PatternSyntaxException) {
      PatternSyntaxException p = (PatternSyntaxException) t;
      e.put("description", p.getDescription());
      e.put("index", p.getIndex());
      e.put("pattern", p.getPattern());
    }
    e.put("message", t instanceof StackOverflowError ? null : t.getMessage());
    return e;
  }

  interface Thunk { Object run() throws Throwable; }
  static Object guard(Thunk t) {
    try { return t.run(); } catch (Throwable x) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", err(x)); return m; }
  }

  static final long BUDGET = 3_000_000L;

  /** args: {pattern, flags, inputs[], limits[], replacement?, ops?[]} */
  public static Object regex(JsonNode a) {
    String pat = a.get("pattern").asText();
    int flags = a.has("flags") ? a.get("flags").asInt() : 0;
    Map<String, Object> res = new LinkedHashMap<>();
    Pattern p;
    try {
      p = Pattern.compile(pat, flags);
    } catch (Throwable t) {
      Map<String, Object> c = new LinkedHashMap<>();
      c.put("error", err(t));
      res.put("compile", c);
      return res;
    }
    Map<String, Object> c = new LinkedHashMap<>();
    Matcher probe = p.matcher("");
    c.put("groupCount", probe.groupCount());
    c.put("flags", p.flags());
    res.put("compile", c);
    String repl = a.has("replacement") ? a.get("replacement").asText() : (probe.groupCount() >= 1 ? "<$0|$1>" : "<$0>");
    if (a.has("replacement") || !a.has("ops") || a.get("ops").toString().contains("replace")) res.put("replacement", repl);
    List<Integer> limits = new ArrayList<>();
    if (a.has("limits")) for (JsonNode n : a.get("limits")) limits.add(n.asInt());
    else limits.addAll(Arrays.asList(0, -1, 2));
    Set<String> ops = new HashSet<>();
    if (a.has("ops")) for (JsonNode n : a.get("ops")) ops.add(n.asText());
    else ops.addAll(Arrays.asList("matches", "lookingAt", "find", "split", "replaceAll", "replaceFirst"));
    List<Object> results = new ArrayList<>();
    for (JsonNode in : a.get("inputs")) {
      String s = in.asText();
      Map<String, Object> r = new LinkedHashMap<>();
      if (ops.contains("matches")) r.put("matches", guard(() -> p.matcher(new Budget(s, new long[]{BUDGET})).matches()));
      if (ops.contains("lookingAt")) r.put("lookingAt", guard(() -> p.matcher(new Budget(s, new long[]{BUDGET})).lookingAt()));
      if (ops.contains("find")) r.put("find", guard(() -> {
        Matcher m = p.matcher(new Budget(s, new long[]{BUDGET}));
        List<Object> all = new ArrayList<>();
        int gc = m.groupCount();
        while (m.find()) {
          List<Object> mm = new ArrayList<>();
          mm.add(m.start()); mm.add(m.end());
          List<Object> gs = new ArrayList<>();
          for (int g = 1; g <= gc; g++) {
            if (m.start(g) < 0) gs.add(null); else { gs.add(m.start(g)); gs.add(m.end(g)); }
          }
          mm.add(gs);
          all.add(mm);
          if (all.size() > 500) break;
        }
        return all;
      }));
      if (ops.contains("split")) {
        Map<String, Object> sp = new LinkedHashMap<>();
        for (int lim : limits) sp.put(Integer.toString(lim), guard(() -> Arrays.asList(p.split(new Budget(s, new long[]{BUDGET}), lim))));
        r.put("split", sp);
      }
      if (ops.contains("replaceAll")) r.put("replaceAll", guard(() -> p.matcher(new Budget(s, new long[]{BUDGET})).replaceAll(repl)));
      if (ops.contains("replaceFirst")) r.put("replaceFirst", guard(() -> p.matcher(new Budget(s, new long[]{BUDGET})).replaceFirst(repl)));
      results.add(r);
    }
    res.put("results", results);
    return res;
  }

  // ---------------- harvest ----------------

  static final class Entry {
    String pattern; int flags; String kind; int count; Set<String> srcs = new LinkedHashSet<>(); List<String> examples = new ArrayList<>();
  }

  static final Set<String> SEEN_RULES = new HashSet<>();

  static void add(Map<String, Entry> map, String pattern, int flags, String kind, String src, List<String> examples) {
    if (pattern == null) return;
    String key = kind + "\u0000" + flags + "\u0000" + pattern;
    Entry e = map.get(key);
    if (e == null) { e = new Entry(); e.pattern = pattern; e.flags = flags; e.kind = kind; map.put(key, e); }
    e.count++;
    if (e.srcs.size() < 4) e.srcs.add(src);
    if (e.examples.size() < 8 && examples != null && SEEN_RULES.add(key + "|" + src)) {
      for (String x : examples) { if (e.examples.size() < 8) e.examples.add(x); }
    }
  }

  static Object priv(Object o, String f) throws Exception {
    Field fl = o.getClass().getDeclaredField(f);
    fl.setAccessible(true);
    return fl.get(o);
  }

  /** Original (pattern, caseSensitive) of a StringMatcher recorded by the trace shim, or null when the shim is not on the classpath. */
  @SuppressWarnings("unchecked")
  static String[] traced(Object matcher) {
    if (matcher == null) return null;
    try {
      java.util.Map<Object, String[]> m = (java.util.Map<Object, String[]>) Class.forName("org.languagetool.rules.patterns.StringMatcher").getField("TRACE").get(null);
      return m.get(matcher);
    } catch (Throwable e) { return null; }
  }

  static void addMatcher(Map<String, Entry> map, Object matcher, String fallbackPattern, boolean fallbackCs, String kind, String src, List<String> ex) {
    String[] tr = traced(matcher);
    String pat = tr != null ? tr[0] : fallbackPattern;
    boolean cs = tr != null ? "1".equals(tr[1]) : fallbackCs;
    if (pat == null) return;
    boolean special = "\\0".equals(pat) || "\\p{P}".equals(pat);
    add(map, pat, cs ? 0 : (Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE), kind + (special ? ":special-not-compiled" : ""), src, ex);
  }

  static void walkToken(Map<String, Entry> map, PatternToken t, String where, String src, List<String> ex, Set<PatternToken> seen) throws Exception {
    if (t == null || !seen.add(t)) return;
    if (t.isRegularExpression()) {
      addMatcher(map, priv(t, "textMatcher"), t.getString(), t.isCaseSensitive(), where + "token", src, ex);
    }
    if (t.isPOStagRegularExpression()) {
      Object pt = priv(t, "posToken");
      Object pm = pt == null ? null : priv(pt, "posPattern");
      String[] tr = traced(pm);
      add(map, tr != null ? tr[0] : t.getPOStag(), 0, where + "postag", src, ex);
    }
    ChunkTag ct = t.getChunkTag();
    if (ct != null) {
      Object p = priv(ct, "pattern");
      if (p != null) add(map, ((Pattern) p).pattern(), ((Pattern) p).flags(), where + "chunk", src, ex);
    }
    Match m = t.getMatch();
    if (m != null) walkMatch(map, m, where, src, ex);
    for (PatternToken x : t.getExceptionList()) walkToken(map, x, where + "exc-", src, ex, seen);
    Object rare = priv(t, "rareFields");
    if (rare != null) {
      PatternToken[] prev = (PatternToken[]) priv(rare, "previousExceptions");
      for (PatternToken x : prev) walkToken(map, x, where + "exc-", src, ex, seen);
    }
    if (t.hasAndGroup()) for (PatternToken x : t.getAndGroup()) walkToken(map, x, where + "and-", src, ex, seen);
    if (t.hasOrGroup()) for (PatternToken x : t.getOrGroup()) walkToken(map, x, where + "or-", src, ex, seen);
  }

  static void walkMatch(Map<String, Entry> map, Match m, String where, String src, List<String> ex) {
    if (m.getRegexMatch() != null) add(map, m.getRegexMatch().pattern(), m.getRegexMatch().flags(), where + "match-regexp_match", src, ex);
    if (m.getPosRegexMatch() != null) add(map, m.getPosRegexMatch().pattern(), m.getPosRegexMatch().flags(), where + "match-postag", src, ex);
  }

  static List<String> examples(Rule r) {
    List<String> l = new ArrayList<>();
    for (CorrectExample e : r.getCorrectExamples()) l.add(e.getExample());
    for (IncorrectExample e : r.getIncorrectExamples()) l.add(e.getExample());
    return l;
  }

  static void walkRule(Map<String, Entry> map, AbstractPatternRule r, String src, List<String> ex, String where) throws Exception {
    Set<PatternToken> seen = Collections.newSetFromMap(new IdentityHashMap<>());
    if (r instanceof RegexPatternRule) {
      Pattern p = ((RegexPatternRule) r).getPattern();
      add(map, p.pattern(), p.flags(), where + "regexp-rule", src, ex);
    } else {
      List<PatternToken> toks = r.getPatternTokens();
      if (toks != null) for (PatternToken t : toks) walkToken(map, t, where, src, ex, seen);
    }
    for (Match m : r.getSuggestionMatches()) walkMatch(map, m, where + "sug-", src, ex);
    for (DisambiguationPatternRule ap : r.getAntiPatterns()) {
      for (PatternToken t : ap.getPatternTokens()) walkToken(map, t, where + "anti-", src, ex, seen);
    }
  }

  /** args: {lang: shortCodeWithCountryAndVariant} -> list of entries */
  public static Object harvest(JsonNode a) throws Exception {
    Language lang = Languages.getLanguageForShortCode(a.get("lang").asText());
    String lc = lang.getShortCodeWithCountryAndVariant();
    Map<String, Entry> map = new LinkedHashMap<>();
    JLanguageTool lt = new JLanguageTool(lang);
    for (Rule r : lt.getAllRules()) {
      if (r instanceof AbstractPatternRule) {
        String src = lc + ":" + r.getFullId() + "@" + r.getSourceFile();
        walkRule(map, (AbstractPatternRule) r, src, examples(r), "grammar-");
      }
    }
    DisambiguationRuleLoader loader = new DisambiguationRuleLoader();
    for (String f : new String[]{lang.getShortCode() + "/disambiguation.xml", "all/disambiguation-global.xml"}) {
      String res = JLanguageTool.getDataBroker().getResourceDir() + "/" + f;
      java.io.InputStream is = loader.getClass().getResourceAsStream(res);
      if (is == null) continue;
      for (DisambiguationPatternRule r : loader.getRules(is, lang, f)) {
        List<String> ex = new ArrayList<>();
        if (r.getUntouchedExamples() != null) ex.addAll(r.getUntouchedExamples());
        if (r.getExamples() != null) for (org.languagetool.tagging.disambiguation.rules.DisambiguatedExample d : r.getExamples()) ex.add(d.getExample());
        String src = lc + ":" + r.getId() + "[" + r.getSubId() + "]@" + f;
        walkRule(map, r, src, ex, "disamb-");
        if (r.getMatchElement() != null) walkMatch(map, r.getMatchElement(), "disamb-", src, ex);
      }
    }
    List<Object> out = new ArrayList<>();
    for (Entry e : map.values()) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("pattern", e.pattern); o.put("flags", e.flags); o.put("kind", e.kind); o.put("count", e.count);
      o.put("srcs", new ArrayList<>(e.srcs)); o.put("examples", e.examples);
      out.add(o);
    }
    return out;
  }
}
