package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import opennlp.tools.chunker.ChunkerME;
import opennlp.tools.chunker.ChunkerModel;
import opennlp.tools.ml.model.MaxentModel;
import opennlp.tools.postag.POSModel;
import opennlp.tools.postag.POSTaggerME;
import opennlp.tools.tokenize.TokenizerME;
import opennlp.tools.tokenize.TokenizerModel;
import opennlp.tools.util.Sequence;
import opennlp.tools.util.Span;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.chunking.ChunkTaggedToken;
import org.languagetool.tools.Tools;

import java.lang.reflect.Method;
import java.util.*;

/** Ops for X-OPENNLP/X-ENCHUNK: opennlp-model, opennlp-run, opennlp-eval, opennlp-math, opennlp-enchunker. Format: docs/review/F44-oracle.md. */
final class OpenNlpOps {
  private OpenNlpOps() {}

  static TokenizerModel tm;
  static POSModel pm;
  static ChunkerModel cm;

  static synchronized void load() throws Exception {
    if (tm == null) tm = new TokenizerModel(Tools.getStream("/en-token.bin", "2d0dd64ffb3d084382d7bdb65e7bd004c5001ba5503c36413d97c3e46321437c"));
    if (pm == null) pm = new POSModel(Tools.getStream("/en-pos-maxent.bin", "645a094f45a866687a617385233fd23ae8b0f5fa8b1b76996781a50c17bdcf3d"));
    if (cm == null) cm = new ChunkerModel(Tools.getStream("/en-chunker.bin", "7861a0c2f134d9c12a022a1ba501e88bc7039f6db72b4140e1bafd1fb5ef76cc"));
  }

  private static Map<String, Object> err(Throwable t) {
    if (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("error", e);
    return m;
  }

  private static List<String> ds(double[] d) {
    List<String> l = new ArrayList<>();
    for (double x : d) l.add(Double.toString(x));
    return l;
  }

  private static List<String> bits(double[] d) {
    List<String> l = new ArrayList<>();
    for (double x : d) l.add(Long.toHexString(Double.doubleToRawLongBits(x)));
    return l;
  }

  private static Map<String, Object> mi(MaxentModel m) {
    Map<String, Object> o = new LinkedHashMap<>();
    int n = m.getNumOutcomes();
    o.put("class", m.getClass().getName());
    o.put("numOutcomes", n);
    List<String> outs = new ArrayList<>();
    for (int i = 0; i < n; i++) outs.add(m.getOutcome(i));
    o.put("outcomes", outs);
    return o;
  }

  private static List<Object> seqs(Sequence[] ss) {
    List<Object> l = new ArrayList<>();
    for (Sequence s : ss) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("outcomes", s.getOutcomes());
      o.put("probs", ds(s.getProbs()));
      o.put("score", Double.toString(s.getScore()));
      l.add(o);
    }
    return l;
  }

  private static Map<String, String> manifest(opennlp.tools.util.model.BaseModel m) throws Exception {
    Map<String, String> r = new TreeMap<>();
    Method g = opennlp.tools.util.model.BaseModel.class.getDeclaredMethod("getManifestProperty", String.class);
    g.setAccessible(true);
    for (String k : new String[]{"Component-Name", "OpenNLP-Version", "Language", "Timestamp", "Training-Eventhash", "Training-Algorithm", "Training-Iterations", "Training-Cutoff", "Beam-Size", "useAlphaNumericOptimization", "Factory", "Author", "Version"}) {
      r.put(k, (String) g.invoke(m, k));
    }
    return r;
  }

  static Object model(JsonNode a) throws Exception {
    load();
    Map<String, Object> r = new LinkedHashMap<>();
    Map<String, Object> t = new LinkedHashMap<>();
    t.put("manifest", manifest(tm));
    t.put("alphaNum", tm.useAlphaNumericOptimization());
    t.put("language", tm.getLanguage());
    t.put("maxent", mi(tm.getMaxentModel()));
    Map<String, Object> p = new LinkedHashMap<>();
    p.put("manifest", manifest(pm));
    p.put("language", pm.getLanguage());
    p.put("maxent", mi(pm.getPosModel()));
    p.put("hasTagDictionary", pm.getFactory().getTagDictionary() != null);
    p.put("factory", pm.getFactory() == null ? null : pm.getFactory().getClass().getName());
    Map<String, Object> c = new LinkedHashMap<>();
    c.put("manifest", manifest(cm));
    c.put("language", cm.getLanguage());
    c.put("maxent", mi(cm.getChunkerModel()));
    c.put("factory", cm.getFactory() == null ? null : cm.getFactory().getClass().getName());
    r.put("token", t);
    r.put("pos", p);
    r.put("chunk", c);
    return r;
  }

  /** {texts}: per text whitespace-separated or raw sentence */
  static Object run(JsonNode a) throws Exception {
    load();
    List<Object> out = new ArrayList<>();
    int beam = a.has("topK") ? a.get("topK").asInt() : 3;
    for (JsonNode tn : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        String text = tn.asText();
        String clean = text.replace('’', '\'');
        TokenizerME tok = new TokenizerME(tm);
        String[] tokens = tok.tokenize(clean);
        double[] tp = tok.getTokenProbabilities();
        Span[] spans = new TokenizerME(tm).tokenizePos(clean);
        r.put("tokens", Arrays.asList(tokens));
        r.put("tokenProbs", ds(tp));
        List<Object> sp = new ArrayList<>();
        for (Span s : spans) sp.add(Arrays.asList(s.getStart(), s.getEnd()));
        r.put("spans", sp);
        POSTaggerME pos = new POSTaggerME(pm);
        String[] tags = pos.tag(tokens);
        r.put("tags", Arrays.asList(tags));
        r.put("tagProbs", ds(pos.probs()));
        r.put("tagTopK", seqs(new POSTaggerME(pm).topKSequences(tokens)));
        ChunkerME ch = new ChunkerME(cm);
        String[] chunks = ch.chunk(tokens, tags);
        r.put("chunks", Arrays.asList(chunks));
        r.put("chunkProbs", ds(ch.probs()));
        r.put("chunkTopK", seqs(new ChunkerME(cm).topKSequences(tokens, tags)));
        r.put("chunkSpans", Arrays.toString(new ChunkerME(cm).chunkAsSpans(tokens, tags)));
      } catch (Throwable t) {
        r.put("error", err(t).get("error"));
      }
      out.add(r);
    }
    return out;
  }

  /** {model:token|pos|chunk, contexts:[[feature]]} -> per context outcomes probabilities, bits, best */
  static Object eval(JsonNode a) throws Exception {
    load();
    String m = a.get("model").asText();
    MaxentModel mm = m.equals("token") ? tm.getMaxentModel() : m.equals("pos") ? pm.getPosModel() : cm.getChunkerModel();
    List<Object> out = new ArrayList<>();
    for (JsonNode cn : a.get("contexts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        List<String> ctx = new ArrayList<>();
        for (JsonNode x : cn) ctx.add(x.asText());
        String[] c = ctx.toArray(new String[0]);
        double[] p = mm.eval(c);
        r.put("probs", ds(p));
        r.put("bits", bits(p));
        r.put("best", mm.getBestOutcome(p));
        r.put("all", mm.getAllOutcomes(p));
      } catch (Throwable t) {
        r.put("error", err(t).get("error"));
      }
      out.add(r);
    }
    return out;
  }

  /** {fn, values:[string]} -> StrictMath result bits+string */
  static Object math(JsonNode a) {
    String fn = a.get("fn").asText();
    List<Object> out = new ArrayList<>();
    for (JsonNode v : a.get("values")) {
      double x = Double.parseDouble(v.asText());
      double y;
      switch (fn) {
        case "exp": y = StrictMath.exp(x); break;
        case "log": y = StrictMath.log(x); break;
        case "sqrt": y = StrictMath.sqrt(x); break;
        case "pow2": y = StrictMath.pow(x, 2.0); break;
        case "log10": y = StrictMath.log10(x); break;
        case "expm1": y = StrictMath.expm1(x); break;
        default: throw new IllegalArgumentException(fn);
      }
      out.add(Arrays.asList(Double.toString(x), Double.toString(y), Long.toHexString(Double.doubleToRawLongBits(y))));
    }
    return out;
  }

  /** {texts}: EnglishChunker pre-filter chunk tags, filtered chunk tags and the readings mapping */
  static Object enchunker(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang("en-US");
    Class<?> ec = Class.forName("org.languagetool.chunking.EnglishChunker");
    Object chunker = ec.getDeclaredConstructor().newInstance();
    Method get = ec.getDeclaredMethod("getChunkTagsForReadings", List.class);
    get.setAccessible(true);
    Method tokenize = ec.getDeclaredMethod("tokenize", String.class);
    tokenize.setAccessible(true);
    Class<?> fc = Class.forName("org.languagetool.chunking.EnglishChunkFilter");
    java.lang.reflect.Constructor<?> fcc = fc.getDeclaredConstructor();
    fcc.setAccessible(true);
    Object filter = fcc.newInstance();
    Method fm = fc.getDeclaredMethod("filter", List.class);
    fm.setAccessible(true);
    List<Object> out = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        AnalyzedSentence s = DisambOps.fresh(l, tn);
        List<AnalyzedTokenReadings> list = new ArrayList<>(Arrays.asList(s.getTokens()));
        StringBuilder sb = new StringBuilder();
        for (AnalyzedTokenReadings t : list) sb.append(t.getToken());
        r.put("openNlpTokens", Arrays.asList((String[]) tokenize.invoke(chunker, sb.toString())));
        @SuppressWarnings("unchecked")
        List<ChunkTaggedToken> orig = (List<ChunkTaggedToken>) get.invoke(chunker, list);
        @SuppressWarnings("unchecked")
        List<ChunkTaggedToken> filtered = (List<ChunkTaggedToken>) fm.invoke(filter, orig);
        r.put("orig", dump(orig));
        r.put("filtered", dump(filtered));
        ((org.languagetool.chunking.Chunker) chunker).addChunkTags(list);
        List<Object> fin = new ArrayList<>();
        for (AnalyzedTokenReadings t : list) {
          List<String> ct = new ArrayList<>();
          for (ChunkTag c : t.getChunkTags()) ct.add(c.getChunkTag());
          fin.add(Arrays.asList(t.getToken(), ct));
        }
        r.put("assigned", fin);
      } catch (Throwable t) {
        r.put("error", err(t).get("error"));
      }
      out.add(r);
    }
    return out;
  }

  private static List<Object> dump(List<ChunkTaggedToken> l) {
    List<Object> o = new ArrayList<>();
    for (ChunkTaggedToken t : l) {
      List<String> ct = new ArrayList<>();
      for (ChunkTag c : t.getChunkTags()) ct.add(c.getChunkTag());
      AnalyzedTokenReadings r = t.getReadings();
      o.add(Arrays.asList(t.getToken(), ct, r == null ? null : r.getToken(), r == null ? null : r.getStartPos()));
    }
    return o;
  }
}
