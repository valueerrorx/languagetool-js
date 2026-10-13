package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.AbstractPatternRule;
import org.languagetool.rules.patterns.RuleSet;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;
import org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader;
import org.languagetool.tagging.disambiguation.rules.DisambiguatedExample;
import org.languagetool.tools.Tools;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.markup.AnnotatedTextBuilder;

import java.util.*;

/** Content-level ops: check, analyze, rules-list, rule-examples, disambiguation-examples (docs/ORACLE.md 3). */
public class ContentOps {
  // JLanguageTool instances are cached per (lang, motherTongue, rule selection); rule loading takes seconds.
  private static final Map<String, JLanguageTool> CACHE = new HashMap<>();

  static List<String> strs(JsonNode a, String key) {
    List<String> l = new ArrayList<>();
    if (a.has(key) && a.get(key).isArray()) for (JsonNode n : a.get(key)) l.add(n.asText());
    return l;
  }

  static Language lang(String code) {
    return Languages.getLanguageForShortCode(code);
  }

  static JLanguageTool tool(JsonNode a) throws Exception {
    String code = a.get("lang").asText();
    String mt = a.has("motherTongue") && !a.get("motherTongue").isNull() ? a.get("motherTongue").asText() : null;
    List<String> er = strs(a, "enabledRules"), dr = strs(a, "disabledRules"), ec = strs(a, "enabledCategories"), dc = strs(a, "disabledCategories");
    boolean only = a.has("enabledOnly") && a.get("enabledOnly").asBoolean();
    boolean tempOff = a.has("enableTempOff") && a.get("enableTempOff").asBoolean();
    String key = code + "|" + mt + "|" + er + dr + ec + dc + only + tempOff;
    boolean fresh = a.has("fresh") && a.get("fresh").asBoolean();
    JLanguageTool lt = fresh ? null : CACHE.get(key);
    if (lt == null) {
      Language l = lang(code);
      lt = mt == null ? new JLanguageTool(l) : new JLanguageTool(l, lang(mt));
      Set<CategoryId> dcs = new LinkedHashSet<>(), ecs = new LinkedHashSet<>();
      for (String s : dc) dcs.add(new CategoryId(s));
      for (String s : ec) ecs.add(new CategoryId(s));
      Tools.selectRules(lt, dcs, ecs, new LinkedHashSet<>(dr), new LinkedHashSet<>(er), only, tempOff);
      if (!fresh) CACHE.put(key, lt);
    }
    return lt;
  }

  static Map<String, Object> match(RuleMatch m) {
    Map<String, Object> o = new LinkedHashMap<>();
    Rule r = m.getRule();
    o.put("ruleId", r.getId());
    o.put("subId", r.getSubId());
    o.put("specificRuleId", m.getSpecificRuleId());
    o.put("ruleDescription", r.getDescription());
    Category c = r.getCategory();
    o.put("categoryId", c == null ? null : c.getId().toString());
    o.put("categoryName", c == null ? null : c.getName());
    o.put("issueType", r.getLocQualityIssueType() == null ? null : r.getLocQualityIssueType().toString());
    o.put("type", m.getType() == null ? null : m.getType().name());
    List<String> tags = new ArrayList<>();
    for (Tag t : r.getTags()) tags.add(t.name());
    o.put("tags", tags);
    List<String> tones = new ArrayList<>();
    for (ToneTag t : r.getToneTags()) tones.add(t.name());
    o.put("toneTags", tones);
    o.put("fromPos", m.getFromPos());
    o.put("toPos", m.getToPos());
    o.put("fromPosSentence", m.getFromPosSentence());
    o.put("toPosSentence", m.getToPosSentence());
    o.put("patternFromPos", m.getPatternFromPos());
    o.put("patternToPos", m.getPatternToPos());
    o.put("line", m.getLine());
    o.put("endLine", m.getEndLine());
    o.put("column", m.getColumn());
    o.put("endColumn", m.getEndColumn());
    o.put("message", m.getMessage());
    o.put("shortMessage", m.getShortMessage());
    List<Object> sug = new ArrayList<>();
    for (SuggestedReplacement s : m.getSuggestedReplacementObjects()) {
      Map<String, Object> sm = new LinkedHashMap<>();
      sm.put("replacement", s.getReplacement());
      sm.put("shortDescription", s.getShortDescription());
      sm.put("suffix", s.getSuffix());
      sug.add(sm);
    }
    o.put("suggestions", sug);
    o.put("sentence", m.getSentence() == null ? null : m.getSentence().getText());
    o.put("url", m.getUrl() == null ? null : m.getUrl().toString());
    o.put("ruleUrl", r.getUrl() == null ? null : r.getUrl().toString());
    o.put("autoCorrect", m.isAutoCorrect());
    o.put("features", m.getFeatures());
    o.put("newLanguageMatches", m.getNewLanguageMatches());
    return o;
  }

  static Map<String, Object> results(CheckResults cr) {
    Map<String, Object> res = new LinkedHashMap<>();
    List<Object> ms = new ArrayList<>();
    for (RuleMatch m : cr.getRuleMatches()) ms.add(match(m));
    res.put("matches", ms);
    List<Object> sr = new ArrayList<>();
    for (SentenceRange s : cr.getSentenceRanges()) sr.add(Arrays.asList(s.getFromPos(), s.getToPos()));
    res.put("sentenceRanges", sr);
    List<Object> er = new ArrayList<>();
    for (ExtendedSentenceRange s : cr.getExtendedSentenceRanges()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("fromPos", s.getFromPos());
      m.put("toPos", s.getToPos());
      m.put("languageConfidenceRates", s.getLanguageConfidenceRates());
      er.add(m);
    }
    res.put("extendedSentenceRanges", er);
    List<Object> ir = new ArrayList<>();
    for (Range s : cr.getIgnoredRanges()) ir.add(Arrays.asList(s.getFromPos(), s.getToPos(), s.getLang()));
    res.put("ignoredRanges", ir);
    return res;
  }

  static CheckResults run(JLanguageTool lt, String text, JsonNode a) throws Exception {
    JLanguageTool.Level level = a.has("level") ? JLanguageTool.Level.valueOf(a.get("level").asText()) : JLanguageTool.Level.DEFAULT;
    JLanguageTool.Mode mode = a.has("mode") ? JLanguageTool.Mode.valueOf(a.get("mode").asText()) : JLanguageTool.Mode.ALL;
    JLanguageTool.ParagraphHandling ph = a.has("paraMode") ? JLanguageTool.ParagraphHandling.valueOf(a.get("paraMode").asText()) : JLanguageTool.ParagraphHandling.NORMAL;
    boolean tokenize = !a.has("tokenizeText") || a.get("tokenizeText").asBoolean();
    Set<ToneTag> tones = new LinkedHashSet<>();
    for (String s : strs(a, "toneTags")) tones.add(ToneTag.valueOf(s));
    return lt.check2(new AnnotatedTextBuilder().addText(text).build(), tokenize, ph, null, mode, level, tones, null);
  }

  /** args: {lang, text, enabledRules, disabledRules, enabledCategories, disabledCategories, enabledOnly, level, mode, motherTongue, toneTags} */
  public static Object check(JsonNode a) throws Exception {
    JLanguageTool lt = tool(a);
    return results(run(lt, a.get("text").asText(), a));
  }

  static Map<String, Object> token(AnalyzedTokenReadings t) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("text", t.getToken());
    o.put("startPos", t.getStartPos());
    o.put("endPos", t.getEndPos());
    o.put("whitespaceBefore", t.getWhitespaceBefore());
    List<Object> rs = new ArrayList<>();
    for (AnalyzedToken r : t.getReadings()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("token", r.getToken());
      m.put("lemma", r.getLemma());
      m.put("pos", r.getPOSTag());
      rs.add(m);
    }
    o.put("readings", rs);
    List<String> ch = new ArrayList<>();
    for (ChunkTag c : t.getChunkTags()) ch.add(c.getChunkTag());
    o.put("chunkTags", ch);
    o.put("immunized", t.isImmunized());
    o.put("ignoreSpelling", t.isIgnoredBySpeller());
    o.put("sentenceStart", t.isSentenceStart());
    o.put("sentenceEnd", t.isSentenceEnd());
    o.put("paragraphEnd", t.isParagraphEnd());
    o.put("whitespace", t.isWhitespace());
    o.put("linebreak", t.isLinebreak());
    o.put("historicalAnnotations", t.getHistoricalAnnotations());
    return o;
  }

  /** args: {lang, text, preDisambiguation:bool, motherTongue} */
  public static Object analyze(JsonNode a) throws Exception {
    JLanguageTool lt = tool(a);
    boolean pre = a.has("preDisambiguation") && a.get("preDisambiguation").asBoolean();
    String text = a.get("text").asText();
    List<Object> sents = new ArrayList<>();
    int offset = 0;
    for (AnalyzedSentence s : lt.analyzeText(text)) {
      Map<String, Object> so = new LinkedHashMap<>();
      so.put("text", s.getText());
      so.put("offset", offset);
      offset += s.getText().length();
      List<Object> ts = new ArrayList<>();
      for (AnalyzedTokenReadings t : s.getTokens()) ts.add(token(t));
      so.put("tokens", ts);
      if (pre) {
        List<Object> ps = new ArrayList<>();
        for (AnalyzedTokenReadings t : s.getPreDisambigTokens()) ps.add(token(t));
        so.put("preDisambigTokens", ps);
      }
      sents.add(so);
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("sentences", sents);
    return res;
  }

  /** args: {lang} */
  public static Object rulesList(JsonNode a) throws Exception {
    JLanguageTool lt = new JLanguageTool(lang(a.get("lang").asText()));
    Set<Rule> active = Collections.newSetFromMap(new IdentityHashMap<>());
    active.addAll(lt.getAllActiveRules());
    List<Object> rules = new ArrayList<>();
    for (Rule r : lt.getAllRules()) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("id", r.getId());
      o.put("subId", r.getSubId());
      o.put("fullId", r.getFullId());
      o.put("description", r.getDescription());
      o.put("class", r.getClass().getName());
      o.put("categoryId", r.getCategory() == null ? null : r.getCategory().getId().toString());
      o.put("categoryName", r.getCategory() == null ? null : r.getCategory().getName());
      o.put("categoryDefaultOff", r.getCategory() != null && r.getCategory().isDefaultOff());
      o.put("defaultOff", r.isDefaultOff());
      o.put("defaultTempOff", r.isDefaultTempOff());
      o.put("activeByDefault", active.contains(r));
      o.put("premium", r.isPremium());
      o.put("priority", r.getPriority());
      o.put("issueType", r.getLocQualityIssueType() == null ? null : r.getLocQualityIssueType().toString());
      List<String> tags = new ArrayList<>();
      for (Tag t : r.getTags()) tags.add(t.name());
      o.put("tags", tags);
      List<String> tones = new ArrayList<>();
      for (ToneTag t : r.getToneTags()) tones.add(t.name());
      o.put("toneTags", tones);
      o.put("sourceFile", r.getSourceFile());
      o.put("url", r.getUrl() == null ? null : r.getUrl().toString());
      o.put("examples", Arrays.asList(r.getCorrectExamples().size(), r.getIncorrectExamples().size(), r.getErrorTriggeringExamples().size()));
      rules.add(o);
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("rules", rules);
    List<Object> cats = new ArrayList<>();
    for (Category c : lt.getCategories().values()) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("id", c.getId().toString());
      o.put("name", c.getName());
      o.put("defaultOff", c.isDefaultOff());
      o.put("location", c.getLocation().name());
      cats.add(o);
    }
    res.put("categories", cats);
    return res;
  }

  static Map<String, Object> exampleEntry(Rule r, String kind, String raw, List<String> corrections, JLanguageTool lt,
                                          JLanguageTool full, JsonNode a) throws Exception {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("ruleId", r.getId());
    o.put("subId", r.getSubId());
    o.put("kind", kind);
    o.put("example", raw);
    String clean = ExampleSentence.cleanMarkersInExample(raw);
    o.put("text", clean);
    int ms = raw.indexOf("<marker>");
    int me = raw.indexOf("</marker>");
    o.put("markerStart", ms);
    o.put("markerEnd", me == -1 ? -1 : me - "<marker>".length());
    o.put("corrections", corrections);
    try {
      CheckResults cr = lt.checkInternalWithCustomRules(RuleSet.plain(Collections.singletonList(r)),
          new AnnotatedTextBuilder().addText(clean).build(), JLanguageTool.ParagraphHandling.NORMAL, null,
          JLanguageTool.Mode.ALL, JLanguageTool.Level.PICKY, Collections.emptySet(), null,
          Collections.singletonList(clean), Collections.singletonList(lt.getAnalyzedSentence(clean)));
      List<Object> ms2 = new ArrayList<>();
      for (RuleMatch m : cr.getRuleMatches()) ms2.add(match(m));
      o.put("restricted", ms2);
    } catch (Throwable t) {
      o.put("restricted", null);
      o.put("restrictedError", t.getClass().getName() + ": " + t.getMessage());
    }
    if (!a.has("unrestricted") || a.get("unrestricted").asBoolean()) {
      try {
        o.put("unrestricted", results(run(full, clean, a)));
      } catch (Throwable t) {
        o.put("unrestricted", null);
        o.put("unrestrictedError", t.getClass().getName() + ": " + t.getMessage());
      }
    }
    return o;
  }

  /** args: {lang, ruleIds?:[...], offset?, limit?, unrestricted?:bool(default true), level?} (offset/limit count rules) */
  public static Object ruleExamples(JsonNode a) throws Exception {
    JLanguageTool lt = new JLanguageTool(lang(a.get("lang").asText()));
    JLanguageTool full = tool(a);
    Set<String> ids = new HashSet<>(strs(a, "ruleIds"));
    int offset = a.has("offset") ? a.get("offset").asInt() : 0;
    int limit = a.has("limit") ? a.get("limit").asInt() : Integer.MAX_VALUE;
    List<Object> out = new ArrayList<>();
    int idx = 0, total = 0;
    for (Rule r : lt.getAllRules()) {
      if (!ids.isEmpty() && !ids.contains(r.getId()) && !ids.contains(r.getFullId())) continue;
      if (r.getCorrectExamples().isEmpty() && r.getIncorrectExamples().isEmpty() && r.getErrorTriggeringExamples().isEmpty()) continue;
      total++;
      if (idx++ < offset || idx - 1 >= offset + limit) continue;
      for (CorrectExample e : r.getCorrectExamples()) out.add(exampleEntry(r, "correct", e.getExample(), Collections.emptyList(), lt, full, a));
      for (IncorrectExample e : r.getIncorrectExamples()) out.add(exampleEntry(r, "incorrect", e.getExample(), e.getCorrections(), lt, full, a));
      for (ErrorTriggeringExample e : r.getErrorTriggeringExamples()) out.add(exampleEntry(r, "triggers", e.getExample(), Collections.emptyList(), lt, full, a));
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("rulesWithExamples", total);
    res.put("examples", out);
    return res;
  }

  static String sortForms(String wordForms) {
    if (",[,]".equals(wordForms) || wordForms.length() == 0) return wordForms;
    String word = wordForms.substring(0, wordForms.indexOf('[') + 1);
    String forms = wordForms.substring(wordForms.indexOf('[') + 1, wordForms.length() - 1);
    String[] f = forms.split(",");
    Arrays.sort(f);
    return word + String.join(",", Arrays.asList(f)) + "]";
  }

  static AnalyzedSentence until(Language lang, List<DisambiguationPatternRule> rules, String id, AnalyzedSentence s) throws Exception {
    AnalyzedSentence d = lang.getDisambiguator().preDisambiguate(s);
    for (DisambiguationPatternRule r : rules) {
      if (id.equals(r.getId())) break;
      d = r.replace(d);
    }
    return d;
  }

  static String readingAt(AnalyzedSentence sent, int start, boolean wantSentStart) {
    for (AnalyzedTokenReadings rd : sent.getTokens()) {
      if (rd.isSentenceStart() && !wantSentStart) continue;
      if (rd.getStartPos() == start) {
        return sortForms(new AnalyzedSentence(new AnalyzedTokenReadings[]{rd}).toShortString(","));
      }
    }
    return "";
  }

  /** args: {lang, offset?, limit?} (counts rules); mirrors DisambiguationRuleTest */
  public static Object disambiguationExamples(JsonNode a) throws Exception {
    Language lang = lang(a.get("lang").asText());
    JLanguageTool lt = new JLanguageTool(lang);
    DisambiguationRuleLoader loader = new DisambiguationRuleLoader();
    String nameWithLocale = lang.getShortCode() + "/disambiguation.xml";
    String nameInResourceDir = JLanguageTool.getDataBroker().getResourceDir() + "/" + nameWithLocale;
    List<DisambiguationPatternRule> rules = loader.getRules(loader.getClass().getResourceAsStream(nameInResourceDir), lang, nameWithLocale);
    int offset = a.has("offset") ? a.get("offset").asInt() : 0;
    int limit = a.has("limit") ? a.get("limit").asInt() : Integer.MAX_VALUE;
    List<Object> out = new ArrayList<>();
    int idx = -1;
    for (DisambiguationPatternRule rule : rules) {
      idx++;
      if (idx < offset || idx >= offset + limit) continue;
      String id = rule.getId();
      if (rule.getUntouchedExamples() != null) {
        for (String good : rule.getUntouchedExamples()) {
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("ruleId", id);
          o.put("subId", rule.getSubId());
          o.put("ruleIndex", idx);
          o.put("kind", "untouched");
          o.put("example", good);
          try {
            String g = good.replaceAll("[\\n\\t]+", "").replaceAll("<.*?>", "");
            AnalyzedSentence sent = until(lang, rules, id, lt.getRawAnalyzedSentence(g));
            AnalyzedSentence sent2 = until(lang, rules, id, lt.getRawAnalyzedSentence(g));
            String after = rule.replace(sent2).toString();
            o.put("touched", !sent.toString().equals(after));
            if (!sent.toString().equals(after)) { o.put("before", sent.toString()); o.put("after", after); }
          } catch (Throwable t) {
            o.put("error", t.getClass().getName() + ": " + t.getMessage());
          }
          out.add(o);
        }
      }
      if (rule.getExamples() != null) {
        for (DisambiguatedExample ex : rule.getExamples()) {
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("ruleId", id);
          o.put("subId", rule.getSubId());
          o.put("ruleIndex", idx);
          o.put("kind", "ambiguous");
          o.put("example", ex.getExample());
          o.put("input", ex.getAmbiguous());
          o.put("expected", ex.getDisambiguated());
          try {
            String raw = ex.getExample();
            int ms = raw.indexOf("<marker>");
            int me = raw.indexOf("</marker>") - "<marker>".length();
            String clean = raw.replaceAll("<.*?>", "");
            AnalyzedSentence sent = until(lang, rules, id, lt.getRawAnalyzedSentence(clean));
            AnalyzedSentence dis = rule.replace(until(lang, rules, id, lt.getRawAnalyzedSentence(clean)));
            String in = ex.getAmbiguous() == null ? "" : ex.getAmbiguous();
            String outp = ex.getDisambiguated() == null ? "" : ex.getDisambiguated();
            o.put("markerStart", ms);
            o.put("markerEnd", me);
            o.put("actualInput", readingAt(sent, ms, in.contains("<S>")));
            o.put("actual", readingAt(dis, ms, outp.contains("<S>")));
          } catch (Throwable t) {
            o.put("error", t.getClass().getName() + ": " + t.getMessage());
          }
          out.add(o);
        }
      }
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("rules", rules.size());
    res.put("examples", out);
    return res;
  }
}
