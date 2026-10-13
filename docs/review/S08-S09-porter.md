# S08+S09 porter checkpoint
Plan: 1 gen-unicode-tables.mjs -> unicode/{props,case,normalizer}.json (pairs [start,val]); 2 Character.js; 3 Normalizer.js (ccc derived from Node ICU swap tests, stable property); 4 strings.js case mapping (+ConditionalSpecialCasing, word-break model for final sigma, fuzz vs JDK ad hoc); 5 delete charCase.js, charDigit.js on tables; 6 adapters unicode-dump.mjs + probe-strings; 7 tests/lib/java; lint/parity.
Status: started (nothing written yet besides this file).
