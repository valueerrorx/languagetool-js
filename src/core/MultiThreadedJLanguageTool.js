// Java: org.languagetool.MultiThreadedJLanguageTool (sequential, S9: result order = rule index, then sentence order; no thread pool)
import { JLanguageTool, TextCheckCallable } from './JLanguageTool.js';
import { CheckResults } from './rules/model/CheckResults.js';
import { RuleSet } from './patterns/RuleSet.js';
import * as errs from '../lib/java/errors.js';
import { ExecutionException, RejectedExecutionException, RuntimeException } from '../lib/java/errors.js';

// Java: ForkJoinTask#getThrowableException() (JDK 17): exception thrown in a worker is re-created for the caller, original as cause
const ONE_ARG = ['RuntimeException', 'Exception', 'IllegalStateException', 'IllegalArgumentException', 'UnsupportedOperationException', 'IOException'];
const NO_ARG = ['StackOverflowError', 'OutOfMemoryError', 'AssertionError', 'NullPointerException', 'ArithmeticException', 'ClassCastException'];
function forkJoinRethrown(ex) {
  if (ex === null || typeof ex !== 'object' || !(ex instanceof errs.Throwable)) return ex;
  for (const n of ONE_ARG) if (errs[n] !== undefined && ex.constructor === errs[n]) return new errs[n](ex);
  for (const n of NO_ARG) if (errs[n] !== undefined && ex.constructor === errs[n]) return new errs[n]().initCause(ex);
  return ex;
}

// Java: Future#get() on a failed pool task -> ExecutionException wrapped by the caller in RuntimeException(e)
function wrapFutureFailure(e) {
  if (e !== null && typeof e === 'object' && e.notPorted === true) return e; // JS: notPorted markers propagate unwrapped
  return new RuntimeException(new ExecutionException(forkJoinRethrown(e)));
}

// Java: MultiThreadedJLanguageTool
export class MultiThreadedJLanguageTool extends JLanguageTool {
  static FQCN = 'org.languagetool.MultiThreadedJLanguageTool';

  threadPoolShutdown = false; // Java: ForkJoinPool#isShutdown (shutdownNow/shutdown: later submissions are rejected)

  // Java: MultiThreadedJLanguageTool#shutdown()
  shutdown() {
    this.threadPoolShutdown = true;
  }

  // Java: MultiThreadedJLanguageTool#shutdownWhenDone()
  shutdownWhenDone() {
    this.threadPoolShutdown = true;
  }

  // Java: MultiThreadedJLanguageTool#analyzeSentences(List) (>= 2 sentences: no unknownWords reset, no cancel callback check)
  analyzeSentences(sentences) {
    if (sentences.length < 2) {
      return super.analyzeSentences(sentences);
    }
    const analyzedSentences = [];
    if (this.threadPoolShutdown) throw new RejectedExecutionException(); // Java: executorService.invokeAll on a shut down pool
    let j = 0;
    const tasks = sentences.map((sentence) => {
      try {
        let analyzedSentence = this.getAnalyzedSentence(sentence);
        if (++j === sentences.length) {
          analyzedSentence = JLanguageTool.markAsParagraphEnd(analyzedSentence);
        }
        return { value: analyzedSentence };
      } catch (e) {
        return { error: e };
      }
    });
    for (const task of tasks) {
      // Java: future.get() throws ExecutionException, wrapped in RuntimeException
      if (task.error !== undefined) throw wrapFutureFailure(task.error);
      const analyzedSentence = task.value;
      this.rememberUnknownWords(analyzedSentence);
      this.printSentenceInfo(analyzedSentence);
      analyzedSentences.push(analyzedSentence);
    }
    return analyzedSentences;
  }

  // Java: MultiThreadedJLanguageTool#performCheck(List,List,RuleSet,ParagraphHandling,AnnotatedText,RuleMatchListener,Mode,Level,boolean,Set)
  performCheck(analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags) {
    const allRules = ruleSet.allRules();
    if (this.threadPoolShutdown) throw new RejectedExecutionException(); // Java: getExecutorService().submit on a shut down pool
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
      let res;
      try {
        res = new TextCheckCallable(this, RuleSet.plain([rule]), RuleSet.filterList(applicable, sentences),
          paraMode, annotatedText, listener, mode, level, true, toneTags).call();
      } catch (e) {
        // Java: future.get() throws ExecutionException, wrapped in RuntimeException
        throw wrapFutureFailure(e);
      }
      if (res.getRuleMatches().length !== 0) {
        ruleMatches.set(index, res.getRuleMatches());
        ignoreRanges.push(...res.getIgnoredRanges());
      }
    }
    const rm = this.applyCustomFilters([...ruleMatches.keys()].sort((a, b) => a - b).flatMap((k) => ruleMatches.get(k)), annotatedText);
    return new CheckResults(rm, ignoreRanges);
  }
}
