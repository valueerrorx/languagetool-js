package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.tokenizers.*;

import java.util.*;

/** Ops for X-WORDTOK: word-tokenize, wordtok-static. Format: docs/review/F12-oracle.md. */
final class WordTokOps {
  private WordTokOps() {}

  private static Map<String, Object> err(Throwable t) {
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

  /** {lang, tokenizer?: "core", split?: bool, texts: [string|null]} -> {class, tokenizingCharacters, results: [tokens | {sentences, tokens: [[...]]} | {error}]} */
  static Object wordTokenize(JsonNode a) throws Exception {
    Tokenizer tok;
    Language lang = null;
    if ("core".equals(str(a.get("tokenizer")))) tok = new WordTokenizer();
    else {
      lang = Languages.getLanguageForShortCode(a.get("lang").asText());
      tok = lang.getWordTokenizer();
    }
    boolean split = a.has("split") && a.get("split").asBoolean();
    SentenceTokenizer st = split ? (lang != null ? lang.getSentenceTokenizer() : Languages.getLanguageForShortCode("en-US").getSentenceTokenizer()) : null;
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("class", tok.getClass().getName());
    out.put("tokenizingCharacters", tok instanceof WordTokenizer ? ((WordTokenizer) tok).getTokenizingCharacters() : null);
    List<Object> results = new ArrayList<>();
    for (JsonNode t : a.get("texts")) {
      results.add(safe(() -> {
        if (!split) return tok.tokenize(str(t));
        List<String> sents = st.tokenize(str(t));
        List<Object> toks = new ArrayList<>();
        for (String s : sents) toks.add(tok.tokenize(s));
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("sentences", sents);
        x.put("tokens", toks);
        return x;
      }));
    }
    out.put("results", results);
    return out;
  }

  /** {fn: isUrl|isEMail|isCurrencyExpression|splitCurrencyExpression|getProtocols, texts} -> results */
  static Object wordtokStatic(JsonNode a) throws Exception {
    String fn = a.get("fn").asText();
    WordTokenizer wt = new WordTokenizer();
    if (fn.equals("getProtocols")) return WordTokenizer.getProtocols();
    List<Object> results = new ArrayList<>();
    for (JsonNode t : a.get("texts")) {
      results.add(safe(() -> {
        String s = str(t);
        switch (fn) {
          case "isUrl": return WordTokenizer.isUrl(s);
          case "isEMail": return WordTokenizer.isEMail(s);
          case "isCurrencyExpression": return wt.isCurrencyExpression(s);
          case "splitCurrencyExpression": return wt.splitCurrencyExpression(s);
          default: throw new IllegalArgumentException("unknown fn: " + fn);
        }
      }));
    }
    return results;
  }
}
