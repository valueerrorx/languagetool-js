package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.*;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;

import java.io.*;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/** Ops for X-RULELOAD: rule-load, ruleset-hints. Format: docs/review/F25-oracle.md. */
final class RuleLoadOps {
  private RuleLoadOps() {}

  private static final Map<String, List<AbstractPatternRule>> CACHE = new HashMap<>();
  private static final Map<String, Object> ERR_CACHE = new HashMap<>();

  static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    List<Object> causes = new ArrayList<>();
    for (Throwable c = t.getCause(); c != null && causes.size() < 20; c = c.getCause()) {
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

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  private static Object fld(Object o, Class<?> c, String name) {
    try {
      Field f = c.getDeclaredField(name);
      f.setAccessible(true);
      return f.get(o);
    } catch (Exception e) {
      return "<reflect-error:" + e.getClass().getSimpleName() + ">";
    }
  }

  private static Object call(Object o, Class<?> c, String name) {
    try {
      Method m = c.getDeclaredMethod(name);
      m.setAccessible(true);
      return m.invoke(o);
    } catch (Exception e) {
      return "<reflect-error:" + e.getClass().getSimpleName() + ">";
    }
  }

  static Language lang(String code) { return Languages.getLanguageForShortCode(code); }

  // ---- dumps ----

  private static final String[] FLAG_NAMES = {"inflected", "negation", "testWhitespace", "whitespaceBefore", "insideMarker",
      "exceptionValidNext", "mayBeOmitted", "testString", "unificationNeutral", "uniNegation", "lastUnified"};

  static Map<String, Object> matchDump(Match m) {
    if (m == null) return null;
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("posTag", m.getPosTag());
    o.put("suppressMisspelled", fld(m, Match.class, "suppressMisspelled"));
    o.put("regexMatch", m.getRegexMatch() == null ? null : m.getRegexMatch().pattern());
    o.put("regexMatchFlags", m.getRegexMatch() == null ? null : m.getRegexMatch().flags());
    o.put("regexReplace", m.getRegexReplace());
    o.put("posRegexMatch", m.getPosRegexMatch() == null ? null : m.getPosRegexMatch().pattern());
    o.put("postagRegexp", m.isPostagRegexp());
    o.put("posTagReplace", m.getPosTagReplace());
    o.put("caseConversion", m.getCaseConversionType() == null ? null : m.getCaseConversionType().name());
    o.put("includeSkipped", m.getIncludeSkipped() == null ? null : m.getIncludeSkipped().name());
    o.put("setsPos", m.setsPos());
    o.put("staticLemma", m.isStaticLemma());
    o.put("lemma", m.getLemma());
    o.put("tokenRef", m.getTokenRef());
    o.put("inMessageOnly", m.isInMessageOnly());
    return o;
  }

  static Map<String, Object> tokenDump(PatternToken t) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("string", t.getString());
    o.put("caseSensitive", t.isCaseSensitive());
    o.put("regexp", t.isRegularExpression());
    o.put("inflected", t.isInflected());
    o.put("negation", t.getNegation());
    if (t.getPOStag() != null || t.isPOStagRegularExpression() || t.getPOSNegation()) {
      Map<String, Object> p = new LinkedHashMap<>();
      p.put("tag", t.getPOStag());
      p.put("regexp", t.isPOStagRegularExpression());
      p.put("negation", t.getPOSNegation());
      o.put("pos", p);
    } else {
      o.put("pos", null);
    }
    o.put("chunk", t.getChunkTag() == null ? null : t.getChunkTag().getChunkTag());
    o.put("skip", t.getSkipNext());
    o.put("min", t.getMinOccurrence());
    o.put("max", t.getMaxOccurrence());
    short flags = ((Number) fld(t, PatternToken.class, "flags")).shortValue();
    List<String> fl = new ArrayList<>();
    for (int i = 0; i < FLAG_NAMES.length; i++) if ((flags & (1 << i)) != 0) fl.add(FLAG_NAMES[i]);
    o.put("flags", fl);
    o.put("sentenceStart", t.isSentenceStart());
    o.put("referenceElement", t.isReferenceElement());
    o.put("phrase", t.getPhraseName());
    o.put("partOfPhrase", t.isPartOfPhrase());
    o.put("unified", t.isUnified());
    o.put("uniFeatures", t.getUniFeatures());
    o.put("uniNegated", t.isUniNegated());
    o.put("lastInUnification", t.isLastInUnification());
    o.put("unificationNeutral", t.isUnificationNeutral());
    o.put("insideMarker", t.isInsideMarker());
    o.put("match", matchDump(t.getMatch()));
    Object rare = fld(t, PatternToken.class, "rareFields");
    List<Object> ex = new ArrayList<>();
    if (rare != null && !(rare instanceof String)) {
      Class<?> rc = rare.getClass();
      for (Object e : (PatternToken[]) fld(rare, rc, "currentAndNextExceptions")) {
        PatternToken pt = (PatternToken) e;
        short ef = ((Number) fld(pt, PatternToken.class, "flags")).shortValue();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scope", (ef & 0x20) != 0 ? "next" : "current");
        m.put("token", tokenDump(pt));
        ex.add(m);
      }
      for (Object e : (PatternToken[]) fld(rare, rc, "previousExceptions")) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scope", "previous");
        m.put("token", tokenDump((PatternToken) e));
        ex.add(m);
      }
    }
    o.put("exceptions", ex);
    o.put("and", t.hasAndGroup() ? dumpTokens(t.getAndGroup()) : null);
    o.put("or", t.hasOrGroup() ? dumpTokens(t.getOrGroup()) : null);
    o.put("text", t.toString());
    return o;
  }

  static List<Object> dumpTokens(List<PatternToken> l) {
    List<Object> r = new ArrayList<>();
    for (PatternToken t : l) r.add(tokenDump(t));
    return r;
  }

  static Object enm(Object e) { return e == null ? null : e.toString(); }

  static Map<String, Object> ruleDump(AbstractPatternRule r, Map<String, Integer> groupSize, boolean detail) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("class", r.getClass().getSimpleName());
    o.put("id", r.getId());
    o.put("subId", r.getSubId());
    o.put("fullId", r.getFullId());
    o.put("groupSize", groupSize == null ? null : groupSize.get(r.getId()));
    o.put("description", r.getDescription());
    Category c = r.getCategory();
    o.put("category", c == null ? null : Arrays.asList(c.getId().toString(), c.getName(), c.isDefaultOff(), c.getLocation().name(), c.getTabName()));
    o.put("defaultOff", r.isDefaultOff());
    o.put("defaultTempOff", r.isDefaultTempOff());
    o.put("officeDefaultOn", r.isOfficeDefaultOn());
    o.put("officeDefaultOff", r.isOfficeDefaultOff());
    o.put("useInOffice", r.useInOffice());
    List<String> tags = new ArrayList<>();
    for (Tag t : r.getTags()) tags.add(t.name());
    o.put("tags", tags);
    List<String> tones = new ArrayList<>();
    for (ToneTag t : r.getToneTags()) tones.add(t.name());
    o.put("toneTags", tones);
    o.put("priority", r.getPriority());
    o.put("sourceFile", r.getSourceFile());
    o.put("premium", r.isPremium());
    o.put("goalSpecific", r.isGoalSpecific());
    o.put("url", r.getUrl() == null ? null : r.getUrl().toString());
    o.put("issueType", enm(r.getLocQualityIssueType()));
    o.put("minPrevMatches", r.getMinPrevMatches());
    o.put("distanceTokens", r.getDistanceTokens());
    o.put("includedInHiddenMatches", r.isIncludedInHiddenMatches());
    o.put("includedInErrorsCorrectedAllAtOnce", r.isIncludedInErrorsCorrectedAllAtOnce());
    o.put("line", r.getXmlLineNumber());
    o.put("start", r.getStartPositionCorrection());
    o.put("end", r.getEndPositionCorrection());
    o.put("message", r.getMessage());
    o.put("suggestionsOutMsg", r.getSuggestionsOutMsg());
    o.put("suggestionMatches", r.getSuggestionMatches() == null ? null : r.getSuggestionMatches().size());
    o.put("suggestionMatchesOutMsg", (fld(r, AbstractPatternRule.class, "suggestionMatchesOutMsg") instanceof List ? (Object) ((List<?>) fld(r, AbstractPatternRule.class, "suggestionMatchesOutMsg")).size() : null));
    Object sm = call(r, AbstractPatternRule.class, "getShortMessage");
    o.put("shortMessage", sm);
    RuleFilter f = r.getFilter();
    o.put("filterClass", f == null ? null : f.getClass().getName());
    o.put("filterArgs", r.getFilterArguments());
    o.put("matchType", enm(r.getType()));
    o.put("adjustSuggestionCase", r.isAdjustSuggestionCase());
    o.put("sentStart", r.isSentStart());
    o.put("testUnification", r.isTestUnification());
    o.put("getUnified", r.isGetUnified());
    o.put("groupsOrUnification", r.isGroupsOrUnification());
    o.put("tokenCount", r.getPatternTokens() == null ? null : r.getPatternTokens().size());
    List<DisambiguationPatternRule> aps = r.getAntiPatterns();
    o.put("antiPatterns", aps.size());
    List<Object> corr = new ArrayList<>();
    for (CorrectExample e : r.getCorrectExamples()) corr.add(e.getExample());
    List<Object> inc = new ArrayList<>();
    for (IncorrectExample e : r.getIncorrectExamples()) inc.add(Arrays.asList(e.getExample(), e.getCorrections()));
    List<Object> trg = new ArrayList<>();
    for (ErrorTriggeringExample e : r.getErrorTriggeringExamples()) trg.add(e.getExample());
    o.put("examples", Arrays.asList(corr, inc, trg));
    o.put("maxSpanTokens", r.getPatternTokens() == null ? null : fld(r, AbstractTokenBasedRule.class, "maxSpanTokens"));
    o.put("minTokenCount", r.getPatternTokens() == null ? null : fld(r, AbstractTokenBasedRule.class, "minTokenCount"));
    if (r instanceof PatternRule) {
      PatternRule p = (PatternRule) r;
      o.put("elementNo", fld(p, PatternRule.class, "elementNo"));
      o.put("useList", fld(p, PatternRule.class, "useList"));
      o.put("complexPhrase", p.isWithComplexPhrase());
      o.put("interpretPosTagsPreDisambiguation", fld(p, PatternRule.class, "interpretPosTagsPreDisambiguation"));
      o.put("memberOfDisjunctiveSet", fld(p, PatternRule.class, "isMemberOfDisjunctiveSet"));
      o.put("patternString", p.toPatternString());
      o.put("estimateContext", p.estimateContextForSureMatch());
    }
    if (r instanceof RegexPatternRule) {
      RegexPatternRule p = (RegexPatternRule) r;
      o.put("regex", p.getPattern().pattern());
      o.put("regexFlags", p.getPattern().flags());
      o.put("markGroup", fld(p, RegexPatternRule.class, "markGroup"));
      o.put("regexCaseSensitive", fld(p, RegexPatternRule.class, "caseSensitive"));
      Object rf = fld(p, RegexPatternRule.class, "regexFilter");
      o.put("regexFilterClass", rf == null ? null : rf.getClass().getName());
      Object rs = fld(p, RegexPatternRule.class, "requiredSubstrings");
      o.put("requiredSubstrings", rs == null ? null : rs.toString());
      o.put("estimateContext", p.estimateContextForSureMatch());
    }
    if (detail) {
      if (r.getPatternTokens() != null) o.put("tokens", dumpTokens(r.getPatternTokens()));
      List<Object> ad = new ArrayList<>();
      for (DisambiguationPatternRule a : aps) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("description", a.getDescription());
        m.put("start", a.getStartPositionCorrection());
        m.put("end", a.getEndPositionCorrection());
        m.put("action", enm(a.getAction()));
        m.put("tokens", dumpTokens(a.getPatternTokens()));
        m.put("untouchedExamples", a.getUntouchedExamples());
        ad.add(m);
      }
      o.put("antiPatternRules", ad);
      List<Object> sms = new ArrayList<>();
      if (r.getSuggestionMatches() != null) for (Match m : r.getSuggestionMatches()) sms.add(matchDump(m));
      o.put("suggestionMatchList", sms);
      List<Object> smo = new ArrayList<>();
      Object lo = fld(r, AbstractPatternRule.class, "suggestionMatchesOutMsg");
      if (lo instanceof List) for (Object m : (List<?>) lo) smo.add(matchDump((Match) m));
      o.put("suggestionMatchOutMsgList", smo);
      if (r instanceof PatternRule) {
        try { o.put("toXML", ((PatternRule) r).toXML()); }
        catch (Throwable t) { o.put("toXML", err(t)); }
      }
    }
    return o;
  }

  static Map<String, Object> compactDump(AbstractPatternRule r, Map<String, Integer> gs) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("fullId", r.getFullId());
    o.put("class", r.getClass().getSimpleName());
    o.put("category", r.getCategory() == null ? null : r.getCategory().getId().toString());
    o.put("defaultOff", r.isDefaultOff());
    o.put("defaultTempOff", r.isDefaultTempOff());
    o.put("premium", r.isPremium());
    o.put("priority", r.getPriority());
    o.put("tokenCount", r.getPatternTokens() == null ? null : r.getPatternTokens().size());
    o.put("antiPatterns", r.getAntiPatterns().size());
    o.put("sourceFile", r.getSourceFile());
    o.put("message", r.getMessage());
    return o;
  }

  private static Map<String, Integer> groupSizes(List<AbstractPatternRule> rules) {
    Map<String, Integer> m = new HashMap<>();
    for (AbstractPatternRule r : rules) m.merge(r.getId(), 1, Integer::sum);
    return m;
  }

  // ---- loading ----

  static List<String> ruleFiles(Language l) { return l.getRuleFileNames(); }

  static List<AbstractPatternRule> loadFile(Language l, String fileName) throws IOException {
    String key = l.getShortCodeWithCountryAndVariant() + "|" + fileName;
    if (CACHE.containsKey(key)) return CACHE.get(key);
    PatternRuleLoader ruleLoader = new PatternRuleLoader();
    InputStream is = JLanguageTool.getDataBroker().getAsStream(fileName);
    if (is == null) is = new FileInputStream(fileName);
    try (InputStream s = is) {
      List<AbstractPatternRule> rules = ruleLoader.getRules(s, fileName, l);
      CACHE.put(key, rules);
      return rules;
    }
  }

  private static boolean has(Object o) { return o != null; }

  private static Set<String> features(AbstractPatternRule r) {
    Set<String> f = new LinkedHashSet<>();
    if (r.getFilter() != null) f.add("filter");
    if (r instanceof RegexPatternRule) f.add("regexRule");
    if (!r.getAntiPatterns().isEmpty()) f.add("antipattern");
    if (r.isDefaultOff()) f.add("defaultOff");
    if (r.isDefaultTempOff()) f.add("defaultTempOff");
    if (!r.getTags().isEmpty()) f.add("tags");
    if (!r.getToneTags().isEmpty()) f.add("toneTags");
    if (r.isPremium()) f.add("premium");
    if (r.getPriority() != 0) f.add("prio");
    if (r.getMinPrevMatches() != 0) f.add("minPrev");
    if (r.getSuggestionMatches() != null && !r.getSuggestionMatches().isEmpty()) f.add("suggestionMatch");
    if (r.getSuggestionsOutMsg() != null && !r.getSuggestionsOutMsg().isEmpty()) f.add("outMsg");
    if (!r.getErrorTriggeringExamples().isEmpty()) f.add("triggersError");
    if (r.getStartPositionCorrection() != 0) f.add("startCorr");
    if (r.getEndPositionCorrection() != 0) f.add("endCorr");
    if (r instanceof PatternRule) {
      PatternRule p = (PatternRule) r;
      if (p.isWithComplexPhrase()) f.add("complexPhrase");
      if (r.isTestUnification()) f.add("unification");
      if (r.isSentStart()) f.add("sentStart");
      for (PatternToken t : r.getPatternTokens()) tokenFeatures(t, f);
    }
    return f;
  }

  private static void tokenFeatures(PatternToken t, Set<String> f) {
    if (t.isRegularExpression()) f.add("tokRegexp");
    if (t.isInflected()) f.add("tokInflected");
    if (t.getNegation()) f.add("tokNegation");
    if (t.getPOStag() != null) f.add(t.isPOStagRegularExpression() ? "posRegexp" : "posPlain");
    if (t.getPOSNegation()) f.add("posNegation");
    if (t.getChunkTag() != null) f.add("chunk");
    if (t.getSkipNext() != 0) f.add("skip");
    if (t.getMinOccurrence() != 1) f.add("min");
    if (t.getMaxOccurrence() != 1) f.add("max");
    if (t.isPartOfPhrase()) f.add("phrase");
    if (t.isUnified()) f.add("tokUnified");
    if (t.isUnificationNeutral()) f.add("unificationNeutral");
    if (t.getMatch() != null) f.add("tokMatch");
    if (t.hasAndGroup()) f.add("and");
    if (t.hasOrGroup()) f.add("or");
    if (t.isSentenceStart()) f.add("sentenceStart");
    if (t.isCaseSensitive()) f.add("caseSensitive");
    if (!t.isInsideMarker()) f.add("outsideMarker");
    if (t.hasExceptionList()) {
      Object rare = fld(t, PatternToken.class, "rareFields");
      if (rare != null && !(rare instanceof String)) {
        for (Object e : (PatternToken[]) fld(rare, rare.getClass(), "currentAndNextExceptions")) {
          short ef = ((Number) fld(e, PatternToken.class, "flags")).shortValue();
          f.add((ef & 0x20) != 0 ? "exNext" : "exCurrent");
          tokenFeatures((PatternToken) e, new HashSet<>());
        }
        if (((PatternToken[]) fld(rare, rare.getClass(), "previousExceptions")).length > 0) f.add("exPrevious");
      }
    }
  }

  // ---- ops ----

  /**
   * {mode:"files"} -> languages (de/en/fr) with ruleFiles and existence
   * {mode:"file", lang, file:int, offset, limit, detail} -> {file, total, rules[]}
   * {mode:"tokens", lang, file, limit, extraPerFeature} -> sampled detailed rules
   * {mode:"patternRules", lang} -> Language#getPatternRules before/after JLanguageTool
   * {mode:"inline", lang, xml, filename, relaxed, via:"stream"|"file", detail} -> {rules[]} | {error}
   * {mode:"builder", tokens:[[ [name,arg?]... ]]} -> token dumps
   */
  static Object ruleLoad(JsonNode a) throws Exception {
    String mode = a.get("mode").asText();
    switch (mode) {
      case "files": return files(a);
      case "file": return file(a);
      case "tokens": return tokens(a);
      case "patternRules": return patternRules(a);
      case "inline": return inline(a);
      case "builder": return builder(a);
      default: throw new IllegalArgumentException("unknown mode: " + mode);
    }
  }

  private static Object files(JsonNode a) {
    List<Object> out = new ArrayList<>();
    for (Language l : Languages.get()) {
      String sc = l.getShortCode();
      if (!(sc.equals("de") || sc.equals("en") || sc.equals("fr"))) continue;
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("code", l.getShortCodeWithCountryAndVariant());
      m.put("class", l.getClass().getName());
      List<Object> fs = new ArrayList<>();
      for (String fn : l.getRuleFileNames()) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("name", fn);
        InputStream is = null;
        try {
          is = JLanguageTool.getDataBroker().getAsStream(fn);
        } catch (Throwable t) {
          // ignore
        }
        f.put("inBroker", is != null);
        if (is != null) try { is.close(); } catch (IOException e) { /* ignore */ }
        fs.add(f);
      }
      m.put("files", fs);
      out.add(m);
    }
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("languages", out);
    return w;
  }

  private static Object file(JsonNode a) {
    Language l = lang(a.get("lang").asText());
    List<String> names = ruleFiles(l);
    int fi = a.get("file").asInt();
    Map<String, Object> w = new LinkedHashMap<>();
    if (fi >= names.size()) { w.put("file", null); w.put("total", 0); w.put("rules", new ArrayList<>()); return w; }
    String fn = names.get(fi);
    w.put("file", fn);
    try {
      List<AbstractPatternRule> rules = loadFile(l, fn);
      Map<String, Integer> gs = groupSizes(rules);
      int off = a.has("offset") ? a.get("offset").asInt() : 0;
      int lim = a.has("limit") ? a.get("limit").asInt() : Integer.MAX_VALUE;
      boolean detail = a.has("detail") && a.get("detail").asBoolean();
      w.put("total", rules.size());
      List<Object> out = new ArrayList<>();
      boolean compact = a.has("compact") && a.get("compact").asBoolean();
      for (int i = off; i < rules.size() && i < off + lim; i++) out.add(compact ? compactDump(rules.get(i), gs) : ruleDump(rules.get(i), gs, detail));
      w.put("rules", out);
    } catch (Throwable t) {
      w.put("error", err(t).get("error"));
    }
    return w;
  }

  private static Object tokens(JsonNode a) {
    Language l = lang(a.get("lang").asText());
    List<String> names = ruleFiles(l);
    int fi = a.get("file").asInt();
    int limit = a.has("limit") ? a.get("limit").asInt() : 200;
    int extra = a.has("extraPerFeature") ? a.get("extraPerFeature").asInt() : 2;
    Map<String, Object> w = new LinkedHashMap<>();
    if (fi >= names.size()) { w.put("file", null); w.put("rules", new ArrayList<>()); return w; }
    String fn = names.get(fi);
    w.put("file", fn);
    try {
      List<AbstractPatternRule> rules = loadFile(l, fn);
      Map<String, Integer> gs = groupSizes(rules);
      int n = rules.size();
      int stride = Math.max(1, (n + limit - 1) / limit);
      TreeSet<Integer> pick = new TreeSet<>();
      for (int i = 0; i < n; i += stride) pick.add(i);
      Map<String, Integer> featCount = new LinkedHashMap<>();
      Map<Integer, List<String>> why = new HashMap<>();
      for (int i = 0; i < n; i++) {
        for (String f : features(rules.get(i))) {
          int c = featCount.merge(f, 1, Integer::sum);
          if (c <= extra) { pick.add(i); why.computeIfAbsent(i, k -> new ArrayList<>()).add(f); }
        }
      }
      w.put("total", n);
      w.put("stride", stride);
      w.put("featureCounts", featCount);
      List<Object> out = new ArrayList<>();
      for (int i : pick) {
        Map<String, Object> d = ruleDump(rules.get(i), gs, true);
        d.put("index", i);
        d.put("pickedFor", why.getOrDefault(i, new ArrayList<>()));
        out.add(d);
      }
      w.put("rules", out);
    } catch (Throwable t) {
      w.put("error", err(t).get("error"));
    }
    return w;
  }

  private static Object patternRules(JsonNode a) throws Exception {
    Language l = lang(a.get("lang").asText());
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("defaultEnabledForVariant", l.getDefaultEnabledRulesForVariant());
    w.put("defaultDisabledForVariant", l.getDefaultDisabledRulesForVariant());
    // fresh state from the loader
    Map<String, boolean[]> before = new LinkedHashMap<>();
    List<String> order = new ArrayList<>();
    List<AbstractPatternRule> fresh = new ArrayList<>();
    PatternRuleLoader loader = new PatternRuleLoader();
    for (String fn : ruleFiles(l)) {
      InputStream is = JLanguageTool.getDataBroker().getAsStream(fn);
      if (is == null) continue;
      try (InputStream s = is) { fresh.addAll(loader.getRules(s, fn, l)); }
    }
    Method m = Language.class.getDeclaredMethod("getPatternRules");
    m.setAccessible(true);
    new JLanguageTool(l);
    @SuppressWarnings("unchecked")
    List<AbstractPatternRule> shared = (List<AbstractPatternRule>) m.invoke(l);
    w.put("count", shared.size());
    w.put("freshCount", fresh.size());
    List<Object> ids = new ArrayList<>();
    List<Object> diffs = new ArrayList<>();
    for (int i = 0; i < shared.size(); i++) {
      AbstractPatternRule s = shared.get(i);
      ids.add(s.getFullId());
      if (i < fresh.size()) {
        AbstractPatternRule f = fresh.get(i);
        if (!f.getFullId().equals(s.getFullId())) { diffs.add(Arrays.asList(i, "idMismatch", f.getFullId(), s.getFullId())); continue; }
        if (f.isDefaultOff() != s.isDefaultOff() || f.isDefaultTempOff() != s.isDefaultTempOff()) {
          diffs.add(Arrays.asList(i, s.getFullId(), f.isDefaultOff(), f.isDefaultTempOff(), s.isDefaultOff(), s.isDefaultTempOff()));
        }
      }
    }
    w.put("fullIds", ids);
    w.put("defaultChangedByActivation", diffs);
    // second call returns the same shared list
    w.put("sameInstanceOnSecondCall", m.invoke(l) == shared);
    return w;
  }

  private static Object inline(JsonNode a) {
    Language l = lang(a.has("lang") ? a.get("lang").asText() : "en-US");
    String xml = a.get("xml").asText();
    String filename = a.has("filename") ? a.get("filename").asText() : "inline-test.xml";
    boolean relaxed = a.has("relaxed") && a.get("relaxed").asBoolean();
    boolean detail = !a.has("detail") || a.get("detail").asBoolean();
    String via = a.has("via") ? a.get("via").asText() : "stream";
    boolean unifier = a.has("unifier") && a.get("unifier").asBoolean();
    Map<String, Object> w = new LinkedHashMap<>();
    if (unifier) resetUnifierConfig(l);
    try {
      PatternRuleLoader loader = new PatternRuleLoader();
      loader.setRelaxedMode(relaxed);
      List<AbstractPatternRule> rules;
      byte[] bytes = xml.getBytes(StandardCharsets.UTF_8);
      if (via.equals("file")) {
        File f = File.createTempFile("ruleload", ".xml");
        try {
          Files.write(f.toPath(), bytes);
          rules = loader.getRules(f, l);
        } finally { f.delete(); }
      } else {
        rules = loader.getRules(new ByteArrayInputStream(bytes), filename, l);
      }
      Map<String, Integer> gs = groupSizes(rules);
      List<Object> out = new ArrayList<>();
      for (AbstractPatternRule r : rules) {
        Map<String, Object> d = ruleDump(r, gs, detail);
        out.add(d);
      }
      w.put("rules", out);
      if (a.has("posDetail") && a.get("posDetail").asBoolean()) {
        List<Object> pd = new ArrayList<>();
        for (AbstractPatternRule r : rules) pd.add(r.getPatternTokens() == null ? null : posDetailList(r.getPatternTokens()));
        w.put("posDetail", pd);
      }
    } catch (Throwable t) {
      w.put("error", err(t).get("error"));
    }
    if (unifier) w.put("unifier", unifierDump(l));
    return w;
  }

  private static final String[] POS_PROBES = {"NN", "UNKNOWN", "N|B", "N", "B", "A", "VB", "NNS", "", "N\\", "unknown", "A|UNKNOWN", "x"};

  // option "posDetail": per pattern token PosToken.posUnknown and POS matcher possible values / probe results
  private static List<Object> posDetailList(List<PatternToken> toks) {
    List<Object> l = new ArrayList<>();
    for (PatternToken t : toks) l.add(posDetail(t));
    return l;
  }

  private static Object posDetail(PatternToken t) {
    Map<String, Object> o = new LinkedHashMap<>();
    Object pt = fld(t, PatternToken.class, "posToken");
    if (pt == null) { o.put("posToken", null); }
    else {
      Class<?> c = pt.getClass();
      o.put("tag", fld(pt, c, "posTag"));
      o.put("posUnknown", fld(pt, c, "posUnknown"));
      o.put("negation", fld(pt, c, "negation"));
      StringMatcher m = (StringMatcher) fld(pt, c, "posPattern");
      if (m == null) { o.put("matcher", null); }
      else {
        Map<String, Object> md = new LinkedHashMap<>();
        md.put("possibleValues", vals(m.getPossibleValues()));
        Map<String, Object> pr = new LinkedHashMap<>();
        for (String s : POS_PROBES) {
          try { pr.put(s, m.matches(s)); } catch (Throwable e) { pr.put(s, "ERR " + e.getClass().getName()); }
        }
        md.put("probe", pr);
        o.put("matcher", md);
      }
    }
    List<Object> ex = new ArrayList<>();
    for (PatternToken e : t.getExceptionList()) ex.add(posDetail(e));
    o.put("exceptions", ex);
    return o;
  }

  // option "unifier": fresh UnifierConfiguration per request (shared Language instance), dumped after loading
  private static void resetUnifierConfig(Language l) {
    try {
      Field f = Language.class.getDeclaredField("unifierConfig");
      f.setAccessible(true);
      f.set(l, new org.languagetool.rules.patterns.UnifierConfiguration());
    } catch (Exception e) { throw new RuntimeException(e); }
  }

  private static Object unifierDump(Language l) {
    org.languagetool.rules.patterns.UnifierConfiguration c = l.getUnifierConfiguration();
    Map<String, Object> o = new LinkedHashMap<>();
    List<Object> feats = new ArrayList<>();
    for (Map.Entry<String, List<String>> e : c.getEquivalenceFeatures().entrySet()) {
      List<Object> en = new ArrayList<>();
      en.add(e.getKey());
      en.add(new ArrayList<>(e.getValue()));
      feats.add(en);
    }
    o.put("features", feats);
    List<Object> types = new ArrayList<>();
    for (Map.Entry<?, PatternToken> e : c.getEquivalenceTypes().entrySet()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("feature", fld(e.getKey(), e.getKey().getClass(), "feature"));
      m.put("type", fld(e.getKey(), e.getKey().getClass(), "type"));
      m.put("token", tokenDump(e.getValue()));
      types.add(m);
    }
    o.put("types", types);
    return o;
  }

  static PatternToken buildToken(JsonNode calls) {
    PatternTokenBuilder b = new PatternTokenBuilder();
    for (JsonNode c : calls) {
      String name = c.get(0).asText();
      String arg = c.size() > 1 && !c.get(1).isNull() ? c.get(1).asText() : null;
      switch (name) {
        case "token": b.token(arg); break;
        case "csToken": b.csToken(arg); break;
        case "tokenRegex": b.tokenRegex(arg); break;
        case "csTokenRegex": b.csTokenRegex(arg); break;
        case "pos": b.pos(arg); break;
        case "posRegex": b.posRegex(arg); break;
        case "posRegexWithStringException": b.posRegexWithStringException(arg, c.get(2).asText()); break;
        case "min": b.min(c.get(1).asInt()); break;
        case "max": b.max(c.get(1).asInt()); break;
        case "mark": b.mark(c.get(1).asBoolean()); break;
        case "negate": b.negate(); break;
        case "setSkip": b.setSkip(c.get(1).asInt()); break;
        case "setIsWhiteSpaceBefore": b.setIsWhiteSpaceBefore(c.get(1).asBoolean()); break;
        case "matchInflectedForms": b.matchInflectedForms(); break;
        case "nullToken": b.token(null); break;
        default: throw new IllegalArgumentException("unknown builder call: " + name);
      }
    }
    return b.build();
  }

  private static Object builder(JsonNode a) {
    List<Object> out = new ArrayList<>();
    for (JsonNode spec : a.get("tokens")) {
      Object r;
      try {
        if (spec.isObject()) {
          // PatternRuleBuilderHelper statics
          String h = spec.get("helper").asText();
          String arg = spec.get("arg").asText();
          PatternToken t;
          switch (h) {
            case "csToken": t = PatternRuleBuilderHelper.csToken(arg); break;
            case "pos": t = PatternRuleBuilderHelper.pos(arg); break;
            case "token": t = PatternRuleBuilderHelper.token(arg); break;
            case "regex": t = PatternRuleBuilderHelper.regex(arg); break;
            case "csRegex": t = PatternRuleBuilderHelper.csRegex(arg); break;
            default: throw new IllegalArgumentException("unknown helper: " + h);
          }
          r = tokenDump(t);
        } else {
          r = tokenDump(buildToken(spec));
        }
      } catch (Throwable t) {
        r = err(t);
      }
      out.add(r);
    }
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("tokens", out);
    return w;
  }

  /**
   * {kind:"text"|"lemma"|"plain", rules:[ [ [call,arg]... ] | {tokens:[[...]...]} ], sentence:[{t,pos,lemma}]}
   * -> {indices[]}
   */
  static Object rulesetHints(JsonNode a) throws Exception {
    Language l = lang(a.has("lang") ? a.get("lang").asText() : "en-US");
    List<Rule> rules = new ArrayList<>();
    for (JsonNode spec : a.get("rules")) {
      List<PatternToken> toks = new ArrayList<>();
      if (spec.isObject()) for (JsonNode t : spec.get("tokens")) toks.add(buildToken(t));
      else toks.add(buildToken(spec));
      rules.add(new PatternRule("", l, toks, "", "", ""));
    }
    if (a.has("dump")) return hintOrder(rules);
    String kind = a.get("kind").asText();
    RuleSet rs;
    switch (kind) {
      case "text": rs = RuleSet.textHinted(rules); break;
      case "lemma": rs = RuleSet.textLemmaHinted(rules); break;
      default: rs = RuleSet.plain(rules); break;
    }
    List<AnalyzedTokenReadings> atr = new ArrayList<>();
    for (JsonNode t : a.get("sentence")) {
      atr.add(new AnalyzedTokenReadings(new AnalyzedToken(t.get("t").asText(), str(t.get("pos")), str(t.get("lemma")))));
    }
    AnalyzedSentence s = new AnalyzedSentence(atr.toArray(new AnalyzedTokenReadings[0]));
    List<Object> idx = new ArrayList<>();
    for (Rule r : rs.rulesForSentence(s)) {
      for (int i = 0; i < rules.size(); i++) if (rules.get(i) == r) { idx.add(i); break; }
    }
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("indices", idx);
    return w;
  }

  private static List<String> vals(Object set) {
    if (set == null) return null;
    return new ArrayList<>((Collection<String>) set);
  }

  private static Object hintDump(Object th) {
    if (th == null) return null;
    Class<?> c = th.getClass();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("inflected", fld(th, c, "inflected"));
    m.put("tokenIndex", fld(th, c, "tokenIndex"));
    m.put("lowerCaseValues", Arrays.asList((String[]) fld(th, c, "lowerCaseValues")));
    return m;
  }

  /** {dump:true, rules} -> per rule: token possible values / form+lemma hints (iteration order), tokenHints, anchorHint. */
  @SuppressWarnings("unchecked")
  private static Object hintOrder(List<Rule> rules) throws Exception {
    List<Object> out = new ArrayList<>();
    for (Rule r : rules) {
      Map<String, Object> d = new LinkedHashMap<>();
      List<Object> toks = new ArrayList<>();
      for (PatternToken t : ((PatternRule) r).getPatternTokens()) {
        Map<String, Object> td = new LinkedHashMap<>();
        Object tm = fld(t, PatternToken.class, "textMatcher");
        td.put("possibleValues", vals(((StringMatcher) tm).getPossibleValues()));
        td.put("formHints", vals(call(t, PatternToken.class, "calcFormHints")));
        td.put("lemmaHints", vals(call(t, PatternToken.class, "calcLemmaHints")));
        toks.add(td);
      }
      d.put("tokens", toks);
      Object[] ths = (Object[]) fld(r, AbstractTokenBasedRule.class, "tokenHints");
      if (ths == null) d.put("tokenHints", null);
      else { List<Object> l = new ArrayList<>(); for (Object th : ths) l.add(hintDump(th)); d.put("tokenHints", l); }
      d.put("anchorHint", hintDump(fld(r, AbstractTokenBasedRule.class, "anchorHint")));
      out.add(d);
    }
    Map<String, Object> w = new LinkedHashMap<>();
    w.put("rules", out);
    return w;
  }
}
