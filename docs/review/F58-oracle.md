# F58 oracle (X-DEFILTERS)
Status: DONE (59 cases, golden in tests/golden/X-DEFILTERS). `npm run oracle -- X-DEFILTERS` (about 8 min); `npm run parity -- X-DEFILTERS`. Generator `python3 oracle/scripts/gen-cases-defilters.py` (inputs only, wipes oracle/cases/X-DEFILTERS). Env: pinned oracle env, clock 2026-03-15 10:00 Vienna; date-filter cases also with FAKETIME 2027-01-05 (-jan) and 2026-12-31 (-dec). 1950 matches total.
Ops (reused, no new Java): `replace-check` mode `rules` (only the XML rule ids using the filter enabled, DEFAULT and PICKY).
Cases: rules-<Filter>-<lang> (all rule examples + 9 edge texts) for AdvancedSynthesizerFilter, CompoundCheckFilter, DateCheckFilter (de-DE/AT/CH), FutureDateFilter (DE/AT/CH), NewYearDateFilter, YMDNewYearDateFilter, GermanNumberInWordFilter (DE/AT/CH), InsertCommaFilter, PotentialCompoundFilter, RemoveUnknownCompoundsFilter, ValidWordFilter (DE/AT/CH). Targeted: dates-DateCheckFilter/FutureDateFilter/NewYear/YMDNewYear, numberinword-, insertcomma-, compound-*.
Reused (not duplicated): X-FILTERS real-de-*, X-RULEMATCH filter-de-00, X-RULEINFRA hints-real-de.
## UNORACLED
- DE-0110 AdaptSuggestionFilter, DE-0114 YMDDateCheckFilter, DE-0117 GermanSuppressMisspelledSuggestionsFilter, DE-0121 UppercaseNounReadingFilter: no XML use. DE-0115 RecentYearFilter: its only rule is commented out in grammar.xml. Check via JUnit replays / X-FILTERS direct ops only.
- DE-0190 addedCompound.txt: only indirectly via CompoundCheckFilter.
## Notes
- Zero Java matches (hence only no-match parity) for: FutureDateFilter, NewYear/YMDNewYear (all clocks), and the compound-* targeted cases (rule examples for the compound filters do match in rules-*).
