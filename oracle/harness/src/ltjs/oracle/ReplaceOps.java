package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import com.hankcs.algorithm.AhoCorasickDoubleArrayTrie;
import org.languagetool.*;
import org.languagetool.rules.*;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Op for X-REPLACE (F37): replace-check. Format: docs/review/F37-oracle.md. */
final class ReplaceOps {
  private ReplaceOps() {}

  /** mode rules (default): as style-check. mode aho / confusion / shortdesc: direct library calls. */
  static Object check(JsonNode a) throws Exception {
    String mode = a.has("mode") ? a.get("mode").asText() : "rules";
    switch (mode) {
      case "rules": return StyleOps.check(a);
      case "aho": return aho(a);
      case "confusion": return confusion(a);
      case "shortdesc": return shortdesc(a);
      default: throw new IllegalArgumentException("mode " + mode);
    }
  }

  /** {entries:[[key,value]], map:"tree"|"linked"|"hash", texts:[]} -> {buildError}|{hits:[[[begin,end,value]]], get:[]} */
  private static Object aho(JsonNode a) {
    Map<String, Object> res = new LinkedHashMap<>();
    Map<String, String> m = "linked".equals(a.get("map").asText()) ? new LinkedHashMap<>() : "hash".equals(a.get("map").asText()) ? new HashMap<>() : new TreeMap<>();
    for (JsonNode e : a.get("entries")) m.put(e.get(0).asText(), e.get(1).asText());
    AhoCorasickDoubleArrayTrie<String> trie = new AhoCorasickDoubleArrayTrie<>();
    try {
      trie.build(m);
    } catch (Throwable t) {
      res.put("buildError", CheckPipeOps.errorOf(t));
      return res;
    }
    res.put("size", trie.size());
    List<Object> all = new ArrayList<>();
    for (JsonNode t : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        List<Object> hits = new ArrayList<>();
        for (AhoCorasickDoubleArrayTrie.Hit<String> h : trie.parseText(t.asText())) hits.add(Arrays.asList(h.begin, h.end, h.value));
        r.put("hits", hits);
        r.put("matches", trie.matches(t.asText()));
        AhoCorasickDoubleArrayTrie.Hit<String> f = trie.findFirst(t.asText());
        r.put("first", f == null ? null : Arrays.asList(f.begin, f.end, f.value));
      } catch (Throwable x) {
        r.put("error", CheckPipeOps.errorOf(x));
      }
      all.add(r);
    }
    res.put("texts", all);
    List<Object> gets = new ArrayList<>();
    if (a.has("get")) for (JsonNode k : a.get("get")) gets.add(trie.get(k.asText()));
    res.put("get", gets);
    return res;
  }

  /** {lang, file:"<confusion_sets text>"} -> {pairs:{key:[...]}} or {error} */
  private static Object confusion(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    try {
      Map<String, List<ConfusionPair>> m = new ConfusionSetLoader(l).loadConfusionPairs(new ByteArrayInputStream(a.get("file").asText().getBytes(StandardCharsets.UTF_8)));
      Map<String, Object> out = new TreeMap<>();
      for (Map.Entry<String, List<ConfusionPair>> e : m.entrySet()) {
        List<Object> ps = new ArrayList<>();
        for (ConfusionPair p : e.getValue()) {
          Map<String, Object> o = new LinkedHashMap<>();
          o.put("str", p.toString());
          o.put("factor", p.getFactor());
          o.put("bidi", p.isBidirectional());
          List<Object> ts = new ArrayList<>();
          for (ConfusionString s : p.getTerms()) ts.add(Arrays.asList(s.getString(), s.getDescription()));
          o.put("terms", ts);
          List<Object> us = new ArrayList<>();
          for (ConfusionString s : p.getUppercaseFirstCharTerms()) us.add(Arrays.asList(s.getString(), s.getDescription()));
          o.put("upper", us);
          ps.add(o);
        }
        out.put(e.getKey(), ps);
      }
      res.put("pairs", out);
    } catch (Throwable t) {
      res.put("error", CheckPipeOps.errorOf(t));
    }
    return res;
  }

  /** {lang, words:[]} -> {descs:[string|null]} */
  private static Object shortdesc(JsonNode a) {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    ShortDescriptionProvider p = new ShortDescriptionProvider();
    List<Object> out = new ArrayList<>();
    for (JsonNode w : a.get("words")) out.add(p.getShortDescription(w.asText(), l));
    return Collections.singletonMap("descs", out);
  }
}
