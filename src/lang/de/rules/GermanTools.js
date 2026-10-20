// org.languagetool.rules.de.GermanTools

// Java: GermanTools#isVowel(char)
export function isVowel(c) {
  return 'aeiouyAEIOUYäöüÄÖÜ'.indexOf(c) >= 0;
}

export const GermanTools = { isVowel };
