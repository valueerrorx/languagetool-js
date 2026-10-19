// opennlp.tools.ml.BeamSearch (contextsCache is only used with cacheSize > 0, which the English models never use: all callers pass 0).
import { PriorityQueue } from '../java/collections/PriorityQueue.js';
import { Sequence } from './Sequence.js';

const zeroLog = -100000;

// Java: opennlp.tools.ml.BeamSearch
export class BeamSearch {
  static FQCN = 'opennlp.tools.ml.BeamSearch';

  // Java: BeamSearch#BeamSearch(int,MaxentModel,int)
  constructor(size, model, cacheSize = 0) {
    this.size = size;
    this.model = model;
    this.probs = new Float64Array(model.getNumOutcomes());
    if (cacheSize > 0) throw new Error('BeamSearch contextsCache is not used by LanguageTool');
  }

  // Java: BeamSearch#bestSequences(int,T[],Object[],double,BeamSearchContextGenerator,SequenceValidator)
  bestSequences(numSequences, sequence, additionalContext, minSequenceScore, cg, validator) {
    let prev = new PriorityQueue();
    let next = new PriorityQueue();
    let tmp;
    prev.add(new Sequence());
    if (additionalContext === null || additionalContext === undefined) additionalContext = [];
    for (let i = 0; i < sequence.length; i++) {
      const sz = Math.min(this.size, prev.size());
      for (let sc = 0; prev.size() > 0 && sc < sz; sc++) {
        const top = prev.remove();
        const tmpOutcomes = top.getOutcomes();
        const outcomes = tmpOutcomes.slice();
        const contexts = cg.getContext(i, sequence, outcomes, additionalContext);
        const scores = this.model.eval(contexts, this.probs);
        const tempScores = Float64Array.from(scores);
        tempScores.sort();
        const min = tempScores[Math.max(0, scores.length - this.size)];
        for (let p = 0; p < scores.length; p++) {
          if (scores[p] >= min) {
            const out = this.model.getOutcome(p);
            if (validator.validSequence(i, sequence, outcomes, out)) {
              const ns = new Sequence(top, out, scores[p]);
              if (ns.getScore() > minSequenceScore) next.add(ns);
            }
          }
        }
        if (next.size() === 0) {
          for (let p = 0; p < scores.length; p++) {
            const out = this.model.getOutcome(p);
            if (validator.validSequence(i, sequence, outcomes, out)) {
              const ns = new Sequence(top, out, scores[p]);
              if (ns.getScore() > minSequenceScore) next.add(ns);
            }
          }
        }
      }
      prev.clear();
      tmp = prev;
      prev = next;
      next = tmp;
    }
    const numSeq = Math.min(numSequences, prev.size());
    const topSequences = new Array(numSeq);
    for (let si = 0; si < numSeq; si++) topSequences[si] = prev.remove();
    return topSequences;
  }

  // Java: BeamSearch#bestSequences(int,T[],Object[],BeamSearchContextGenerator,SequenceValidator)
  bestSequencesDefault(numSequences, sequence, additionalContext, cg, validator) {
    return this.bestSequences(numSequences, sequence, additionalContext, zeroLog, cg, validator);
  }

  // Java: BeamSearch#bestSequence(T[],Object[],BeamSearchContextGenerator,SequenceValidator)
  bestSequence(sequence, additionalContext, cg, validator) {
    const best = this.bestSequencesDefault(1, sequence, additionalContext, cg, validator);
    if (best.length > 0) return best[0];
    return null;
  }

  // Java: BeamSearch#getOutcomes()
  getOutcomes() {
    const outcomes = new Array(this.model.getNumOutcomes());
    for (let i = 0; i < outcomes.length; i++) outcomes[i] = this.model.getOutcome(i);
    return outcomes;
  }
}
