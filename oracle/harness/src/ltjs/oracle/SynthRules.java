package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.rules.*;

import java.net.URL;
import java.util.*;
import java.util.regex.Pattern;

/** Synthetic test rules for X-CHECK-PIPE (oracle side only, never production). Definition: docs/review/F15-oracle.md. */
final class SynthRules {
  private SynthRules() {}

  static final String PREFIX = "SYN_";

  private static String s(JsonNode n, String k) { return n.has(k) && !n.get(k).isNull() ? n.get(k).asText() : null; }

  /** Common spec fields applied to a rule. */
  private static void configure(Rule r, JsonNode spec) throws Exception {
    if (spec.has("category") && !spec.get("category").isNull()) {
      JsonNode c = spec.get("category");
      boolean defaultOff = c.has("defaultOff") && c.get("defaultOff").asBoolean();
      Category.Location loc = c.has("location") ? Category.Location.valueOf(c.get("location").asText()) : Category.Location.INTERNAL;
      r.setCategory(new Category(new CategoryId(c.get("id").asText()), c.has("name") ? c.get("name").asText() : "Synthetic " + c.get("id").asText(), loc, !defaultOff));
    }
    if (spec.has("defaultOff") && spec.get("defaultOff").asBoolean()) r.setDefaultOff();
    if (spec.has("defaultTempOff") && spec.get("defaultTempOff").asBoolean()) r.setDefaultTempOff();
    if (spec.has("tags")) { List<String> t = new ArrayList<>(); for (JsonNode x : spec.get("tags")) t.add(x.asText()); r.addTags(t); }
    if (spec.has("toneTags")) { List<String> t = new ArrayList<>(); for (JsonNode x : spec.get("toneTags")) t.add(x.asText()); r.addToneTags(t); }
    if (spec.has("goalSpecific")) r.setGoalSpecific(spec.get("goalSpecific").asBoolean());
    if (s(spec, "url") != null) r.setUrl(new URL(s(spec, "url")));
  }

  static Rule make(JsonNode spec) throws Exception {
    String kind = s(spec, "kind");
    Rule r = "text".equals(kind) ? new TextRule(spec) : new WordRule(spec);
    configure(r, spec);
    return r;
  }

  static List<Rule> makeAll(JsonNode specs) throws Exception {
    List<Rule> l = new ArrayList<>();
    if (specs != null) for (JsonNode sp : specs) l.add(make(sp));
    return l;
  }

  private static String subst(String t, String tok) { return t == null ? null : t.replace("{t}", tok); }

  /** Matches each non-whitespace token (not SENT_START) whose text fully matches `regex`. */
  static final class WordRule extends Rule {
    final String id, subId, description, message, shortMessage, url;
    final Pattern pattern;
    final List<String> suggestions = new ArrayList<>();
    WordRule(JsonNode spec) {
      id = s(spec, "id"); subId = s(spec, "subId");
      description = s(spec, "description") != null ? s(spec, "description") : "Synthetic " + id;
      message = s(spec, "message") != null ? s(spec, "message") : "msg " + id;
      shortMessage = s(spec, "shortMessage");
      url = s(spec, "url");
      pattern = Pattern.compile(spec.get("regex").asText());
      if (spec.has("suggestions")) for (JsonNode x : spec.get("suggestions")) suggestions.add(x.asText());
    }
    @Override public String getId() { return id; }
    @Override public String getSubId() { return subId; }
    @Override public String getDescription() { return description; }
    @Override public RuleMatch[] match(AnalyzedSentence sentence) {
      List<RuleMatch> out = new ArrayList<>();
      AnalyzedTokenReadings[] toks = sentence.getTokensWithoutWhitespace();
      for (int i = 1; i < toks.length; i++) {
        String tok = toks[i].getToken();
        if (tok.isEmpty() || !pattern.matcher(tok).matches()) continue;
        RuleMatch m = new RuleMatch(this, sentence, toks[i].getStartPos(), toks[i].getEndPos(), subst(message, tok), subst(shortMessage, tok));
        List<String> sg = new ArrayList<>();
        for (String x : suggestions) sg.add(subst(x, tok));
        m.setSuggestedReplacements(sg);
        if (url != null) { try { m.setUrl(new URL(url)); } catch (Exception e) { throw new RuntimeException(e); } }
        out.add(m);
      }
      return out.toArray(new RuleMatch[0]);
    }
  }

  /** Text-level rule: every non-empty find() of `regex` over the concatenation of all sentence texts (AnalyzedSentence#getText). */
  static final class TextRule extends TextLevelRule {
    final String id, subId, description, message, shortMessage, url;
    final Pattern pattern;
    final int minToCheck, shiftFrom, shiftTo;
    final List<String> suggestions = new ArrayList<>();
    TextRule(JsonNode spec) {
      id = s(spec, "id"); subId = s(spec, "subId");
      description = s(spec, "description") != null ? s(spec, "description") : "Synthetic " + id;
      message = s(spec, "message") != null ? s(spec, "message") : "msg " + id;
      shortMessage = s(spec, "shortMessage");
      url = s(spec, "url");
      pattern = Pattern.compile(spec.get("regex").asText());
      minToCheck = spec.has("minToCheckParagraph") ? spec.get("minToCheckParagraph").asInt() : 0;
      shiftFrom = spec.has("shiftFrom") ? spec.get("shiftFrom").asInt() : 0;
      shiftTo = spec.has("shiftTo") ? spec.get("shiftTo").asInt() : 0;
      if (spec.has("suggestions")) for (JsonNode x : spec.get("suggestions")) suggestions.add(x.asText());
    }
    @Override public String getId() { return id; }
    @Override public String getSubId() { return subId; }
    @Override public String getDescription() { return description; }
    @Override public int minToCheckParagraph() { return minToCheck; }
    @Override public RuleMatch[] match(List<AnalyzedSentence> sentences) {
      StringBuilder sb = new StringBuilder();
      List<Integer> starts = new ArrayList<>();
      for (AnalyzedSentence a : sentences) { starts.add(sb.length()); sb.append(a.getText()); }
      List<RuleMatch> out = new ArrayList<>();
      java.util.regex.Matcher mt = pattern.matcher(sb);
      while (mt.find()) {
        if (mt.end() == mt.start()) continue;
        int k = 0;
        while (k + 1 < starts.size() && starts.get(k + 1) <= mt.start()) k++;
        String tok = mt.group();
        RuleMatch m = new RuleMatch(this, sentences.get(k), mt.start() + shiftFrom, mt.end() + shiftTo, subst(message, tok), subst(shortMessage, tok));
        List<String> sg = new ArrayList<>();
        for (String x : suggestions) sg.add(subst(x, tok));
        m.setSuggestedReplacements(sg);
        if (url != null) { try { m.setUrl(new URL(url)); } catch (Exception e) { throw new RuntimeException(e); } }
        out.add(m);
      }
      return out.toArray(new RuleMatch[0]);
    }
  }
}
