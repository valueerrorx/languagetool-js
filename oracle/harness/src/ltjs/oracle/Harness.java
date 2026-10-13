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

  public static void main(String[] args) throws Exception {
    PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), false, "UTF-8");
    System.setOut(System.err); // stray prints must not corrupt the protocol
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    String line;
    while ((line = in.readLine()) != null) {
      if (line.isEmpty()) continue;
      Map<String, Object> resp = new LinkedHashMap<>();
      try {
        JsonNode req = MAPPER.readTree(line);
        if (req.has("id")) resp.put("id", MAPPER.treeToValue(req.get("id"), Object.class));
        String op = req.get("op").asText();
        JsonNode a = req.has("args") ? req.get("args") : MAPPER.createObjectNode();
        Object result = dispatch(op, a);
        resp.put("ok", true);
        resp.put("result", result);
      } catch (Throwable t) {
        resp.put("ok", false);
        resp.put("error", error(t));
      }
      out.print(MAPPER.writeValueAsString(resp));
      out.print('\n');
      out.flush();
    }
  }

  private static Object dispatch(String op, JsonNode a) {
    switch (op) {
      case "probe": return probe();
      case "X-LANGUAGES": return languages();
      case "num-tostring": return numToString(a);
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
