// Java: org.languagetool.rules.es.TextToNumberFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { equalsIgnoreCase, toLowerCase } from '../../../lib/java/strings.js';
import { AbstractTextToNumberFilter } from '../../../core/rules/AbstractTextToNumberFilter.js';

const f32 = Math.fround;
const { numbers, multipliers } = AbstractTextToNumberFilter;

// Java: TextToNumberFilter static initializer
for (const [word, value] of [
  ['cero', 0], ['medio', 0.5], ['un', 1], ['uno', 1], ['una', 1], ['dos', 2], ['tres', 3], ['cuatro', 4], ['cinco', 5],
  ['seis', 6], ['siete', 7], ['ocho', 8], ['nueve', 9], ['diez', 10], ['once', 11], ['doce', 12], ['trece', 13],
  ['catorce', 14], ['quince', 15], ['dieciséis', 16], ['diecisiete', 17], ['dieciocho', 18], ['diecinueve', 19],
  ['veinte', 20], ['veintiuno', 21], ['veintidós', 22], ['veintitrés', 23], ['veinticuatro', 24], ['veinticinco', 25],
  ['veintiséis', 26], ['veintisiete', 27], ['veintiocho', 28], ['veintinueve', 29], ['treinta', 30], ['cuarenta', 40],
  ['cincuenta', 50], ['sesenta', 60], ['setenta', 70], ['ochenta', 80], ['noventa', 90], ['cien', 100], ['ciento', 100],
  ['doscientos', 200], ['trescientos', 300], ['cuatrocientos', 400], ['quinientos', 500], ['seiscientos', 600],
  ['setecientos', 700], ['ochocientos', 800], ['novecientos', 900], ['doscientas', 200], ['trescientas', 300],
  ['cuatrocientas', 400], ['quinientas', 500], ['seiscientas', 600], ['setecientas', 700], ['ochocientas', 800],
  ['novecientas', 900],
]) {
  numbers.put(word, f32(value));
}
for (const [word, value] of [
  ['mil', 1000], ['millón', 1000000], ['millones', 1000000], ['billón', 10E12], ['billones', 10E12],
  ['trillón', 10E18], ['trillones', 10E18],
]) {
  multipliers.put(word, f32(value));
}

// Java: TextToNumberFilter
export class TextToNumberFilter extends AbstractTextToNumberFilter {
  static FQCN = 'org.languagetool.rules.es.TextToNumberFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.TextToNumberFilter()' }];

  // Java: TextToNumberFilter#isComma(String)
  isComma(s) {
    return equalsIgnoreCase(s, 'comma') || equalsIgnoreCase(s, 'coma');
  }

  // Java: TextToNumberFilter#isPercentage(AnalyzedTokenReadings[],int)
  isPercentage(patternTokens, i) {
    return patternTokens[i].getToken() === 'ciento' && toLowerCase(patternTokens[i - 1].getToken()) === 'por';
  }
}

registerClass(TextToNumberFilter.FQCN, TextToNumberFilter);
