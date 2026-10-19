# F35 porter checkpoint
Done: UserConfig#insertConfigValues NPE on null; ErrorRateTooHighException text-level message (formatFixed + fmul, float*100); LanguageDependentRuleMatchFilter (new) wired in postFilters.js (English#filterRuleMatches already existed); MultiThreadedJLanguageTool shutdown -> RejectedExecutionException, rule/sentence failures -> RuntimeException(ExecutionException(ForkJoinTask re-created cause)).
Tests: JLanguageToolTest (NPE, error-rate message, filter), MultiThreadedJLanguageToolTest#testShutdownException + ExecutionException wrap.
INVENTORY core.md: ported 0054, 0058, 0059, 0060, 0084..0088, 0091, 0092, 0186, 0187. 0095 stays todo (F70).
Open: X-PIPE unknown/verbose/mt (en, fr) partial and all de-DE cases need chunkers/disambiguators (F45/F60/F51 PLAN notes); cache -> F70.
