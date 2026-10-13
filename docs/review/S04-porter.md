# S04 porter checkpoint (numbers)

Status: done, awaiting review. Parity X-PROBE-NUMBERS 27/27, vitest and lint green.

Files: src/lib/java/{int,long,float,numbers,casts,charDigit,floatingDecimal,StrictMath,libm}.js, oracle/adapters/probe-numbers.mjs, tests/lib/java/{numbers,StrictMath}.test.js, errors.js (P14b comment).

Representation: int/short/byte/char = number, long = BigInt, float = number (fround), double = number.

Open points
- Math.sin/cos/tan/exp/log/log10/pow (HotSpot x86_64 intrinsics, not fdlibm) are modelled as correctly rounded (libm.js, BigInt); all fixture values agree. Intel LIBM is not guaranteed correctly rounded, so rare last-bit differences are possible.
- Math.sinh uses V8 Math.sinh (same fdlibm algorithm, all fixture values agree); LT never calls it. No expm1/tan fdlibm port.
- NaN raw bits: adapter output matches x86 behaviour (invalid operation gives 0xfff8..., NaN operand propagates); drem/min/max/IEEEremainder reproduce it.
- Character.getNumericValue covers letters, Nd, Roman numerals, circled numbers, vulgar fractions only; Character.digit uses Node's Unicode tables (Java 17 = Unicode 13).

## Rework after review rejection
- int.js: negateExact and absExact now `| 0` (were -0 for 0); other int helpers and casts audited, no other -0 leak. Tests assert Object.is(r, 0).
- probe-numbers.mjs num(): integral results print "-0" for -0 (String(-0) hid it).
- long.js parseLongRange: throws IndexOutOfBoundsException (no message, as JDK).
- Comments: `helper (no Java counterpart)` on fromWords, bitLength, roundBinary; copySign NaN-bits note.
- Run: npm test 46 pass, lint clean, parity X-PROBE-NUMBERS 27 pass.
