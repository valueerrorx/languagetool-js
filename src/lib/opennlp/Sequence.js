// opennlp.tools.util.Sequence: outcome sequence with probabilities and log score.
import { StrictMath } from '../java/StrictMath.js';
import { Double } from '../java/numbers.js';

// Java: opennlp.tools.util.Sequence
export class Sequence {
  static FQCN = 'opennlp.tools.util.Sequence';

  // Java: Sequence#Sequence() / (Sequence) / (Sequence,String,double) / (List)
  constructor(a, outcome, p) {
    if (a === undefined) {
      this.outcomes = [];
      this.probs = [];
      this.score = 0;
    } else if (outcome === undefined && !Array.isArray(a)) {
      this.outcomes = a.outcomes.slice();
      this.probs = a.probs.slice();
      this.score = a.score;
    } else if (outcome !== undefined) {
      this.outcomes = a.outcomes.slice();
      this.outcomes.push(outcome);
      this.probs = a.probs.slice();
      this.probs.push(p);
      this.score = a.score + StrictMath.log(p);
    } else {
      this.outcomes = a;
      this.probs = a.map(() => 1.0);
      this.score = 0;
    }
  }

  // Java: Sequence#compareTo(Sequence)
  compareTo(s) {
    return Double.compare(s.score, this.score);
  }

  // Java: Sequence#getOutcomes()
  getOutcomes() {
    return this.outcomes;
  }

  // Java: Sequence#getProbs()
  getProbs() {
    return Float64Array.from(this.probs);
  }

  // Java: Sequence#getScore()
  getScore() {
    return this.score;
  }
}
