package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.*;
import org.languagetool.chunking.Chunker;
import org.languagetool.rules.CorrectExample;
import org.languagetool.rules.IncorrectExample;
import org.languagetool.rules.patterns.*;
import org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRule;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Ops for X-SEQMATCH: seq-match, seqmatch-harvest. Format: docs/review/F27-oracle.md. */
final class SeqMatchOps {
  private SeqMatchOps() {}

  /** Captures the raw MatchConsumer hits of the performer, i.e. before createRuleMatch (message, suggestions, filters). */
  private static final class Capture extends AbstractPatternRulePerformer {
    Capture(AbstractTokenBasedRule rule) { super(rule, rule.getLanguage().getUnifier()); }

    List<Object> run(AnalyzedSentence sentence) throws Exception {
      List<Object> hits = new ArrayList<>();
      boolean pre = isInterpretPosTagsPreDisambiguation();
      AnalyzedTokenReadings[] tokens = pre ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
      doMatch(sentence, tokens, (tp, first, last, fm, lm) -> {
        List<Object> h = new ArrayList<>();
        List<Integer> p = new ArrayList<>();
        for (int x : tp) p.add(x);
        h.add(p);
        h.add(first); h.add(last); h.add(fm); h.add(lm);
        h.add(first >= 0 ? tokens[first].getStartPos() : null);
        h.add(last >= 0 ? tokens[last].getEndPos() : null);
        h.add(fm >= 0 ? tokens[fm].getStartPos() : null);
        h.add(lm >= 0 ? tokens[lm].getEndPos() : null);
        hits.add(h);
      });
      return hits;
    }
  }

  static final Chunker NOOP = tokens -> { };
  private static final Map<String, List<AbstractPatternRule>> INLINE = new HashMap<>();

  private static AbstractTokenBasedRule resolve(JsonNode src, JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<AbstractPatternRule> rules;
    if (!src.has("file")) {
      String xml = a.get("xml").asText(); // shared by all jobs of the request
      String key = l.getShortCodeWithCountryAndVariant() + "|" + xml;
      rules = INLINE.get(key);
      if (rules == null) {
        rules = new PatternRuleLoader().getRules(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), "inline.xml", l);
        INLINE.put(key, rules);
      }
    } else {
      rules = RuleLoadOps.loadFile(l, l.getRuleFileNames().get(src.get("file").asInt()));
    }
    return (AbstractTokenBasedRule) rules.get(src.has("rule") ? src.get("rule").asInt() : 0);
  }

  private static final Map<String, JLanguageTool> TOOLS = new HashMap<>();

  static JLanguageTool tool(Language l) {
    return TOOLS.computeIfAbsent(l.getShortCodeWithCountryAndVariant(),
        k -> new JLanguageTool(l, Collections.emptyList(), null, null, null, null, true, false, Collections.emptyList()) {});
  }

  static AnalyzedTokenReadings synth(JsonNode s, int startPos) {
    List<AnalyzedToken> rd = new ArrayList<>();
    for (JsonNode r : s.get("readings")) {
      rd.add(new AnalyzedToken(r.get(0).isNull() ? null : r.get(0).asText(), r.get(1).isNull() ? null : r.get(1).asText(), r.get(2).isNull() ? null : r.get(2).asText()));
    }
    AnalyzedTokenReadings atr = new AnalyzedTokenReadings(rd, startPos);
    atr.setWhitespaceBefore(s.has("ws") && s.get("ws").asBoolean() ? " " : "");
    return atr;
  }

  // ---- seq-match: {lang, texts:[string|{syn:[..]}], jobs:[{src, texts:[i]}]} ----
  static Object seqMatch(JsonNode a) {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    JLanguageTool lt = tool(l);
    List<Object> textInfo = new ArrayList<>();
    List<AnalyzedSentence> texts = new ArrayList<>();
    for (JsonNode tn : a.get("texts")) {
      Chunker saved = l.getChunker();
      try {
        AnalyzedSentence s;
        if (tn.isObject()) {
          List<AnalyzedTokenReadings> l2 = new ArrayList<>();
          int pos = 0;
          for (JsonNode sy : tn.get("syn")) {
            AnalyzedTokenReadings atr = synth(sy, pos);
            l2.add(atr);
            pos += atr.getToken() == null ? 0 : atr.getToken().length();
          }
          s = new AnalyzedSentence(l2.toArray(new AnalyzedTokenReadings[0]));
        } else {
          l.setChunker(NOOP);
          s = lt.getRawAnalyzedSentence(tn.asText());
        }
        texts.add(s);
        textInfo.add(s.getTokensWithoutWhitespace().length);
      } catch (Throwable t) {
        texts.add(null);
        textInfo.add(RuleLoadOps.err(t));
      } finally {
        l.setChunker(saved);
      }
    }
    List<Object> jobs = new ArrayList<>();
    for (JsonNode job : a.get("jobs")) {
      try {
        AbstractTokenBasedRule rule = resolve(job.get("src"), a);
        List<Object> per = new ArrayList<>();
        for (JsonNode ti : job.get("texts")) {
          AnalyzedSentence s = texts.get(ti.asInt());
          if (s == null) { per.add(null); continue; }
          try {
            per.add(new Capture(rule).run(s));
          } catch (Throwable t) {
            per.add(RuleLoadOps.err(t));
          }
        }
        jobs.add(per);
      } catch (Throwable t) {
        jobs.add(RuleLoadOps.err(t));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("texts", textInfo);
    o.put("jobs", jobs);
    return o;
  }

  private static String clean(String s) { return s.replaceAll("<[^>]*>", ""); }

  // ---- seqmatch-harvest: {lang} -> {files, rules:[[f,r,id,subId,feat{},correct[],incorrect[]]]} ----
  static Object harvest(JsonNode a) throws Exception {
    Language l = RuleLoadOps.lang(a.get("lang").asText());
    List<String> names = l.getRuleFileNames();
    List<Object> out = new ArrayList<>();
    for (int f = 0; f < names.size(); f++) {
      List<AbstractPatternRule> rules;
      try { rules = RuleLoadOps.loadFile(l, names.get(f)); } catch (Throwable t) { continue; }
      for (int r = 0; r < rules.size(); r++) {
        AbstractPatternRule ar = rules.get(r);
        if (!(ar instanceof PatternRule)) continue;
        PatternRule pr = (PatternRule) ar;
        List<PatternToken> pts = pr.getPatternTokens();
        int skip = 0, skipNeg = 0, min0 = 0, maxN = 0, and = 0, or = 0, exc = 0, excNext = 0, excPrev = 0, marker = 0, sstart = 0, send = 0, chunk = 0, longest = 0;
        for (PatternToken p : pts) {
          if (p.getSkipNext() > 0) skip++;
          if (p.getSkipNext() < 0) skipNeg++;
          if (p.getMinOccurrence() == 0) min0++;
          if (p.getMaxOccurrence() != 1) maxN++;
          if (p.hasAndGroup()) and++;
          if (p.hasOrGroup()) or++;
          for (PatternToken x : p.getExceptionList()) { exc++; if (x.hasNextException()) excNext++; if (x.hasPreviousException()) excPrev++; }
          if (p.isInsideMarker()) marker++;
          if ("SENT_START".equals(p.getPOStag())) sstart++;
          if ("SENT_END".equals(p.getPOStag())) send++;
          if (p.getChunkTag() != null) chunk++;
        }
        Map<String, Object> feat = new LinkedHashMap<>();
        feat.put("n", pts.size()); feat.put("skip", skip); feat.put("skipNeg", skipNeg); feat.put("min0", min0); feat.put("maxN", maxN);
        feat.put("and", and); feat.put("or", or); feat.put("exc", exc); feat.put("excNext", excNext); feat.put("excPrev", excPrev);
        feat.put("marker", marker); feat.put("sstart", sstart); feat.put("send", send); feat.put("chunk", chunk);
        feat.put("unify", pr.isTestUnification()); feat.put("groups", pr.isGroupsOrUnification()); feat.put("sentStart", pr.isSentStart());
        List<String> cs = new ArrayList<>(), is = new ArrayList<>();
        for (CorrectExample e : pr.getCorrectExamples()) cs.add(clean(e.getExample()));
        for (IncorrectExample e : pr.getIncorrectExamples()) is.add(clean(e.getExample()));
        out.add(Arrays.asList(f, r, pr.getId(), pr.getSubId(), feat, cs, is));
      }
    }
    Map<String, Object> o = new LinkedHashMap<>();
    o.put("files", names);
    o.put("rules", out);
    return o;
  }
}
