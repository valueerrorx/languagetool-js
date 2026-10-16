// Java: org.languagetool.MultiThreadedJLanguageTool (sequential, S9: result order = rule index, then sentence order; no thread pool)
import { JLanguageTool, TextCheckCallable } from './JLanguageTool.js';
import { CheckResults } from './rules/model/CheckResults.js';
import { RuleSet } from './patterns/RuleSet.js';

// Java: MultiThreadedJLanguageTool
export class MultiThreadedJLanguageTool extends JLanguageTool {
  static FQCN = 'org.languagetool.MultiThreadedJLanguageTool';

  // Java: MultiThreadedJLanguageTool#shutdown()
  shutdown() {}

  // Java: MultiThreadedJLanguageTool#shutdownWhenDone()
  shutdownWhenDone() {}

  // Java: MultiThreadedJLanguageTool#analyzeSentences(List) (>= 2 sentences: no unknownWords reset, no cancel callback check)
  analyzeSentences(sentences) {
    if (sentences.length < 2) {
      return super.analyzeSentences(sentences);
    }
    const analyzedSentences = [];
    let j = 0;
    for (const sentence of sentences) {
      let analyzedSentence = this.getAnalyzedSentence(sentence);
      if (++j === sentences.length) {
        analyzedSentence = JLanguageTool.markAsParagraphEnd(analyzedSentence);
      }
      this.rememberUnknownWords(analyzedSentence);
      this.printSentenceInfo(analyzedSentence);
      analyzedSentences.push(analyzedSentence);
    }
    return analyzedSentences;
  }

  // Java: MultiThreadedJLanguageTool#performCheck(List,List,RuleSet,ParagraphHandling,AnnotatedText,RuleMatchListener,Mode,Level,boolean,Set)
  performCheck(analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags) {
    const allRules = ruleSet.allRules();
    const sentences = this.computeSentenceData(analyzedSentences, sentenceTexts);
    const map = new Map(); // Rule -> BitSet as ascending index array
    for (let i = 0; i < sentences.length; i++) {
      for (const rule of ruleSet.rulesForSentence(sentences[i].analyzed)) {
        let bits = map.get(rule);
        if (bits === undefined) map.set(rule, bits = []);
        bits.push(i);
      }
    }
    const ruleMatches = new Map(); // TreeMap<Integer,List<RuleMatch>>: rule index -> matches
    const ignoreRanges = [];
    for (let index = 0; index < allRules.length; index++) {
      const rule = allRules[index];
      const applicable = map.get(rule);
      if (applicable === undefined) continue;
      const res = new TextCheckCallable(this, RuleSet.plain([rule]), RuleSet.filterList(applicable, sentences),
        paraMode, annotatedText, listener, mode, level, true, toneTags).call();
      if (res.getRuleMatches().length !== 0) {
        ruleMatches.set(index, res.getRuleMatches());
        ignoreRanges.push(...res.getIgnoredRanges());
      }
    }
    const rm = this.applyCustomFilters([...ruleMatches.keys()].sort((a, b) => a - b).flatMap((k) => ruleMatches.get(k)), annotatedText);
    return new CheckResults(rm, ignoreRanges);
  }
}
