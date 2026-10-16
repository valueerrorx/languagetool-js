package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import de.danielnaber.jwordsplitter.GermanWordSplitter;
import org.languagetool.language.German;
import org.languagetool.tokenizers.Tokenizer;
import org.languagetool.tokenizers.de.GermanCompoundTokenizer;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Op for X-WORDSPLIT: wordsplit. Format: docs/review/F23-oracle.md. */
final class WordSplitOps {
  private WordSplitOps() {}

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

  /**
   * {impl, method?, words:[string|null], hide?, strict?, min?, max?, exceptions?, customWords?, fileContent?}
   * impl: tok-strict | tok-nonstrict | tok-ctor-strict | tok-ctor-nonstrict | tok-default | german-strict | german-nonstrict | ws | identity | main
   * ws methods: splitWord | splitWordSub | getAllSplits | getSubWords
   */
  static Object wordsplit(JsonNode a) throws Exception {
    String impl = a.get("impl").asText();
    if (impl.equals("identity")) return identity();
    if (impl.equals("main")) return main(a);
    List<Object> results = new ArrayList<>();
    if (impl.equals("ws")) {
      GermanWordSplitter ws;
      if (a.has("customWords")) {
        Set<String> cw = new LinkedHashSet<>();
        for (JsonNode w : a.get("customWords")) cw.add(w.asText());
        ws = new GermanWordSplitter(a.has("hide") && a.get("hide").asBoolean(), cw);
      } else {
        ws = new GermanWordSplitter(a.has("hide") && a.get("hide").asBoolean());
      }
      if (a.has("strict")) ws.setStrictMode(a.get("strict").asBoolean());
      if (a.has("min")) ws.setMinimumWordLength(a.get("min").asInt());
      if (a.has("max")) ws.setMaximumWordLength(a.get("max").asInt());
      if (a.has("exceptions")) {
        Iterator<Map.Entry<String, JsonNode>> it = a.get("exceptions").fields();
        while (it.hasNext()) {
          Map.Entry<String, JsonNode> e = it.next();
          List<String> parts = new ArrayList<>();
          for (JsonNode p : e.getValue()) parts.add(p.asText());
          ws.addException(e.getKey(), parts);
        }
      }
      String method = a.has("method") ? a.get("method").asText() : "splitWord";
      for (JsonNode w : a.get("words")) {
        String s = str(w);
        results.add(safe(() -> {
          switch (method) {
            case "splitWord": return ws.splitWord(s);
            case "splitWordSub": return ws.splitWord(s, true);
            case "getAllSplits": return ws.getAllSplits(s);
            case "getSubWords": return ws.getSubWords(s);
            default: throw new IllegalArgumentException("unknown method: " + method);
          }
        }));
      }
      return results;
    }
    Tokenizer tok;
    switch (impl) {
      case "tok-strict": tok = GermanCompoundTokenizer.getStrictInstance(); break;
      case "tok-nonstrict": tok = GermanCompoundTokenizer.getNonStrictInstance(); break;
      case "tok-ctor-strict": tok = new GermanCompoundTokenizer(true); break;
      case "tok-ctor-nonstrict": tok = new GermanCompoundTokenizer(false); break;
      case "tok-default": tok = new GermanCompoundTokenizer(); break;
      case "german-strict": { GermanCompoundTokenizer t = new German().getStrictCompoundTokenizer(); tok = t; break; }
      case "german-nonstrict": { org.languagetool.tokenizers.CompoundWordTokenizer t = new German().getNonStrictCompoundSplitter(); tok = w -> t.tokenize(w); break; }
      default: throw new IllegalArgumentException("unknown impl: " + impl);
    }
    final Tokenizer ftok = tok;
    for (JsonNode w : a.get("words")) {
      String s = str(w);
      results.add(safe(() -> ftok.tokenize(s)));
    }
    return results;
  }

  private static Object identity() throws Exception {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("strictSame", GermanCompoundTokenizer.getStrictInstance() == GermanCompoundTokenizer.getStrictInstance());
    m.put("nonStrictSame", GermanCompoundTokenizer.getNonStrictInstance() == GermanCompoundTokenizer.getNonStrictInstance());
    m.put("strictNotNonStrict", GermanCompoundTokenizer.getStrictInstance() != GermanCompoundTokenizer.getNonStrictInstance());
    m.put("ctorNotInstance", new GermanCompoundTokenizer(true) != GermanCompoundTokenizer.getStrictInstance());
    German g = new German();
    m.put("germanStrictIsInstance", g.getStrictCompoundTokenizer() == GermanCompoundTokenizer.getStrictInstance());
    List<String> r1 = g.getNonStrictCompoundSplitter().tokenize("Haustür");
    List<String> r2 = g.getNonStrictCompoundSplitter().tokenize("Haustür");
    m.put("nonStrictResultFresh", r1 != r2);
    m.put("nonStrictResult", r1);
    return m;
  }

  /** {words, fileContent?, useFile?}: GermanCompoundTokenizer.main with captured stdout; no-arg case is not runnable (System.exit). */
  private static Object main(JsonNode a) throws Exception {
    List<String> args = new ArrayList<>();
    Path file = null;
    if (a.has("fileContent")) {
      file = Files.createTempFile("wordsplit", ".txt");
      Files.write(file, a.get("fileContent").asText().getBytes(StandardCharsets.UTF_8));
      args.add(file.toString());
    }
    for (JsonNode w : a.get("words")) args.add(w.asText());
    PrintStream old = System.out;
    ByteArrayOutputStream bo = new ByteArrayOutputStream();
    Map<String, Object> m = new LinkedHashMap<>();
    try {
      System.setOut(new PrintStream(bo, true, "UTF-8"));
      GermanCompoundTokenizer.main(args.toArray(new String[0]));
    } catch (Throwable t) {
      m.put("error", err(t).get("error"));
    } finally {
      System.setOut(old);
    }
    String out = new String(bo.toByteArray(), StandardCharsets.UTF_8);
    if (file != null) { out = out.replace(file.toString(), "<FILE>"); Files.delete(file); }
    m.put("stdout", out);
    return m;
  }
}
