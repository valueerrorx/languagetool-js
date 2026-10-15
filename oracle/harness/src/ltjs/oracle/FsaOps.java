package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import morfologik.fsa.*;
import morfologik.stemming.*;
import morfologik.stemming.Dictionary;
import org.languagetool.JLanguageTool;
import org.languagetool.tagging.MorfologikTagger;
import org.languagetool.tagging.TaggedWord;

import java.io.*;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

/** Ops for X-FSA: fsa-info, fsa-lookup, fsa-enum (morfologik-fsa/-stemming as used by MorfologikTagger, BaseSynthesizer, MorfologikSpeller). Format: docs/review/F08-oracle.md. */
final class FsaOps {
  private FsaOps() {}

  private static final Map<String, Dictionary> CACHE = new HashMap<>();

  private static String hex(byte[] b, int off, int len) {
    StringBuilder h = new StringBuilder();
    for (int i = off; i < off + len; i++) h.append(String.format("%02x", b[i] & 0xff));
    return h.toString();
  }

  /** Opens a dictionary like MorfologikSpeller#getDictionaryWithCaching; "info" (properties text, ISO-8859-1) overrides the .info file, "noInfo" copies the .dict alone to a temp dir. */
  static Dictionary open(JsonNode a) throws Exception {
    String dict = a.get("dict").asText();
    String info = a.has("info") ? a.get("info").asText() : null;
    boolean noInfo = a.has("noInfo") && a.get("noInfo").asBoolean();
    String key = dict + "\u0000" + info + "\u0000" + noInfo;
    Dictionary d = CACHE.get(key);
    if (d != null) return d;
    if (noInfo) {
      Path dir = Files.createTempDirectory("fsa");
      try (InputStream is = JLanguageTool.getDataBroker().getFromResourceDirAsStream(dict)) {
        Path p = dir.resolve("x.dict");
        Files.copy(is, p);
        d = Dictionary.read(p);
      }
    } else if (info != null) {
      try (InputStream is = JLanguageTool.getDataBroker().getFromResourceDirAsStream(dict)) {
        d = Dictionary.read(is, new ByteArrayInputStream(info.getBytes(StandardCharsets.ISO_8859_1)));
      }
    } else {
      URL url = JLanguageTool.getDataBroker().getFromResourceDirAsUrl(dict);
      d = Dictionary.read(url);
    }
    CACHE.put(key, d);
    return d;
  }

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    return e;
  }

  private static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (Throwable t) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", err(t)); return m; }
  }

  static Object info(JsonNode a) throws Exception {
    Dictionary d = open(a);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("dict", a.get("dict").asText());
    FSA fsa = d.fsa;
    out.put("fsaClass", fsa.getClass().getName());
    List<String> flags = new ArrayList<>();
    for (FSAFlags f : fsa.getFlags()) flags.add(f.name());
    out.put("flags", flags);
    out.put("flagBits", (int) FSAFlags.asShort(fsa.getFlags()));
    out.put("rootNode", fsa.getRootNode());
    // reachable nodes / arcs by DFS over the node graph
    Set<Integer> seen = new HashSet<>();
    Deque<Integer> stack = new ArrayDeque<>();
    long arcs = 0, finals = 0, terminals = 0;
    int maxArcs = 0;
    stack.push(fsa.getRootNode());
    seen.add(fsa.getRootNode());
    while (!stack.isEmpty()) {
      int node = stack.pop();
      int n = 0;
      for (int arc = fsa.getFirstArc(node); arc != 0; arc = fsa.getNextArc(arc)) {
        n++;
        if (fsa.isArcFinal(arc)) finals++;
        if (fsa.isArcTerminal(arc)) terminals++;
        else { int end = fsa.getEndNode(arc); if (seen.add(end)) stack.push(end); }
      }
      arcs += n;
      if (n > maxArcs) maxArcs = n;
    }
    out.put("reachableNodes", seen.size());
    out.put("arcs", arcs);
    out.put("finalArcs", finals);
    out.put("terminalArcs", terminals);
    out.put("maxArcsPerNode", maxArcs);
    out.put("rootArcCount", fsa.getArcCount(fsa.getRootNode()));
    out.put("sequenceCountFromNumbers", safe(() -> fsa.getFlags().contains(FSAFlags.NUMBERS) ? (Object) fsa.getRightLanguageCount(fsa.getRootNode()) : null));
    if (fsa instanceof CFSA2) {
      CFSA2 c = (CFSA2) fsa;
      out.put("version", (int) CFSA2.VERSION & 0xff);
      out.put("arcsLength", c.arcs.length);
      out.put("labelMapping", hex(c.labelMapping, 0, c.labelMapping.length));
    } else if (fsa instanceof FSA5) {
      FSA5 f = (FSA5) fsa;
      out.put("version", (int) FSA5.VERSION & 0xff);
      out.put("arcsLength", f.arcs.length);
      out.put("nodeDataLength", f.nodeDataLength);
      out.put("gtl", f.gtl);
      out.put("filler", (int) f.filler & 0xff);
      out.put("annotation", (int) f.annotation & 0xff);
    }
    DictionaryMetadata m = d.metadata;
    Map<String, Object> md = new LinkedHashMap<>();
    Map<String, Object> attrs = new LinkedHashMap<>();
    for (Map.Entry<DictionaryAttribute, String> e : m.getAttributes().entrySet()) attrs.put(e.getKey().propertyName, e.getValue());
    md.put("attributes", attrs);
    md.put("separator", (int) m.getSeparator() & 0xff);
    md.put("separatorChar", String.valueOf(m.getSeparatorAsChar()));
    md.put("encoding", m.getEncoding());
    md.put("locale", m.getLocale() == null ? null : m.getLocale().toString());
    md.put("encoderType", m.getSequenceEncoderType().name());
    md.put("frequencyIncluded", m.isFrequencyIncluded());
    md.put("ignoringPunctuation", m.isIgnoringPunctuation());
    md.put("ignoringNumbers", m.isIgnoringNumbers());
    md.put("ignoringCamelCase", m.isIgnoringCamelCase());
    md.put("ignoringAllUppercase", m.isIgnoringAllUppercase());
    md.put("ignoringDiacritics", m.isIgnoringDiacritics());
    md.put("convertingCase", m.isConvertingCase());
    md.put("supportingRunOnWords", m.isSupportingRunOnWords());
    md.put("inputConversionPairs", pairs(m.getInputConversionPairs()));
    md.put("outputConversionPairs", pairs(m.getOutputConversionPairs()));
    List<Object> rp = new ArrayList<>();
    for (Map.Entry<String, List<String>> e : m.getReplacementPairs().entrySet()) rp.add(Arrays.asList(e.getKey(), e.getValue()));
    md.put("replacementPairs", rp);
    List<Object> ec = new ArrayList<>();
    for (Map.Entry<Character, List<Character>> e : m.getEquivalentChars().entrySet()) {
      List<String> l = new ArrayList<>();
      for (Character c : e.getValue()) l.add(String.valueOf(c));
      ec.add(Arrays.asList(String.valueOf(e.getKey()), l));
    }
    md.put("equivalentChars", ec);
    out.put("metadata", md);
    return out;
  }

  private static List<Object> pairs(Map<String, String> m) {
    List<Object> l = new ArrayList<>();
    for (Map.Entry<String, String> e : m.entrySet()) l.add(Arrays.asList(e.getKey(), e.getValue()));
    return l;
  }

  private static String s(CharSequence c) { return c == null ? null : c.toString(); }

  /** fsa-lookup {dict, info?, words[], mode: lookup|tagger, keysFromTagger?: {dict}} -> {dict, words (the keys looked up), results[] aligned}. */
  static Object lookup(JsonNode a) throws Exception {
    Dictionary d = open(a);
    String mode = a.has("mode") ? a.get("mode").asText() : "lookup";
    List<String> words = new ArrayList<>();
    for (JsonNode w : a.get("words")) words.add(w.asText());
    if (a.has("keysFromTagger")) {
      // synthesizer keys "lemma|tag" built from the tagger readings of each word
      MorfologikTagger tg = new MorfologikTagger(a.get("keysFromTagger").get("dict").asText());
      LinkedHashSet<String> keys = new LinkedHashSet<>();
      for (String w : words) for (TaggedWord t : tg.tag(w)) if (t.getPosTag() != null) keys.add(t.getLemma() + "|" + t.getPosTag());
      words = new ArrayList<>(keys);
    }
    if (a.has("extraKeys")) for (JsonNode k : a.get("extraKeys")) words.add(k.asText());
    MorfologikTagger tagger = mode.equals("tagger") ? new MorfologikTagger(a.get("dict").asText()) : null;
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("dict", a.get("dict").asText());
    out.put("mode", mode);
    if (a.has("keysFromTagger")) out.put("words", words);
    List<Object> results = new ArrayList<>();
    for (String w : words) {
      try {
        List<Object> r = new ArrayList<>();
        if (tagger != null) {
          for (TaggedWord t : tagger.tag(w)) r.add(Arrays.asList(t.getLemma(), t.getPosTag()));
        } else {
          for (WordData wd : new DictionaryLookup(d).lookup(w)) r.add(Arrays.asList(s(wd.getWord()), s(wd.getStem()), s(wd.getTag())));
        }
        results.add(r);
      } catch (Throwable t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", err(t));
        results.add(m);
      }
    }
    out.put("results", results);
    return out;
  }

  /**
   * fsa-enum {dict, info?, mode: fsa|lookup}. fsa: FSA.iterator() over all byte sequences; digest = SHA-256 of (4-byte big-endian length + bytes) per sequence.
   * lookup: DictionaryLookup.iterator(); digest over "word TAB stem TAB tag LF" (UTF-8, null as "\u0000null").
   */
  static Object enumerate(JsonNode a) throws Exception {
    Dictionary d = open(a);
    String mode = a.has("mode") ? a.get("mode").asText() : "fsa";
    Charset cs = Charset.forName(d.metadata.getEncoding());
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    long count = 0;
    int maxLen = 0;
    List<Object> first = new ArrayList<>();
    ArrayDeque<Object> last = new ArrayDeque<>();
    Object error = null;
    try {
      if (mode.equals("fsa")) {
        for (ByteBuffer bb : d.fsa) {
          byte[] b = new byte[bb.remaining()];
          bb.duplicate().get(b);
          md.update(new byte[] {(byte) (b.length >>> 24), (byte) (b.length >>> 16), (byte) (b.length >>> 8), (byte) b.length});
          md.update(b);
          count++;
          if (b.length > maxLen) maxLen = b.length;
          Map<String, Object> e = new LinkedHashMap<>();
          e.put("hex", hex(b, 0, b.length));
          e.put("text", new String(b, cs));
          if (first.size() < 100) first.add(e);
          last.addLast(e);
          if (last.size() > 100) last.removeFirst();
        }
      } else {
        for (WordData wd : new DictionaryLookup(d)) {
          String w = s(wd.getWord()), st = s(wd.getStem()), tg = s(wd.getTag());
          String line = (w == null ? "\u0000null" : w) + "\t" + (st == null ? "\u0000null" : st) + "\t" + (tg == null ? "\u0000null" : tg) + "\n";
          md.update(line.getBytes(StandardCharsets.UTF_8));
          count++;
          List<Object> e = Arrays.asList(w, st, tg);
          if (first.size() < 100) first.add(e);
          last.addLast(e);
          if (last.size() > 100) last.removeFirst();
        }
      }
    } catch (Throwable t) {
      error = err(t);
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("dict", a.get("dict").asText());
    out.put("mode", mode);
    out.put("count", count);
    out.put("maxLength", maxLen);
    out.put("sha256", hex(md.digest(), 0, 32));
    out.put("error", error);
    out.put("first100", first);
    out.put("last100", new ArrayList<>(last));
    return out;
  }
}
