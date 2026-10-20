package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.translation.TranslationEntry;

import java.io.File;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Op for X-ENSPELL (F46): enspell-misc kinds prepare, inflect, beolingus, dynamic. Format: docs/review/F46-oracle.md. */
final class EnSpellOps {
  private EnSpellOps() {}

  private static int counter = 0;

  private interface C0 { Object call() throws Throwable; }

  private static Object safe(C0 c) {
    try { return c.call(); } catch (Throwable t) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", CheckPipeOps.errorOf(t)); return m; }
  }

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  private static Object invoke(Object o, String name, Class<?>[] types, Object... args) throws Throwable {
    try {
      Method m = o.getClass().getDeclaredMethod(name, types);
      m.setAccessible(true);
      return m.invoke(o, args);
    } catch (InvocationTargetException e) { throw e.getCause(); }
  }

  private static Object entries(List<TranslationEntry> l) {
    List<Object> r = new ArrayList<>();
    for (TranslationEntry e : l) r.add(Arrays.asList(e.getL1(), e.getL2(), e.getItemCount()));
    return r;
  }

  static Object misc(JsonNode a) throws Exception {
    String kind = a.get("kind").asText();
    Map<String, Object> res = new LinkedHashMap<>();
    switch (kind) {
      case "prepare": {
        Language l = Languages.getLanguageForShortCode(a.has("lang") ? a.get("lang").asText() : "en");
        res.put("class", l.getClass().getName());
        List<Object> o = new ArrayList<>();
        for (JsonNode n : a.get("lines")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("line", str(n));
          m.put("result", safe(() -> l.prepareLineForSpeller(str(n))));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "inflect": {
        Object inf = safe(() -> {
          Constructor<?> k = Class.forName("org.languagetool.rules.en.translation.Inflector").getDeclaredConstructor();
          k.setAccessible(true);
          return k.newInstance();
        });
        if (inf instanceof Map) { res.put("buildError", inf); break; }
        List<Object> o = new ArrayList<>();
        for (JsonNode c : a.get("cases")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("token", str(c.get("token")));
          m.put("tag", str(c.get("tag")));
          m.put("single", safe(() -> invoke(inf, "inflectSingleWord", new Class<?>[]{String.class, String.class}, str(c.get("token")), str(c.get("tag")))));
          m.put("inflect", safe(() -> invoke(inf, "inflect", new Class<?>[]{String.class, String.class}, str(c.get("token")), str(c.get("tag")))));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "beolingus": {
        Class<?> k = Class.forName("org.languagetool.rules.en.translation.BeoLingusTranslator");
        Path dir = Files.createDirectories(Paths.get(System.getProperty("java.io.tmpdir"), "beolingus-" + (counter++)));
        Path f = dir.resolve("beolingus.txt");
        StringBuilder sb = new StringBuilder();
        for (JsonNode n : a.get("lines")) sb.append(n.asText()).append('\n');
        Files.write(f, sb.toString().getBytes(StandardCharsets.UTF_8));
        if (a.has("missingFile")) f = dir.resolve("nonexistent.txt");
        Path ff = f;
        Object tr = safe(() -> {
          try { return k.getConstructor(File.class).newInstance(ff.toFile()); }
          catch (InvocationTargetException e) { throw e.getCause(); }
        });
        if (tr instanceof Map) { res.put("buildError", tr); break; }
        res.put("deEnSize", safe(() -> invoke(tr, "getDeEnSize", new Class<?>[0])));
        res.put("message", safe(() -> invoke(tr, "getMessage", new Class<?>[0])));
        res.put("dataSource", safe(() -> {
          Object ds = invoke(tr, "getDataSource", new Class<?>[0]);
          List<Object> fs = new ArrayList<>();
          for (String fn : new String[]{"licenseUrl", "sourceName", "sourceUrl"}) { Field fl = ds.getClass().getDeclaredField(fn); fl.setAccessible(true); fs.add(fl.get(ds)); }
          return fs;
        }));
        List<Object> o = new ArrayList<>();
        for (JsonNode c : a.get("ops")) {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("op", c);
          String fn = c.get("fn").asText();
          m.put("result", safe(() -> {
            switch (fn) {
              case "translate": return entries((List<TranslationEntry>) invoke(tr, "translate", new Class<?>[]{String.class, String.class, String.class}, str(c.get("term")), str(c.get("from")), str(c.get("to"))));
              case "split": return invoke(tr, "split", new Class<?>[]{String.class}, str(c.get("s")));
              case "splitAtSemicolon": return invoke(tr, "splitAtSemicolon", new Class<?>[]{String.class}, str(c.get("s")));
              case "clean": return invoke(tr, "cleanTranslationForReplace", new Class<?>[]{String.class, String.class}, str(c.get("s")), str(c.get("prev")));
              case "suffix": return invoke(tr, "getTranslationSuffix", new Class<?>[]{String.class}, str(c.get("s")));
              default: throw new IllegalArgumentException("fn " + fn);
            }
          }));
          o.add(m);
        }
        res.put("results", o);
        break;
      }
      case "instance": {
        // BeoLingusTranslator.getInstance(GlobalConfig) with no file / null config
        Class<?> k = Class.forName("org.languagetool.rules.en.translation.BeoLingusTranslator");
        res.put("nullConfig", safe(() -> String.valueOf(k.getMethod("getInstance", GlobalConfig.class).invoke(null, (Object) null))));
        res.put("noFile", safe(() -> String.valueOf(k.getMethod("getInstance", GlobalConfig.class).invoke(null, new GlobalConfig()))));
        break;
      }
      case "dynamic": {
        Path dir = Files.createDirectories(Paths.get(System.getProperty("java.io.tmpdir"), "dynmorf-" + (counter++)));
        String base = a.has("dict") ? a.get("dict").asText() : "en_US";
        Path dict = dir.resolve(base + ".dict");
        for (String ext : new String[]{".dict", ".info"}) {
          if (ext.equals(".info") && a.has("noInfo") && a.get("noInfo").asBoolean()) continue;
          try (java.io.InputStream in = JLanguageTool.getDataBroker().getFromResourceDirAsStream("/en/hunspell/" + base + ext)) {
            Files.copy(in, dir.resolve(base + ext));
          }
        }
        Path dp = a.has("missingDict") ? dir.resolve("none.dict") : dict;
        Object lang = safe(() -> {
          Constructor<?> k = Class.forName("org.languagetool.DynamicMorfologikLanguage").getDeclaredConstructor(String.class, String.class, File.class);
          k.setAccessible(true);
          return k.newInstance(str(a.get("name")), str(a.get("code")), dp.toFile());
        });
        if (lang instanceof Map) { res.put("buildError", lang); break; }
        Language l = (Language) lang;
        res.put("class", l.getClass().getName());
        res.put("name", l.getName());
        res.put("shortCode", l.getShortCode());
        res.put("countries", l.getCountries());
        CheckPipeOps.HarnessLT lt;
        try { lt = new CheckPipeOps.HarnessLT(l, (UserConfig) null); }
        catch (Throwable t) { res.put("ltError", CheckPipeOps.errorOf(t)); break; }
        lt.setCleanOverlappingMatches(false);
        List<String> rules = new ArrayList<>();
        for (org.languagetool.rules.Rule r : lt.getAllActiveRules()) rules.add(r.getId() + "|" + r.getClass().getName() + "|" + r.getDescription());
        res.put("activeRules", rules);
        List<Object> out = new ArrayList<>();
        for (JsonNode c : a.get("cases")) out.add(safe(() -> CheckPipeOps.runCase(lt, c)));
        res.put("cases", out);
        break;
      }
      default: throw new IllegalArgumentException("kind " + kind);
    }
    return res;
  }
}
