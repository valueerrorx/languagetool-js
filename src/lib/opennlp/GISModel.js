// opennlp.tools.ml.maxent.GISModel + GenericModelReader/GISModelReader/BinaryFileDataReader/DataInputStream#readUTF (binary GIS models only).
import { StrictMath } from '../java/StrictMath.js';
import { DecimalFormat } from '../java/DecimalFormat.js';
import { IOException, IllegalArgumentException, EOFException } from '../java/errors.js';

const MAX_ENTRIES = 10000000;

// Java: opennlp.tools.ml.model.Context
class Context {
  // Java: Context#Context(int[],double[])
  constructor(outcomes, parameters) {
    this.outcomes = outcomes;
    this.parameters = parameters;
  }
}

// Java: java.io.DataInputStream over the model bytes
class DataReader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
    this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  need(n) {
    if (this.pos + n > this.buf.length) throw new EOFException();
  }

  // Java: DataInputStream#readInt()
  readInt() {
    this.need(4);
    const v = this.dv.getInt32(this.pos);
    this.pos += 4;
    return v;
  }

  // Java: DataInputStream#readDouble()
  readDouble() {
    this.need(8);
    const v = this.dv.getFloat64(this.pos);
    this.pos += 8;
    return v;
  }

  // Java: DataInputStream#readUTF() (modified UTF-8: 2-byte NUL, 3-byte surrogates)
  readUTF() {
    this.need(2);
    const len = this.dv.getUint16(this.pos);
    this.pos += 2;
    this.need(len);
    const b = this.buf;
    let p = this.pos;
    const end = p + len;
    const chars = [];
    while (p < end) {
      const c = b[p];
      if (c < 0x80) {
        chars.push(c);
        p++;
      } else if (c >> 4 === 0xc || c >> 4 === 0xd) {
        chars.push(((c & 0x1f) << 6) | (b[p + 1] & 0x3f));
        p += 2;
      } else if (c >> 4 === 0xe) {
        chars.push(((c & 0x0f) << 12) | ((b[p + 1] & 0x3f) << 6) | (b[p + 2] & 0x3f));
        p += 3;
      } else {
        throw new IOException('malformed input around byte ' + (p - this.pos));
      }
    }
    this.pos = end;
    let s = '';
    for (let i = 0; i < chars.length; i += 4096) s += String.fromCharCode(...chars.slice(i, i + 4096));
    return s;
  }
}

// Java: opennlp.tools.ml.maxent.GISModel
export class GISModel {
  static FQCN = 'opennlp.tools.ml.maxent.GISModel';

  // Java: GISModel#GISModel(Context[],String[],String[]) with AbstractModel#init (pmap LinkedHashMap, last duplicate wins) and UniformPrior#setLabels
  constructor(params, predLabels, outcomeNames) {
    this.pmap = new Map();
    for (let i = 0; i < predLabels.length; i++) this.pmap.set(predLabels[i], params[i]);
    this.outcomeNames = outcomeNames;
    this.numOutcomes = outcomeNames.length;
    this.r = StrictMath.log(1.0 / this.numOutcomes);
  }

  // Java: GISModel.eval(String[]) / eval(String[],double[]) / eval(String[],float[],double[]) (values null)
  eval(context, outsums = new Float64Array(this.numOutcomes)) {
    const scontexts = new Array(context.length);
    for (let i = 0; i < context.length; i++) scontexts[i] = this.pmap.get(context[i]) ?? null;
    for (let i = 0; i < this.numOutcomes; i++) outsums[i] = this.r;
    return GISModel.evalContexts(scontexts, outsums, this.numOutcomes);
  }

  // Java: GISModel.eval(Context[],float[],double[],EvalParameters) with ArrayMath#sumFeatures
  static evalContexts(context, prior, numOutcomes) {
    for (let ci = 0; ci < context.length; ci++) {
      const c = context[ci];
      if (c !== null) {
        const outcomes = c.outcomes;
        const parameters = c.parameters;
        const value = 1.0;
        for (let ai = 0; ai < outcomes.length; ai++) {
          const oid = outcomes[ai];
          prior[oid] = prior[oid] + parameters[ai] * value;
        }
      }
    }
    let normal = 0.0;
    for (let oid = 0; oid < numOutcomes; oid++) {
      prior[oid] = StrictMath.exp(prior[oid]);
      normal += prior[oid];
    }
    for (let oid = 0; oid < numOutcomes; oid++) prior[oid] /= normal;
    return prior;
  }

  // Java: AbstractModel#getNumOutcomes()
  getNumOutcomes() {
    return this.numOutcomes;
  }

  // Java: AbstractModel#getOutcome(int)
  getOutcome(i) {
    return this.outcomeNames[i];
  }

  // Java: AbstractModel#getIndex(String)
  getIndex(outcome) {
    for (let i = 0; i < this.outcomeNames.length; i++) if (this.outcomeNames[i] === outcome) return i;
    return -1;
  }

  // Java: AbstractModel#getBestOutcome(double[]) with ArrayMath#argmax
  getBestOutcome(ocs) {
    if (ocs === null || ocs === undefined || ocs.length === 0) throw new IllegalArgumentException('Vector x is null or empty');
    let maxIdx = 0;
    for (let i = 1; i < ocs.length; i++) if (ocs[maxIdx] < ocs[i]) maxIdx = i;
    return this.outcomeNames[maxIdx];
  }

  // Java: AbstractModel#getAllOutcomes(double[])
  getAllOutcomes(ocs) {
    if (ocs.length !== this.outcomeNames.length) {
      return 'The double array sent as a parameter to GISModel.getAllOutcomes() must not have been produced by this model.';
    }
    const df = new DecimalFormat('0.0000');
    let sb = this.outcomeNames[0] + '[' + df.format(ocs[0]) + ']';
    for (let i = 1; i < ocs.length; i++) sb += '  ' + this.outcomeNames[i] + '[' + df.format(ocs[i]) + ']';
    return sb;
  }

  // Java: GenericModelReader#getModel() + GISModelReader#constructModel() over the model bytes
  static read(buf) {
    const r = new DataReader(buf);
    const modelType = r.readUTF();
    if (modelType !== 'GIS') {
      if (modelType === 'Perceptron' || modelType === 'QN' || modelType === 'NaiveBayes') {
        throw new IOException('Unsupported model format (not used by LanguageTool): ' + modelType);
      }
      throw new IOException('Unknown model format: ' + modelType);
    }
    r.readInt(); // correctionConstant (unused by eval)
    r.readDouble(); // correctionParam (unused by eval)
    const outcomeLabels = GISModel.getOutcomes(r);
    const outcomePatterns = GISModel.getOutcomePatterns(r);
    const predLabels = GISModel.getPredicates(r);
    const params = GISModel.getParameters(r, outcomePatterns, predLabels.length);
    return new GISModel(params, predLabels, outcomeLabels);
  }

  // Java: AbstractModelReader#getOutcomes()
  static getOutcomes(r) {
    const numOutcomes = r.readInt();
    if (numOutcomes < 0 || numOutcomes > MAX_ENTRIES) throw new IllegalArgumentException('Outcome count' + numOutcomes + ' exceeds safe limit of' + MAX_ENTRIES);
    const outcomeLabels = new Array(numOutcomes);
    for (let i = 0; i < numOutcomes; i++) outcomeLabels[i] = r.readUTF();
    return outcomeLabels;
  }

  // Java: AbstractModelReader#getOutcomePatterns()
  static getOutcomePatterns(r) {
    const numOCTypes = r.readInt();
    if (numOCTypes < 0 || numOCTypes > MAX_ENTRIES) throw new IllegalArgumentException('Outcome pattern count' + numOCTypes + ' exceeds safe limit of' + MAX_ENTRIES);
    const outcomePatterns = new Array(numOCTypes);
    for (let i = 0; i < numOCTypes; i++) {
      const toks = r.readUTF().split(' ').filter((t) => t !== ''); // StringTokenizer(" ")
      outcomePatterns[i] = toks.map((t) => Number.parseInt(t, 10));
    }
    return outcomePatterns;
  }

  // Java: AbstractModelReader#getPredicates()
  static getPredicates(r) {
    const numPreds = r.readInt();
    if (numPreds < 0 || numPreds > MAX_ENTRIES) throw new IllegalArgumentException('Predicate count' + numPreds + ' exceeds safe limit of' + MAX_ENTRIES);
    const predLabels = new Array(numPreds);
    for (let i = 0; i < numPreds; i++) predLabels[i] = r.readUTF();
    return predLabels;
  }

  // Java: AbstractModelReader#getParameters(int[][])
  static getParameters(r, outcomePatterns, numPreds) {
    const params = new Array(numPreds);
    let pid = 0;
    for (let i = 0; i < outcomePatterns.length; i++) {
      const pat = outcomePatterns[i];
      const outcomePattern = pat.slice(1);
      for (let j = 0; j < pat[0]; j++) {
        const contextParameters = new Float64Array(pat.length - 1);
        for (let k = 1; k < pat.length; k++) contextParameters[k - 1] = r.readDouble();
        params[pid] = new Context(outcomePattern, contextParameters);
        pid++;
      }
    }
    return params;
  }
}
