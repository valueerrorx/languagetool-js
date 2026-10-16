// java.util.Formatter subset: %.Nf of a double (HALF_UP on the shortest decimal digits, as FormattedFloatingDecimal).

// Java: Formatter %.Nf for a double (NaN, Infinity, sign); digits taken from the shortest round-trip text
export function formatFixed(d, precision) {
  if (Number.isNaN(d)) return 'NaN';
  if (d === Infinity) return 'Infinity';
  if (d === -Infinity) return '-Infinity';
  const neg = d < 0 || Object.is(d, -0);
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(Math.abs(d)));
  let digits = m[1] + (m[2] ?? '');
  let pointPos = m[1].length + Number(m[3] ?? 0);
  if (pointPos < 0) { digits = '0'.repeat(-pointPos) + digits; pointPos = 0; }
  if (digits.length < pointPos) digits += '0'.repeat(pointPos - digits.length);
  const keep = pointPos + precision;
  if (digits.length < keep) digits += '0'.repeat(keep - digits.length);
  let head = digits.slice(0, keep);
  if (digits.length > keep && digits.charCodeAt(keep) >= 53) { // '5'
    head = (BigInt(head === '' ? '0' : head) + 1n).toString().padStart(keep, '0');
  }
  head = head.padStart(precision + 1, '0');
  const intPart = head.slice(0, head.length - precision).replace(/^0+(?=\d)/, '');
  const frac = head.slice(head.length - precision);
  return `${neg ? '-' : ''}${intPart}${precision > 0 ? `.${frac}` : ''}`;
}
