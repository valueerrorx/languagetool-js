package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.JLanguageTool;
import org.languagetool.Language;
import org.languagetool.Languages;
import org.languagetool.tools.Tools;

import java.util.*;

/** Ops for X-I18N: message bundle dump, Tools.i18n formatting, build info. */
final class I18nOps {
  private I18nOps() {}

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    return e;
  }

  private static Map<String, Object> locOf(ResourceBundle b) {
    Map<String, Object> m = new LinkedHashMap<>();
    Locale l = b.getLocale();
    m.put("locale", l == null ? null : l.toString());
    return m;
  }

  private static ResourceBundle bundle(JsonNode a) {
    String lang = Probe.str(a, "lang");
    if (lang == null || lang.equals("default")) return JLanguageTool.getMessageBundle();
    return JLanguageTool.getMessageBundle(Languages.getLanguageForShortCode(lang));
  }

  /** i18n-bundle {lang|null} -> resolved key->string map incl. errors, bundle info. */
  static Object bundleDump(JsonNode a) {
    String lang = Probe.str(a, "lang");
    Map<String, Object> out = new LinkedHashMap<>();
    ResourceBundle b = bundle(a);
    out.put("bundleClass", b.getClass().getName());
    out.put("bundleLocale", locOf(b).get("locale"));
    if (lang != null && !lang.equals("default")) {
      Language l = Languages.getLanguageForShortCode(lang);
      out.put("languageLocale", l.getLocale().toString());
      out.put("languageLocaleWithCountryAndVariant", l.getLocaleWithCountryAndVariant().toString());
      // raw (unwrapped) bundles per resolution step
      Map<String, Object> raw = new LinkedHashMap<>();
      List<Locale> locs = new ArrayList<>();
      locs.add(l.getLocaleWithCountryAndVariant());
      locs.add(l.getLocale());
      Language dv = l.getDefaultLanguageVariant();
      if (dv != null && dv.getCountries().length > 0) locs.add(new Locale(dv.getShortCode(), dv.getCountries()[0]));
      for (Locale x : locs) {
        try { raw.put(x.toString(), ResourceBundle.getBundle("org.languagetool.MessagesBundle", x).getLocale().toString()); }
        catch (Throwable t) { raw.put(x.toString(), err(t)); }
      }
      out.put("rawResolution", raw);
    }
    TreeSet<String> keys = new TreeSet<>(b.keySet());
    out.put("keyCount", keys.size());
    Map<String, Object> values = new LinkedHashMap<>();
    for (String k : keys) {
      try { values.put(k, b.getString(k)); } catch (Throwable t) { values.put(k, Collections.singletonMap("error", err(t))); }
    }
    out.put("values", values);
    // keys of the English bundle absent from the key set: getString behaviour (fallback or MissingResourceException)
    Map<String, Object> missing = new LinkedHashMap<>();
    ResourceBundle en = ResourceBundle.getBundle("org.languagetool.MessagesBundle", Locale.ENGLISH);
    for (String k : new TreeSet<>(en.keySet())) {
      if (keys.contains(k)) continue;
      try { missing.put(k, b.getString(k)); } catch (Throwable t) { missing.put(k, Collections.singletonMap("error", err(t))); }
    }
    out.put("englishKeysNotInKeySet", missing);
    out.put("containsKeyNoSuchKey", b.containsKey("no_such_key_xyz"));
    try { b.getString("no_such_key_xyz"); out.put("noSuchKey", null); } catch (Throwable t) { out.put("noSuchKey", err(t)); }
    try { b.getString(null); out.put("nullKey", null); } catch (Throwable t) { out.put("nullKey", err(t)); }
    return out;
  }

  /** i18n-format {lang, key | pattern, args[typed]} -> Tools.i18n result (pattern: bundle-free MessageFormat via a one-key bundle). */
  static Object format(JsonNode a) {
    Object[] args = Probe.typedArray(a.get("args"));
    Map<String, Object> out = new LinkedHashMap<>();
    ResourceBundle b;
    String key = Probe.str(a, "key");
    if (a.has("pattern")) {
      final String pat = Probe.str(a, "pattern");
      b = new ListResourceBundle() {
        @Override protected Object[][] getContents() { return new Object[][] {{"p", pat}}; }
      };
      key = "p";
    } else {
      b = bundle(a);
    }
    out.put("pattern", a.has("pattern") ? Probe.str(a, "pattern") : safe(b, key));
    out.put("result", Tools.i18n(b, key, args));
    return out;
  }

  private static Object safe(ResourceBundle b, String k) {
    try { return b.getString(k); } catch (Throwable t) { return null; }
  }

  static Object buildInfo(JsonNode a) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("version", JLanguageTool.VERSION);
    m.put("buildDate", JLanguageTool.BUILD_DATE);
    m.put("gitShortId", JLanguageTool.GIT_SHORT_ID);
    return m;
  }
}
