package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.*;

/** Shared helpers for the X-PROBE-* ops: typed JSON values in, canonical JSON-able values out. */
final class Probe {
  private Probe() {}

  static String str(JsonNode a, String k) {
    JsonNode n = a.get(k);
    if (n == null || n.isNull()) return null;
    return n.asText();
  }

  static int integer(JsonNode a, String k, int def) {
    JsonNode n = a.get(k);
    return n == null || n.isNull() ? def : Integer.parseInt(n.asText());
  }

  static Locale locale(String tag) {
    if (tag == null || tag.equals("default")) return Locale.getDefault();
    if (tag.equals("ROOT")) return Locale.ROOT;
    return Locale.forLanguageTag(tag);
  }

  /** {"t":"int","v":"5"} -> Java object. Numeric values travel as strings. */
  static Object typed(JsonNode n) {
    if (n == null || n.isNull()) return null;
    if (n.isTextual()) return n.asText();
    if (n.isBoolean()) return n.asBoolean();
    String t = n.get("t").asText();
    JsonNode vn = n.get("v");
    String v = vn == null || vn.isNull() ? null : vn.asText();
    if (t.equals("null")) return null;
    if (n.has("bits")) {
      long b = Long.parseUnsignedLong(n.get("bits").asText().substring(2), 16);
      return t.equals("float") ? (Object) Float.intBitsToFloat((int) b) : (Object) Double.longBitsToDouble(b);
    }
    switch (t) {
      case "int": return Integer.valueOf(v);
      case "long": return Long.valueOf(v);
      case "short": return Short.valueOf(v);
      case "byte": return Byte.valueOf(v);
      case "char": return v.startsWith("#") ? (char) Integer.parseInt(v.substring(1)) : v.charAt(0);
      case "double": return Double.valueOf(v);
      case "float": return Float.valueOf(v);
      case "string": return v;
      case "bool": return Boolean.valueOf(v);
      case "bigdecimal": return new BigDecimal(v);
      case "biginteger": return new BigInteger(v);
      case "date": return new Date(Long.parseLong(v));
      default: throw new IllegalArgumentException("unknown type: " + t);
    }
  }

  static Object[] typedArray(JsonNode arr) {
    List<Object> l = new ArrayList<>();
    if (arr != null) for (JsonNode e : arr) l.add(typed(e));
    return l.toArray();
  }

  static List<String> strings(JsonNode arr) {
    List<String> l = new ArrayList<>();
    for (JsonNode e : arr) l.add(e.isNull() ? null : e.asText());
    return l;
  }

  static Map<String, Object> num(String t, Object v) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("t", t);
    if (v instanceof Double) {
      m.put("v", Double.toString((Double) v));
      m.put("bits", String.format("0x%016x", Double.doubleToRawLongBits((Double) v)));
    } else if (v instanceof Float) {
      m.put("v", Float.toString((Float) v));
      m.put("bits", String.format("0x%08x", Float.floatToRawIntBits((Float) v)));
    } else if (v instanceof Character) {
      m.put("v", Integer.toString((Character) v));
    } else {
      m.put("v", String.valueOf(v));
    }
    return m;
  }

  /** Canonical output form of any Java value. */
  static Object repr(Object o) {
    if (o == null || o instanceof String || o instanceof Boolean) return o;
    if (o instanceof Integer) return num("int", o);
    if (o instanceof Long) return num("long", o);
    if (o instanceof Short) return num("short", o);
    if (o instanceof Byte) return num("byte", o);
    if (o instanceof Character) return num("char", o);
    if (o instanceof Double) return num("double", o);
    if (o instanceof Float) return num("float", o);
    if (o instanceof BigDecimal || o instanceof BigInteger) return num(o.getClass().getSimpleName().toLowerCase(), o);
    if (o instanceof Collection) {
      List<Object> l = new ArrayList<>();
      for (Object e : (Collection<?>) o) l.add(repr(e));
      return l;
    }
    if (o instanceof Object[]) return repr(Arrays.asList((Object[]) o));
    if (o instanceof int[]) { List<Object> l = new ArrayList<>(); for (int e : (int[]) o) l.add(repr(e)); return l; }
    if (o instanceof long[]) { List<Object> l = new ArrayList<>(); for (long e : (long[]) o) l.add(repr(e)); return l; }
    if (o instanceof double[]) { List<Object> l = new ArrayList<>(); for (double e : (double[]) o) l.add(repr(e)); return l; }
    if (o instanceof byte[]) { List<Object> l = new ArrayList<>(); for (byte e : (byte[]) o) l.add(repr(e)); return l; }
    if (o instanceof char[]) { List<Object> l = new ArrayList<>(); for (char e : (char[]) o) l.add(repr(e)); return l; }
    if (o instanceof Map) {
      Map<String, Object> m = new LinkedHashMap<>();
      for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) m.put(String.valueOf(e.getKey()), repr(e.getValue()));
      return m;
    }
    return o.toString();
  }

  static List<Integer> units(String s) {
    List<Integer> l = new ArrayList<>();
    for (int i = 0; i < s.length(); i++) l.add((int) s.charAt(i));
    return l;
  }

  /** String plus code units (lone surrogates / odd separators stay visible). */
  static Object units2(String s) {
    if (s == null) return null;
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("s", s);
    m.put("units", units(s));
    return m;
  }
}
