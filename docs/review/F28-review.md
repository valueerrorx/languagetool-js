# F28 review
Status: started; reading diff
Unifier.js: faithful line-by-line vs Unifier.java (isSatisfied/checkNext/startNextToken/getFinal*/reset/isUnified/addNeutralElement).
JavaHashMap.computeIfAbsent: JDK17 inserts at bin HEAD and resizes before insert (probe: [BB, Aa] vs JS [Aa,BB]); unreachable in Unifier (maps never iterated) -> helper divergence.
DisambiguationRuleHandler.js: start/endElement walked branch by branch vs Java 1:1 (all elements, wd, examples, messages). Loader ok.
Next: tests, parity, antipattern list aliasing, valueOf texts.
Runs: npm test 566 pass (1st run 1 flaky fail GermanCommaWhitespaceRuleTest, 2nd run green), lint ok, X-UNIFY 37/0/1np, X-RULELOAD 271/0/13np.
UnifierTest 7/7 tests, 46/46 asserts 1:1. Adapter _ruleload-common.mjs:72 legit (calls port entrySet).
Findings:
1 CRITICAL(process) DisambiguationRuleTest not ported although Loader/Handler pulled forward (REVIEW-NOTES rule); no golden for disamb model/error texts; extra test strings hand-written.
2 MINOR JavaHashMap.js:103 computeIfAbsent != JDK17 (head insert, resize before insert; probe [BB, Aa] vs [Aa,BB]); unreachable in Unifier; fix or unreachable.md.
3 MINOR UnifierConfiguration.js:1,53 stale stub comments.
4 MINOR PLAN F29 lacks X-UNIFY inline-ref removal note.
5 MINOR DisambiguationRuleLoaderTest.test.js:40 missing semicolon/odd comment.
6 MINOR oracle/cases/X-CLI-BASIC.bak/ untracked backup case dir (orphan risk).
VERDICT: REJECT
## Runde 2
Status: started
Checked: JavaHashMap.computeIfAbsent vs JDK17 (resize-before size>threshold, head insert, treeify binCount>=7 -> len>=8, null not stored, old-null-value reuse); probe .java.txt re-run on JDK17 -> output byte-identical to fixture. Tree bins (table>=64) not modelled, flagged via treeBinsNeeded (documented).
xml.js scanEndElement = Xerces XMLNSDocumentScannerImpl (skipString(rawname) -> ETagRequired at unchanged pos, else ETagUnterminated); golden-covered (disamb-inline-structure-errors); X-XML + X-RULELOAD all PASS. Encoding msg keeps declared case (golden "bogus"/"BOGUS").
Handler NPE texts nn()/matchNpe match JDK17 helpful NPE; tokenReference variant not fixture-covered.
DisambiguationRuleTest: all methods ported; xx-only + Demo guard = Java core behaviour; example replay it.skip(F32) + PLAN F32 note. Extra loader test trimmed.
Runs: npm test 568 pass/38 skip, lint ok, parity 1423/0 fail/17 skip/133 np.
Findings R2:
M1 DisambiguationRuleTest.test.js:15-23 sortForms uses String.prototype.split (Java drops trailing empties, e.g. "x[a,]") and cleanXML native regex (. matches U+0085 in JS, not Java); use javaSplit/javaReplaceAll before un-skip in F32.
M2 oracle/cases/X-CLI-BASIC.bak/ still untracked (R1 #6 open).
M3 Match NPE "this.tokenReference" path without fixture.
VERDICT R2: ACCEPT
