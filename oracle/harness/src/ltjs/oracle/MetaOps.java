package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.markup.*;
import org.languagetool.rules.*;

import java.lang.reflect.Method;
import java.util.*;

/** Ops for X-LANG-META: lang-priority, lang-filter, lang-typo, lang-statics. Definition: docs/review/F17-oracle.md. */
final class MetaOps {
  private MetaOps() {}

  private static final Map<String, JLanguageTool> LTS = new HashMap<>();

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  private static Map<String, Object> err(Throwable t) {
    if (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) t = t.getCause();
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("error", e);
    return m;
  }

  private static Object safe(java.util.concurrent.Callable<Object> c) {
    try { return c.call(); } catch (Throwable t) { return err(t); }
  }

  private static Language lang(JsonNode a) { return Languages.getLanguageForShortCode(a.get("lang").asText()); }

  /** Rule with settable id, subId, category, issue type, tags, priority; never matches. */
  static final class MetaRule extends Rule {
    final String id, subId;
    MetaRule(JsonNode spec) {
      id = s(spec, "ruleId") != null ? s(spec, "ruleId") : s(spec, "id");
      subId = s(spec, "subId");
      if (spec.has("category") && !spec.get("category").isNull()) {
        JsonNode c = spec.get("category");
        setCategory(new Category(new CategoryId(c.get("id").asText()), c.has("name") ? c.get("name").asText() : "Meta " + c.get("id").asText(), Category.Location.INTERNAL, true));
      }
      if (spec.has("issueType") && !spec.get("issueType").isNull()) setLocQualityIssueType(ITSIssueType.valueOf(spec.get("issueType").asText()));
      if (spec.has("tags")) { List<Tag> t = new ArrayList<>(); for (JsonNode x : spec.get("tags")) t.add(Tag.valueOf(x.asText())); setTags(t); }
      if (spec.has("priority")) setPriority(spec.get("priority").asInt());
    }
    @Override public String getId() { return id; }
    @Override public String getSubId() { return subId; }
    @Override public String getDescription() { return "Meta " + id; }
    @Override public RuleMatch[] match(AnalyzedSentence sentence) { return new RuleMatch[0]; }
  }

  static Object protectedPriority(Language l, String id) throws Exception {
    for (Class<?> c = l.getClass(); c != null; c = c.getSuperclass()) {
      try { Method me = c.getDeclaredMethod("getPriorityForId", String.class); me.setAccessible(true); return me.invoke(l, id); }
      catch (NoSuchMethodException e) { /* up */ }
    }
    throw new NoSuchMethodException("getPriorityForId");
  }

  private static Map<String, Object> ruleState(Rule r) {
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("id", r.getId());
    o.put("subId", r.getSubId());
    o.put("issueType", r.getLocQualityIssueType() == null ? null : r.getLocQualityIssueType().name());
    o.put("categoryId", r.getCategory() == null ? null : r.getCategory().getId().toString());
    o.put("categoryName", r.getCategory() == null ? null : r.getCategory().getName());
    List<String> tags = new ArrayList<>();
    for (Tag t : r.getTags()) tags.add(t.name());
    o.put("tags", tags);
    o.put("priority", r.getPriority());
    return o;
  }

  // lang-priority {lang, ids?:[..], rules?:[spec], real?:bool}
  static Object priority(JsonNode a) throws Exception {
    Language l = lang(a);
    Map<String, Object> res = new LinkedHashMap<>();
    if (a.has("ids")) {
      List<Object> ids = new ArrayList<>();
      for (JsonNode id : a.get("ids")) {
        String x = id.isNull() ? null : id.asText();
        ids.add(Arrays.asList(x, safe(() -> protectedPriority(l, x))));
      }
      res.put("ids", ids);
    }
    if (a.has("rules")) {
      List<Object> rs = new ArrayList<>();
      for (JsonNode sp : a.get("rules")) {
        rs.add(safe(() -> {
          Rule r = new MetaRule(sp);
          Map<String, Object> o = ruleState(r);
          o.put("rulePriority", l.getRulePriority(r));
          return o;
        }));
      }
      res.put("rules", rs);
    }
    if (a.has("real") && a.get("real").asBoolean()) {
      JLanguageTool lt = new JLanguageTool(l);
      List<Object> rs = new ArrayList<>();
      for (Rule r : lt.getAllRules()) {
        // compact row: [fullId, categoryId, issueType, ruleOwnPriority, getRulePriority]
        rs.add(Arrays.asList(r.getFullId(), r.getCategory() == null ? null : r.getCategory().getId().toString(),
          r.getLocQualityIssueType() == null ? null : r.getLocQualityIssueType().name(), r.getPriority(), l.getRulePriority(r)));
      }
      res.put("realRules", rs);
    }
    return res;
  }

  // lang-typo {lang, strings:[..]}
  static Object typo(JsonNode a) {
    Language l = lang(a);
    List<Object> res = new ArrayList<>();
    for (JsonNode s : a.get("strings")) res.add(safe(() -> l.toAdvancedTypography(s.asText())));
    return res;
  }

  private static AnalyzedSentence sentence(Language l, String text) throws Exception {
    JLanguageTool lt = LTS.computeIfAbsent(l.getShortCodeWithCountryAndVariant(), k -> new JLanguageTool(l));
    return lt.getRawAnalyzedSentence(text);
  }

  private static Map<String, Object> dump(RuleMatch m, IdentityHashMap<Rule, Integer> ruleIdx) {
    Map<String, Object> o = ContentOps.match(m);
    o.put("fullId", m.getRule().getFullId());
    o.put("originalErrorStr", m.getOriginalErrorStr());
    o.put("ruleObject", ruleIdx.getOrDefault(m.getRule(), -1));
    o.put("ruleState", ruleState(m.getRule()));
    return o;
  }

  // lang-filter {lang, cases:[{fn, text, enabledRules?, matches:[...]}]}
  static Object filter(JsonNode a) {
    Language l = lang(a);
    List<Object> res = new ArrayList<>();
    for (JsonNode c : a.get("cases")) {
      res.add(safe(() -> {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Rule> rules = new ArrayList<>();
        Map<String, Rule> byKey = new LinkedHashMap<>();
        IdentityHashMap<Rule, Integer> idx = new IdentityHashMap<>();
        List<RuleMatch> in = new ArrayList<>();
        for (JsonNode mj : c.get("matches")) {
          String key = s(mj, "ruleKey") != null ? s(mj, "ruleKey") : mj.get("ruleId").asText() + "|" + s(mj, "subId");
          Rule r = byKey.get(key);
          if (r == null) {
            r = new MetaRule(mj);
            byKey.put(key, r);
            idx.put(r, rules.size());
            rules.add(r);
          }
          String stext = s(mj, "sentence") != null ? s(mj, "sentence") : c.get("text").asText();
          AnalyzedSentence sent = mj.has("noSentence") && mj.get("noSentence").asBoolean() ? null : sentence(l, stext);
          int from = mj.get("from").asInt(), to = mj.get("to").asInt();
          RuleMatch m = new RuleMatch(r, sent, from, to, mj.get("message").asText(), s(mj, "shortMessage"));
          if (mj.has("sentPos")) m.setSentencePosition(mj.get("sentPos").get(0).asInt(), mj.get("sentPos").get(1).asInt());
          else m.setSentencePosition(from, to);
          if (mj.has("suggestions")) {
            List<SuggestedReplacement> sr = new ArrayList<>();
            for (JsonNode x : mj.get("suggestions")) {
              if (x.isTextual()) sr.add(new SuggestedReplacement(x.asText()));
              else { SuggestedReplacement q = new SuggestedReplacement(x.get("replacement").asText(), s(x, "shortDescription"), s(x, "suffix")); sr.add(q); }
            }
            m.setSuggestedReplacementObjects(sr);
          }
          if (s(mj, "specificRuleId") != null) m.setSpecificRuleId(s(mj, "specificRuleId"));
          if (mj.has("errorStr")) {
            if (mj.get("errorStr").isBoolean()) { if (mj.get("errorStr").asBoolean()) m.setOriginalErrorStr(); }
            else m.setOriginalErrorStr(mj.get("errorStr").asText());
          }
          in.add(m);
        }
        Set<String> enabled = null;
        if (c.has("enabledRules") && !c.get("enabledRules").isNull()) { enabled = new LinkedHashSet<>(); for (JsonNode x : c.get("enabledRules")) enabled.add(x.asText()); }
        String fn = c.get("fn").asText();
        AnnotatedText at = new AnnotatedTextBuilder().addText(c.get("text").asText()).build();
        List<RuleMatch> outMatches;
        switch (fn) {
          case "filter": outMatches = l.filterRuleMatches(in, at, enabled); break;
          case "afterOverlapping": outMatches = l.filterRuleMatchesAfterOverlapping(in); break;
          case "adjustFrench": {
            outMatches = new ArrayList<>();
            Method me = l.getClass().getMethod("adjustFrenchRuleMatch", RuleMatch.class, Set.class);
            for (RuleMatch m : in) outMatches.add((RuleMatch) me.invoke(l, m, enabled));
            break;
          }
          default: throw new IllegalArgumentException("bad fn " + fn);
        }
        List<Object> ms = new ArrayList<>();
        for (RuleMatch m : outMatches) ms.add(dump(m, idx));
        out.put("matches", ms);
        List<Object> after = new ArrayList<>();
        for (Rule r : rules) after.add(ruleState(r));
        out.put("rulesAfter", after);
        return out;
      }));
    }
    return res;
  }

  // lang-statics {calls:[{fn:getInstance|new, className}]}
  static Object statics(JsonNode a) {
    List<Object> res = new ArrayList<>();
    for (JsonNode c : a.get("calls")) {
      String fn = c.get("fn").asText();
      String cn = "org.languagetool.language." + c.get("className").asText();
      res.add(safe(() -> {
        Class<?> k = Class.forName(cn);
        Object o = fn.equals("getInstance") ? k.getMethod("getInstance").invoke(null) : k.getConstructor().newInstance();
        Language l = (Language) o;
        return Arrays.asList(l.getClass().getName(), l.getShortCodeWithCountryAndVariant());
      }));
    }
    return res;
  }
}
