// opennlp.tools.chunker.ChunkerME + DefaultChunkerContextGenerator + DefaultChunkerSequenceValidator + ChunkSample#phrasesAsSpanList.
import { IllegalArgumentException } from '../java/errors.js';
import { BeamSearch } from './BeamSearch.js';
import { Span } from './Span.js';

// Java: DefaultChunkerContextGenerator#getContext(int,String[],String[],String[])
function chunkContext(i, toks, tags, preds) {
  let w_2;
  let w_1;
  let w1;
  let w2;
  let t_2;
  let t_1;
  let t1;
  let t2;
  let p_2;
  let p_1;
  if (i < 2) {
    w_2 = 'w_2=bos';
    t_2 = 't_2=bos';
    p_2 = 'p_2=bos';
  } else {
    w_2 = 'w_2=' + toks[i - 2];
    t_2 = 't_2=' + tags[i - 2];
    p_2 = 'p_2' + preds[i - 2];
  }
  if (i < 1) {
    w_1 = 'w_1=bos';
    t_1 = 't_1=bos';
    p_1 = 'p_1=bos';
  } else {
    w_1 = 'w_1=' + toks[i - 1];
    t_1 = 't_1=' + tags[i - 1];
    p_1 = 'p_1=' + preds[i - 1];
  }
  const w0 = 'w0=' + toks[i];
  const t0 = 't0=' + tags[i];
  if (i + 1 >= toks.length) {
    w1 = 'w1=eos';
    t1 = 't1=eos';
  } else {
    w1 = 'w1=' + toks[i + 1];
    t1 = 't1=' + tags[i + 1];
  }
  if (i + 2 >= toks.length) {
    w2 = 'w2=eos';
    t2 = 't2=eos';
  } else {
    w2 = 'w2=' + toks[i + 2];
    t2 = 't2=' + tags[i + 2];
  }
  return [
    w_2, w_1, w0, w1, w2,
    w_1 + w0, w0 + w1,
    t_2, t_1, t0, t1, t2,
    t_2 + t_1, t_1 + t0, t0 + t1, t1 + t2,
    t_2 + t_1 + t0, t_1 + t0 + t1, t0 + t1 + t2,
    p_2, p_1,
    p_2 + p_1,
    p_1 + t_2, p_1 + t_1, p_1 + t0, p_1 + t1, p_1 + t2,
    p_1 + t_2 + t_1, p_1 + t_1 + t0, p_1 + t0 + t1, p_1 + t1 + t2,
    p_1 + t_2 + t_1 + t0, p_1 + t_1 + t0 + t1, p_1 + t0 + t1 + t2,
    p_1 + w_2, p_1 + w_1, p_1 + w0, p_1 + w1, p_1 + w2,
    p_1 + w_1 + w0, p_1 + w0 + w1,
  ];
}

// Java: opennlp.tools.util.TokenTag#create(String[],String[]) + ChunkerContextGenerator adapter
const chunkContextGenerator = {
  getContext(index, sequence, priorDecisions) {
    return chunkContext(index, sequence.map((t) => t.token), sequence.map((t) => t.tag), priorDecisions);
  },
};

// Java: DefaultChunkerSequenceValidator#validOutcome(String,String)
function validOutcome(outcome, prevOutcome) {
  if (outcome.startsWith('I-')) {
    if (prevOutcome === null) return false;
    if (prevOutcome === 'O') return false;
    return prevOutcome.substring(2) === outcome.substring(2);
  }
  return true;
}

// Java: DefaultChunkerSequenceValidator#validSequence(int,TokenTag[],String[],String)
const chunkSequenceValidator = {
  validSequence(i, inputSequence, outcomesSequence, outcome) {
    return validOutcome(outcome, outcomesSequence.length > 0 ? outcomesSequence[outcomesSequence.length - 1] : null);
  },
};

// Java: ChunkSample#phrasesAsSpanList(String[],String[],String[])
function phrasesAsSpanList(aSentence, aTags, aPreds) {
  if (aSentence.length !== aTags.length || aTags.length !== aPreds.length) {
    throw new IllegalArgumentException('All arrays must have the same length: sentence: ' + aSentence.length + ', tags: ' + aTags.length + ', predicates: ' + aPreds.length + '!');
  }
  const phrases = [];
  let startTag = '';
  let startIndex = 0;
  let foundPhrase = false;
  for (let ci = 0, cn = aPreds.length; ci < cn; ci++) {
    const pred = aPreds[ci];
    if (pred.startsWith('B-') || (pred !== 'I-' + startTag && pred !== 'O')) {
      if (foundPhrase) phrases.push(new Span(startIndex, ci, startTag));
      startIndex = ci;
      startTag = pred.substring(2);
      foundPhrase = true;
    } else if (pred === 'I-' + startTag) {
      // middle
    } else if (foundPhrase) {
      phrases.push(new Span(startIndex, ci, startTag));
      foundPhrase = false;
      startTag = '';
    }
  }
  if (foundPhrase) phrases.push(new Span(startIndex, aPreds.length, startTag));
  return phrases;
}

// Java: opennlp.tools.util.TokenTag#create(String[],String[])
function tokenTags(toks, tags) {
  if (toks.length !== tags.length) throw new IllegalArgumentException('toks and tags must have the same length: ' + toks.length + ' != ' + tags.length);
  return toks.map((t, i) => ({ token: t, tag: tags[i] }));
}

// Java: opennlp.tools.chunker.ChunkerME
export class ChunkerME {
  static FQCN = 'opennlp.tools.chunker.ChunkerME';

  // Java: ChunkerME#ChunkerME(ChunkerModel) (beam size 10)
  constructor(model) {
    this.contextGenerator = chunkContextGenerator;
    this.sequenceValidator = chunkSequenceValidator;
    this.model = new BeamSearch(10, model.getChunkerModel(), 0);
    this.bestSequence = null;
  }

  // Java: ChunkerME#chunk(String[],String[])
  chunk(toks, tags) {
    const tuples = tokenTags(toks, tags);
    this.bestSequence = this.model.bestSequence(tuples, null, this.contextGenerator, this.sequenceValidator);
    return this.bestSequence.getOutcomes().slice();
  }

  // Java: ChunkerME#chunkAsSpans(String[],String[])
  chunkAsSpans(toks, tags) {
    return phrasesAsSpanList(toks, tags, this.chunk(toks, tags));
  }

  // Java: ChunkerME#topKSequences(String[],String[])
  topKSequences(sentence, tags) {
    return this.model.bestSequencesDefault(10, tokenTags(sentence, tags), null, this.contextGenerator, this.sequenceValidator);
  }

  // Java: ChunkerME#probs()
  probs() {
    return this.bestSequence.getProbs();
  }
}
