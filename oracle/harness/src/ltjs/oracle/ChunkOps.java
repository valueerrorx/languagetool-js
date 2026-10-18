package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.broker.DefaultResourceDataBroker;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.tagging.disambiguation.Disambiguator;
import org.languagetool.tagging.disambiguation.MultiWordChunker;
import org.languagetool.tagging.disambiguation.MultiWordChunker2;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-CHUNK: chunk-run, chunk-tag. Format: docs/review/F33-oracle.md. */
final class ChunkOps {
  private ChunkOps() {}

  /** serves inline files by path, everything else from the real resource dir */
  static final class InlineBroker extends DefaultResourceDataBroker {
    final Map<String, byte[]> files = new HashMap<>();
    @Override
    public InputStream getFromResourceDirAsStream(String path) {
      byte[] b = files.get(path);
      if (b != null) return new ByteArrayInputStream(b);
      return super.getFromResourceDirAsStream(path);
    }
  }

  /** MultiWordChunker2 variant overriding the protected hooks */
  static final class Chunker2X extends MultiWordChunker2 {
    Chunker2X(String f, boolean fc) { super(f, fc); }
    @Override
    protected String formatPosTag(String posTag, int position, int multiwordLength) {
      return posTag + "#" + position + "/" + multiwordLength;
    }
    @Override
    protected boolean matches(String matchText, AnalyzedTokenReadings inputTokens) {
      return matchText.equalsIgnoreCase(inputTokens.getToken());
    }
  }

  private static boolean bool(JsonNode a, String k) { return a.has(k) && a.get(k).asBoolean(); }

  static Disambiguator build(JsonNode s) {
    String kind = s.get("kind").asText();
    String file = s.get("file").asText();
    if (kind.equals("mwc")) {
      MultiWordChunker c;
      if (s.has("tag")) {
        String tag = s.get("tag").isNull() ? null : s.get("tag").asText();
        if ("NONE".equals(tag)) tag = MultiWordChunker.tagForNotAddingTags;
        c = MultiWordChunker.getInstance(file, bool(s, "fc"), bool(s, "au"), bool(s, "tc"), tag);
      } else if (s.has("fc") || s.has("au") || s.has("tc")) {
        c = MultiWordChunker.getInstance(file, bool(s, "fc"), bool(s, "au"), bool(s, "tc"));
      } else {
        c = MultiWordChunker.getInstance(file);
      }
      c.setIgnoreSpelling(bool(s, "ignoreSpelling"));
      c.setRemovePreviousTags(bool(s, "removePrev"));
      return c;
    }
    MultiWordChunker2 c;
    if (kind.equals("mwc2x")) c = new Chunker2X(file, bool(s, "fc"));
    else if (s.has("fc")) c = new MultiWordChunker2(file, bool(s, "fc"));
    else c = new MultiWordChunker2(file);
    if (s.has("removeOther")) c.setRemoveOtherReadings(bool(s, "removeOther"));
    if (s.has("wrap")) c.setWrapTag(bool(s, "wrap"));
    return c;
  }

  static AnalyzedSentence text(Language l, JsonNode tn) throws Exception {
    if (tn.isObject() && tn.has("text")) {
      AnalyzedSentence s = DisambOps.fresh(l, tn.get("text"));
      AnalyzedTokenReadings[] t = s.getTokens();
      Iterator<Map.Entry<String, JsonNode>> it = tn.get("tags").fields();
      while (it.hasNext()) {
        Map.Entry<String, JsonNode> e = it.next();
        List<ChunkTag> l2 = new ArrayList<>();
        for (JsonNode c : e.getValue()) l2.add(new ChunkTag(c.asText(), c.asText().startsWith("~")));
        t[Integer.parseInt(e.getKey())].setChunkTags(l2);
      }
      return s;
    }
    return DisambOps.fresh(l, tn);
  }

  // ---- chunk-run: {lang, files?:{path:content}, texts:[...], jobs:[{chain:[spec], texts:[i], digest?}]} ----
  static Object run(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    InlineBroker broker = new InlineBroker();
    if (a.has("files")) {
      Iterator<Map.Entry<String, JsonNode>> it = a.get("files").fields();
      while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); broker.files.put(e.getKey(), e.getValue().asText().getBytes(StandardCharsets.UTF_8)); }
    }
    ResourceDataBrokerHolder.set(broker);
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      List<Object> per = new ArrayList<>();
      for (JsonNode ti : job.get("texts")) {
        try {
          AnalyzedSentence raw = text(l, a.get("texts").get(ti.asInt()));
          AnalyzedTokenReadings[] pre = AnalyzedSentence.copyReadings(raw.getTokens());
          AnalyzedSentence cur = raw;
          for (JsonNode spec : job.get("chain")) {
            cur = build(spec).disambiguate(cur);
          }
          AnalyzedSentence res = new AnalyzedSentence(cur.getTokens(), pre);
          Map<String, Object> o = new LinkedHashMap<>();
          Object ds = DisambOps.dumpSentence(res);
          if (bool(job, "digest")) {
            o.put("n", res.getTokensWithoutWhitespace().length);
            o.put("ch", ((Map<?, ?>) ds).get("p") != null);
            o.put("dg2", DisambOps.sha1(DisambOps.canon(ds)));
          } else o.put("s", ds);
          per.add(o);
        } catch (Throwable t) {
          per.add(DisambOps.errc(t));
        }
      }
      jobs.add(per);
    }
    return Collections.singletonMap("jobs", jobs);
  }

  static final class ResourceDataBrokerHolder {
    static void set(InlineBroker b) { JLanguageTool.setDataBroker(b); }
  }

  // ---- chunk-tag: {items:[{tag:string|null, re?:bool}], pairs:[[i,j]]} ----
  static Object chunkTag(JsonNode a) {
    List<ChunkTag> objs = new ArrayList<>();
    List<Object> items = new ArrayList<>();
    for (JsonNode it : a.get("items")) {
      try {
        String t = it.get("tag").isNull() ? null : it.get("tag").asText();
        ChunkTag c = it.has("re") ? new ChunkTag(t, it.get("re").asBoolean()) : new ChunkTag(t);
        objs.add(c);
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("tag", c.getChunkTag());
        o.put("re", c.isRegexp());
        o.put("str", c.toString());
        o.put("hash", c.hashCode());
        items.add(o);
      } catch (Throwable t) {
        objs.add(null);
        items.add(DisambOps.errc(t));
      }
    }
    List<Object> pairs = new ArrayList<>();
    for (JsonNode p : a.get("pairs")) {
      ChunkTag x = objs.get(p.get(0).asInt());
      ChunkTag y = objs.get(p.get(1).asInt());
      Map<String, Object> o = new LinkedHashMap<>();
      try {
        o.put("eq", x.equals(y));
        o.put("eqNull", x.equals(null));
        o.put("eqStr", x.equals(x.getChunkTag()));
        o.put("m", x.matches(y));
      } catch (Throwable t) { o.put("error", ((Map<?, ?>) DisambOps.errc(t)).get("error")); }
      pairs.add(o);
    }
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("items", items);
    r.put("pairs", pairs);
    return r;
  }
}
