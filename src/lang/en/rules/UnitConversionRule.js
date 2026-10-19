// org.languagetool.rules.en.UnitConversionRule
import { AbstractUnitConversionRule, MILE, FEET, YARD, INCH, POUND, OUNCE, FAHRENHEIT } from '../../../core/rules/AbstractUnitConversionRule.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { DecimalFormat } from '../../../lib/java/DecimalFormat.js';
import { Locale } from '../../../lib/java/Locale.js';
import { KILOGRAM, METRE, CELSIUS, HOUR } from '../../../lib/units/units.js';

// Java: UnitConversionRule
export class UnitConversionRule extends AbstractUnitConversionRule {
  static FQCN = 'org.languagetool.rules.en.UnitConversionRule';

  // Java: UnitConversionRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setTags([Tag.picky]);
    this.format = DecimalFormat.getNumberInstance(Locale.ENGLISH);
    this.format.setMaximumFractionDigits(2);
    this.format.setRoundingMode('HALF_UP');
    this.addUnit("miles per hour", MILE.divideUnit(HOUR), "miles per hour", 1, false);
    this.addUnit("kilograms?", KILOGRAM, "kilogram", 1e0, true);
    this.addUnit("grams?", KILOGRAM, "gram", 1e-3, true);
    this.addUnit("tons?", KILOGRAM, "ton", 1e3, true);
    this.addUnit("pounds?", POUND, "pounds", 1, false);
    this.addUnit("ounces?", OUNCE, "ounces", 1, false);
    this.addUnit("feet", FEET, "feet", 1, false);
    this.addUnit("miles?", MILE, "miles", 1, false);
    this.addUnit("yards?", YARD, "yards", 1, false);
    this.addUnit("inch(es)?", INCH, "inches", 1, false);
    this.addUnit("(?:degrees?)? Fahrenheit", FAHRENHEIT, "degree Fahrenheit", 1, false);
    this.addUnit("(?:degrees?)? Celsius", CELSIUS, "degree Celsius", 1, true);
  }

  // Java: UnitConversionRule#getId()
  getId() {
    return 'METRIC_UNITS_EN_GENERAL';
  }

  // Java: UnitConversionRule#getDescription()
  getDescription() {
    return 'Suggests or checks conversion of units to their metric equivalents.';
  }

  // Java: UnitConversionRule#getNumberFormat()
  getNumberFormat() {
    return this.format;
  }
}
