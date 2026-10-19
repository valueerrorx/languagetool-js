package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;
import org.languagetool.rules.spelling.*;
import org.languagetool.rules.spelling.hunspell.*;

import java.util.*;

/** Ops for X-HUNSPELL (F43): hs-dict, hs-rule. Format: docs/review/F43-oracle.md. */
final class HunspellOps {
  private HunspellOps() {}

  /** {language, dic?, aff?, words, sugg?, add?} -> per word spell / suggest; dic+aff are resource paths, else forDictionaryInResources(language) */
  static Object dict(JsonNode a) {
    Map<String, Object> res = new LinkedHashMap<>();
    HunspellDictionary d;
    try {
      String lang = a.get("language").asText();
      d = a.has("dic") ? Hunspell.forDictionaryInResources(lang, a.get("dic").asText(), a.get("aff").asText())
        : a.has("prefix") ? Hunspell.forDictionaryInResources(lang, a.get("prefix").asText()) : Hunspell.forDictionaryInResources(lang);
    } catch (Throwable t) { res.put("error", SpellRuleOps.err(t)); return res; }
    res.put("closed", d.isClosed());
    if (a.has("add")) for (String w : SpellRuleOps.strs(a, "add")) {
      try { d.add(w); } catch (Throwable t) { res.put("addError", SpellRuleOps.err(t)); }
    }
    boolean sugg = !a.has("sugg") || a.get("sugg").asBoolean();
    List<Object> out = new ArrayList<>();
    for (String w : SpellRuleOps.strs(a, "words")) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("w", w);
      try { o.put("spell", d.spell(w)); } catch (Throwable t) { o.put("spellError", SpellRuleOps.err(t)); }
      if (sugg) try { o.put("suggest", d.suggest(w)); } catch (Throwable t) { o.put("suggestError", SpellRuleOps.err(t)); }
      out.add(o);
    }
    res.put("results", out);
    return res;
  }

  /** {lang, id, words, sugg?} -> HunspellRule#isMisspelled / getSuggestions per word (plus rule-level meta) */
  static Object rule(JsonNode a) throws Exception {
    Language l = Languages.getLanguageForShortCode(a.get("lang").asText());
    Map<String, Object> res = new LinkedHashMap<>();
    SpellingCheckRule r;
    try { r = SpellRuleOps.find(new CheckPipeOps.HarnessLT(l, SpellRuleOps.userConfig(a)), a.get("id").asText()); }
    catch (Throwable t) { res.put("buildError", SpellRuleOps.err(t)); return res; }
    if (r == null) { res.put("noRule", true); return res; }
    res.put("class", r.getClass().getName());
    boolean sugg = a.has("sugg") && a.get("sugg").asBoolean();
    List<Object> out = new ArrayList<>();
    for (String w : SpellRuleOps.strs(a, "words")) {
      Map<String, Object> o = new LinkedHashMap<>();
      o.put("w", w);
      try { o.put("misspelled", r.isMisspelled(w)); } catch (Throwable t) { o.put("misspelledError", SpellRuleOps.err(t)); }
      if (sugg && r instanceof HunspellRule) try { o.put("suggestions", ((HunspellRule) r).getSuggestions(w)); } catch (Throwable t) { o.put("suggestionsError", SpellRuleOps.err(t)); }
      out.add(o);
    }
    res.put("results", out);
    return res;
  }
}
