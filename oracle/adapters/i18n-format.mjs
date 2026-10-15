// JS twin of harness op "i18n-format" (I18nOps#format): Tools.i18n on a bundle key or a one-key synthetic bundle.
import { i18n } from '../../src/core/Tools.js';
import { ListResourceBundle } from '../../src/lib/java/ResourceBundle.js';
import { BigDecimal, BigInteger, JavaDate } from '../../src/lib/java/boxed.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { getBundle } from './i18n-bundle.mjs';

// Java: Probe#typed(JsonNode) as MessageFormat argument (bigint = Integer/Long/Short/Byte, number = Double/Float)
function typed(n) {
  if (n === null || n === undefined) return null;
  if (typeof n === 'string' || typeof n === 'boolean') return n;
  const v = n.v === undefined || n.v === null ? null : String(n.v);
  if (n.t === 'null') return null;
  if (n.bits !== undefined) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setBigUint64(0, BigInt(n.bits));
    return n.t === 'float' ? (dv.setUint32(0, Number(BigInt(n.bits) & 0xffffffffn)), dv.getFloat32(0)) : dv.getFloat64(0);
  }
  switch (n.t) {
    case 'int': case 'long': case 'short': case 'byte': return BigInt(v);
    case 'char': return v.startsWith('#') ? String.fromCharCode(parseInt(v.substring(1), 10)) : v[0];
    case 'double': return Number(v === 'NaN' ? NaN : v);
    case 'float': return Math.fround(Number(v));
    case 'string': return v;
    case 'bool': return v === 'true';
    case 'bigdecimal': return new BigDecimal(v);
    case 'biginteger': return new BigInteger(BigInt(v));
    case 'date': return new JavaDate(BigInt(v));
    default: throw new IllegalArgumentException(`unknown type: ${n.t}`);
  }
}

// Java: I18nOps#safe(ResourceBundle,String)
function safe(b, k) {
  try { return b.getString(k); } catch { return null; }
}

// Java: I18nOps#format(JsonNode)
export function run(a) {
  const args = (a.args ?? []).map(typed);
  const out = {};
  let b;
  let key = a.key ?? null;
  if (a.pattern !== undefined) {
    b = new ListResourceBundle([['p', a.pattern]]);
    key = 'p';
  } else {
    b = getBundle(a);
  }
  out.pattern = a.pattern !== undefined ? a.pattern : safe(b, key);
  out.result = i18n(b, key, ...args);
  return out;
}
