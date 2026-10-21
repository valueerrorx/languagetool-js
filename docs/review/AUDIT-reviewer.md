# AUDIT wave 1 (core, cli, server, de, en, fr) - reviewer
HIGH 0, MED 1, LOW 2.
- MED src/core/resources/XMLValidator.js:1,35,40,55 vs core XMLValidator.java: XSD/DTD validation reduced to well-formedness (D-048); schema-invalid custom/user XML rule files load instead of failing. No DEV entry (D-048 only). Shipped files unaffected.
- LOW src/core/patterns/filterRegistry.js:46-62 PENDING_RULE_FILTERS (ca/es/nl/ru filters throw notPorted when run): covered by DEV-006.
- LOW src/server/PipelinePool.js:54,93, TextChecker.js:147, German.js:239, French.js:182: LM/remote rules notPorted: covered by DEV-001.
Checked: getRelevantRules `new X` sets de/en/fr + variants identical (only ngram/LM classes absent, DEV-001); all 42 filter classes in de/en/fr XML registered; resources/org/languagetool identical to Java for de/en/fr/core; X-SRV-BASIC parity 38 pass.

## Lead note
MED XMLValidator: invalid. Java main code never calls XMLValidator (only tests use it, verified by grep on 2026-10-22), so a schema-invalid user rule file also loads in Java. D-048 stands and no DEV entry is needed.
