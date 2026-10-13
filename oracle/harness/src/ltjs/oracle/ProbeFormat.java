package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.MessageFormat;
import java.text.NumberFormat;
import java.text.ParsePosition;
import java.util.*;

/** X-PROBE-FORMAT: String.format / MessageFormat / DecimalFormat / NumberFormat. */
final class ProbeFormat {
  private ProbeFormat() {}

  static Object run(JsonNode a) throws Exception {
    String fn = a.get("fn").asText();
    switch (fn) {
      case "format": return format(a);
      case "formatNoLocale": return Probe.units2(String.format(Probe.str(a, "fmt"), Probe.typedArray(a.get("args"))));
      case "messageFormat": return messageFormat(a);
      case "messageFormatStatic": return Probe.units2(MessageFormat.format(Probe.str(a, "pattern"), Probe.typedArray(a.get("args"))));
      case "decimalFormat": return decimalFormat(a);
      case "numberFormat": return numberFormat(a);
      case "parse": return parse(a);
      case "symbols": return symbols(a);
      case "toStringConcat": return Probe.units2("" + Probe.typed(a.get("v")));
      default: throw new IllegalArgumentException("unknown fn: " + fn);
    }
  }

  private static Object format(JsonNode a) {
    Locale loc = Probe.locale(Probe.str(a, "locale"));
    return Probe.units2(String.format(loc, Probe.str(a, "fmt"), Probe.typedArray(a.get("args"))));
  }

  private static Object messageFormat(JsonNode a) {
    Locale loc = Probe.locale(Probe.str(a, "locale"));
    MessageFormat mf = new MessageFormat(Probe.str(a, "pattern"), loc);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("result", Probe.units2(mf.format(Probe.typedArray(a.get("args")))));
    m.put("toPattern", mf.toPattern());
    return m;
  }

  private static NumberFormat build(JsonNode a) {
    Locale loc = Probe.locale(Probe.str(a, "locale"));
    String kind = a.has("kind") ? a.get("kind").asText() : "pattern";
    NumberFormat nf;
    switch (kind) {
      case "pattern": nf = new DecimalFormat(a.get("pattern").asText(), DecimalFormatSymbols.getInstance(loc)); break;
      case "patternNoSymbols": nf = new DecimalFormat(a.get("pattern").asText()); break;
      case "number": nf = NumberFormat.getNumberInstance(loc); break;
      case "instance": nf = NumberFormat.getInstance(loc); break;
      case "integer": nf = NumberFormat.getIntegerInstance(loc); break;
      case "percent": nf = NumberFormat.getPercentInstance(loc); break;
      case "currency": nf = NumberFormat.getCurrencyInstance(loc); break;
      case "compact": nf = NumberFormat.getCompactNumberInstance(loc, NumberFormat.Style.SHORT); break;
      default: throw new IllegalArgumentException("unknown kind: " + kind);
    }
    if (a.has("maxFrac")) nf.setMaximumFractionDigits(a.get("maxFrac").asInt());
    if (a.has("minFrac")) nf.setMinimumFractionDigits(a.get("minFrac").asInt());
    if (a.has("minInt")) nf.setMinimumIntegerDigits(a.get("minInt").asInt());
    if (a.has("grouping")) nf.setGroupingUsed(a.get("grouping").asBoolean());
    if (a.has("rounding")) nf.setRoundingMode(RoundingMode.valueOf(a.get("rounding").asText()));
    if (a.has("parseIntegerOnly")) nf.setParseIntegerOnly(a.get("parseIntegerOnly").asBoolean());
    return nf;
  }

  private static Object decimalFormat(JsonNode a) {
    NumberFormat nf = build(a);
    List<Object> out = new ArrayList<>();
    for (JsonNode v : a.get("values")) out.add(Probe.units2(nf.format(Probe.typed(v))));
    return out;
  }

  private static Object numberFormat(JsonNode a) {
    return decimalFormat(a);
  }

  private static Object parse(JsonNode a) throws Exception {
    NumberFormat nf = build(a);
    String s = Probe.str(a, "s");
    Map<String, Object> m = new LinkedHashMap<>();
    if (a.has("pos")) {
      ParsePosition pp = new ParsePosition(0);
      Number n = nf.parse(s, pp);
      m.put("value", Probe.repr(n));
      m.put("index", pp.getIndex());
      m.put("errorIndex", pp.getErrorIndex());
    } else {
      m.put("value", Probe.repr(nf.parse(s)));
    }
    return m;
  }

  private static Object symbols(JsonNode a) {
    Locale loc = Probe.locale(Probe.str(a, "locale"));
    DecimalFormatSymbols s = DecimalFormatSymbols.getInstance(loc);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("decimalSeparator", (int) s.getDecimalSeparator());
    m.put("groupingSeparator", (int) s.getGroupingSeparator());
    m.put("minusSign", (int) s.getMinusSign());
    m.put("percent", (int) s.getPercent());
    m.put("zeroDigit", (int) s.getZeroDigit());
    m.put("NaN", s.getNaN());
    m.put("infinity", s.getInfinity());
    m.put("currencySymbol", s.getCurrencySymbol());
    m.put("numberPattern", ((DecimalFormat) NumberFormat.getNumberInstance(loc)).toPattern());
    return m;
  }
}
