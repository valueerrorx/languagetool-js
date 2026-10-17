Status: started F27 review
Checked: AbstractPatternRulePerformer, PatternTokenMatcher line-by-line equal; PatternRuleMatcher catch(Throwable) vs Java catch(Exception) -> JavaError wrapped, native TypeError(NPE) not wrapped; resolveReference tokens[refPos] without arrayGet (refPos -1)
Checked: npm test 553/0F, lint clean, parity X-SEQMATCH 77 pass/14 notPorted (whole cases, incl. 13 real-rule files).
Findings: (1) PatternRuleMatcher.js:35 Throwable vs Java catch(Exception) - JavaError wrapped, TypeError(NPE) not; MINOR. (2) PatternTokenMatcher.js:27 tokens[refPos] no arrayGet (refPos -1 -> Java AIOOBE); latent (compile notPorted), MINOR, recurring. (3) PatternRuleMatcherTest.test.js:26 local max filter sorts fromPos+toPos, Java RuleMatch#compareTo fromPos only (stable); MINOR. (4) X-SEQMATCH notPorted per case hides 13 real-rule files; MINOR/TESTS. (5) untracked oracle/cases/X-CLI-BASIC.bak/ must not be committed.
VERDICT: ACCEPT
