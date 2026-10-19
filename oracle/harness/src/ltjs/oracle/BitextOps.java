package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.bitext.*;
import org.languagetool.rules.*;
import org.languagetool.rules.bitext.*;
import org.languagetool.rules.patterns.*;
import org.languagetool.rules.patterns.bitext.*;
import org.languagetool.tools.Tools;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/** Ops for X-BITEXT (F39): bitext-reader, bitext-rule, bitext-load, bitext-tools, ff-load. Format: docs/review/F39-oracle.md. */
final class BitextOps {
  private BitextOps() {}

  private static final Map<String, JLanguageTool> LTS = new HashMap<>();

  private static JLanguageTool lt(String code, String mt) {
    return LTS.computeIfAbsent(code + "|" + mt, k -> new JLanguageTool(Languages.getLanguageForShortCode(code), mt == null ? null : Languages.getLanguageForShortCode(mt)));
  }

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  private static File writeFile(JsonNode a, String name) throws IOException {
    File f = new File(name);
    if (f.getParentFile() != null) f.getParentFile().mkdirs();
    String enc = s(a, "writeEncoding");
    Files.write(f.toPath(), a.get("content").asText().getBytes(enc == null ? "UTF-8" : enc));
    return f;
  }

  private static Map<String, Object> pair(StringPair p) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("source", p == null ? null : p.getSource());
    m.put("target", p == null ? null : p.getTarget());
    m.put("toString", p == null ? null : p.toString());
    return m;
  }

  /** {kind:"tab"|"wordfast", content, writeEncoding?, encoding?, noFile?, steps:int} -> {ctorError}|{pairs:[...], final...} */
  static Object reader(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    String name = "reader-input.txt";
    if (!a.has("noFile")) writeFile(a, name); else name = a.get("noFile").asText();
    String enc = a.has("encoding") && !a.get("encoding").isNull() ? a.get("encoding").asText() : null;
    TabBitextReader r;
    try {
      r = "wordfast".equals(a.get("kind").asText()) ? new WordFastTMReader(name, enc) : new TabBitextReader(name, enc);
    } catch (Throwable t) {
      res.put("ctorError", CheckPipeOps.errorOf(t));
      return res;
    }
    res.put("initial", state(r));
    List<Object> steps = new ArrayList<>();
    Iterator<StringPair> it = r.iterator();
    int max = a.has("maxSteps") ? a.get("maxSteps").asInt() : 1000;
    for (int i = 0; i < max; i++) {
      Map<String, Object> st = new LinkedHashMap<>();
      try {
        boolean h = it.hasNext();
        st.put("hasNext", h);
        if (!h) { steps.add(st); break; }
        st.put("pair", pair(it.next()));
      } catch (Throwable t) {
        st.put("error", CheckPipeOps.errorOf(t));
        steps.add(st);
        break;
      }
      st.putAll(state(r));
      steps.add(st);
    }
    res.put("steps", steps);
    try { it.remove(); } catch (Throwable t) { res.put("removeError", t.getClass().getName()); }
    return res;
  }

  private static Map<String, Object> state(TabBitextReader r) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("columnCount", r.getColumnCount());
    m.put("targetColumnCount", r.getTargetColumnCount());
    m.put("lineCount", r.getLineCount());
    m.put("sentencePosition", r.getSentencePosition());
    m.put("currentLine", r.getCurrentLine());
    return m;
  }

  static Map<String, Object> ruleInfo(Rule r) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("class", r.getClass().getName());
    m.put("id", r.getId());
    m.put("subId", r.getSubId());
    m.put("description", r.getDescription());
    Category c = r.getCategory();
    m.put("categoryId", c == null ? null : c.getId().toString());
    m.put("categoryName", c == null ? null : c.getName());
    m.put("issueType", r.getLocQualityIssueType() == null ? null : r.getLocQualityIssueType().toString());
    m.put("defaultOff", r.isDefaultOff());
    m.put("url", r.getUrl() == null ? null : r.getUrl().toString());
    List<String> corr = new ArrayList<>();
    for (CorrectExample e : r.getCorrectExamples()) corr.add(e.getExample());
    m.put("correctExamples", corr);
    List<Object> inc = new ArrayList<>();
    for (IncorrectExample e : r.getIncorrectExamples()) inc.add(Arrays.asList(e.getExample(), e.getCorrections()));
    m.put("incorrectExamples", inc);
    if (r instanceof AbstractPatternRule) {
      AbstractPatternRule p = (AbstractPatternRule) r;
      m.put("message", p.getMessage());
      m.put("language", p.getLanguage() == null ? null : p.getLanguage().getShortCodeWithCountryAndVariant());
      m.put("startPositionCorrection", p.getStartPositionCorrection());
      m.put("endPositionCorrection", p.getEndPositionCorrection());
      m.put("tokenCount", p.getPatternTokens() == null ? null : p.getPatternTokens().size());
      m.put("toString", p.toString());
    }
    if (r instanceof BitextRule) {
      BitextRule b = (BitextRule) r;
      m.put("bitextMessage", b.getMessage());
      m.put("sourceLanguage", b.getSourceLanguage() == null ? null : b.getSourceLanguage().getShortCodeWithCountryAndVariant());
      List<Object> bc = new ArrayList<>();
      if (b.getCorrectBitextExamples() != null) for (StringPair p : b.getCorrectBitextExamples()) bc.add(pair(p));
      m.put("correctBitextExamples", b.getCorrectBitextExamples() == null ? null : bc);
      List<Object> bi = new ArrayList<>();
      if (b.getIncorrectBitextExamples() != null) for (IncorrectBitextExample e : b.getIncorrectBitextExamples()) bi.add(Arrays.asList(pair(e.getExample()), e.getCorrections(), e.toString()));
      m.put("incorrectBitextExamples", b.getIncorrectBitextExamples() == null ? null : bi);
    }
    if (r instanceof BitextPatternRule) {
      BitextPatternRule b = (BitextPatternRule) r;
      m.put("srcRule", ruleInfo(b.getSrcRule()));
      m.put("trgRule", ruleInfo(b.getTrgRule()));
    }
    return m;
  }

  private static List<Object> bitextMatches(BitextRule rule, String src, String trg, JLanguageTool sl, JLanguageTool tl) throws IOException {
    List<Object> out = new ArrayList<>();
    RuleMatch[] ms = rule.match(sl.getAnalyzedSentence(src), tl.getAnalyzedSentence(trg));
    if (ms == null) { out.add(null); return out; }
    for (RuleMatch m : ms) out.add(CheckPipeOps.matchDump(m));
    return out;
  }

  /** {rule:"DifferentLengthRule"|..., srcLang, trgLang, pairs:[[src,trg]]} */
  static Object rule(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    BitextRule rule = (BitextRule) Class.forName("org.languagetool.rules.bitext." + a.get("rule").asText()).getConstructor().newInstance();
    res.put("rule", ruleInfo(rule));
    res.put("monolingualMatch", rule.match(new JLanguageTool(Languages.getLanguageForShortCode(a.get("trgLang").asText())).getAnalyzedSentence("Test.")));
    List<String> rel = new ArrayList<>();
    for (Class<?> c : BitextRule.getRelevantRules()) rel.add(c.getName());
    res.put("relevant", rel);
    JLanguageTool sl = lt(a.get("srcLang").asText(), null), tl = lt(a.get("trgLang").asText(), null);
    List<Object> out = new ArrayList<>();
    for (JsonNode p : a.get("pairs")) {
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("src", p.get(0).asText());
      r.put("trg", p.get(1).asText());
      try { r.put("matches", bitextMatches(rule, p.get(0).asText(), p.get(1).asText(), sl, tl)); }
      catch (Throwable t) { r.put("error", CheckPipeOps.errorOf(t)); }
      out.add(r);
    }
    res.put("pairs", out);
    return res;
  }

  /** {mode:"inline", xml, filename, srcLang?, trgLang?, pairs?} | {mode:"resource", name} -> {rules:[...]} | {error} */
  static Object load(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    BitextPatternRuleLoader loader = new BitextPatternRuleLoader();
    List<BitextPatternRule> rules;
    String filename = s(a, "filename") == null ? "inline-bitext.xml" : s(a, "filename");
    try {
      if ("resource".equals(a.get("mode").asText())) {
        try (InputStream is = JLanguageTool.getDataBroker().getFromRulesDirAsStream(a.get("name").asText())) { rules = loader.getRules(is, a.get("name").asText()); }
      } else {
        rules = loader.getRules(new ByteArrayInputStream(a.get("xml").asText().getBytes(StandardCharsets.UTF_8)), filename);
      }
    } catch (Throwable t) {
      res.put("error", CheckPipeOps.errorOf(t));
      return res;
    }
    List<Object> infos = new ArrayList<>();
    for (BitextPatternRule r : rules) infos.add(ruleInfo(r));
    res.put("count", rules.size());
    res.put("rules", infos);
    if (a.has("pairs")) {
      JLanguageTool sl = lt(a.get("srcLang").asText(), null), tl = lt(a.get("trgLang").asText(), null);
      List<Object> out = new ArrayList<>();
      for (JsonNode p : a.get("pairs")) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("src", p.get(0).asText());
        r.put("trg", p.get(1).asText());
        List<Object> per = new ArrayList<>();
        for (BitextPatternRule br : rules) {
          try { per.add(Arrays.asList(br.getId(), bitextMatches(br, p.get(0).asText(), p.get(1).asText(), sl, tl))); }
          catch (Throwable t) { per.add(Arrays.asList(br.getId(), CheckPipeOps.errorOf(t))); }
        }
        r.put("perRule", per);
        out.add(r);
      }
      res.put("pairs", out);
    }
    return res;
  }

  /** {srcLang, trgLang, extContent?, pairs?, select?:{disabled,enabled,enabledOnly}, brief?} */
  static Object tools(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    Language src = Languages.getLanguageForShortCode(a.get("srcLang").asText()), trg = Languages.getLanguageForShortCode(a.get("trgLang").asText());
    List<BitextRule> rules;
    try {
      if (a.has("extContent")) {
        File f = writeFile(new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode().put("content", a.get("extContent").asText()), "ext-bitext.xml");
        rules = Tools.getBitextRules(src, trg, f);
      } else if (a.has("extMissing")) {
        rules = Tools.getBitextRules(src, trg, new File(a.get("extMissing").asText()));
      } else {
        rules = Tools.getBitextRules(src, trg);
      }
    } catch (Throwable t) {
      res.put("error", CheckPipeOps.errorOf(t));
      return res;
    }
    List<Object> ids = new ArrayList<>();
    for (BitextRule r : rules) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("class", r.getClass().getSimpleName());
      m.put("id", r.getId());
      m.put("sourceLanguage", r.getSourceLanguage() == null ? null : r.getSourceLanguage().getShortCode());
      m.put("category", r.getCategory() == null ? null : r.getCategory().getId().toString());
      ids.add(m);
    }
    res.put("count", rules.size());
    res.put("rules", ids);
    if (a.has("detail") && a.get("detail").asBoolean()) {
      List<Object> d = new ArrayList<>();
      for (BitextRule r : rules) d.add(ruleInfo(r));
      res.put("detail", d);
    }
    if (a.has("select")) {
      JsonNode sel = a.get("select");
      List<String> dis = new ArrayList<>(), en = new ArrayList<>();
      for (JsonNode x : sel.get("disabled")) dis.add(x.asText());
      for (JsonNode x : sel.get("enabled")) en.add(x.asText());
      List<BitextRule> sr = Tools.selectBitextRules(rules, dis, en, sel.get("enabledOnly").asBoolean());
      List<String> sid = new ArrayList<>();
      for (BitextRule r : sr) sid.add(r.getId());
      res.put("selected", sid);
      rules = sr;
    }
    if (a.has("pairs")) {
      JLanguageTool sl = new JLanguageTool(src), tl = new JLanguageTool(trg);
      sl.setCleanOverlappingMatches(false); tl.setCleanOverlappingMatches(false);
      List<Object> out = new ArrayList<>();
      for (JsonNode p : a.get("pairs")) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("src", p.get(0).asText());
        r.put("trg", p.get(1).asText());
        try {
          List<Object> ms = new ArrayList<>();
          for (RuleMatch m : Tools.checkBitext(p.get(0).asText(), p.get(1).asText(), sl, tl, rules)) ms.add(CheckPipeOps.matchDump(m));
          r.put("matches", ms);
        } catch (Throwable t) { r.put("error", CheckPipeOps.errorOf(t)); }
        out.add(r);
      }
      res.put("pairs", out);
    }
    return res;
  }

  /** {lang, motherTongue?, filename, content?, kind:"pattern"|"falsefriends", texts?, brief?} */
  static Object ff(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    JLanguageTool t = lt(a.get("lang").asText(), s(a, "motherTongue"));
    String filename = a.get("filename").asText();
    if (a.has("content")) writeFile(a, filename);
    List<AbstractPatternRule> rules;
    try {
      rules = "pattern".equals(a.get("kind").asText()) ? t.loadPatternRules(filename) : t.loadFalseFriendRules(filename);
    } catch (Throwable e) {
      res.put("error", CheckPipeOps.errorOf(e));
      return res;
    }
    res.put("count", rules.size());
    List<Object> infos = new ArrayList<>();
    boolean brief = a.has("brief") && a.get("brief").asBoolean();
    for (AbstractPatternRule r : rules) {
      if (brief) infos.add(r.getFullId() + "|" + r.getClass().getSimpleName() + "|" + r.getMessage());
      else infos.add(ruleInfo(r));
    }
    res.put("rules", infos);
    if (a.has("texts")) {
      List<Object> out = new ArrayList<>();
      for (JsonNode x : a.get("texts")) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("text", x.asText());
        List<Object> ms = new ArrayList<>();
        AnalyzedSentence as = t.getAnalyzedSentence(x.asText());
        for (AbstractPatternRule pr : rules) for (RuleMatch m : pr.match(as)) { Map<String, Object> d = CheckPipeOps.matchDump(m); d.put("fullId", pr.getFullId()); ms.add(d); }
        r.put("matches", ms);
        out.add(r);
      }
      res.put("texts", out);
    }
    return res;
  }
}
