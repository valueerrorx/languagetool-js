package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.languagetool.Language;
import org.languagetool.Languages;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Long-lived oracle driver: one JSON request per stdin line, one JSON response per stdout line. */
public class Harness {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  // probe ops: ASCII-only output so lone surrogates and odd separators survive the UTF-8 pipe
  private static final ObjectMapper PROBE_MAPPER = new ObjectMapper()
      .configure(com.fasterxml.jackson.core.JsonGenerator.Feature.ESCAPE_NON_ASCII, true);

  public static void main(String[] args) throws Exception {
    PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), false, "UTF-8");
    System.setOut(System.err); // stray prints must not corrupt the protocol
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    String line;
    while ((line = in.readLine()) != null) {
      if (line.isEmpty()) continue;
      Map<String, Object> resp = new LinkedHashMap<>();
      ObjectMapper writer = MAPPER;
      try {
        JsonNode req = MAPPER.readTree(line);
        if (req.has("id")) resp.put("id", MAPPER.treeToValue(req.get("id"), Object.class));
        String op = req.get("op").asText();
        if (op.startsWith("probe-") || op.equals("unicode-dump") || op.equals("locale-dump") || op.startsWith("regex") || op.startsWith("i18n-") || op.equals("sax-dump") || op.equals("xml-validate") || op.startsWith("fsa-") || op.equals("annotated-text") || op.equals("string-tools") || op.equals("context-tools") || op.equals("analyzed-token") || op.startsWith("lang-") || op.startsWith("srx-") || op.equals("sentence-tokenize") || op.equals("word-tokenize") || op.equals("wordtok-static") || op.equals("tag") || op.equals("wordsplit") || op.equals("manual-tagger") || op.equals("check2") || op.equals("active-rules") || op.equals("lt-api") || op.equals("analyze-raw") || op.equals("check-rules") || op.equals("json-serialize") || op.startsWith("lang-detect")) writer = PROBE_MAPPER;
        JsonNode a = req.has("args") ? req.get("args") : MAPPER.createObjectNode();
        Object result = dispatch(op, a);
        resp.put("ok", true);
        resp.put("result", result);
      } catch (Throwable t) {
        resp.put("ok", false);
        resp.put("error", error(t));
      }
      out.print(writer.writeValueAsString(resp));
      out.print('\n');
      out.flush();
    }
  }

  private static Object dispatch(String op, JsonNode a) throws Exception {
    switch (op) {
      case "probe": return probe();
      case "X-LANGUAGES": return languages();
      case "num-tostring": return numToString(a);
      case "probe-numbers": return ProbeNumbers.run(a);
      case "probe-strings": return ProbeStrings.run(a);
      case "probe-format": return ProbeFormat.run(a);
      case "unicode-dump": return UnicodeDump.run(a);
      case "locale-dump": return LocaleDump.run(a);
      case "probe-collections": return ProbeCollections.run(a);
      case "regex": return RegexOps.regex(a);
      case "regex-harvest": return RegexOps.harvest(a);
      case "i18n-bundle": return I18nOps.bundleDump(a);
      case "i18n-format": return I18nOps.format(a);
      case "i18n-buildinfo": return I18nOps.buildInfo(a);
      case "sax-dump": return XmlOps.saxDump(a);
      case "xml-validate": return XmlOps.validate(a);
      case "fsa-info": return FsaOps.info(a);
      case "fsa-lookup": return FsaOps.lookup(a);
      case "fsa-enum": return FsaOps.enumerate(a);
      case "annotated-text": return TextOps.annotatedText(a);
      case "string-tools": return TextOps.stringTools(a);
      case "context-tools": return TextOps.contextTools(a);
      case "analyzed-token": return TextOps.analyzedToken(a);
      case "sentence-tokenize": return SrxOps.sentenceTokenize(a);
      case "srx-segment": return SrxOps.srxSegment(a);
      case "srx-rules": return SrxOps.srxRules(a);
      case "word-tokenize": return WordTokOps.wordTokenize(a);
      case "wordtok-static": return WordTokOps.wordtokStatic(a);
      case "tag": return TagOps.tag(a);
      case "wordsplit": return WordSplitOps.wordsplit(a);
      case "manual-tagger": return TagOps.manualTagger(a);
      case "lang-lookup": return LangOps.lookup(a);
      case "lang-describe": return LangOps.describeOp(a);
      case "lang-dynamic": return LangOps.dynamic(a);
      case "check2": return CheckPipeOps.check2(a);
      case "active-rules": return CheckPipeOps.activeRules(a);
      case "lt-api": return CheckPipeOps.ltApi(a);
      case "analyze-raw": return CheckPipeOps.analyzeRaw(a);
      case "json-serialize": return JsonOps.jsonSerialize(a);
      case "check-rules": return CheckPipeOps.checkRules(a);
      case "lang-priority": return MetaOps.priority(a);
      case "lang-filter": return MetaOps.filter(a);
      case "lang-typo": return MetaOps.typo(a);
      case "lang-statics": return MetaOps.statics(a);
      case "lang-detect": return DetectOps.run(a);
      case "lang-detect-resources": return DetectOps.resources(a);
      case "check": return ContentOps.check(a);
      case "analyze": return ContentOps.analyze(a);
      case "rules-list": return ContentOps.rulesList(a);
      case "rule-examples": return ContentOps.ruleExamples(a);
      case "disambiguation-examples": return ContentOps.disambiguationExamples(a);
      default: throw new IllegalArgumentException("unknown op: " + op);
    }
  }

  private static Map<String, Object> error(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    List<Object> causes = new ArrayList<>();
    for (Throwable c = t.getCause(); c != null && causes.size() < 20; c = c.getCause()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("class", c.getClass().getName());
      m.put("message", c.getMessage());
      causes.add(m);
    }
    e.put("causes", causes);
    return e;
  }

  private static Object probe() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("java.version", System.getProperty("java.version"));
    m.put("java.vendor", System.getProperty("java.vendor"));
    m.put("defaultLocale", java.util.Locale.getDefault().toString());
    m.put("user.language", System.getProperty("user.language"));
    m.put("user.country", System.getProperty("user.country"));
    m.put("timeZone", TimeZone.getDefault().getID());
    m.put("file.encoding", System.getProperty("file.encoding"));
    m.put("native.encoding", System.getProperty("native.encoding"));
    m.put("sun.jnu.encoding", System.getProperty("sun.jnu.encoding"));
    m.put("defaultCharset", java.nio.charset.Charset.defaultCharset().name());
    m.put("line.separator", System.getProperty("line.separator"));
    m.put("user.dir", System.getProperty("user.dir"));
    m.put("java.io.tmpdir", System.getProperty("java.io.tmpdir"));
    long now = System.currentTimeMillis();
    long nowMin = now / 60000L * 60000L; // truncated to the minute: deterministic under the fixed clock
    m.put("currentTimeMillisMinute", nowMin);
    m.put("date", new Date(nowMin).toString());
    Calendar c = Calendar.getInstance();
    m.put("calendar", c.get(Calendar.YEAR) + "-" + (c.get(Calendar.MONTH) + 1) + "-" + c.get(Calendar.DAY_OF_MONTH)
        + " " + c.get(Calendar.HOUR_OF_DAY) + ":" + c.get(Calendar.MINUTE));
    m.put("instantNow", java.time.Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES).toString());
    m.put("zonedNow", java.time.ZonedDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES).toString());
    return m;
  }

  private static Object languages() {
    List<Object> list = new ArrayList<>();
    for (Language l : Languages.get()) {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("shortCode", l.getShortCode());
      m.put("shortCodeWithCountryAndVariant", l.getShortCodeWithCountryAndVariant());
      m.put("name", l.getName());
      m.put("class", l.getClass().getName());
      list.add(m);
    }
    return list;
  }

  /** args: {kind:"double"|"float", bits:["0x..."]} -> [{bits,text}] */
  private static Object numToString(JsonNode a) {
    boolean isFloat = "float".equals(a.get("kind").asText());
    List<Object> res = new ArrayList<>();
    for (JsonNode b : a.get("bits")) {
      String hex = b.asText();
      long v = Long.parseUnsignedLong(hex.substring(2), 16);
      Map<String, Object> m = new LinkedHashMap<>();
      if (isFloat) {
        float f = Float.intBitsToFloat((int) v);
        m.put("bits", String.format("0x%08x", Float.floatToRawIntBits(f)));
        m.put("text", Float.toString(f));
      } else {
        double d = Double.longBitsToDouble(v);
        m.put("bits", String.format("0x%016x", Double.doubleToRawLongBits(d)));
        m.put("text", Double.toString(d));
      }
      res.add(m);
    }
    return res;
  }
}
