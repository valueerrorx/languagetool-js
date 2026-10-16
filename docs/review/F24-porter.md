# F24 porter checkpoint
Status: started, reading docs
- [x] A: src/lib/java/collections/ObjectOpenHashSet.js (+tests/lib/java/ObjectOpenHashSet.test.js), TaggedWord#hashCode, ManualSynthesizer ported faithfully (JavaHashMap mapping, hash grouping, ObjectOpenHashSet tags+trim). parity X-SYNTH: manual cases all pass (31 pass/5 fail/175 notPorted).
- [ ] B BaseSynthesizer synthesize/regex/getSpelledNumber... ; C En/Fr/De overrides ; D Soros ; E de-api ; F adapter+tests+INVENTORY
- [~] B/C code written: Soros (src/lib/soros), BaseSynthesizer, German/English/FrenchSynthesizer, AvsAnRule+AvsAnData (pulled forward from F48 for EN synth); next: run parity, fix, adapter, tests
- [x] B-E: parity X-SYNTH 211 pass 0 fail 0 notPorted (incl. de-spell-big, de-api). Remaining: F (JUnit ports: En/Fr/German SynthesizerTest, AvsAnRuleTest, Soros tests; unit tests for Soros; INVENTORY; lint; full parity; npm test)
- note: AvsAnRuleTest 4 sentences need EN disambiguator (F45): skipped test remains; PLAN note F45/F48 to un-skip
- [x] F DONE: tests ported (De/En/Fr SynthesizerTest, AvsAnRuleTest, Soros, ObjectOpenHashSet), INVENTORY ported, PLAN F24 done. npm test 476 pass/10 skip, parity 978 pass 0 fail 17 skip 109 notPorted, lint clean. Not committed.
