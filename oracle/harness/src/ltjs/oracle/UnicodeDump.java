package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Op unicode-dump: JDK 17 Character/String/Normalizer/Pattern data per code point, run-length encoded. */
public class UnicodeDump {
  interface IntFn { int apply(int cp); }

  static Locale loc(String s) {
    return s.equals("ROOT") ? Locale.ROOT : new Locale(s);
  }

  /** flat triples [start, len, value, ...] of equal-valued runs over 0..0x10FFFF */
  static List<Integer> rle(IntFn f) {
    List<Integer> out = new ArrayList<>();
    int start = 0, val = f.apply(0);
    for (int cp = 1; cp <= 0x10FFFF; cp++) {
      int v = f.apply(cp);
      if (v != val) { out.add(start); out.add(cp - start); out.add(val); start = cp; val = v; }
    }
    out.add(start); out.add(0x110000 - start); out.add(val);
    return out;
  }

  static Object named(java.util.function.IntFunction<String> f) {
    List<String> names = new ArrayList<>();
    Map<String, Integer> idx = new HashMap<>();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("runs", rle(cp -> {
      String n = f.apply(cp);
      if (n == null) return -1;
      return idx.computeIfAbsent(n, k -> { names.add(k); return names.size() - 1; });
    }));
    m.put("names", names);
    return m;
  }

  static final String[] FLAG_NAMES = {"isLetter", "isDigit", "isLetterOrDigit", "isWhitespace", "isSpaceChar", "isUpperCase",
      "isLowerCase", "isTitleCase", "isAlphabetic", "isIdeographic", "isJavaIdentifierStart", "isJavaIdentifierPart",
      "isMirrored", "isDefined", "isISOControl", "isIdentifierIgnorable", "isUnicodeIdentifierStart", "isUnicodeIdentifierPart",
      "isSurrogate"};

  static int flags(int cp) {
    boolean[] b = {Character.isLetter(cp), Character.isDigit(cp), Character.isLetterOrDigit(cp), Character.isWhitespace(cp),
        Character.isSpaceChar(cp), Character.isUpperCase(cp), Character.isLowerCase(cp), Character.isTitleCase(cp),
        Character.isAlphabetic(cp), Character.isIdeographic(cp), Character.isJavaIdentifierStart(cp),
        Character.isJavaIdentifierPart(cp), Character.isMirrored(cp), Character.isDefined(cp), Character.isISOControl(cp),
        Character.isIdentifierIgnorable(cp), Character.isUnicodeIdentifierStart(cp), Character.isUnicodeIdentifierPart(cp),
        cp >= 0xD800 && cp <= 0xDFFF};
    int r = 0;
    for (int i = 0; i < b.length; i++) if (b[i]) r |= 1 << i;
    return r;
  }

  static String cps(int cp) { return new String(Character.toChars(cp)); }

  public static Object run(JsonNode a) {
    String part = a.get("part").asText();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("javaVersion", System.getProperty("java.version"));
    m.put("unicodeNote", "Character data of JDK 17 (Unicode 13.0)");
    switch (part) {
      case "props": {
        m.put("flagNames", Arrays.asList(FLAG_NAMES));
        m.put("note", "runs are flat [start,len,value,...]; flags is a bitmask in flagNames order; type = Character.getType; numeric = getNumericValue; named = {runs:index into names, -1 = null}");
        m.put("type", rle(Character::getType));
        m.put("flags", rle(UnicodeDump::flags));
        m.put("numericValue", rle(Character::getNumericValue));
        m.put("digit10", rle(cp -> Character.digit(cp, 10)));
        m.put("digit16", rle(cp -> Character.digit(cp, 16)));
        m.put("digit36", rle(cp -> Character.digit(cp, 36)));
        m.put("directionality", rle(Character::getDirectionality));
        m.put("script", named(cp -> Character.UnicodeScript.of(cp).name()));
        m.put("block", named(cp -> { Character.UnicodeBlock b = Character.UnicodeBlock.of(cp); return b == null ? null : b.toString(); }));
        break;
      }
      case "case": {
        m.put("note", "[cp, mapped] only where Character.toXxx(int) differs from cp");
        for (String k : new String[]{"toUpperCase", "toLowerCase", "toTitleCase"}) {
          List<Integer> l = new ArrayList<>();
          for (int cp = 0; cp <= 0x10FFFF; cp++) {
            int r = k.equals("toUpperCase") ? Character.toUpperCase(cp) : k.equals("toLowerCase") ? Character.toLowerCase(cp) : Character.toTitleCase(cp);
            if (r != cp) { l.add(cp); l.add(r); }
          }
          m.put(k, l);
        }
        break;
      }
      case "strcase": {
        String[] locs = {"ROOT", "en", "tr", "az", "lt", "de", "fr", "el"};
        m.put("note", "ROOT: [cp, upper, lower] where either differs from the 1-char string; other locales: [cp, upper, lower] only where differing from ROOT result. Strings ASCII-escaped.");
        List<Object> root = new ArrayList<>();
        Map<String, Object> others = new LinkedHashMap<>();
        for (int i = 1; i < locs.length; i++) others.put(locs[i], new ArrayList<Object>());
        for (int cp = 0; cp <= 0x10FFFF; cp++) {
          String s = cps(cp);
          String ru = s.toUpperCase(Locale.ROOT), rl = s.toLowerCase(Locale.ROOT);
          if (!ru.equals(s) || !rl.equals(s)) root.add(Arrays.asList(cp, ru, rl));
          for (int i = 1; i < locs.length; i++) {
            Locale l = loc(locs[i]);
            String u = s.toUpperCase(l), lo = s.toLowerCase(l);
            if (!u.equals(ru) || !lo.equals(rl)) { @SuppressWarnings("unchecked") List<Object> t = (List<Object>) others.get(locs[i]); t.add(Arrays.asList(cp, u, lo)); }
          }
        }
        m.put("ROOT", root);
        m.put("others", others);
        break;
      }
      case "strctx": {
        List<String> locs = new ArrayList<>();
        for (JsonNode n : a.get("locales")) locs.add(n.asText());
        List<Object> res = new ArrayList<>();
        for (JsonNode n : a.get("strings")) {
          String s = n.asText();
          Map<String, Object> e = new LinkedHashMap<>();
          e.put("input", s);
          Map<String, Object> up = new LinkedHashMap<>(), lo = new LinkedHashMap<>();
          for (String ls : locs) { up.put(ls, s.toUpperCase(loc(ls))); lo.put(ls, s.toLowerCase(loc(ls))); }
          e.put("upper", up); e.put("lower", lo);
          e.put("equalsIgnoreCaseSelfLower", s.equalsIgnoreCase(s.toLowerCase(Locale.ROOT)));
          res.add(e);
        }
        m.put("results", res);
        break;
      }
      case "normalizer": {
        m.put("note", "[cp, NFC, NFD, NFKC, NFKD] only where any form differs from the 1-char string");
        List<Object> l = new ArrayList<>();
        for (int cp = 0; cp <= 0x10FFFF; cp++) {
          String s = cps(cp);
          String c = Normalizer.normalize(s, Normalizer.Form.NFC), d = Normalizer.normalize(s, Normalizer.Form.NFD),
              kc = Normalizer.normalize(s, Normalizer.Form.NFKC), kd = Normalizer.normalize(s, Normalizer.Form.NFKD);
          if (!c.equals(s) || !d.equals(s) || !kc.equals(s) || !kd.equals(s)) l.add(Arrays.asList(cp, c, d, kc, kd));
        }
        m.put("entries", l);
        List<Object> seq = new ArrayList<>();
        if (a.has("strings")) for (JsonNode n : a.get("strings")) {
          String s = n.asText();
          seq.add(Arrays.asList(s, Normalizer.normalize(s, Normalizer.Form.NFC), Normalizer.normalize(s, Normalizer.Form.NFD),
              Normalizer.normalize(s, Normalizer.Form.NFKC), Normalizer.normalize(s, Normalizer.Form.NFKD)));
        }
        m.put("sequences", seq);
        break;
      }
      case "pattern": {
        m.put("note", "per name: flat runs [start,len,0|1] of Pattern.compile(regex,flags).matcher(1-char-or-surrogate-pair string).matches() over all code points");
        Map<String, Object> res = new LinkedHashMap<>();
        for (JsonNode n : a.get("classes")) {
          String name = n.get("name").asText();
          int flags = n.has("flags") ? n.get("flags").asInt() : 0;
          try {
            Pattern p = Pattern.compile(n.get("regex").asText(), flags);
            res.put(name, rle(cp -> p.matcher(cps(cp)).matches() ? 1 : 0));
          } catch (Throwable t) {
            res.put(name, "ERROR " + t.getClass().getName() + ": " + t.getMessage());
          }
        }
        m.put("classes", res);
        break;
      }
      default: throw new IllegalArgumentException("unknown unicode-dump part: " + part);
    }
    return m;
  }
}
