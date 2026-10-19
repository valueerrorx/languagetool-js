package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.translation.*;
import org.languagetool.tools.*;

import java.io.*;
import java.lang.reflect.Constructor;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.*;

/** Ops for X-TOOLS (F40): tools-correct, tools-misc, tools-diffs, tools-util, tools-lmwarn, tools-rules. Format: docs/review/F40-oracle.md. */
final class ToolsOps {
  private ToolsOps() {}

  private static final Map<String, JLanguageTool> LTS = new HashMap<>();

  private static JLanguageTool lt(String code) {
    return LTS.computeIfAbsent(code, k -> new JLanguageTool(Languages.getLanguageForShortCode(code)));
  }

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  private static List<String> strs(JsonNode n) {
    List<String> l = new ArrayList<>();
    if (n != null) for (JsonNode x : n) l.add(x.asText());
    return l;
  }

  /** {lang, texts, ids?} -> per text corrected text | {contents, matches:[{from,to,replacements}]} fromMatches */
  static Object correct(JsonNode a) throws Exception {
    List<Object> out = new ArrayList<>();
    if (a.has("matchSets")) {
      for (JsonNode set : a.get("matchSets")) {
        Map<String, Object> r = new LinkedHashMap<>();
        String contents = set.get("contents").asText();
        r.put("contents", contents);
        try {
          List<RuleMatch> ms = new ArrayList<>();
          for (JsonNode m : set.get("matches")) {
            RuleMatch rm = new RuleMatch(new FakeRule(), null, m.get("from").asInt(), m.get("to").asInt(), "msg");
            if (m.has("replacements")) rm.setSuggestedReplacements(strs(m.get("replacements")));
            ms.add(rm);
          }
          r.put("result", Tools.correctTextFromMatches(contents, ms));
        } catch (Throwable t) { r.put("error", CheckPipeOps.errorOf(t)); }
        out.add(r);
      }
      return out;
    }
    JLanguageTool lt = lt(a.get("lang").asText());
    if (a.has("ids")) {
      Set<String> ids = new HashSet<>(strs(a.get("ids")));
      for (Rule r : lt.getAllRules()) if (!ids.contains(r.getId())) lt.disableRule(r.getId());
    }
    for (JsonNode t : a.get("texts")) {
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("text", t.asText());
      try {
        r.put("result", Tools.correctText(t.asText(), lt));
        r.put("matches", lt.check(t.asText()).size());
      } catch (Throwable e) { r.put("error", CheckPipeOps.errorOf(e)); }
      out.add(r);
    }
    return out;
  }

  private static String hex(byte[] b) {
    StringBuilder sb = new StringBuilder();
    for (byte x : b) sb.append(String.format("%02x", x));
    return sb.toString();
  }

  /** {fn, ...} */
  static Object misc(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    try {
      switch (a.get("fn").asText()) {
        case "stacktrace": {
          Throwable t = new IllegalStateException(a.get("message").asText());
          if (a.has("cause")) t = new RuntimeException(a.get("message").asText(), new IOException(a.get("cause").asText()));
          String st = Tools.getFullStackTrace(t);
          String[] lines = st.split("\\R");
          res.put("firstLine", lines[0]);
          res.put("hasAtLines", st.contains("\n\tat "));
          res.put("hasCausedBy", st.contains("Caused by: java.io.IOException: " + (a.has("cause") ? a.get("cause").asText() : "")) && a.has("cause"));
          res.put("endsWithNewline", st.endsWith(System.lineSeparator()));
          break;
        }
        case "getStream": {
          String path = a.get("path").asText();
          String hash = s(a, "hash");
          if ("SELF".equals(hash)) {
            try (InputStream is = Tools.getStream(path)) { hash = hex(MessageDigest.getInstance("SHA-256").digest(is.readAllBytes())); }
            res.put("selfHashLength", hash.length());
          }
          if (a.has("hash")) {
            if (a.has("upper")) hash = hash.toUpperCase();
            try (InputStream is = Tools.getStream(path, hash)) { byte[] d = is.readAllBytes(); res.put("length", d.length); res.put("sha256", hex(MessageDigest.getInstance("SHA-256").digest(d))); }
          } else {
            try (InputStream is = Tools.getStream(path)) { byte[] d = is.readAllBytes(); res.put("length", d.length); res.put("sha256", hex(MessageDigest.getInstance("SHA-256").digest(d))); }
          }
          break;
        }
        case "getUrl": {
          java.net.URL u = Tools.getUrl(a.get("url").asText());
          res.put("url", u.toString());
          res.put("protocol", u.getProtocol());
          res.put("host", u.getHost());
          res.put("path", u.getPath());
          break;
        }
        case "paragraphEnd": {
          JLanguageTool lt = lt(a.get("lang").asText());
          List<AnalyzedSentence> sents = new ArrayList<>();
          List<String> texts = new ArrayList<>();
          if (a.has("sentences")) texts = strs(a.get("sentences")); else texts = lt.sentenceTokenize(a.get("text").asText());
          for (String t : texts) sents.add(lt.getAnalyzedSentence(t));
          res.put("sentences", texts);
          res.put("singleLineBreaksMarksPara", lt.getLanguage().getSentenceTokenizer().singleLineBreaksMarksPara());
          List<Object> r = new ArrayList<>();
          int lo = a.has("lo") ? a.get("lo").asInt() : 0, hi = a.has("hi") ? a.get("hi").asInt() : texts.size() + 1;
          for (int n = lo; n <= hi; n++) r.add(Tools.isParagraphEnd(sents, n, lt.getLanguage()));
          res.put("lo", lo);
          res.put("results", r);
          break;
        }
        case "profile": {
          JLanguageTool lt = lt(a.get("lang").asText());
          Rule rule = null;
          for (Rule x : lt.getAllRules()) if (x.getId().equals(a.get("ruleId").asText())) { rule = x; break; }
          res.put("ruleFound", rule != null);
          res.put("count", Tools.profileRulesOnLine(a.get("text").asText(), lt, rule));
          break;
        }
        case "linguServices": {
          res.put("isExternSpeller", Tools.isExternSpeller());
          res.put("services", Tools.getLinguisticServices());
          Tools.setLinguisticServices(null);
          res.put("afterSetNull", Tools.isExternSpeller());
          break;
        }
        case "i18n": {
          ResourceBundle mb = JLanguageTool.getMessageBundle(Languages.getLanguageForShortCode(a.get("lang").asText()));
          List<Object> args = new ArrayList<>();
          for (JsonNode x : a.get("args")) args.add(x.isNumber() ? (Object) x.asInt() : x.asText());
          res.put("text", Tools.i18n(mb, a.get("key").asText(), args.toArray()));
          break;
        }
        default: throw new IllegalArgumentException("fn " + a.get("fn"));
      }
    } catch (Throwable t) {
      res.put("error", CheckPipeOps.errorOf(t));
    }
    return res;
  }

  /** {pairs:[{orig,rev,joins?:[[from,to]]}]} */
  static Object diffs(JsonNode a) throws Exception {
    List<Object> out = new ArrayList<>();
    for (JsonNode p : a.get("pairs")) {
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("orig", p.get("orig").asText());
      r.put("rev", p.get("rev").asText());
      try {
        DiffsAsMatches d = new DiffsAsMatches();
        List<PseudoMatch> ms = d.getPseudoMatches(p.get("orig").asText(), p.get("rev").asText());
        List<Object> l = new ArrayList<>();
        for (PseudoMatch m : ms) l.add(Arrays.asList(m.getFromPos(), m.getToPos(), m.getReplacements(), m.getReplacement(), m.toString()));
        r.put("matches", l);
        if (p.has("joins")) {
          List<Object> js = new ArrayList<>();
          for (JsonNode j : p.get("joins")) {
            PseudoMatch jm = d.getJoinedMatch(ms, p.get("orig").asText(), j.get(0).asInt(), j.get(1).asInt());
            js.add(jm == null ? null : Arrays.asList(jm.getFromPos(), jm.getToPos(), jm.getReplacements()));
          }
          r.put("joined", js);
        }
      } catch (Throwable t) { r.put("error", CheckPipeOps.errorOf(t)); }
      out.add(r);
    }
    return out;
  }

  /** {kind, ...} */
  static Object util(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    try {
      switch (a.get("kind").asText()) {
        case "multikey": {
          MultiKeyProperties p = new MultiKeyProperties(new ByteArrayInputStream(a.get("content").asText().getBytes(StandardCharsets.UTF_8)));
          Map<String, Object> vals = new LinkedHashMap<>();
          for (JsonNode k : a.get("keys")) vals.put(k.asText(), p.getProperty(k.asText()));
          res.put("values", vals);
          break;
        }
        case "ics": {
          String text = a.get("text").asText();
          InterruptibleCharSequence q = new InterruptibleCharSequence(text);
          res.put("length", q.length());
          res.put("toString", q.toString());
          if (a.has("charAt")) { List<Object> cs = new ArrayList<>(); for (JsonNode i : a.get("charAt")) { try { cs.add(String.valueOf(q.charAt(i.asInt()))); } catch (Throwable t) { cs.add(CheckPipeOps.errorOf(t)); } } res.put("charAt", cs); }
          if (a.has("sub")) {
            try { CharSequence sub = q.subSequence(a.get("sub").get(0).asInt(), a.get("sub").get(1).asInt()); res.put("sub", sub.toString()); res.put("subClass", sub.getClass().getSimpleName()); }
            catch (Throwable t) { res.put("subError", CheckPipeOps.errorOf(t)); }
          }
          if (a.has("regex")) {
            Matcher m = Pattern.compile(a.get("regex").asText()).matcher(q);
            List<Object> hits = new ArrayList<>();
            while (m.find()) hits.add(Arrays.asList(m.start(), m.end(), m.group()));
            res.put("hits", hits);
          }
          if (a.has("interrupted") && a.get("interrupted").asBoolean()) {
            Thread.currentThread().interrupt();
            try {
              if (a.has("regex")) { Matcher m = Pattern.compile(a.get("regex").asText()).matcher(q); res.put("findAfterInterrupt", m.find()); }
              else res.put("charAtAfterInterrupt", String.valueOf(q.charAt(0)));
            } catch (Throwable t) { res.put("interruptError", CheckPipeOps.errorOf(t)); }
            res.put("flagAfter", Thread.currentThread().isInterrupted());
            Thread.interrupted();
          }
          break;
        }
        case "msmm": {
          Map<String, List<String>> src = new LinkedHashMap<>();
          Iterator<Map.Entry<String, JsonNode>> it = a.get("contents").fields();
          while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); src.put(e.getKey(), strs(e.getValue())); }
          MostlySingularMultiMap<String, String> m = new MostlySingularMultiMap<>(src);
          Map<String, Object> vals = new LinkedHashMap<>();
          for (JsonNode k : a.get("keys")) vals.put(k.asText(), m.getList(k.asText()));
          res.put("values", vals);
          break;
        }
        case "stack": {
          Constructor<?> c = Class.forName("org.languagetool.rules.UnsyncStack").getDeclaredConstructor();
          c.setAccessible(true);
          @SuppressWarnings("unchecked") UnsyncStack<String> st = (UnsyncStack<String>) c.newInstance();
          List<Object> log = new ArrayList<>();
          for (JsonNode o : a.get("ops")) {
            String op = o.get(0).asText();
            try {
              switch (op) {
                case "push": log.add(st.push(o.get(1).asText())); break;
                case "pop": log.add(st.pop()); break;
                case "peek": log.add(st.peek()); break;
                case "empty": log.add(st.empty()); break;
                case "search": log.add(st.search(o.get(1).asText())); break;
                case "size": log.add(st.size()); break;
                case "toString": log.add(st.toString()); break;
                default: log.add("?");
              }
            } catch (Throwable t) { log.add(CheckPipeOps.errorOf(t)); }
          }
          res.put("log", log);
          break;
        }
        case "interner": {
          List<Object> r = new ArrayList<>();
          for (JsonNode x : a.get("strings")) {
            String orig = new String(x.asText());
            String i1 = StringInterner.intern(orig);
            String i2 = StringInterner.intern(new String(x.asText()));
            r.add(Arrays.asList(i1, i1.equals(orig), i1 == i2));
          }
          res.put("results", r);
          break;
        }
        case "markers": {
          List<String> m = new ArrayList<>();
          for (org.slf4j.Marker x : Arrays.asList(LoggingTools.INIT, LoggingTools.CHECK, LoggingTools.REQUEST, LoggingTools.BAD_REQUEST, LoggingTools.AUTH, LoggingTools.SYSTEM, LoggingTools.DB, LoggingTools.REDIS, LoggingTools.CACHE)) m.add(x.getName());
          res.put("markers", m);
          res.put("sameInstance", LoggingTools.REQUEST == org.slf4j.MarkerFactory.getMarker("REQUEST"));
          break;
        }
        case "jna": {
          res.put("before", System.getProperty("jna.nosys"));
          JnaTools.setBugWorkaroundProperty();
          res.put("after", System.getProperty("jna.nosys"));
          break;
        }
        case "testHack": {
          res.put("isJUnitTest", TestHackHelper.isJUnitTest());
          break;
        }
        case "translation": {
          List<Object> r = new ArrayList<>();
          for (JsonNode e : a.get("entries")) {
            TranslationEntry t = new TranslationEntry(strs(e.get("l1")), strs(e.get("l2")), e.get("n").asInt());
            TranslationEntry u = new TranslationEntry(strs(e.get("l1")), strs(e.get("l2")), e.get("n").asInt() + 1);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("toString", t.toString());
            m.put("itemCount", t.getItemCount());
            m.put("equalsOtherCount", t.equals(u));
            m.put("equalsSelf", t.equals(t));
            m.put("equalsNull", t.equals(null));
            m.put("equalsString", t.equals("x"));
            m.put("hashEqual", t.hashCode() == u.hashCode());
            m.put("hash", t.hashCode());
            r.add(m);
          }
          res.put("entries", r);
          try { new TranslationEntry(null, new ArrayList<>(), 1); } catch (Throwable t) { res.put("nullL1", CheckPipeOps.errorOf(t)); }
          TranslationData d = new TranslationData(Arrays.asList(new TranslationEntry(Arrays.asList("a"), Arrays.asList("b"), 1)), null);
          res.put("data", d.getTranslations().toString());
          break;
        }
        default: throw new IllegalArgumentException("kind " + a.get("kind"));
      }
    } catch (Throwable t) {
      res.put("error", CheckPipeOps.errorOf(t));
    }
    return res;
  }

  /** {lang, dir, makeSub?, instances:[{calls}]} -> captured stderr per instance */
  static Object lmWarn(JsonNode a) throws Exception {
    List<Object> out = new ArrayList<>();
    String dir = a.get("dir").asText();
    if (a.has("makeSub")) new File(dir, a.get("makeSub").asText()).mkdirs();
    PrintStream old = System.err;
    for (JsonNode inst : a.get("instances")) {
      Map<String, Object> r = new LinkedHashMap<>();
      Language l = (Language) Class.forName(a.get("class").asText()).getConstructor().newInstance();
      List<Object> calls = new ArrayList<>();
      for (int i = 0; i < inst.get("calls").asInt(); i++) {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        System.setErr(new PrintStream(bo, true, "UTF-8"));
        Map<String, Object> c = new LinkedHashMap<>();
        try {
          Object lm = l.getLanguageModel(new File(s(inst, "dir") == null ? dir : inst.get("dir").asText()));
          c.put("model", lm == null ? null : lm.getClass().getSimpleName());
        } catch (Throwable t) { c.put("error", CheckPipeOps.errorOf(t)); }
        finally { System.setErr(old); }
        c.put("stderr", bo.toString("UTF-8"));
        calls.add(c);
      }
      r.put("calls", calls);
      out.add(r);
    }
    return out;
  }

  /** {what:"demo"|"fake"|"specific", ...} */
  static Object rules(JsonNode a) throws Exception {
    Map<String, Object> res = new LinkedHashMap<>();
    try {
      switch (a.get("what").asText()) {
        case "demo": {
          JLanguageTool lt = lt(a.get("lang").asText());
          DemoRule rule = new DemoRule();
          res.put("info", BitextOps.ruleInfo(rule));
          List<Object> out = new ArrayList<>();
          for (JsonNode t : a.get("texts")) {
            Map<String, Object> r = new LinkedHashMap<>();
            PrintStream old = System.out;
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            System.setOut(new PrintStream(bo, true, "UTF-8"));
            try {
              List<Object> ms = new ArrayList<>();
              for (RuleMatch m : rule.match(lt.getAnalyzedSentence(t.asText()))) ms.add(CheckPipeOps.matchDump(m));
              r.put("matches", ms);
            } catch (Throwable e) { r.put("error", CheckPipeOps.errorOf(e)); }
            finally { System.setOut(old); }
            r.put("text", t.asText());
            r.put("stdout", bo.toString("UTF-8"));
            out.add(r);
          }
          res.put("texts", out);
          break;
        }
        case "fake": {
          List<Object> out = new ArrayList<>();
          for (JsonNode id : a.get("ids")) {
            FakeRule r = id.isNull() ? new FakeRule() : a.has("tag") ? new FakeRule(id.asText(), Tag.valueOf(a.get("tag").asText())) : new FakeRule(id.asText());
            Map<String, Object> m = BitextOps.ruleInfo(r);
            List<String> tags = new ArrayList<>();
            for (Tag t : r.getTags()) tags.add(t.name());
            m.put("tags", tags);
            m.put("matchLength", r.match(new JLanguageTool(Languages.getLanguageForShortCode("en")).getAnalyzedSentence("Test.")).length);
            out.add(m);
          }
          res.put("rules", out);
          break;
        }
        case "specific": {
          List<Object> out = new ArrayList<>();
          for (JsonNode c : a.get("specs")) {
            Map<String, Object> m = new LinkedHashMap<>();
            try {
              List<Tag> tags = new ArrayList<>();
              for (String t : strs(c.get("tags"))) tags.add(Tag.valueOf(t));
              Category cat = c.has("category") ? new Category(new CategoryId(c.get("category").asText()), c.get("categoryName").asText()) : null;
              ITSIssueType it = c.has("issueType") ? ITSIssueType.getIssueType(c.get("issueType").asText()) : null;
              SpecificIdRule r = new SpecificIdRule(s(c, "id"), s(c, "desc"), c.has("premium") && c.get("premium").asBoolean(), cat, it, tags);
              m = BitextOps.ruleInfo(r);
              m.put("premium", r.isPremium());
              List<String> tg = new ArrayList<>();
              for (Tag t : r.getTags()) tg.add(t.name());
              m.put("tags", tg);
            } catch (Throwable t) { m.put("error", CheckPipeOps.errorOf(t)); }
            out.add(m);
          }
          res.put("rules", out);
          break;
        }
        default: throw new IllegalArgumentException("what");
      }
    } catch (Throwable t) { res.put("error", CheckPipeOps.errorOf(t)); }
    return res;
  }
}
