package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.markup.AnnotatedText;
import org.languagetool.markup.AnnotatedTextBuilder;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.RuleSet;
import org.languagetool.tools.Tools;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.util.*;

/** Ops for X-CHECK-PIPE: check2, active-rules, lt-api, analyze-raw. Format: docs/review/F15-oracle.md. */
final class CheckPipeOps {
  private CheckPipeOps() {}

  private static final Map<String, HarnessLT> CACHE = new HashMap<>();

  static Map<String, Object> errorOf(Throwable t) {
    if (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    List<Object> causes = new ArrayList<>();
    for (Throwable c = t.getCause(); c != null && causes.size() < 10; c = c.getCause()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("class", c.getClass().getName());
      m.put("message", c.getMessage());
      causes.add(m);
    }
    e.put("causes", causes);
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("error", e);
    return w;
  }

  /** JLanguageTool that records the match list before the language-dependent filters (see docs). */
  static final class HarnessLT extends JLanguageTool {
    List<Object> preLanguageFilter;
    HarnessLT(Language l, Language mt) { super(l, mt); }
    HarnessLT(Language l, org.languagetool.UserConfig uc) { super(l, (Language) null, (org.languagetool.ResultCache) null, uc); }
    HarnessLT(Language l, List<Rule> custom) { super(l, Collections.emptyList(), null, null, null, null, true, false, custom); }

    @Override
    protected CheckResults performCheck(List<AnalyzedSentence> analyzedSentences, List<String> sentenceTexts, RuleSet ruleSet, ParagraphHandling paraMode, AnnotatedText annotatedText, RuleMatchListener listener, Mode mode, Level level, boolean checkRemoteRules, Set<ToneTag> toneTags) throws java.io.IOException {
      CheckResults res = super.performCheck(analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags);
      try {
        List<RuleMatch> l = new ArrayList<>(res.getRuleMatches());
        Method ig = JLanguageTool.class.getDeclaredMethod("ignoreRule", Rule.class);
        ig.setAccessible(true);
        Method act = JLanguageTool.class.getDeclaredMethod("isRuleActiveForLevelAndToneTags", Rule.class, Level.class, Set.class);
        act.setAccessible(true);
        List<RuleMatch> f = new ArrayList<>();
        for (RuleMatch m : l) {
          if ((Boolean) ig.invoke(this, m.getRule())) continue;
          if (!(Boolean) act.invoke(null, m.getRule(), level, toneTags)) continue;
          f.add(m);
        }
        f = new SameRuleGroupFilter().filter(f);
        List<Object> dump = new ArrayList<>();
        for (RuleMatch m : f) dump.add(matchDump(m));
        preLanguageFilter = dump;
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
      return res;
    }
  }

  static Map<String, Object> matchDump(RuleMatch m) {
    Map<String, Object> o = ContentOps.match(m);
    o.put("fullId", m.getRule().getFullId());
    return o;
  }

  private static List<String> strs(JsonNode a, String k) { return ContentOps.strs(a, k); }

  /** Builds (or reuses) a tool for lang + rules + selection; base state: all non-synthetic rules disabled by full id. */
  static HarnessLT tool(JsonNode a, boolean disableBuiltins) throws Exception {
    String key = a.get("lang").asText() + "|" + (a.has("motherTongue") ? a.get("motherTongue") : "") + "|" + a.get("rules") + "|" + a.get("selection") + "|" + disableBuiltins;
    HarnessLT lt = CACHE.get(key);
    if (lt != null) return lt;
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Language mt = a.has("motherTongue") && !a.get("motherTongue").isNull() ? Languages.getLanguageForShortCode(a.get("motherTongue").asText()) : null;
    lt = new HarnessLT(l, mt);
    lt.setCleanOverlappingMatches(false);
    for (Rule r : SynthRules.makeAll(a.get("rules"))) lt.addRule(r);
    select(lt, a.get("selection"), null);
    if (disableBuiltins) {
      for (Rule r : lt.getAllRules()) if (!r.getId().startsWith(SynthRules.PREFIX)) lt.disableRule(r.getFullId());
    }
    CACHE.put(key, lt);
    return lt;
  }

  static void select(JLanguageTool lt, JsonNode sel, List<String> stdoutLines) {
    if (sel == null || sel.isNull()) return;
    Set<CategoryId> dcs = new LinkedHashSet<>(), ecs = new LinkedHashSet<>();
    for (String s : strs(sel, "disabledCategories")) dcs.add(new CategoryId(s));
    for (String s : strs(sel, "enabledCategories")) ecs.add(new CategoryId(s));
    boolean only = sel.has("enabledOnly") && sel.get("enabledOnly").asBoolean();
    boolean tempOff = sel.has("enableTempOff") && sel.get("enableTempOff").asBoolean();
    PrintStream old = System.out;
    ByteArrayOutputStream bo = new ByteArrayOutputStream();
    try {
      System.setOut(new PrintStream(bo, true, "UTF-8"));
      Tools.selectRules(lt, dcs, ecs, new LinkedHashSet<>(strs(sel, "disabledRules")), new LinkedHashSet<>(strs(sel, "enabledRules")), only, tempOff);
    } catch (java.io.UnsupportedEncodingException e) {
      throw new RuntimeException(e);
    } finally {
      System.setOut(old);
    }
    if (stdoutLines != null) {
      for (String line : bo.toString(java.nio.charset.StandardCharsets.UTF_8).split("\n")) {
        if (line.startsWith("Activating " + SynthRules.PREFIX)) stdoutLines.add(line);
      }
    }
  }

  static AnnotatedText annotated(JsonNode c) {
    AnnotatedTextBuilder b = new AnnotatedTextBuilder();
    if (c.has("parts")) {
      for (JsonNode p : c.get("parts")) {
        String type = p.get("type").asText();
        String t = p.get("text").asText();
        if (type.equals("text")) b.addText(t);
        else if (p.has("interpretAs") && !p.get("interpretAs").isNull()) b.addMarkup(t, p.get("interpretAs").asText());
        else b.addMarkup(t);
      }
    } else {
      b.addText(c.get("text").asText());
    }
    return b.build();
  }

  /** Cancels from the (n+1)-th call made directly by a JLanguageTool frame; calls from disambiguators are ignored (false). */
  static final class CancelAfter implements JLanguageTool.CheckCancelledCallback {
    final int n;
    int direct = 0;
    final List<String> calls = new ArrayList<>();
    CancelAfter(int n) { this.n = n; }
    @Override public boolean checkCancelled() {
      StackTraceElement[] st = Thread.currentThread().getStackTrace();
      String me = CancelAfter.class.getName();
      StackTraceElement caller = null;
      for (int i = 1; i < st.length; i++) {
        if (!st[i].getClassName().equals(me)) { caller = st[i]; break; }
      }
      if (caller == null || !caller.getClassName().startsWith("org.languagetool.JLanguageTool")) return false;
      direct++;
      calls.add(caller.getMethodName());
      return direct > n;
    }
  }

  private static Map<String, Object> ranges(CheckResults cr, Map<String, Object> res) {
    List<Object> sr = new ArrayList<>();
    for (SentenceRange s : cr.getSentenceRanges()) sr.add(Arrays.asList(s.getFromPos(), s.getToPos()));
    res.put("sentenceRanges", sr);
    List<Object> er = new ArrayList<>();
    for (ExtendedSentenceRange s : cr.getExtendedSentenceRanges()) er.add(Arrays.asList(s.getFromPos(), s.getToPos()));
    res.put("extendedSentenceRanges", er);
    List<Object> ir = new ArrayList<>();
    for (Range s : cr.getIgnoredRanges()) ir.add(Arrays.asList(s.getFromPos(), s.getToPos(), s.getLang()));
    res.put("ignoredRanges", ir);
    return res;
  }

  private static Set<ToneTag> tones(JsonNode c) {
    Set<ToneTag> t = new LinkedHashSet<>();
    for (String s : strs(c, "toneTags")) t.add(ToneTag.valueOf(s));
    return t;
  }

  /** One check2 case on `lt`. */
  static Map<String, Object> runCase(HarnessLT lt, JsonNode c) {
    Map<String, Object> res = new LinkedHashMap<>();
    CancelAfter cb = c.has("cancelAfter") && !c.get("cancelAfter").isNull() ? new CancelAfter(c.get("cancelAfter").asInt()) : null;
    try {
      lt.setCheckCancelledCallback(cb);
      lt.preLanguageFilter = null;
      JLanguageTool.Level level = c.has("level") ? JLanguageTool.Level.valueOf(c.get("level").asText()) : JLanguageTool.Level.DEFAULT;
      JLanguageTool.Mode mode = c.has("mode") ? JLanguageTool.Mode.valueOf(c.get("mode").asText()) : JLanguageTool.Mode.ALL;
      JLanguageTool.ParagraphHandling ph = c.has("paraMode") ? JLanguageTool.ParagraphHandling.valueOf(c.get("paraMode").asText()) : JLanguageTool.ParagraphHandling.NORMAL;
      boolean tokenize = !c.has("tokenizeText") || c.get("tokenizeText").asBoolean();
      CheckResults cr = lt.check2(annotated(c), tokenize, ph, null, mode, level, tones(c), null);
      List<Object> ms = new ArrayList<>();
      for (RuleMatch m : cr.getRuleMatches()) ms.add(matchDump(m));
      res.put("matches", ms);
      List<Object> pre = lt.preLanguageFilter == null ? new ArrayList<>() : lt.preLanguageFilter;
      boolean changed = !pre.equals(ms);
      if (changed) res.put("matchesBeforeLanguageFilter", pre);
      res.put("languageFilterChanged", changed);
      ranges(cr, res);
    } catch (Throwable t) {
      res.putAll(errorOf(t));
    } finally {
      lt.setCheckCancelledCallback(null);
    }
    if (cb != null) res.put("cancelCalls", cb.calls);
    return res;
  }

  /** {lang, motherTongue?, rules:[spec], selection:{...}, cases:[{text|parts, mode, level, toneTags, paraMode, tokenizeText, cancelAfter}]} -> {cases:[...]} */
  static Object check2(JsonNode a) throws Exception {
    HarnessLT lt = tool(a, true);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) out.add(runCase(lt, c));
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("cases", out);
    return r;
  }


  /** X-RULES-CORE: {lang, classes:[fqcn], ruleIds?:[id], cleanOverlapping, cases:[...]} -> {selected, cases:[... + disambChanged, disambDiffers, anyImmunized]}. See docs/review/F16-oracle.md. */
  static Object checkRules(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    HarnessLT lt = new HarnessLT(l, (Language) null);
    lt.setCleanOverlappingMatches(a.has("cleanOverlapping") && a.get("cleanOverlapping").asBoolean());
    List<Class<?>> cls = new ArrayList<>();
    for (String c : strs(a, "classes")) cls.add(Class.forName(c));
    Set<String> enabled = new LinkedHashSet<>(strs(a, "ruleIds"));
    List<String> selected = new ArrayList<>();
    for (Rule r : lt.getAllRules()) {
      boolean m = enabled.contains(r.getId());
      for (Class<?> c : cls) if (c.isInstance(r)) m = true;
      if (m) { enabled.add(r.getId()); selected.add(r.getFullId() + "|" + r.getClass().getSimpleName()); }
    }
    if (enabled.isEmpty()) {
      // no language instance: instantiate the core class itself (messages bundle of the language)
      for (Rule r : lt.getAllRules()) lt.disableRule(r.getFullId());
      for (Class<?> c : cls) {
        java.lang.reflect.Constructor<?> k;
        Rule r;
        java.util.ResourceBundle mb = JLanguageTool.getMessageBundle(l);
        try { r = (Rule) c.getConstructor(java.util.ResourceBundle.class, Language.class).newInstance(mb, l); }
        catch (NoSuchMethodException e) { r = (Rule) c.getConstructor(java.util.ResourceBundle.class).newInstance(mb); }
        lt.addRule(r);
        enabled.add(r.getId());
        selected.add(r.getFullId() + "|" + r.getClass().getSimpleName() + "|instantiated");
      }
    }
    if (!enabled.isEmpty()) Tools.selectRules(lt, new LinkedHashSet<>(), new LinkedHashSet<>(), new LinkedHashSet<>(), enabled, true, false);
    List<String> active = new ArrayList<>();
    for (Rule r : lt.getAllActiveRules()) active.add(r.getFullId());
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("selected", selected);
    res.put("active", active);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) {
      Map<String, Object> r1 = runCase(lt, c);
      Map<String, Object> r2;
      boolean imm = false;
      org.languagetool.tagging.disambiguation.Disambiguator d = l.getDisambiguator();
      org.languagetool.chunking.Chunker ch = l.getChunker();
      try {
        try {
          for (AnalyzedSentence s : lt.analyzeText(annotated(c).getPlainText())) for (AnalyzedTokenReadings t : s.getTokens()) if (t.isImmunized()) imm = true;
        } catch (Throwable t) { /* error cases carry the error */ }
        l.setDisambiguator(new org.languagetool.noop.NoopDisambiguator());
        l.setChunker(new org.languagetool.noop.NoopChunker());
        r2 = runCase(lt, c);
      } finally {
        l.setDisambiguator(d);
        l.setChunker(ch);
      }
      boolean differs = !String.valueOf(r1.get("matches")).equals(String.valueOf(r2.get("matches"))) || !String.valueOf(r1.get("error")).equals(String.valueOf(r2.get("error")));
      r1.put("anyImmunized", imm);
      r1.put("disambDiffers", differs);
      r1.put("disambChanged", differs || imm);
      out.add(r1);
    }
    res.put("cases", out);
    return res;
  }

  private static List<String> ids(List<Rule> rules) {
    List<String> l = new ArrayList<>();
    for (Rule r : rules) if (r.getId().startsWith(SynthRules.PREFIX)) l.add(r.getFullId());
    return l;
  }

  private static List<Object> categories(JLanguageTool lt) {
    TreeMap<String, Object> m = new TreeMap<>();
    for (Map.Entry<CategoryId, Category> e : lt.getCategories().entrySet()) {
      if (!e.getKey().toString().startsWith(SynthRules.PREFIX)) continue;
      Category c = e.getValue();
      m.put(e.getKey().toString(), Arrays.asList(c.getId().toString(), c.getName(), String.valueOf(c.getLocation()), c.isDefaultOff(), c.getTabName()));
    }
    return new ArrayList<>(m.values());
  }

  private static List<String> filteredSet(Collection<String> c) {
    List<String> l = new ArrayList<>();
    for (String s : c) if (s.startsWith(SynthRules.PREFIX)) l.add(s);
    Collections.sort(l);
    return l;
  }

  /** {lang, motherTongue?, rules, selection, combos:[{level, toneTags}]} -> allRules, allActive, disabledRules, categories, stdout, combos (full ids active for level/toneTags) */
  static Object activeRules(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Language mt = a.has("motherTongue") && !a.get("motherTongue").isNull() ? Languages.getLanguageForShortCode(a.get("motherTongue").asText()) : null;
    JLanguageTool lt = new JLanguageTool(l, mt);
    for (Rule r : SynthRules.makeAll(a.get("rules"))) lt.addRule(r);
    List<String> lines = new ArrayList<>();
    select(lt, a.get("selection"), lines);
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("allRules", ids(lt.getAllRules()));
    res.put("allActive", ids(lt.getAllActiveRules()));
    res.put("disabledRules", filteredSet(lt.getDisabledRules()));
    res.put("categories", categories(lt));
    Set<CategoryId> dis = new TreeSet<>(Comparator.comparing(CategoryId::toString));
    for (Rule r : lt.getAllRules()) if (r.getId().startsWith(SynthRules.PREFIX) && lt.isCategoryDisabled(r.getCategory().getId())) dis.add(r.getCategory().getId());
    List<String> dl = new ArrayList<>();
    for (CategoryId c : dis) dl.add(c.toString());
    res.put("disabledCategories", dl);
    res.put("stdout", lines);
    Method act = JLanguageTool.class.getDeclaredMethod("isRuleActiveForLevelAndToneTags", Rule.class, JLanguageTool.Level.class, Set.class);
    act.setAccessible(true);
    List<Object> combos = new ArrayList<>();
    if (a.has("combos")) for (JsonNode c : a.get("combos")) {
      JLanguageTool.Level level = JLanguageTool.Level.valueOf(c.get("level").asText());
      Set<ToneTag> tt = tones(c);
      List<String> active = new ArrayList<>();
      for (Rule r : lt.getAllActiveRules()) if (r.getId().startsWith(SynthRules.PREFIX) && (Boolean) act.invoke(null, r, level, tt)) active.add(r.getFullId());
      combos.add(active);
    }
    res.put("combos", combos);
    return res;
  }

  /** {lang, ctor: default|nullLang|nullLangMother|nullAlt|custom|mother:<code>, rules?, steps:[{do,...}]} -> {ctorError? , steps:[...]} */
  static Object ltApi(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    String ctor = a.has("ctor") ? a.get("ctor").asText() : "default";
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    JLanguageTool lt;
    try {
      if (ctor.equals("default")) lt = new JLanguageTool(l);
      else if (ctor.startsWith("mother:")) lt = new JLanguageTool(l, Languages.getLanguageForShortCode(ctor.substring(7)));
      else if (ctor.equals("nullLang")) lt = new JLanguageTool((Language) null);
      else if (ctor.equals("nullLangMother")) lt = new JLanguageTool((Language) null, (Language) null);
      else if (ctor.equals("nullAlt")) lt = new JLanguageTool(l, (List<Language>) null, null, null, null, null, true, false, null);
      else if (ctor.equals("custom")) lt = new JLanguageTool(l, Collections.emptyList(), null, null, null, null, true, false, SynthRules.makeAll(a.get("rules")));
      else throw new IllegalArgumentException("ctor " + ctor);
    } catch (Throwable t) {
      res.put("ctorError", errorOf(t).get("error"));
      return res;
    }
    lt.setCleanOverlappingMatches(false);
    List<Object> out = new ArrayList<>();
    for (JsonNode st : a.get("steps")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        r.put("result", step(lt, st));
      } catch (Throwable t) {
        r.putAll(errorOf(t));
      }
      out.add(r);
    }
    res.put("steps", out);
    return res;
  }

  private static Object step(JLanguageTool lt, JsonNode st) throws Exception {
    String d = st.get("do").asText();
    switch (d) {
      case "addRule": lt.addRule(SynthRules.make(st.get("rule"))); return null;
      case "addRuleNull": lt.addRule(null); return null;
      case "setRules": lt.setRules(SynthRules.makeAll(st.get("rules"))); return null;
      case "setRulesNull": lt.setRules(null); return null;
      case "disableRule": lt.disableRule(st.get("id").asText()); return null;
      case "disableRules": lt.disableRules(strs(st, "ids")); return null;
      case "enableRule": lt.enableRule(st.get("id").asText()); return null;
      case "disableCategory": lt.disableCategory(new CategoryId(st.get("id").asText())); return null;
      case "enableCategory": lt.enableRuleCategory(new CategoryId(st.get("id").asText())); return null;
      case "isCategoryDisabled": return lt.isCategoryDisabled(new CategoryId(st.get("id").asText()));
      case "disabledRules": return filteredSet(lt.getDisabledRules());
      case "cleanOverlapping": lt.setCleanOverlappingMatches(st.get("value").asBoolean()); return null;
      case "allRules": return ids(lt.getAllRules());
      case "allActive": return ids(lt.getAllActiveRules());
      case "categories": return categories(lt);
      case "patternRules": {
        List<Object> l = new ArrayList<>();
        for (Rule r : lt.getPatternRulesByIdAndSubId(st.get("id").isNull() ? null : st.get("id").asText(), st.get("subId").isNull() ? null : st.get("subId").asText())) l.add(r.getFullId());
        return l;
      }
      case "select": {
        List<String> lines = new ArrayList<>();
        select(lt, st.get("selection"), lines);
        return lines;
      }
      case "check": {
        Map<String, Object> o = new LinkedHashMap<>();
        JLanguageTool.Level level = st.has("level") ? JLanguageTool.Level.valueOf(st.get("level").asText()) : JLanguageTool.Level.DEFAULT;
        CheckResults cr = lt.check2(annotated(st), true, JLanguageTool.ParagraphHandling.NORMAL, null, JLanguageTool.Mode.ALL, level, tones(st), null);
        List<Object> ms = new ArrayList<>();
        for (RuleMatch m : cr.getRuleMatches()) if (m.getRule().getId().startsWith(SynthRules.PREFIX)) ms.add(matchDump(m));
        o.put("matches", ms);
        return o;
      }
      default: throw new IllegalArgumentException("step " + d);
    }
  }

  // ---- analyze-raw

  /** Compact token: [text, startPos, endPos, posFix, cleanToken, whitespaceBefore, flags, readings [[token,lemma,pos]...], chunkTags]; flags bits: 1 immunized, 2 ignoreSpelling, 4 sentStart, 8 sentEnd, 16 paraEnd, 32 whitespace, 64 linebreak, 128 tagged, 256 typographicApostrophe, 512 isWhitespaceBefore. */
  private static List<Object> tok(AnalyzedTokenReadings t) {
    List<Object> o = new ArrayList<>();
    o.add(t.getToken());
    o.add(t.getStartPos());
    o.add(t.getEndPos());
    o.add(t.getPosFix());
    o.add(t.getCleanToken());
    o.add(t.getWhitespaceBefore());
    o.add((t.isImmunized() ? 1 : 0) | (t.isIgnoredBySpeller() ? 2 : 0) | (t.isSentenceStart() ? 4 : 0) | (t.isSentenceEnd() ? 8 : 0) | (t.isParagraphEnd() ? 16 : 0) | (t.isWhitespace() ? 32 : 0) | (t.isLinebreak() ? 64 : 0) | (t.isTagged() ? 128 : 0) | (t.hasTypographicApostrophe() ? 256 : 0) | (t.isWhitespaceBefore() ? 512 : 0));
    List<Object> rs = new ArrayList<>();
    for (AnalyzedToken r : t.getReadings()) rs.add(Arrays.asList(r.getToken(), r.getLemma(), r.getPOSTag()));
    o.add(rs);
    List<String> ch = new ArrayList<>();
    for (ChunkTag c : t.getChunkTags()) ch.add(c.getChunkTag());
    o.add(ch);
    return o;
  }

  private static List<Object> toks(AnalyzedTokenReadings[] a) {
    List<Object> l = new ArrayList<>();
    for (AnalyzedTokenReadings t : a) l.add(tok(t));
    return l;
  }

  /** {lang, texts:[string]} -> per text: sentences[{text, raw, post, pre, disambChanged}], analyzeText[post dumps], disambChanged */
  static Object analyzeRaw(JsonNode a) throws Exception {
    String key = "analyze|" + a.get("lang").asText();
    HarnessLT lt = CACHE.get(key);
    if (lt == null) {
      lt = new HarnessLT(Languages.getLanguageForShortCode(a.get("lang").asText()), (Language) null);
      lt.setCleanOverlappingMatches(false);
      CACHE.put(key, lt);
    }
    List<Object> results = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        String text = tn.asText();
        List<Object> ss = new ArrayList<>();
        boolean any = false;
        for (String s : lt.sentenceTokenize(text)) {
          Map<String, Object> so = new LinkedHashMap<>();
          so.put("text", s);
          AnalyzedSentence raw = lt.getRawAnalyzedSentence(s);
          AnalyzedSentence post = lt.getAnalyzedSentence(s);
          List<Object> rd = toks(raw.getTokens()), pd = toks(post.getTokens());
          so.put("raw", rd);
          so.put("post", pd);
          so.put("pre", toks(post.getPreDisambigTokens()));
          boolean changed = !rd.equals(pd);
          so.put("disambChanged", changed);
          any |= changed;
          ss.add(so);
        }
        r.put("sentences", ss);
        List<Object> at = new ArrayList<>();
        for (AnalyzedSentence s : lt.analyzeText(text)) {
          Map<String, Object> so = new LinkedHashMap<>();
          so.put("text", s.getText());
          so.put("tokens", toks(s.getTokens()));
          so.put("pre", toks(s.getPreDisambigTokens()));
          at.add(so);
        }
        r.put("analyzeText", at);
        r.put("disambChanged", any);
      } catch (Throwable t) {
        r.putAll(errorOf(t));
      }
      results.add(r);
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("results", results);
    return out;
  }
}
