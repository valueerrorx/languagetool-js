package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.languagetool.*;
import org.languagetool.markup.*;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.*;
import org.languagetool.synthesis.Synthesizer;
import org.languagetool.tagging.Tagger;
import org.languagetool.tools.StringTools;

import java.io.IOException;
import java.util.*;

/** Ops for X-FILTERS: filter-run (acceptRuleMatch of generic core filters, via test subclasses of the abstract ones), filter-helper (YMDDateHelper, NewLineMatchFilter). Format: docs/review/F34-oracle.md. */
final class FilterOps {
  private FilterOps() {}

  private static String str(JsonNode n) { return n == null || n.isNull() ? null : n.asText(); }

  private static final String RULE_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rules lang=\"%s\"><category id=\"C\" name=\"c\"><rule id=\"FILTER_RULE\" name=\"r\"><pattern><token>x</token></pattern><message>m</message></rule></category></rules>\n";

  private static List<Integer> ints(JsonNode n) {
    List<Integer> l = new ArrayList<>();
    if (n != null) for (JsonNode x : n) l.add(x.asInt());
    return l;
  }

  private static Map<String, String> pairMap(JsonNode n) {
    Map<String, String> m = new HashMap<>();
    if (n != null) for (JsonNode p : n) m.put(p.get(0).asText(), str(p.get(1)));
    return m;
  }

  private static List<String> strs(JsonNode n) {
    List<String> l = new ArrayList<>();
    if (n != null) for (JsonNode x : n) l.add(x.asText());
    return l;
  }

  // ---- configurable test subclasses of the abstract date filters ----
  private static final class DateCfg {
    final JsonNode c;
    DateCfg(JsonNode c) { this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }

    Calendar calendar() { return Calendar.getInstance(Locale.forLanguageTag(c.has("locale") ? c.get("locale").asText() : "en-GB")); }

    int dayOfWeek(String s) {
      String day = c.path("trim").asBoolean(true) ? StringTools.trimSpecialCharacters(s).toLowerCase() : s.toLowerCase();
      for (JsonNode p : c.get("dayPrefix")) if (day.startsWith(p.get(0).asText())) return p.get(1).asInt();
      throw new RuntimeException("Could not find day of week for '" + s + "'");
    }

    String dayName(Calendar d) { return c.get("dayNames").get(d.get(Calendar.DAY_OF_WEEK) - 1).asText(); }

    int month(String s) {
      String mon = c.path("trim").asBoolean(true) ? StringTools.trimSpecialCharacters(s).toLowerCase() : s.toLowerCase();
      for (JsonNode p : c.get("monthPrefix")) if (mon.startsWith(p.get(0).asText())) return p.get(1).asInt();
      throw new RuntimeException("Could not find month '" + s + "'");
    }

    int dayOfMonth(String s) {
      if (c.has("dayWords")) {
        int i = 0;
        for (JsonNode w : c.get("dayWords")) { i++; if (w.asText().equals(s)) return i; }
      }
      return 0;
    }
  }

  private static final class DateCheck extends AbstractDateCheckFilter {
    final DateCfg d;
    DateCheck(JsonNode c) { d = new DateCfg(c); }
    @Override protected int getDayOfWeek(String s) { return d.dayOfWeek(s); }
    @Override protected String getDayOfWeek(Calendar date) { return d.dayName(date); }
    @Override protected int getDayOfMonth(String s) { return d.dayOfMonth(s); }
    @Override protected int getMonth(String s) { return d.month(s); }
    @Override protected Calendar getCalendar() { return d.calendar(); }
  }

  private static final class DateCheckSugg extends AbstractDateCheckWithSuggestionsFilter {
    final DateCfg d;
    DateCheckSugg(JsonNode c) { d = new DateCfg(c); }
    @Override protected int getDayOfWeek(String s) { return d.dayOfWeek(s); }
    @Override protected String getDayOfWeek(Calendar date) { return d.dayName(date); }
    @Override protected int getDayOfMonth(String s) { return d.dayOfMonth(s); }
    @Override protected int getMonth(String s) { return d.month(s); }
    @Override protected Calendar getCalendar() { return d.calendar(); }
    @Override protected String getErrorMessageWrongYear() { return d.c.path("wrongYear").asText("wrong year {currentYear}"); }

    @Override protected String getDayStrLikeOriginal(String day, String original) {
      if (!"en".equals(d.c.path("dayStrLike").asText(null))) return day;
      if (StringTools.isNumeric(original)) return day;
      int number = Integer.parseInt(day);
      if (number >= 11 && number <= 13) return number + "th";
      switch (number % 10) {
        case 1: return number + "st";
        case 2: return number + "nd";
        case 3: return number + "rd";
        default: return number + "th";
      }
    }

    @Override protected String adjustSuggestion(String sugg) {
      if (!"de".equals(d.c.path("adjust").asText(null))) return sugg;
      int dotCommaPos = sugg.indexOf(".,");
      if (dotCommaPos > 5 && dotCommaPos < 12) return sugg.replace(".,", ",");
      int commaPos = sugg.indexOf(",");
      if (dotCommaPos < 0 && commaPos > 0 && commaPos < 5) return sugg.replace(",", ".,");
      return sugg;
    }
  }

  private static final class Future extends AbstractFutureDateFilter {
    final DateCfg d;
    Future(JsonNode c) { d = new DateCfg(c); }
    @Override protected int getDayOfMonth(String s) { return d.dayOfMonth(s); }
    @Override protected int getMonth(String s) { return d.month(s); }
    @Override protected Calendar getCalendar() { return d.calendar(); }
  }

  private static final class NewYear extends AbstractNewYearDateFilter {
    final DateCfg d;
    NewYear(JsonNode c) { d = new DateCfg(c); }
    @Override protected int getDayOfMonth(String s) { return d.dayOfMonth(s); }
    @Override protected int getMonth(String s) { return d.month(s); }
    @Override protected Calendar getCalendar() { return d.calendar(); }
  }

  // ---- PartialPosTagFilter: mode "demo" = DemoPartialPosTagFilter, "tagger" = raw tagger of the language, "disamb" = tagger + language disambiguator ----
  private static final class PartialPos extends PartialPosTagFilter {
    final Language l;
    final String mode;
    PartialPos(Language l, String mode) { this.l = l; this.mode = mode; }
    @Override protected List<AnalyzedTokenReadings> tag(String token) {
      try {
        if (mode.equals("demo")) {
          if ("accurate".equals(token)) {
            List<AnalyzedTokenReadings> result = new ArrayList<>();
            result.add(new AnalyzedTokenReadings(Collections.singletonList(new AnalyzedToken(token, "JJ", "fake")), 0));
            return result;
          }
          return null;
        }
        List<AnalyzedTokenReadings> tags = l.getTagger().tag(Collections.singletonList(token));
        if (mode.equals("disamb")) {
          AnalyzedSentence d = l.getDisambiguator().disambiguate(new AnalyzedSentence(tags.toArray(new AnalyzedTokenReadings[0])));
          return Arrays.asList(d.getTokens());
        }
        return tags;
      } catch (IOException e) {
        throw new RuntimeException("Could not tag '" + token + "'", e);
      }
    }
  }

  // ---- AbstractFindSuggestionsFilter with a stub speller (cfg.spell: token -> suggestions) ----
  private static final class FindSugg extends AbstractFindSuggestionsFilter {
    final Language l;
    final JsonNode c;
    FindSugg(Language l, JsonNode c) { this.l = l; this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected Tagger getTagger() { return l.getTagger(); }
    @Override protected List<String> getSpellingSuggestions(AnalyzedTokenReadings atr) {
      JsonNode s = c.path("spell").get(atr.getToken());
      return s == null ? new ArrayList<>() : strs(s);
    }
    @Override protected Synthesizer getSynthesizer() { return c.path("synth").asBoolean(false) ? l.getSynthesizer() : null; }
    @Override protected boolean isSuggestionException(AnalyzedTokenReadings a) {
      return c.has("excRegex") && a.getToken().matches(c.get("excRegex").asText());
    }
    @Override protected String cleanSuggestion(String s) { return c.path("clean").asBoolean(false) ? s.replace("-", "") : s; }
    @Override protected String preProcessWrongWord(String w) { return c.path("pre").asBoolean(false) ? w.toUpperCase() : super.preProcessWrongWord(w); }
  }

  private static final class AdvSynth extends AbstractAdvancedSynthesizerFilter {
    final JsonNode c;
    AdvSynth(JsonNode c) { this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected boolean isSuggestionException(String token, String desiredPostag) {
      return c.has("excRegex") && token.matches(c.get("excRegex").asText());
    }
    @Override protected String getNewLemma(String word, String newLemma) {
      return c.path("newLemma").asBoolean(false) && word != null ? word + newLemma.substring(1) : null;
    }
  }

  private static final class Suppress extends AbstractSuppressMisspelledSuggestionsFilter {
    Suppress() { super(); }
  }

  private static final class NumberInWord extends AbstractNumberInWordFilter {
    final JsonNode c;
    NumberInWord(Language l, JsonNode c) { super(l); this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected boolean isMisspelled(String word) { for (JsonNode w : c.path("misspelled")) if (w.asText().equals(word)) return true; return false; }
    @Override protected List<String> getSuggestions(String word) {
      JsonNode s = c.path("spell").get(word);
      return s == null ? new ArrayList<>() : strs(s);
    }
  }

  private static final class Contractions extends AbstractMakeContractionsFilter {
    final JsonNode c;
    Contractions(JsonNode c) { this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected String fixContractions(String s) {
      for (JsonNode p : c.path("pairs")) s = s.replace(p.get(0).asText(), p.get(1).asText());
      return s;
    }
  }

  private static final class TextToNumber extends AbstractTextToNumberFilter {
    static {
      String[] n = {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "twenty", "thirty", "forty", "fifty", "ninety"};
      float[] v = {0f, 1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f, 9f, 10f, 11f, 12f, 20f, 30f, 40f, 50f, 90f};
      for (int i = 0; i < n.length; i++) numbers.put(n[i], v[i]);
      numbers.put("half", 0.5f);
      numbers.put("tenth", 0.1f);
      numbers.put("hundredth", 0.01f);
      numbers.put("big", 16777217f);
      multipliers.put("hundred", 100f);
      multipliers.put("thousand", 1000f);
      multipliers.put("million", 1000000f);
      multipliers.put("billion", 1000000000f);
      multipliers.put("trillion", 1e12f);
      multipliers.put("quadrillion", 1e20f);
    }
    final JsonNode c;
    TextToNumber(JsonNode c) { this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected boolean isComma(String s) { return s.equals(",") || s.equals("point"); }
    @Override protected boolean isPercentage(AnalyzedTokenReadings[] t, int i) { return t[i].getToken().equals("%") || t[i].getToken().equals("percent"); }
    @Override protected String formatResult(String s) { return c.path("brackets").asBoolean(false) ? "[" + s + "]" : s; }
    @Override protected List<String> tokenize(String s) {
      if (c.path("splitDash").asBoolean(false)) return Arrays.asList(s.split("-"));
      return super.tokenize(s);
    }
  }

  private static final class SentenceCase extends ConvertToSentenceCaseFilter {
    final JsonNode c;
    SentenceCase(JsonNode c) { this.c = c == null ? JsonNodeFactory.instance.objectNode() : c; }
    @Override protected boolean tokenIsException(String s) { for (JsonNode w : c.path("exceptions")) if (w.asText().equals(s)) return true; return false; }
  }

  private static final Map<String, JsonNode> CFG = new HashMap<>();

  /** {name, cfg} registers a named filter configuration of this case (requests refer to it as filter.cfgRef) */
  static Object filterCfg(JsonNode a) {
    CFG.put(a.get("name").asText(), a.get("cfg"));
    return "ok";
  }

  private static RuleFilter create(Language l, JsonNode f) throws Exception {
    JsonNode c = f.has("cfgRef") ? CFG.get(f.get("cfgRef").asText()) : f.get("cfg");
    if (f.has("cls")) return RuleFilterCreator.getInstance().getFilter(f.get("cls").asText());
    switch (f.get("test").asText()) {
      case "datecheck": return new DateCheck(c);
      case "datecheck-sugg": return new DateCheckSugg(c);
      case "future": return new Future(c);
      case "newyear": return new NewYear(c);
      case "partialpos": return new PartialPos(l, c.path("mode").asText("tagger"));
      case "findsugg": return new FindSugg(l, c);
      case "advsynth": return new AdvSynth(c);
      case "suppress": return new Suppress();
      case "numberinword": return new NumberInWord(l, c);
      case "contractions": return new Contractions(c);
      case "texttonumber": return new TextToNumber(c);
      case "sentencecase": return new SentenceCase(c);
      default: throw new IllegalArgumentException("unknown test filter " + f.get("test").asText());
    }
  }

  static Object tokensOf(AnalyzedSentence s) {
    List<Object> o = new ArrayList<>();
    for (AnalyzedTokenReadings t : s.getTokensWithoutWhitespace()) o.add(Arrays.asList(t.getToken(), t.getStartPos(), t.getEndPos(), t.isWhitespaceBefore()));
    return o;
  }

  /** {lang, filter:{cls}|{test,cfg}, text:string|{syn}, args:[[k,v]], from, to, message?, shortMessage?, suggestions?, patternTokenPos, tokenPositions, window?} -> {tokens, result, inAfter} | {error} */
  static Object filterRun(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    try {
      String xml = String.format(RULE_XML, l.getShortCode());
      ObjectNodeHolder h = new ObjectNodeHolder(a, xml);
      AbstractPatternRule rule = RuleInfraOps.rules(h.a).get(0);
      AnalyzedSentence s = RuleMatchOps.sentence(l, a.get("text"));
      AnalyzedTokenReadings[] all = s.getTokensWithoutWhitespace();
      AnalyzedTokenReadings[] pt = a.has("window") ? Arrays.copyOfRange(all, a.get("window").get(0).asInt(), a.get("window").get(1).asInt()) : all;
      RuleMatch m = new RuleMatch(rule, s, a.get("from").asInt(), a.get("to").asInt(), a.has("message") ? a.get("message").asText() : "msg", str(a.get("shortMessage")));
      if (a.has("suggestions")) m.setSuggestedReplacements(strs(a.get("suggestions")));
      if (!a.has("setOriginal") || a.get("setOriginal").asBoolean()) m.setOriginalErrorStr(); // PatternRuleMatcher#createRuleMatch builds the match with setOriginalErrorStr=true
      Map<String, Object> o = new LinkedHashMap<>();
      if (a.has("dumpTokens")) o.put("tokens", tokensOf(s));
      String pre = RuleMatchOps.dump(m).toString();
      RuleFilter f = create(l, a.get("filter"));
      RuleMatch r;
      try {
        r = f.acceptRuleMatch(m, pairMap(a.get("args")), a.get("patternTokenPos").asInt(), pt, ints(a.get("tokenPositions")));
      } catch (Throwable t) {
        o.put("result", RuleInfraOps.err(t));
        if (!RuleMatchOps.dump(m).toString().equals(pre)) o.put("inAfter", RuleMatchOps.dump(m));
        return o;
      }
      if (r == null) o.put("result", null);
      else {
        Map<String, Object> ro = new LinkedHashMap<>();
        ro.put("same", r == m);
        if (r != m) ro.put("dump", RuleMatchOps.dump(r));
        o.put("result", ro);
      }
      if (!RuleMatchOps.dump(m).toString().equals(pre)) o.put("inAfter", RuleMatchOps.dump(m));
      return o;
    } catch (Throwable t) {
      return RuleInfraOps.err(t);
    }
  }

  private static final class ObjectNodeHolder {
    final JsonNode a;
    ObjectNodeHolder(JsonNode src, String xml) {
      com.fasterxml.jackson.databind.node.ObjectNode o = JsonNodeFactory.instance.objectNode();
      o.put("lang", src.get("lang").asText());
      o.put("xml", xml);
      this.a = o;
    }
  }

  /** {kind:"ymd", method:"parseDate"|"correctDate", args:[[k,v]], message?} | {kind:"newline", text, matches:[{from,to,suggestions[],message?}]} */
  static Object filterHelper(JsonNode a) throws Exception {
    try {
      switch (a.get("kind").asText()) {
        case "ymd": {
          YMDDateHelper h = new YMDDateHelper();
          Map<String, String> args = pairMap(a.get("args"));
          Map<String, Object> o = new LinkedHashMap<>();
          if (a.get("method").asText().equals("parseDate")) {
            Map<String, String> r = h.parseDate(args);
            o.put("same", r == args);
            List<Object> p = new ArrayList<>();
            for (String k : new TreeSet<>(r.keySet())) p.add(Arrays.asList(k, r.get(k)));
            o.put("pairs", p);
            return o;
          }
          Language l = RuleLoadOps.lang(a.get("lang").asText());
          AbstractPatternRule rule = RuleInfraOps.rules(new ObjectNodeHolder(a, String.format(RULE_XML, l.getShortCode())).a).get(0);
          AnalyzedSentence s = RuleMatchOps.sentence(l, a.get("text"));
          RuleMatch m = new RuleMatch(rule, s, a.get("from").asInt(), a.get("to").asInt(), a.get("message").asText(), str(a.get("shortMessage")));
          RuleMatch r = h.correctDate(m, args);
          o.put("dump", RuleMatchOps.dump(r));
          return o;
        }
        case "newline": {
          Language l = RuleLoadOps.lang(a.get("lang").asText());
          AbstractPatternRule rule = RuleInfraOps.rules(new ObjectNodeHolder(a, String.format(RULE_XML, l.getShortCode())).a).get(0);
          String text = a.get("text").asText();
          List<RuleMatch> in = new ArrayList<>();
          for (JsonNode mn : a.get("matches")) {
            RuleMatch m = new RuleMatch(rule, null, mn.get("from").asInt(), mn.get("to").asInt(), "msg");
            if (mn.has("suggestions")) m.setSuggestedReplacements(strs(mn.get("suggestions")));
            in.add(m);
          }
          AnnotatedText at = new AnnotatedTextBuilder().addText(text).build();
          List<RuleMatch> out = new NewLineMatchFilter().filter(in, at);
          Map<String, Object> o = new LinkedHashMap<>();
          List<Object> d = new ArrayList<>();
          for (RuleMatch m : out) {
            Map<String, Object> x = new LinkedHashMap<>();
            int ix = -1;
            for (int i = 0; i < in.size(); i++) if (in.get(i) == m) ix = i;
            x.put("in", ix);
            x.put("from", m.getFromPos());
            x.put("to", m.getToPos());
            x.put("suggestions", new ArrayList<>(m.getSuggestedReplacements()));
            d.add(x);
          }
          o.put("kept", d);
          List<Object> after = new ArrayList<>();
          for (RuleMatch m : in) after.add(Arrays.asList(m.getFromPos(), m.getToPos(), new ArrayList<>(m.getSuggestedReplacements())));
          o.put("inAfter", after);
          return o;
        }
        default: throw new IllegalArgumentException("unknown helper kind " + a.get("kind").asText());
      }
    } catch (Throwable t) {
      return RuleInfraOps.err(t);
    }
  }
}
