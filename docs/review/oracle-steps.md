S01 done: X-PROBE-NUMBERS 27 cases (op probe-numbers; generator oracle/scripts/gen-probe-cases-numbers.mjs; helpers T/writeCases exported there)
S05 done: X-PROBE-STRINGS 18 cases (op probe-strings)
S11 done: X-PROBE-FORMAT 12 cases (op probe-format)
S19 done: X-PROBE-COLLECTIONS 17 cases (op probe-collections)
parity run: 79 not ported, 0 fail, exit 0; regenerated twice, responses byte-identical
S07 done: X-UNICODE 13 cases (props, case-simple, case-string, strings-context, normalizer, pattern-classes-01..08), X-LOCALE 2 cases (locales-main 16 locales incl. new:en-US/en-GB/en-NZ, locales-extra 37); ops unicode-dump + locale-dump (UnicodeDump.java, LocaleDump.java; generator oracle/scripts/gen-cases-unicode-locale.mjs); fixtures 2.2 MB + 0.4 MB, regenerated twice byte-identical (meta aside); Collator not used by LT -> not dumped; IsEmoji unsupported on JDK 17 (error recorded)
