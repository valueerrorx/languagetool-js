// Helpers of GermanTaggerTest shared with SwissGermanTaggerTest.
import { javaCompare } from '../../src/lib/java/strings.js';

// Java: AbstractCollection#toString() of a List<AnalyzedTokenReadings>
export const ls = (list) => `[${list.map((x) => x.toString()).join(', ')}]`;

// Java: GermanTaggerTest#toSortedString(AnalyzedTokenReadings) (TreeSet<String>: sorted, de-duplicated)
export function toSortedString(tokenReadings) {
  const elements = [...new Set(tokenReadings.getReadings().map((r) => r.toString()))].sort(javaCompare);
  return `${tokenReadings.getToken()}[${elements.join(', ')}]`;
}
