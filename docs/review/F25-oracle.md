Status: started, reading harness conventions
Status: RuleLoadOps.java written + registered (ops rule-load modes files/file/tokens/patternRules/inline/builder, ruleset-hints); building
Status: generator oracle/scripts/gen-cases-ruleload.mjs written (phase1 counts, then full); running oracle
Status: oracle done 277 cases 77MB; checking quality, then adapter + parity
Status: adapters rule-load.mjs/ruleset-hints.mjs (notPorted stubs) written; running parity
Status: DONE. 277 cases, 74 MB, parity X-RULELOAD 277 notPorted; full parity 978 pass / 0 fail / 17 skip / 386 notPorted
Status: ruleset-hints-order task started (new case file via gen-cases-ruleload.mjs)
Status: ruleset-hints-order case (928 ops) + dump op + adapter written; generating single case
Status: DONE ruleset-hints-order: 928 requests, parity FAIL (guavaCapacity order), old fixtures unchanged
Status: DONE inline-and-or-unify: Harness.java null Map key -> "null" (both mappers) + serialization failure now yields ok:false response; harness-run.mjs throws on response-count mismatch; only that fixture regenerated, X-RULELOAD parity 278 pass / 0 fail
Status: DONE F25b-review cases: inline-unification (36 req, option unifier:true = fresh UnifierConfiguration per request + dump of features/types in Java map order, reflection reset in Harness, same in adapter), inline-url (97), inline-url-places (11), inline-errors (145), inline-toxml-quote (27); causes chain already in err(). Old fixtures unchanged. Parity X-RULELOAD 278 pass / 5 fail (all five new cases, port bugs expected).
Status: DONE F25b round 2 CRITICAL: new case inline-postag-hybrid (190 requests: ~100 postag variants en-US, negate_pos/exception/and variants, 16 variants each de-DE/en-GB/fr universes); new option posDetail (PosToken.posUnknown, posPattern getPossibleValues, probe matches) in RuleLoadOps.java + adapter rule-load.mjs. Only that fixture generated; old fixtures unchanged.
