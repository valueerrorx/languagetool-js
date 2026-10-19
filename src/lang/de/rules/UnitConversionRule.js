// org.languagetool.rules.de.UnitConversionRule
import { AbstractUnitConversionRule, Message, MILE, FEET, YARD, INCH, POUND, FAHRENHEIT } from '../../../core/rules/AbstractUnitConversionRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { DecimalFormat } from '../../../lib/java/DecimalFormat.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { KILOGRAM, METRE, SQUARE_METRE, CUBIC_METRE, LITRE, CELSIUS, HOUR, KILOMETRE_PER_HOUR } from '../../../lib/units/units.js';

// Java: UnitConversionRule
export class UnitConversionRule extends AbstractUnitConversionRule {
  static FQCN = 'org.languagetool.rules.de.UnitConversionRule';

  // Java: UnitConversionRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.format = DecimalFormat.getNumberInstance(Locale.GERMANY);
    this.format.setMaximumFractionDigits(2);
    this.format.setRoundingMode('HALF_UP');
    this.addExamplePair(Example.wrong('Ich bin <marker>6 Fuß</marker> groß.'),
      Example.fixed('Ich bin <marker>6 Fuß (1,83 m)</marker> groß.'));

    this.addUnit("Kilo(gramm)?", KILOGRAM, "Kilogramm", 1, true);
    this.addUnit("Gramm", KILOGRAM, "Gramm", 1e-3, true);
    this.addUnit("Tonnen?", KILOGRAM, "Tonnen", 1e3, true);
    this.addUnit("Pfund", POUND, "Pfund", 1, false);
    this.addUnit("Meilen?", MILE, "Meile", 1, false);
    this.addUnit("Yard", YARD, "Yard", 1, false);
    this.addUnit("Fuß", FEET, "Fuß", 1, false);
    this.addUnit("Zoll", INCH, "Zoll", 1, false);
    this.addUnit("(Kilometer pro Stunde|Stundenkilometer)", KILOMETRE_PER_HOUR, "Kilometer pro Stunde", 1, true);
    this.addUnit("Meilen pro Stunde", MILE.divideUnit(HOUR), "Meilen pro Stunde", 1, false);
    this.addUnit("Meter", METRE, "Meter", 1, true);
    this.addUnit("Kilometer", METRE, "Kilometer", 1e3, true);
    this.addUnit("Zentimeter", METRE, "Zentimeter", 1e-2, true);
    this.addUnit("Millimeter", METRE, "Millimeter", 1e-3, true);
    this.addUnit("Mikrometer", METRE, "Mikrometer", 1e-6, true);
    this.addUnit("Nanometer", METRE, "Nanometer", 1e-9, true);
    this.addUnit("Pikometer", METRE, "Pikometer", 1e-12, true);
    this.addUnit("Femtometer", METRE, "Femtometer", 1e-15, true);
    this.addUnit("Quadratmeter", SQUARE_METRE, "Quadratmeter", 1, true);
    this.addUnit("Hektar", SQUARE_METRE, "Hektar", 1e4, true);
    this.addUnit("Ar", SQUARE_METRE, "Ar", 1e2, true);
    this.addUnit("Quadratkilometer", SQUARE_METRE, "Quadratkilometer", 1e6, true);
    this.addUnit("Quadratzentimeter", SQUARE_METRE, "Quadratzentimeter", 1e-4, true);
    this.addUnit("Quadratmillimeter", SQUARE_METRE, "Quadratmillimeter", 1e-6, true);
    this.addUnit("Quadratmikrometer", SQUARE_METRE, "Quadratmikrometer", 1e-12, true);
    this.addUnit("Quadratnanometer", SQUARE_METRE, "Quadratnanometer", 1e-18, true);
    this.addUnit("Kubikmeter", CUBIC_METRE, "Kubikmeter", 1, true);
    this.addUnit("Kubikkilometer", CUBIC_METRE, "Kubikkilometer", 1e9, true);
    this.addUnit("Kubikzentimeter", CUBIC_METRE, "Kubikzentimeter", 1e-6, true);
    this.addUnit("Kubikmillimeter", CUBIC_METRE, "Kubikmillimeter", 1e-9, true);
    this.addUnit("Kubikmikrometer", CUBIC_METRE, "Kubikmikrometer", 1e-18, true);
    this.addUnit("Kubiknanometer", CUBIC_METRE, "Kubiknanometer", 1e-27, true);
    this.addUnit("Liter", LITRE, "Liter", 1, true);
    this.addUnit("Milliliter", LITRE, "Milliliter", 1e-3, true);
    this.addUnit("(?:Grad)? Fahrenheit", FAHRENHEIT, "Grad Fahrenheit", 1, false);
    this.addUnit("(?:Grad)? Celsius", CELSIUS, "Grad Celsius", 1, true);
  }

  // Java: UnitConversionRule#getId()
  getId() {
    return 'EINHEITEN_METRISCH';
  }

  // Java: UnitConversionRule#getDescription()
  getDescription() {
    return 'Schlägt vor oder überprüft Angaben des metrischen Äquivalentes bei bestimmten Maßeinheiten.';
  }

  // Java: UnitConversionRule#getMessage(Message)
  getMessage(message) {
    switch (message) {
      case Message.CHECK:
        return 'Diese Umrechnung scheint falsch zu sein. Wollen Sie sie automatisch korrigieren lassen?';
      case Message.SUGGESTION:
        return 'Wollen Sie eine Umwandlung ins metrische System automatisch hinzufügen?';
      case Message.CHECK_UNKNOWN_UNIT:
        return 'Die in dieser Umrechnung verwendete Einheit wurde nicht erkannt.';
      case Message.UNIT_MISMATCH:
        return 'Diese Einheiten sind nicht kompatibel.';
      default:
        throw new RuntimeException(`Unknown message type: ${message}`);
    }
  }

  // Java: UnitConversionRule#getShortMessage(Message)
  getShortMessage(message) {
    switch (message) {
      case Message.CHECK:
        return 'Falsche Umrechnung. Automatisch korrigieren?';
      case Message.SUGGESTION:
        return 'Metrisches Äquivalent hinzufügen?';
      case Message.CHECK_UNKNOWN_UNIT:
        return 'Unbekannte Einheit.';
      case Message.UNIT_MISMATCH:
        return 'Inkompatible Einheiten.';
      default:
        throw new RuntimeException(`Unknown message type: ${message}`);
    }
  }

  // Java: UnitConversionRule#getNumberFormat()
  getNumberFormat() {
    return this.format;
  }
}
