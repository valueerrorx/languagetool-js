// org.languagetool.rules.en.UnitConversionRuleUS
import { UnitConversionRule } from './UnitConversionRule.js';
import { getUrl } from '../../../core/Tools.js';
import { DecimalFormat } from '../../../lib/java/DecimalFormat.js';
import { Locale } from '../../../lib/java/Locale.js';
import { METRE, SQUARE_METRE, CUBIC_METRE, LITRE, KILOMETRE_PER_HOUR } from '../../../lib/units/units.js';
import { US_QUART, US_GALLON, US_PINT, US_CUP, US_FL_OUNCE } from '../../../core/rules/AbstractUnitConversionRule.js';

// Java: UnitConversionRuleUS
export class UnitConversionRuleUS extends UnitConversionRule {
  static FQCN = 'org.languagetool.rules.en.UnitConversionRuleUS';

  // Java: UnitConversionRuleUS(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setUrl(getUrl('https://languagetool.org/insights/post/imperial-metric-system/'));

    this.format = DecimalFormat.getNumberInstance(Locale.US);
    this.format.setMaximumFractionDigits(2);
    this.format.setRoundingMode('HALF_UP');

    this.addUnit("(kilometre|kilometer)s? per hour", KILOMETRE_PER_HOUR, "kilometers per hour", 1, true);
    this.addUnit("kilomet(re|er)s?", METRE, "kilometers", 1e3, true);
    this.addUnit("met(re|er)s?", METRE, "meters", 1e0, true);
    this.addUnit("decimet(re|er)s?", METRE, "decimeters", 1e-1, false); // Metric, but not commonly used
    this.addUnit("centimet(re|er)s?", METRE, "centimeters", 1e-2, true);
    this.addUnit("millimet(re|er)s?", METRE, "micrometers", 1e-3, true);
    this.addUnit("micromet(re|er)s?", METRE, "micrometers", 1e-6, true);
    this.addUnit("nanomet(re|er)s?", METRE, "nanometers", 1e-9, true);
    this.addUnit("square met(re|er)s?", SQUARE_METRE, "square meters", 1, true);
    this.addUnit("square kilomet(re|er)s?", SQUARE_METRE, "square kilometers", 1e6, true);
    this.addUnit("square decimet(re|er)s?", SQUARE_METRE, "square decimeters", 1e-2, false); // Metric, but not commonly used
    this.addUnit("square centimet(re|er)s?", SQUARE_METRE, "square centimeters", 1e-4, true);
    this.addUnit("square millimet(re|er)s?", SQUARE_METRE, "square millimeters", 1e-6, true);
    this.addUnit("square micromet(re|er)s?", SQUARE_METRE, "square micrometers", 1e-12, true);
    this.addUnit("square nanomet(re|er)s?", SQUARE_METRE, "square nanometers", 1e-18, true);
    this.addUnit("cubic met(re|er)s?", CUBIC_METRE, "cubic meters", 1, true);
    this.addUnit("cubic kilomet(re|er)s?", CUBIC_METRE, "cubic kilometers", 1e9, true);
    this.addUnit("cubic decimet(re|er)s?", CUBIC_METRE, "cubic decimeters", 1e-3, false); // Metric, but not commonly used
    this.addUnit("cubic centimet(re|er)s?", CUBIC_METRE, "cubic centimeters", 1e-6, true);
    this.addUnit("cubic millimet(re|er)s?", CUBIC_METRE, "cubic millimeters", 1e-9, true);
    this.addUnit("cubic micromet(re|er)s?", CUBIC_METRE, "cubic micrometers", 1e-18, true);
    this.addUnit("cubic nanomet(re|er)s?", CUBIC_METRE, "cubic nanometers", 1e-27, true);
    this.addUnit("lit(re|er)s?", LITRE, "liters", 1, true);
    this.addUnit("millilit(re|er)s?", LITRE, "milliliters", 1e-3, true);
    this.addUnit("qt\\.", US_QUART, "qt.", 1, false);
    this.addUnit("gal", US_GALLON, "gal", 1, false);
    this.addUnit("pt", US_PINT, "pt", 1, false);
    this.addUnit("cup", US_CUP, "cups", 1, false);
    this.addUnit("(?:fl.? oz.?|oz. fl.)", US_FL_OUNCE, "fl oz", 1, false);
    this.addUnit("quarts?", US_QUART, "quarts", 1, false);
    this.addUnit("gallons?", US_GALLON, "gallons", 1, false);
    this.addUnit("pints?", US_PINT, "pints", 1, false);
    this.addUnit("cups?", US_CUP, "cups", 1, false);
    this.addUnit("(fluid )?ounces?", US_FL_OUNCE, "fluid ounces", 1, false);
  }

  // Java: UnitConversionRuleUS#getId()
  getId() {
    return 'METRIC_UNITS_EN_US';
  }
}
