package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.languagetool.*;
import org.languagetool.markup.AnnotatedText;
import org.languagetool.rules.*;
import org.languagetool.tools.ConfidenceKey;
import org.languagetool.tools.RuleMatchesAsJsonSerializer;

import java.lang.reflect.Constructor;
import java.net.URL;
import java.util.*;

/** Op json-serialize (X-JSON): RuleMatchesAsJsonSerializer exactly as V2TextChecker#getResponse calls it. Format: docs/review/F19-oracle.md. */
final class JsonOps {
  private JsonOps() {}

  private static final ObjectMapper OM = new ObjectMapper();

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  private static Language lang(String code) { return code == null ? null : Languages.getLanguageForShortCode(code); }

  /** Params of the serializer: args-level defaults, overridable per case in `ser`. */
  private static JsonNode param(JsonNode c, JsonNode a, String k) {
    if (c.has("ser") && c.get("ser").has(k)) return c.get("ser").get(k);
    return a.has(k) ? a.get(k) : null;
  }

  private static Rule findRule(List<Rule> rules, String id, String subId) {
    for (Rule r : rules) if (r.getId().equals(id) && Objects.equals(r.getSubId(), subId)) return r;
    throw new IllegalArgumentException("no synthetic rule " + id + "/" + subId);
  }

  private static List<RuleMatch> manualMatches(JsonNode arr, List<Rule> rules, JLanguageTool lt) throws Exception {
    List<RuleMatch> out = new ArrayList<>();
    for (JsonNode m : arr) {
      Rule r = findRule(rules, m.get("rule").asText(), s(m, "subId"));
      AnalyzedSentence sent = s(m, "sentence") != null ? lt.getAnalyzedSentence(s(m, "sentence")) : null;
      RuleMatch rm = new RuleMatch(r, sent, m.get("from").asInt(), m.get("to").asInt(), m.get("message").asText(), s(m, "shortMessage"));
      if (m.has("replacements")) {
        List<SuggestedReplacement> reps = new ArrayList<>();
        for (JsonNode x : m.get("replacements")) {
          SuggestedReplacement sr = new SuggestedReplacement(x.get("value").asText(), s(x, "shortDescription"), s(x, "suffix"));
          if (x.has("type")) sr.setType(SuggestedReplacement.SuggestionType.valueOf(x.get("type").asText()));
          if (x.has("confidence") && !x.get("confidence").isNull()) sr.setConfidence((float) x.get("confidence").asDouble());
          reps.add(sr);
        }
        rm.setSuggestedReplacementObjects(reps);
      }
      if (m.has("autoCorrect")) rm.setAutoCorrect(m.get("autoCorrect").asBoolean());
      if (s(m, "url") != null) rm.setUrl(new URL(s(m, "url")));
      if (s(m, "specificRuleId") != null) rm.setSpecificRuleId(s(m, "specificRuleId"));
      if (s(m, "type") != null) rm.setType(RuleMatch.Type.valueOf(s(m, "type")));
      out.add(rm);
    }
    return out;
  }

  private static List<Range> ranges(JsonNode arr) throws Exception {
    List<Range> out = new ArrayList<>();
    if (arr == null) return out;
    Constructor<Range> k = Range.class.getDeclaredConstructor(int.class, int.class, String.class);
    k.setAccessible(true);
    for (JsonNode r : arr) out.add(k.newInstance(r.get("from").asInt(), r.get("to").asInt(), r.get("lang").asText()));
    return out;
  }

  private static List<ExtendedSentenceRange> extended(JsonNode arr) throws Exception {
    List<ExtendedSentenceRange> out = new ArrayList<>();
    if (arr == null) return out;
    Constructor<ExtendedSentenceRange> k = ExtendedSentenceRange.class.getDeclaredConstructor(int.class, int.class, Map.class);
    k.setAccessible(true);
    for (JsonNode r : arr) {
      Map<String, Float> rates = new LinkedHashMap<>();
      for (JsonNode e : r.get("rates")) rates.put(e.get("language").asText(), (float) e.get("rate").asDouble());
      out.add(k.newInstance(r.get("from").asInt(), r.get("to").asInt(), rates));
    }
    return out;
  }

  private static CheckResults manualResult(JsonNode c, List<Rule> rules, JLanguageTool lt) throws Exception {
    CheckResults cr = new CheckResults(manualMatches(c.get("matches"), rules, lt), ranges(c.get("ignoredRanges")), extended(c.get("extendedRanges")));
    List<SentenceRange> sr = new ArrayList<>();
    if (c.has("sentenceRanges")) {
      Constructor<SentenceRange> k = SentenceRange.class.getDeclaredConstructor(int.class, int.class);
      k.setAccessible(true);
      for (JsonNode r : c.get("sentenceRanges")) sr.add(k.newInstance(r.get(0).asInt(), r.get(1).asInt()));
    }
    cr.addSentenceRanges(sr);
    return cr;
  }

  private static CheckResults checkResult(CheckPipeOps.HarnessLT lt, JsonNode c) throws Exception {
    JLanguageTool.Level level = c.has("level") ? JLanguageTool.Level.valueOf(c.get("level").asText()) : JLanguageTool.Level.DEFAULT;
    JLanguageTool.Mode mode = c.has("mode") ? JLanguageTool.Mode.valueOf(c.get("mode").asText()) : JLanguageTool.Mode.ALL;
    Set<ToneTag> tones = new LinkedHashSet<>();
    for (String t : ContentOps.strs(c, "toneTags")) tones.add(ToneTag.valueOf(t));
    return lt.check2(CheckPipeOps.annotated(c), true, JLanguageTool.ParagraphHandling.NORMAL, null, mode, level, tones, null);
  }

  /** {lang, rules, selection?, ser defaults {compactMode, serLang, contextSize, given, detected, confidence, source, incompleteReason, showPremiumHint, confidenceMap}, cases} -> {cases:[{json, parsed}|{error}]} */
  static Object jsonSerialize(JsonNode a) throws Exception {
    if (a.has("dynamic")) for (JsonNode d : a.get("dynamic")) Languages.addLanguage(d.get("name").asText(), d.get("code").asText(), new java.io.File(d.get("path").asText()));
    CheckPipeOps.HarnessLT lt = CheckPipeOps.tool(a, true);
    List<Rule> synth = new ArrayList<>();
    for (Rule r : lt.getAllRules()) if (r.getId().startsWith(SynthRules.PREFIX)) synth.add(r);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) {
      Map<String, Object> res = new LinkedHashMap<>();
      try {
        AnnotatedText text = CheckPipeOps.annotated(c);
        List<CheckResults> results = new ArrayList<>();
        if (c.has("matches")) results.add(manualResult(c, synth, lt));
        else results.add(checkResult(lt, c));
        if (c.has("more")) for (JsonNode m : c.get("more")) results.add(m.has("matches") ? manualResult(m, synth, lt) : checkResult(lt, m));
        List<RuleMatch> hidden = c.has("hidden") ? manualMatches(c.get("hidden"), synth, lt) : null;
        int compact = param(c, a, "compactMode") == null ? 0 : param(c, a, "compactMode").asInt();
        Language serLang = lang(param(c, a, "serLang") == null || param(c, a, "serLang").isNull() ? null : param(c, a, "serLang").asText());
        int ctx = param(c, a, "contextSize") == null ? 40 : param(c, a, "contextSize").asInt();
        JsonNode g = param(c, a, "given"), d = param(c, a, "detected"), cf = param(c, a, "confidence"), so = param(c, a, "source");
        Language given = lang(g == null ? a.get("lang").asText() : g.asText());
        Language detectedLang = d == null || d.isNull() ? given : lang(d.asText());
        DetectedLanguage dl = cf != null && !cf.isNull() ? new DetectedLanguage(given, detectedLang, (float) cf.asDouble(), so == null || so.isNull() ? null : so.asText())
            : new DetectedLanguage(given, detectedLang);
        JsonNode ir = param(c, a, "incompleteReason");
        String reason = ir == null || ir.isNull() ? null : ir.asText();
        JsonNode sp = param(c, a, "showPremiumHint");
        boolean hint = sp != null && sp.asBoolean();
        JsonNode md = param(c, a, "mode");
        JLanguageTool.Mode mode = md == null || md.isNull() ? null : JLanguageTool.Mode.valueOf(md.asText());
        RuleMatchesAsJsonSerializer ser = new RuleMatchesAsJsonSerializer(compact, serLang);
        JsonNode cm = param(c, a, "confidenceMap");
        if (cm != null && !cm.isNull()) {
          Map<ConfidenceKey, Float> map = new HashMap<>();
          for (JsonNode e : cm) map.put(new ConfidenceKey(lang(e.get("lang").asText()), e.get("ruleId").asText()), (float) e.get("value").asDouble());
          ser.setRuleIdToConfidenceMap(map);
        }
        String json = ser.ruleMatchesToJson2(results, hidden, text, ctx, dl, reason, hint, mode);
        res.put("json", json);
        res.put("parsed", OM.readTree(json));
      } catch (Throwable t) {
        res.putAll(CheckPipeOps.errorOf(t));
      }
      out.add(res);
    }
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("cases", out);
    return r;
  }
}
