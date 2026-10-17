package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.rules.patterns.*;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-TOKMATCH: string-matcher, token-match, tokmatch-harvest. Format: docs/review/F26-oracle.md. */
final class TokMatchOps {
  private TokMatchOps() {}

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  private static Object fld(Object o, Class<?> c, String name) {
    try {
      Field f = c.getDeclaredField(name);
      f.setAccessible(true);
      return f.get(o);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  // ---- string-matcher: {entries:[{p,re,cs,probes[]}]} -> [{pv, m}|{error}] ----
  static Object stringMatcher(JsonNode a) {
    List<Object> out = new ArrayList<>();
    for (JsonNode e : a.get("entries")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        StringMatcher m = StringMatcher.create(str(e.get("p")), e.get("re").asBoolean(), e.get("cs").asBoolean());
        Set<String> pv = m.getPossibleValues();
        r.put("pv", pv == null ? null : new ArrayList<>(pv));
        StringBuilder sb = new StringBuilder();
        for (JsonNode p : e.get("probes")) {
          try { sb.append(m.matches(str(p)) ? '1' : '0'); } catch (Throwable t) { sb.append('E'); }
        }
        r.put("m", sb.toString());
      } catch (Throwable t) {
        r = new LinkedHashMap<>(RuleLoadOps.err(t));
      }
      out.add(r);
    }
    return out;
  }

  // ---- token resolution ----
  private static final Map<String, List<AbstractPatternRule>> INLINE = new HashMap<>();

  private static PatternToken resolve(JsonNode src) throws Exception {
    Language l = RuleLoadOps.lang(src.get("lang").asText());
    List<AbstractPatternRule> rules;
    int ri;
    if (src.has("xml")) {
      String xml = src.get("xml").asText();
      String key = l.getShortCodeWithCountryAndVariant() + "|" + xml;
      rules = INLINE.get(key);
      if (rules == null) {
        rules = new PatternRuleLoader().getRules(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), "inline.xml", l);
        INLINE.put(key, rules);
      }
      ri = src.has("rule") ? src.get("rule").asInt() : 0;
    } else {
      List<String> names = l.getRuleFileNames();
      rules = RuleLoadOps.loadFile(l, names.get(src.get("file").asInt()));
      ri = src.get("rule").asInt();
    }
    PatternToken t = rules.get(ri).getPatternTokens().get(src.get("tok").asInt());
    if (src.has("ex")) for (JsonNode i : src.get("ex")) t = t.getExceptionList().get(i.asInt());
    return t;
  }

  private static final Map<String, JLanguageTool> TOOLS = new HashMap<>();

  private static JLanguageTool tool(Language l) {
    return TOOLS.computeIfAbsent(l.getShortCodeWithCountryAndVariant(),
        k -> new JLanguageTool(l, Collections.emptyList(), null, null, null, null, true, false, Collections.emptyList()) {});
  }

  private static AnalyzedTokenReadings synth(JsonNode s) {
    List<AnalyzedToken> rd = new ArrayList<>();
    for (JsonNode r : s.get("readings")) rd.add(new AnalyzedToken(str(r.get(0)), str(r.get(1)), str(r.get(2))));
    AnalyzedTokenReadings atr = new AnalyzedTokenReadings(rd, 0);
    atr.setWhitespaceBefore(s.has("ws") && s.get("ws").asBoolean() ? " " : "");
    if (s.has("chunks")) {
      List<ChunkTag> cts = new ArrayList<>();
      for (JsonNode c : s.get("chunks")) cts.add(new ChunkTag(c.asText()));
      atr.setChunkTags(cts);
    }
    return atr;
  }

  // ---- token-match: {lang, texts:[string|{syn:[..]}], specs:[{src, texts:[i]}]} ----
  static Object tokenMatch(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    JLanguageTool lt = tool(l);
    List<Object> textInfo = new ArrayList<>();
    List<AnalyzedTokenReadings[]> texts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      try {
        AnalyzedTokenReadings[] toks;
        if (tn.isObject()) {
          List<AnalyzedTokenReadings> l2 = new ArrayList<>();
          for (JsonNode s : tn.get("syn")) l2.add(synth(s));
          toks = l2.toArray(new AnalyzedTokenReadings[0]);
        } else {
          toks = lt.getRawAnalyzedSentence(tn.asText()).getTokens();
        }
        texts.add(toks);
        List<Object> ti = new ArrayList<>();
        for (AnalyzedTokenReadings t : toks) ti.add(Arrays.asList(t.getToken(), t.getReadings().size(), t.isWhitespaceBefore()));
        textInfo.add(ti);
      } catch (Throwable t) {
        texts.add(null);
        textInfo.add(RuleLoadOps.err(t));
      }
    }
    List<Object> specs = new ArrayList<>();
    for (JsonNode sp : a.get("specs")) {
      try {
        PatternToken pt = resolve(sp.get("src"));
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : sp.get("texts")) {
          AnalyzedTokenReadings[] toks = texts.get(ti.asInt());
          if (toks == null) { per.add(null); continue; }
          List<Object> tl = new ArrayList<>();
          for (AnalyzedTokenReadings atr : toks) {
            List<Integer> row = new ArrayList<>();
            row.add(pt.isMatchedByPreviousException(atr) ? 1 : 0);
            for (AnalyzedToken r : atr) {
              int m = 0;
              if (pt.isMatched(r)) m |= 1;
              if (pt.isExceptionMatched(r)) m |= 2;
              if (pt.isAndExceptionGroupMatched(r)) m |= 4;
              if (pt.isExceptionMatchedCompletely(r)) m |= 8;
              if (pt.isMatchedByScopeNextException(r)) m |= 16;
              if (pt.isMatchedByPreviousException(r)) m |= 32;
              if (pt.isWhitespaceBefore(r)) m |= 64;
              if (pt.hasAndGroup()) { boolean all = true; for (PatternToken x : pt.getAndGroup()) all &= x.isMatched(r); if (all) m |= 128; }
              if (pt.hasOrGroup()) { boolean any = false; for (PatternToken x : pt.getOrGroup()) any |= x.isMatched(r); if (any) m |= 256; }
              row.add(m);
            }
            tl.add(row);
          }
          per.add(tl);
        }
        specs.add(per);
      } catch (Throwable t) {
        specs.add(RuleLoadOps.err(t));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", textInfo);
    o.put("specs", specs);
    return o;
  }

  // ---- tokmatch-harvest: {lang} -> {files, tokens:[[f,r,t,ex,string,re,cs,infl,neg,pos,posRe,posNeg,cur,next,prev,and,or,skip,min,max,chunk,ws]]} ----
  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<String> names = l.getRuleFileNames();
    List<Object> toks = new ArrayList<>();
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rules;
      try { rules = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rules.size(); r++) {
        List<PatternToken> pts = rules.get(r).getPatternTokens();
        if (pts == null) continue;
        for (int t = 0; t < pts.size(); t++) walk(toks, f, r, t, "", pts.get(t));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("files", names);
    o.put("tokens", toks);
    return o;
  }

  private static void walk(List<Object> out, int f, int r, int t, String ex, PatternToken p) throws Exception {
    List<Object> e = new ArrayList<>();
    e.add(f); e.add(r); e.add(t); e.add(ex);
    e.add(p.getString()); e.add(p.isRegularExpression()); e.add(p.isCaseSensitive()); e.add(p.isInflected()); e.add(p.getNegation());
    e.add(p.getPOStag()); e.add(p.isPOStagRegularExpression()); e.add(p.getPOSNegation());
    int cur = 0, next = 0;
    for (PatternToken x : p.getExceptionList()) { if (x.hasNextException()) next++; else cur++; }
    e.add(cur); e.add(next); e.add(p.hasPreviousException() ? 1 : 0);
    e.add(p.hasAndGroup() ? p.getAndGroup().size() : 0); e.add(p.hasOrGroup() ? p.getOrGroup().size() : 0);
    e.add(p.getSkipNext()); e.add(p.getMinOccurrence()); e.add(p.getMaxOccurrence());
    e.add(p.getChunkTag() == null ? null : p.getChunkTag().getChunkTag());
    e.add(((Number) fld(p, PatternToken.class, "flags")).intValue() & 12);
    out.add(e);
    if (ex.isEmpty() || ex.length() < 6) {
      List<PatternToken> exl = p.getExceptionList();
      for (int i = 0; i < exl.size(); i++) walk(out, f, r, t, ex.isEmpty() ? "" + i : ex + "," + i, exl.get(i));
    }
  }
}
