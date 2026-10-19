# F38 oracle (X-UNIT)
Status: DONE (12 cases, 150 requests, ~3100 texts, golden 2,8M). `npm run oracle -- X-UNIT`; `node oracle/parity.mjs X-UNIT`. Generator `node oracle/scripts/gen-cases-unit.mjs` (wipes oracle/cases/X-UNIT only). Compare: jsonl. Env: pinned oracle env.
Java: op `unit-check` = StyleOps.check (format as F36: {lang, ids, cases[{text, level}], extra}); Harness.java dispatch + `unit-` prefix, StyleOps `extra` also accepts fully qualified class names (for UnitConversionRule general, not in any rule list). Adapter oracle/adapters/unit-check.mjs always throws notPorted.
- Rules: METRIC_UNITS_EN_US (UnitConversionRuleUS, en-US), METRIC_UNITS_EN_IMPERIAL (en-GB/CA/AU/NZ), METRIC_UNITS_EN_GENERAL (via extra), EINHEITEN_METRISCH (de-DE/AT/CH). English rules are tagged picky: English cases run at level PICKY (DEFAULT yields no matches, see unit-levels).
- Cases: unit-en-US, unit-en-GB (879 texts each: imperial/metric unit x value grids, ranges, fractions, 5'6", compound ft/in, temperature F/C, area/volume, mph/km/h, parentheses with correct/incorrect/rounded/approximated converted values, nbsp, thousands/decimal separators in en and de style, huge/tiny/negative/zero, case variants, antipatterns); unit-de-DE (664 texts, comma/point/apostrophe/space separators, German unit words); unit-en-CA/AU/NZ, unit-de-AT/CH (small sets); unit-en-general (locale ENGLISH rule); unit-en-US-on-GB / unit-en-GB-on-US (rule class on other language, locale Locale.US vs UK); unit-levels (PICKY vs DEFAULT, interplay with other rules).
- Suggestion text, positions and messages are part of every match in responses.jsonl.
## Gaps
- No UNORACLED IDs. Not covered: PortugueseUnitConversionRule (pt, outside CORE-0278 scope), the metric-to-imperial direction for en-GB beyond the shared grid.
## Parity state
All 12 cases NOT PORTED.
