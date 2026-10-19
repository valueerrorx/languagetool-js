// JS twin of harness op "opennlp-math" (OpenNlpOps#math).
import { StrictMath } from '../../src/lib/java/StrictMath.js';
import { Double } from '../../src/lib/java/numbers.js';
import { doubleToString } from '../../src/lib/java/toString.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { bitsOf } from './_opennlp-common.mjs';

// Java: OpenNlpOps#math(JsonNode)
export function run(a) {
  const fn = a.fn;
  return a.values.map((v) => {
    const x = Double.parseDouble(String(v));
    let y;
    switch (fn) {
      case 'exp': y = StrictMath.exp(x); break;
      case 'log': y = StrictMath.log(x); break;
      case 'sqrt': y = StrictMath.sqrt(x); break;
      case 'pow2': y = StrictMath.pow(x, 2.0); break;
      case 'log10': y = StrictMath.log10(x); break;
      case 'expm1': y = StrictMath.expm1(x); break;
      default: throw new IllegalArgumentException(fn);
    }
    return [doubleToString(x), doubleToString(y), bitsOf(y)];
  });
}
