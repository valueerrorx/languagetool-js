// opennlp.tools.postag.POSTaggerME + DefaultPOSContextGenerator + DefaultPOSSequenceValidator (model version 1.5.0: dictionary-less generator, beam 3).
import { BeamSearch } from './BeamSearch.js';

const SE = '*SE*';
const SB = '*SB*';

// Java: DefaultPOSContextGenerator#getSuffixes(String)
function getSuffixes(lex) {
  const suffs = new Array(4);
  for (let li = 0; li < 4; li++) suffs[li] = lex.substring(Math.max(lex.length - li - 1, 0));
  return suffs;
}

// Java: DefaultPOSContextGenerator#getPrefixes(String)
function getPrefixes(lex) {
  const prefs = new Array(4);
  for (let li = 0; li < 4; li++) prefs[li] = lex.substring(0, Math.min(li + 1, lex.length));
  return prefs;
}

// Java: DefaultPOSContextGenerator#getContext(int,String[],String[],Object[]); contextsCache is a pure memo of this result and is not ported
const posContextGenerator = {
  getContext(index, sequence, priorDecisions) {
    let next;
    let nextnext;
    let prev;
    let prevprev;
    let tagprev;
    let tagprevprev;
    const lex = sequence[index];
    if (sequence.length > index + 1) {
      next = sequence[index + 1];
      if (sequence.length > index + 2) nextnext = sequence[index + 2];
      else nextnext = SE;
    } else {
      next = SE;
      nextnext = null;
    }
    if (index - 1 >= 0) {
      prev = sequence[index - 1];
      tagprev = priorDecisions[index - 1];
      if (index - 2 >= 0) {
        prevprev = sequence[index - 2];
        tagprevprev = priorDecisions[index - 2];
      } else {
        prevprev = SB;
        tagprevprev = null;
      }
    } else {
      prev = SB;
      prevprev = null;
      tagprev = null;
      tagprevprev = null;
    }
    const e = [];
    e.push('default');
    e.push('w=' + lex);
    // dict == null for model version < 1.8
    for (const s of getSuffixes(lex)) e.push('suf=' + s);
    for (const p of getPrefixes(lex)) e.push('pre=' + p);
    if (lex.indexOf('-') !== -1) e.push('h');
    if (/[A-Z]/.test(lex)) e.push('c');
    if (/[0-9]/.test(lex)) e.push('d');
    if (prev !== null) {
      e.push('p=' + prev);
      if (tagprev !== null) e.push('t=' + tagprev);
      if (prevprev !== null) {
        e.push('pp=' + prevprev);
        if (tagprevprev !== null) e.push('t2=' + tagprevprev + ',' + tagprev);
      }
    }
    if (next !== null) {
      e.push('n=' + next);
      if (nextnext !== null) e.push('nn=' + nextnext);
    }
    return e;
  },
};

// Java: opennlp.tools.postag.DefaultPOSSequenceValidator
class DefaultPOSSequenceValidator {
  constructor(tagDictionary) {
    this.tagDictionary = tagDictionary;
  }

  // Java: DefaultPOSSequenceValidator#validSequence(int,String[],String[],String)
  validSequence(i, inputSequence, outcomesSequence, outcome) {
    if (this.tagDictionary === null) return true;
    const tags = this.tagDictionary.getTags(inputSequence[i]);
    if (tags === null) return true;
    return tags.includes(outcome);
  }
}

// Java: opennlp.tools.postag.POSTaggerME
export class POSTaggerME {
  static FQCN = 'opennlp.tools.postag.POSTaggerME';

  // Java: POSTaggerME#POSTaggerME(POSModel)
  constructor(model) {
    const beamSizeString = model.getManifestProperty('BeamSize');
    this.size = beamSizeString !== null ? Number.parseInt(beamSizeString, 10) : 3;
    this.contextGen = posContextGenerator;
    this.sequenceValidator = new DefaultPOSSequenceValidator(model.getTagDictionary());
    this.model = new BeamSearch(this.size, model.getPosModel(), 0);
    this.bestSequence = null;
  }

  // Java: POSTaggerME#tag(String[])
  tag(toks) {
    this.bestSequence = this.model.bestSequence(toks, null, this.contextGen, this.sequenceValidator);
    return this.bestSequence.getOutcomes().slice();
  }

  // Java: POSTaggerME#topKSequences(String[])
  topKSequences(sentence) {
    return this.model.bestSequencesDefault(this.size, sentence, null, this.contextGen, this.sequenceValidator);
  }

  // Java: POSTaggerME#probs()
  probs() {
    return this.bestSequence.getProbs();
  }
}
