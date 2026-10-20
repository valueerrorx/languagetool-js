# F49 oracle (X-ENFILTERS)
Status: DONE (58 cases, golden in tests/golden/X-ENFILTERS). `npm run oracle -- X-ENFILTERS`; `npm run parity -- X-ENFILTERS`. Generator `python3 oracle/scripts/gen-cases-enfilters.py` (inputs only, wipes oracle/cases/X-ENFILTERS). Env: pinned oracle env, clock 2026-03-15 10:00 Vienna; date-filter cases also with env FAKETIME 2027-01-05 (-jan) and 2026-12-31 (-dec).
Ops (reused, no new Java): `replace-check` mode `rules` (only the rule ids that use the filter enabled, DEFAULT and PICKY), `analyze-raw` (compare check-pipe).
Cases: rules-<Filter>-<lang> (all rule examples of the XML rules using the filter + 9 edge texts): AdverbFilter (EN-0100), DateCheckFilter (0102), FutureDateFilter en-US/GB/AU/CA/NZ, NewYearDateFilter, YMDNewYearDateFilter (0103), EnglishNumberInWordFilter (0105), EnglishSuppressMisspelledSuggestionsFilter (0107), FindSuggestionsFilter (0108), OrdinalSuffixFilter (0109). Targeted: dates-DateCheckFilter (weekday x date combos, leap, invalid), dates-FutureDateFilter-<lang>, dates-NewYear/YMDNewYear, ordinal-OrdinalSuffixFilter, numberinword-..., adverb-AdverbFilter. partialpos-analyze-00/01 (EN-0106): disambiguated dumps of disambiguation.xml examples using (NoDisambiguation)EnglishPartialPosTagFilter plus edge words.
Reused (not duplicated): X-FILTERS real-en-*, findsugg-real, suppress-real, numberinword-real, date-real-*; X-RULEMATCH filter-en-00; X-RULEINFRA hints-real-en; X-DISAMB ex-en-*.
## UNORACLED
- EN-0101 AdvancedSynthesizerFilter, EN-0104 EnglishConvertToSentenceCaseFilter: no XML reference; only existing X-FILTERS advsynth / sentencecase-en direct cases (ok).
- Calendar-dependent output beyond the three clocks; Java unit tests (DateCheckFilterTest etc.) are replayed from JUnit sources, not fixtures.
## Notes
- Date filters in the 5 non-US variants match only with the rule examples (targeted FutureDate texts gave 0 matches, expected from Java).
