// org.languagetool.rules.AbstractUnitConversionRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';
import { Pattern } from '../../lib/java/regex/Pattern.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { DecimalFormat } from '../../lib/java/DecimalFormat.js';
import { RuntimeException, ParseException } from '../../lib/java/errors.js';
import { Double } from '../../lib/java/numbers.js';
import { mathRoundDouble } from '../../lib/java/float.js';
import { javaTrim } from '../../lib/java/strings.js';
import { URLEncoder } from '../../lib/java/net.js';
import { URL } from '../../lib/java/URL.js';
import { UnconvertibleException, KILOGRAM, METRE, SQUARE_METRE, CUBIC_METRE, LITRE, CELSIUS, KILOMETRE_PER_HOUR, HOUR } from '../../lib/units/units.js';

// Java: AbstractUnitConversionRule#POUND ... FAHRENHEIT (static units)
export const POUND = KILOGRAM.multiplyDouble(0.45359237);
export const OUNCE = POUND.divideDouble(12);
export const FEET = METRE.multiplyDouble(0.3048);
export const YARD = FEET.multiplyDouble(3);
export const INCH = FEET.divideDouble(12);
export const MILE = FEET.multiplyDouble(5280);
export const US_QUART = LITRE.multiplyDouble(0.946352946);
export const US_GALLON = US_QUART.multiplyDouble(4);
export const US_PINT = US_QUART.divideDouble(2);
export const US_CUP = US_QUART.divideDouble(4);
export const US_FL_OUNCE = US_QUART.divideDouble(32);
export const IMP_PINT = LITRE.multiplyDouble(0.5682612532);
export const IMP_QUART = IMP_PINT.multiplyDouble(2);
export const IMP_GALLON = IMP_QUART.multiplyDouble(4);
export const IMP_FL_OUNCE = IMP_PINT.divideDouble(20);
export const FAHRENHEIT = CELSIUS.multiplyDouble(5.0 / 9.0).shift(-32);

// limit size of matched number to (possibly) avoid hangups
const NUMBER_REGEX = '(-?[0-9]{1,32}[0-9,.]{0,32})';
const NUMBER_REGEX_WITH_BOUNDARY = '(-?\\b[0-9]{1,32}[0-9,.]{0,32})';

const DELTA = 1e-2;
const ROUNDING_DELTA = 0.05;
const MAX_SUGGESTIONS = 5;
const WHITESPACE_LIMIT = 5;

// Java: AbstractUnitConversionRule.Message
export const Message = Object.freeze({ SUGGESTION: 'SUGGESTION', CHECK: 'CHECK', CHECK_UNKNOWN_UNIT: 'CHECK_UNKNOWN_UNIT', UNIT_MISMATCH: 'UNIT_MISMATCH' });

// Java: AbstractUnitConversionRule#antiPatterns
const antiPatterns = [
  Pattern.compile("\\s?\\d+'\\d\\d\\d\\s?"), // "100'000", thousands separator in de-CH
  Pattern.compile('\\d+[-‐–]\\d+'), // "3-5 pounds"
  Pattern.compile('\\d+/\\d+'), // "1/4 mile"
  Pattern.compile('\\d+:\\d+'), // "A 2:1 cup"
  Pattern.compile('Pfund Sterling'), // "1.800 Pfund Sterling" (German)
  Pattern.compile('\\d+⁄\\d+'), // "1⁄4 cup" (it's not the standard slash)
];

// Java: AbstractUnitConversionRule
export class AbstractUnitConversionRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractUnitConversionRule';

  // Java: AbstractUnitConversionRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.numberRangePart = Pattern.compile(`${NUMBER_REGEX_WITH_BOUNDARY}$`);
    // entries {pattern, unit}: Java LinkedHashMap<Pattern,Unit> keyed by pattern identity (equal pattern texts stay distinct keys)
    this.unitPatterns = [];
    // for patterns that require a custom number parsing function: [pattern, unit, fn]
    this.specialPatterns = [];
    // Java: Map<Unit,List<String>> keyed by Unit equality: key -> {unit, symbols}
    this.unitSymbols = new Map();
    // for recognizing conversions made by this rule or the user
    this.convertedPatterns = [];
    // units to use for conversions
    this.metricUnits = [];
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);

    this.addUnit('kg', KILOGRAM, 'kg', 1e0, true);
    this.addUnit('g', KILOGRAM, 'g', 1e-3, true);
    this.addUnit('t', KILOGRAM, 't', 1e3, true);

    this.addUnit('lb', POUND, 'lb', 1, false);

    this.addUnit('mi', MILE, 'mi', 1, false);
    this.addUnit('yd', YARD, 'yd', 1, false);
    // negative lookahead here to avoid matching "'s" and so on
    this.addUnit("(?:ft|′|')(?!(\\w|\\d))", FEET, 'ft', 1, false);
    // removed 'in', " because of many false positives
    this.addUnit('(?:inch|″)(?!(\\w|\\d))', INCH, 'inch', 1, false);

    this.addUnit('(?:km/h|kmh)', KILOMETRE_PER_HOUR, 'km/h', 1, true);
    this.addUnit('(?:mph)', MILE.divideUnit(HOUR), 'mph', 1, false);

    this.addUnit('km', METRE, 'km', 1e3, true);
    this.addUnit('m', METRE, 'm', 1e0, true);
    this.addUnit('cm', METRE, 'cm', 1e-2, true);
    this.addUnit('mm', METRE, 'mm', 1e-3, true);
    this.addUnit('µm', METRE, 'µm', 1e-6, true);
    this.addUnit('nm', METRE, 'nm', 1e-9, true);

    this.addUnit('m(?:\\^2|2|²)', SQUARE_METRE, 'm²', 1, true);
    this.addUnit('ha', SQUARE_METRE, 'ha', 1e4, true);
    this.addUnit('a', SQUARE_METRE, 'a', 1e2, true);
    this.addUnit('km(?:\\^2|2|²)', SQUARE_METRE, 'km²', 1e6, true);
    this.addUnit('cm(?:\\^2|2|²)', SQUARE_METRE, 'cm²', 1e-4, true);
    this.addUnit('mm(?:\\^2|2|²)', SQUARE_METRE, 'mm²', 1e-6, true);
    this.addUnit('µm(?:\\^2|2|²)', SQUARE_METRE, 'µm²', 1e-12, true);
    this.addUnit('nm(?:\\^2|2|²)', SQUARE_METRE, 'nm²', 1e-18, true);

    this.addUnit('(?:sq|square) (?:in(?:ch)?|inches)', INCH.multiplyUnit(INCH), 'sq in', 1, false);
    this.addUnit('(?:inches|in|inch) (?:\\^2|2|²)', INCH.multiplyUnit(INCH), 'in²', 1, false);

    this.addUnit('(?:sq|square) (?:ft|feet|foot)', FEET.multiplyUnit(FEET), 'sq ft', 1, false);
    this.addUnit('sf', FEET.multiplyUnit(FEET), 'sf', 1, false);
    this.addUnit('ft(?:\\^2|2|²)', FEET.multiplyUnit(FEET), 'ft²', 1, false);

    this.addUnit('(?:sq|square) (?:yds?|yards?)', YARD.multiplyUnit(YARD), 'sq yd', 1, false);
    this.addUnit('(?:yards?|yds?)(?:\\^2|2|²)', YARD.multiplyUnit(YARD), 'yd²', 1, false);

    this.addUnit('m(?:\\^3|3|³)', CUBIC_METRE, 'm³', 1, true);
    this.addUnit('km(?:\\^3|3|³)', CUBIC_METRE, 'km³', 1e9, true);
    this.addUnit('cm(?:\\^3|3|³)', CUBIC_METRE, 'cm³', 1e-6, true);
    this.addUnit('mm(?:\\^3|3|³)', CUBIC_METRE, 'mm³', 1e-9, true);
    this.addUnit('µm(?:\\^3|3|³)', CUBIC_METRE, 'µm³', 1e-18, true);
    this.addUnit('nm(?:\\^3|3|³)', CUBIC_METRE, 'nm³', 1e-27, true);

    this.addUnit('(?:cubic|cu) (?:feet|ft|foot)', FEET.multiplyUnit(FEET).multiplyUnit(FEET), 'cubic feet', 1, false);
    this.addUnit('(?:feet|ft|foot)(?:\\^3|3|³)', FEET.multiplyUnit(FEET).multiplyUnit(FEET), 'ft³', 1, false);

    this.addUnit('(?:cubic|cu) (?:inch|in|inches)', INCH.multiplyUnit(INCH).multiplyUnit(INCH), 'cubic inch', 1, false);
    this.addUnit('(?:inch|in)(?:\\^3|3|³)', INCH.multiplyUnit(INCH).multiplyUnit(INCH), 'inch³', 1, false);

    this.addUnit('(?:cubic|cu) (?:yards?|yds?)', YARD.multiplyUnit(YARD).multiplyUnit(YARD), 'cubic yard', 1, false);
    this.addUnit('(?:yard|yd)(?:\\^3|3|³)', YARD.multiplyUnit(YARD).multiplyUnit(YARD), 'yard³', 1, false);

    this.addUnit('l', LITRE, 'l', 1, true);
    this.addUnit('ml', LITRE, 'ml', 1e-3, true);

    this.addUnit('°F', FAHRENHEIT, '°F', 1, false);
    this.addUnit('°C', CELSIUS, '°C', 1, true);

    this.convertedPatterns.push(Pattern.compile(`\\s*\\((?:ca. )?${NUMBER_REGEX}\\s*([^)]+)\\s*\\)`));

    // recognizes 5'6" = 5 feet + 6 inches = 5.5 feet
    const parseFeetAndInch = (match) => {
      let feet;
      let inch;
      try {
        feet = this.getNumberFormat().parse(match.group(1));
      } catch (e) {
        if (e instanceof ParseException) return null;
        throw e;
      }
      try {
        inch = this.getNumberFormat().parse(match.group(2));
      } catch (e) {
        if (!(e instanceof ParseException)) throw e;
        inch = 0.0;
      }
      return feet + inch / 12.0;
    };
    this.specialPatterns.push([Pattern.compile('(?:(?<=[^º°\\d]))\\s(\\d+)(?:ft|′|\')\\s*(\\d+)\\s*(?:in|"|″)?'), FEET, parseFeetAndInch]);
    this.specialPatterns.push([Pattern.compile('(?:(?<=[^º°\\d\\s]))(\\d+)(?:ft|′|\')\\s*(\\d+)\\s*(?:in|"|″)?'), FEET, parseFeetAndInch]);
  }

  // Java: AbstractUnitConversionRule#buildURLForExplanation(String)
  buildURLForExplanation(original) {
    try {
      const query = URLEncoder.encode(`convert ${original} to metric`, 'utf-8');
      return new URL(`http://www.wolframalpha.com/input/?i=${query}`);
    } catch (e) {
      return null;
    }
  }

  // Java: AbstractUnitConversionRule#getNumberFormat()
  getNumberFormat() {
    const df = DecimalFormat.getInstance();
    df.setMaximumFractionDigits(2);
    df.setRoundingMode('HALF_UP');
    return df;
  }

  // Java: AbstractUnitConversionRule#getMessage(Message)
  getMessage(message) {
    switch (message) {
      case Message.CHECK:
        return "This unit conversion doesn't seem right. Do you want to correct it automatically?";
      case Message.SUGGESTION:
        return 'Writing for an international audience? Consider adding the metric equivalent.';
      case Message.CHECK_UNKNOWN_UNIT:
        return "This unit conversion doesn't seem right, unable to recognize the used unit.";
      case Message.UNIT_MISMATCH:
        return "These units don't seem to be compatible.";
      default:
        throw new RuntimeException(`Unknown message type: ${message}`);
    }
  }

  // Java: AbstractUnitConversionRule#getShortMessage(Message)
  getShortMessage(message) {
    switch (message) {
      case Message.CHECK:
        return 'Incorrect unit conversion. Correct it?';
      case Message.SUGGESTION:
        return 'Add metric equivalent?';
      case Message.CHECK_UNKNOWN_UNIT:
        return 'Unknown unit used in conversion.';
      case Message.UNIT_MISMATCH:
        return 'Units incompatible.';
      default:
        throw new RuntimeException(`Unknown message type: ${message}`);
    }
  }

  // Java: AbstractUnitConversionRule#getSuggestion(String,String)
  getSuggestion(original, converted) {
    return `${original} (${converted})`;
  }

  // Java: AbstractUnitConversionRule#formatRounded(String)
  formatRounded(s) {
    return `ca. ${s}`;
  }

  // Java: AbstractUnitConversionRule#addUnit(String,Unit,String,double,boolean)
  addUnit(pattern, base, symbol, factor, metric) {
    const unit = base.multiplyDouble(factor);
    this.unitPatterns.push({ pattern: Pattern.compile(`${NUMBER_REGEX_WITH_BOUNDARY}[\\s ]{0,${WHITESPACE_LIMIT}}${pattern}\\b`, Pattern.UNICODE_CHARACTER_CLASS), unit });
    const key = unit.key();
    if (!this.unitSymbols.has(key)) this.unitSymbols.set(key, { unit, symbols: [] });
    this.unitSymbols.get(key).symbols.push(symbol);
    if (metric && !this.metricUnits.some((u) => u.equals(unit))) {
      this.metricUnits.push(unit);
    }
  }

  // Java: AbstractUnitConversionRule#getMetricEquivalent(double,Unit); returns [[unit, converted]...] or null
  getMetricEquivalent(value, unit) {
    const conversions = [];
    for (const metric of this.metricUnits) {
      if (unit.equals(metric)) { // don't convert to itself
        return null;
      }
      if (unit.isCompatible(metric)) {
        const converted = unit.getConverterTo(metric).convert(value);
        conversions.push([metric, converted]);
      }
    }
    this.sortByNaturalness(conversions);
    if (conversions.length === 0) {
      return null;
    }
    return conversions;
  }

  // Java: AbstractUnitConversionRule#formatMeasurement(double,Unit)
  formatMeasurement(value, unit) {
    const equivalents = this.getMetricEquivalent(value, unit);
    if (equivalents === null) {
      return null;
    }
    const formatted = this.getFormattedConversions(equivalents);
    if (formatted.length === 0) {
      return null;
    }
    return formatted;
  }

  // Java: AbstractUnitConversionRule#getFormattedConversions(List)
  getFormattedConversions(conversions) {
    const formatted = [];
    for (const equivalent of conversions) {
      const metric = equivalent[0];
      const converted = equivalent[1];
      const rounded = mathRoundDouble(converted);
      const entry = this.unitSymbols.get(metric.key());
      for (const symbol of entry === undefined ? [] : entry.symbols) {
        if (formatted.length > MAX_SUGGESTIONS) {
          break;
        }
        if (Math.abs(converted - Number(rounded)) / Math.abs(converted) < ROUNDING_DELTA && rounded !== 0n) {
          const formattedStr = this.formatRounded(`${this.getNumberFormat().formatLong(rounded)} ${symbol}`);
          if (!formatted.includes(formattedStr)) {
            formatted.push(formattedStr);
          }
        }
        const formattedNumber = this.getNumberFormat().formatDouble(converted);
        const formattedStr = `${formattedNumber} ${symbol}`;
        // TODO: be cleverer than !equals("0"), can prevent valid conversions
        if (!formatted.includes(formattedStr) && formattedNumber !== '0') {
          formatted.push(formattedStr);
        }
      }
    }
    return formatted;
  }

  // Java: AbstractUnitConversionRule#sortByNaturalness(List)
  sortByNaturalness(conversions) {
    const naturalness = (number) => { // smaller score -> better
      const abs = Math.abs(number);
      if (abs < 1.0) {
        return 1.0 / (abs * abs * 2);
      } else if (abs < 100) {
        return abs - 50;
      }
      return abs * abs;
    };
    // sort according to "naturalness" of this unit, i.e. numbers not being too small/large (stable, as List.sort)
    conversions.sort((a, b) => Double.compare(naturalness(a[1]), naturalness(b[1])));
  }

  // Java: AbstractUnitConversionRule#matchUnits(AnalyzedSentence,List,List,boolean)
  matchUnits(sentence, matches, ignoreRanges, isMetric) {
    for (const entry of this.unitPatterns) { // find specific unit through lookup of pattern
      if (this.metricUnits.some((u) => u.equals(entry.unit)) !== isMetric) {
        continue;
      }
      const unitMatcher = entry.pattern.matcher(sentence.getText());
      while (unitMatcher.find()) {
        let ignore = false;
        for (const range of ignoreRanges) {
          if (unitMatcher.start() >= range[0] && unitMatcher.end() <= range[1]) {
            ignore = true;
            break;
          }
        }
        if (!ignore) {
          this.tryConversion(sentence, matches, entry.unit, null, unitMatcher, ignoreRanges);
        }
      }
    }
  }

  // Java: AbstractUnitConversionRule#detectNumberRange(AnalyzedSentence,Matcher)
  detectNumberRange(sentence, matcher) {
    const hyphenInNumber = matcher.group(1).startsWith('-');
    if (!hyphenInNumber) {
      return false;
    }
    const textBefore = sentence.getText().substring(0, matcher.start());
    return this.numberRangePart.matcher(textBefore).find();
  }

  // Java: AbstractUnitConversionRule#tryConversion(AnalyzedSentence,List,Pattern,Double,Unit,Matcher,List); unit = unitPatterns.getOrDefault(unitPattern, customUnit)
  tryConversion(sentence, matches, unit, customValue, unitMatcher, ignoreRanges) {
    const range = [unitMatcher.start(), unitMatcher.end()];
    ignoreRanges.push(range);
    // search for an existing conversion, e.g. "5 miles (8km)"
    let convertedInText = null;
    const convertedOffset = unitMatcher.end();
    let convertedMatcher = null;
    for (const convertedPattern of this.convertedPatterns) {
      convertedMatcher = convertedPattern.matcher(sentence.getText().substring(convertedOffset));
      if (convertedMatcher.find() && convertedMatcher.start() === 0) {
        convertedInText = convertedMatcher.group(0);
        break;
      }
    }
    // customValue/unit are used with patterns in specialPatterns, where unit and value are already extracted
    let value;
    if (customValue === null) {
      try {
        let valueAsString = unitMatcher.group(1);
        // remove hyphen at start if it belongs to a range (e.g 1-5 miles)
        if (this.detectNumberRange(sentence, unitMatcher)) {
          valueAsString = valueAsString.substring(1);
        }
        value = this.getNumberFormat().parse(valueAsString);
      } catch (e) {
        if (e instanceof ParseException) return;
        throw e;
      }
    } else {
      value = customValue;
    }
    const converted = this.formatMeasurement(value, unit);
    if (converted === null && convertedInText === null) {
      // no conversion necessary, e.g. already metric
    } else if (convertedInText === null) { // no conversion found -> suggest one
      const match = new RuleMatch(this, sentence, unitMatcher.start(), unitMatcher.end(),
        this.getMessage(Message.SUGGESTION), this.getShortMessage(Message.SUGGESTION));
      const suggestions = converted.map((formatted) => this.getSuggestion(unitMatcher.group(0), formatted));
      match.setSuggestedReplacements(suggestions);
      match.setUrl(this.buildURLForExplanation(unitMatcher.group(0)));
      matches.push(match);
    } else { // check given conversion for accuracy
      const convertedRange = [convertedMatcher.start(0) + convertedOffset, convertedMatcher.end(0) + convertedOffset];
      ignoreRanges.push(convertedRange);

      // already using one of our conversions?
      const finalConvertedInText = javaTrim(convertedInText);
      const convertedTrimmed = finalConvertedInText.substring(1, finalConvertedInText.length - 1);
      if (converted !== null && converted.some((s) => s === convertedTrimmed)) {
        return;
      }
      const convertedUnitEntry = this.unitPatterns.find((e) => e.pattern.matcher(finalConvertedInText).find());
      if (convertedUnitEntry !== undefined) { // known unit used for conversion
        const convertedUnit = convertedUnitEntry.unit;
        // If the unit before and after conversion is the same, e.g. "22.3 cm (20.4 cm)", assume users either:
        // 1. know what they're doing; or
        // 2. there's a more complex expression at play here, which we can't parse
        if (unit.equals(convertedUnit)) {
          return;
        }
        let convertedValueInText;
        try {
          convertedValueInText = this.getNumberFormat().parse(convertedMatcher.group(1));
          if (Pattern.compile('\\(\\d+ (feet|ft) \\d+ inch\\)').matcher(javaTrim(convertedMatcher.group())).matches()) {
            // e.g. "(2 ft 6 inch)" would be interpreted as just "2 ft", given a wrong suggestion
            return;
          }
        } catch (e) {
          if (e instanceof ParseException) return;
          throw e;
        }
        if (converted === null) { // already metric, check conversion in convertedUnit / convertedValueInText (order may be reversed)
          let reverseConverted = null;
          try {
            const unitConverted = unit.getConverterTo(convertedUnit).convert(value);
            const diff = Math.abs(unitConverted - convertedValueInText);
            if (diff > DELTA) {
              const match = new RuleMatch(this, sentence,
                convertedMatcher.start(1) + convertedOffset, convertedMatcher.end(1) + convertedOffset,
                this.getMessage(Message.CHECK), this.getShortMessage(Message.CHECK));
              match.setUrl(this.buildURLForExplanation(convertedTrimmed));
              const numbers = [];
              numbers.push([convertedUnit, unitConverted]);
              reverseConverted = this.getFormattedConversions(numbers);
              if (reverseConverted.some((s) => s === convertedTrimmed)) {
                return;
              }
              match.setSuggestedReplacements(reverseConverted);
              matches.push(match);
            }
          } catch (e) {
            if (!(e instanceof UnconvertibleException)) throw e;
            const match = new RuleMatch(this, sentence, unitMatcher.start(), convertedMatcher.end() + convertedOffset,
              this.getMessage(Message.UNIT_MISMATCH), this.getShortMessage(Message.UNIT_MISMATCH));
            if (reverseConverted !== null) {
              match.setSuggestedReplacements(reverseConverted);
            }
            match.setUrl(this.buildURLForExplanation(convertedTrimmed));
            matches.push(match);
          }
        } else { // found conversion to metric, check for accuracy
          const metricEquivalents = this.getMetricEquivalent(value, unit);
          if (metricEquivalents === null || metricEquivalents.length === 0) {
            return;
          }
          const metricEquivalent = metricEquivalents[0];
          const metricUnit = metricEquivalent[0];
          const convertedValueComputed = metricEquivalent[1];
          const original = unitMatcher.group(0);
          const corrected = converted.map((suggestion) => this.getSuggestion(original, suggestion));
          if (!(convertedUnit.equals(metricUnit) && Math.abs(convertedValueInText - convertedValueComputed) < DELTA)) {
            const match = new RuleMatch(this, sentence,
              unitMatcher.start(), convertedMatcher.end(0) + convertedOffset,
              this.getMessage(Message.CHECK), this.getShortMessage(Message.CHECK));
            match.setSuggestedReplacements(corrected);
            match.setUrl(this.buildURLForExplanation(unitMatcher.group(0)));
            matches.push(match);
          }
        }
      } else if (converted !== null) { // unknown unit used for conversion
        const match = new RuleMatch(this, sentence,
          convertedMatcher.start(1) + convertedOffset, convertedMatcher.end(2) + convertedOffset,
          this.getMessage(Message.CHECK_UNKNOWN_UNIT), this.getShortMessage(Message.CHECK_UNKNOWN_UNIT));
        match.setSuggestedReplacements(converted);
        matches.push(match);
      }
    }
  }

  // Java: AbstractUnitConversionRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const ignoreRanges = [];

    // handle special patterns where simple number parsing is not enough, e.g. 5'6"
    for (const [specialPattern, specialUnit, fn] of this.specialPatterns) {
      const matcher = specialPattern.matcher(sentence.getText());
      while (matcher.find()) {
        const result = matcher.toMatchResult();
        const value = fn(result);
        if (value === null) {
          continue;
        }
        let ignore = false;
        for (const range of ignoreRanges) {
          if (matcher.start() >= range[0] && matcher.end() <= range[1]) {
            ignore = true;
            break;
          }
        }
        if (!ignore) {
          this.tryConversion(sentence, matches, specialUnit, value, matcher, ignoreRanges);
        }
      }
    }

    // two runs: first metric units, so that ignore ranges are set up properly, then match other units
    this.matchUnits(sentence, matches, ignoreRanges, true);
    this.matchUnits(sentence, matches, ignoreRanges, false);
    const matchesByStart = new JavaHashMap();
    // deduplicate matches with equal start, longer match should win, e.g. miles per hour over just miles
    for (const match of matches) {
      matchesByStart.compute(match.getFromPos(), (pos, other) =>
        (other === null ? match : match.getToPos() > other.getToPos() ? match : other));
    }
    if (matches.length > 0) {
      this.removeAntiPatternMatches(sentence, matchesByStart);
    }
    return matchesByStart.values();
  }

  // Java: AbstractUnitConversionRule#removeAntiPatternMatches(AnalyzedSentence,Map)
  removeAntiPatternMatches(sentence, matchesByStart) {
    for (const antiPattern of antiPatterns) {
      const text = sentence.getText();
      const matcher = antiPattern.matcher(text);
      let pos = 0;
      while (pos < text.length && matcher.find(pos)) {
        for (const [key, value] of matchesByStart.entrySet()) {
          if ((matcher.start() <= value.getFromPos() && matcher.end() >= value.getFromPos())
            || (matcher.start() <= value.getToPos() && matcher.end() >= value.getToPos())) {
            matchesByStart.remove(key);
          }
        }
        pos = matcher.end() + 1;
      }
    }
  }
}
