// JS twin of harness op "fsa-info" (FsaOps#info).
import { FSAFlags } from '../../src/lib/fsa/FSA.js';
import { CFSA2 } from '../../src/lib/fsa/CFSA2.js';
import { FSA5 } from '../../src/lib/fsa/FSA5.js';
import { err, open } from './fsa-common.mjs';

const hex = (b) => Buffer.from(b.buffer, b.byteOffset, b.length).toString('hex');
const pairs = (m) => [...m].map(([k, v]) => [k, v]);

// Java: FsaOps#info(JsonNode)
export function run(a) {
  const d = open(a);
  const out = {};
  out.dict = a.dict;
  const fsa = d.fsa;
  out.fsaClass = fsa.constructor.FQCN;
  out.flags = [...fsa.getFlags()];
  out.flagBits = FSAFlags.filter((f) => fsa.getFlags().includes(f.name)).reduce((s, f) => s | f.bits, 0);
  out.rootNode = fsa.getRootNode();
  const seen = new Set();
  const stack = [];
  let arcs = 0;
  let finals = 0;
  let terminals = 0;
  let maxArcs = 0;
  stack.push(fsa.getRootNode());
  seen.add(fsa.getRootNode());
  while (stack.length > 0) {
    const node = stack.pop();
    let n = 0;
    for (let arc = fsa.getFirstArc(node); arc !== 0; arc = fsa.getNextArc(arc)) {
      n++;
      if (fsa.isArcFinal(arc)) finals++;
      if (fsa.isArcTerminal(arc)) terminals++;
      else {
        const end = fsa.getEndNode(arc);
        if (!seen.has(end)) {
          seen.add(end);
          stack.push(end);
        }
      }
    }
    arcs += n;
    if (n > maxArcs) maxArcs = n;
  }
  out.reachableNodes = seen.size;
  out.arcs = arcs;
  out.finalArcs = finals;
  out.terminalArcs = terminals;
  out.maxArcsPerNode = maxArcs;
  out.rootArcCount = fsa.getArcCount(fsa.getRootNode());
  try {
    out.sequenceCountFromNumbers = fsa.getFlags().includes('NUMBERS') ? fsa.getRightLanguageCount(fsa.getRootNode()) : null;
  } catch (e) {
    out.sequenceCountFromNumbers = { error: err(e) };
  }
  if (fsa instanceof CFSA2) {
    out.version = CFSA2.VERSION & 0xff;
    out.arcsLength = fsa.arcs.length;
    out.labelMapping = hex(fsa.labelMapping);
  } else if (fsa instanceof FSA5) {
    out.version = FSA5.VERSION & 0xff;
    out.arcsLength = fsa.arcs.length;
    out.nodeDataLength = fsa.nodeDataLength;
    out.gtl = fsa.gtl;
    out.filler = fsa.filler;
    out.annotation = fsa.annotation;
  }
  const m = d.metadata;
  const md = {};
  const attrs = {};
  for (const [k, v] of m.getAttributes()) attrs[k.propertyName] = v;
  md.attributes = attrs;
  md.separator = m.getSeparator() & 0xff;
  md.separatorChar = m.getSeparatorAsChar();
  md.encoding = m.getEncoding();
  md.locale = m.getLocale() === null ? null : m.getLocale().toString();
  md.encoderType = m.getSequenceEncoderType().name;
  md.frequencyIncluded = m.isFrequencyIncluded();
  md.ignoringPunctuation = m.isIgnoringPunctuation();
  md.ignoringNumbers = m.isIgnoringNumbers();
  md.ignoringCamelCase = m.isIgnoringCamelCase();
  md.ignoringAllUppercase = m.isIgnoringAllUppercase();
  md.ignoringDiacritics = m.isIgnoringDiacritics();
  md.convertingCase = m.isConvertingCase();
  md.supportingRunOnWords = m.isSupportingRunOnWords();
  md.inputConversionPairs = pairs(m.getInputConversionPairs());
  md.outputConversionPairs = pairs(m.getOutputConversionPairs());
  md.replacementPairs = pairs(m.getReplacementPairs());
  md.equivalentChars = pairs(m.getEquivalentChars());
  out.metadata = md;
  return out;
}
