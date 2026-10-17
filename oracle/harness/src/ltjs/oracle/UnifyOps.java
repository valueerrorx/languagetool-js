package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.Chunker;
import org.languagetool.rules.CorrectExample;
import org.languagetool.rules.IncorrectExample;
import org.languagetool.rules.patterns.*;
import org.languagetool.tagging.disambiguation.rules.DisambiguatedExample;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;
import org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-UNIFY: unify-harvest, unify-config, unify-match, unify-seq, unify-tokens. Format: docs/review/F28-oracle.md. */
final class UnifyOps {
  private UnifyOps() {}

  // ---- loading ----
  private static final Map<String, List<AbstractPatternRule>> INLINE = new HashMap<>();
  private static final Map<String, List<DisambiguationPatternRule>> DISAMB = new HashMap<>();

  static List<DisambiguationPatternRule> disambRules(Language l) throws Exception {
    String key = l.getShortCodeWithCountryAndVariant();
    List<DisambiguationPatternRule> r = DISAMB.get(key);
    if (r == null) {
      DisambiguationRuleLoader loader = new DisambiguationRuleLoader();
      String nameWithLocale = l.getShortCode() + "/disambiguation.xml";
      String nameInResourceDir = JLanguageTool.getDataBroker().getResourceDir() + "/" + nameWithLocale;
      r = loader.getRules(loader.getClass().getResourceAsStream(nameInResourceDir), l, nameWithLocale);
      DISAMB.put(key, r);
    }
    return r;
  }

  /** Loads all grammar rule files of the language in order (so that every unification block is registered), optionally the disambiguation file. */
  private static void preload(Language l, boolean disamb) throws Exception {
    for (String f : l.getRuleFileNames()) {
      try { RuleLoadOps.loadFile(l, f); } catch (Throwable t) { /* same as harvest */ }
    }
    if (disamb) disambRules(l);
  }

  private static List<AbstractPatternRule> inline(Language l, String xml) throws Exception {
    String key = l.getShortCodeWithCountryAndVariant() + "|" + xml;
    List<AbstractPatternRule> rules = INLINE.get(key);
    if (rules == null) {
      rules = new PatternRuleLoader().getRules(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), "inline.xml", l);
      INLINE.put(key, rules);
    }
    return rules;
  }

  // ---- dumps ----
  private static Object readingDump(AnalyzedToken t) {
    return Arrays.asList(t.getToken(), t.getPOSTag(), t.getLemma());
  }

  private static Object atrsDump(AnalyzedTokenReadings[] arr) {
    if (arr == null) return null;
    List<Object> o = new ArrayList<>();
    for (AnalyzedTokenReadings a : arr) {
      List<Object> rs = new ArrayList<>();
      for (AnalyzedToken t : a.getReadings()) rs.add(readingDump(t));
      o.add(rs);
    }
    return o;
  }

  private static Object fieldOf(Object o, String name) throws Exception {
    Field f = o.getClass().getDeclaredField(name);
    f.setAccessible(true);
    return f.get(o);
  }

  private static Map<String, Object> cfgDump(UnifierConfiguration c) throws Exception {
    Map<String, Object> o = new LinkedHashMap<>();
    List<Object> feats = new ArrayList<>();
    for (Map.Entry<String, List<String>> e : c.getEquivalenceFeatures().entrySet()) feats.add(Arrays.asList(e.getKey(), new ArrayList<>(e.getValue())));
    List<Object> types = new ArrayList<>();
    for (Map.Entry<?, PatternToken> e : c.getEquivalenceTypes().entrySet()) {
      PatternToken p = e.getValue();
      types.add(Arrays.asList(fieldOf(e.getKey(), "feature"), fieldOf(e.getKey(), "type"), p.getString(), p.getPOStag(), p.isInflected(), p.getNegation(), p.getPOSNegation()));
    }
    o.put("features", feats);
    o.put("types", types);
    return o;
  }

  static Object err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t instanceof NullPointerException ? null : t.getMessage());
    return Collections.singletonMap("error", e);
  }

  // ---- unify-config: {lang, xml?} -> {grammar:{features,types}, disamb:{..}} after loading all files (and optional inline xml) ----
  static Object config(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    if (a.has("xml")) inline(l, a.get("xml").asText());
    else preload(l, a.has("disamb") && a.get("disamb").asBoolean());
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("grammar", cfgDump(l.getUnifierConfiguration()));
    o.put("disamb", cfgDump(l.getDefaultLanguageVariant().getDisambiguationUnifierConfiguration()));
    return o;
  }

  // ---- sentences ----
  private static List<AnalyzedSentence> sentences(Language l, JsonNode texts, List<Object> info) {
    JLanguageTool lt = SeqMatchOps.tool(l);
    List<AnalyzedSentence> out = new ArrayList<>();
    for (JsonNode tn : texts) {
      Chunker saved = l.getChunker();
      try {
        AnalyzedSentence s;
        if (tn.isObject()) {
          List<AnalyzedTokenReadings> l2 = new ArrayList<>();
          int pos = 0;
          for (JsonNode sy : tn.get("syn")) {
            AnalyzedTokenReadings atr = SeqMatchOps.synth(sy, pos);
            l2.add(atr);
            pos += atr.getToken() == null ? 0 : atr.getToken().length();
          }
          s = new AnalyzedSentence(l2.toArray(new AnalyzedTokenReadings[0]));
        } else {
          l.setChunker(SeqMatchOps.NOOP);
          s = lt.getRawAnalyzedSentence(tn.asText());
        }
        out.add(s);
        if (info != null) info.add(s.getTokensWithoutWhitespace().length);
      } catch (Throwable t) {
        out.add(null);
        if (info != null) info.add(RuleLoadOps.err(t));
      } finally {
        l.setChunker(saved);
      }
    }
    return out;
  }

  // ---- unify-tokens (generator only): {lang, texts, disamb?} -> per text [[token, [[pos, lemma, [feature/type...]]...]]...] ----
  static Object tokens(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    preload(l, true);
    List<AnalyzedSentence> ss = sentences(l, a.get("texts"), null);
    UnifierConfiguration c = a.has("disamb") && a.get("disamb").asBoolean() ? l.getDefaultLanguageVariant().getDisambiguationUnifierConfiguration() : l.getUnifierConfiguration();
    List<Object> res = new ArrayList<>();
    for (AnalyzedSentence s : ss) {
      if (s == null) { res.add(null); continue; }
      List<Object> toks = new ArrayList<>();
      for (AnalyzedTokenReadings atr : s.getTokensWithoutWhitespace()) {
        List<Object> rs = new ArrayList<>();
        for (AnalyzedToken t : atr.getReadings()) {
          List<String> eq = new ArrayList<>();
          for (Map.Entry<?, PatternToken> e : c.getEquivalenceTypes().entrySet()) {
            if (e.getValue().isMatched(t)) eq.add(fieldOf(e.getKey(), "feature") + "/" + fieldOf(e.getKey(), "type"));
          }
          rs.add(Arrays.asList(t.getPOSTag(), t.getLemma(), eq));
        }
        toks.add(Arrays.asList(atr.getToken(), rs));
      }
      res.add(toks);
    }
    return res;
  }

  // ---- unify-harvest: {lang} ----
  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<String> names = l.getRuleFileNames();
    preload(l, true);
    List<Object> grammar = new ArrayList<>();
    List<Object> anti = new ArrayList<>();
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rules;
      try { rules = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rules.size(); r++) {
        AbstractPatternRule ar = rules.get(r);
        if (!(ar instanceof PatternRule)) continue;
        PatternRule pr = (PatternRule) ar;
        List<String> cs = new ArrayList<>(), is = new ArrayList<>();
        for (CorrectExample e : pr.getCorrectExamples()) cs.add(SeqMatchOpsClean.clean(e.getExample()));
        for (IncorrectExample e : pr.getIncorrectExamples()) is.add(SeqMatchOpsClean.clean(e.getExample()));
        if (pr.isTestUnification()) grammar.add(Arrays.asList(f, r, pr.getId(), pr.getSubId(), feat(pr), cs, is));
        List<DisambiguationPatternRule> aps = pr.getAntiPatterns();
        for (int i = 0; i < aps.size(); i++) {
          if (aps.get(i).isTestUnification()) {
            List<String> ex = new ArrayList<>();
            if (aps.get(i).getExamples() != null) for (DisambiguatedExample e : aps.get(i).getExamples()) ex.add(SeqMatchOpsClean.clean(e.getExample()));
            anti.add(Arrays.asList(f, r, i, pr.getId(), pr.getSubId(), feat(aps.get(i)), cs, is));
          }
        }
      }
    }
    List<Object> dis = new ArrayList<>();
    List<DisambiguationPatternRule> drs = disambRules(l);
    for (int i = 0; i < drs.size(); i++) {
      DisambiguationPatternRule d = drs.get(i);
      if (!d.isTestUnification()) continue;
      List<String> ex = new ArrayList<>(), un = new ArrayList<>();
      if (d.getExamples() != null) for (DisambiguatedExample e : d.getExamples()) ex.add(SeqMatchOpsClean.clean(e.getExample()));
      if (d.getUntouchedExamples() != null) for (String e : d.getUntouchedExamples()) un.add(SeqMatchOpsClean.clean(e));
      dis.add(Arrays.asList(i, d.getId(), d.getSubId(), feat(d), ex, un));
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("files", names);
    o.put("grammar", grammar);
    o.put("anti", anti);
    o.put("disamb", dis);
    return o;
  }

  /** {n, ref, neg, ignore, last, getUnified, feats:[[ [feature,[types]]... ] per distinct unify block]} */
  private static Map<String, Object> feat(AbstractTokenBasedRule r) {
    int ref = 0, neg = 0, ignore = 0, last = 0, uni = 0;
    List<Object> blocks = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (PatternToken p : r.getPatternTokens()) {
      if (p.isReferenceElement() || (p.getString() != null && p.getString().matches("(?s).*\\\\\\d.*"))) ref++;
      if (p.isUniNegated()) neg++;
      if (p.isUnificationNeutral()) ignore++;
      if (p.isLastInUnification()) last++;
      if (p.isUnified()) {
        uni++;
        List<Object> fs = new ArrayList<>();
        for (Map.Entry<String, List<String>> e : p.getUniFeatures().entrySet()) fs.add(Arrays.asList(e.getKey(), new ArrayList<>(e.getValue())));
        if (seen.add(fs.toString())) blocks.add(fs);
      }
    }
    for (PatternToken p : r.getPatternTokens()) {
      for (PatternToken x : p.getAndGroup()) if (x.isReferenceElement()) { ref++; break; }
    }
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("n", r.getPatternTokens().size()); m.put("ref", ref); m.put("neg", neg); m.put("ignore", ignore); m.put("last", last); m.put("uni", uni);
    m.put("getUnified", r.isGetUnified()); m.put("feats", blocks);
    return m;
  }

  private static final class SeqMatchOpsClean {
    static String clean(String s) { return s.replaceAll("<[^>]*>", ""); }
  }

  // ---- unify-match: {lang, xml?, preload?:"grammar"|"disamb", texts, jobs:[{src, texts}]} ----
  private static final class Capture extends AbstractPatternRulePerformer {
    Capture(AbstractTokenBasedRule rule, Unifier u) { super(rule, u); }

    List<Object> run(AnalyzedSentence sentence) throws Exception {
      List<Object> hits = new ArrayList<>();
      boolean pre = isInterpretPosTagsPreDisambiguation();
      AnalyzedTokenReadings[] tokens = pre ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
      doMatch(sentence, tokens, (tp, first, last, fm, lm) -> {
        List<Object> h = new ArrayList<>();
        List<Integer> p = new ArrayList<>();
        for (int x : tp) p.add(x);
        h.add(p);
        h.add(first); h.add(last); h.add(fm); h.add(lm);
        h.add(first >= 0 ? tokens[first].getStartPos() : null);
        h.add(last >= 0 ? tokens[last].getEndPos() : null);
        h.add(fm >= 0 ? tokens[fm].getStartPos() : null);
        h.add(lm >= 0 ? tokens[lm].getEndPos() : null);
        h.add(atrsDump(unifiedTokens));
        hits.add(h);
      });
      return hits;
    }
  }

  static Object match(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    String pre = a.has("preload") ? a.get("preload").asText() : "";
    if (!a.has("xml") && !pre.isEmpty()) preload(l, pre.equals("disamb"));
    List<Object> info = new ArrayList<>();
    List<AnalyzedSentence> texts = sentences(l, a.get("texts"), info);
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      try {
        JsonNode src = job.get("src");
        AbstractTokenBasedRule rule;
        Unifier u;
        if (src.has("disamb")) {
          rule = disambRules(l).get(src.get("disamb").asInt());
          u = l.getDefaultLanguageVariant().getDisambiguationUnifier();
        } else {
          List<AbstractPatternRule> rules = src.has("file") ? RuleLoadOps.loadFile(l, l.getRuleFileNames().get(src.get("file").asInt())) : inline(l, a.get("xml").asText());
          AbstractPatternRule ar = rules.get(src.has("rule") ? src.get("rule").asInt() : 0);
          if (src.has("anti")) {
            rule = ((PatternRule) ar).getAntiPatterns().get(src.get("anti").asInt());
            u = l.getDefaultLanguageVariant().getDisambiguationUnifier();
          } else {
            rule = (AbstractTokenBasedRule) ar;
            u = l.getUnifier();
          }
        }
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          AnalyzedSentence s = texts.get(ti.asInt());
          if (s == null) { per.add(null); continue; }
          try {
            per.add(new Capture(rule, u).run(s));
          } catch (Throwable t) {
            per.add(RuleLoadOps.err(t));
          }
        }
        jobs.add(per);
      } catch (Throwable t) {
        jobs.add(RuleLoadOps.err(t));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", info);
    o.put("jobs", jobs);
    return o;
  }

  // ---- unify-seq: {lang, which:"grammar"|"disamb", hash?, preload?, texts, scripts:[[step...]]} ----
  private static Method m(String name, Class<?>... p) throws Exception {
    Method x = Unifier.class.getDeclaredMethod(name, p);
    x.setAccessible(true);
    return x;
  }

  private static Map<String, List<String>> feats(JsonNode f, boolean hash) {
    if (f == null || f.isNull()) return null;
    Map<String, List<String>> m = hash ? new HashMap<>() : new LinkedHashMap<>();
    for (JsonNode e : f) {
      List<String> ts = new ArrayList<>();
      for (JsonNode t : e.get(1)) ts.add(t.isNull() ? null : t.asText());
      m.put(e.get(0).asText(), ts);
    }
    return m;
  }

  static Object seq(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    String pre = a.has("preload") ? a.get("preload").asText() : "disamb";
    if (!pre.isEmpty()) preload(l, pre.equals("disamb"));
    boolean dis = a.get("which").asText().equals("disamb");
    boolean hash = a.has("hash") && a.get("hash").asBoolean();
    List<Object> info = new ArrayList<>();
    List<AnalyzedSentence> texts = sentences(l, a.get("texts"), info);
    Method isSatisfied = m("isSatisfied", AnalyzedToken.class, Map.class);
    List<Object> scripts = new ArrayList<>();
    for (JsonNode script : a.get("scripts")) {
      Unifier u = dis ? l.getDefaultLanguageVariant().getDisambiguationUnifier() : l.getUnifier();
      Map<String, AnalyzedTokenReadings> copies = new HashMap<>();
      List<Object> res = new ArrayList<>();
      for (JsonNode st : script) {
        try {
          String op = st.get("o").asText();
          AnalyzedTokenReadings atr = null;
          if (st.has("t")) {
            String key = st.get("t").asInt() + ":" + st.get("k").asInt();
            atr = copies.get(key);
            if (atr == null) {
              AnalyzedTokenReadings orig = texts.get(st.get("t").asInt()).getTokensWithoutWhitespace()[st.get("k").asInt()];
              List<AnalyzedToken> rd = new ArrayList<>();
              for (AnalyzedToken x : orig.getReadings()) rd.add(new AnalyzedToken(x.getToken(), x.getPOSTag(), x.getLemma()));
              atr = new AnalyzedTokenReadings(rd, orig.getStartPos());
              copies.put(key, atr);
            }
          }
          Object r;
          switch (op) {
            case "isUnified": {
              AnalyzedToken tk = atr.getAnalyzedToken(st.get("r").asInt());
              Map<String, List<String>> f = feats(st.get("f"), hash);
              r = st.has("m") ? u.isUnified(tk, f, st.get("last").asBoolean(), st.get("m").asBoolean()) : u.isUnified(tk, f, st.get("last").asBoolean());
              break;
            }
            case "isSatisfied":
              r = isSatisfied.invoke(u, atr.getAnalyzedToken(st.get("r").asInt()), feats(st.get("f"), hash));
              break;
            case "startNextToken": u.startNextToken(); r = null; break;
            case "startUnify": u.startUnify(); r = null; break;
            case "reset": u.reset(); r = null; break;
            case "getFinalUnificationValue": r = u.getFinalUnificationValue(feats(st.get("f"), hash)); break;
            case "getUnifiedTokens": r = atrsDump(u.getUnifiedTokens()); break;
            case "getFinalUnified": r = atrsDump(u.getFinalUnified()); break;
            case "addNeutralElement": u.addNeutralElement(atr); r = null; break;
            default: throw new IllegalArgumentException("unknown step " + op);
          }
          res.add(r);
        } catch (java.lang.reflect.InvocationTargetException ite) {
          res.add(err(ite.getCause()));
        } catch (Throwable t) {
          res.add(err(t));
        }
      }
      scripts.add(res);
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", info);
    o.put("scripts", scripts);
    return o;
  }
}
