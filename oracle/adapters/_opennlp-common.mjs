// Shared code of the X-OPENNLP adapters: JS twin of OpenNlpOps helpers.
import { doubleToString } from '../../src/lib/java/toString.js';

// Java: OpenNlpOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  return { class: t.javaClass ?? `js:${t.constructor.name}`, message: t.message ?? null };
}

// Java: OpenNlpOps#ds(double[])
export const ds = (d) => Array.from(d, (x) => doubleToString(x));

const dv = new DataView(new ArrayBuffer(8));

// Java: OpenNlpOps#bits(double[]) (Long.toHexString(Double.doubleToRawLongBits))
export function bitsOf(x) {
  dv.setFloat64(0, x);
  return dv.getBigUint64(0).toString(16);
}

// Java: OpenNlpOps#mi(MaxentModel)
export function mi(m) {
  const n = m.getNumOutcomes();
  const outs = [];
  for (let i = 0; i < n; i++) outs.push(m.getOutcome(i));
  return { class: m.constructor.FQCN, numOutcomes: n, outcomes: outs };
}
