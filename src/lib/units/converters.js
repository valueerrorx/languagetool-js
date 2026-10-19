// Subset of tech.units.indriya 1.3 converters (Identity, Multiply, Rational, Add, Pair) with the Simplifier, as used by AbstractUnitConversionRule.
import { IllegalArgumentException } from '../java/errors.js';

// Java: Simplifier#normalFormOrder (static ORDER on each converter class)
const orderOf = (c) => c.constructor.ORDER;

// Java: AbstractConverter
export class AbstractConverter {
  // Java: AbstractConverter#inverse()
  inverse() {
    return this.isIdentity() ? this : this.inverseWhenNotIdentity();
  }

  // Java: AbstractConverter#convert(double)
  convert(value) {
    return this.isIdentity() ? value : this.convertWhenNotIdentity(value);
  }

  // Java: AbstractConverter#concatenate(UnitConverter)
  concatenate(that) {
    return compose(this, that);
  }

  // Java: AbstractConverter#getConversionSteps()
  getConversionSteps() {
    return [this];
  }

  // Java: AbstractConverter#isLinear() (true for all but AddConverter and Pairs containing one)
  isLinear() {
    return true;
  }

  // Java: AbstractConverter#isSimpleCompositionWith(AbstractConverter)
  isSimpleCompositionWith() {
    return false;
  }

  // Java: Objects.equals on converters (class and fields)
  equals(o) {
    return this.key() === o.key();
  }
}

// Java: AbstractConverter.Identity
class Identity extends AbstractConverter {
  static ORDER = 0;

  // Java: AbstractConverter.Identity#isIdentity()
  isIdentity() {
    return true;
  }

  // Java: AbstractConverter.Identity#key (structure key for equals)
  key() {
    return 'I';
  }

  // Java: AbstractConverter.Identity#inverse()
  inverseWhenNotIdentity() {
    return this;
  }
}

export const IDENTITY = new Identity();

// Java: MultiplyConverter
export class MultiplyConverter extends AbstractConverter {
  static ORDER = 4;

  // Java: MultiplyConverter#MultiplyConverter(double)
  constructor(factor) {
    super();
    this.factor = factor;
  }

  // Java: MultiplyConverter#getFactor()
  getFactor() {
    return this.factor;
  }

  // Java: MultiplyConverter#isIdentity()
  isIdentity() {
    return this.factor === 1;
  }

  // Java: MultiplyConverter#isSimpleCompositionWith(AbstractConverter)
  isSimpleCompositionWith(that) {
    return that instanceof MultiplyConverter;
  }

  // Java: MultiplyConverter#simpleCompose(AbstractConverter)
  simpleCompose(that) {
    return new MultiplyConverter(this.factor * that.factor);
  }

  // Java: MultiplyConverter#inverseWhenNotIdentity()
  inverseWhenNotIdentity() {
    return new MultiplyConverter(1 / this.factor);
  }

  // Java: MultiplyConverter#convertWhenNotIdentity(double)
  convertWhenNotIdentity(value) {
    return value * this.factor;
  }

  // Java: MultiplyConverter#equals(Object) (Double.equals semantics)
  key() {
    return `M${Object.is(this.factor, -0) ? '-0' : this.factor}`;
  }
}

// Java: RationalConverter.toDouble(BigInteger) (long -> double below 64 bits, else BigInteger.doubleValue; both round to nearest even)
const bigToDouble = (b) => Number(b);

// Java: BigInteger#gcd(BigInteger)
function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

// Java: RationalConverter
export class RationalConverter extends AbstractConverter {
  static ORDER = 2;

  // Java: RationalConverter#RationalConverter(BigInteger,BigInteger)
  constructor(dividend, divisor) {
    super();
    if (divisor <= 0n) throw new IllegalArgumentException('Negative or zero divisor');
    this.dividend = dividend;
    this.divisor = divisor;
  }

  // Java: RationalConverter#isIdentity()
  isIdentity() {
    return this.dividend === this.divisor;
  }

  // Java: RationalConverter#isSimpleCompositionWith(AbstractConverter)
  isSimpleCompositionWith(that) {
    return that instanceof RationalConverter;
  }

  // Java: RationalConverter#simpleCompose(AbstractConverter) / composeSameType(RationalConverter)
  simpleCompose(that) {
    let dividend = this.dividend * that.dividend;
    let divisor = this.divisor * that.divisor;
    const g = gcd(dividend, divisor);
    dividend /= g;
    divisor /= g;
    return dividend === 1n && divisor === 1n ? IDENTITY : new RationalConverter(dividend, divisor);
  }

  // Java: RationalConverter#inverseWhenNotIdentity()
  inverseWhenNotIdentity() {
    if (this.dividend < 0n) return new RationalConverter(-this.divisor, -this.dividend);
    return new RationalConverter(this.divisor, this.dividend);
  }

  // Java: RationalConverter#convertWhenNotIdentity(double)
  convertWhenNotIdentity(value) {
    return (value * bigToDouble(this.dividend)) / bigToDouble(this.divisor);
  }

  // Java: RationalConverter#equals(Object)
  key() {
    return `R${this.dividend}/${this.divisor}`;
  }
}

// Java: AddConverter
export class AddConverter extends AbstractConverter {
  static ORDER = 5;

  // Java: AddConverter#AddConverter(double)
  constructor(offset) {
    super();
    this.offset = offset;
  }

  // Java: AddConverter#getOffset()
  getOffset() {
    return this.offset;
  }

  // Java: AddConverter#isIdentity()
  isIdentity() {
    return this.offset === 0;
  }

  // Java: AddConverter#isLinear()
  isLinear() {
    return false;
  }

  // Java: AddConverter#isSimpleCompositionWith(AbstractConverter)
  isSimpleCompositionWith(that) {
    return that instanceof AddConverter;
  }

  // Java: AddConverter#simpleCompose(AbstractConverter)
  simpleCompose(that) {
    return new AddConverter(this.offset + that.offset);
  }

  // Java: AddConverter#inverseWhenNotIdentity()
  inverseWhenNotIdentity() {
    return new AddConverter(-this.offset);
  }

  // Java: AddConverter#convertWhenNotIdentity(double)
  convertWhenNotIdentity(value) {
    return value + this.offset;
  }

  // Java: AddConverter#equals(Object) (Double.equals semantics)
  key() {
    return `A${Object.is(this.offset, -0) ? '-0' : this.offset}`;
  }
}

// Java: AbstractConverter.Pair (left.convert(right.convert(x)))
export class Pair extends AbstractConverter {
  static ORDER = 99;

  // Java: AbstractConverter.Pair#Pair(UnitConverter,UnitConverter)
  constructor(left, right) {
    super();
    if (left === null || right === null) throw new IllegalArgumentException('Converters cannot be null');
    this.left = left;
    this.right = right;
  }

  // Java: AbstractConverter.Pair#isLinear()
  isLinear() {
    return this.left.isLinear() && this.right.isLinear();
  }

  // Java: AbstractConverter.Pair#isIdentity()
  isIdentity() {
    return false;
  }

  // Java: AbstractConverter.Pair#createConversionSteps()
  getConversionSteps() {
    return [...this.left.getConversionSteps(), ...this.right.getConversionSteps()];
  }

  // Java: AbstractConverter.Pair#inverseWhenNotIdentity()
  inverseWhenNotIdentity() {
    return new Pair(this.right.inverse(), this.left.inverse());
  }

  // Java: AbstractConverter.Pair#convertWhenNotIdentity(double)
  convertWhenNotIdentity(value) {
    return this.left.convert(this.right.convert(value));
  }

  // Java: AbstractConverter.Pair#equals(Object)
  key() {
    return `P(${this.left.key()},${this.right.key()})`;
  }
}

// Java: Simplifier#isNormalFormOrderWhenIdentity(AbstractConverter,AbstractConverter)
function isNormalFormOrderWhenIdentity(a, b) {
  if (a.constructor === b.constructor) return true;
  return orderOf(a) <= orderOf(b);
}

// Java: Simplifier#isNormalFormOrderWhenCommutative(AbstractConverter,AbstractConverter)
function isNormalFormOrderWhenCommutative(a, b) {
  if (a.constructor === b.constructor) return true;
  return orderOf(a) <= orderOf(b);
}

// Java: Simplifier#compose(AbstractConverter,AbstractConverter,BiPredicate,BinaryOperator) with the predicate/operator of AbstractConverter#concatenate
export function compose(a, b) {
  if (a.isIdentity()) {
    if (b.isIdentity()) return isNormalFormOrderWhenIdentity(a, b) ? a : b;
    return b;
  }
  if (b.isIdentity()) return a;
  if (a.isSimpleCompositionWith(b)) return a.simpleCompose(b);
  const commutative = a.isLinear() && b.isLinear();
  const swap = commutative && !isNormalFormOrderWhenCommutative(a, b);
  const pair = swap ? new Pair(b, a) : new Pair(a, b);
  return simplify(pair.getConversionSteps());
}

// Java: SimplificationWorker#lambda$sortToNormalFormOrder$1 comparator
function compareNormalForm(a, b) {
  if (a.isIdentity()) {
    if (b.isIdentity()) return isNormalFormOrderWhenIdentity(a, b) ? -1 : 1;
    return -1;
  }
  if (b.isIdentity()) return 1;
  return isNormalFormOrderWhenCommutative(a, b) ? -1 : 1;
}

// Java: java.util.TimSort for ranges below MIN_MERGE (countRunAndMakeAscending + binarySort), comparator may be inconsistent
function timSortSmall(a, lo, hi, c) {
  if (hi - lo < 2) return;
  let runHi = lo + 1;
  let runLen;
  if (runHi === hi) {
    runLen = 1;
  } else if (c(a[runHi++], a[lo]) < 0) {
    while (runHi < hi && c(a[runHi], a[runHi - 1]) < 0) runHi++;
    for (let i = lo, j = runHi - 1; i < j; i++, j--) [a[i], a[j]] = [a[j], a[i]];
    runLen = runHi - lo;
  } else {
    while (runHi < hi && c(a[runHi], a[runHi - 1]) >= 0) runHi++;
    runLen = runHi - lo;
  }
  for (let start = lo + runLen; start < hi; start++) {
    const pivot = a[start];
    let left = lo;
    let right = start;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (c(pivot, a[mid]) < 0) right = mid;
      else left = mid + 1;
    }
    for (let n = start; n > left; n--) a[n] = a[n - 1];
    a[left] = pivot;
  }
}

// Java: SimplificationWorker#sortToNormalFormOrder(AbstractConverter[]) (BitScanner over isLinear runs)
function sortToNormalFormOrder(arr) {
  let i = 0;
  while (i < arr.length) {
    if (!arr[i].isLinear()) {
      i++;
      continue;
    }
    let end = i;
    while (end < arr.length && arr[end].isLinear()) end++;
    timSortSmall(arr, i, end, compareNormalForm);
    i = end;
  }
}

// Java: SimplificationWorker#trySimplify() via ArrayAdapter#visitSequentialPairsAndSimplify
function trySimplify(state) {
  const arr = state.arr;
  if (arr.length < 2) return 0;
  let count = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] === null) continue;
    const x = arr[i - 1];
    const y = arr[i];
    let r;
    if (x.isIdentity()) r = y;
    else if (y.isIdentity()) r = x;
    else r = x.isSimpleCompositionWith(y) ? x.simpleCompose(y) : null;
    if (r !== null) {
      arr[i - 1] = r;
      arr[i] = null;
      count++;
    }
  }
  if (count > 0) state.arr = arr.filter((e) => e !== null);
  return count;
}

// Java: SimplificationWorker#simplify(List)
function simplify(steps) {
  const state = { arr: steps.slice() };
  sortToNormalFormOrder(state.arr);
  while (trySimplify(state) > 0) sortToNormalFormOrder(state.arr);
  const arr = state.arr;
  if (arr.length === 0) return IDENTITY;
  if (arr.length === 1) return arr[0];
  let result = new Pair(arr[0], arr[1]);
  for (let i = 2; i < arr.length; i++) result = new Pair(result, arr[i]);
  return result;
}
