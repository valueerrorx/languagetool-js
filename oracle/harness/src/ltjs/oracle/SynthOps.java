package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.synthesis.*;

import java.io.*;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Op for X-SYNTH: synth. Format: docs/review/F24-oracle.md. */
final class SynthOps {
  private SynthOps() {}

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

  private static List<String> strs(JsonNode n) {
    if (n == null || n.isNull()) return null;
    List<String> l = new ArrayList<>();
    for (JsonNode x : n) l.add(str(x));
    return l;
  }

  /**
   * {impl:"lang", lang, calls:[{m, ...}]} -> {class, results[]}
   * m: synthesize {tok, lemma, tag, re?(bool; absent = 2-arg overload)} | spell {n} | roman {n} | possibleTags | targetPosTag {tags, target} | posTagCorrection {tag} | lookup {lemma, tag} (protected, reflective)
   * {impl:"manual", content? | lang+file?, calls:[{m:"lookup", lemma, tag} | {m:"possibleTags"}]} -> {class, results[]}
   */
  static Object synth(JsonNode a) throws Exception {
    String impl = a.has("impl") ? a.get("impl").asText() : "lang";
    Map<String, Object> out = new LinkedHashMap<>();
    List<Object> results = new ArrayList<>();
    if (impl.equals("manual")) {
      ManualSynthesizer ms;
      try {
        InputStream is;
        if (a.has("content")) {
          is = new ByteArrayInputStream(a.get("content").asText().getBytes(StandardCharsets.UTF_8));
        } else {
          ByteArrayOutputStream bo = new ByteArrayOutputStream();
          for (JsonNode f : a.get("files")) {
            try (InputStream s = JLanguageTool.getDataBroker().getFromResourceDirAsStream("/" + a.get("lang").asText() + "/" + f.asText())) {
              s.transferTo(bo);
            }
            bo.write('\n');
          }
          is = new ByteArrayInputStream(bo.toByteArray());
        }
        ms = new ManualSynthesizer(is);
      } catch (Throwable t) {
        out.put("buildError", err(t).get("error"));
        return out;
      }
      out.put("class", ms.getClass().getName());
      for (JsonNode c : a.get("calls")) {
        String m = c.get("m").asText();
        results.add(safe(() -> {
          switch (m) {
            case "lookup": return ms.lookup(str(c.get("lemma")), str(c.get("tag")));
            case "possibleTags": return new ArrayList<>(ms.getPossibleTags());
            default: throw new IllegalArgumentException("unknown method: " + m);
          }
        }));
      }
      out.put("results", results);
      return out;
    }
    Language lang = Languages.getLanguageForShortCode(a.get("lang").asText());
    Synthesizer s = lang.getSynthesizer();
    out.put("class", s.getClass().getName());
    Method lookupM = BaseSynthesizer.class.getDeclaredMethod("lookup", String.class, String.class);
    lookupM.setAccessible(true);
    for (JsonNode c : a.get("calls")) {
      String m = c.get("m").asText();
      results.add(safe(() -> {
        switch (m) {
          case "synthesize": {
            AnalyzedToken t = new AnalyzedToken(str(c.get("tok")), null, str(c.get("lemma")));
            String tag = str(c.get("tag"));
            if (c.has("tokNull") && c.get("tokNull").asBoolean()) t = null;
            if (c.has("re")) return Arrays.asList(s.synthesize(t, tag, c.get("re").asBoolean()));
            return Arrays.asList(s.synthesize(t, tag));
          }
          case "spell": return s.getSpelledNumber(str(c.get("n")));
          case "roman": return ((BaseSynthesizer) s).getRomanNumber(str(c.get("n")));
          case "possibleTags": return ((BaseSynthesizer) s).getPossibleTagsForSynthesis();
          case "targetPosTag": return s.getTargetPosTag(strs(c.get("tags")), str(c.get("target")));
          case "posTagCorrection": return s.getPosTagCorrection(str(c.get("tag")));
          case "lookup": return lookupM.invoke(s, str(c.get("lemma")), str(c.get("tag")));
          default: throw new IllegalArgumentException("unknown method: " + m);
        }
      }));
    }
    out.put("results", results);
    return out;
  }
}
