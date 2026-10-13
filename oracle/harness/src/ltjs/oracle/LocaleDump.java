package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.*;
import java.util.*;

/** Op locale-dump: JDK 17 (CLDR 39) locale data per locale. */
public class LocaleDump {
  static Locale loc(String s) {
    if (s.equals("ROOT")) return Locale.ROOT;
    if (s.startsWith("new:")) return new Locale(s.substring(4));
    String[] p = s.split("_");
    return p.length == 1 ? new Locale(p[0]) : new Locale(p[0], p[1]);
  }

  static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (Throwable t) { return "ERROR " + t.getClass().getName() + ": " + t.getMessage(); }
  }

  static Map<String, Object> nf(NumberFormat f) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("class", f.getClass().getName());
    if (f instanceof DecimalFormat) {
      DecimalFormat d = (DecimalFormat) f;
      m.put("pattern", d.toPattern());
      m.put("localizedPattern", d.toLocalizedPattern());
      m.put("positivePrefix", d.getPositivePrefix());
      m.put("positiveSuffix", d.getPositiveSuffix());
      m.put("negativePrefix", d.getNegativePrefix());
      m.put("negativeSuffix", d.getNegativeSuffix());
      m.put("groupingSize", d.getGroupingSize());
      m.put("multiplier", d.getMultiplier());
    }
    m.put("groupingUsed", f.isGroupingUsed());
    m.put("parseIntegerOnly", f.isParseIntegerOnly());
    m.put("minInt", f.getMinimumIntegerDigits());
    m.put("maxInt", f.getMaximumIntegerDigits());
    m.put("minFrac", f.getMinimumFractionDigits());
    m.put("maxFrac", f.getMaximumFractionDigits());
    m.put("roundingMode", f.getRoundingMode().toString());
    Map<String, Object> s = new LinkedHashMap<>();
    for (double v : new double[]{0, 1, -1, 0.5, 1234.5678, -1234567.891, 1234567.891, 0.125, 2.5, 1e10})
      s.put(Double.toString(v), f.format(v));
    s.put("long:1234567", f.format(1234567L));
    m.put("samples", s);
    return m;
  }

  static List<String> arr(String[] a) { return Arrays.asList(a); }

  static String cs(char c) { return String.valueOf(c); }

  public static Object run(JsonNode a) {
    List<Object> res = new ArrayList<>();
    for (JsonNode n : a.get("locales")) {
      String spec = n.asText();
      Locale l = loc(spec);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("spec", spec);
      m.put("toString", l.toString());
      m.put("language", l.getLanguage());
      m.put("country", l.getCountry());
      m.put("variant", l.getVariant());
      m.put("script", l.getScript());
      m.put("toLanguageTag", l.toLanguageTag());
      m.put("iso3Language", safe(l::getISO3Language));
      m.put("iso3Country", safe(l::getISO3Country));
      m.put("displayName_en", l.getDisplayName(Locale.ENGLISH));
      m.put("displayLanguage_en", l.getDisplayLanguage(Locale.ENGLISH));
      m.put("displayCountry_en", l.getDisplayCountry(Locale.ENGLISH));
      m.put("displayName_self", l.getDisplayName(l));
      m.put("displayLanguage_self", l.getDisplayLanguage(l));
      m.put("displayCountry_self", l.getDisplayCountry(l));
      DecimalFormatSymbols s = DecimalFormatSymbols.getInstance(l);
      Map<String, Object> d = new LinkedHashMap<>();
      d.put("digit", cs(s.getDigit()));
      d.put("zeroDigit", cs(s.getZeroDigit()));
      d.put("decimalSeparator", cs(s.getDecimalSeparator()));
      d.put("groupingSeparator", cs(s.getGroupingSeparator()));
      d.put("patternSeparator", cs(s.getPatternSeparator()));
      d.put("percent", cs(s.getPercent()));
      d.put("perMill", cs(s.getPerMill()));
      d.put("minusSign", cs(s.getMinusSign()));
      d.put("monetaryDecimalSeparator", cs(s.getMonetaryDecimalSeparator()));
      d.put("monetaryGroupingSeparator", cs(s.getMonetaryGroupingSeparator()));
      d.put("currencySymbol", s.getCurrencySymbol());
      d.put("internationalCurrencySymbol", s.getInternationalCurrencySymbol());
      d.put("currency", safe(() -> s.getCurrency() == null ? null : s.getCurrency().getCurrencyCode()));
      d.put("exponentSeparator", s.getExponentSeparator());
      d.put("infinity", s.getInfinity());
      d.put("NaN", s.getNaN());
      m.put("decimalFormatSymbols", d);
      m.put("numberInstance", nf(NumberFormat.getNumberInstance(l)));
      m.put("getInstance", nf(NumberFormat.getInstance(l)));
      m.put("integerInstance", nf(NumberFormat.getIntegerInstance(l)));
      m.put("percentInstance", nf(NumberFormat.getPercentInstance(l)));
      m.put("currencyInstance", safe(() -> nf(NumberFormat.getCurrencyInstance(l))));
      m.put("compactShort", safe(() -> { NumberFormat f = NumberFormat.getCompactNumberInstance(l, NumberFormat.Style.SHORT); return f.format(1234567L); }));
      DateFormatSymbols ds = DateFormatSymbols.getInstance(l);
      Map<String, Object> dd = new LinkedHashMap<>();
      dd.put("eras", arr(ds.getEras()));
      dd.put("months", arr(ds.getMonths()));
      dd.put("shortMonths", arr(ds.getShortMonths()));
      dd.put("weekdays", arr(ds.getWeekdays()));
      dd.put("shortWeekdays", arr(ds.getShortWeekdays()));
      dd.put("ampm", arr(ds.getAmPmStrings()));
      dd.put("localPatternChars", ds.getLocalPatternChars());
      m.put("dateFormatSymbols", dd);
      Calendar c = Calendar.getInstance(l);
      Map<String, Object> cc = new LinkedHashMap<>();
      cc.put("class", c.getClass().getName());
      cc.put("firstDayOfWeek", c.getFirstDayOfWeek());
      cc.put("minimalDaysInFirstWeek", c.getMinimalDaysInFirstWeek());
      List<String> sm = new ArrayList<>(), lm = new ArrayList<>(), sd = new ArrayList<>(), ld = new ArrayList<>();
      for (int i = 0; i < 12; i++) {
        c.clear(); c.set(2026, i, 15);
        sm.add(c.getDisplayName(Calendar.MONTH, Calendar.SHORT_STANDALONE, l));
        lm.add(c.getDisplayName(Calendar.MONTH, Calendar.LONG_STANDALONE, l));
      }
      for (int i = 1; i <= 7; i++) {
        c.clear(); c.set(2026, 2, 15); c.set(Calendar.DAY_OF_WEEK, i);
        sd.add(c.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.SHORT_STANDALONE, l));
        ld.add(c.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG_STANDALONE, l));
      }
      cc.put("shortMonthsStandalone", sm); cc.put("longMonthsStandalone", lm);
      cc.put("shortWeekdaysStandalone(Sun..Sat)", sd); cc.put("longWeekdaysStandalone(Sun..Sat)", ld);
      m.put("calendar", cc);
      Map<String, Object> pats = new LinkedHashMap<>();
      String[] sn = {"FULL", "LONG", "MEDIUM", "SHORT"};
      int[] st = {DateFormat.FULL, DateFormat.LONG, DateFormat.MEDIUM, DateFormat.SHORT};
      for (int i = 0; i < 4; i++) {
        int k = st[i];
        pats.put("date" + sn[i], safe(() -> ((SimpleDateFormat) DateFormat.getDateInstance(k, l)).toPattern()));
        pats.put("time" + sn[i], safe(() -> ((SimpleDateFormat) DateFormat.getTimeInstance(k, l)).toPattern()));
        pats.put("dateTime" + sn[i], safe(() -> ((SimpleDateFormat) DateFormat.getDateTimeInstance(k, k, l)).toPattern()));
      }
      m.put("dateTimePatterns", pats);
      Map<String, Object> cur = new LinkedHashMap<>();
      cur.put("code", safe(() -> Currency.getInstance(l).getCurrencyCode()));
      cur.put("symbol", safe(() -> Currency.getInstance(l).getSymbol(l)));
      m.put("currency", cur);
      m.put("availableLocalesContains", Arrays.asList(Locale.getAvailableLocales()).contains(l));
      res.add(m);
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("javaVersion", System.getProperty("java.version"));
    out.put("defaultLocale", Locale.getDefault().toString());
    out.put("locales", res);
    return out;
  }
}
