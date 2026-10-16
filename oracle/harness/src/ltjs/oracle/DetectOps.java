package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.broker.ResourceDataBroker;
import org.languagetool.language.identifier.LanguageIdentifier;
import org.languagetool.language.identifier.LanguageIdentifierService;
import org.languagetool.language.identifier.detector.CommonWordsDetector;
import org.languagetool.language.identifier.detector.UnicodeBasedDetector;

import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Op lang-detect (X-LANGDETECT): language identification. Definition: docs/review/F18-oracle.md. */
final class DetectOps {
  private DetectOps() {}

  private static final Map<Integer, LanguageIdentifier> IDS = new HashMap<>();
  private static CommonWordsDetector common;
  private static Object checker; // real V2TextChecker (server step logic), created lazily

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

  private static List<String> strs(JsonNode n) {
    List<String> l = new ArrayList<>();
    if (n != null && !n.isNull()) for (JsonNode x : n) l.add(x.isNull() ? null : x.asText());
    return l;
  }

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  /** Fresh DefaultLanguageIdentifier (package-private ctor, no fastText/ngram), one per maxLength. */
  static LanguageIdentifier identifier(int maxLength) throws Exception {
    LanguageIdentifier li = IDS.get(maxLength);
    if (li == null) {
      Class<?> k = Class.forName("org.languagetool.language.identifier.DefaultLanguageIdentifier");
      Constructor<?> c = k.getDeclaredConstructor(int.class);
      c.setAccessible(true);
      try { li = (LanguageIdentifier) c.newInstance(maxLength); }
      catch (java.lang.reflect.InvocationTargetException e) { throw (Exception) e.getCause(); }
      IDS.put(maxLength, li);
    }
    return li;
  }

  private static LanguageIdentifier ident(JsonNode c) throws Exception {
    return identifier(c.has("maxLength") ? c.get("maxLength").asInt() : 1000);
  }

  static Map<String, Object> lang(Language l) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("code", l.getShortCodeWithCountryAndVariant());
    o.put("shortCode", l.getShortCode());
    o.put("name", l.getName());
    o.put("class", l.getClass().getName());
    o.put("spellcheckOnly", l.isSpellcheckOnlyLanguage());
    Language dv = l.getDefaultLanguageVariant();
    o.put("defaultVariant", dv == null ? null : dv.getShortCodeWithCountryAndVariant());
    return o;
  }

  static Object detected(DetectedLanguage d) {
    if (d == null) return null;
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("given", d.getGivenLanguage() == null ? null : d.getGivenLanguage().getShortCodeWithCountryAndVariant());
    o.put("detected", lang(d.getDetectedLanguage()));
    o.put("confidence", d.getDetectionConfidence());
    o.put("confidenceBits", Float.floatToRawIntBits(d.getDetectionConfidence()));
    o.put("source", d.getDetectionSource());
    return o;
  }

  private static String cleaned(LanguageIdentifier li, JsonNode c) {
    String t = c.get("text").asText();
    return c.has("clean") && !c.get("clean").asBoolean() ? t : li.cleanAndShortenText(t);
  }

  private static Object checker() throws Exception {
    if (checker == null) {
      Class<?> kc = Class.forName("org.languagetool.server.HTTPServerConfig");
      Constructor<?> cc = kc.getDeclaredConstructor(String[].class);
      cc.setAccessible(true);
      Object cfg = cc.newInstance((Object) new String[0]);
      Class<?> kr = Class.forName("org.languagetool.server.RequestCounter");
      Constructor<?> cr = kr.getDeclaredConstructor();
      cr.setAccessible(true);
      Class<?> kv = Class.forName("org.languagetool.server.V2TextChecker");
      Constructor<?> cv = kv.getDeclaredConstructor(kc, boolean.class, Queue.class, kr);
      cv.setAccessible(true);
      checker = cv.newInstance(cfg, false, new ArrayDeque<Runnable>(), cr.newInstance());
    }
    return checker;
  }

  // lang-detect {calls:[{fn, ...}]}
  static Object run(JsonNode a) {
    List<Object> res = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      String fn = c.get("fn").asText();
      res.add(safe(() -> {
        switch (fn) {
          case "clean": { // {text, maxLength}
            return ident(c).cleanAndShortenText(c.get("text").asText());
          }
          case "construct": { // {maxLength}: only the IllegalArgumentException matters
            identifier(c.get("maxLength").asInt());
            return "ok";
          }
          case "detect": { // {text, maxLength?, noop?, preferred?, force?, clean?}
            LanguageIdentifier li = ident(c);
            String t = cleaned(li, c);
            DetectedLanguage d = c.has("force") && !c.get("force").isNull()
              ? li.detectLanguage(t, strs(c.get("noop")), strs(c.get("preferred")), c.get("force").asBoolean())
              : li.detectLanguage(t, strs(c.get("noop")), strs(c.get("preferred")));
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("clean", t);
            o.put("result", detected(d));
            return o;
          }
          case "detect1": { // detectLanguage(String) -> Language
            LanguageIdentifier li = ident(c);
            Language l = li.detectLanguage(cleaned(li, c));
            return l == null ? null : lang(l);
          }
          case "scores": { // {text, count, noop?, preferred?, force?}
            LanguageIdentifier li = ident(c);
            String t = cleaned(li, c);
            List<Object> out = new ArrayList<>();
            for (DetectedLanguage d : li.getDetectedLanguageScores(t, strs(c.get("noop")), strs(c.get("preferred")), c.has("force") && c.get("force").asBoolean(), c.get("count").asInt())) out.add(detected(d));
            return out;
          }
          case "server": { // real V2TextChecker#detectLanguageOfString (explicit-language and auto requests alike)
            Object tc = checker();
            Method m = tc.getClass().getSuperclass().getDeclaredMethod("detectLanguageOfString", String.class, String.class, List.class, List.class, List.class, boolean.class);
            m.setAccessible(true);
            return detected((DetectedLanguage) m.invoke(tc, c.get("text").asText(), s(c, "fallback"), strs(c.get("variants")), strs(c.get("noop")), strs(c.get("preferred")), c.has("force") && c.get("force").asBoolean()));
          }
          case "unicode": { // {text, maxCheckLength?}
            UnicodeBasedDetector u = c.has("maxCheckLength") ? new UnicodeBasedDetector(c.get("maxCheckLength").asInt()) : new UnicodeBasedDetector();
            return u.getDominantLangCodes(c.get("text").asText());
          }
          case "common": { // {text} -> sorted [code, count] per Language object
            if (common == null) common = new CommonWordsDetector();
            Map<Language, Integer> m = common.getKnownWordsPerLanguage(c.get("text").asText());
            List<Object[]> rows = new ArrayList<>();
            for (Map.Entry<Language, Integer> e : m.entrySet()) rows.add(new Object[] {e.getKey().getShortCodeWithCountryAndVariant(), e.getValue()});
            rows.sort(Comparator.comparing(r -> (String) r[0]));
            List<Object> out = new ArrayList<>();
            for (Object[] r : rows) out.add(Arrays.asList(r));
            return out;
          }
          case "svc": { // {steps:[{fn,...}]} sequence on the LanguageIdentifierService singleton
            List<Object> out = new ArrayList<>();
            LanguageIdentifierService svc = LanguageIdentifierService.INSTANCE;
            for (JsonNode st : c.get("steps")) {
              String f = st.get("fn").asText();
              out.add(safe(() -> {
                switch (f) {
                  case "clear": svc.clearLanguageIdentifier(st.get("type").asText()); return "cleared";
                  case "getDefault": {
                    LanguageIdentifier li = svc.getDefaultLanguageIdentifier(st.get("maxLength").asInt(), null, null, null);
                    Map<String, Object> o = new LinkedHashMap<>();
                    o.put("class", li.getClass().getName());
                    o.put("sameAsBefore", li == lastDefault);
                    lastDefault = li;
                    o.put("cleanLenProbe", li.cleanAndShortenText("x".repeat(1200)).length());
                    return o;
                  }
                  case "getInitialized": { LanguageIdentifier li = svc.getInitialized(); return li == null ? null : li.getClass().getName(); }
                  case "canDetect": return svc.canLanguageBeDetected(s(st, "code"), strs(st.get("additional")));
                  case "langForShortCode": return lang(Languages.getLanguageForShortCode(s(st, "code"), strs(st.get("additional"))));
                  default: throw new IllegalArgumentException("bad svc fn " + f);
                }
              }));
            }
            return out;
          }
          default: throw new IllegalArgumentException("bad fn " + fn);
        }
      }));
    }
    return res;
  }

  private static LanguageIdentifier lastDefault;

  // lang-detect-resources {} -> what the identifier reads (porter info)
  static Object resources(JsonNode a) throws Exception {
    Map<String, Object> out = new LinkedHashMap<>();
    ResourceDataBroker db = JLanguageTool.getDataBroker();
    List<Object> langs = new ArrayList<>();
    for (Language l : Languages.get()) {
      Map<String, Object> o = new LinkedHashMap<>(lang(l));
      o.put("isVariant", l.isVariant());
      String p = l.getCommonWordsPath();
      o.put("commonWordsPath", p);
      boolean ex = p != null && db.resourceExists(p);
      o.put("commonWordsExists", ex);
      if (ex) {
        byte[] all;
        try (InputStream in = db.getFromResourceDirAsStream(p)) { all = in.readAllBytes(); }
        o.put("commonWordsBytes", all.length);
        o.put("commonWordsSha256", hex(MessageDigest.getInstance("SHA-256").digest(all)));
        int n = 0;
        for (String line : new String(all, StandardCharsets.UTF_8).split("\n", -1)) if (!line.isEmpty() && !line.startsWith("#")) n++;
        o.put("commonWordsEntries", n);
      }
      langs.add(o);
    }
    out.put("languages", langs);
    Class<?> k = Class.forName("org.languagetool.language.identifier.DefaultLanguageIdentifier");
    Method m = k.getDeclaredMethod("getLanguageCodes");
    m.setAccessible(true);
    @SuppressWarnings("unchecked") List<String> codes = (List<String>) m.invoke(null);
    out.put("profileCodes", codes);
    List<Object> prof = new ArrayList<>();
    for (String code : codes) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("code", code);
      java.net.URL u = Harness.class.getClassLoader().getResource("languages/" + code);
      o.put("resource", u == null ? null : u.toString().replaceAll("^jar:file:.*/", "jar:"));
      if (u != null) { try (InputStream in = u.openStream()) { byte[] b = in.readAllBytes(); o.put("bytes", b.length); o.put("sha256", hex(MessageDigest.getInstance("SHA-256").digest(b))); } }
      prof.add(o);
    }
    out.put("profiles", prof);
    List<Object> ext = new ArrayList<>();
    for (String e : new String[] {"eo", "crh"}) {
      String p = "/" + e + "/" + e + ".profile";
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("path", p);
      o.put("exists", db.resourceExists(p));
      if (db.resourceExists(p)) { try (InputStream in = db.getFromResourceDirAsStream(p)) { byte[] b = in.readAllBytes(); o.put("bytes", b.length); o.put("sha256", hex(MessageDigest.getInstance("SHA-256").digest(b))); } }
      ext.add(o);
    }
    out.put("externalProfiles", ext);
    return out;
  }

  private static String hex(byte[] b) { StringBuilder sb = new StringBuilder(); for (byte x : b) sb.append(String.format("%02x", x)); return sb.toString(); }
}
