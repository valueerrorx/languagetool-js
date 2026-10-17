Status: started F28 porter
Status: Unifier.js written; XMLRuleHandler/PatternRuleHandler JavaHashMap done; next tests, DisambiguationRuleLoader
Status: DisambiguationRuleHandler/Loader written; next: UnifierTest port, run parity
Status: DONE except full test/parity runs; QUIRK: rulegroup antipattern id null_antipattern:N; singleTokenCorrection error dead
Status: X-UNIFY parity 37 pass/0 fail/1 notported (inline-ref); running lint/test/parity
Status: ALL DONE. lint ok, tests 566 pass, full parity re-run after fixing oracle/adapters/_ruleload-common.mjs (getUniFeatures now JavaHashMap -> entrySet()); X-RULELOAD 271/0 fail. Quirks confirmed in Java: PatternRuleHandler.java:580 / DisambiguationRuleHandler.java:427 antiId+'_antipattern:'+counter (null id in rulegroup -> null_antipattern:N); DisambiguationRuleHandler.java:347 singleTokenCorrection = endPos-startPos>1 with matchedTokenCount=endPos-startPos (line 307) makes the 'Cannot replace or filter more than one token' error unreachable.

## Review-Runde 1
Status: started (findings 1-5)
Status: Review-Runde 1 DONE. 1 DisambiguationRuleTest.test.js (loading active, examples it.skip F32 + PLAN note), extra test trimmed to fixture-covered structure; 2 NPE texts (nn(), Match.setLemmaString posSelector/tokenReference), xml.js scanEndElement uses Xerces skipString(prefix)+ETagUnterminated, UnsupportedEncodingException keeps declared case; 3 JavaHashMap.computeIfAbsent JDK17 (resize-before when size>threshold, head insert, treeify at 8) + 300-op JDK corpus test; 4 UnifierConfiguration comments. lint ok, npm test 568 pass, parity 1423 pass/0 fail/133 np.
