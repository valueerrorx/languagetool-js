package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.tools.Tools;

import java.util.*;

/** Op for X-STYLE (F36): style-check. Format: docs/review/F36-oracle.md. */
final class StyleOps {
  private StyleOps() {}

  /** {lang, ids:[ruleId], config:{ruleId:[int|bool]}, extra:[core class simple name], level, cases:[...]} -> {selected, active, cases} or {buildError}. */
  static Object check(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Map<String, Object> res = new LinkedHashMap<>();
    CheckPipeOps.HarnessLT lt;
    try {
      Map<String, Object[]> cv = new LinkedHashMap<>();
      if (a.has("config")) {
        Iterator<Map.Entry<String, JsonNode>> it = a.get("config").fields();
        while (it.hasNext()) {
          Map.Entry<String, JsonNode> e = it.next();
          List<Object> vs = new ArrayList<>();
          for (JsonNode v : e.getValue()) vs.add(v.isBoolean() ? (Object) v.asBoolean() : v.isTextual() ? v.asText() : (Object) v.asInt());
          cv.put(e.getKey(), vs.toArray());
        }
      }
      lt = new CheckPipeOps.HarnessLT(l, a.has("config") ? new UserConfig(cv) : (UserConfig) null);
    } catch (Throwable t) {
      res.put("buildError", CheckPipeOps.errorOf(t));
      return res;
    }
    lt.setCleanOverlappingMatches(false);
    Set<String> enabled = new LinkedHashSet<>();
    for (JsonNode i : a.get("ids")) enabled.add(i.asText());
    List<String> selected = new ArrayList<>();
    if (a.has("extra")) {
      java.util.ResourceBundle mb = JLanguageTool.getMessageBundle(l);
      for (JsonNode n : a.get("extra")) {
        Class<?> k = Class.forName(n.asText().contains(".") ? n.asText() : "org.languagetool.rules." + n.asText());
        Rule r;
        try { r = (Rule) k.getConstructor(java.util.ResourceBundle.class, Language.class).newInstance(mb, l); }
        catch (NoSuchMethodException e) { r = (Rule) k.getConstructor(java.util.ResourceBundle.class).newInstance(mb); }
        lt.addRule(r);
        enabled.add(r.getId());
        selected.add(r.getFullId() + "|" + r.getClass().getSimpleName() + "|instantiated");
      }
    }
    for (Rule r : lt.getAllRules()) if (enabled.contains(r.getId()) && !selected.contains(r.getFullId() + "|" + r.getClass().getSimpleName() + "|instantiated")) selected.add(r.getFullId() + "|" + r.getClass().getSimpleName() + "|defaultOff=" + r.isDefaultOff() + "|officeOn=" + r.isOfficeDefaultOn());
    Tools.selectRules(lt, new LinkedHashSet<>(), new LinkedHashSet<>(), new LinkedHashSet<>(), enabled, true, false);
    List<String> active = new ArrayList<>();
    for (Rule r : lt.getAllActiveRules()) active.add(r.getFullId());
    res.put("selected", selected);
    res.put("active", active);
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) out.add(CheckPipeOps.runCase(lt, c));
    res.put("cases", out);
    return res;
  }
}
