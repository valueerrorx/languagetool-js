// Subset of tech.units.indriya 1.3 units (BaseUnit, TransformedUnit, ProductUnit) and tech.units.indriya.unit.Units constants used by AbstractUnitConversionRule.
import { Exception } from '../java/errors.js';
import { AbstractConverter, IDENTITY, MultiplyConverter, RationalConverter, AddConverter } from './converters.js';

// Java: javax.measure.UnconvertibleException
export class UnconvertibleException extends Exception {
  static FQCN = 'javax.measure.UnconvertibleException';
}

// Java: AbstractUnit#isLongValue(double)
function isLongValue(d) {
  return d >= -9.223372036854776e18 && d <= 9.223372036854776e18 && Math.floor(d) === d;
}

// Java: (long) double cast (saturating)
function d2l(d) {
  if (d >= 9.223372036854776e18) return 9223372036854775807n;
  if (d <= -9.223372036854776e18) return -9223372036854775808n;
  return BigInt(d);
}

// Java: AbstractUnit#converterOf(double)
function converterOf(d) {
  return isLongValue(d) ? new RationalConverter(d2l(d), 1n) : new MultiplyConverter(d);
}

// Java: AbstractUnit (multiply/divide/shift/transform/getConverterTo/isCompatible/equals)
export class AbstractUnit {
  // Java: AbstractUnit#isSystemUnit()
  isSystemUnit() {
    return this.getSystemConverter().isIdentity();
  }

  // Java: AbstractUnit#transform(UnitConverter)
  transform(operation) {
    const systemUnit = this.getSystemUnit();
    const converter = this.isSystemUnit() ? this.getSystemConverter().concatenate(operation) : operation;
    if (converter.isIdentity()) return systemUnit;
    return new TransformedUnit(this, systemUnit, converter);
  }

  // Java: AbstractUnit#shift(double)
  shift(offset) {
    return offset === 0 ? this : this.transform(new AddConverter(offset));
  }

  // Java: AbstractUnit#multiply(double)
  multiplyDouble(factor) {
    return factor === 1 ? this : this.transform(converterOf(factor));
  }

  // Java: AbstractUnit#divide(double)
  divideDouble(divisor) {
    if (divisor === 1) return this;
    if (isLongValue(divisor)) return this.transform(new RationalConverter(1n, d2l(divisor)));
    return this.transform(new MultiplyConverter(1 / divisor));
  }

  // Java: AbstractUnit#multiply(Unit) / multiply(AbstractUnit)
  multiplyUnit(that) {
    if (this.equals(ONE)) return that;
    if (that.equals(ONE)) return this;
    return ofProduct(this, that);
  }

  // Java: AbstractUnit#divide(Unit)
  divideUnit(that) {
    return this.multiplyUnit(that.inverse());
  }

  // Java: AbstractUnit#inverse()
  inverse() {
    if (this.equals(ONE)) return this;
    return ofQuotient(ONE, this);
  }

  // Java: AbstractUnit#isCompatible(Unit) (dimension equality; fundamental-dimension fallback is the same for the units in use)
  isCompatible(that) {
    if (this === that || this.equals(that)) return true;
    return this.getDimension() === that.getDimension();
  }

  // Java: AbstractUnit#getConverterTo(Unit); throws UnconvertibleException for incompatible units
  getConverterTo(that) {
    if (this === that || this.equals(that)) return IDENTITY;
    if (!this.isCompatible(that)) throw new UnconvertibleException(`${this.getDimension()} is not compatible with ${that.getDimension()}`);
    const thatSystem = that.getSystemConverter();
    return thatSystem.inverse().concatenate(this.getSystemConverter());
  }

  // Java: Object#equals via structural key (TransformedUnit/ProductUnit/BaseUnit equals)
  equals(o) {
    return o instanceof AbstractUnit && this.key() === o.key();
  }
}

// Java: BaseUnit
export class BaseUnit extends AbstractUnit {
  // Java: BaseUnit#BaseUnit(String,Dimension)
  constructor(symbol, dimension) {
    super();
    this.symbol = symbol;
    this.dimension = dimension;
  }

  // Java: BaseUnit#getSystemConverter()
  getSystemConverter() {
    return IDENTITY;
  }

  // Java: BaseUnit#toSystemUnit()
  getSystemUnit() {
    return this;
  }

  // Java: BaseUnit#getDimension()
  getDimension() {
    return this.dimension;
  }

  // Java: BaseUnit#equals(Object)
  key() {
    return `B:${this.symbol}`;
  }
}

// Java: TransformedUnit
export class TransformedUnit extends AbstractUnit {
  // Java: TransformedUnit#TransformedUnit(String,Unit,Unit,UnitConverter)
  constructor(parent, systemUnit, converter) {
    super();
    this.parentUnit = parent;
    this.systemUnit = systemUnit;
    this.converter = converter;
  }

  // Java: TransformedUnit#getSystemConverter()
  getSystemConverter() {
    return this.parentUnit.getSystemConverter().concatenate(this.converter);
  }

  // Java: TransformedUnit#toSystemUnit()
  getSystemUnit() {
    return this.systemUnit ?? this.parentUnit.getSystemUnit();
  }

  // Java: TransformedUnit#getDimension()
  getDimension() {
    return this.parentUnit.getDimension();
  }

  // Java: TransformedUnit#equals(Object)
  key() {
    return `T(${this.parentUnit.key()}|${this.converter.key()})`;
  }
}

// Java: ProductUnit (elements: unit, pow, root)
export class ProductUnit extends AbstractUnit {
  // Java: ProductUnit#ProductUnit(ProductUnit.Element[])
  constructor(elements) {
    super();
    this.elements = elements;
  }

  // Java: ProductUnit#getSystemConverter()
  getSystemConverter() {
    let converter = IDENTITY;
    for (const e of this.elements) {
      let c = e.unit.getSystemConverter();
      let pow = e.pow;
      if (pow < 0) {
        pow = -pow;
        c = c.inverse();
      }
      for (let i = 0; i < pow; i++) converter = converter.concatenate(c);
    }
    return converter;
  }

  // Java: ProductUnit#toSystemUnit(): product of the elements' system units
  getSystemUnit() {
    let result = ONE;
    for (const e of this.elements) {
      let u = e.unit.getSystemUnit();
      u = e.pow < 0 ? ofPow(u, e.pow) : ofPow(u, e.pow);
      result = result.multiplyUnit(u);
    }
    return result;
  }

  // Java: ProductUnit#getDimension()
  getDimension() {
    const dims = new Map();
    for (const e of this.elements) {
      for (const part of e.unit.getDimension().split(',')) {
        if (part === '') continue;
        const [name, p] = part.split('^');
        dims.set(name, (dims.get(name) ?? 0) + Number(p) * e.pow);
      }
    }
    return [...dims.entries()].filter(([, p]) => p !== 0).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([n, p]) => `${n}^${p}`).join(',');
  }

  // Java: ProductUnit#equals(Object): same elements in any order
  key() {
    return `P{${this.elements.map((e) => `${e.unit.key()}^${e.pow}/${e.root}`).sort().join(';')}}`;
  }
}

// Java: ProductUnit.ofPow(Unit,int) (integer powers)
function ofPow(unit, n) {
  if (n === 1) return unit;
  return ofProductElements([{ unit, pow: n, root: 1 }]);
}

// Java: ProductUnit#getInstance(Element[],Element[]) simplification to ONE / a single unit
function ofProductElements(elements) {
  if (elements.length === 0) return ONE;
  if (elements.length === 1 && elements[0].pow === elements[0].root) return elements[0].unit;
  return new ProductUnit(elements);
}

// Java: ProductUnit#elementsOf(Unit)
function elementsOf(u) {
  return u instanceof ProductUnit ? u.elements : [{ unit: u, pow: 1, root: 1 }];
}

// Java: ProductUnit.ofProduct(Unit,Unit) (integer exponents only)
function ofProduct(left, right) {
  const result = elementsOf(left).map((e) => ({ ...e }));
  for (const r of elementsOf(right)) {
    const found = result.find((e) => e.unit.equals(r.unit));
    if (found) found.pow += r.pow;
    else result.push({ ...r });
  }
  return ofProductElements(result.filter((e) => e.pow !== 0));
}

// Java: ProductUnit.ofQuotient(Unit,Unit)
function ofQuotient(left, right) {
  return ofProduct(left, ofProductElements(elementsOf(right).map((e) => ({ ...e, pow: -e.pow }))));
}

// Java: AbstractUnit.ONE (ProductUnit without elements)
const ONE = new ProductUnit([]);

// Java: Units constants
const dim = (n) => `${n}^1`;
export const KILOGRAM = new BaseUnit('kg', dim('M'));
export const METRE = new BaseUnit('m', dim('L'));
export const SECOND = new BaseUnit('s', dim('T'));
export const KELVIN = new BaseUnit('K', dim('Θ'));
export const SQUARE_METRE = METRE.multiplyUnit(METRE);
export const CUBIC_METRE = SQUARE_METRE.multiplyUnit(METRE);
export const HOUR = new TransformedUnit(SECOND, SECOND, new RationalConverter(3600n, 1n));
export const METRE_PER_SECOND = METRE.divideUnit(SECOND);
export const KILOMETRE_PER_HOUR = METRE_PER_SECOND.multiplyDouble(0.277778);
export const LITRE = new TransformedUnit(CUBIC_METRE, CUBIC_METRE.getSystemUnit(), new RationalConverter(1n, 1000n));
export const CELSIUS = new TransformedUnit(KELVIN, KELVIN, new AddConverter(273.15));
export { AbstractConverter };
