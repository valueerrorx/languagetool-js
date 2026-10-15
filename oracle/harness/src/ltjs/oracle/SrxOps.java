package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import net.loomchild.segment.srx.*;
import org.languagetool.*;
import org.languagetool.tokenizers.*;

import java.lang.reflect.Method;
import java.util.*;

/** Ops for X-SRX: sentence-tokenize, srx-segment, srx-rules. Format: docs/review/F11-oracle.md. */
final class SrxOps {
  private SrxOps() {}

  private static Map<String, Object> err(Throwable t) {
    if (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("error", e);
    return m;
  }

  private static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (Throwable t) { return err(t); }
  }

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  private static Method srxTools(String name, Class<?>... types) throws Exception {
    Class<?> c = Class.forName("org.languagetool.tokenizers.SrxTools");
    Method m = c.getDeclaredMethod(name, types);
    m.setAccessible(true);
    return m;
  }

  /** {lang, tokenizer?: "simple", modes: [bool], texts: [string|null]} -> {class, initialSingleLineBreaksMarksPara, results: [{"false": [...], "true": [...]}]} */
  static Object sentenceTokenize(JsonNode a) throws Exception {
    SentenceTokenizer tok;
    String kind = str(a.get("tokenizer"));
    if ("simple".equals(kind)) tok = new SimpleSentenceTokenizer();
    else if ("srx".equals(kind)) {
      Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
      tok = new SRXSentenceTokenizer(l, a.get("srx").asText());
    } else tok = Languages.getLanguageForShortCode(a.get("lang").asText()).getSentenceTokenizer();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("class", tok.getClass().getName());
    out.put("initialSingleLineBreaksMarksPara", tok.singleLineBreaksMarksPara());
    List<Boolean> modes = new ArrayList<>();
    for (JsonNode m : a.get("modes")) modes.add(m.asBoolean());
    List<Object> results = new ArrayList<>();
    for (JsonNode t : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      for (boolean mode : modes) {
        r.put(String.valueOf(mode), safe(() -> {
          tok.setSingleLineBreaksMarksParagraph(mode);
          List<String> s = tok.tokenize(str(t));
          Map<String, Object> x = new LinkedHashMap<>();
          x.put("sentences", s);
          x.put("singleLineBreaksMarksPara", tok.singleLineBreaksMarksPara());
          return x;
        }));
      }
      results.add(r);
    }
    out.put("results", results);
    return out;
  }

  private static Object doc(String srx) throws Exception {
    Method m = srxTools("createSrxDocument", String.class);
    return m.invoke(null, srx);
  }

  /** {srx, code, texts[]} -> [segments | error] through SrxTools.tokenize with the exact LT parameters. */
  static Object srxSegment(JsonNode a) throws Exception {
    Object d;
    try { d = doc(a.get("srx").asText()); } catch (Throwable t) { return err(t); }
    Method tk = srxTools("tokenize", String.class, SrxDocument.class, String.class);
    List<Object> results = new ArrayList<>();
    String code = str(a.get("code"));
    for (JsonNode t : a.get("texts")) results.add(safe(() -> tk.invoke(null, str(t), d, code)));
    return results;
  }

  /** {srx, codes[]} -> cascade flag, language maps, and per code the language rule list (name + rules). */
  static Object srxRules(JsonNode a) throws Exception {
    SrxDocument d;
    try { d = (SrxDocument) doc(a.get("srx").asText()); } catch (Throwable t) { return err(t); }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("cascade", d.getCascade());
    List<Object> maps = new ArrayList<>();
    for (LanguageMap lm : d.getLanguageMapList()) maps.add(Arrays.asList(lm.getLanguagePattern().pattern(), lm.getLanguagePattern().flags(), lm.getLanguageRule().getName()));
    out.put("languageMaps", maps);
    Map<String, Object> byCode = new LinkedHashMap<>();
    for (JsonNode c : a.get("codes")) {
      byCode.put(c.asText(), safe(() -> {
        List<Object> lrs = new ArrayList<>();
        for (LanguageRule lr : d.getLanguageRuleList(c.asText())) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("name", lr.getName());
          List<Object> rules = new ArrayList<>();
          for (Rule r : lr.getRuleList()) rules.add(Arrays.asList(r.isBreak(), r.getBeforePattern(), r.getAfterPattern()));
          m.put("rules", rules);
          lrs.add(m);
        }
        return lrs;
      }));
    }
    out.put("byCode", byCode);
    return out;
  }
}
