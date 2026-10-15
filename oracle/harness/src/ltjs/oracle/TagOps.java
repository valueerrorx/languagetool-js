package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.tagging.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.tokenizers.*;
import org.languagetool.rules.spelling.morfologik.MorfologikSpeller;

import java.io.*;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-TAGGER: tag, manual-tagger. Format: docs/review/F13-oracle.md. */
final class TagOps {
  private TagOps() {}

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

  /** Compact: [token, startPos, endPos, flags, readings [[token,lemma,pos]...], chunkTags]; flags bits: 1 isTagged, 2 isWhitespace, 4 isLinebreak, 8 isWhitespaceBefore, 16 hasTypographicApostrophe. */
  private static List<Object> tokenInfo(AnalyzedTokenReadings t) {
    List<Object> o = new ArrayList<>();
    o.add(t.getToken());
    o.add(t.getStartPos());
    o.add(t.getEndPos());
    o.add((t.isTagged() ? 1 : 0) | (t.isWhitespace() ? 2 : 0) | (t.isLinebreak() ? 4 : 0) | (t.isWhitespaceBefore() ? 8 : 0) | (t.hasTypographicApostrophe() ? 16 : 0));
    List<Object> rs = new ArrayList<>();
    for (AnalyzedToken r : t.getReadings()) rs.add(Arrays.asList(r.getToken(), r.getLemma(), r.getPOSTag()));
    o.add(rs);
    List<Object> cts = new ArrayList<>();
    for (ChunkTag c : t.getChunkTags()) cts.add(c.getChunkTag());
    o.add(cts);
    return o;
  }

  private static List<Object> tagTokens(Tagger tagger, List<String> toks) throws Exception {
    List<Object> l = new ArrayList<>();
    for (AnalyzedTokenReadings t : tagger.tag(toks)) l.add(tokenInfo(t));
    return l;
  }

  /** {lang, texts: [string|null], split?: bool (default true), tokenLists?: [[string]]} -> {taggerClass, wordTokenizerClass, results} */
  static Object tag(JsonNode a) throws Exception {
    Language lang = Languages.getLanguageForShortCode(a.get("lang").asText());
    Tagger tagger = lang.getTagger();
    Tokenizer wt = lang.getWordTokenizer();
    SentenceTokenizer st = lang.getSentenceTokenizer();
    boolean split = !a.has("split") || a.get("split").asBoolean();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("taggerClass", tagger == null ? null : tagger.getClass().getName());
    out.put("wordTokenizerClass", wt.getClass().getName());
    List<Object> results = new ArrayList<>();
    if (a.has("tokenLists")) {
      for (JsonNode tl : a.get("tokenLists")) {
        results.add(safe(() -> {
          List<String> toks = new ArrayList<>();
          for (JsonNode x : tl) toks.add(str(x));
          return tagTokens(tagger, toks);
        }));
      }
    } else {
      for (JsonNode t : a.get("texts")) {
        results.add(safe(() -> {
          List<String> sents = split ? st.tokenize(str(t)) : Collections.singletonList(str(t));
          List<Object> ss = new ArrayList<>();
          for (String s : sents) {
            List<String> toks = wt.tokenize(s);
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("tokens", toks);
            x.put("tagged", tagTokens(tagger, toks));
            ss.add(x);
          }
          return ss;
        }));
      }
    }
    out.put("results", results);
    return out;
  }

  private static List<Object> tw(List<TaggedWord> l) {
    List<Object> r = new ArrayList<>();
    for (TaggedWord w : l) r.add(Arrays.asList(w.getLemma(), w.getPosTag()));
    return r;
  }

  private static InputStream stream(String res) throws IOException {
    InputStream is = null;
    for (java.net.URL url : JLanguageTool.getDataBroker().getFromResourceDirAsUrls(res)) {
      is = is == null ? url.openStream() : new SequenceInputStream(is, url.openStream());
    }
    return is;
  }

  private static ManualTagger manual(JsonNode spec) throws Exception {
    if (spec.has("content")) return new ManualTagger(new ByteArrayInputStream(spec.get("content").asText().getBytes(StandardCharsets.UTF_8)), spec.has("internTags") && spec.get("internTags").asBoolean());
    String lc = spec.get("lang").asText();
    InputStream is = null;
    for (JsonNode fn : spec.get("files")) { String f = fn.asText();
      InputStream s = stream("/" + lc + "/" + f);
      if (s != null) is = is == null ? s : new SequenceInputStream(is, s);
    }
    return new ManualTagger(is);
  }

  private static WordTagger wordTagger(JsonNode spec) throws Exception {
    String kind = spec.get("kind").asText();
    switch (kind) {
      case "manual": return manual(spec);
      case "dict": return new MorfologikTagger(MorfologikSpeller.getDictionaryWithCaching(spec.get("dict").asText()), spec.has("internTags") && spec.get("internTags").asBoolean());
      case "combining": {
        WordTagger removal = spec.has("removal") ? wordTagger(spec.get("removal")) : null;
        return new CombiningTagger(wordTagger(spec.get("tagger1")), wordTagger(spec.get("tagger2")), removal, spec.get("overwrite").asBoolean());
      }
      case "language": {
        Language lang = Languages.getLanguageForShortCode(spec.get("lang").asText());
        BaseTagger bt = (BaseTagger) lang.getTagger();
        Method m = BaseTagger.class.getDeclaredMethod("getWordTagger");
        m.setAccessible(true);
        return (WordTagger) m.invoke(bt);
      }
      default: throw new IllegalArgumentException("kind: " + kind);
    }
  }

  /** {tagger: spec, words: [string|null]} spec kinds: manual {content | lang+files}, dict {dict}, combining {tagger1,tagger2,removal?,overwrite}, language {lang} (BaseTagger word tagger). -> {class, results: [[lemma,pos]...|{error}]} ; build errors -> op result {buildError} */
  static Object manualTagger(JsonNode a) throws Exception {
    Map<String, Object> out = new LinkedHashMap<>();
    WordTagger t;
    try {
      t = wordTagger(a.get("tagger"));
    } catch (Throwable e) {
      out.put("buildError", err(e).get("error"));
      return out;
    }
    out.put("class", t.getClass().getName());
    List<Object> results = new ArrayList<>();
    for (JsonNode w : a.get("words")) results.add(safe(() -> tw(t.tag(str(w)))));
    out.put("results", results);
    return out;
  }
}
