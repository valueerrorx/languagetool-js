package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.ChunkTag;
import org.languagetool.markup.AnnotatedText;
import org.languagetool.markup.AnnotatedTextBuilder;
import org.languagetool.markup.TextPart;
import org.languagetool.tools.ContextTools;
import org.languagetool.tools.StringTools;

import java.io.*;
import java.lang.reflect.*;
import java.util.*;

/** Ops for X-TEXT: annotated-text, string-tools, context-tools, analyzed-token. Format: docs/review/F09-oracle.md. */
final class TextOps {
  private TextOps() {}

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("error", e);
    return m;
  }

  private static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (InvocationTargetException t) { return err(t.getCause()); } catch (Throwable t) { return err(t); }
  }

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  // ---- annotated-text: {parts:[{t:text|markup|meta|add}], positions?:[int], customKeys?:[str]}
  static Object annotatedText(JsonNode a) throws Exception {
    AnnotatedTextBuilder b = new AnnotatedTextBuilder();
    List<Object> buildErrors = new ArrayList<>();
    for (JsonNode p : a.get("parts")) {
      String t = p.get("t").asText();
      switch (t) {
        case "text": b.addText(str(p.get("v"))); break;
        case "markup":
          if (p.has("interpretAs")) b.addMarkup(str(p.get("v")), str(p.get("interpretAs"))); else b.addMarkup(str(p.get("v")));
          break;
        case "meta": { // like ApiV2: known enum key else custom key
          String key = p.get("key").asText();
          try { b.addGlobalMetaData(AnnotatedText.MetaDataKey.valueOf(key), str(p.get("value"))); }
          catch (IllegalArgumentException e) { b.addGlobalMetaData(key, str(p.get("value"))); }
          break;
        }
        case "customMeta": b.addGlobalMetaData(p.get("key").asText(), str(p.get("value"))); break;
        case "add": { // add(TextPart); constructor is package-private
          Constructor<TextPart> c = TextPart.class.getDeclaredConstructor(String.class, TextPart.Type.class);
          c.setAccessible(true);
          b.add(c.newInstance(str(p.get("v")), TextPart.Type.valueOf(p.get("type").asText())));
          break;
        }
        default: throw new IllegalArgumentException("bad part " + t);
      }
    }
    AnnotatedText at = b.build();
    Map<String, Object> o = new LinkedHashMap<>();
    String plain = at.getPlainText();
    o.put("plainText", plain);
    o.put("textWithMarkup", at.getTextWithMarkup());
    o.put("originalText", at.getOriginalText());
    o.put("toString", at.toString());
    List<Object> parts = new ArrayList<>();
    for (TextPart p : at.getParts()) { List<Object> x = new ArrayList<>(); x.add(p.getType().name()); x.add(p.getPart()); parts.add(x); }
    o.put("parts", parts);
    List<Integer> positions = new ArrayList<>();
    if (a.has("positions")) { for (JsonNode n : a.get("positions")) positions.add(n.asInt()); }
    else { positions.add(-1); for (int i = 0; i <= plain.length() + 1; i++) positions.add(i); }
    List<Object> pos = new ArrayList<>();
    for (int i : positions) {
      final int ii = i;
      List<Object> row = new ArrayList<>();
      row.add(i);
      row.add(safe(() -> at.getOriginalTextPositionFor(ii, false)));
      row.add(safe(() -> at.getOriginalTextPositionFor(ii, true)));
      pos.add(row);
    }
    o.put("positions", pos); // [pos, from, to]
    Map<String, Object> meta = new LinkedHashMap<>();
    for (AnnotatedText.MetaDataKey k : AnnotatedText.MetaDataKey.values()) meta.put(k.name(), at.getGlobalMetaData(k, "<default>"));
    o.put("metaData", meta);
    Map<String, Object> cm = new LinkedHashMap<>();
    if (a.has("customKeys")) for (JsonNode k : a.get("customKeys")) cm.put(k.asText(), at.getGlobalMetaData(k.asText(), "<default>"));
    o.put("customMetaData", cm);
    Map<String, Object> all = new TreeMap<>();
    for (Map.Entry<AnnotatedText.MetaDataKey, String> e : at.getGlobalMetaData().entrySet()) all.put(e.getKey().name(), e.getValue());
    o.put("globalMetaDataMap", all);
    o.put("customMetaDataMap", new TreeMap<>(at.getCustomMetaData()));
    return o;
  }

  // ---- context-tools: {calls:[{from,to,text,contextSize?,escapeHtml?,markerStart?,markerEnd?,marker?:[s,e]}]}
  static Object contextTools(JsonNode a) {
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      out.add(safe(() -> {
        ContextTools ct = new ContextTools();
        if (c.has("contextSize")) ct.setContextSize(c.get("contextSize").asInt());
        if (c.has("escapeHtml")) ct.setEscapeHtml(c.get("escapeHtml").asBoolean());
        if (c.has("marker")) ct.setErrorMarker(str(c.get("marker").get(0)), str(c.get("marker").get(1)));
        if (c.has("markerStart")) ct.setErrorMarkerStart(str(c.get("markerStart")));
        if (c.has("markerEnd")) ct.setErrorMarkerEnd(str(c.get("markerEnd")));
        int from = c.get("from").asInt(), to = c.get("to").asInt();
        String text = str(c.get("text"));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("context", safe(() -> ct.getContext(from, to, text)));
        r.put("plain", safe(() -> ct.getPlainTextContext(from, to, text)));
        return r;
      }));
    }
    return out;
  }

  // ---- string-tools: {calls:[{fn, args:[...]}]}; arg JSON: string/null, int, bool, array of strings (List), {lang}, {bytesHex,encoding?} (InputStream), {reader} (Reader), {char}
  private static boolean fits(Class<?> pt, JsonNode n) {
    if (n.isNull()) return !pt.isPrimitive();
    if (n.isTextual()) return pt == String.class || pt == CharSequence.class;
    if (n.isInt() || n.isLong()) return pt == int.class || pt == long.class;
    if (n.isBoolean()) return pt == boolean.class;
    if (n.isArray()) return pt == List.class;
    if (n.isObject()) {
      if (n.has("lang")) return pt == Language.class;
      if (n.has("bytesHex")) return pt == InputStream.class;
      if (n.has("reader")) return pt == Reader.class;
      if (n.has("char")) return pt == char.class;
    }
    return false;
  }

  private static Object conv(Class<?> pt, JsonNode n) {
    if (n.isNull()) return null;
    if (pt == String.class || pt == CharSequence.class) return n.asText();
    if (pt == int.class) return n.asInt();
    if (pt == long.class) return n.asLong();
    if (pt == boolean.class) return n.asBoolean();
    if (pt == List.class) { List<String> l = new ArrayList<>(); for (JsonNode x : n) l.add(x.isNull() ? null : x.asText()); return l; }
    if (pt == Language.class) return Languages.getLanguageForShortCode(n.get("lang").asText());
    if (pt == InputStream.class) {
      String h = n.get("bytesHex").asText();
      byte[] b = new byte[h.length() / 2];
      for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
      return new ByteArrayInputStream(b);
    }
    if (pt == Reader.class) return new StringReader(n.get("reader").asText());
    if (pt == char.class) return n.get("char").asText().charAt(0);
    throw new IllegalArgumentException("arg");
  }

  private static Object norm(Object r) {
    if (r instanceof Object[]) return Arrays.asList((Object[]) r);
    if (r instanceof Enum) return ((Enum<?>) r).name();
    return r;
  }

  static Object stringTools(JsonNode a) {
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      out.add(safe(() -> {
        String fn = c.get("fn").asText();
        if (fn.equals("ApiPrintMode.values")) {
          List<Object> l = new ArrayList<>();
          for (StringTools.ApiPrintMode m : StringTools.ApiPrintMode.values()) { l.add(m.name()); l.add(m.ordinal()); l.add(m.toString()); }
          return l;
        }
        if (fn.equals("UPPERCASE_GREEK_LETTERS")) return new TreeSet<>(StringTools.UPPERCASE_GREEK_LETTERS);
        if (fn.equals("LOWERCASE_GREEK_LETTERS")) return new TreeSet<>(StringTools.LOWERCASE_GREEK_LETTERS);
        JsonNode args = c.get("args");
        Method found = null;
        for (Method m : StringTools.class.getMethods()) {
          if (!m.getName().equals(fn) || m.getParameterCount() != args.size() || !Modifier.isStatic(m.getModifiers())) continue;
          boolean ok = true;
          for (int i = 0; i < args.size(); i++) if (!fits(m.getParameterTypes()[i], args.get(i))) { ok = false; break; }
          if (ok) { found = m; break; }
        }
        if (found == null) throw new IllegalArgumentException("no method " + fn + "/" + args.size());
        Object[] av = new Object[args.size()];
        for (int i = 0; i < av.length; i++) av[i] = conv(found.getParameterTypes()[i], args.get(i));
        return norm(found.invoke(null, av));
      }));
    }
    return out;
  }

  // ---- analyzed-token
  private static AnalyzedTokenReadings readings(JsonNode t, int pos) {
    List<AnalyzedToken> l = new ArrayList<>();
    String tok = str(t.get("token"));
    if (t.has("readings")) for (JsonNode r : t.get("readings")) l.add(new AnalyzedToken(tok, str(r.get(0)), str(r.get(1))));
    AnalyzedTokenReadings atr = new AnalyzedTokenReadings(l, t.has("startPos") ? t.get("startPos").asInt() : pos);
    if (t.has("chunkTags")) { List<ChunkTag> ct = new ArrayList<>(); for (JsonNode x : t.get("chunkTags")) ct.add(new ChunkTag(x.asText())); atr.setChunkTags(ct); }
    if (t.has("whitespaceBefore")) atr.setWhitespaceBefore(t.get("whitespaceBefore").asText());
    if (t.has("sentEnd") && t.get("sentEnd").asBoolean()) atr.setSentEnd();
    if (t.has("paraEnd") && t.get("paraEnd").asBoolean()) atr.setParagraphEnd();
    if (t.has("immunize")) atr.immunize(t.get("immunize").asInt());
    return atr;
  }

  private static Map<String, Object> tokenInfo(AnalyzedTokenReadings t) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("toString", t.toString());
    o.put("token", t.getToken());
    o.put("startPos", t.getStartPos());
    o.put("endPos", t.getEndPos());
    o.put("isWhitespace", t.isWhitespace());
    o.put("isLinebreak", t.isLinebreak());
    o.put("isSentStart", t.isSentenceStart());
    o.put("isSentEnd", t.isSentenceEnd());
    o.put("isParaEnd", t.isParagraphEnd());
    o.put("isTagged", t.isTagged());
    o.put("isWhitespaceBefore", t.isWhitespaceBefore());
    o.put("whitespaceBefore", t.getWhitespaceBefore());
    o.put("cleanToken", t.getCleanToken());
    o.put("isImmunized", t.isImmunized());
    o.put("isIgnoredBySpeller", t.isIgnoredBySpeller());
    List<Object> rs = new ArrayList<>();
    for (AnalyzedToken r : t.getReadings()) rs.add(Arrays.asList(r.getToken(), r.getPOSTag(), r.getLemma(), r.toString()));
    o.put("readings", rs);
    List<Object> cts = new ArrayList<>();
    for (ChunkTag c : t.getChunkTags()) cts.add(c.getChunkTag());
    o.put("chunkTags", cts);
    return o;
  }

  private static Map<String, Object> sentenceInfo(AnalyzedSentence s) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("toString", s.toString());
    o.put("toStringSemicolon", s.toString(";"));
    o.put("toShortString", s.toShortString(","));
    o.put("text", s.getText());
    o.put("annotations", s.getAnnotations());
    o.put("nonWhitespaceTokenCount", s.getNonWhitespaceTokenCount());
    List<Object> ts = new ArrayList<>();
    for (AnalyzedTokenReadings t : s.getTokens()) ts.add(tokenInfo(t));
    o.put("tokens", ts);
    o.put("lemmaSet", new TreeSet<>(s.getLemmaSet()));
    return o;
  }

  /** modes: tagger {lang,text} (CommandLineTools#tagText), synthetic {tokens:[...]}, token {token,pos,lemma,whitespaceBefore?} */
  static Object analyzedToken(JsonNode a) throws Exception {
    String mode = a.get("mode").asText();
    if (mode.equals("tagger")) {
      JLanguageTool lt = ContentOps.tool(a);
      List<Object> out = new ArrayList<>();
      for (String sentence : lt.sentenceTokenize(a.get("text").asText())) out.add(sentenceInfo(lt.getAnalyzedSentence(sentence)));
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("sentences", out);
      return o;
    }
    if (mode.equals("synthetic")) {
      List<AnalyzedTokenReadings> l = new ArrayList<>();
      int pos = 0;
      for (JsonNode t : a.get("tokens")) { AnalyzedTokenReadings r = readings(t, pos); l.add(r); pos += t.get("token").asText().length(); }
      AnalyzedSentence s = new AnalyzedSentence(l.toArray(new AnalyzedTokenReadings[0]));
      return sentenceInfo(s);
    }
    if (mode.equals("token")) {
      AnalyzedToken t = new AnalyzedToken(str(a.get("token")), str(a.get("pos")), str(a.get("lemma")));
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("toString", t.toString());
      o.put("posTag", t.getPOSTag());
      o.put("lemma", t.getLemma());
      o.put("matches", t.matches(new AnalyzedToken(str(a.get("token")), str(a.get("pos")), str(a.get("lemma")))));
      return o;
    }
    throw new IllegalArgumentException("mode");
  }
}
