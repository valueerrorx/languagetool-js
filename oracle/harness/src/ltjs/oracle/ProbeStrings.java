package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;
import java.util.regex.Pattern;

/** X-PROBE-STRINGS: String/Character/StringBuilder semantics and hash codes. */
final class ProbeStrings {
  private ProbeStrings() {}

  static Object run(JsonNode a) {
    String fn = a.get("fn").asText();
    String s = Probe.str(a, "s");
    String t = Probe.str(a, "t");
    switch (fn) {
      case "trim": return str(s.trim());
      case "strip": return str(s.strip());
      case "stripLeading": return str(s.stripLeading());
      case "stripTrailing": return str(s.stripTrailing());
      case "isBlank": return s.isBlank();
      case "isEmpty": return s.isEmpty();
      case "replace": return str(s.replace(t, Probe.str(a, "u")));
      case "replaceChar": return str(s.replace(t.charAt(0), Probe.str(a, "u").charAt(0)));
      case "replaceAll": return str(s.replaceAll(t, Probe.str(a, "u")));
      case "replaceFirst": return str(s.replaceFirst(t, Probe.str(a, "u")));
      case "matches": return s.matches(t);
      case "quote": return str(Pattern.quote(s));
      case "quoteReplacement": return str(java.util.regex.Matcher.quoteReplacement(s));
      case "split": return split(a, s, t);
      case "compareTo": return Probe.repr(s.compareTo(t));
      case "compareToIgnoreCase": return Probe.repr(s.compareToIgnoreCase(t));
      case "equalsIgnoreCase": return s == null ? (Object) "n/a" : (Object) s.equalsIgnoreCase(t);
      case "equals": return s.equals(t);
      case "contentEquals": return s.contentEquals(new StringBuilder(t));
      case "regionMatches": return s.regionMatches(a.get("ic").asBoolean(), a.get("off").asInt(), t, a.get("ooff").asInt(), a.get("len").asInt());
      case "hashCode": return Probe.repr(s.hashCode());
      case "hashCodes": { List<Object> l = new ArrayList<>(); for (JsonNode n : a.get("list")) l.add(Probe.repr(n.asText().hashCode())); return l; }
      case "objectsHash": return Probe.repr(Objects.hash(Probe.typedArray(a.get("args"))));
      case "arraysHashCode": return Probe.repr(Arrays.hashCode(Probe.typedArray(a.get("args"))));
      case "listHashCode": return Probe.repr(Arrays.asList(Probe.typedArray(a.get("args"))).hashCode());
      case "setHashCode": return Probe.repr(new HashSet<>(Arrays.asList(Probe.typedArray(a.get("args")))).hashCode());
      case "mapHashCode": { Map<String, String> m = new HashMap<>(); JsonNode e = a.get("pairs"); for (int i = 0; i + 1 < e.size(); i += 2) m.put(e.get(i).asText(), e.get(i + 1).isNull() ? null : e.get(i + 1).asText()); return Probe.repr(m.hashCode()); }
      case "boxedHash": return Probe.repr(Probe.typed(a.get("v")).hashCode());
      case "toUpperCase": return str(a.has("locale") ? s.toUpperCase(Probe.locale(Probe.str(a, "locale"))) : s.toUpperCase());
      case "toLowerCase": return str(a.has("locale") ? s.toLowerCase(Probe.locale(Probe.str(a, "locale"))) : s.toLowerCase());
      case "charCase": return charCase(a.get("cp").asInt());
      case "charInfo": return charInfo(a.get("cp").asInt());
      case "charAt": return Probe.repr(s.charAt(a.get("i").asInt()));
      case "substring": return a.has("e") ? str(s.substring(a.get("b").asInt(), a.get("e").asInt())) : str(s.substring(a.get("b").asInt()));
      case "subSequence": return str(s.subSequence(a.get("b").asInt(), a.get("e").asInt()).toString());
      case "length": { Map<String, Object> m = new LinkedHashMap<>(); m.put("length", s.length()); m.put("codePointCount", s.codePointCount(0, s.length())); m.put("units", Probe.units(s)); return m; }
      case "codePointAt": return Probe.repr(s.codePointAt(a.get("i").asInt()));
      case "codePointBefore": return Probe.repr(s.codePointBefore(a.get("i").asInt()));
      case "offsetByCodePoints": return Probe.repr(s.offsetByCodePoints(a.get("i").asInt(), a.get("n").asInt()));
      case "codePoints": { List<Object> l = new ArrayList<>(); s.codePoints().forEach(c -> l.add(c)); return l; }
      case "chars": { List<Object> l = new ArrayList<>(); s.chars().forEach(c -> l.add(c)); return l; }
      case "indexOf": return Probe.repr(a.has("from") ? s.indexOf(t, a.get("from").asInt()) : s.indexOf(t));
      case "lastIndexOf": return Probe.repr(a.has("from") ? s.lastIndexOf(t, a.get("from").asInt()) : s.lastIndexOf(t));
      case "indexOfChar": return Probe.repr(s.indexOf(a.get("ch").asInt()));
      case "contains": return s.contains(t);
      case "startsWith": return a.has("off") ? s.startsWith(t, a.get("off").asInt()) : s.startsWith(t);
      case "endsWith": return s.endsWith(t);
      case "concat": return str(s.concat(t));
      case "repeat": return str(s.repeat(a.get("n").asInt()));
      case "join": return str(String.join(s, Probe.strings(a.get("list"))));
      case "lines": { List<Object> l = new ArrayList<>(); s.lines().forEach(l::add); return l; }
      case "valueOfNull": return String.valueOf((Object) null) + ":" + ("x" + null) + ":" + Objects.toString(null) + ":" + Objects.toString(null, "d");
      case "intern": return s.intern() == s;
      case "sb": return sb(a);
      case "tokenizer": return tokenizer(a, s, t);
      case "normalize": return str(java.text.Normalizer.normalize(s, java.text.Normalizer.Form.valueOf(t)));
      case "bytes": { List<Object> l = new ArrayList<>(); for (byte b : s.getBytes(java.nio.charset.Charset.forName(t))) l.add(Probe.repr(b)); return l; }
      case "fromBytes": { JsonNode bs = a.get("bytes"); byte[] b = new byte[bs.size()]; for (int i = 0; i < b.length; i++) b[i] = (byte) bs.get(i).asInt(); return str(new String(b, java.nio.charset.Charset.forName(t))); }
      case "caseInsensitiveOrder": return Probe.repr(String.CASE_INSENSITIVE_ORDER.compare(s, t));
      default: throw new IllegalArgumentException("unknown fn: " + fn);
    }
  }

  /** String result plus its UTF-16 code units, so lone surrogates survive any transport. */
  private static Object str(String s) {
    if (s == null) return null;
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("s", s);
    m.put("units", Probe.units(s));
    return m;
  }

  private static Object split(JsonNode a, String s, String re) {
    String[] r = a.has("limit") ? s.split(re, a.get("limit").asInt()) : s.split(re);
    List<Object> l = new ArrayList<>();
    for (String p : r) l.add(p);
    return l;
  }

  private static Object charCase(int cp) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("toUpperCase", Character.toUpperCase(cp));
    m.put("toLowerCase", Character.toLowerCase(cp));
    m.put("toTitleCase", Character.toTitleCase(cp));
    if (cp < 0x10000) {
      m.put("charToUpperCase", (int) Character.toUpperCase((char) cp));
      m.put("charToLowerCase", (int) Character.toLowerCase((char) cp));
    }
    String str = new String(Character.toChars(cp));
    m.put("strUpper", Probe.units(str.toUpperCase(Locale.ROOT)));
    m.put("strLower", Probe.units(str.toLowerCase(Locale.ROOT)));
    m.put("strUpperTr", Probe.units(str.toUpperCase(Locale.forLanguageTag("tr"))));
    m.put("strLowerTr", Probe.units(str.toLowerCase(Locale.forLanguageTag("tr"))));
    m.put("strUpperDefault", Probe.units(str.toUpperCase()));
    m.put("strLowerDefault", Probe.units(str.toLowerCase()));
    return m;
  }

  private static Object charInfo(int cp) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("isWhitespace", Character.isWhitespace(cp));
    m.put("isSpaceChar", Character.isSpaceChar(cp));
    m.put("isLetter", Character.isLetter(cp));
    m.put("isDigit", Character.isDigit(cp));
    m.put("isLetterOrDigit", Character.isLetterOrDigit(cp));
    m.put("isAlphabetic", Character.isAlphabetic(cp));
    m.put("isUpperCase", Character.isUpperCase(cp));
    m.put("isLowerCase", Character.isLowerCase(cp));
    m.put("isTitleCase", Character.isTitleCase(cp));
    m.put("isISOControl", Character.isISOControl(cp));
    m.put("isIdeographic", Character.isIdeographic(cp));
    m.put("isJavaIdentifierStart", Character.isJavaIdentifierStart(cp));
    m.put("isSurrogate", cp < 0x10000 && Character.isSurrogate((char) cp));
    m.put("type", Character.getType(cp));
    m.put("digit10", Character.digit(cp, 10));
    m.put("digit16", Character.digit(cp, 16));
    m.put("numericValue", Character.getNumericValue(cp));
    m.put("script", Character.UnicodeScript.of(cp).name());
    m.put("charCount", Character.charCount(cp));
    m.put("isValidCodePoint", Character.isValidCodePoint(cp));
    return m;
  }

  private static Object sb(JsonNode a) {
    StringBuilder sb = new StringBuilder(Probe.str(a, "s"));
    List<Object> trace = new ArrayList<>();
    for (JsonNode op : a.get("ops")) {
      String name = op.get(0).asText();
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("op", op.toString());
      try {
        switch (name) {
          case "append": sb.append(op.get(1).asText()); break;
          case "appendNull": sb.append((String) null); break;
          case "appendChar": sb.append((char) op.get(1).asInt()); break;
          case "appendInt": sb.append(op.get(1).asInt()); break;
          case "appendDouble": sb.append(Double.parseDouble(op.get(1).asText())); break;
          case "appendFloat": sb.append(Float.parseFloat(op.get(1).asText())); break;
          case "appendCodePoint": sb.appendCodePoint(op.get(1).asInt()); break;
          case "insert": sb.insert(op.get(1).asInt(), op.get(2).asText()); break;
          case "delete": sb.delete(op.get(1).asInt(), op.get(2).asInt()); break;
          case "deleteCharAt": sb.deleteCharAt(op.get(1).asInt()); break;
          case "replace": sb.replace(op.get(1).asInt(), op.get(2).asInt(), op.get(3).asText()); break;
          case "reverse": sb.reverse(); break;
          case "setLength": sb.setLength(op.get(1).asInt()); break;
          case "setCharAt": sb.setCharAt(op.get(1).asInt(), (char) op.get(2).asInt()); break;
          case "charAt": step.put("value", Probe.repr(sb.charAt(op.get(1).asInt()))); break;
          case "substring": step.put("value", str(op.size() > 2 ? sb.substring(op.get(1).asInt(), op.get(2).asInt()) : sb.substring(op.get(1).asInt()))); break;
          case "indexOf": step.put("value", sb.indexOf(op.get(1).asText())); break;
          case "length": step.put("value", sb.length()); break;
          default: throw new IllegalArgumentException("unknown sb op: " + name);
        }
        step.put("state", str(sb.toString()));
      } catch (Throwable e) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("class", e.getClass().getName());
        err.put("message", e.getMessage());
        step.put("error", err);
      }
      trace.add(step);
    }
    return trace;
  }

  private static Object tokenizer(JsonNode a, String s, String delims) {
    boolean ret = a.has("returnDelims") && a.get("returnDelims").asBoolean();
    StringTokenizer st = new StringTokenizer(s, delims, ret);
    List<Object> l = new ArrayList<>();
    while (st.hasMoreTokens()) l.add(st.nextToken());
    return l;
  }
}
