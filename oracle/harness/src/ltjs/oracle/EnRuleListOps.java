package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.patterns.AbstractPatternRule;

import java.lang.reflect.Method;
import java.util.*;

/** Op en-rulelist (F50): kinds direct (Language#getRelevantRules/-LanguageModelRules/-CapableRules/-RemoteRules), lt (JLanguageTool rule list, compact rows). */
final class EnRuleListOps {
  private EnRuleListOps() {}

  private static Map<String, Object> err(Throwable t) { Map<String, Object> m = new LinkedHashMap<>(); m.put("error", CheckPipeOps.errorOf(t)); return m; }

  private static Object row(Rule r) {
    List<Object> o = new ArrayList<>();
    o.add(r.getFullId());
    o.add(r.getClass().getName());
    o.add(r.getCategory() == null ? null : r.getCategory().getId().toString());
    o.add(r.isDefaultOff());
    o.add(r.isDefaultTempOff());
    o.add(r.getCategory() != null && r.getCategory().isDefaultOff());
    o.add(r.isPremium());
    o.add(r.getPriority());
    return o;
  }

  private static Object rows(List<Rule> l) { List<Object> r = new ArrayList<>(); for (Rule x : l) r.add(row(x)); return r; }

  private static Language lang(JsonNode n) { return n == null || n.isNull() ? null : Languages.getLanguageForShortCode(n.asText()); }

  /** args: {kind, lang, motherTongue?} */
  static Object run(JsonNode a) throws Exception {
    Language l = lang(a.get("lang"));
    Language mt = lang(a.get("motherTongue"));
    String kind = a.get("kind").asText();
    Map<String, Object> res = new LinkedHashMap<>();
    if (kind.equals("direct")) {
      ResourceBundle b = JLanguageTool.getMessageBundle(l);
      UserConfig uc = new UserConfig();
      try { res.put("relevantRules", rows(l.getRelevantRules(b, uc, mt, Collections.emptyList()))); } catch (Throwable t) { res.put("relevantRules", err(t)); }
      try { res.put("languageModelRulesNullLm", rows(l.getRelevantLanguageModelRules(b, null, uc))); } catch (Throwable t) { res.put("languageModelRulesNullLm", err(t)); }
      try { res.put("languageModelCapableNullLm", rows(l.getRelevantLanguageModelCapableRules(b, null, null, uc, mt, Collections.emptyList()))); } catch (Throwable t) { res.put("languageModelCapableNullLm", err(t)); }
      try { res.put("remoteRules", rows(l.getRelevantRemoteRules(b, Collections.emptyList(), null, uc, mt, Collections.emptyList(), false))); } catch (Throwable t) { res.put("remoteRules", err(t)); }
      try { res.put("hasNGramFalseFriendRule", l.hasNGramFalseFriendRule(mt)); } catch (Throwable t) { res.put("hasNGramFalseFriendRule", err(t)); }
      return res;
    }
    // lt: all rules in order with activity flags per level
    JLanguageTool lt = mt == null ? new JLanguageTool(l) : new JLanguageTool(l, mt);
    Method act = JLanguageTool.class.getDeclaredMethod("isRuleActiveForLevelAndToneTags", Rule.class, JLanguageTool.Level.class, Set.class);
    act.setAccessible(true);
    Set<Rule> active = Collections.newSetFromMap(new IdentityHashMap<>());
    active.addAll(lt.getAllActiveRules());
    List<Object> out = new ArrayList<>();
    int pattern = 0;
    for (Rule r : lt.getAllRules()) {
      List<Object> o = new ArrayList<>((List<Object>) row(r));
      o.add(active.contains(r));
      o.add((Boolean) act.invoke(null, r, JLanguageTool.Level.DEFAULT, Collections.emptySet()));
      o.add((Boolean) act.invoke(null, r, JLanguageTool.Level.PICKY, Collections.emptySet()));
      o.add(r.getSourceFile());
      o.add(r instanceof AbstractPatternRule);
      out.add(o);
    }
    res.put("columns", Arrays.asList("fullId", "class", "categoryId", "defaultOff", "defaultTempOff", "categoryDefaultOff", "premium", "priority", "activeByDefault", "levelDefault", "levelPicky", "sourceFile", "isPatternRule"));
    res.put("rules", out);
    res.put("activeCount", active.size());
    List<Object> disabled = new ArrayList<>();
    for (String s : new TreeSet<>(lt.getDisabledRules())) disabled.add(s);
    res.put("disabledRules", disabled);
    return res;
  }
}
