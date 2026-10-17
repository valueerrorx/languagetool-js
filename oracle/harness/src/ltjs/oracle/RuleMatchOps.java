package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.Chunker;
import org.languagetool.rules.*;
import org.languagetool.rules.CorrectExample;
import org.languagetool.rules.IncorrectExample;
import org.languagetool.rules.patterns.*;
import org.languagetool.synthesis.Synthesizer;

import java.lang.reflect.*;
import java.util.*;

/** Ops for X-RULEMATCH: rule-match, match-state, rulematch-harvest. Format: docs/review/F29-oracle.md. */
final class RuleMatchOps {
  private RuleMatchOps() {}

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  static Object err(Throwable t) {
    while ((t instanceof InvocationTargetException || t instanceof UndeclaredThrowableException) && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t instanceof NullPointerException ? null : t.getMessage());
    return Collections.singletonMap("error", e);
  }

  // ---- sentences (same convention as seq-match: raw tagger output, no-op chunker) ----
  static AnalyzedSentence sentence(Language l, JsonNode tn) throws Exception {
    JLanguageTool lt = SeqMatchOps.tool(l);
    Chunker saved = l.getChunker();
    try {
      if (tn.isObject()) {
        List<AnalyzedTokenReadings> l2 = new ArrayList<>();
        int pos = 0;
        for (JsonNode sy : tn.get("syn")) {
          AnalyzedTokenReadings atr = SeqMatchOps.synth(sy, pos);
          l2.add(atr);
          pos += atr.getToken() == null ? 0 : atr.getToken().length();
        }
        return new AnalyzedSentence(l2.toArray(new AnalyzedTokenReadings[0]));
      }
      l.setChunker(SeqMatchOps.NOOP);
      return lt.getRawAnalyzedSentence(tn.asText());
    } finally {
      l.setChunker(saved);
    }
  }

  // ---- rule-match ----
  private static Object dump(RuleMatch m) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("from", m.getFromPos());
    o.put("to", m.getToPos());
    o.put("patFrom", m.getPatternFromPos());
    o.put("patTo", m.getPatternToPos());
    o.put("line", m.getLine());
    o.put("column", m.getColumn());
    o.put("endLine", m.getEndLine());
    o.put("endColumn", m.getEndColumn());
    o.put("message", m.getMessage());
    o.put("shortMessage", m.getShortMessage());
    o.put("suggestions", new ArrayList<>(m.getSuggestedReplacements()));
    List<Object> objs = new ArrayList<>();
    for (SuggestedReplacement s : m.getSuggestedReplacementObjects()) objs.add(Arrays.asList(s.getReplacement(), s.getShortDescription(), s.getSuffix()));
    o.put("replObjects", objs);
    o.put("url", m.getUrl() == null ? null : m.getUrl().toString());
    o.put("ruleUrl", m.getRule().getUrl() == null ? null : m.getRule().getUrl().toString());
    o.put("fullId", m.getRule() instanceof AbstractPatternRule ? ((AbstractPatternRule) m.getRule()).getFullId() : m.getRule().getId());
    o.put("type", m.getType() == null ? null : m.getType().name());
    o.put("fromSent", m.getFromPosSentence());
    o.put("toSent", m.getToPosSentence());
    o.put("original", m.getOriginalErrorStr());
    return o;
  }

  private static final class Abort extends RuntimeException {
    Abort(Throwable c) { super(null, c, false, false); }
  }

  private static final Method DOMATCH, CREATE;
  private static final Class<?> CONSUMER;
  private static final Field USELIST;
  private static final Method PRE;
  static {
    try {
      Class<?> p = AbstractPatternRulePerformer.class;
      CONSUMER = Class.forName("org.languagetool.rules.patterns.AbstractPatternRulePerformer$MatchConsumer");
      DOMATCH = p.getDeclaredMethod("doMatch", AnalyzedSentence.class, AnalyzedTokenReadings[].class, int.class, int.class, CONSUMER);
      DOMATCH.setAccessible(true);
      CREATE = PatternRuleMatcher.class.getDeclaredMethod("createRuleMatch", int[].class, AnalyzedTokenReadings[].class, int.class, int.class, int.class, int.class, AnalyzedSentence.class);
      CREATE.setAccessible(true);
      USELIST = PatternRule.class.getDeclaredField("useList");
      USELIST.setAccessible(true);
      PRE = PatternRule.class.getDeclaredMethod("isInterpretPosTagsPreDisambiguation");
      PRE.setAccessible(true);
    } catch (Exception e) { throw new ExceptionInInitializerError(e); }
  }

  /** Runs PatternRuleMatcher's own doMatch + createRuleMatch (private, reflective); returns RuleMatches before RuleWithMaxFilter. */
  private static List<RuleMatch> rawMatches(AbstractTokenBasedRule rule, AnalyzedSentence sentence, int[] nulls) throws Throwable {
    boolean useList = rule instanceof PatternRule && USELIST.getBoolean(rule);
    PatternRuleMatcher matcher = new PatternRuleMatcher(rule, useList);
    AnalyzedTokenReadings[] tokens = (rule instanceof PatternRule && (boolean) PRE.invoke(rule)) ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
    List<RuleMatch> out = new ArrayList<>();
    Object consumer = Proxy.newProxyInstance(CONSUMER.getClassLoader(), new Class<?>[] {CONSUMER}, (proxy, m, args) -> {
      try {
        Object rm = CREATE.invoke(matcher, args[0], tokens, args[1], args[2], args[3], args[4], sentence);
        if (rm == null) nulls[0]++; else out.add((RuleMatch) rm);
      } catch (InvocationTargetException e) {
        throw new Abort(e.getCause());
      }
      return null;
    });
    try {
      DOMATCH.invoke(matcher, sentence, tokens, 0, Integer.MAX_VALUE, consumer);
    } catch (InvocationTargetException e) {
      Throwable c = e.getCause();
      throw c instanceof Abort ? c.getCause() : c;
    }
    return out;
  }

  /** {lang, xml?, texts:[string|{syn}], jobs:[{src:{file,rule}|{rule}, texts:[i]}]} -> {texts, jobs:[[per text: {raw:[..],nulls,kept:[idx],sugMatches} | {error}]]} */
  static Object ruleMatch(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<Object> textInfo = new ArrayList<>();
    List<AnalyzedSentence> texts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      try {
        AnalyzedSentence s = sentence(l, tn);
        texts.add(s);
        textInfo.add(s.getTokensWithoutWhitespace().length);
      } catch (Throwable t) {
        texts.add(null);
        textInfo.add(err(t));
      }
    }
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      try {
        AbstractTokenBasedRule rule = SeqMatchOps.resolve(job.get("src"), a);
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          AnalyzedSentence s = texts.get(ti.asInt());
          if (s == null) { per.add(null); continue; }
          try {
            int[] nulls = new int[1];
            List<RuleMatch> raw = rawMatches(rule, s, nulls);
            List<RuleMatch> kept = new RuleWithMaxFilter().filter(new ArrayList<>(raw));
            Map<String, Object> o = new LinkedHashMap<>();
            List<Object> rd = new ArrayList<>();
            for (RuleMatch m : raw) rd.add(dump(m));
            List<Integer> ki = new ArrayList<>();
            for (RuleMatch m : kept) ki.add(identityIndex(raw, m));
            o.put("raw", rd);
            o.put("nulls", nulls[0]);
            o.put("kept", ki);
            o.put("sugMatches", rule.getSuggestionMatches().size());
            per.add(o);
          } catch (Throwable t) {
            per.add(err(t));
          }
        }
        jobs.add(per);
      } catch (Throwable t) {
        jobs.add(err(t));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", textInfo);
    o.put("jobs", jobs);
    return o;
  }

  private static int identityIndex(List<RuleMatch> l, RuleMatch m) {
    for (int i = 0; i < l.size(); i++) if (l.get(i) == m) return i;
    return -1;
  }

  // ---- match-state ----
  static Match buildMatch(JsonNode s) {
    Match m = new Match(str(s.get("posTag")), str(s.get("posTagReplace")), s.get("postagRegexp").asBoolean(), str(s.get("regexMatch")), str(s.get("regexReplace")),
        Match.CaseConversion.valueOf(s.get("caseConv").asText()), s.get("setPos").asBoolean(), s.get("suppressMisspelled").asBoolean(),
        Match.IncludeRange.valueOf(s.get("includeSkipped").asText()));
    if (s.has("lemma") && !s.get("lemma").isNull()) m.setLemmaString(s.get("lemma").asText());
    if (s.has("inMessageOnly")) m.setInMessageOnly(s.get("inMessageOnly").asBoolean());
    if (s.has("tokenRef")) m.setTokenRef(s.get("tokenRef").asInt());
    return m;
  }

  private static Object readings(AnalyzedTokenReadings r) {
    if (r == null) return null;
    Map<String, Object> o = new LinkedHashMap<>();
    List<Object> rd = new ArrayList<>();
    for (AnalyzedToken t : r.getReadings()) rd.add(Arrays.asList(t.getToken(), t.getPOSTag(), t.getLemma(), t.isWhitespaceBefore()));
    o.put("token", r.getToken());
    o.put("readings", rd);
    o.put("startPos", r.getStartPos());
    o.put("ws", r.getWhitespaceBefore());
    o.put("chunkTags", r.getChunkTags().toString());
    o.put("immunized", r.isImmunized());
    return o;
  }

  private static Object callOne(Match m, Synthesizer synth, Language lang, AnalyzedSentence sent, JsonNode c, String method, int idx, int next, boolean single) throws Throwable {
    AnalyzedTokenReadings[] toks = sent.getTokensWithoutWhitespace();
    MatchState st = single ? m.createState(synth, toks[idx]) : m.createState(synth, toks, idx, next);
    try {
      switch (method) {
        case "toFinalString": return Arrays.asList(st.toFinalString(lang));
        case "toFinalStringNoLang": return Arrays.asList(st.toFinalString(null));
        case "getTargetPosTag": return st.getTargetPosTag();
        case "filterReadings": return readings(st.filterReadings());
        case "toTokenString": {
          Method tm = MatchState.class.getDeclaredMethod("toTokenString");
          tm.setAccessible(true);
          return tm.invoke(st);
        }
        default: throw new IllegalArgumentException("unknown method: " + method);
      }
    } catch (Throwable t) {
      return err(t);
    }
  }

  /**
   * {lang, texts:[..], cases:[{spec, text, synth:bool, withLang:bool, methods:[..], calls:[[idx,next,single?]] | sweep:[next..]}]}
   * -> {texts, cases:[ {methods..: per call [..]} | {error} ]}; a fresh sentence per case (filterReadings mutates static-lemma tokens).
   */
  static Object matchState(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<Object> cases = new ArrayList<>();
    List<Object> info = new ArrayList<>();
    boolean first = true;
    for (JsonNode cs : a.get("cases")) {
      try {
        Match m = buildMatch(cs.get("spec"));
        Synthesizer synth = cs.get("synth").asBoolean() ? l.getSynthesizer() : null;
        Language lg = cs.get("withLang").asBoolean() ? l : null;
        AnalyzedSentence sent;
        try {
          sent = sentence(l, a.get("texts").get(cs.get("text").asInt()));
        } catch (Throwable t) {
          cases.add(err(t));
          continue;
        }
        int n = sent.getTokensWithoutWhitespace().length;
        List<int[]> calls = new ArrayList<>();
        if (cs.has("sweep")) {
          for (JsonNode nx : cs.get("sweep")) for (int i = 0; i < n; i++) calls.add(new int[] {i, nx.asInt(), 0});
        }
        if (cs.has("calls")) for (JsonNode c : cs.get("calls")) calls.add(new int[] {c.get(0).asInt(), c.get(1).asInt(), c.size() > 2 && c.get(2).asBoolean() ? 1 : 0});
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("n", n);
        for (JsonNode mn : cs.get("methods")) {
          List<Object> res = new ArrayList<>();
          for (int[] c : calls) {
            // fresh state each call; sentence shared except for mutating methods
            AnalyzedSentence s2 = mn.asText().equals("filterReadings") ? sentence(l, a.get("texts").get(cs.get("text").asInt())) : sent;
            try {
              res.add(callOne(m, synth, lg, s2, cs, mn.asText(), c[0], c[1], c[2] == 1));
            } catch (Throwable t) {
              res.add(err(t));
            }
          }
          o.put(mn.asText(), res);
        }
        cases.add(o);
      } catch (Throwable t) {
        cases.add(err(t));
      }
    }
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("cases", cases);
    return r;
  }

  private static String clean(String s) { return s.replaceAll("<[^>]*>", ""); }

  // ---- rulematch-harvest: {lang} -> {files, rules:[[f,r,id,subId,feat{},correct[],incorrect[],specs[]]]} ----
  private static Map<String, Object> spec(Match m) {
    Map<String, Object> s = new LinkedHashMap<>();
    s.put("posTag", m.getPosTag());
    s.put("posTagReplace", m.getPosTagReplace());
    s.put("postagRegexp", m.posRegExp());
    s.put("regexMatch", m.getRegexMatch() == null ? null : m.getRegexMatch().pattern());
    s.put("regexReplace", m.getRegexReplace());
    s.put("caseConv", m.getCaseConversionType().name());
    s.put("setPos", m.setsPos());
    s.put("suppressMisspelled", m.checksSpelling());
    s.put("includeSkipped", m.getIncludeSkipped().name());
    s.put("lemma", m.getLemma());
    s.put("inMessageOnly", m.isInMessageOnly());
    s.put("tokenRef", m.getTokenRef());
    return s;
  }

  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<String> names = l.getRuleFileNames();
    List<Object> out = new ArrayList<>();
    Method outM = AbstractPatternRule.class.getDeclaredMethod("getSuggestionMatchesOutMsg");
    outM.setAccessible(true);
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rules;
      try { rules = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rules.size(); r++) {
        AbstractPatternRule ar = rules.get(r);
        if (!(ar instanceof PatternRule)) continue;
        PatternRule pr = (PatternRule) ar;
        List<Match> sm = pr.getSuggestionMatches();
        @SuppressWarnings("unchecked") List<Match> om = (List<Match>) outM.invoke(pr);
        List<Object> specs = new ArrayList<>();
        for (Match m : sm) specs.add(spec(m));
        for (Match m : om) specs.add(spec(m));
        int msgSug = 0, msgRef = 0;
        String msg = pr.getMessage();
        for (int i = msg.indexOf("<suggestion>"); i >= 0; i = msg.indexOf("<suggestion>", i + 1)) msgSug++;
        for (int i = msg.indexOf('\\'); i >= 0; i = msg.indexOf('\\', i + 1)) msgRef++;
        int pos = 0, posRe = 0, posRep = 0, rxm = 0, rxr = 0, cc = 0, inc = 0, setpos = 0, lem = 0, spell = 0, msgOnly = 0;
        for (Match m : sm) {
          if (m.getPosTag() != null) pos++;
          if (m.posRegExp()) posRe++;
          if (m.getPosTagReplace() != null) posRep++;
          if (m.getRegexMatch() != null) rxm++;
          if (m.getRegexReplace() != null) rxr++;
          if (m.convertsCase()) cc++;
          if (m.getIncludeSkipped() != Match.IncludeRange.NONE) inc++;
          if (m.setsPos()) setpos++;
          if (m.isStaticLemma()) lem++;
          if (m.checksSpelling()) spell++;
          if (m.isInMessageOnly()) msgOnly++;
        }
        int marker = 0;
        for (PatternToken p : pr.getPatternTokens()) if (p.isInsideMarker()) marker++;
        Map<String, Object> feat = new LinkedHashMap<>();
        feat.put("n", pr.getPatternTokens().size());
        feat.put("filter", pr.getFilter() != null);
        feat.put("sm", sm.size()); feat.put("om", om.size());
        feat.put("msgSug", msgSug); feat.put("msgRef", msgRef);
        feat.put("outMsg", !pr.getSuggestionsOutMsg().isEmpty());
        feat.put("short", pr.getShortMessage() != null && !pr.getShortMessage().isEmpty());
        feat.put("url", pr.getUrl() != null);
        feat.put("marker", marker > 0 && marker < pr.getPatternTokens().size());
        feat.put("startCorr", pr.getStartPositionCorrection());
        feat.put("endCorr", pr.getEndPositionCorrection());
        feat.put("adjust", pr.isAdjustSuggestionCase());
        feat.put("pos", pos); feat.put("posRe", posRe); feat.put("posRep", posRep); feat.put("rxm", rxm); feat.put("rxr", rxr);
        feat.put("cc", cc); feat.put("inc", inc); feat.put("setpos", setpos); feat.put("lem", lem); feat.put("spell", spell); feat.put("msgOnly", msgOnly);
        feat.put("unify", pr.isTestUnification());
        feat.put("type", pr.getType() == null ? null : pr.getType().name());
        List<String> cs = new ArrayList<>(), is = new ArrayList<>();
        for (CorrectExample e : pr.getCorrectExamples()) cs.add(clean(e.getExample()));
        for (IncorrectExample e : pr.getIncorrectExamples()) is.add(clean(e.getExample()));
        out.add(Arrays.asList(f, r, pr.getId(), pr.getSubId(), feat, cs, is, specs));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("files", names);
    o.put("rules", out);
    return o;
  }
}
