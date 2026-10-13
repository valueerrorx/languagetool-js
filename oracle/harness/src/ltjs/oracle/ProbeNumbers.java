package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;

/** X-PROBE-NUMBERS: Java numeric semantics (parse, overflow, casts, Math, float/int mixes). */
final class ProbeNumbers {
  private ProbeNumbers() {}

  static Object run(JsonNode a) {
    String fn = a.get("fn").asText();
    switch (fn) {
      case "parse": return parse(a);
      case "arith": return arith(a);
      case "cast": return cast(a);
      case "math": return math(a);
      case "tostr": return tostr(a);
      case "mixed": return mixed(a);
      case "hash": return hash(a);
      case "compare": return compare(a);
      default: throw new IllegalArgumentException("unknown fn: " + fn);
    }
  }

  private static Object parse(JsonNode a) {
    String t = a.get("t").asText();
    String s = Probe.str(a, "s");
    switch (t) {
      case "int": return Probe.repr(Integer.parseInt(s));
      case "intRadix": return Probe.repr(Integer.parseInt(s, a.get("radix").asInt()));
      case "long": return Probe.repr(Long.parseLong(s));
      case "longRadix": return Probe.repr(Long.parseLong(s, a.get("radix").asInt()));
      case "short": return Probe.repr(Short.parseShort(s));
      case "byte": return Probe.repr(Byte.parseByte(s));
      case "double": return Probe.repr(Double.parseDouble(s));
      case "float": return Probe.repr(Float.parseFloat(s));
      case "valueOfInt": return Probe.repr(Integer.valueOf(s));
      case "valueOfLong": return Probe.repr(Long.valueOf(s));
      case "valueOfDouble": return Probe.repr(Double.valueOf(s));
      case "decode": return Probe.repr(Integer.decode(s));
      case "decodeLong": return Probe.repr(Long.decode(s));
      case "parseUnsignedInt": return Probe.repr(Integer.parseUnsignedInt(s));
      case "parseUnsignedLong": return Probe.repr(Long.parseUnsignedLong(s));
      case "boolean": return Boolean.parseBoolean(s);
      case "booleanValueOf": return Boolean.valueOf(s);
      default: throw new IllegalArgumentException("unknown parse type: " + t);
    }
  }

  private static Object arith(JsonNode a) {
    String t = a.get("t").asText();
    String op = a.get("op").asText();
    Object x = Probe.typed(a.get("a"));
    Object y = a.has("b") ? Probe.typed(a.get("b")) : null;
    switch (t) {
      case "int": return Probe.repr(intOp(op, (Integer) x, y == null ? 0 : (Integer) y));
      case "long": return Probe.repr(longOp(op, (Long) x, y == null ? 0L : (Long) y, y));
      case "double": return Probe.repr(doubleOp(op, (Double) x, y == null ? 0.0 : (Double) y));
      case "float": return Probe.repr(floatOp(op, (Float) x, y == null ? 0f : (Float) y));
      default: throw new IllegalArgumentException("unknown type: " + t);
    }
  }

  private static Object intOp(String op, int x, int y) {
    switch (op) {
      case "add": return x + y;
      case "sub": return x - y;
      case "mul": return x * y;
      case "div": return x / y;
      case "rem": return x % y;
      case "neg": return -x;
      case "abs": return Math.abs(x);
      case "and": return x & y;
      case "or": return x | y;
      case "xor": return x ^ y;
      case "not": return ~x;
      case "shl": return x << y;
      case "shr": return x >> y;
      case "ushr": return x >>> y;
      case "min": return Math.min(x, y);
      case "max": return Math.max(x, y);
      case "floorDiv": return Math.floorDiv(x, y);
      case "floorMod": return Math.floorMod(x, y);
      case "addExact": return Math.addExact(x, y);
      case "subtractExact": return Math.subtractExact(x, y);
      case "multiplyExact": return Math.multiplyExact(x, y);
      case "negateExact": return Math.negateExact(x);
      case "incrementExact": return Math.incrementExact(x);
      case "absExact": return Math.absExact(x);
      case "compare": return Integer.compare(x, y);
      case "signum": return Integer.signum(x);
      case "bitCount": return Integer.bitCount(x);
      case "reverse": return Integer.reverse(x);
      case "highestOneBit": return Integer.highestOneBit(x);
      case "numberOfLeadingZeros": return Integer.numberOfLeadingZeros(x);
      case "numberOfTrailingZeros": return Integer.numberOfTrailingZeros(x);
      case "toUnsignedLong": return Integer.toUnsignedLong(x);
      case "divideUnsigned": return Integer.divideUnsigned(x, y);
      case "remainderUnsigned": return Integer.remainderUnsigned(x, y);
      case "compareUnsigned": return Integer.compareUnsigned(x, y);
      case "sum": return Integer.sum(x, y);
      case "mulHi": return Math.multiplyHigh((long) x, (long) y);
      default: throw new IllegalArgumentException("unknown int op: " + op);
    }
  }

  private static Object longOp(String op, long x, long y, Object rawY) {
    switch (op) {
      case "add": return x + y;
      case "sub": return x - y;
      case "mul": return x * y;
      case "div": return x / y;
      case "rem": return x % y;
      case "neg": return -x;
      case "abs": return Math.abs(x);
      case "and": return x & y;
      case "or": return x | y;
      case "xor": return x ^ y;
      case "not": return ~x;
      case "shl": return x << y;
      case "shr": return x >> y;
      case "ushr": return x >>> y;
      case "min": return Math.min(x, y);
      case "max": return Math.max(x, y);
      case "floorDiv": return Math.floorDiv(x, y);
      case "floorMod": return Math.floorMod(x, y);
      case "addExact": return Math.addExact(x, y);
      case "subtractExact": return Math.subtractExact(x, y);
      case "multiplyExact": return Math.multiplyExact(x, y);
      case "negateExact": return Math.negateExact(x);
      case "toIntExact": return Math.toIntExact(x);
      case "compare": return Long.compare(x, y);
      case "signum": return Long.signum(x);
      case "bitCount": return Long.bitCount(x);
      case "numberOfLeadingZeros": return Long.numberOfLeadingZeros(x);
      case "numberOfTrailingZeros": return Long.numberOfTrailingZeros(x);
      case "divideUnsigned": return Long.divideUnsigned(x, y);
      case "remainderUnsigned": return Long.remainderUnsigned(x, y);
      case "compareUnsigned": return Long.compareUnsigned(x, y);
      case "toUnsignedString": return Long.toUnsignedString(x);
      case "mulHi": return Math.multiplyHigh(x, y);
      case "rotateLeft": return Long.rotateLeft(x, (int) y);
      default: throw new IllegalArgumentException("unknown long op: " + op);
    }
  }

  private static Object doubleOp(String op, double x, double y) {
    switch (op) {
      case "add": return x + y;
      case "sub": return x - y;
      case "mul": return x * y;
      case "div": return x / y;
      case "rem": return x % y;
      case "neg": return -x;
      case "abs": return Math.abs(x);
      case "min": return Math.min(x, y);
      case "max": return Math.max(x, y);
      case "compare": return Double.compare(x, y);
      case "eq": return x == y;
      case "lt": return x < y;
      case "isNaN": return Double.isNaN(x);
      case "isInfinite": return Double.isInfinite(x);
      case "isFinite": return Double.isFinite(x);
      case "signum": return Math.signum(x);
      case "IEEEremainder": return Math.IEEEremainder(x, y);
      case "ulp": return Math.ulp(x);
      case "nextUp": return Math.nextUp(x);
      case "copySign": return Math.copySign(x, y);
      case "fma": return Math.fma(x, y, 1.0);
      default: throw new IllegalArgumentException("unknown double op: " + op);
    }
  }

  private static Object floatOp(String op, float x, float y) {
    switch (op) {
      case "add": return x + y;
      case "sub": return x - y;
      case "mul": return x * y;
      case "div": return x / y;
      case "rem": return x % y;
      case "neg": return -x;
      case "abs": return Math.abs(x);
      case "min": return Math.min(x, y);
      case "max": return Math.max(x, y);
      case "compare": return Float.compare(x, y);
      case "isNaN": return Float.isNaN(x);
      case "toDouble": return (double) x;
      case "ulp": return Math.ulp(x);
      default: throw new IllegalArgumentException("unknown float op: " + op);
    }
  }

  private static Object cast(JsonNode a) {
    String from = a.get("from").asText();
    String to = a.get("to").asText();
    Object v = Probe.typed(a.get("a"));
    switch (from) {
      case "double": { double d = (Double) v; return castD(to, d); }
      case "float": { float f = (Float) v; return castD2(to, f); }
      case "long": { long l = (Long) v; return castL(to, l); }
      case "int": { int i = (Integer) v; return castL(to, i); }
      case "short": { short s = (Short) v; return castL(to, s); }
      case "char": { char c = (Character) v; return castL(to, c); }
      case "byte": { byte b = (Byte) v; return castL(to, b); }
      default: throw new IllegalArgumentException("unknown from: " + from);
    }
  }

  private static Object castD(String to, double d) {
    switch (to) {
      case "int": return Probe.repr((int) d);
      case "long": return Probe.repr((long) d);
      case "short": return Probe.repr((short) d);
      case "byte": return Probe.repr((byte) d);
      case "char": return Probe.repr((char) d);
      case "float": return Probe.repr((float) d);
      default: throw new IllegalArgumentException("unknown to: " + to);
    }
  }

  private static Object castD2(String to, float f) {
    switch (to) {
      case "int": return Probe.repr((int) f);
      case "long": return Probe.repr((long) f);
      case "short": return Probe.repr((short) f);
      case "byte": return Probe.repr((byte) f);
      case "char": return Probe.repr((char) f);
      case "double": return Probe.repr((double) f);
      default: throw new IllegalArgumentException("unknown to: " + to);
    }
  }

  private static Object castL(String to, long l) {
    switch (to) {
      case "int": return Probe.repr((int) l);
      case "long": return Probe.repr(l);
      case "short": return Probe.repr((short) l);
      case "byte": return Probe.repr((byte) l);
      case "char": return Probe.repr((char) l);
      case "float": return Probe.repr((float) l);
      case "double": return Probe.repr((double) l);
      default: throw new IllegalArgumentException("unknown to: " + to);
    }
  }

  private static Object math(JsonNode a) {
    String op = a.get("op").asText();
    Object x = Probe.typed(a.get("a"));
    Object y = a.has("b") ? Probe.typed(a.get("b")) : null;
    if (x instanceof Float) {
      float f = (Float) x;
      switch (op) {
        case "round": return Probe.repr(Math.round(f));
        case "abs": return Probe.repr(Math.abs(f));
        default: throw new IllegalArgumentException("unknown float math op: " + op);
      }
    }
    double d = (Double) x;
    double e = y == null ? 0 : (Double) y;
    switch (op) {
      case "round": return Probe.repr(Math.round(d));
      case "rint": return Probe.repr(Math.rint(d));
      case "floor": return Probe.repr(Math.floor(d));
      case "ceil": return Probe.repr(Math.ceil(d));
      case "sqrt": return Probe.repr(Math.sqrt(d));
      case "cbrt": return Probe.repr(Math.cbrt(d));
      case "pow": return Probe.repr(Math.pow(d, e));
      case "exp": return Probe.repr(Math.exp(d));
      case "log": return Probe.repr(Math.log(d));
      case "log10": return Probe.repr(Math.log10(d));
      case "sin": return Probe.repr(Math.sin(d));
      case "cos": return Probe.repr(Math.cos(d));
      case "tan": return Probe.repr(Math.tan(d));
      case "atan": return Probe.repr(Math.atan(d));
      case "atan2": return Probe.repr(Math.atan2(d, e));
      case "hypot": return Probe.repr(Math.hypot(d, e));
      case "sinh": return Probe.repr(Math.sinh(d));
      case "strictExp": return Probe.repr(StrictMath.exp(d));
      case "strictLog": return Probe.repr(StrictMath.log(d));
      case "strictPow": return Probe.repr(StrictMath.pow(d, e));
      case "strictLog10": return Probe.repr(StrictMath.log10(d));
      case "strictSin": return Probe.repr(StrictMath.sin(d));
      case "strictCos": return Probe.repr(StrictMath.cos(d));
      case "strictSqrt": return Probe.repr(StrictMath.sqrt(d));
      case "abs": return Probe.repr(Math.abs(d));
      default: throw new IllegalArgumentException("unknown math op: " + op);
    }
  }

  private static Object tostr(JsonNode a) {
    String op = a.get("op").asText();
    Object x = Probe.typed(a.get("a"));
    int radix = a.has("radix") ? a.get("radix").asInt() : 10;
    switch (op) {
      case "intToString": return Integer.toString((Integer) x);
      case "intToStringRadix": return Integer.toString((Integer) x, radix);
      case "longToStringRadix": return Long.toString((Long) x, radix);
      case "intHex": return Integer.toHexString((Integer) x);
      case "intOctal": return Integer.toOctalString((Integer) x);
      case "intBinary": return Integer.toBinaryString((Integer) x);
      case "longHex": return Long.toHexString((Long) x);
      case "longBinary": return Long.toBinaryString((Long) x);
      case "unsignedInt": return Integer.toUnsignedString((Integer) x);
      case "unsignedLong": return Long.toUnsignedString((Long) x);
      case "doubleToString": return Double.toString((Double) x);
      case "floatToString": return Float.toString((Float) x);
      case "doubleHex": return Double.toHexString((Double) x);
      case "concat": return "" + x;
      case "valueOf": return String.valueOf(x);
      case "charDigit": return Probe.repr(Character.digit((char) (Character) x, radix));
      case "forDigit": return Probe.repr(Character.forDigit((Integer) x, radix));
      case "charNumeric": return Probe.repr(Character.getNumericValue((char) (Character) x));
      default: throw new IllegalArgumentException("unknown tostr op: " + op);
    }
  }

  /** Mixed-type compound expressions that appear in the original (see SEMANTICS P4). */
  private static Object mixed(JsonNode a) {
    String kind = a.get("kind").asText();
    Object x = Probe.typed(a.get("a"));
    Object y = a.has("b") ? Probe.typed(a.get("b")) : null;
    switch (kind) {
      case "intPlusEqFloat": { int i = (Integer) x; i += (Float) y; return Probe.repr(i); }
      case "intMulEqFloat": { int i = (Integer) x; i *= (Float) y; return Probe.repr(i); }
      case "intMulEqDouble": { int i = (Integer) x; i *= (Double) y; return Probe.repr(i); }
      case "longDivFloat": return Probe.repr((Long) x / (Float) y);
      case "longDivDouble": return Probe.repr((Long) x / (Double) y);
      case "msToSecFloat": return Probe.repr((Long) x / 1000.0f);
      case "msToSecDouble": return Probe.repr((Long) x / 1000.0);
      case "intDivInt": return Probe.repr((Integer) x / (Integer) y);
      case "intDivIntToDouble": { double d = (Integer) x / (Integer) y; return Probe.repr(d); }
      case "intDivIntAsDouble": return Probe.repr((double) (Integer) x / (Integer) y);
      case "intPlusHalfTrunc": return Probe.repr((int) ((Double) x + 0.5));
      case "intTimes10": return Probe.repr((Integer) x * 10);
      case "minValuePlus": return Probe.repr(Integer.MIN_VALUE + (Integer) x);
      case "charPlusInt": return Probe.repr('a' + (Integer) x);
      case "charCastPlusInt": return Probe.repr((char) ('a' + (Integer) x));
      case "charConcat": return "a" + (Integer) x + 'b';
      case "charPlusChar": return Probe.repr((Character) x + (Character) y);
      case "charPlusPlus": { char c = (Character) x; c++; return Probe.repr(c); }
      case "bytePlusEq": { byte b = (Byte) x; b += (Integer) y; return Probe.repr(b); }
      case "shortMul": { short s = (Short) x; s *= (Short) y; return Probe.repr(s); }
      case "floatFromInt": return Probe.repr((float) (int) (Integer) x);
      case "floatPlusDouble": return Probe.repr((Float) x + (Double) y);
      case "floatSumTen": { float f = 0; for (int i = 0; i < 10; i++) f += (Float) x; return Probe.repr(f); }
      case "doubleSumTen": { double d = 0; for (int i = 0; i < 10; i++) d += (Double) x; return Probe.repr(d); }
      case "ternaryBoxing": { Object o = true ? (Object) 1 : (Object) 2.0; return String.valueOf(o); }
      case "ternaryNumeric": { Object o = (Integer) x > 0 ? (Integer) 1 : (Double) 2.0; return String.valueOf(o); }
      case "doubleEqualsBoxed": return ((Double) x).equals((Double) y);
      case "longEqualsInt": return ((Long) x).equals(((Integer) y).longValue());
      case "longEqualsIntObj": return ((Long) x).equals(y);
      default: throw new IllegalArgumentException("unknown mixed kind: " + kind);
    }
  }

  private static Object hash(JsonNode a) {
    Object x = Probe.typed(a.get("a"));
    return Probe.repr(x == null ? 0 : x.hashCode());
  }

  private static Object compare(JsonNode a) {
    Object x = Probe.typed(a.get("a"));
    Object y = Probe.typed(a.get("b"));
    @SuppressWarnings({"unchecked", "rawtypes"})
    int c = ((Comparable) x).compareTo(y);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("compareTo", Probe.repr(c));
    m.put("equals", x.equals(y));
    return m;
  }
}
