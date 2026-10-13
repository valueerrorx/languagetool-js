// Character.digit/forDigit/getNumericValue for UTF-16 code units (numbers are char codes), backed by the Unicode 13 tables.
import { digit as cpDigit, forDigit as cpForDigit, getNumericValue as cpGetNumericValue } from './Character.js';

// Java: Character#digit(char,int)
export function digit(c, radix) {
  return cpDigit(c, radix);
}

// Java: Character#forDigit(int,int)
export function forDigit(d, radix) {
  return cpForDigit(d, radix);
}

// Java: Character#getNumericValue(char)
export function getNumericValue(c) {
  return cpGetNumericValue(c);
}
