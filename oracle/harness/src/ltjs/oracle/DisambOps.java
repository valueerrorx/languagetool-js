package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.rules.RuleMatch;
import org.languagetool.rules.RuleWithMaxFilter;
import org.languagetool.rules.CorrectExample;
import org.languagetool.rules.IncorrectExample;
import org.languagetool.rules.patterns.*;
import org.languagetool.tagging.disambiguation.rules.DisambiguatedExample;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;
import org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader;
import org.languagetool.tagging.disambiguation.rules.XmlRuleDisambiguator;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Ops for X-DISAMB: disamb-run, disamb-examples, rule-match-disamb, disamb-harvest. Format: docs/review/F32-oracle.md. */
final class DisambOps {
  private DisambOps() {}

  // ---- XmlRuleDisambiguator with optional inline rules (loadPatternRules is protected; fields of the subclass are not usable in super ctor, hence the static) ----
  private static String INLINE_XML;
  static final class InlineXrd extends XmlRuleDisambiguator {
    InlineXrd(Language l, boolean g) { super(l, g); }
    @Override
    protected List<DisambiguationPatternRule> loadPatternRules(String filename, Language language) throws javax.xml.parsers.ParserConfigurationException, org.xml.sax.SAXException, java.io.IOException {
      if (INLINE_XML != null && filename.equals(language.getShortCode() + "/disambiguation.xml")) {
        return new DisambiguationRuleLoader().getRules(new ByteArrayInputStream(INLINE_XML.getBytes(StandardCharsets.UTF_8)), language, "inline.xml");
      }
      return super.loadPatternRules(filename, language);
    }
  }

  private static final Map<String, XmlRuleDisambiguator> XRD = new HashMap<>();
  private static final Map<String, List<DisambiguationPatternRule>> INLINE_RULES = new HashMap<>();

  static XmlRuleDisambiguator xrd(Language l, boolean global, String xml) {
    String key = l.getShortCodeWithCountryAndVariant() + "|" + global + "|" + xml;
    XmlRuleDisambiguator d = XRD.get(key);
    if (d == null) {
      INLINE_XML = xml;
      try { d = new InlineXrd(l, global); } finally { INLINE_XML = null; }
      XRD.put(key, d);
    }
    return d;
  }

  static List<DisambiguationPatternRule> rules(Language l, String xml) throws Exception {
    if (xml == null) return UnifyOps.disambRules(l);
    String key = l.getShortCodeWithCountryAndVariant() + "|" + xml;
    List<DisambiguationPatternRule> r = INLINE_RULES.get(key);
    if (r == null) {
      r = new DisambiguationRuleLoader().getRules(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), l, "inline.xml");
      INLINE_RULES.put(key, r);
    }
    return r;
  }

  /** {error:{class,message,causes:[{class,message}]}}; NPE messages are blanked (helpful NPE text is a JVM detail) */
  static Object errc(Throwable t) {
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

  private static boolean bool(JsonNode a, String k) { return a.has(k) && a.get(k).asBoolean(); }
  private static String strOrNull(JsonNode a, String k) { return a.has(k) && !a.get(k).isNull() ? a.get(k).asText() : null; }

  static String sha1(String s) {
    try {
      byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte b : d) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) { throw new RuntimeException(e); }
  }

  // ---- dumps ----
  /** [text,startPos,endPos,posFix,cleanToken,whitespaceBefore,flags,readings[[token,lemma,pos(,rflags)]],chunkTags]; flags as in analyze-raw; rflags 1 = reading isWhitespaceBefore, 2 = hasNoTag */
  static List<Object> tok(AnalyzedTokenReadings t) {
    List<Object> o = new ArrayList<>();
    o.add(t.getToken());
    o.add(t.getStartPos());
    o.add(t.getEndPos());
    o.add(t.getPosFix());
    o.add(t.getCleanToken());
    o.add(t.getWhitespaceBefore());
    o.add((t.isImmunized() ? 1 : 0) | (t.isIgnoredBySpeller() ? 2 : 0) | (t.isSentenceStart() ? 4 : 0) | (t.isSentenceEnd() ? 8 : 0) | (t.isParagraphEnd() ? 16 : 0) | (t.isWhitespace() ? 32 : 0) | (t.isLinebreak() ? 64 : 0) | (t.isTagged() ? 128 : 0) | (t.hasTypographicApostrophe() ? 256 : 0) | (t.isWhitespaceBefore() ? 512 : 0));
    List<Object> rs = new ArrayList<>();
    for (AnalyzedToken r : t.getReadings()) {
      List<Object> x = new ArrayList<>(Arrays.asList(r.getToken(), r.getLemma(), r.getPOSTag()));
      int rf = (r.isWhitespaceBefore() ? 1 : 0) | (r.hasNoTag() ? 2 : 0);
      if (rf != 0) x.add(rf);
      rs.add(x);
    }
    o.add(rs);
    List<String> ch = new ArrayList<>();
    for (ChunkTag c : t.getChunkTags()) ch.add(c.getChunkTag());
    o.add(ch);
    return o;
  }

  static List<Object> toks(AnalyzedTokenReadings[] a) {
    List<Object> l = new ArrayList<>();
    for (AnalyzedTokenReadings t : a) l.add(tok(t));
    return l;
  }

  /** {t: tokens, p: null | {d:[[i,tok]...]} | {full:[tok...]} (preDisambig tokens vs tokens), w: original positions of the non-whitespace tokens, pw: pre non-ws count, pos/lem: sorted sets, dg: sha1(toString)} */
  static Object dumpSentence(AnalyzedSentence s) {
    Map<String, Object> o = new LinkedHashMap<>();
    List<Object> t = toks(s.getTokens());
    List<Object> p = toks(s.getPreDisambigTokens());
    o.put("t", t);
    if (p.equals(t)) o.put("p", null);
    else if (p.size() == t.size()) {
      List<Object> d = new ArrayList<>();
      for (int i = 0; i < p.size(); i++) if (!p.get(i).equals(t.get(i))) d.add(Arrays.asList(i, p.get(i)));
      o.put("p", Collections.singletonMap("d", d));
    } else o.put("p", Collections.singletonMap("full", p));
    List<Object> w = new ArrayList<>();
    int n = s.getTokensWithoutWhitespace().length;
    for (int i = 0; i < n; i++) w.add(s.getOriginalPosition(i));
    o.put("w", w);
    o.put("pw", s.getPreDisambigTokensWithoutWhitespace().length);
    o.put("pos", new ArrayList<>(new TreeSet<>(s.getPosTagSet())));
    o.put("lem", new ArrayList<>(new TreeSet<>(s.getLemmaSet())));
    o.put("dg", sha1(s.toString()));
    return o;
  }

  static Object ds2(AnalyzedSentence s) { return dumpSentence(s); }

  /** canonical text of a dump for hashing: strings as UTF-16 code units */
  static String canon(Object o) {
    if (o == null) return "N";
    if (o instanceof String) {
      String s = (String) o;
      StringBuilder sb = new StringBuilder("S");
      for (int i = 0; i < s.length(); i++) { if (i > 0) sb.append(','); sb.append((int) s.charAt(i)); }
      return sb.append(';').toString();
    }
    if (o instanceof Map) {
      StringBuilder sb = new StringBuilder("{");
      for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) sb.append(e.getKey()).append('=').append(canon(e.getValue())).append('|');
      return sb.append('}').toString();
    }
    if (o instanceof List) {
      StringBuilder sb = new StringBuilder("[");
      for (Object x : (List<?>) o) sb.append(canon(x)).append(',');
      return sb.append(']').toString();
    }
    return String.valueOf(o);
  }

  static AnalyzedSentence fresh(Language l, JsonNode tn) throws Exception { return RuleMatchOps.sentence(l, tn); }

  /** mirrors JLanguageTool#getAnalyzedSentence without the post-disambiguation chunker */
  static AnalyzedSentence disambiguate(XmlRuleDisambiguator d, AnalyzedSentence raw) throws Exception {
    AnalyzedTokenReadings[] pre = AnalyzedSentence.copyReadings(raw.getTokens());
    AnalyzedSentence dis = d.disambiguate(raw, null);
    return new AnalyzedSentence(dis.getTokens(), pre);
  }

  // ---- disamb-run: {lang, global?, xml?, texts:[string|{syn}], jobs:[{rule:int|null, texts:[i]}]} ----
  static Object run(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    boolean global = bool(a, "global");
    String xml = strOrNull(a, "xml");
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      List<Object> per = new ArrayList<>();
      try {
        boolean whole = !job.has("rule") || job.get("rule").isNull();
        XmlRuleDisambiguator d = whole ? xrd(l, global, xml) : null;
        DisambiguationPatternRule rule = whole ? null : rules(l, xml).get(job.get("rule").asInt());
        for (JsonNode ti : job.get("texts")) {
          try {
            AnalyzedSentence raw = fresh(l, a.get("texts").get(ti.asInt()));
            Map<String, Object> o = new LinkedHashMap<>();
            if (whole) {
              AnalyzedSentence res = disambiguate(d, raw);
              if (bool(job, "digest")) {
                Object ds = dumpSentence(res);
                o.put("n", res.getTokensWithoutWhitespace().length);
                o.put("ch", ((Map<?, ?>) ds).get("p") != null);
                o.put("dg2", sha1(canon(ds)));
              } else o.put("s", ds2(res));
            } else {
              AnalyzedSentence res = rule.replace(raw);
              o.put("same", res == raw);
              if (res != raw) o.put("s", dumpSentence(res));
            }
            per.add(o);
          } catch (Throwable t) {
            per.add(errc(t));
          }
        }
      } catch (Throwable t) {
        per.add(errc(t));
      }
      jobs.add(per);
    }
    return Collections.singletonMap("jobs", jobs);
  }

  // ---- disamb-examples ----
  private static String cleanXML(String s) { return s.replaceAll("<.*?>", ""); }

  private static String sortForms(String wordForms) {
    if (",[,]".equals(wordForms)) return wordForms;
    if (wordForms.length() == 0) return wordForms;
    String word = wordForms.substring(0, wordForms.indexOf('[') + 1);
    String forms = wordForms.substring(wordForms.indexOf('[') + 1, wordForms.length() - 1);
    String[] formToSort = forms.split(",");
    Arrays.sort(formToSort);
    return word + String.join(",", Arrays.asList(formToSort)) + "]";
  }

  private static AnalyzedSentence until(Language l, List<DisambiguationPatternRule> rules, String ruleId, AnalyzedSentence s) throws Exception {
    AnalyzedSentence d = s;
    for (DisambiguationPatternRule r : rules) {
      if (ruleId.equals(r.getId())) break;
      d = r.replace(d);
    }
    return d;
  }

  /** {lang, xml?, offset, limit} -> {total, rules:[{i,id,subId,untouched:[{eq,dg}|{error}],examples:[{...}|{error}]}]} (DisambiguationRuleTest per rule; no preDisambiguate, no-op chunker) */
  static Object examples(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    String xml = strOrNull(a, "xml");
    List<DisambiguationPatternRule> rules = rules(l, xml);
    int off = a.get("offset").asInt();
    int lim = a.get("limit").asInt();
    List<Object> out = new ArrayList<>();
    for (int i = off; i < Math.min(rules.size(), off + lim); i++) {
      DisambiguationPatternRule rule = rules.get(i);
      Map<String, Object> ro = new LinkedHashMap<>();
      ro.put("i", i);
      ro.put("id", rule.getId());
      ro.put("subId", rule.getSubId());
      String id = rule.getId();
      List<Object> un = new ArrayList<>();
      if (rule.getUntouchedExamples() != null) {
        for (String good : rule.getUntouchedExamples()) {
          try {
            good = good.replaceAll("[\\n\\t]+", "");
            good = cleanXML(good);
            AnalyzedSentence sent = until(l, rules, id, fresh(l, new com.fasterxml.jackson.databind.node.TextNode(good)));
            AnalyzedSentence toReplace = until(l, rules, id, fresh(l, new com.fasterxml.jackson.databind.node.TextNode(good)));
            AnalyzedSentence rep = rule.replace(toReplace);
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("blank", good.trim().length() == 0);
            o.put("eq", sent.toString().equals(rep.toString()));
            o.put("dg", sha1(rep.toString()));
            un.add(o);
          } catch (Throwable t) { un.add(errc(t)); }
        }
      }
      ro.put("untouched", un);
      List<Object> exs = new ArrayList<>();
      List<DisambiguatedExample> examples = rule.getExamples();
      if (examples != null) {
        for (DisambiguatedExample example : examples) {
          try {
            Map<String, Object> o = new LinkedHashMap<>();
            String outputForms = example.getDisambiguated();
            String inputForms = example.getAmbiguous();
            int ms = example.getExample().indexOf("<marker>");
            int me = example.getExample().indexOf("</marker>") - "<marker>".length();
            o.put("exp", Arrays.asList(ms, me));
            o.put("noIn", inputForms == null);
            o.put("noOut", outputForms == null);
            o.put("same", inputForms != null && inputForms.equals(outputForms));
            String clean = cleanXML(example.getExample());
            AnalyzedSentence cleanInput = fresh(l, new com.fasterxml.jackson.databind.node.TextNode(clean));
            AnalyzedSentence sent = until(l, rules, id, fresh(l, new com.fasterxml.jackson.databind.node.TextNode(clean)));
            AnalyzedSentence dis = rule.replace(until(l, rules, id, fresh(l, new com.fasterxml.jackson.databind.node.TextNode(clean))));
            o.put("eqClean", cleanInput.equals(dis));
            o.put("eqSent", sent.equals(dis));
            String reading = "";
            int[] pos = {-1, -1};
            for (AnalyzedTokenReadings r : sent.getTokens()) {
              if (r.isSentenceStart() && !(inputForms != null && inputForms.contains("<S>"))) continue;
              if (r.getStartPos() == ms) {
                reading = new AnalyzedSentence(new AnalyzedTokenReadings[] {r}).toShortString(",");
                pos = new int[] {r.getStartPos(), r.getEndPos()};
                break;
              }
            }
            o.put("inPos", Arrays.asList(pos[0], pos[1]));
            o.put("inRaw", reading);
            o.put("inA", sortForms(reading));
            reading = "";
            pos = new int[] {-1, -1};
            for (AnalyzedTokenReadings r : dis.getTokens()) {
              if (r.isSentenceStart() && !(outputForms != null && outputForms.contains("<S>"))) continue;
              if (r.getStartPos() == ms) {
                reading = new AnalyzedSentence(new AnalyzedTokenReadings[] {r}).toShortString(",");
                pos = new int[] {r.getStartPos(), r.getEndPos()};
                break;
              }
            }
            o.put("outPos", Arrays.asList(pos[0], pos[1]));
            o.put("outRaw", reading);
            o.put("outA", sortForms(reading));
            o.put("inDg", sha1(sent.toString()));
            o.put("outDg", sha1(dis.toString()));
            exs.add(o);
          } catch (Throwable t) { exs.add(errc(t)); }
        }
      }
      ro.put("examples", exs);
      out.add(ro);
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("total", rules.size());
    o.put("rules", out);
    return o;
  }

  // ---- rule-match-disamb: as rule-match, but texts are disambiguated by the XmlRuleDisambiguator; adds full = rule.match(sentence) ----
  static Object ruleMatchDisamb(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    XmlRuleDisambiguator d = xrd(l, bool(a, "global"), strOrNull(a, "dxml"));
    List<Object> textInfo = new ArrayList<>();
    List<JsonNode> texts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      texts.add(tn);
    }
    Map<Integer, AnalyzedSentence> cache = new HashMap<>();
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      try {
        AbstractTokenBasedRule rule = SeqMatchOps.resolve(job.get("src"), a);
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          AnalyzedSentence s;
          try {
            // the same disambiguated sentence object is reused for all jobs of a text (the rules do not modify it)
            s = cache.get(ti.asInt());
            if (s == null) { s = disambiguate(d, fresh(l, texts.get(ti.asInt()))); cache.put(ti.asInt(), s); }
          } catch (Throwable t) { per.add(errc(t)); continue; }
          try {
            int[] nulls = new int[1];
            List<RuleMatch> raw = RuleMatchOps.rawMatches(rule, s, nulls);
            List<RuleMatch> kept = new RuleWithMaxFilter().filter(new ArrayList<>(raw));
            Map<String, Object> o = new LinkedHashMap<>();
            List<Object> rd = new ArrayList<>();
            for (RuleMatch m : raw) rd.add(RuleMatchOps.dump(m));
            List<Integer> ki = new ArrayList<>();
            for (RuleMatch m : kept) { int ix = -1; for (int i = 0; i < raw.size(); i++) if (raw.get(i) == m) ix = i; ki.add(ix); }
            o.put("raw", rd);
            o.put("nulls", nulls[0]);
            o.put("kept", ki);
            o.put("sugMatches", rule.getSuggestionMatches().size());
            List<Object> fd = new ArrayList<>();
            for (RuleMatch m : rule.match(s)) fd.add(RuleMatchOps.dump(m));
            o.put("full", fd);
            per.add(o);
          } catch (Throwable t) { per.add(errc(t)); }
        }
        jobs.add(per);
      } catch (Throwable t) { jobs.add(errc(t)); }
    }
    for (int i = 0; i < texts.size(); i++) {
      AnalyzedSentence s = cache.get(i);
      textInfo.add(s == null ? null : Arrays.asList(s.getTokensWithoutWhitespace().length, sha1(s.toString())));
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", textInfo);
    o.put("jobs", jobs);
    return o;
  }

  // ---- disamb-harvest (generator only): {lang} ----
  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<Object> dis = new ArrayList<>();
    List<DisambiguationPatternRule> drs = UnifyOps.disambRules(l);
    for (int i = 0; i < drs.size(); i++) {
      DisambiguationPatternRule d = drs.get(i);
      List<Object> ex = new ArrayList<>(), un = new ArrayList<>();
      if (d.getExamples() != null) for (DisambiguatedExample e : d.getExamples()) ex.add(Arrays.asList(e.getExample(), e.getAmbiguous(), e.getDisambiguated()));
      if (d.getUntouchedExamples() != null) for (String e : d.getUntouchedExamples()) un.add(e);
      Map<String, Object> f = new LinkedHashMap<>();
      f.put("action", d.getAction().name());
      f.put("n", d.getPatternTokens().size());
      f.put("anti", d.getAntiPatterns().size());
      f.put("filter", d.getFilter() != null);
      f.put("unify", d.isTestUnification());
      f.put("wd", d.getNewTokenReadings() == null ? 0 : d.getNewTokenReadings().length);
      f.put("match", d.getMatchElement() != null);
      dis.add(Arrays.asList(i, d.getId(), d.getSubId(), f, ex, un));
    }
    List<String> names = l.getRuleFileNames();
    List<Object> rules = new ArrayList<>();
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rs;
      try { rs = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rs.size(); r++) {
        AbstractPatternRule ar = rs.get(r);
        if (!(ar instanceof PatternRule)) continue;
        PatternRule pr = (PatternRule) ar;
        List<String> cs = new ArrayList<>(), is = new ArrayList<>();
        for (CorrectExample e : pr.getCorrectExamples()) cs.add(e.getExample().replaceAll("<[^>]*>", ""));
        for (IncorrectExample e : pr.getIncorrectExamples()) is.add(e.getExample().replaceAll("<[^>]*>", ""));
        if (cs.size() + is.size() == 0) continue;
        Map<String, Object> f2 = new LinkedHashMap<>();
        f2.put("anti", pr.getAntiPatterns().size());
        f2.put("filter", pr.getFilter() != null);
        rules.add(Arrays.asList(f, r, pr.getId(), pr.getSubId(), f2, cs, is));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("disamb", dis);
    o.put("rules", rules);
    return o;
  }
}
