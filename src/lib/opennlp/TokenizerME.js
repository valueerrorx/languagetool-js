// opennlp.tools.tokenize.TokenizerME + WhitespaceTokenizer + DefaultTokenContextGenerator (empty abbreviation set).
import * as Character from '../java/Character.js';
import { Span } from './Span.js';

// Java: opennlp.tools.util.StringUtil#isWhitespace(char)
function isWhitespace(c) {
  return Character.isWhitespace(c) || Character.getType(c) === Character.SPACE_SEPARATOR;
}

// Java: WhitespaceTokenizer#tokenizePos(String)
function whitespaceTokenizePos(d) {
  let tokStart = -1;
  const tokens = [];
  let inTok = false;
  const end = d.length;
  for (let i = 0; i < end; i++) {
    if (isWhitespace(d.charCodeAt(i))) {
      if (inTok) {
        tokens.push(new Span(tokStart, i));
        inTok = false;
        tokStart = -1;
      }
    } else if (!inTok) {
      tokStart = i;
      inTok = true;
    }
  }
  if (inTok) tokens.push(new Span(tokStart, end));
  return tokens;
}

// Java: DefaultTokenContextGenerator#addCharPreds(String,char,List)
function addCharPreds(pref, cc, preds) {
  const c = String.fromCharCode(cc);
  preds.push(pref + '=' + c);
  if (Character.isLetter(cc)) {
    preds.push(pref + '_alpha');
    if (Character.isUpperCase(cc)) preds.push(pref + '_caps');
  } else if (Character.isDigit(cc)) {
    preds.push(pref + '_num');
  } else if (isWhitespace(cc)) {
    preds.push(pref + '_ws');
  } else if (c === '.' || c === '?' || c === '!') {
    preds.push(pref + '_eos');
  } else if (c === '`' || c === '"' || c === "'") {
    preds.push(pref + '_quote');
  } else if (c === '[' || c === '{' || c === '(') {
    preds.push(pref + '_lp');
  } else if (c === ']' || c === '}' || c === ')') {
    preds.push(pref + '_rp');
  }
}

// Java: DefaultTokenContextGenerator#createContext(String,int) / getContext(String,int)
function getContext(sentence, index) {
  const preds = [];
  const prefix = sentence.substring(0, index);
  const suffix = sentence.substring(index);
  preds.push('p=' + prefix);
  preds.push('s=' + suffix);
  if (index > 0) {
    addCharPreds('p1', sentence.charCodeAt(index - 1), preds);
    if (index > 1) {
      addCharPreds('p2', sentence.charCodeAt(index - 2), preds);
      preds.push('p21=' + sentence[index - 2] + sentence[index - 1]);
    } else {
      preds.push('p2=bok');
    }
    preds.push('p1f1=' + sentence[index - 1] + sentence[index]);
  } else {
    preds.push('p1=bok');
  }
  addCharPreds('f1', sentence.charCodeAt(index), preds);
  if (index + 1 < sentence.length) {
    addCharPreds('f2', sentence.charCodeAt(index + 1), preds);
    preds.push('f12=' + sentence[index] + sentence[index + 1]);
  } else {
    preds.push('f2=bok');
  }
  if (sentence[0] === '&' && sentence[sentence.length - 1] === ';') preds.push('cc');
  // inducedAbbreviations is the empty set for the English model, so "pabb" is never added
  return preds;
}

const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

// Java: opennlp.tools.tokenize.TokenizerME
export class TokenizerME {
  static FQCN = 'opennlp.tools.tokenize.TokenizerME';

  // Java: TokenizerME#TokenizerME(TokenizerModel)
  constructor(model) {
    this.model = model.getMaxentModel();
    this.useAlphaNumericOptimization_ = model.useAlphaNumericOptimization();
    this.newTokens = [];
    this.tokProbs = [];
  }

  // Java: TokenizerME#getTokenProbabilities()
  getTokenProbabilities() {
    return Float64Array.from(this.tokProbs);
  }

  // Java: TokenizerME#tokenize(String) (AbstractTokenizer: covered text of each span)
  tokenize(d) {
    return this.tokenizePos(d).map((s) => d.substring(s.getStart(), s.getEnd()));
  }

  // Java: TokenizerME#tokenizePos(String)
  tokenizePos(d) {
    const tokenSpans = whitespaceTokenizePos(d);
    this.newTokens = [];
    this.tokProbs = [];
    for (const tokSpan of tokenSpans) {
      const s = d.substring(tokSpan.getStart(), tokSpan.getEnd());
      if (s.length < 2) {
        this.newTokens.push(tokSpan);
        this.tokProbs.push(1.0);
      } else if (this.useAlphaNumericOptimization_ && ALPHANUMERIC.test(s)) {
        this.newTokens.push(tokSpan);
        this.tokProbs.push(1.0);
      } else {
        let start = tokSpan.getStart();
        const end = tokSpan.getEnd();
        const origStart = tokSpan.getStart();
        let tokenProb = 1.0;
        for (let j = origStart + 1; j < end; j++) {
          const probs = this.model.eval(getContext(s, j - origStart));
          const best = this.model.getBestOutcome(probs);
          tokenProb *= probs[this.model.getIndex(best)];
          if (best === 'T') {
            this.newTokens.push(new Span(start, j));
            this.tokProbs.push(tokenProb);
            start = j;
            tokenProb = 1.0;
          }
        }
        this.newTokens.push(new Span(start, end));
        this.tokProbs.push(tokenProb);
      }
    }
    return this.newTokens.slice();
  }
}
