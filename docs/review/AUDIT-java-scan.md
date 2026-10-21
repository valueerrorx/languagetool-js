# AUDIT: independent Java scan (wave-1: core, commandline, server, de, en, fr)

Method: made without reading docs/inventory. Source = /home/valueerror/STUFF/DEV/LanguageTool/languagetool at the pinned commit 9b0be9db.
Scope per DECISIONS: D-002/D-003/D-031 (core, commandline, server, de/en/fr; it/es/sl/ru/sk/pl = wave 2), D-005/D-026/D-027/D-028 (ngram/Lucene, fastText, remote rules, DB write paths, Prometheus/JMX, HTTPS/JKS = deferred but input validation / error texts / no-config paths in scope), D-048 (XMLValidator well-formedness only).
Item IDs `A-*` below are scan IDs used by AUDIT-diff.md. Appendices B..G hold the mechanically extracted lists (classes, resources, path literals, throw literals).

Totals (main sources): core 346 classes, commandline 6, server 56, de 99, en 77, fr 31 = 615 Java files. Resource files: core 20, server 5, cli 1, de 73, en 81, fr 26.

## A1 Commandline (languagetool-commandline)

Entry: `org.languagetool.commandline.Main#main` (Main.java:~395-488). Classes: Main, CommandLineParser, CommandLineOptions (68 accessors), CommandLineTools (public static API), UnknownParameterException, WrongParameterNumberException; logback.xml.

- A-CLI-001 Arg count guard: `args.length < 1 || > 14` -> WrongParameterNumberException -> prints usage to STDOUT, exit 1 (CommandLineParser.java:35-37, Main main()).
- A-CLI-002 Options with aliases (CommandLineParser.java:40-176): `--version`, `--list`, `-h|-help|--help|--?`, `-adl|--autoDetect`, `-v|--verbose`, `--line-by-line`, `--enable-temp-off`, `--clean-overlapping`, `--level LEVEL`, `-t|--taggeronly`, `-r|--recursive`, `-b2|--bitext`, `-eo|--enabledonly`, `-d|--disable RULES`, `-e|--enable RULES`, `--enablecategories CAT`, `--disablecategories CAT`, `-l|--language`, `-m|--mothertongue`, `--languagemodel DIR`, `--fasttextmodel FILE`, `--fasttextbinary FILE`, `--rulefile FILE`, `--remoterules FILE`, `--falsefriends FILE`, `--bitextrules FILE`, `-c|--encoding`, `-u|--list-unknown`, `-b`, `--json`, `-a|--apply`, `-p|--profile`, `--xmlfilter`; last arg that is not an option = FILENAME (only if i == args.length-1), else `UnknownParameterException("Unknown parameter: X")`.
- A-CLI-003 Comma lists via `String.split(",")` (rules, categories); `--level` only PICKY (`Level.valueOf` failure -> IllegalArgumentException "Unknown level 'X' - currently, only 'PICKY' is supported"); missing value for `--level` -> ArrayIndexOutOfBounds (no checkArguments).
- A-CLI-004 checkArguments: "Missing argument to <opt> command line option." (for -d -e --enablecategories --disablecategories -l -m --languagemodel --fasttextmodel --fasttextbinary --rulefile --remoterules --falsefriends --bitextrules -c).
- A-CLI-005 Option conflict errors (order-dependent, IllegalArgumentException texts): "You cannot list unknown words when tagging only" (in -t and -u), "You cannot apply suggestions when tagging only" (-t, -a), "You cannot specify both disabled rules and enabledonly" (-eo, -d), "JSON output format makes no sense for automatic application of suggestions" (--json, -a), "JSON output format is not implemented for \"line by line\" analysis", "JSON output format is not implemented for Bitext", "You cannot list unknown words in JSON output format", "JSON output format makes no sense for profiling", "Applying suggestions makes no sense for profiling", "Tagging makes no sense for profiling".
- A-CLI-006 Language lookup: `Languages.getLanguageForShortCode` (unknown code -> exception text from core, printed raw by uncaught exception path / stderr).
- A-CLI-007 Usage text printUsage (CommandLineParser.java:178-225) exact text; stdout for -h/arg-count, stderr for UnknownParameterException; exit 1 in all three.
- A-CLI-008 Main exit handling: IllegalArgumentException -> `System.err.println(e)` (class name + message), exit 1; UnknownParameterException -> message to stderr + usage to stderr, exit 1; `-h` prints usage then exit 1; `--version` prints "LanguageTool version V (BUILD_DATE, GIT_SHORT_ID)" exit 0; `--list` prints sorted "code Name" lines exit 0 (`getShortCodeWithCountryAndVariant + " " + name`, String sort).
- A-CLI-009 Defaults: no filename -> "-" (stdin); no language -> stderr "No language specified, using English (no spell checking active, specify a language variant like 'en-GB' if available)" (suppressed when -adl) and `new English()`; with language and not -a -> hint "Expected text language: NAME" + " (no spell checking active)" / " (no spell checking active, specify a language variant like 'en-GB' if available)" when no dictionary-based speller active; variant check `language.isVariant()`.
- A-CLI-010 `SentenceTokenizer.setSingleLineBreaksMarksParagraph(-b)` applied to chosen language (also after autodetect).
- A-CLI-011 Main constructor: MultiThreadedJLanguageTool(lang, motherTongue), cleanOverlapping, addExternalRules(--rulefile via PatternRuleLoader.getRules(is, filename, lang)), activateLanguageModelRules, activateRemoteRules(file), Tools.selectRules(disabledCats, enabledCats, disabledRules, enabledRules, useEnabledOnly, enableTempOff).
- A-CLI-012 --falsefriends: `lt.loadFalseFriendRules(file)` + addRule each.
- A-CLI-013 Zero active rules -> RuntimeException "No rules are active. Please make sure your rule ids ([..]) and category ids ([..]) are correct".
- A-CLI-014 Input reading: stdin when filename "-"; file via BOMInputStream (UTF-8/16BE/16LE/32BE/32LE BOM detection, BOM charset used only if -c absent); charset default = Charset.defaultCharset; text read completely with `readerToString` (no newline added); `--xmlfilter` -> StringTools.filterXML.
- A-CLI-015 runOnFile: stderr "Working on STDIN..."/"Working on FILE..."; -adl: detectLanguageOfString via LanguageIdentifierService (fastText args), null -> stderr "Could not detect language well enough, using American English" + AmericanEnglish; then "Using NAME for file F"; lang switch re-creates MultiThreadedJLanguageTool and re-selects rules (note: file rules/falsefriends not re-added).
- A-CLI-016 Output modes: -a prints `Tools.correctText` to stdout without trailing newline; -p profileRulesOnText; check (default) CommandLineTools.checkText; -t tagText (prints AnalyzedSentence.toString per sentence); -u prints "Unknown words: [..]" (not for JSON).
- A-CLI-017 runOnFileLineByLine: stderr "Warning: running in line by line mode. Cross-paragraph checks will not work.\n"; per-line accumulation, break point = empty line or singleLineBreaksMarksPara; handleLine with ApiPrintMode START_API/CONTINUE_API/END_API; line offsets; profile mode "Testing %d rules" + header "Rule ID\tTime\tSentences\tMatches\tSentences per sec." and per-rule runs; error "Profiling mode cannot be used with input from STDIN"; autodetect on first line "Language used is: NAME".
- A-CLI-018 runRecursive: directory walk via File.listFiles (unsorted), "X is not a directory, cannot use recursion", per-file errors wrapped "Could not check text in file F".
- A-CLI-019 Bitext mode (-b2): requires -m ("You have to set the source language (as mother tongue) in bitext mode"); setBitextMode builds srcLt/lt, Tools.getBitextRules (built-in + --bitextrules file), disable/enable by id; TabBitextReader (tab-separated, encoding), checkBitext (output via printMatches + stats), correctBitext with -a (correctTextFromMatches).
- A-CLI-020 CommandLineTools.checkText: context size 45; parallel line adjustment; JSON via RuleMatchesAsJsonSerializer (UTF-8 PrintStream, no newline); text output via printMatches; verbose antipattern report to stderr ("Antipatterns activated:"); stats line "Time: %dms for %d sentences (%.1f sentences/sec)" for NORMAL_API & non-JSON.
- A-CLI-021 printMatches format: "N.) Line L, column C, Rule ID: <specificRuleId>[subId] premium: <bool> prio=<n>? (line N)? ", "Message: <advanced typography message>", "Suggestion: a; b; ..." (max 5), plain text context (ContextTools, marker lines), "More info: URL", "Tags: [..]", blank line between matches.
- A-CLI-022 profileRulesOnText output formats ("Analyze time: ...", "Disambig time: ...", "Testing %d rules", columns `%-40s%10s%10s%10s%15s`, "Total rule time", "Total time"); median helper.
- A-CLI-023 Public API of CommandLineTools: tagText, checkText (5 overloads), printMatches, checkBitext, correctBitext, profileRulesOnText.
- A-CLI-024 logback.xml of cli (log layout), JnaTools.setBugWorkaroundProperty at startup.
- A-CLI-025 `--remoterules`, `--languagemodel`, `--fasttextmodel/binary`: input parsing in scope, configured functionality deferred (D-028).

## A2 Server (languagetool-server)

Main classes: HTTPServer (main), HTTPServerConfig (CLI+props), LanguageToolHttpHandler, ApiV2, TextChecker, V2TextChecker, ServerTools, PipelinePool/Pipeline/PipelineSettings, RequestLimiter, ErrorRequestLimiter, UserLimits, RequestCounter, ResultExtender, ConfidenceMapLoader, LocalAbTestService/AbTestService, DatabaseAccess(+OpenSource), plus DB entity classes, Server (abstract), HTTPSServer/HTTPSServerConfig (deprecated), GRPCServer/RemoteSynthesizer/RemoteRuleMatch, ServerMetricsCollector, ActiveRules(MBean), BasicAuthentication, JwtContent, exceptions (TextTooLong, TooManyRequests, PathNotFound, BadRequest, Auth, Unavailable, PortBinding, IllegalConfiguration).

### A2.1 Startup / CLI of HTTPServer
- A-SRV-001 `HTTPServer.main`: `-h`/`--help` single arg -> usage text (HTTPServer.java:162-171 + Server.printCommonConfigFileOptions + printCommonOptions) exit 1.
- A-SRV-002 Server option parsing (HTTPServerConfig.java:244-313): `--config FILE`, `-p|--port N`, `-v|--verbose`, `--public`, `--premiumAlways` (IAE "Cannot use --premiumAlways with non-premium version"), `--allow-origin [ORIGIN]` (default `*`, next-option detection), `--languageModel DIR` (also skips languageModel from config), `--stoppable`, `--notLogIP`, `--logIpMatchingPattern PAT` (errors "Missing argument for '--logIpMatchingPattern' (e.g. any random String)"), unknown option -> stdout "WARNING: unknown option: X" (+ "= " hint text), `--opt=val` -> stderr warning "WARNING: use `--option value`, not `--option=value`, parameters will be ignored otherwise: X".
- A-SRV-003 Port handling: default port 8081 (DEFAULT_PORT), port 0 -> minPort/maxPort range search ("No free port in range (a - b) found.", "Invalid port configuration found. The value for '--port' need to be greater than 0 ..."); bind failure -> PortBindingException i18n "http_server_start_failed".
- A-SRV-004 Binding: DEFAULT_HOST localhost; `--public` -> all interfaces + allowedIps null; else allowed IPs {0:0:0:0:0:0:0:1, 0:0:0:0:0:0:0:1%0, 127.0.0.1}; non-allowed -> 403 "Error: Access from X denied" (+RuntimeException logged).
- A-SRV-005 Startup/shutdown prints via ServerTools.print: "Starting LanguageTool V (build date: D, SHORT) server on http://localhost:8081...", "Server started", "Stopping server...", "Server stopped", root warning banner (3 lines), "WARNING: running in HTTP mode, ...", "WARNING: running in public mode, ..." , "Setting up thread pool with N threads", "*** Running in PREMIUM-ALWAYS / PREMIUM-ONLY / RESTRICTED-ACCESS mode".
- A-SRV-006 Executor: fixed pool of maxCheckThreads (default 10), work queue; `--stoppable` -> `/v2/stop` (path startsWith) stops server.

### A2.2 Config file keys (Properties file, HTTPServerConfig.java:314-520). Default values in parentheses.
maxTextLength (MAX_INT), maxTextHardLength (MAX_INT), maxTextLengthAnonymous/LoggedIn/Premium, maxCheckTimeMillis (-1), maxCheckTimeMillisAnonymous/LoggedIn/Premium, requestLimit (0), requestLimitInBytes (0), timeoutRequestLimit (0), requestLimitWhitelistUsers (""), requestLimitWhitelistLimit (0), pipelineCaching (false), pipelinePrewarming (false), maxPipelinePoolSize (5), pipelineExpireTimeInSeconds (10), requestLimitPeriodInSeconds (0), ipFingerprintFactor (1), trustXForwardForHeader (false), maxWorkQueueSize (0; IAE "maxWorkQueueSize must be >= 0: N"), minPort/maxPort (0), serverURL, ruleIdToConfidenceFile (ConfidenceMapLoader, needs "{lang}"), languageModel, fasttextModel, fasttextBinary, maxCheckThreads (10; "Invalid value for maxCheckThreads, must be >= 1: N"), maxTextCheckerThreads (0 -> = maxCheckThreads; ">= 1" error), textCheckerQueueSize (8), mode ("AfterTheDeadline" -> IAE "The AfterTheDeadline mode is not supported anymore in LanguageTool 3.8 or later"), rulesFile ("Rules Configuration file cannot be found: F"), remoteRulesFile ("Remote rules configuration file cannot be found: F"), cacheSize (0; "Invalid value for cacheSize: N, use 0 to deactivate cache"; "Use of cacheTTLSeconds without also setting cacheSize has no effect."), cacheTTLSeconds (300), maxErrorsPerWordRate (0), suggestionsEnabled (true), maxSpellingSuggestions (0), blockedReferrers, trustedSources, premiumAlways, premiumOnly ("Cannot use premiumOnly=true with non-premium version"), anonymousAccessAllowed (true), redis* (host, port 6379, database, useSSL true, password, dictTTLSeconds 600, timeoutMilliseconds 100, connectionTimeoutMilliseconds 5000, certificate, key, keyPassword, useSentinel, sentinelHost/Port 26379/Password/MasterId), gracefulDatabaseFailure, dbDriver/dbUrl/dbUsername/dbPassword/dbTimeoutSeconds 10/dbMaxConnections 10/dbErrorRateThreshold 50/dbTimeoutRateThreshold 100/dbDownIntervalSeconds 10/dbLogging (needs all four: "dbLogging can only be true if dbDriver, dbUrl, dbUsername, and dbPassword are all set"), passwortLoginAccessListPath, prometheusMonitoring, prometheusPort 9301, skipLoggingRuleMatches, skipLoggingChecks, slowRuleLoggingThreshold (-1), disabledRuleIds, localApiMode, motherTongue (en-US), preferredLanguages, dictLimitUser/Team, styleGuideLimitUser/Team, requestLimitAccessToken, jwtSecret, externalRolloutServiceUrl/ApiKey, grammalecteServer/User/Password, beolingusFile ("beolingusFile not found: F"), nerUrl, abTest, abTestClients, abTestRollout (100), ngramLangIdentData ("... does not exist or is a directory (needs to be a ZIP file): F"), defaultThirdPartyAI (false), AfterTheDeadline, `lang-XX` / `lang-XX-dictPath` dynamic spellcheck-only languages (errors: code length, "... must be set", "dictionary file does not exist or is not a file", "Common words path not found").
- A-SRV-007 Unknown key warning: stderr "***** WARNING: ****" / "Key 'K' from configuration file 'F' is unknown. Please check the key's spelling (case is significant)." / "Known keys: [..]" (KNOWN_OPTION_KEYS set; keys with `lang-` prefix skipped).
- A-SRV-008 Config load failure: RuntimeException "Could not load properties from 'F'"; `getProperty` mandatory-key IllegalConfigurationException "Property 'X' must be set in F".
- A-SRV-009 Validation errors on languageModel/fasttext paths ("LanguageModel directory not found or is not a directory: D", "Fasttext model path not valid ...", "Fasttext binary path not valid ...") and serverURL ("Could not parse provided serverURL: 'U'").
- A-SRV-010 HTTPServerConfig getters used elsewhere (premium/limits getters: getMaxTextLengthAnonymous etc.), default isPublic false, verbose false, logIp true.

### A2.3 Endpoints (LanguageToolHttpHandler / ApiV2)
- A-SRV-020 `/v2/healthcheck` (GET -> "OK" text/plain; HEAD -> 200 no body; busy -> 503-like "Healthcheck failed: There are currently too many parallel requests.").
- A-SRV-021 `/v2/languages` (JSON array: name, code, longCode; plus dynamic languages).
- A-SRV-022 `/v2/maxtextlength` (text/plain integer = maxTextLengthAnonymous).
- A-SRV-023 `/v2/configinfo?language=` ("'language' parameter missing"; JSON: software{name,version,buildDate,premium}, parameter{maxTextLength}, rules[] with ruleId, description, isDictionaryBasedSpellingRule, isDefaultOff, isOfficeDefaultOff/On, hasConfigurableValue + confText/min/max/default, ruleOptions[], categoryId, categoryName, locQualityIssueType, isTextLevelRule, minToCheckParagraph).
- A-SRV-024 `/v2/info` (software{name,version,buildDate,commit,premium[,premiumBuildInfo]}).
- A-SRV-025 `/v2/check` (GET query / POST form body, `text` or `data` JSON with `text` or `annotation` [text/markup/interpretAs]; errors "Set only 'text' or 'data' parameter, not both", "Could not parse JSON from 'data' parameter", "'data' key in JSON requires either 'text' or 'annotation' key, not both", "'data' key in JSON requires 'text' or 'annotation' key", "Missing 'text' or 'data' parameter", annotation errors).
- A-SRV-026 `/v2/words`, `/v2/words/add`, `/v2/words/delete`, `/v2/admin/refreshUser`, `/v2/users/me` (DB/premium paths; no-config behaviour: AuthException 403 "This is the endpoint for the basic version of LanguageTool..."; method checks "needs to be called with GET/POST", "This end point needs a user id", "Use parameter 'dicts', not 'dict' in GET /words API method.", `users/me` OPTIONS preflight 204 + authMethod/format params, "Expected Basic Authentication", "Unknown authMethod: X", "Could not fetch user information").
- A-SRV-027 Unsupported action -> 404 PathNotFoundException "Unsupported action: 'X'. Please see API_DOC_URL".
- A-SRV-028 Non-v2 paths: `*/Languages` -> 400 old API text; `/` -> 400 "Missing arguments for LanguageTool API. Please see ..."; path containing `/v2/` not at root -> 400; `/favicon.ico` -> 404 "Not found"; any other -> 400 "This is the LanguageTool API. You have not specified any parameters. Please see ...".
- A-SRV-029 serverURL relativize (path prefix handling), `Referer`/`Origin` blocklist (`blockedReferrers`, siteMatches) -> 403 "Error: Access with referrer R denied." / "origin O denied.".
- A-SRV-030 Request parsing: GET query + POST body (form-urlencoded, UTF-8), "Could not decode query. Query length: N ...", hard text size guard "Your text's length exceeds this server's hard limit of N characters." (413), parameter map.
- A-SRV-031 Error mapping (handler catch): TextTooLong 413, ErrorRateTooHigh 400, AuthException 403 ("Error: org.languagetool.server.AuthException: msg"), BadRequest 400, PathNotFound 404, TimeoutException 500 ("Checking took longer than X seconds, which is this server's limit. Please make sure ..."), UnavailableException 503, other -> 500 "Internal Error: msg"; body prefix "Error: "; text/plain UTF-8.
- A-SRV-032 Response headers: Content-Type (application/json | text/plain), Access-Control-Allow-Origin if `--allow-origin`, Content-Length.
- A-SRV-033 Request limiting: RequestLimiter (per IP/user/API key, bytes & count, fingerprint factor, whitelist users; texts "User request limit of N per day exceeded. Try again after midnight UTC.", "Client request limit of ...", "IP request limit...", "...size limit..."), ErrorRequestLimiter (timeouts; "Error: Access from IP denied - too many recent timeouts. ..."), 429; access token header bypass (REQUEST_LIMIT_ACCESS_TOKEN_HEADER); limitPath excludes admin/refreshUser; workQueue full -> 503-like text "Error: There are currently too many parallel requests. Please try again later."
- A-SRV-034 X-forwarded-for handling (trustXForwardForHeader), X-Request-ID header -> log MDC.
- A-SRV-035 `logIp` / `logIpMatchingPattern` special text match (handleIpLogMatch, returns no body).

### A2.4 /v2/check parameters (TextChecker/V2TextChecker/ServerTools)
language (required: "Missing 'language' parameter, e.g. 'language=en-US' for American English or 'language=fr' for French"; `auto`), preferredVariants ("Invalid format for 'preferredVariants', expected a dash as in 'en-GB': 'X'", "Invalid 'preferredVariants', no such language/variant found: 'X'", "You specified 'preferredVariants' but you didn't specify 'language=auto'"), multilingual, noopLanguages ("You can specify 'noopLanguages' only when also using 'language=auto'"), preferredLanguages, forcePreferredLanguages, altLanguages ("You specified altLanguage 'X', but for this language you need to specify a variant..."), motherTongue, enabledRules, disabledRules, enabledCategories, disabledCategories, enabledOnly (yes/true; errors "You cannot specify disabled rules or categories using enabledOnly=true", "You must specify enabled rules or categories when using enabledOnly=true"), level (default/picky; error "Unknown value 'X' for parameter 'level'. Valid values: ..."), mode (all/textLevelOnly/allButTextLevelOnly; "Mode must be one of ..."), enableTempOffRules, enableHiddenRules, allowIncompleteResults, toneTags, ruleValues, sourceText/sourceLanguage (bitext; "'sourceLanguage' parameter missing - must be set when 'sourceText' is set"), callback (JSONP; "'callback' value must match [a-zA-Z]+: 'X'"), c (compact mode), useragent, textSessionId, inputLogging, username/apiKey/password/tokenV2/Authorization (ServerTools.getUserLimits errors "apiKey AND password was set, set only apiKey", "With 'username' set, you also need to specify 'apiKey'", "apiKey was set, but username was not: X", "password was set, but username was not"), dicts, filterDictionaryMatches, languageChanged, ld, optInThirdPartyAI, v, instanceId, abtest, v1-style rejects ("You specified 'enabled' but the parameter is now called 'enabledRules' in v2 of the API", same for disabled, preferredvariants, autodetect).
- A-SRV-040 Check flow: language detection (auto: noop/preferred/preferredVariants, DetectedLanguage + confidence + source), text length limits per user class ("Your text exceeds the limit of N characters (it has M characters). Please submit a shorter text."), anonymous prohibited ("Anonymous access is prohibited on this server, please provide authentication."), check timeout/limits (maxCheckTimeMillis*, maxErrorsPerWordRate -> ErrorRateTooHighException), pipeline pool/caching (PipelinePool, PipelineSettings key), cache (ResultCache sentence cache stats), disabledRuleIds from config, user dictionary words (DB), restricted-rules A/B (LocalAbTestService, LT_TEST_ONLY_* env), JSON result via RuleMatchesAsJsonSerializer (fields listed in core A3-JSON), incomplete results, UnavailableException "Server overloaded, please try again later".
- A-SRV-041 ConfidenceMapLoader (ruleIdToConfidenceFile) + confidence in match JSON; ResultExtender (remote, "not implemented" in OSS).
- A-SRV-042 Deferred groups: DatabaseAccess* (MyBatis; Dict/Group/Log mapper xml), DatabaseLogger/entries, RemoteSynthesizer/GRPCServer, ServerMetricsCollector/InstrumentedAppender (Prometheus), ActiveRules MBean (`-DmonitorActiveRules`), HTTPSServer/HTTPSServerConfig (`--config` required "Parameter --config must be set and point to a property file").
- A-SRV-043 Server helper classes: ServerTools (getHttpUserAgent/Referrer, getUserLimits, getMode, getLevel, print, getAuthHeader), HTTPTestTools, RequestCounter, UserLimits (JWT/token limits), LoggingInterceptor, UserInfoEntry/ExtendedUserInfo (JSON of /users/me).

## A3 Core (languagetool-core)

### A3.1 Facade and pipeline
- A-COR-001 JLanguageTool: constructors (language, motherTongue, cache, userConfig), enums Mode (ALL, ALL_BUT_TEXTLEVEL_ONLY, TEXTLEVEL_ONLY), ParagraphHandling, Level (DEFAULT, PICKY), check()/check2 variants (String, AnnotatedText, mode/level/cache/listener/ruleMatchListener), getAnalyzedSentence/analyzeText/getRawAnalyzedSentence, sentenceTokenize, rule registration (add/disable/enable by id/category, getAllRules/getAllActiveRules), addRule, loadPatternRules/loadFalseFriendRules, activateLanguageModelRules/activateWord2VecModelRules/activateNeuralNetworkRules/activateRemoteRules, setListUnknownWords/getUnknownWords, setCleanOverlappingMatches, adjustRuleMatchPos, VERSION/BUILD_DATE/GIT_SHORT_ID, temp files cleanup, message bundle access, thread pool (MultiThreadedJLanguageTool), ignoredRanges/annotated text mapping, rule match filters (LanguageDependentRuleMatchFilter, CleanOverlappingFilter, SameRuleGroupFilter, RuleWithMaxFilter, NewLineMatchFilter, DictionaryMatchFilter, SuppressIfAnyRuleMatchesFilter, UnderlineSpacesFilter), priorities (Language#getRulePriority, priority maps), tone tags, premium hooks (PremiumOff).
- A-COR-002 Language / Languages: registry via META-INF language-module.properties (ServiceLoader-ish), getLanguageForShortCode/Name/Locale, getLanguageForLocale, isLanguageSupported, getWithDemoLanguage, dynamic languages (DynamicLanguage/DynamicHunspell/DynamicMorfologik), language variants (getDefaultLanguageVariant, getShortCodeWithCountryAndVariant, getVariant, isVariant, hasVariant, getCountries, getLocale, getRelevantRules, getRelevantLanguageModelRules, createDefaultXXX factory methods, getPriorityMap, getRuleFileNames, getDisambiguationUnifierConfiguration, quotes methods, toAdvancedTypography, filterRuleMatches, mother-tongue false friend rules, maintainers/Contributors, LanguageMaintainedState, ShortDescriptionProvider).
- A-COR-003 Language identification: LanguageIdentifierService/DefaultLanguageIdentifier/SimpleLanguageIdentifier, detectors CommonWordsDetector, UnicodeBasedDetector, NGramDetector(deferred), FastTextDetector(deferred), optimaize fallback (D-022), preferred languages, noop languages, confidence.
- A-COR-004 Data model: AnalyzedToken, AnalyzedTokenReadings (toString format, immunization, chunk tags, isTagged etc.), AnalyzedSentence (toString format `[..]`, getAnnotations, copy), RuleMatch (offsets, lines/columns, suggested replacement objects, urls, sentence, type, toString), SuggestedReplacement, CheckResults, DetectedLanguage, SentenceRange, ExtendedSentenceRange, Range, InputSentence/SimpleInputSentence, UserConfig, GlobalConfig, Premium/PremiumOff, ToneTag, Tag.
- A-COR-005 Markup: AnnotatedText/AnnotatedTextBuilder (text/markup/interpretAs, mapping positions), MappingValue, TextPart.
- A-COR-006 Caches: ResultCache, ProtoResultCache (tools/Cache), CacheUtils.
- A-COR-007 Messages: MessagesBundle(_en).properties (+ de/fr bundles in modules), Tools.i18n, ResourceBundleTools (fallback), ResourceBundleWithFallback.
- A-COR-008 Tools: Tools.selectRules/selectBitextRules/correctText/checkBitext/profileRulesOnLine/getBitextRules/getFalseFriendRules/getMessageBundle/getFullRuleIdes, StringTools (many helpers: uppercase/lowercase first, isAllUppercase, isCapitalizedWord, isMixedCase, isPunctuationMark, trimWhitespace, filterXML, readerToString, escapeXML/HTML, isParagraphEnd, asString, convertToTitleCase, etc.), ContextTools (plain text context with marker lines), MultiKeyProperties, DiffsAsMatches, InterruptibleCharSequence, StringInterner, MostlySingularMultiMap, UnsyncStack, LtThreadPoolFactory/Executor, CircuitBreakers, LoggingTools, TelemetryProvider (no-op default), JnaTools, RuleMatchesAsJsonSerializer.
- A-COR-009 JSON check output (RuleMatchesAsJsonSerializer): software{name,version,buildDate,apiVersion,premium,premiumHint,status}, warnings{incompleteResults,incompleteResultsReason}, language{name,code,detectedLanguage{name,code,confidence,source}}, matches[]{message,shortMessage,replacements[]{value,shortDescription,suffix,type,autoCorrect,confidence},offset,length,context{text,offset,length},sentence,type{typeName},rule{id,subId,sourceFile,description,issueType,tempOff,urls,isPremium,tags,confidence,category{id,name}},ignoreForIncompleteSentence,contextForSureMatch}, ignoreRanges, sentenceRanges, extendedSentenceRanges{from,to,detectedLanguages{language,rate}}, cleanSuggestion (suggestion tag stripping), compact mode.

### A3.2 Tokenizing / tagging / disambiguation / synthesis
- A-COR-020 Tokenizers: WordTokenizer (default special chars/splits), SRXSentenceTokenizer (segment.srx, segment-simple.srx via SrxTools), SimpleSentenceTokenizer, CompoundWordTokenizer, Tokenizer, setSingleLineBreaksMarksParagraph.
- A-COR-021 Taggers: BaseTagger (dict + added/removed txt + ManualTagger/CombiningTagger/MorfologikTagger, tag lookup/case handling), TaggedWord/WordTagger, DemoTagger.
- A-COR-022 Disambiguation: Disambiguator interface, AbstractDisambiguator, XmlRuleDisambiguator/DisambiguationRuleLoader/Handler/PatternRule/Replacer (actions ADD, FILTER, REMOVE, REPLACE, UNIFY, IMMUNIZE, IGNORE_SPELLING, FILTERALL, ...; filters by class), disambiguation-global.xml, MultiWordChunker/MultiWordChunker2 (multiwords.txt, spelling_global), DemoDisambiguator, NoopDisambiguator.
- A-COR-023 Chunking: Chunker, ChunkTag, ChunkTaggedToken, TokenExpressionFactory/TokenPredicate (expression language for chunk regexes).
- A-COR-024 Synthesis: BaseSynthesizer (dict + tag file + manual added/removed, synthesize with regexp postag), ManualSynthesizer, Soros (.sor transliteration files), SynthesizerTools.
- A-COR-025 Bitext: BitextReader, StringPair, TabBitextReader, WordFastTMReader; bitext rules BitextRule, DifferentLengthRule, DifferentPunctuationRule, SameTranslationRule, BitextPatternRule(+Loader/Handler, bitext.xsd), FalseFriendsAsBitextLoader.

### A3.3 Rule engine
- A-COR-040 Pattern XML grammar (rules.xsd/pattern.xsd) and handler: elements rules/category/rulegroup/rule/antipattern/pattern/token/and/or/exception/marker/unify/unify-ignore/feature/equivalence/match/regexp/filter/message/suggestion/short/url/example/phrases/phrase/includephrases/phraseref/tags/tone_tags etc.; attributes id, name, default (on/off/temp_off), type, tags, tone_tags, prio, premium, min_prev_matches, distance_tokens, minprevmatches, case_sensitive, regexp, inflected, negate, negate_pos, postag, postag_regexp, chunk, chunk_re, spacebefore, skip, min/max, scope, setpos, raw_pos, include_skipped, mark_from/mark_to, idprefix, idref, is_goal_specific, triggers_error, suppress_misspelled, case_conversion, regexp_match/regexp_replace, postag_replace, correction, url, lang etc.; entity expansion limits (RuleEntityResolver, XML processing limits), line numbers (getXmlLineNumber), rule ids with sub ids.
- A-COR-041 Matching: PatternRule/PatternRuleMatcher/AbstractPatternRulePerformer/PatternTokenMatcher/PatternToken/Match/MatchState, Unifier/UnifierConfiguration/EquivalenceTypeLocator, RegexPatternRule (+filters), RuleSet, StringMatcher, Substrings, PatternRuleId, PatternRuleTransformer/Consistency/Repeated transformers, PatternTokenBuilder, PatternRuleXmlCreator.
- A-COR-042 Filters (RuleFilter via `<filter class=...>` args): RuleFilterCreator/Evaluator; core filters AbstractDateCheckFilter, AbstractDateCheckWithSuggestionsFilter, AbstractFutureDateFilter, AbstractNewYearDateFilter, YMDDateHelper, DateRangeChecker, ShortenedYearRangeChecker, AbstractFindSuggestionsFilter, AbstractMakeContractionsFilter, AbstractNumberInWordFilter, AbstractTextToNumberFilter, AbstractAdvancedSynthesizerFilter, AbstractSuppressMisspelledSuggestionsFilter, AddCommasFilter, AdaptSuggestionsFilter, ConvertToSentenceCaseFilter, IsEnglishWordFilter, PartialPosTagFilter, CheckPostagsInSuggestionFilter, ApostropheTypeFilter, IgnoreWhitespaceFilter, WhitespaceCheckFilter, RegexAntiPatternFilter, SuggestionFilter, MultitokenSpellerFilter, DictionarySpellMatchFilter.
- A-COR-043 False friends: FalseFriendRuleLoader/Handler/PatternRule, false-friends.xml (+dtd, html, css, xsl, print*.xsl), mother-tongue activation.
- A-COR-044 Rule base: Rule, TextLevelRule, RuleMatch lifecycle, Category/CategoryId/Categories (enum ids), ITSIssueType, RuleOption (configurable values), Example/CorrectExample/IncorrectExample/ErrorTriggeringExample, ExampleSentence, SpecificIdRule, DemoRule, FakeRule, TestRemoteRule.
- A-COR-045 Generic rules: CommaWhitespaceRule, DoublePunctuationRule, EmptyLineRule, MultipleWhitespaceRule, SentenceWhitespaceRule, WhitespaceBeforePunctuationRule, UppercaseSentenceStartRule, GenericUnpairedBracketsRule, GenericUnpairedQuotesRule, WordRepeatRule, WordRepeatBeginningRule, AdvancedWordRepeatRule, ParagraphRepeatBeginningRule, PhraseRepeatRule, LongSentenceRule, LongParagraphRule, ReadabilityRule, PunctuationMarkAtParagraphEnd(2), WhiteSpaceAtBeginOfParagraph, WhiteSpaceBeforeParagraphEnd, Abstract* (Compound, Dash, FillerWords, PunctuationCheck, RepeatedWords, SimpleReplace/2, SpaceBefore, SpecificCase, Statistic*, StyleRepeatedWord, StyleTooOftenUsedWord, UnitConversion, WordCoherency, CheckCase), SimpleReplaceDataLoader, WordCoherencyDataLoader, CompoundRuleData, SynonymsData, LineExpander, ConfusionSet(+Loader, ScoredConfusionSet, ConfusionPair, ConfusionString), WrongWordInContextRule, MatchPosition, SymbolLocator.
- A-COR-046 Spelling: SpellingCheckRule (ignore/prohibit/spelling.txt, words with ignore.txt, wordLists via CachingWordListLoader, spelling_global.txt, multi-token), MorfologikSpellerRule/MorfologikSpeller/MorfologikMultiSpeller (.dict+.info, suggestions, WeightedSuggestion, DetailedDamerauLevenshtein ordering), HunspellRule/CompoundAwareHunspellRule/Hunspell*/DumontsHunspellDictionary/HunspellNoSuggestionRule (D-013), SymSpellRule + symspell implementation, MultitokenSpeller, ForeignLanguageChecker, VagueSpellChecker, SuggestionsOrderer/Ranker/FeatureExtractor/Changes/SuggestionsOrdererConfig (ML optional), CommonFileTypes.
- A-COR-047 Deferred/optional: ngram rules (ConfusionProbabilityRule, NgramProbabilityRule, LanguageModel*, Lucene), word2vec/neural-network/ML (only rules/ml grpc stubs exist in core), BERT remote LM, RemoteRule/RemoteRuleConfig/Filters/Metrics/Result/FallbackManager, GRPC (grpc, rules/ml, tools/grpc), translation (rules/translation Translator/DataSource/TranslationData; BeoLingus in en per D-019), NER service, BERTSuggestionRanking, TestHackHelper.
- A-COR-048 XML/validation: XMLValidator (well-formedness only per D-048), RuleEntityResolver, PasswordAuthenticator.
- A-COR-049 Resources in core: MessagesBundle*, rules.xsd, pattern.xsd, disambiguation.xsd, bitext.xsd, remote-rules.xsd, false-friends.*, print*.xsl, rules.css, api-output.dtd, disambiguation-global.xml, segment.srx, segment-simple.srx, Roman.sor, spelling_global.txt.
- A-COR-050 Brokers: ResourceDataBroker/DefaultResourceDataBroker (resource lookup api: getFromResourceDirAsStream, getFromRulesDirAsStream, resourceExists, getResourceDir, getRulesDir), ClassBroker/DefaultClassBroker (class by name for `<filter class>`).
- A-COR-051 Language builder: language/LanguageBuilder (makeAdditionalLanguage from .info/rule file name; RuleFilenameException messages), Contributors/Contributor, LanguageAnnotator, FragmentWithLanguage.
- A-COR-052 noop/xx: NoopLanguage, NoopChunker, NoopDisambiguator, DemoTagger, DemoDisambiguator.

## A4 German module (languagetool-language-modules/de)

Languages: German (de, countries LU/LI/BE), GermanyGerman (de-DE), AustrianGerman (de-AT), SwissGerman (de-CH, own tagger/speller/quotes «»), NonSwissGerman (unreferenced). Name strings "German (Germany)", "German (Austria)", "German (Swiss)". German.getRelevantRules list (59 rule classes, see appendix scan below), variants add speller/compound rules; German.getPriorityMap, hasMinMatchesRules, filterRuleMatches, prepareLineForSpeller, getMultitokenSpeller, quotes/advanced typography, createDefault* factories (GermanTagger, GermanSynthesizer, GermanWordTokenizer, GermanRuleDisambiguator, GermanChunker, SRXSentenceTokenizer).
- A-DE-001 Tagging: GermanTagger (german.dict, compound splitting via GermanCompoundTokenizer/ non-strict, added/removed, case handling, AnalyzedGermanToken, GermanToken, AdjectiveTags, VerbPrefixes), SwissGermanTagger (ß/ss), GermanSynthesizer, GermanWordTokenizer, GermanCompoundTokenizer, GermanChunker (openregex-based), GermanRuleDisambiguator.
- A-DE-002 Spelling: GermanSpellerRule (+SpellingData, LanguageNames, hunspell de_DE etc.), AustrianGermanSpellerRule, SwissGermanSpellerRule, MorfologikGermanyGermanSpellerRule, GermanMultitokenSpeller, ValidWordFilter, GermanSuppressMisspelledSuggestionsFilter, ProhibitedCompoundRule, PotentialCompoundFilter, RemoveUnknownCompoundsFilter, CompoundCheckFilter, UppercaseNounReadingFilter.
- A-DE-003 Grammar rules: AgreementRule(+AntiPatterns1-3, 2, AgreementSuggestor2, AgreementTools), CaseRule(+AntiPatterns, CaseRuleExceptions), SubjectVerbAgreementRule, VerbAgreementRule, DashRule, CompoundCoherencyRule, CompoundInfinitivRule, GermanCompoundRule, SwissCompoundRule, ConjunctionAtBeginOfSentenceRule, DuUpperLowerCaseRule, MissingCommaRelativeClauseRule, MissingVerbRule, OldSpellingRule, WiederVsWiderRule, UnitConversionRule, SimilarNameRule, SimpleReplaceRule, UpperCaseNgramRule, GermanConfusionProbabilityRule (ngram), GermanWrongWordInContextRule, WordCoherencyRule, GermanCommaWhitespaceRule, GermanDoublePunctuationRule, GermanUnpaired{Brackets,Quotes}Rule, GermanWordRepeatRule/BeginningRule, GermanParagraphRepeatBeginningRule, SentenceWhitespaceRule, LongSentenceRule, GermanReadabilityRule, GermanRepeatedWordsRule, GermanStyleRepeatedWordRule, GermanFillerWordsRule, PassiveSentenceRule, SentenceWithManRule, SentenceWithModalVerbRule, NonSignificantVerbsRule, UnnecessaryPhraseRule, RedundantModalOrAuxiliaryVerb, StyleRepeatedSentenceBeginning, StyleRepeatedVeryShortSentences, StyleTooOftenUsed{Adjective,Noun,Verb}Rule, GermanHelper/GermanTools/PrepositionToCases/LineExpander helpers.
- A-DE-004 Filters: AdaptSuggestionFilter, AdvancedSynthesizerFilter, DateCheckFilter, YMDDateCheckFilter, FutureDateFilter, NewYearDateFilter, YMDNewYearDateFilter, RecentYearFilter, DateFilterHelper, InsertCommaFilter, GermanNumberInWordFilter (+all above).
- A-DE-005 Resources: grammar.xml (+de-CH, de-DE-AT), style.xml, disambiguation.xml, remote-rule-filters.xml, MessagesBundle_de.properties, spelling/hunspell lists (spelling.txt, spelling_merged, ignore, prohibit, *_custom, de_AT/CH/DE .dic/.aff/.dict/.info), coherency.txt, replace*.txt, synonyms.txt, wrongWordInContext.txt, addedCompound.txt, confusion_sets, case_rule_exceptions, compounds, etc. (full listing in Appendix C), language-module.properties.

## A5 English module

Languages: English (en; no countries), AmericanEnglish (en-US, default variant), BritishEnglish (en-GB), CanadianEnglish (en-CA), AustralianEnglish (en-AU), NewZealandEnglish (en-NZ), SouthAfricanEnglish (en-ZA).
- A-EN-001 English.getRelevantRules (~45 rule classes incl. AvsAnRule, CompoundRule, ConsistentApostrophesRule, ContractionSpellingRule, EnglishDiacriticsRule, EnglishPlainEnglishRule, EnglishRedundancyRule, EnglishRepeatedWordsRule, EnglishSpecificCaseRule, EnglishWordRepeatRule/BeginningRule, EnglishDashRule, false-friend rules for L2 (de, fr, es, nl), SimpleReplaceRule, SimpleReplaceProfanityRule, WordCoherencyRule, Unpaired brackets/quotes, StyleTooOftenUsed*, UpperCaseNgramRule, LongSentenceRule, wrong-word-in-context, OpenNMTRule (remote), NGram rules), variants: replace rules (American/British/NewZealand), speller rules per variant (MorfologikXxxSpellerRule, AbstractEnglishSpellerRule), unit conversion (US/Imperial), SymSpellRule (US), variant-specific grammar.xml/replace.txt/style.xml; getPriorityMap (BritishEnglish additions), createDefaultSpellingRule, getRelevantLanguageModelRules (ngram, deferred), hasNGramFalseFriendRule, getRemoteEnhancedRules, getMultitokenSpeller (EnglishMultitokenSpeller), filterRuleMatches, prepareLineForSpeller, VariantInfo.
- A-EN-002 Tagging/etc.: EnglishTagger, EnglishHybridDisambiguator (disambiguation.xml + multiwords + chunker EnglishChunker/EnglishChunkFilter = OpenNLP per D-014), EnglishSynthesizer, EnglishWordTokenizer, GoogleStyleWordTokenizer.
- A-EN-003 Filters: AdverbFilter, EnglishConvertToSentenceCaseFilter, EnglishNumberInWordFilter, EnglishPartialPosTagFilter, NoDisambiguationEnglishPartialPosTagFilter, EnglishSuppressMisspelledSuggestionsFilter, FindSuggestionsFilter, OrdinalSuffixFilter, AdvancedSynthesizerFilter, DateCheckFilter, YMDDateCheckFilter, FutureDateFilter, NewYearDateFilter, YMDNewYearDateFilter, DateFilterHelper.
- A-EN-004 BeoLingus: BeoLingusTranslator + Inflector (beolingusFile config key; D-019).
- A-EN-005 Resources: per-variant grammar.xml, replace.txt, style.xml; hunspell spelling_en-XX.txt; disambiguation.xml, multiwords.txt, confusion_sets*.txt (extended, l2_*), en-US-GB.txt, uncountable/partlycountable/numbers/specific_case, det_a/det_an, contractions, diacritics, redundancies, wordiness, replace_profanity, coherency, wrongWordInContext, grammar-l2-de.xml / grammar-l2-fr.xml, remote-rule-filters.xml, spelling_correction_model.bin (ML, deferred), taggers/synth dict from external jar.

## A6 French module

Languages: French (fr; countries FR, "", LU, MC, CM, CI, HT, ML, SN, CD, MA, RE), BelgianFrench (fr-BE), CanadianFrench (fr-CA), SwissFrench (fr-CH) with getDefaultDisabledRulesForVariant.
- A-FR-001 French.getRelevantRules (19 rule classes: CommaWhitespaceRule, CompoundRule, DoublePunctuationRule, FrenchRepeatedWordsRule, GenericUnpairedBracketsRule, LongParagraph/LongSentenceRule, MorfologikFrenchSpellerRule, MultipleWhitespaceRule, QuestionWhitespaceRule(+Strict), SentenceWhitespaceRule, SimpleReplaceRule, UppercaseSentenceStartRule, GrammalecteRule (remote, D-015)), getRelevantRulesGlobalConfig, getRelevantLanguageModelRules, getPriorityMap, hasMinMatchesRules, filterRuleMatches (adjustFrenchRuleMatch), prepareLineForSpeller, getMultitokenSpeller, quotes («»), advanced typography.
- A-FR-002 FrenchTagger (french.dict), FrenchSynthesizer (french_synth.dict, french_tags.txt, fr.sor), FrenchWordTokenizer, FrenchHybridDisambiguator (disambiguation.xml + multiwords).
- A-FR-003 Filters: DMYDateCheckFilter, DateCheckFilter, NewYearDateFilter, FindSuggestionsFilter, FrenchNumberInWordFilter, FrenchPartialPosTagFilter, FrenchSuppressMisspelledSuggestionsFilter, InterrogativeVerbFilter, MakeContractionsFilter, PostponedAdjectiveConcordanceFilter, SuggestionsFilter, WordWithDeterminerFilter, AdvancedSynthesizerFilter, DateFilterHelper.
- A-FR-004 Resources (Appendix C): grammar.xml, style.xml, disambiguation.xml, remote-rule-filters.xml, MessagesBundle_fr.properties, spelling lists, replace*.txt, synonyms, compounds, hyphenated_words, multiwords, confusion_sets, etc.

## A7 Cross-cutting observable behaviours
- A-X-001 Environment/system properties: `user.name` root check, `monitorActiveRules`, JVM locale/encoding (D-018), LT_TEST_ONLY_* env (LocalAbTestService), Premium detection, `languagetool.*` props in JLanguageTool? (see appendix G for System.getProperty/getenv literals).
- A-X-002 Logging (logback.xml cli/server) — not acceptance (D-045).
- A-X-003 Temp files (JLanguageTool.removeTemporaryFiles; resource copies for hunspell/morfologik).

---
## Appendix B Class table (path, kind+name, extends/implements, public method count, string-literal count, LOC)

### B.languagetool-core
```
org/languagetool/AnalyzedSentence.java	class AnalyzedSentence		pub=21	lit=8	loc=465
org/languagetool/AnalyzedToken.java	class AnalyzedToken		pub=11	lit=1	loc=168
org/languagetool/AnalyzedTokenReadings.java	class AnalyzedTokenReadings	implements Iterable<AnalyzedToken>	pub=60	lit=17	loc=813
org/languagetool/ApiCleanupNeeded.java	@interface ApiCleanupNeeded		pub=0	lit=0	loc=26
org/languagetool/bitext/BitextReader.java	interface BitextReader	extends Iterable<StringPair>	pub=0	lit=0	loc=61
org/languagetool/bitext/StringPair.java	class StringPair		pub=3	lit=1	loc=48
org/languagetool/bitext/TabBitextReader.java	class TabBitextReader	implements BitextReader	pub=9	lit=2	loc=139
org/languagetool/bitext/WordFastTMReader.java	class WordFastTMReader	extends TabBitextReader	pub=4	lit=1	loc=93
org/languagetool/broker/ClassBroker.java	interface ClassBroker		pub=0	lit=0	loc=46
org/languagetool/broker/DefaultClassBroker.java	class DefaultClassBroker	implements ClassBroker	pub=1	lit=0	loc=33
org/languagetool/broker/DefaultResourceDataBroker.java	class DefaultResourceDataBroker	implements ResourceDataBroker	pub=14	lit=6	loc=357
org/languagetool/broker/ResourceDataBroker.java	interface ResourceDataBroker		pub=0	lit=3	loc=181
org/languagetool/CheckResults.java	class CheckResults		pub=3	lit=0	loc=67
org/languagetool/chunking/Chunker.java	interface Chunker		pub=0	lit=0	loc=36
org/languagetool/chunking/ChunkTaggedToken.java	class ChunkTaggedToken		pub=4	lit=1	loc=66
org/languagetool/chunking/ChunkTag.java	class ChunkTag		pub=6	lit=3	loc=83
org/languagetool/chunking/TokenExpressionFactory.java	class TokenExpressionFactory	extends ExpressionFactory<ChunkTaggedToken>	pub=2	lit=0	loc=50
org/languagetool/chunking/TokenPredicate.java	class TokenPredicate	extends Expression.Arg.Pred<ChunkTaggedToken>	pub=1	lit=16	loc=110
org/languagetool/DetectedLanguage.java	class DetectedLanguage		pub=5	lit=0	loc=72
org/languagetool/DynamicHunspellLanguage.java	class DynamicHunspellLanguage	extends DynamicLanguage	pub=3	lit=3	loc=57
org/languagetool/DynamicLanguage.java	class DynamicLanguage	extends Language	pub=7	lit=2	loc=80
org/languagetool/DynamicMorfologikLanguage.java	class DynamicMorfologikLanguage	extends DynamicLanguage	pub=4	lit=2	loc=55
org/languagetool/ErrorRateTooHighException.java	class ErrorRateTooHighException	extends RuntimeException	pub=0	lit=0	loc=27
org/languagetool/Experimental.java	@interface Experimental		pub=0	lit=0	loc=28
org/languagetool/ExtendedSentenceRange.java	class ExtendedSentenceRange	implements Comparable<ExtendedSentenceRange>	pub=5	lit=2	loc=76
org/languagetool/FragmentWithLanguage.java	class FragmentWithLanguage		pub=3	lit=3	loc=45
org/languagetool/GlobalConfig.java	class GlobalConfig		pub=14	lit=0	loc=111
org/languagetool/grpc/Synthesizer.java	class Synthesizer		pub=261	lit=34	loc=3554
org/languagetool/grpc/SynthesizeServerGrpc.java	class SynthesizeServerGrpc		pub=15	lit=9	loc=293
org/languagetool/InputSentence.java	class InputSentence		pub=4	lit=0	loc=123
org/languagetool/JLanguageTool.java	class JLanguageTool		pub=62	lit=100	loc=2305
org/languagetool/LanguageAnnotator.java	class LanguageAnnotator		pub=5	lit=20	loc=244
org/languagetool/language/Contributor.java	class Contributor		pub=3	lit=1	loc=57
org/languagetool/language/Contributors.java	class Contributors		pub=0	lit=6	loc=33
org/languagetool/language/identifier/DefaultLanguageIdentifier.java	class DefaultLanguageIdentifier	extends LanguageIdentifier	pub=7	lit=46	loc=400
org/languagetool/language/identifier/detector/CommonWordsDetector.java	class CommonWordsDetector		pub=1	lit=24	loc=151
org/languagetool/language/identifier/detector/FastTextDetector.java	class FastTextDetector		pub=3	lit=16	loc=156
org/languagetool/language/identifier/detector/NGramDetector.java	class NGramDetector		pub=1	lit=38	loc=234
org/languagetool/language/identifier/detector/UnicodeBasedDetector.java	class UnicodeBasedDetector		pub=1	lit=17	loc=143
org/languagetool/language/identifier/LanguageIdentifier.java	class LanguageIdentifier		pub=5	lit=42	loc=168
org/languagetool/language/identifier/LanguageIdentifierService.java	enum LanguageIdentifierService		pub=5	lit=4	loc=120
org/languagetool/language/identifier/SimpleLanguageIdentifier.java	class SimpleLanguageIdentifier	extends LanguageIdentifier	pub=4	lit=18	loc=185
org/languagetool/Language.java	class Language		pub=75	lit=70	loc=1051
org/languagetool/language/LanguageBuilder.java	class LanguageBuilder		pub=31	lit=11	loc=261
org/languagetool/LanguageMaintainedState.java	enum LanguageMaintainedState		pub=0	lit=0	loc=30
org/languagetool/languagemodel/BaseLanguageModel.java	class BaseLanguageModel	implements LanguageModel	pub=5	lit=10	loc=130
org/languagetool/languagemodel/bert/grpc/BertLmGrpc.java	class BertLmGrpc		pub=18	lit=12	loc=367
org/languagetool/languagemodel/bert/grpc/BertLmProto.java	class BertLmProto		pub=367	lit=36	loc=4753
org/languagetool/languagemodel/bert/RemoteLanguageModel.java	class RemoteLanguageModel		pub=6	lit=3	loc=190
org/languagetool/languagemodel/LanguageModel.java	interface LanguageModel	extends AutoCloseable	pub=0	lit=2	loc=47
org/languagetool/languagemodel/LuceneLanguageModel.java	class LuceneLanguageModel	extends BaseLanguageModel	pub=6	lit=3	loc=94
org/languagetool/languagemodel/LuceneSingleIndexLanguageModel.java	class LuceneSingleIndexLanguageModel	extends BaseLanguageModel	pub=8	lit=30	loc=248
org/languagetool/languagemodel/MultiLanguageModel.java	class MultiLanguageModel	implements LanguageModel	pub=3	lit=4	loc=65
org/languagetool/language/RuleFilenameException.java	class RuleFilenameException	extends RuntimeException	pub=0	lit=4	loc=37
org/languagetool/Languages.java	class Languages		pub=10	lit=45	loc=401
org/languagetool/LanguageWithModel.java	class LanguageWithModel	extends Language implements AutoCloseable	pub=2	lit=2	loc=48
org/languagetool/LevelToneTagCacheKey.java	class LevelToneTagCacheKey		pub=2	lit=0	loc=59
org/languagetool/LinguServices.java	class LinguServices		pub=4	lit=0	loc=62
org/languagetool/LtBuildInfo.java	enum LtBuildInfo		pub=0	lit=8	loc=74
org/languagetool/markup/AnnotatedTextBuilder.java	class AnnotatedTextBuilder		pub=7	lit=5	loc=166
org/languagetool/markup/AnnotatedText.java	class AnnotatedText		pub=10	lit=5	loc=172
org/languagetool/markup/MappingValue.java	class MappingValue		pub=1	lit=2	loc=52
org/languagetool/markup/TextPart.java	class TextPart		pub=3	lit=0	loc=52
org/languagetool/MultiThreadedJLanguageTool.java	class MultiThreadedJLanguageTool	extends JLanguageTool	pub=4	lit=0	loc=247
org/languagetool/noop/NoopChunker.java	class NoopChunker	implements Chunker	pub=1	lit=0	loc=36
org/languagetool/noop/NoopDisambiguator.java	class NoopDisambiguator	extends AbstractDisambiguator	pub=0	lit=0	loc=32
org/languagetool/noop/NoopLanguage.java	class NoopLanguage	extends Language	pub=14	lit=3	loc=117
org/languagetool/Premium.java	class Premium		pub=8	lit=8	loc=105
org/languagetool/PremiumOff.java	class PremiumOff	extends Premium	pub=1	lit=0	loc=33
org/languagetool/Range.java	class Range		pub=5	lit=0	loc=64
org/languagetool/RemoteRuleFallbackManager.java	enum RemoteRuleFallbackManager		pub=4	lit=8	loc=155
org/languagetool/ResourceBundleTools.java	class ResourceBundleTools		pub=2	lit=0	loc=74
org/languagetool/ResourceBundleWithFallback.java	class ResourceBundleWithFallback	extends ResourceBundle	pub=3	lit=0	loc=67
org/languagetool/ResultCache.java	class ResultCache		pub=13	lit=1	loc=157
org/languagetool/RuleEntityResolver.java	class RuleEntityResolver	implements EntityResolver	pub=3	lit=4	loc=41
org/languagetool/RuleMatchListener.java	interface RuleMatchListener		pub=0	lit=0	loc=35
org/languagetool/rules/AbstractAdvancedSynthesizerFilter.java	class AbstractAdvancedSynthesizerFilter	extends RuleFilter	pub=2	lit=28	loc=218
org/languagetool/rules/AbstractCheckCaseRule.java	class AbstractCheckCaseRule	extends AbstractSimpleReplaceRule2	pub=0	lit=0	loc=43
org/languagetool/rules/AbstractCompoundRule.java	class AbstractCompoundRule	extends Rule	pub=8	lit=19	loc=343
org/languagetool/rules/AbstractDashRule.java	class AbstractDashRule	extends Rule	pub=5	lit=18	loc=127
org/languagetool/rules/AbstractDateCheckFilter.java	class AbstractDateCheckFilter	extends RuleFilter	pub=1	lit=17	loc=169
org/languagetool/rules/AbstractDateCheckWithSuggestionsFilter.java	class AbstractDateCheckWithSuggestionsFilter	extends RuleFilter	pub=1	lit=29	loc=307
org/languagetool/rules/AbstractFillerWordsRule.java	class AbstractFillerWordsRule	extends AbstractStatisticStyleRule	pub=7	lit=4	loc=127
org/languagetool/rules/AbstractFindSuggestionsFilter.java	class AbstractFindSuggestionsFilter	extends RuleFilter	pub=2	lit=22	loc=307
org/languagetool/rules/AbstractFutureDateFilter.java	class AbstractFutureDateFilter	extends RuleFilter	pub=1	lit=6	loc=115
org/languagetool/rules/AbstractMakeContractionsFilter.java	class AbstractMakeContractionsFilter	extends RuleFilter	pub=1	lit=0	loc=44
org/languagetool/rules/AbstractNewYearDateFilter.java	class AbstractNewYearDateFilter	extends RuleFilter	pub=1	lit=12	loc=139
org/languagetool/rules/AbstractNumberInWordFilter.java	class AbstractNumberInWordFilter	extends RuleFilter	pub=1	lit=4	loc=74
org/languagetool/rules/AbstractPunctuationCheckRule.java	class AbstractPunctuationCheckRule	extends Rule	pub=3	lit=11	loc=90
org/languagetool/rules/AbstractRepeatedWordsRule.java	class AbstractRepeatedWordsRule	extends TextLevelRule	pub=4	lit=21	loc=245
org/languagetool/rules/AbstractSimpleReplaceRule2.java	class AbstractSimpleReplaceRule2	extends Rule	pub=17	lit=36	loc=519
org/languagetool/rules/AbstractSimpleReplaceRule.java	class AbstractSimpleReplaceRule	extends Rule	pub=14	lit=10	loc=286
org/languagetool/rules/AbstractSpaceBeforeRule.java	class AbstractSpaceBeforeRule	extends Rule	pub=2	lit=7	loc=86
org/languagetool/rules/AbstractSpecificCaseRule.java	class AbstractSpecificCaseRule	extends Rule	pub=7	lit=9	loc=154
org/languagetool/rules/AbstractStatisticSentenceStyleRule.java	class AbstractStatisticSentenceStyleRule	extends TextLevelRule	pub=8	lit=5	loc=211
org/languagetool/rules/AbstractStatisticStyleRule.java	class AbstractStatisticStyleRule	extends TextLevelRule	pub=9	lit=4	loc=217
org/languagetool/rules/AbstractStyleRepeatedWordRule.java	class AbstractStyleRepeatedWordRule	extends TextLevelRule	pub=5	lit=18	loc=357
org/languagetool/rules/AbstractStyleTooOftenUsedWordRule.java	class AbstractStyleTooOftenUsedWordRule	extends TextLevelRule	pub=6	lit=4	loc=229
org/languagetool/rules/AbstractSuppressMisspelledSuggestionsFilter.java	class AbstractSuppressMisspelledSuggestionsFilter	extends RuleFilter	pub=2	lit=4	loc=96
org/languagetool/rules/AbstractTextToNumberFilter.java	class AbstractTextToNumberFilter	extends RuleFilter	pub=1	lit=3	loc=121
org/languagetool/rules/AbstractUnitConversionRule.java	class AbstractUnitConversionRule	extends Rule	pub=1	lit=154	loc=623
org/languagetool/rules/AbstractWordCoherencyRule.java	class AbstractWordCoherencyRule	extends TextLevelRule	pub=2	lit=5	loc=118
org/languagetool/rules/AdaptSuggestionsFilter.java	class AdaptSuggestionsFilter	extends RuleFilter	pub=1	lit=0	loc=53
org/languagetool/rules/AddCommasFilter.java	class AddCommasFilter	extends RuleFilter	pub=1	lit=15	loc=97
org/languagetool/rules/AdvancedWordRepeatRule.java	class AdvancedWordRepeatRule	extends Rule	pub=0	lit=1	loc=151
org/languagetool/rules/BERTSuggestionRanking.java	class BERTSuggestionRanking	extends RemoteRule	pub=3	lit=15	loc=257
org/languagetool/rules/bitext/BitextRule.java	class BitextRule	extends Rule	pub=4	lit=0	loc=111
org/languagetool/rules/bitext/DifferentLengthRule.java	class DifferentLengthRule	extends BitextRule	pub=4	lit=3	loc=75
org/languagetool/rules/bitext/DifferentPunctuationRule.java	class DifferentPunctuationRule	extends BitextRule	pub=4	lit=6	loc=71
org/languagetool/rules/bitext/IncorrectBitextExample.java	class IncorrectBitextExample		pub=3	lit=2	loc=67
org/languagetool/rules/bitext/SameTranslationRule.java	class SameTranslationRule	extends BitextRule	pub=4	lit=3	loc=69
org/languagetool/rules/Categories.java	class Categories		pub=2	lit=38	loc=90
org/languagetool/rules/CategoryId.java	class CategoryId		pub=3	lit=3	loc=56
org/languagetool/rules/CategoryIds.java	class CategoryIds		pub=0	lit=14	loc=51
org/languagetool/rules/Category.java	class Category		pub=6	lit=1	loc=110
org/languagetool/rules/CheckPostagsInSuggestionFilter.java	class CheckPostagsInSuggestionFilter	extends RuleFilter	pub=1	lit=7	loc=79
org/languagetool/rules/CleanOverlappingFilter.java	class CleanOverlappingFilter	implements RuleMatchFilter	pub=0	lit=9	loc=198
org/languagetool/rules/CommaWhitespaceRule.java	class CommaWhitespaceRule	extends Rule	pub=2	lit=38	loc=275
org/languagetool/rules/CompoundRuleData.java	class CompoundRuleData		pub=6	lit=17	loc=157
org/languagetool/rules/ConfusionPair.java	class ConfusionPair		pub=9	lit=4	loc=105
org/languagetool/rules/ConfusionSet.java	class ConfusionSet		pub=6	lit=2	loc=97
org/languagetool/rules/ConfusionSetLoader.java	class ConfusionSetLoader		pub=1	lit=20	loc=114
org/languagetool/rules/ConfusionString.java	class ConfusionString		pub=5	lit=0	loc=65
org/languagetool/rules/ConvertToSentenceCaseFilter.java	class ConvertToSentenceCaseFilter	extends RuleFilter	pub=1	lit=10	loc=113
org/languagetool/rules/CorrectExample.java	class CorrectExample	extends ExampleSentence	pub=0	lit=0	loc=32
org/languagetool/rules/DateRangeChecker.java	class DateRangeChecker	extends RuleFilter	pub=1	lit=2	loc=56
org/languagetool/rules/DemoRule.java	class DemoRule	extends Rule	pub=3	lit=9	loc=85
org/languagetool/rules/DictionaryMatchFilter.java	class DictionaryMatchFilter	implements RuleMatchFilter	pub=1	lit=0	loc=52
org/languagetool/rules/DictionarySpellMatchFilter.java	class DictionarySpellMatchFilter	implements RuleMatchFilter	pub=3	lit=3	loc=126
org/languagetool/rules/DoublePunctuationRule.java	class DoublePunctuationRule	extends Rule	pub=2	lit=24	loc=129
org/languagetool/rules/EmptyLineRule.java	class EmptyLineRule	extends TextLevelRule	pub=4	lit=8	loc=107
org/languagetool/rules/ErrorTriggeringExample.java	class ErrorTriggeringExample	extends ExampleSentence	pub=0	lit=0	loc=32
org/languagetool/rules/Example.java	class Example		pub=2	lit=3	loc=55
org/languagetool/rules/ExampleSentence.java	class ExampleSentence		pub=3	lit=8	loc=61
org/languagetool/rules/FakeRule.java	class FakeRule	extends Rule	pub=3	lit=2	loc=57
org/languagetool/rules/GenericUnpairedBracketsRule.java	class GenericUnpairedBracketsRule	extends TextLevelRule	pub=4	lit=69	loc=399
org/languagetool/rules/GenericUnpairedQuotesRule.java	class GenericUnpairedQuotesRule	extends TextLevelRule	pub=4	lit=24	loc=305
org/languagetool/rules/GRPCPostProcessing.java	class GRPCPostProcessing		pub=3	lit=12	loc=201
org/languagetool/rules/GRPCRule.java	class GRPCRule	extends RemoteRule	pub=11	lit=34	loc=514
org/languagetool/rules/GRPCUtils.java	class GRPCUtils		pub=12	lit=1	loc=150
org/languagetool/rules/IncorrectExample.java	class IncorrectExample	extends ExampleSentence	pub=2	lit=1	loc=64
org/languagetool/rules/IsEnglishWordFilter.java	class IsEnglishWordFilter	extends RuleFilter	pub=1	lit=7	loc=90
org/languagetool/rules/ITSIssueType.java	enum ITSIssueType		pub=2	lit=8	loc=68
org/languagetool/rules/LanguageDependentRuleMatchFilter.java	class LanguageDependentRuleMatchFilter	implements RuleMatchFilter	pub=1	lit=0	loc=43
org/languagetool/rules/LineExpander.java	interface LineExpander		pub=0	lit=1	loc=30
org/languagetool/rules/LongParagraphRule.java	class LongParagraphRule	extends TextLevelRule	pub=6	lit=7	loc=144
org/languagetool/rules/LongSentenceRule.java	class LongSentenceRule	extends TextLevelRule	pub=6	lit=27	loc=177
org/languagetool/rules/MatchPosition.java	class MatchPosition		pub=3	lit=1	loc=62
org/languagetool/rules/ml/MLServerGrpc.java	class MLServerGrpc		pub=18	lit=12	loc=367
org/languagetool/rules/ml/MLServerProto.java	class MLServerProto		pub=1310	lit=204	loc=20338
org/languagetool/rules/ml/PostProcessingServerGrpc.java	class PostProcessingServerGrpc		pub=15	lit=9	loc=311
org/languagetool/rules/ml/ProcessingServerGrpc.java	class ProcessingServerGrpc		pub=18	lit=12	loc=367
org/languagetool/rules/MultipleWhitespaceRule.java	class MultipleWhitespaceRule	extends TextLevelRule	pub=4	lit=10	loc=104
org/languagetool/rules/NewLineMatchFilter.java	class NewLineMatchFilter	implements RuleMatchFilter	pub=1	lit=5	loc=80
org/languagetool/rules/ngrams/ConfusionProbabilityRule.java	class ConfusionProbabilityRule	extends Rule	pub=12	lit=49	loc=401
org/languagetool/rules/ngrams/GoogleToken.java	class GoogleToken		pub=1	lit=2	loc=116
org/languagetool/rules/ngrams/GoogleTokenUtil.java	class GoogleTokenUtil		pub=1	lit=0	loc=34
org/languagetool/rules/ngrams/LanguageModelUtils.java	class LanguageModelUtils		pub=3	lit=16	loc=202
org/languagetool/rules/ngrams/NgramProbabilityRule.java	class NgramProbabilityRule	extends Rule	pub=4	lit=66	loc=299
org/languagetool/rules/ngrams/Probability.java	class Probability		pub=5	lit=3	loc=76
org/languagetool/rules/ParagraphRepeatBeginningRule.java	class ParagraphRepeatBeginningRule	extends TextLevelRule	pub=5	lit=6	loc=152
org/languagetool/rules/PartialPosTagFilter.java	class PartialPosTagFilter	extends RuleFilter	pub=1	lit=19	loc=122
org/languagetool/rules/patterns/AbstractPatternRule.java	class AbstractPatternRule	extends Rule	pub=25	lit=10	loc=404
org/languagetool/rules/patterns/AbstractPatternRulePerformer.java	class AbstractPatternRulePerformer		pub=0	lit=3	loc=366
org/languagetool/rules/patterns/AbstractTokenBasedRule.java	class AbstractTokenBasedRule	extends AbstractPatternRule	pub=4	lit=0	loc=263
org/languagetool/rules/patterns/ApostropheTypeFilter.java	class ApostropheTypeFilter	extends RuleFilter	pub=1	lit=6	loc=57
org/languagetool/rules/patterns/bitext/BitextPatternRuleHandler.java	class BitextPatternRuleHandler	extends PatternRuleHandler	pub=2	lit=9	loc=195
org/languagetool/rules/patterns/bitext/BitextPatternRule.java	class BitextPatternRule	extends BitextRule	pub=7	lit=0	loc=89
org/languagetool/rules/patterns/bitext/BitextPatternRuleLoader.java	class BitextPatternRuleLoader	extends DefaultHandler	pub=0	lit=3	loc=52
org/languagetool/rules/patterns/bitext/FalseFriendsAsBitextLoader.java	class FalseFriendsAsBitextLoader		pub=1	lit=0	loc=73
org/languagetool/rules/patterns/CaseConversionHelper.java	class CaseConversionHelper		pub=1	lit=0	loc=82
org/languagetool/rules/patterns/ConsistencyPatternRuleTransformer.java	class ConsistencyPatternRuleTransformer	implements PatternRuleTransformer	pub=7	lit=3	loc=179
org/languagetool/rules/patterns/EquivalenceTypeLocator.java	class EquivalenceTypeLocator		pub=2	lit=0	loc=49
org/languagetool/rules/patterns/FalseFriendPatternRule.java	class FalseFriendPatternRule	extends PatternRule	pub=0	lit=0	loc=37
org/languagetool/rules/patterns/FalseFriendRuleHandler.java	class FalseFriendRuleHandler	extends XMLRuleHandler	pub=4	lit=23	loc=224
org/languagetool/rules/patterns/FalseFriendRuleLoader.java	class FalseFriendRuleLoader	extends DefaultHandler	pub=0	lit=12	loc=115
org/languagetool/rules/patterns/IgnoreWhitespaceFilter.java	class IgnoreWhitespaceFilter	implements LSParserFilter	pub=3	lit=0	loc=50
org/languagetool/rules/patterns/Match.java	class Match		pub=21	lit=1	loc=231
org/languagetool/rules/patterns/MatchState.java	class MatchState		pub=2	lit=5	loc=390
org/languagetool/rules/patterns/PasswordAuthenticator.java	class PasswordAuthenticator	extends Authenticator	pub=0	lit=2	loc=53
org/languagetool/rules/patterns/PatternRuleBuilderHelper.java	class PatternRuleBuilderHelper		pub=7	lit=0	loc=53
org/languagetool/rules/patterns/PatternRuleHandler.java	class PatternRuleHandler	extends XMLRuleHandler	pub=4	lit=108	loc=995
org/languagetool/rules/patterns/PatternRuleId.java	class PatternRuleId		pub=3	lit=5	loc=73
org/languagetool/rules/patterns/PatternRule.java	class PatternRule	extends AbstractTokenBasedRule	pub=3	lit=4	loc=244
org/languagetool/rules/patterns/PatternRuleLoader.java	class PatternRuleLoader	extends DefaultHandler	pub=1	lit=6	loc=87
org/languagetool/rules/patterns/PatternRuleMatcher.java	class PatternRuleMatcher	extends AbstractPatternRulePerformer implements RuleMatcher	pub=3	lit=32	loc=504
org/languagetool/rules/patterns/PatternRuleTransformer.java	interface PatternRuleTransformer	extends Function<List<AbstractPatternRule>, PatternRuleTransformer.TransformedRules>	pub=2	lit=0	loc=56
org/languagetool/rules/patterns/PatternRuleXmlCreator.java	class PatternRuleXmlCreator		pub=0	lit=48	loc=124
org/languagetool/rules/patterns/PatternTokenBuilder.java	class PatternTokenBuilder		pub=15	lit=3	loc=175
org/languagetool/rules/patterns/PatternToken.java	class PatternToken	implements Cloneable	pub=63	lit=15	loc=869
org/languagetool/rules/patterns/PatternTokenMatcher.java	class PatternTokenMatcher		pub=5	lit=1	loc=147
org/languagetool/rules/patterns/RegexAntiPatternFilter.java	class RegexAntiPatternFilter	extends RegexRuleFilter	pub=1	lit=3	loc=57
org/languagetool/rules/patterns/RegexPatternRule.java	class RegexPatternRule	extends AbstractPatternRule implements RuleMatcher	pub=4	lit=6	loc=209
org/languagetool/rules/patterns/RegexRuleFilterCreator.java	class RegexRuleFilterCreator		pub=1	lit=9	loc=62
org/languagetool/rules/patterns/RegexRuleFilterEvaluator.java	class RegexRuleFilterEvaluator		pub=1	lit=3	loc=62
org/languagetool/rules/patterns/RegexRuleFilter.java	class RegexRuleFilter		pub=1	lit=0	loc=45
org/languagetool/rules/patterns/RepeatedPatternRuleTransformer.java	class RepeatedPatternRuleTransformer	implements PatternRuleTransformer	pub=7	lit=0	loc=166
org/languagetool/rules/patterns/RuleFilterCreator.java	class RuleFilterCreator		pub=1	lit=9	loc=76
org/languagetool/rules/patterns/RuleFilterEvaluator.java	class RuleFilterEvaluator		pub=2	lit=11	loc=96
org/languagetool/rules/patterns/RuleFilter.java	class RuleFilter		pub=7	lit=11	loc=167
org/languagetool/rules/patterns/RuleMatcher.java	interface RuleMatcher		pub=0	lit=1	loc=35
org/languagetool/rules/patterns/RuleSet.java	class RuleSet		pub=11	lit=0	loc=162
org/languagetool/rules/patterns/StringMatcher.java	class StringMatcher		pub=24	lit=46	loc=1383
org/languagetool/rules/patterns/Substrings.java	class Substrings		pub=1	lit=9	loc=187
org/languagetool/rules/patterns/UnifierConfiguration.java	class UnifierConfiguration		pub=3	lit=0	loc=91
org/languagetool/rules/patterns/Unifier.java	class Unifier		pub=0	lit=6	loc=444
org/languagetool/rules/patterns/XMLRuleHandler.java	class XMLRuleHandler	extends DefaultHandler	pub=4	lit=105	loc=745
org/languagetool/rules/PhraseRepeatRule.java	class PhraseRepeatRule	extends Rule	pub=5	lit=9	loc=174
org/languagetool/rules/PunctuationMarkAtParagraphEnd2.java	class PunctuationMarkAtParagraphEnd2	extends TextLevelRule	pub=4	lit=6	loc=105
org/languagetool/rules/PunctuationMarkAtParagraphEnd.java	class PunctuationMarkAtParagraphEnd	extends TextLevelRule	pub=4	lit=30	loc=174
org/languagetool/rules/ReadabilityRule.java	class ReadabilityRule	extends TextLevelRule	pub=12	lit=25	loc=339
org/languagetool/rules/RemoteRuleConfig.java	class RemoteRuleConfig		pub=24	lit=21	loc=257
org/languagetool/rules/RemoteRuleFilters.java	class RemoteRuleFilters		pub=5	lit=12	loc=225
org/languagetool/rules/RemoteRule.java	class RemoteRule	extends Rule	pub=11	lit=43	loc=390
org/languagetool/rules/RemoteRuleMetrics.java	class RemoteRuleMetrics		pub=3	lit=19	loc=130
org/languagetool/rules/RemoteRuleResult.java	class RemoteRuleResult		pub=7	lit=0	loc=99
org/languagetool/rules/Rule.java	class Rule		pub=39	lit=27	loc=655
org/languagetool/rules/RuleMatchFilter.java	interface RuleMatchFilter		pub=0	lit=1	loc=51
org/languagetool/rules/RuleMatch.java	class RuleMatch	implements Comparable<RuleMatch>	pub=55	lit=47	loc=894
org/languagetool/rules/RuleOption.java	class RuleOption		pub=8	lit=7	loc=165
org/languagetool/rules/RuleWithMaxFilter.java	class RuleWithMaxFilter	implements RuleMatchFilter	pub=0	lit=0	loc=80
org/languagetool/rules/SameRuleGroupFilter.java	class SameRuleGroupFilter	implements RuleMatchFilter	pub=1	lit=0	loc=65
org/languagetool/rules/ScoredConfusionSet.java	class ScoredConfusionSet		pub=6	lit=1	loc=84
org/languagetool/rules/SentenceWhitespaceRule.java	class SentenceWhitespaceRule	extends TextLevelRule	pub=5	lit=14	loc=223
org/languagetool/rules/ShortenedYearRangeChecker.java	class ShortenedYearRangeChecker	extends RuleFilter	pub=1	lit=3	loc=57
org/languagetool/rules/SimpleReplaceDataLoader.java	class SimpleReplaceDataLoader		pub=1	lit=12	loc=66
org/languagetool/rules/SpecificIdRule.java	class SpecificIdRule	extends Rule	pub=3	lit=0	loc=59
org/languagetool/rules/spelling/CachingWordListLoader.java	class CachingWordListLoader		pub=2	lit=2	loc=65
org/languagetool/rules/spelling/CommonFileTypes.java	class CommonFileTypes		pub=1	lit=153	loc=53
org/languagetool/rules/spelling/ForeignLanguageChecker.java	class ForeignLanguageChecker		pub=1	lit=2	loc=91
org/languagetool/rules/spelling/hunspell/CompoundAwareHunspellRule.java	class CompoundAwareHunspellRule	extends HunspellRule	pub=1	lit=33	loc=277
org/languagetool/rules/spelling/hunspell/DumontsHunspellDictionary.java	class DumontsHunspellDictionary	implements HunspellDictionary	pub=4	lit=7	loc=101
org/languagetool/rules/spelling/hunspell/HunspellDictionary.java	interface HunspellDictionary	extends Closeable	pub=0	lit=0	loc=50
org/languagetool/rules/spelling/hunspell/Hunspell.java	class Hunspell		pub=7	lit=17	loc=221
org/languagetool/rules/spelling/hunspell/HunspellNoSuggestionRule.java	class HunspellNoSuggestionRule	extends HunspellRule	pub=3	lit=2	loc=66
org/languagetool/rules/spelling/hunspell/HunspellRule.java	class HunspellRule	extends SpellingCheckRule	pub=6	lit=452	loc=636
org/languagetool/rules/spelling/morfologik/MorfologikMultiSpeller.java	class MorfologikMultiSpeller		pub=14	lit=14	loc=499
org/languagetool/rules/spelling/morfologik/MorfologikSpeller.java	class MorfologikSpeller		pub=10	lit=2	loc=222
org/languagetool/rules/spelling/morfologik/MorfologikSpellerRule.java	class MorfologikSpellerRule	extends SpellingCheckRule	pub=9	lit=61	loc=747
org/languagetool/rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.java	class DetailedDamerauLevenstheinDistance		pub=13	lit=10	loc=348
org/languagetool/rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.java	class SuggestionsOrdererConfig		pub=3	lit=2	loc=43
org/languagetool/rules/spelling/morfologik/WeightedSuggestion.java	class WeightedSuggestion	implements Comparable<WeightedSuggestion>	pub=4	lit=1	loc=52
org/languagetool/rules/spelling/multitoken/MultitokenSpellerFilter.java	class MultitokenSpellerFilter	extends RuleFilter	pub=2	lit=4	loc=131
org/languagetool/rules/spelling/multitoken/MultitokenSpeller.java	class MultitokenSpeller		pub=2	lit=25	loc=380
org/languagetool/rules/spelling/RuleWithLanguage.java	class RuleWithLanguage		pub=4	lit=0	loc=59
org/languagetool/rules/spelling/SpellingCheckRule.java	class SpellingCheckRule	extends Rule	pub=13	lit=39	loc=658
org/languagetool/rules/spelling/suggestions/SuggestionChangesExperiment.java	class SuggestionChangesTestConfig		pub=6	lit=23	loc=131
org/languagetool/rules/spelling/suggestions/SuggestionsChanges.java	class SuggestionsChanges		pub=8	lit=8	loc=265
org/languagetool/rules/spelling/suggestions/SuggestionsOrdererFeatureExtractor.java	class SuggestionsOrdererFeatureExtractor	implements SuggestionsOrderer	pub=7	lit=23	loc=229
org/languagetool/rules/spelling/suggestions/SuggestionsOrderer.java	interface SuggestionsOrderer		pub=0	lit=0	loc=39
org/languagetool/rules/spelling/suggestions/SuggestionsRanker.java	interface SuggestionsRanker	extends SuggestionsOrderer	pub=0	lit=0	loc=39
org/languagetool/rules/spelling/symspell/implementation/ChunkArray.java	class ChunkArray	<T>	pub=5	lit=2	loc=75
org/languagetool/rules/spelling/symspell/implementation/EditDistance.java	class EditDistance		pub=2	lit=10	loc=156
org/languagetool/rules/spelling/symspell/implementation/SuggestionStage.java	class SuggestionStage		pub=3	lit=3	loc=107
org/languagetool/rules/spelling/symspell/implementation/SuggestItem.java	class SuggestItem	implements Comparator<SuggestItem>, Comparable<SuggestItem>	pub=6	lit=9	loc=77
org/languagetool/rules/spelling/symspell/implementation/SymSpell.java	class SymSpell	implements Serializable	pub=14	lit=51	loc=865
org/languagetool/rules/spelling/SymSpellRule.java	class SymSpellRule	extends SpellingCheckRule	pub=8	lit=29	loc=295
org/languagetool/rules/spelling/VagueSpellChecker.java	class VagueSpellChecker		pub=5	lit=9	loc=125
org/languagetool/rules/SuggestedReplacement.java	class SuggestedReplacement		pub=20	lit=0	loc=183
org/languagetool/rules/SuggestionFilter.java	class SuggestionFilter		pub=1	lit=1	loc=61
org/languagetool/rules/SuggestionWithMessage.java	class SuggestionWithMessage		pub=2	lit=0	loc=44
org/languagetool/rules/SuppressIfAnyRuleMatchesFilter.java	class SuppressIfAnyRuleMatchesFilter	extends RuleFilter	pub=1	lit=6	loc=125
org/languagetool/rules/SymbolLocator.java	class SymbolLocator		pub=3	lit=1	loc=80
org/languagetool/rules/SynonymsData.java	class SynonymsData		pub=3	lit=0	loc=45
org/languagetool/rules/TestHackHelper.java	class TestHackHelper		pub=1	lit=2	loc=36
org/languagetool/rules/TestRemoteRule.java	class TestRemoteRule	extends RemoteRule	pub=1	lit=4	loc=84
org/languagetool/rules/TextLevelRule.java	class TextLevelRule	extends Rule	pub=4	lit=1	loc=85
org/languagetool/rules/translation/DataSource.java	class DataSource		pub=0	lit=0	loc=33
org/languagetool/rules/translation/TranslationData.java	class TranslationData		pub=1	lit=0	loc=37
org/languagetool/rules/translation/TranslationEntry.java	class TranslationEntry		pub=6	lit=4	loc=71
org/languagetool/rules/translation/Translator.java	interface Translator		pub=0	lit=0	loc=37
org/languagetool/rules/UnderlineSpacesFilter.java	class UnderlineSpacesFilter	extends RuleFilter	pub=1	lit=5	loc=52
org/languagetool/rules/UnsyncStack.java	class UnsyncStack	<E> extends ArrayList<E>	pub=5	lit=0	loc=116
org/languagetool/rules/UppercaseSentenceStartRule.java	class UppercaseSentenceStartRule	extends TextLevelRule	pub=2	lit=51	loc=258
org/languagetool/rules/WhiteSpaceAtBeginOfParagraph.java	class WhiteSpaceAtBeginOfParagraph	extends Rule	pub=3	lit=5	loc=81
org/languagetool/rules/WhiteSpaceBeforeParagraphEnd.java	class WhiteSpaceBeforeParagraphEnd	extends TextLevelRule	pub=4	lit=4	loc=98
org/languagetool/rules/WhitespaceBeforePunctuationRule.java	class WhitespaceBeforePunctuationRule	extends Rule	pub=0	lit=12	loc=107
org/languagetool/rules/WhitespaceCheckFilter.java	class WhitespaceCheckFilter	extends RuleFilter	pub=1	lit=4	loc=44
org/languagetool/rules/WordCoherencyDataLoader.java	class WordCoherencyDataLoader		pub=1	lit=4	loc=71
org/languagetool/rules/WordRepeatBeginningRule.java	class WordRepeatBeginningRule	extends TextLevelRule	pub=6	lit=19	loc=136
org/languagetool/rules/WordRepeatRule.java	class WordRepeatRule	extends Rule	pub=5	lit=21	loc=140
org/languagetool/rules/WrongWordInContextRule.java	class WrongWordInContextRule	extends Rule	pub=5	lit=31	loc=390
org/languagetool/rules/YMDDateHelper.java	class YMDDateHelper		pub=2	lit=13	loc=58
org/languagetool/SentenceRange.java	class SentenceRange	implements Comparable<SentenceRange>	pub=7	lit=3	loc=108
org/languagetool/ShortDescriptionProvider.java	class ShortDescriptionProvider		pub=1	lit=7	loc=67
org/languagetool/SimpleInputSentence.java	class SimpleInputSentence		pub=4	lit=0	loc=61
org/languagetool/synthesis/BaseSynthesizer.java	class BaseSynthesizer	implements Synthesizer	pub=9	lit=16	loc=364
org/languagetool/synthesis/ManualSynthesizer.java	class ManualSynthesizer		pub=3	lit=16	loc=224
org/languagetool/synthesis/Soros.java	class Soros		pub=1	lit=75	loc=126
org/languagetool/synthesis/Synthesizer.java	interface Synthesizer		pub=0	lit=0	loc=73
org/languagetool/synthesis/SynthesizerTools.java	class SynthesizerTools		pub=1	lit=0	loc=49
org/languagetool/tagging/BaseTagger.java	class BaseTagger	implements Tagger	pub=6	lit=8	loc=281
org/languagetool/tagging/CombiningTagger.java	class CombiningTagger	implements WordTagger	pub=2	lit=0	loc=79
org/languagetool/tagging/disambiguation/AbstractDisambiguator.java	class AbstractDisambiguator	implements Disambiguator	pub=1	lit=0	loc=38
org/languagetool/tagging/disambiguation/Disambiguator.java	interface Disambiguator		pub=0	lit=0	loc=69
org/languagetool/tagging/disambiguation/MultiWordChunker2.java	class MultiWordChunker2	extends AbstractDisambiguator	pub=4	lit=12	loc=267
org/languagetool/tagging/disambiguation/MultiWordChunker.java	class MultiWordChunker	extends AbstractDisambiguator	pub=5	lit=45	loc=531
org/languagetool/tagging/disambiguation/rules/DisambiguatedExample.java	class DisambiguatedExample		pub=4	lit=2	loc=75
org/languagetool/tagging/disambiguation/rules/DisambiguationPatternRule.java	class DisambiguationPatternRule	extends AbstractTokenBasedRule	pub=8	lit=1	loc=151
org/languagetool/tagging/disambiguation/rules/DisambiguationPatternRuleReplacer.java	class DisambiguationPatternRuleReplacer	extends AbstractPatternRulePerformer	pub=0	lit=0	loc=375
org/languagetool/tagging/disambiguation/rules/DisambiguationRuleHandler.java	class DisambiguationRuleHandler	extends XMLRuleHandler	pub=3	lit=52	loc=493
org/languagetool/tagging/disambiguation/rules/DisambiguationRuleLoader.java	class DisambiguationRuleLoader	extends DefaultHandler	pub=0	lit=4	loc=60
org/languagetool/tagging/disambiguation/rules/XmlRuleDisambiguator.java	class XmlRuleDisambiguator	extends AbstractDisambiguator	pub=2	lit=5	loc=102
org/languagetool/tagging/disambiguation/xx/DemoDisambiguator.java	class DemoDisambiguator	extends AbstractDisambiguator	pub=0	lit=0	loc=36
org/languagetool/tagging/ManualTagger.java	class ManualTagger	implements WordTagger	pub=1	lit=18	loc=146
org/languagetool/tagging/MorfologikTagger.java	class MorfologikTagger	implements WordTagger	pub=3	lit=2	loc=101
org/languagetool/tagging/ner/NERService.java	class NERService		pub=4	lit=17	loc=166
org/languagetool/tagging/TaggedWord.java	class TaggedWord		pub=5	lit=1	loc=62
org/languagetool/tagging/Tagger.java	interface Tagger		pub=0	lit=0	loc=57
org/languagetool/tagging/WordTagger.java	interface WordTagger		pub=0	lit=0	loc=37
org/languagetool/tagging/xx/DemoTagger.java	class DemoTagger	implements Tagger	pub=3	lit=0	loc=59
org/languagetool/Tag.java	enum Tag		pub=0	lit=0	loc=26
org/languagetool/tokenizers/CompoundWordTokenizer.java	interface CompoundWordTokenizer	extends Tokenizer	pub=0	lit=0	loc=26
org/languagetool/tokenizers/SentenceTokenizer.java	interface SentenceTokenizer	extends Tokenizer	pub=0	lit=0	loc=42
org/languagetool/tokenizers/SimpleSentenceTokenizer.java	class SimpleSentenceTokenizer	extends SRXSentenceTokenizer	pub=0	lit=3	loc=59
org/languagetool/tokenizers/SRXSentenceTokenizer.java	class SRXSentenceTokenizer	implements SentenceTokenizer	pub=0	lit=4	loc=80
org/languagetool/tokenizers/SrxTools.java	class SrxTools		pub=0	lit=1	loc=72
org/languagetool/tokenizers/Tokenizer.java	interface Tokenizer		pub=0	lit=0	loc=32
org/languagetool/tokenizers/WordTokenizer.java	class WordTokenizer	implements Tokenizer	pub=9	lit=84	loc=334
org/languagetool/ToneTag.java	enum ToneTag		pub=0	lit=0	loc=35
org/languagetool/tools/Cache/CacheUtils.java	class CacheUtils		pub=2	lit=1	loc=123
org/languagetool/tools/Cache/ProtoResultCache.java	class ProtoResultCache		pub=397	lit=81	loc=6402
org/languagetool/tools/CircuitBreakers.java	class CircuitBreakers		pub=1	lit=0	loc=50
org/languagetool/tools/ConfidenceKey.java	class ConfidenceKey		pub=3	lit=1	loc=51
org/languagetool/tools/ContextTools.java	class ContextTools		pub=7	lit=10	loc=143
org/languagetool/tools/DiffsAsMatches.java	class DiffsAsMatches		pub=2	lit=2	loc=314
org/languagetool/tools/grpc/ProtoHelper.java	class ProtoHelper		pub=3	lit=0	loc=54
org/languagetool/tools/grpc/RuleData.java	class RuleData	extends Rule	pub=6	lit=2	loc=117
org/languagetool/tools/InterruptibleCharSequence.java	class InterruptibleCharSequence	implements CharSequence	pub=4	lit=0	loc=63
org/languagetool/tools/JnaTools.java	class JnaTools		pub=1	lit=2	loc=40
org/languagetool/tools/LoggingTools.java	class LoggingTools		pub=0	lit=9	loc=37
org/languagetool/tools/LtThreadPoolExecutor.java	class LtThreadPoolExecutor	extends ThreadPoolExecutor	pub=3	lit=12	loc=96
org/languagetool/tools/LtThreadPoolFactory.java	class LtThreadPoolFactory		pub=5	lit=45	loc=170
org/languagetool/tools/MostlySingularMultiMap.java	class MostlySingularMultiMap	<K, V>	pub=1	lit=0	loc=54
org/languagetool/tools/MultiKeyProperties.java	class MultiKeyProperties		pub=1	lit=2	loc=69
org/languagetool/tools/PseudoMatch.java	class PseudoMatch		pub=5	lit=2	loc=59
org/languagetool/tools/RuleMatchesAsJsonSerializer.java	class RuleMatchesAsJsonSerializer		pub=5	lit=82	loc=379
org/languagetool/tools/StringInterner.java	class StringInterner		pub=1	lit=0	loc=15
org/languagetool/tools/StringTools.java	class StringTools		pub=60	lit=280	loc=1064
org/languagetool/tools/TelemetryProvider.java	enum TelemetryProvider		pub=5	lit=1	loc=126
org/languagetool/tools/Tools.java	class Tools		pub=19	lit=23	loc=479
org/languagetool/tools/TracedFunction.java	interface TracedFunction	<T>	pub=0	lit=0	loc=27
org/languagetool/tools/WrappedValue.java	interface WrappedValue	<T>	pub=0	lit=0	loc=25
org/languagetool/tools/WrappedVoid.java	interface WrappedVoid		pub=0	lit=0	loc=25
org/languagetool/UserConfig.java	class UserConfig		pub=23	lit=22	loc=385
org/languagetool/XMLValidator.java	class XMLValidator		pub=26	lit=39	loc=372
```

### B.languagetool-commandline
```
org/languagetool/commandline/CommandLineOptions.java	class CommandLineOptions		pub=68	lit=0	loc=448
org/languagetool/commandline/CommandLineParser.java	class CommandLineParser		pub=0	lit=130	loc=241
org/languagetool/commandline/CommandLineTools.java	class CommandLineTools		pub=10	lit=40	loc=475
org/languagetool/commandline/Main.java	class Main		pub=1	lit=37	loc=488
org/languagetool/commandline/UnknownParameterException.java	class UnknownParameterException	extends RuntimeException	pub=0	lit=0	loc=30
org/languagetool/commandline/WrongParameterNumberException.java	class WrongParameterNumberException	extends RuntimeException	pub=0	lit=0	loc=25
```

### B.languagetool-server
```
org/languagetool/server/AbTestService.java	interface AbTestService		pub=0	lit=0	loc=26
org/languagetool/server/ActiveRules.java	class ActiveRules	implements ActiveRulesMBean	pub=2	lit=0	loc=42
org/languagetool/server/ActiveRulesMBean.java	interface ActiveRulesMBean		pub=2	lit=0	loc=31
org/languagetool/server/APINewGroup.java	class APINewGroup		pub=2	lit=0	loc=46
org/languagetool/server/ApiV2.java	class ApiV2		pub=0	lit=197	loc=662
org/languagetool/server/AuthException.java	class AuthException	extends RuntimeException	pub=0	lit=0	loc=35
org/languagetool/server/BadRequestException.java	class BadRequestException	extends RuntimeException	pub=0	lit=0	loc=36
org/languagetool/server/BasicAuthentication.java	class BasicAuthentication		pub=2	lit=5	loc=53
org/languagetool/server/ConfidenceMapLoader.java	class ConfidenceMapLoader		pub=0	lit=14	loc=79
org/languagetool/server/DatabaseAccess.java	class DatabaseAccess		pub=6	lit=6	loc=232
org/languagetool/server/DatabaseAccessOpenSource.java	class DatabaseAccessOpenSource	extends DatabaseAccess	pub=4	lit=74	loc=373
org/languagetool/server/DatabaseCheckLogEntry.java	class DatabaseCheckLogEntry	extends DatabaseLogEntry	pub=2	lit=15	loc=84
org/languagetool/server/DatabaseLogEntry.java	class DatabaseLogEntry		pub=5	lit=1	loc=65
org/languagetool/server/DatabaseLogger.java	class DatabaseLogger		pub=6	lit=11	loc=187
org/languagetool/server/DatabasePingLogEntry.java	class DatabasePingLogEntry	extends DatabaseLogEntry	pub=4	lit=5	loc=66
org/languagetool/server/DBGroup.java	class DBGroup		pub=0	lit=0	loc=32
org/languagetool/server/DBGroupMember.java	class DBGroupMember		pub=0	lit=0	loc=44
org/languagetool/server/DBInvite.java	class DBInvite		pub=0	lit=3	loc=43
org/languagetool/server/DictGroupEntry.java	class DictGroupEntry		pub=3	lit=0	loc=52
org/languagetool/server/ErrorRequestLimiter.java	class ErrorRequestLimiter	extends RequestLimiter	pub=0	lit=1	loc=69
org/languagetool/server/ExtendedUserInfo.java	class ExtendedUserInfo		pub=14	lit=15	loc=156
org/languagetool/server/GroupRoles.java	enum GroupRoles		pub=3	lit=1	loc=60
org/languagetool/server/GRPCServer.java	class GRPCServer	extends ProcessingServerImplBase	pub=4	lit=20	loc=170
org/languagetool/server/HTTPServerConfig.java	class HTTPServerConfig		pub=107	lit=344	loc=1564
org/languagetool/server/HTTPServer.java	class HTTPServer	extends Server	pub=2	lit=22	loc=194
org/languagetool/server/HTTPSServerConfig.java	class HTTPSServerConfig	extends HTTPServerConfig	pub=0	lit=6	loc=105
org/languagetool/server/HTTPSServer.java	class HTTPSServer	extends Server	pub=3	lit=19	loc=163
org/languagetool/server/HTTPTestTools.java	class HTTPTestTools		pub=8	lit=21	loc=135
org/languagetool/server/IllegalConfigurationException.java	class IllegalConfigurationException	extends RuntimeException	pub=0	lit=0	loc=27
org/languagetool/server/InstrumentedAppender.java	class InstrumentedAppender	extends UnsynchronizedAppenderBase<ILoggingEvent>	pub=1	lit=6	loc=65
languagetool-server/src/main/java/org/languagetool/server/JwtContent.java ?
org/languagetool/server/LanguageToolHttpHandler.java	class LanguageToolHttpHandler	implements HttpHandler	pub=1	lit=108	loc=504
org/languagetool/server/LimitEnforcementMode.java	enum LimitEnforcementMode		pub=1	lit=2	loc=48
org/languagetool/server/LocalAbTestService.java	class LocalAbTestService	implements AbTestService	pub=2	lit=7	loc=49
org/languagetool/server/LoggingInterceptor.java	class LoggingInterceptor	implements Interceptor	pub=1	lit=6	loc=43
org/languagetool/server/PathNotFoundException.java	class PathNotFoundException	extends RuntimeException	pub=0	lit=0	loc=31
org/languagetool/server/Pipeline.java	class Pipeline	extends JLanguageTool	pub=23	lit=1	loc=218
org/languagetool/server/PipelinePool.java	class PipelinePool	implements KeyedPooledObjectFactory<PipelineSettings, Pipeline>	pub=5	lit=18	loc=265
org/languagetool/server/PipelineSettings.java	class PipelineSettings		pub=3	lit=5	loc=89
org/languagetool/server/PortBindingException.java	class PortBindingException	extends RuntimeException	pub=0	lit=0	loc=33
org/languagetool/server/RemoteRuleMatch.java	class RemoteRuleMatch		pub=15	lit=2	loc=193
org/languagetool/server/RemoteSynthesizer.java	class RemoteSynthesizer	extends SynthesizeServerGrpc.SynthesizeServerImplBase	pub=2	lit=15	loc=149
org/languagetool/server/RequestCounter.java	class RequestCounter		pub=0	lit=0	loc=62
org/languagetool/server/RequestLimiter.java	class RequestLimiter		pub=0	lit=73	loc=279
org/languagetool/server/ResultExtender.java	class ResultExtender		pub=6	lit=4	loc=107
org/languagetool/server/Server.java	class Server		pub=3	lit=76	loc=195
org/languagetool/server/ServerMetricsCollector.java	class ServerMetricsCollector		pub=9	lit=61	loc=205
org/languagetool/server/ServerTools.java	class ServerTools		pub=2	lit=106	loc=268
org/languagetool/server/TextChecker.java	class TextChecker		pub=7	lit=300	loc=1168
org/languagetool/server/TextTooLongException.java	class TextTooLongException	extends RuntimeException	pub=0	lit=0	loc=32
org/languagetool/server/TooManyRequestsException.java	class TooManyRequestsException	extends RuntimeException	pub=0	lit=0	loc=32
org/languagetool/server/UnavailableException.java	class UnavailableException	extends RuntimeException	pub=0	lit=0	loc=36
org/languagetool/server/UserInfoEntry.java	class UserInfoEntry		pub=10	lit=0	loc=180
org/languagetool/server/UserLimits.java	class UserLimits		pub=10	lit=8	loc=277
org/languagetool/server/UUIDTypeHandler.java	class UUIDTypeHandler	extends BaseTypeHandler<UUID>	pub=4	lit=0	loc=64
org/languagetool/server/V2TextChecker.java	class V2TextChecker	extends TextChecker	pub=0	lit=28	loc=146
```

### B.languagetool-language-modules_de
```
org/languagetool/chunking/GermanChunker.java	class GermanChunker	implements Chunker	pub=4	lit=218	loc=528
org/languagetool/language/AustrianGerman.java	class AustrianGerman	extends German	pub=7	lit=3	loc=82
org/languagetool/language/German.java	class German	extends LanguageWithModel	pub=29	lit=307	loc=728
org/languagetool/language/GermanyGerman.java	class GermanyGerman	extends German	pub=6	lit=5	loc=95
org/languagetool/language/NonSwissGerman.java	class NonSwissGerman	extends German	pub=2	lit=2	loc=49
org/languagetool/language/SwissGerman.java	class SwissGerman	extends German	pub=11	lit=13	loc=140
org/languagetool/rules/de/AdaptSuggestionFilter.java	class AdaptSuggestionFilter	extends RuleFilter	pub=1	lit=46	loc=202
org/languagetool/rules/de/AdvancedSynthesizerFilter.java	class AdvancedSynthesizerFilter	extends AbstractAdvancedSynthesizerFilter	pub=0	lit=0	loc=34
org/languagetool/rules/de/AgreementRule2.java	class AgreementRule2	extends Rule	pub=5	lit=236	loc=302
org/languagetool/rules/de/AgreementRuleAntiPatterns1.java	class AgreementRuleAntiPatterns1		pub=0	lit=746	loc=1007
org/languagetool/rules/de/AgreementRuleAntiPatterns2.java	class AgreementRuleAntiPatterns2		pub=0	lit=445	loc=715
org/languagetool/rules/de/AgreementRuleAntiPatterns3.java	class AgreementRuleAntiPatterns3		pub=0	lit=532	loc=790
org/languagetool/rules/de/AgreementRule.java	class AgreementRule	extends Rule	pub=5	lit=324	loc=764
org/languagetool/rules/de/AgreementSuggestor2.java	class AgreementSuggestor2		pub=5	lit=127	loc=422
org/languagetool/rules/de/AgreementTools.java	class AgreementTools		pub=0	lit=13	loc=126
org/languagetool/rules/de/AustrianGermanSpellerRule.java	class AustrianGermanSpellerRule	extends GermanSpellerRule	pub=2	lit=3	loc=66
org/languagetool/rules/de/CaseRuleAntiPatterns.java	class CaseRuleAntiPatterns		pub=0	lit=1064	loc=1848
org/languagetool/rules/de/CaseRuleExceptions.java	class CaseRuleExceptions		pub=2	lit=6	loc=79
org/languagetool/rules/de/CaseRule.java	class CaseRule	extends Rule	pub=6	lit=1024	loc=1351
org/languagetool/rules/de/CompoundCheckFilter.java	class CompoundCheckFilter	extends RuleFilter	pub=1	lit=10	loc=57
org/languagetool/rules/de/CompoundCoherencyRule.java	class CompoundCoherencyRule	extends TextLevelRule	pub=4	lit=22	loc=143
org/languagetool/rules/de/CompoundInfinitivRule.java	class CompoundInfinitivRule	extends Rule	pub=4	lit=156	loc=378
org/languagetool/rules/de/ConjunctionAtBeginOfSentenceRule.java	class ConjunctionAtBeginOfSentenceRule	extends AbstractStatisticSentenceStyleRule	pub=3	lit=120	loc=160
org/languagetool/rules/de/DashRule.java	class DashRule	extends Rule	pub=3	lit=19	loc=88
org/languagetool/rules/de/DateCheckFilter.java	class DateCheckFilter	extends AbstractDateCheckWithSuggestionsFilter	pub=0	lit=10	loc=76
org/languagetool/rules/de/DateFilterHelper.java	class DateFilterHelper		pub=0	lit=28	loc=71
org/languagetool/rules/de/DuUpperLowerCaseRule.java	class DuUpperLowerCaseRule	extends TextLevelRule	pub=4	lit=50	loc=115
org/languagetool/rules/de/FutureDateFilter.java	class FutureDateFilter	extends AbstractFutureDateFilter	pub=0	lit=0	loc=40
org/languagetool/rules/de/GermanCommaWhitespaceRule.java	class GermanCommaWhitespaceRule	extends CommaWhitespaceRule	pub=0	lit=2	loc=48
org/languagetool/rules/de/GermanCompoundRule.java	class GermanCompoundRule	extends AbstractCompoundRule	pub=5	lit=37	loc=136
org/languagetool/rules/de/GermanConfusionProbabilityRule.java	class GermanConfusionProbabilityRule	extends ConfusionProbabilityRule	pub=0	lit=161	loc=246
org/languagetool/rules/de/GermanDoublePunctuationRule.java	class GermanDoublePunctuationRule	extends DoublePunctuationRule	pub=1	lit=6	loc=50
org/languagetool/rules/de/GermanFillerWordsRule.java	class GermanFillerWordsRule	extends AbstractStatisticStyleRule	pub=5	lit=268	loc=255
org/languagetool/rules/de/GermanHelper.java	class GermanHelper		pub=9	lit=5	loc=131
org/languagetool/rules/de/GermanMultitokenSpeller.java	class GermanMultitokenSpeller	extends MultitokenSpeller	pub=0	lit=6	loc=45
org/languagetool/rules/de/GermanNumberInWordFilter.java	class GermanNumberInWordFilter	extends AbstractNumberInWordFilter	pub=0	lit=0	loc=42
org/languagetool/rules/de/GermanParagraphRepeatBeginningRule.java	class GermanParagraphRepeatBeginningRule	extends ParagraphRepeatBeginningRule	pub=2	lit=2	loc=49
org/languagetool/rules/de/GermanReadabilityRule.java	class GermanReadabilityRule	extends ReadabilityRule	pub=6	lit=25	loc=165
org/languagetool/rules/de/GermanRepeatedWordsRule.java	class GermanRepeatedWordsRule	extends AbstractRepeatedWordsRule	pub=1	lit=5	loc=74
org/languagetool/rules/de/GermanSpellerRule.java	class GermanSpellerRule	extends CompoundAwareHunspellRule	pub=6	lit=6673	loc=4483
org/languagetool/rules/de/GermanStyleRepeatedWordRule.java	class GermanStyleRepeatedWordRule	extends AbstractStyleRepeatedWordRule	pub=3	lit=73	loc=270
org/languagetool/rules/de/GermanSuppressMisspelledSuggestionsFilter.java	class GermanSuppressMisspelledSuggestionsFilter	extends AbstractSuppressMisspelledSuggestionsFilter	pub=0	lit=0	loc=31
org/languagetool/rules/de/GermanTools.java	class GermanTools		pub=1	lit=1	loc=30
org/languagetool/rules/de/GermanUnpairedBracketsRule.java	class GermanUnpairedBracketsRule	extends GenericUnpairedBracketsRule	pub=1	lit=33	loc=71
org/languagetool/rules/de/GermanUnpairedQuotesRule.java	class GermanUnpairedQuotesRule	extends GenericUnpairedQuotesRule	pub=1	lit=20	loc=48
org/languagetool/rules/de/GermanWordRepeatBeginningRule.java	class GermanWordRepeatBeginningRule	extends WordRepeatBeginningRule	pub=1	lit=15	loc=60
org/languagetool/rules/de/GermanWordRepeatRule.java	class GermanWordRepeatRule	extends WordRepeatRule	pub=3	lit=215	loc=399
org/languagetool/rules/de/GermanWrongWordInContextRule.java	class GermanWrongWordInContextRule	extends WrongWordInContextRule	pub=2	lit=9	loc=70
org/languagetool/rules/de/InsertCommaFilter.java	class InsertCommaFilter	extends RuleFilter	pub=1	lit=62	loc=125
org/languagetool/rules/de/LanguageNames.java	class LanguageNames		pub=2	lit=85	loc=121
org/languagetool/rules/de/LineExpander.java	class LineExpander	implements org.languagetool.rules.LineExpander	pub=2	lit=56	loc=168
org/languagetool/rules/de/LongSentenceRule.java	class LongSentenceRule	extends org.languagetool.rules.LongSentenceRule	pub=3	lit=5	loc=52
org/languagetool/rules/de/MissingCommaRelativeClauseRule.java	class MissingCommaRelativeClauseRule	extends Rule	pub=4	lit=215	loc=811
org/languagetool/rules/de/MissingVerbRule.java	class MissingVerbRule	extends Rule	pub=3	lit=28	loc=122
org/languagetool/rules/de/MorfologikGermanyGermanSpellerRule.java	class MorfologikGermanyGermanSpellerRule	extends MorfologikSpellerRule	pub=2	lit=4	loc=57
org/languagetool/rules/de/NewYearDateFilter.java	class NewYearDateFilter	extends AbstractNewYearDateFilter	pub=0	lit=0	loc=41
org/languagetool/rules/de/NonSignificantVerbsRule.java	class NonSignificantVerbsRule	extends AbstractStatisticStyleRule	pub=5	lit=33	loc=150
org/languagetool/rules/de/OldSpellingRule.java	class OldSpellingRule	extends Rule	pub=3	lit=43	loc=166
org/languagetool/rules/de/PassiveSentenceRule.java	class PassiveSentenceRule	extends AbstractStatisticSentenceStyleRule	pub=3	lit=11	loc=103
org/languagetool/rules/de/PotentialCompoundFilter.java	class PotentialCompoundFilter	extends RuleFilter	pub=1	lit=4	loc=93
org/languagetool/rules/de/PrepositionToCases.java	class PrepositionToCases		pub=1	lit=117	loc=167
org/languagetool/rules/de/ProhibitedCompoundRule.java	class ProhibitedCompoundRule	extends Rule	pub=7	lit=447	loc=478
org/languagetool/rules/de/RecentYearFilter.java	class RecentYearFilter	extends RuleFilter	pub=1	lit=2	loc=47
org/languagetool/rules/de/RedundantModalOrAuxiliaryVerb.java	class RedundantModalOrAuxiliaryVerb	extends Rule	pub=3	lit=41	loc=217
org/languagetool/rules/de/RemoveUnknownCompoundsFilter.java	class RemoveUnknownCompoundsFilter	extends RuleFilter	pub=1	lit=4	loc=44
org/languagetool/rules/de/SentenceWhitespaceRule.java	class SentenceWhitespaceRule	extends org.languagetool.rules.SentenceWhitespaceRule	pub=3	lit=7	loc=62
org/languagetool/rules/de/SentenceWithManRule.java	class SentenceWithManRule	extends AbstractStatisticSentenceStyleRule	pub=4	lit=8	loc=103
org/languagetool/rules/de/SentenceWithModalVerbRule.java	class SentenceWithModalVerbRule	extends AbstractStatisticSentenceStyleRule	pub=3	lit=10	loc=110
org/languagetool/rules/de/SimilarNameRule.java	class SimilarNameRule	extends TextLevelRule	pub=4	lit=31	loc=120
org/languagetool/rules/de/SimpleReplaceRule.java	class SimpleReplaceRule	extends AbstractSimpleReplaceRule2	pub=5	lit=7	loc=73
org/languagetool/rules/de/SpellingData.java	class SpellingData		pub=2	lit=22	loc=104
org/languagetool/rules/de/StyleRepeatedSentenceBeginning.java	class StyleRepeatedSentenceBeginning	extends TextLevelRule	pub=4	lit=11	loc=127
org/languagetool/rules/de/StyleRepeatedVeryShortSentences.java	class StyleRepeatedVeryShortSentences	extends TextLevelRule	pub=5	lit=11	loc=186
org/languagetool/rules/de/StyleTooOftenUsedAdjectiveRule.java	class StyleTooOftenUsedAdjectiveRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=11	loc=86
org/languagetool/rules/de/StyleTooOftenUsedNounRule.java	class StyleTooOftenUsedNounRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=15	loc=90
org/languagetool/rules/de/StyleTooOftenUsedVerbRule.java	class StyleTooOftenUsedVerbRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=12	loc=86
org/languagetool/rules/de/SubjectVerbAgreementRule.java	class SubjectVerbAgreementRule	extends Rule	pub=6	lit=319	loc=701
org/languagetool/rules/de/SwissCompoundRule.java	class SwissCompoundRule	extends GermanCompoundRule	pub=3	lit=6	loc=70
org/languagetool/rules/de/SwissGermanSpellerRule.java	class SwissGermanSpellerRule	extends GermanSpellerRule	pub=2	lit=3	loc=66
org/languagetool/rules/de/UnitConversionRule.java	class UnitConversionRule	extends AbstractUnitConversionRule	pub=2	lit=92	loc=143
org/languagetool/rules/de/UnnecessaryPhraseRule.java	class UnnecessaryPhraseRule	extends AbstractStatisticStyleRule	pub=5	lit=67	loc=162
org/languagetool/rules/de/UpperCaseNgramRule.java	class UpperCaseNgramRule	extends Rule	pub=2	lit=16	loc=116
org/languagetool/rules/de/UppercaseNounReadingFilter.java	class UppercaseNounReadingFilter	extends RuleFilter	pub=1	lit=8	loc=66
org/languagetool/rules/de/ValidWordFilter.java	class ValidWordFilter	extends RuleFilter	pub=1	lit=7	loc=51
org/languagetool/rules/de/VerbAgreementRule.java	class VerbAgreementRule	extends TextLevelRule	pub=5	lit=501	loc=1049
org/languagetool/rules/de/WiederVsWiderRule.java	class WiederVsWiderRule	extends Rule	pub=4	lit=17	loc=92
org/languagetool/rules/de/WordCoherencyRule.java	class WordCoherencyRule	extends AbstractWordCoherencyRule	pub=2	lit=8	loc=65
org/languagetool/rules/de/YMDDateCheckFilter.java	class YMDDateCheckFilter	extends DateCheckFilter	pub=1	lit=4	loc=44
org/languagetool/rules/de/YMDNewYearDateFilter.java	class YMDNewYearDateFilter	extends NewYearDateFilter	pub=1	lit=4	loc=46
org/languagetool/synthesis/GermanSynthesizer.java	class GermanSynthesizer	extends BaseSynthesizer	pub=2	lit=42	loc=134
org/languagetool/tagging/de/AdjectiveTags.java	class AdjectiveTags		pub=0	lit=75	loc=122
org/languagetool/tagging/de/AnalyzedGermanToken.java	class AnalyzedGermanToken		pub=5	lit=22	loc=137
org/languagetool/tagging/de/GermanTagger.java	class GermanTagger	extends BaseTagger	pub=4	lit=998	loc=875
org/languagetool/tagging/de/GermanToken.java	class GermanToken		pub=5	lit=23	loc=126
org/languagetool/tagging/de/SwissGermanTagger.java	class SwissGermanTagger	extends GermanTagger	pub=1	lit=4	loc=56
org/languagetool/tagging/de/VerbPrefixes.java	class VerbPrefixes		pub=1	lit=103	loc=57
org/languagetool/tagging/disambiguation/rules/de/GermanRuleDisambiguator.java	class GermanRuleDisambiguator	extends AbstractDisambiguator	pub=1	lit=3	loc=65
org/languagetool/tokenizers/de/GermanCompoundTokenizer.java	class GermanCompoundTokenizer	implements Tokenizer	pub=4	lit=380	loc=348
org/languagetool/tokenizers/de/GermanWordTokenizer.java	class GermanWordTokenizer	extends WordTokenizer	pub=1	lit=2	loc=33
```

### B.languagetool-language-modules_en
```
org/languagetool/chunking/EnglishChunker.java	class EnglishChunker	implements Chunker	pub=1	lit=16	loc=186
org/languagetool/chunking/EnglishChunkFilter.java	class EnglishChunkFilter		pub=0	lit=14	loc=131
org/languagetool/language/AmericanEnglish.java	class AmericanEnglish	extends English	pub=5	lit=8	loc=100
org/languagetool/language/AustralianEnglish.java	class AustralianEnglish	extends English	pub=5	lit=2	loc=70
org/languagetool/language/BritishEnglish.java	class BritishEnglish	extends English	pub=6	lit=9	loc=116
org/languagetool/language/CanadianEnglish.java	class CanadianEnglish	extends English	pub=5	lit=5	loc=93
org/languagetool/language/English.java	class English	extends LanguageWithModel	pub=29	lit=393	loc=767
org/languagetool/language/NewZealandEnglish.java	class NewZealandEnglish	extends English	pub=5	lit=3	loc=72
org/languagetool/language/SouthAfricanEnglish.java	class SouthAfricanEnglish	extends English	pub=5	lit=2	loc=68
org/languagetool/rules/en/AbstractEnglishSpellerRule.java	class AbstractEnglishSpellerRule	extends MorfologikSpellerRule	pub=2	lit=2083	loc=1623
org/languagetool/rules/en/AdvancedSynthesizerFilter.java	class AdvancedSynthesizerFilter	extends AbstractAdvancedSynthesizerFilter	pub=0	lit=0	loc=33
org/languagetool/rules/en/AdverbFilter.java	class AdverbFilter	extends RuleFilter	pub=1	lit=1019	loc=562
org/languagetool/rules/en/AmericanReplaceRule.java	class AmericanReplaceRule	extends AbstractSimpleReplaceRule2	pub=5	lit=7	loc=82
org/languagetool/rules/en/AvsAnData.java	class AvsAnData		pub=0	lit=5	loc=73
org/languagetool/rules/en/AvsAnRule.java	class AvsAnRule	extends Rule	pub=5	lit=43	loc=198
org/languagetool/rules/en/BritishReplaceRule.java	class BritishReplaceRule	extends AbstractSimpleReplaceRule2	pub=6	lit=7	loc=83
org/languagetool/rules/en/CompoundRule.java	class CompoundRule	extends AbstractCompoundRule	pub=5	lit=58	loc=179
org/languagetool/rules/en/ConsistentApostrophesRule.java	class ConsistentApostrophesRule	extends TextLevelRule	pub=4	lit=12	loc=112
org/languagetool/rules/en/ContractionSpellingRule.java	class ContractionSpellingRule	extends AbstractSimpleReplaceRule	pub=6	lit=9	loc=89
org/languagetool/rules/en/DateCheckFilter.java	class DateCheckFilter	extends AbstractDateCheckWithSuggestionsFilter	pub=0	lit=9	loc=82
org/languagetool/rules/en/DateFilterHelper.java	class DateFilterHelper		pub=0	lit=26	loc=69
org/languagetool/rules/en/EnglishConfusionProbabilityRule.java	class EnglishConfusionProbabilityRule	extends ConfusionProbabilityRule	pub=0	lit=623	loc=765
org/languagetool/rules/en/EnglishConvertToSentenceCaseFilter.java	class EnglishConvertToSentenceCaseFilter	extends ConvertToSentenceCaseFilter	pub=0	lit=1	loc=30
org/languagetool/rules/en/EnglishDashRule.java	class EnglishDashRule	extends AbstractDashRule	pub=3	lit=7	loc=73
org/languagetool/rules/en/EnglishDiacriticsRule.java	class EnglishDiacriticsRule	extends AbstractSimpleReplaceRule2	pub=6	lit=10	loc=98
org/languagetool/rules/en/EnglishForDutchmenFalseFriendRule.java	class EnglishForDutchmenFalseFriendRule	extends EnglishForL2SpeakersFalseFriendRule	pub=1	lit=4	loc=53
org/languagetool/rules/en/EnglishForFrenchFalseFriendRule.java	class EnglishForFrenchFalseFriendRule	extends EnglishForL2SpeakersFalseFriendRule	pub=1	lit=4	loc=53
org/languagetool/rules/en/EnglishForGermansFalseFriendRule.java	class EnglishForGermansFalseFriendRule	extends EnglishForL2SpeakersFalseFriendRule	pub=1	lit=4	loc=53
org/languagetool/rules/en/EnglishForL2SpeakersFalseFriendRule.java	class EnglishForL2SpeakersFalseFriendRule	extends ConfusionProbabilityRule	pub=0	lit=2	loc=90
org/languagetool/rules/en/EnglishForSpaniardsFalseFriendRule.java	class EnglishForSpaniardsFalseFriendRule	extends EnglishForL2SpeakersFalseFriendRule	pub=1	lit=4	loc=53
org/languagetool/rules/en/EnglishMultitokenSpeller.java	class EnglishMultitokenSpeller	extends MultitokenSpeller	pub=0	lit=4	loc=35
org/languagetool/rules/en/EnglishNgramProbabilityRule.java	class EnglishNgramProbabilityRule	extends NgramProbabilityRule	pub=0	lit=2	loc=46
org/languagetool/rules/en/EnglishNumberInWordFilter.java	class EnglishNumberInWordFilter	extends AbstractNumberInWordFilter	pub=1	lit=0	loc=52
org/languagetool/rules/en/EnglishPartialPosTagFilter.java	class EnglishPartialPosTagFilter	extends PartialPosTagFilter	pub=0	lit=3	loc=55
org/languagetool/rules/en/EnglishPlainEnglishRule.java	class EnglishPlainEnglishRule	extends AbstractSimpleReplaceRule2	pub=6	lit=10	loc=98
org/languagetool/rules/en/EnglishRedundancyRule.java	class EnglishRedundancyRule	extends AbstractSimpleReplaceRule2	pub=6	lit=10	loc=99
org/languagetool/rules/en/EnglishRepeatedWordsRule.java	class EnglishRepeatedWordsRule	extends AbstractRepeatedWordsRule	pub=2	lit=79	loc=234
org/languagetool/rules/en/EnglishSpecificCaseRule.java	class EnglishSpecificCaseRule	extends AbstractSpecificCaseRule	pub=5	lit=9	loc=69
org/languagetool/rules/en/EnglishSuppressMisspelledSuggestionsFilter.java	class EnglishSuppressMisspelledSuggestionsFilter	extends AbstractSuppressMisspelledSuggestionsFilter	pub=0	lit=0	loc=31
org/languagetool/rules/en/EnglishUnpairedBracketsRule.java	class EnglishUnpairedBracketsRule	extends GenericUnpairedBracketsRule	pub=1	lit=29	loc=97
org/languagetool/rules/en/EnglishUnpairedQuotesRule.java	class EnglishUnpairedQuotesRule	extends GenericUnpairedQuotesRule	pub=1	lit=18	loc=66
org/languagetool/rules/en/EnglishWordRepeatBeginningRule.java	class EnglishWordRepeatBeginningRule	extends WordRepeatBeginningRule	pub=2	lit=33	loc=139
org/languagetool/rules/en/EnglishWordRepeatRule.java	class EnglishWordRepeatRule	extends WordRepeatRule	pub=2	lit=176	loc=283
org/languagetool/rules/en/EnglishWrongWordInContextRule.java	class EnglishWrongWordInContextRule	extends WrongWordInContextRule	pub=2	lit=9	loc=69
org/languagetool/rules/en/FindSuggestionsFilter.java	class FindSuggestionsFilter	extends AbstractFindSuggestionsFilter	pub=0	lit=1	loc=55
org/languagetool/rules/en/FutureDateFilter.java	class FutureDateFilter	extends AbstractFutureDateFilter	pub=0	lit=0	loc=40
org/languagetool/rules/en/GoogleStyleWordTokenizer.java	class GoogleStyleWordTokenizer	extends WordTokenizer	pub=2	lit=10	loc=69
org/languagetool/rules/en/LongSentenceRule.java	class LongSentenceRule	extends org.languagetool.rules.LongSentenceRule	pub=1	lit=2	loc=37
org/languagetool/rules/en/MorfologikAmericanSpellerRule.java	class MorfologikAmericanSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=13	loc=101
org/languagetool/rules/en/MorfologikAustralianSpellerRule.java	class MorfologikAustralianSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=5	loc=73
org/languagetool/rules/en/MorfologikBritishSpellerRule.java	class MorfologikBritishSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=5	loc=74
org/languagetool/rules/en/MorfologikCanadianSpellerRule.java	class MorfologikCanadianSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=5	loc=73
org/languagetool/rules/en/MorfologikNewZealandSpellerRule.java	class MorfologikNewZealandSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=5	loc=73
org/languagetool/rules/en/MorfologikSouthAfricanSpellerRule.java	class MorfologikSouthAfricanSpellerRule	extends AbstractEnglishSpellerRule	pub=3	lit=5	loc=73
org/languagetool/rules/en/NewYearDateFilter.java	class NewYearDateFilter	extends AbstractNewYearDateFilter	pub=0	lit=0	loc=41
org/languagetool/rules/en/NewZealandReplaceRule.java	class NewZealandReplaceRule	extends AbstractSimpleReplaceRule2	pub=5	lit=7	loc=83
org/languagetool/rules/en/NoDisambiguationEnglishPartialPosTagFilter.java	class NoDisambiguationEnglishPartialPosTagFilter	extends PartialPosTagFilter	pub=0	lit=3	loc=48
org/languagetool/rules/en/OrdinalSuffixFilter.java	class OrdinalSuffixFilter	extends RuleFilter	pub=1	lit=12	loc=57
org/languagetool/rules/en/SimpleReplaceProfanityRule.java	class SimpleReplaceProfanityRule	extends AbstractSimpleReplaceRule2	pub=5	lit=7	loc=78
org/languagetool/rules/en/SimpleReplaceRule.java	class SimpleReplaceRule	extends AbstractSimpleReplaceRule2	pub=5	lit=7	loc=70
org/languagetool/rules/en/StyleTooOftenUsedAdjectiveRule.java	class StyleTooOftenUsedAdjectiveRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=13	loc=89
org/languagetool/rules/en/StyleTooOftenUsedNounRule.java	class StyleTooOftenUsedNounRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=13	loc=89
org/languagetool/rules/en/StyleTooOftenUsedVerbRule.java	class StyleTooOftenUsedVerbRule	extends AbstractStyleTooOftenUsedWordRule	pub=3	lit=13	loc=88
org/languagetool/rules/en/translation/BeoLingusTranslator.java	class BeoLingusTranslator	implements Translator	pub=8	lit=142	loc=344
org/languagetool/rules/en/translation/Inflector.java	class Inflector		pub=0	lit=23	loc=92
org/languagetool/rules/en/UnitConversionRuleImperial.java	class UnitConversionRuleImperial	extends UnitConversionRule	pub=0	lit=65	loc=88
org/languagetool/rules/en/UnitConversionRule.java	class UnitConversionRule	extends AbstractUnitConversionRule	pub=2	lit=26	loc=80
org/languagetool/rules/en/UnitConversionRuleUS.java	class UnitConversionRuleUS	extends UnitConversionRule	pub=0	lit=70	loc=91
org/languagetool/rules/en/UpperCaseNgramRule.java	class UpperCaseNgramRule	extends Rule	pub=3	lit=350	loc=717
org/languagetool/rules/en/VariantInfo.java	class VariantInfo		pub=0	lit=0	loc=43
org/languagetool/rules/en/WordCoherencyRule.java	class WordCoherencyRule	extends AbstractWordCoherencyRule	pub=2	lit=8	loc=63
org/languagetool/rules/en/YMDDateCheckFilter.java	class YMDDateCheckFilter	extends DateCheckFilter	pub=1	lit=4	loc=44
org/languagetool/rules/en/YMDNewYearDateFilter.java	class YMDNewYearDateFilter	extends NewYearDateFilter	pub=1	lit=4	loc=45
org/languagetool/synthesis/en/EnglishSynthesizer.java	class EnglishSynthesizer	extends BaseSynthesizer	pub=2	lit=25	loc=152
org/languagetool/tagging/en/EnglishHybridDisambiguator.java	class EnglishHybridDisambiguator	extends AbstractDisambiguator	pub=2	lit=2	loc=69
org/languagetool/tagging/en/EnglishTagger.java	class EnglishTagger	extends BaseTagger	pub=1	lit=6	loc=125
org/languagetool/tokenizers/en/EnglishWordTokenizer.java	class EnglishWordTokenizer	extends WordTokenizer	pub=1	lit=44	loc=164
```

### B.languagetool-language-modules_fr
```
org/languagetool/language/BelgianFrench.java	class BelgianFrench	extends French	pub=3	lit=4	loc=52
org/languagetool/language/CanadianFrench.java	class CanadianFrench	extends French	pub=3	lit=4	loc=52
org/languagetool/language/French.java	class French	extends LanguageWithModel	pub=27	lit=223	loc=600
org/languagetool/language/SwissFrench.java	class SwissFrench	extends French	pub=3	lit=4	loc=52
org/languagetool/rules/fr/AdvancedSynthesizerFilter.java	class AdvancedSynthesizerFilter	extends AbstractAdvancedSynthesizerFilter	pub=0	lit=0	loc=33
org/languagetool/rules/fr/CompoundRule.java	class CompoundRule	extends AbstractCompoundRule	pub=4	lit=9	loc=77
org/languagetool/rules/fr/DateCheckFilter.java	class DateCheckFilter	extends AbstractDateCheckWithSuggestionsFilter	pub=0	lit=1	loc=57
org/languagetool/rules/fr/DateFilterHelper.java	class DateFilterHelper		pub=0	lit=32	loc=73
org/languagetool/rules/fr/DMYDateCheckFilter.java	class DMYDateCheckFilter	extends DateCheckFilter	pub=1	lit=11	loc=49
org/languagetool/rules/fr/FindSuggestionsFilter.java	class FindSuggestionsFilter	extends AbstractFindSuggestionsFilter	pub=0	lit=5	loc=99
org/languagetool/rules/fr/FrenchConfusionProbabilityRule.java	class FrenchConfusionProbabilityRule	extends ConfusionProbabilityRule	pub=0	lit=4	loc=47
org/languagetool/rules/fr/FrenchMultitokenSpeller.java	class FrenchMultitokenSpeller	extends MultitokenSpeller	pub=0	lit=4	loc=35
org/languagetool/rules/fr/FrenchNumberInWordFilter.java	class FrenchNumberInWordFilter	extends AbstractNumberInWordFilter	pub=1	lit=0	loc=45
org/languagetool/rules/fr/FrenchPartialPosTagFilter.java	class FrenchPartialPosTagFilter	extends PartialPosTagFilter	pub=0	lit=2	loc=52
org/languagetool/rules/fr/FrenchRepeatedWordsRule.java	class FrenchRepeatedWordsRule	extends AbstractRepeatedWordsRule	pub=1	lit=32	loc=98
org/languagetool/rules/fr/FrenchSuppressMisspelledSuggestionsFilter.java	class FrenchSuppressMisspelledSuggestionsFilter	extends AbstractSuppressMisspelledSuggestionsFilter	pub=0	lit=0	loc=32
org/languagetool/rules/fr/GrammalecteRule.java	class GrammalecteRule	extends Rule	pub=6	lit=555	loc=716
org/languagetool/rules/fr/InterrogativeVerbFilter.java	class InterrogativeVerbFilter	extends RuleFilter	pub=1	lit=84	loc=205
org/languagetool/rules/fr/MakeContractionsFilter.java	class MakeContractionsFilter	extends AbstractMakeContractionsFilter	pub=0	lit=8	loc=45
org/languagetool/rules/fr/MorfologikFrenchSpellerRule.java	class MorfologikFrenchSpellerRule	extends MorfologikSpellerRule	pub=4	lit=175	loc=308
org/languagetool/rules/fr/NewYearDateFilter.java	class NewYearDateFilter	extends AbstractNewYearDateFilter	pub=0	lit=0	loc=45
org/languagetool/rules/fr/PostponedAdjectiveConcordanceFilter.java	class PostponedAdjectiveConcordanceFilter	extends RuleFilter	pub=1	lit=82	loc=577
org/languagetool/rules/fr/QuestionWhitespaceRule.java	class QuestionWhitespaceRule	extends Rule	pub=4	lit=60	loc=202
org/languagetool/rules/fr/QuestionWhitespaceStrictRule.java	class QuestionWhitespaceStrictRule	extends QuestionWhitespaceRule	pub=2	lit=7	loc=68
org/languagetool/rules/fr/SimpleReplaceRule.java	class SimpleReplaceRule	extends AbstractSimpleReplaceRule	pub=6	lit=8	loc=94
org/languagetool/rules/fr/SuggestionsFilter.java	class SuggestionsFilter	extends RuleFilter	pub=1	lit=1	loc=55
org/languagetool/rules/fr/WordWithDeterminerFilter.java	class WordWithDeterminerFilter	extends RuleFilter	pub=1	lit=41	loc=191
org/languagetool/synthesis/FrenchSynthesizer.java	class FrenchSynthesizer	extends BaseSynthesizer	pub=0	lit=9	loc=56
org/languagetool/tagging/disambiguation/fr/FrenchHybridDisambiguator.java	class FrenchHybridDisambiguator	extends AbstractDisambiguator	pub=2	lit=2	loc=68
org/languagetool/tagging/fr/FrenchTagger.java	class FrenchTagger	extends BaseTagger	pub=2	lit=29	loc=229
org/languagetool/tokenizers/fr/FrenchWordTokenizer.java	class FrenchWordTokenizer	extends WordTokenizer	pub=1	lit=78	loc=218
```

## Appendix C Resource files

### C.languagetool-core
```
languagetool-core/org/languagetool/MessagesBundle_en.properties
languagetool-core/org/languagetool/MessagesBundle.properties
languagetool-core/org/languagetool/resource/api-output.dtd
languagetool-core/org/languagetool/resource/disambiguation-global.xml
languagetool-core/org/languagetool/resource/disambiguation.xsd
languagetool-core/org/languagetool/resource/org/languagetool/tokenizers/segment-simple.srx
languagetool-core/org/languagetool/resource/Roman.sor
languagetool-core/org/languagetool/resource/segment.srx
languagetool-core/org/languagetool/resource/spelling_global.txt
languagetool-core/org/languagetool/rules/bitext.xsd
languagetool-core/org/languagetool/rules/false-friends.css
languagetool-core/org/languagetool/rules/false-friends.dtd
languagetool-core/org/languagetool/rules/false-friends.html
languagetool-core/org/languagetool/rules/false-friends.xml
languagetool-core/org/languagetool/rules/pattern.xsd
languagetool-core/org/languagetool/rules/print-ff.xsl
languagetool-core/org/languagetool/rules/print.xsl
languagetool-core/org/languagetool/rules/remote-rules.xsd
languagetool-core/org/languagetool/rules/rules.css
languagetool-core/org/languagetool/rules/rules.xsd
```

### C.languagetool-commandline
```
languagetool-commandline/logback.xml
```

### C.languagetool-server
```
languagetool-server/logback.xml
languagetool-server/org/languagetool/server/DictMapperOpenSource.xml
languagetool-server/org/languagetool/server/GroupMapperOpenSource.xml
languagetool-server/org/languagetool/server/LogMapperOpenSource.xml
languagetool-server/org/languagetool/server/mybatis-config.xml
```

### C.languagetool-language-modules_de
```
languagetool-language-modules/de/META-INF/org/languagetool/language-module.properties
languagetool-language-modules/de/org/languagetool/MessagesBundle_de.properties
languagetool-language-modules/de/org/languagetool/resource/de/added_custom.txt
languagetool-language-modules/de/org/languagetool/resource/de/added.txt
languagetool-language-modules/de/org/languagetool/resource/de/alt_neu.csv
languagetool-language-modules/de/org/languagetool/resource/de/ambiguous_case.txt
languagetool-language-modules/de/org/languagetool/resource/de/case_rule_exceptions.txt
languagetool-language-modules/de/org/languagetool/resource/de/common_words.txt
languagetool-language-modules/de/org/languagetool/resource/de/compound-cities.txt
languagetool-language-modules/de/org/languagetool/resource/de/compound_exceptions.txt
languagetool-language-modules/de/org/languagetool/resource/de/compounds.txt
languagetool-language-modules/de/org/languagetool/resource/de/confusion_set_candidates.txt
languagetool-language-modules/de/org/languagetool/resource/de/confusion_sets.txt
languagetool-language-modules/de/org/languagetool/resource/de/de.sor
languagetool-language-modules/de/org/languagetool/resource/de/disambiguation.xml
languagetool-language-modules/de/org/languagetool/resource/de/do-not-synthesize.txt
languagetool-language-modules/de/org/languagetool/resource/de/eigennamen_gross.txt
languagetool-language-modules/de/org/languagetool/resource/de/errors.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/COPYING_GPLv2.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/COPYING_GPLv3.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/create_dict.sh
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT.aff
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT.dic
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT.dic.header
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT.dict
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT_frami_README.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_AT.info
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH.aff
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH.dic
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH.dic.header
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH.dict
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH_frami_README.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_CH.info
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.aff
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.dic
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.dic.header
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.dict
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE_frami_README.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.info
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/de_DE.README
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/ignore.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/prohibit_custom.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/prohibit.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling_custom.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling-de-AT.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling-de-CH.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling_merged.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling_recommendation.txt
languagetool-language-modules/de/org/languagetool/resource/de/hunspell/spelling.txt
languagetool-language-modules/de/org/languagetool/resource/de/multitoken-ignore.txt
languagetool-language-modules/de/org/languagetool/resource/de/multitoken-suggest.txt
languagetool-language-modules/de/org/languagetool/resource/de/other_prefixes.txt
languagetool-language-modules/de/org/languagetool/resource/de/README.txt
languagetool-language-modules/de/org/languagetool/resource/de/removed_custom.txt
languagetool-language-modules/de/org/languagetool/resource/de/removed.txt
languagetool-language-modules/de/org/languagetool/resource/de/spelling_correction_model.bin
languagetool-language-modules/de/org/languagetool/resource/de/tagset.txt
languagetool-language-modules/de/org/languagetool/resource/de/verb_prefixes.txt
languagetool-language-modules/de/org/languagetool/resource/de/verb_stems.txt
languagetool-language-modules/de/org/languagetool/resource/de/word_definitions.txt
languagetool-language-modules/de/org/languagetool/resource/de/words_infix_s.txt
languagetool-language-modules/de/org/languagetool/resource/de/words-similar.txt
languagetool-language-modules/de/org/languagetool/rules/de/addedCompound.txt
languagetool-language-modules/de/org/languagetool/rules/de/coherency.txt
languagetool-language-modules/de/org/languagetool/rules/de/de-CH/grammar.xml
languagetool-language-modules/de/org/languagetool/rules/de/de-DE-AT/grammar.xml
languagetool-language-modules/de/org/languagetool/rules/de/grammar.xml
languagetool-language-modules/de/org/languagetool/rules/de/remote-rule-filters.xml
languagetool-language-modules/de/org/languagetool/rules/de/replace_custom.txt
languagetool-language-modules/de/org/languagetool/rules/de/replace.txt
languagetool-language-modules/de/org/languagetool/rules/de/style.xml
languagetool-language-modules/de/org/languagetool/rules/de/synonyms.txt
languagetool-language-modules/de/org/languagetool/rules/de/wrongWordInContext.txt
```

### C.languagetool-language-modules_en
```
languagetool-language-modules/en/META-INF/org/languagetool/language-module.properties
languagetool-language-modules/en/org/languagetool/resource/en/12dicts-readme.html
languagetool-language-modules/en/org/languagetool/resource/en/added_custom.txt
languagetool-language-modules/en/org/languagetool/resource/en/added.txt
languagetool-language-modules/en/org/languagetool/resource/en/agid-readme.txt
languagetool-language-modules/en/org/languagetool/resource/en/common_words.txt
languagetool-language-modules/en/org/languagetool/resource/en/compounds.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_set_candidates.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_extended.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_l2_de.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_l2_es.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_l2_fr.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_l2_nl.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets_l2_nl_wip.txt
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets.README
languagetool-language-modules/en/org/languagetool/resource/en/confusion_sets.txt
languagetool-language-modules/en/org/languagetool/resource/en/disambiguation.xml
languagetool-language-modules/en/org/languagetool/resource/en/do-not-synthesize.txt
languagetool-language-modules/en/org/languagetool/resource/en/en.sor
languagetool-language-modules/en/org/languagetool/resource/en/en-US-GB.txt
languagetool-language-modules/en/org/languagetool/resource/en/errors.txt
languagetool-language-modules/en/org/languagetool/resource/en/filter-archaic.txt
languagetool-language-modules/en/org/languagetool/resource/en/filter-minus.txt
languagetool-language-modules/en/org/languagetool/resource/en/filter_out.awk
languagetool-language-modules/en/org/languagetool/resource/en/get_all_english_cardinal.awk
languagetool-language-modules/en/org/languagetool/resource/en/get_unc.awk
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/ignore.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/prohibit_custom.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/prohibit.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_custom.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-AU.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-CA.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-GB.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-NZ.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-US.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_en-ZA.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling_merged.txt
languagetool-language-modules/en/org/languagetool/resource/en/hunspell/spelling.txt
languagetool-language-modules/en/org/languagetool/resource/en/multiwords.txt
languagetool-language-modules/en/org/languagetool/resource/en/numbers.txt
languagetool-language-modules/en/org/languagetool/resource/en/partlycountable.txt
languagetool-language-modules/en/org/languagetool/resource/en/pos-readme.txt
languagetool-language-modules/en/org/languagetool/resource/en/remap.awk
languagetool-language-modules/en/org/languagetool/resource/en/removed_custom.txt
languagetool-language-modules/en/org/languagetool/resource/en/removed.txt
languagetool-language-modules/en/org/languagetool/resource/en/specific_case.txt
languagetool-language-modules/en/org/languagetool/resource/en/spelling_correction_model.bin
languagetool-language-modules/en/org/languagetool/resource/en/synteza.awk
languagetool-language-modules/en/org/languagetool/resource/en/tags.awk
languagetool-language-modules/en/org/languagetool/resource/en/tagset.txt
languagetool-language-modules/en/org/languagetool/resource/en/test_dict.awk
languagetool-language-modules/en/org/languagetool/resource/en/uncountable.txt
languagetool-language-modules/en/org/languagetool/resource/en/word_definitions.txt
languagetool-language-modules/en/org/languagetool/rules/en/coherency.txt
languagetool-language-modules/en/org/languagetool/rules/en/contractions.txt
languagetool-language-modules/en/org/languagetool/rules/en/det_an.txt
languagetool-language-modules/en/org/languagetool/rules/en/det_a.txt
languagetool-language-modules/en/org/languagetool/rules/en/diacritics.txt
languagetool-language-modules/en/org/languagetool/rules/en/en-AU/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-CA/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-GB/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-GB/replace.txt
languagetool-language-modules/en/org/languagetool/rules/en/en-GB/style.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-NZ/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-NZ/replace.txt
languagetool-language-modules/en/org/languagetool/rules/en/en-US/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/en-US/replace.txt
languagetool-language-modules/en/org/languagetool/rules/en/en-US/style.xml
languagetool-language-modules/en/org/languagetool/rules/en/grammar-l2-de.xml
languagetool-language-modules/en/org/languagetool/rules/en/grammar-l2-fr.xml
languagetool-language-modules/en/org/languagetool/rules/en/grammar.xml
languagetool-language-modules/en/org/languagetool/rules/en/indent.sh
languagetool-language-modules/en/org/languagetool/rules/en/redundancies.txt
languagetool-language-modules/en/org/languagetool/rules/en/remote-rule-filters.xml
languagetool-language-modules/en/org/languagetool/rules/en/replace_custom.txt
languagetool-language-modules/en/org/languagetool/rules/en/replace_profanity.txt
languagetool-language-modules/en/org/languagetool/rules/en/replace.txt
languagetool-language-modules/en/org/languagetool/rules/en/style.xml
languagetool-language-modules/en/org/languagetool/rules/en/synonyms.txt
languagetool-language-modules/en/org/languagetool/rules/en/wordiness.txt
languagetool-language-modules/en/org/languagetool/rules/en/wrongWordInContext.txt
```

### C.languagetool-language-modules_fr
```
languagetool-language-modules/fr/META-INF/org/languagetool/language-module.properties
languagetool-language-modules/fr/org/languagetool/MessagesBundle_fr.properties
languagetool-language-modules/fr/org/languagetool/resource/fr/added_custom.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/added.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/common_words.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/compounds.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/confusion_sets.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/disambiguation.xml
languagetool-language-modules/fr/org/languagetool/resource/fr/fr.sor
languagetool-language-modules/fr/org/languagetool/resource/fr/hunspell/ignore.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/hunspell/prohibit.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/hunspell/README_fr.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/hunspell/spelling_custom.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/hunspell/spelling.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/hyphenated_words.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/multiwords.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/README_lexique.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/removed_custom.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/removed.txt
languagetool-language-modules/fr/org/languagetool/resource/fr/tagset.txt
languagetool-language-modules/fr/org/languagetool/rules/fr/grammar.xml
languagetool-language-modules/fr/org/languagetool/rules/fr/remote-rule-filters.xml
languagetool-language-modules/fr/org/languagetool/rules/fr/replace_custom.txt
languagetool-language-modules/fr/org/languagetool/rules/fr/replace.txt
languagetool-language-modules/fr/org/languagetool/rules/fr/style.xml
languagetool-language-modules/fr/org/languagetool/rules/fr/synonyms.txt
```

## Appendix D Resource path literals loaded by Java code (file:line:literal)

### D.languagetool-core
```
languagetool-core/ShortDescriptionProvider.java:48:"/word_definitions.txt"
languagetool-core/DynamicHunspellLanguage.java:47:".dic$"
languagetool-core/tokenizers/SRXSentenceTokenizer.java:44:"/segment.srx"
languagetool-core/Languages.java:42:"META-INF/org/languagetool/language-module.properties"
languagetool-core/Languages.java:62:".dic"
languagetool-core/XMLValidator.java:49:"jdk.xml.totalEntitySizeLimit"
languagetool-core/XMLValidator.java:50:"jdk.xml.entityExpansionLimit"
languagetool-core/DynamicLanguage.java:66:"common_words.txt"
languagetool-core/tokenizers/SimpleSentenceTokenizer.java:38:"/org/languagetool/tokenizers/segment-simple.srx"
languagetool-core/RuleEntityResolver.java:34:".*/resource/"
languagetool-core/synthesis/BaseSynthesizer.java:89:"/added.txt"
languagetool-core/synthesis/BaseSynthesizer.java:97:"/removed.txt"
languagetool-core/synthesis/BaseSynthesizer.java:105:"/do-not-synthesize.txt"
languagetool-core/synthesis/BaseSynthesizer.java:183:"Roman.sor"
languagetool-core/JLanguageTool.java:106:"grammar.xml"
languagetool-core/JLanguageTool.java:110:"style.xml"
languagetool-core/JLanguageTool.java:114:"grammar_custom.xml"
languagetool-core/JLanguageTool.java:118:"false-friends.xml"
languagetool-core/JLanguageTool.java:138:".dict"
languagetool-core/rules/RemoteRuleFilters.java:57:"remote-rule-filters.xml"
languagetool-core/LtBuildInfo.java:36:"/git.properties"
languagetool-core/LtBuildInfo.java:37:"/git-premium.properties"
languagetool-core/rules/ngrams/ConfusionProbabilityRule.java:118:"confusion_sets.txt"
languagetool-core/rules/patterns/PatternRuleLoader.java:76:"jdk.xml.maxGeneralEntitySizeLimit"
languagetool-core/rules/patterns/PatternRuleLoader.java:77:"jdk.xml.totalEntitySizeLimit"
languagetool-core/rules/patterns/PatternRuleLoader.java:78:"jdk.xml.entityExpansionLimit"
languagetool-core/rules/spelling/SpellingCheckRule.java:77:"/hunspell/ignore.txt"
languagetool-core/rules/spelling/SpellingCheckRule.java:78:"/hunspell/spelling.txt"
languagetool-core/rules/spelling/SpellingCheckRule.java:79:"/hunspell/spelling_custom.txt"
languagetool-core/rules/spelling/SpellingCheckRule.java:80:"spelling_global.txt"
languagetool-core/rules/spelling/SpellingCheckRule.java:81:"/hunspell/prohibit.txt"
languagetool-core/rules/spelling/SpellingCheckRule.java:82:"/hunspell/prohibit_custom.txt"
languagetool-core/Language.java:160:"/common_words.txt"
languagetool-core/Language.java:355:"/grammar-premium.xml"
languagetool-core/rules/spelling/hunspell/Hunspell.java:66:".dic"
languagetool-core/rules/spelling/hunspell/Hunspell.java:67:".aff"
languagetool-core/rules/spelling/hunspell/Hunspell.java:119:".dic"
languagetool-core/rules/spelling/hunspell/Hunspell.java:119:".aff"
languagetool-core/language/identifier/detector/NGramDetector.java:78:"vocab.txt"
languagetool-core/language/identifier/detector/NGramDetector.java:89:"thresholds.txt"
languagetool-core/language/identifier/detector/NGramDetector.java:177:"%02d.txt"
languagetool-core/language/LanguageBuilder.java:56:".xml"
languagetool-core/language/LanguageBuilder.java:74:".xml"
languagetool-core/language/LanguageBuilder.java:105:".xml"
languagetool-core/rules/patterns/PatternRuleXmlCreator.java:52:"/rules/category/rule[@id='"
languagetool-core/rules/patterns/PatternRuleXmlCreator.java:56:"/rules/category/rulegroup/rule[@id='"
languagetool-core/rules/patterns/PatternRuleXmlCreator.java:61:"/rules/category/rulegroup[@id='"
languagetool-core/rules/patterns/PatternRuleXmlCreator.java:70:"/rules/category/rulegroup[@id='"
languagetool-core/rules/spelling/SymSpellRule.java:64:"ignore.txt"
languagetool-core/rules/spelling/SymSpellRule.java:83:"probibit.txt"
languagetool-core/rules/spelling/SymSpellRule.java:141:"spelling.txt"
languagetool-core/rules/spelling/SymSpellRule.java:142:".txt"
languagetool-core/rules/spelling/SymSpellRule.java:144:".dic"
languagetool-core/rules/spelling/morfologik/MorfologikMultiSpeller.java:128:".txt"
languagetool-core/rules/spelling/morfologik/MorfologikMultiSpeller.java:129:".txt"
languagetool-core/rules/spelling/morfologik/MorfologikMultiSpeller.java:243:".info"
languagetool-core/rules/spelling/morfologik/MorfologikMultiSpeller.java:275:".info"
languagetool-core/rules/spelling/hunspell/CompoundAwareHunspellRule.java:58:"/hunspell/spelling.txt"
languagetool-core/rules/spelling/hunspell/CompoundAwareHunspellRule.java:59:"/hunspell/spelling_custom.txt"
languagetool-core/rules/spelling/hunspell/CompoundAwareHunspellRule.java:60:"/multitoken-suggest.txt"
languagetool-core/rules/spelling/hunspell/CompoundAwareHunspellRule.java:61:"spelling_global.txt"
languagetool-core/tagging/BaseTagger.java:40:"/added.txt"
languagetool-core/tagging/BaseTagger.java:41:"/added_custom.txt"
languagetool-core/tagging/BaseTagger.java:42:"/removed.txt"
languagetool-core/tagging/BaseTagger.java:43:"/removed_custom.txt"
languagetool-core/tagging/disambiguation/rules/XmlRuleDisambiguator.java:43:"disambiguation.xml"
languagetool-core/tagging/disambiguation/rules/XmlRuleDisambiguator.java:44:"disambiguation-global.xml"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:64:".dic"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:521:".dic"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:523:".aff"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:524:".dic"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:603:".aff"
languagetool-core/rules/spelling/hunspell/HunspellRule.java:606:".aff"
languagetool-core/tagging/disambiguation/rules/DisambiguationRuleLoader.java:48:"jdk.xml.maxGeneralEntitySizeLimit"
languagetool-core/tagging/disambiguation/rules/DisambiguationRuleLoader.java:49:"jdk.xml.totalEntitySizeLimit"
languagetool-core/tagging/disambiguation/rules/DisambiguationRuleLoader.java:50:"jdk.xml.entityExpansionLimit"
languagetool-core/tools/Tools.java:122:"/bitext.xml"
languagetool-core/tools/Tools.java:135:"/false-friends.xml"
```

### D.languagetool-commandline
```
```

### D.languagetool-server
```
languagetool-server/server/DatabaseAccessOpenSource.java:63:"org/languagetool/server/mybatis-config.xml"
```

### D.languagetool-language-modules_de
```
languagetool-language-modules/de/language/GermanyGerman.java:79:"/de/de-DE-AT/grammar.xml"
languagetool-language-modules/de/synthesis/GermanSynthesizer.java:51:"de/de.sor"
languagetool-language-modules/de/synthesis/GermanSynthesizer.java:51:"/de/german_synth.dict"
languagetool-language-modules/de/synthesis/GermanSynthesizer.java:51:"/de/german_tags.txt"
languagetool-language-modules/de/language/AustrianGerman.java:73:"/de/de-DE-AT/grammar.xml"
languagetool-language-modules/de/language/NonSwissGerman.java:45:"/de/de-DE-AT/grammar.xml"
languagetool-language-modules/de/rules/de/WordCoherencyRule.java:37:"/de/coherency.txt"
languagetool-language-modules/de/rules/de/GermanWrongWordInContextRule.java:52:"/de/wrongWordInContext.txt"
languagetool-language-modules/de/rules/de/GermanCompoundRule.java:119:"/de/compounds.txt"
languagetool-language-modules/de/rules/de/GermanCompoundRule.java:119:"/de/compound-cities.txt"
languagetool-language-modules/de/rules/de/SwissCompoundRule.java:52:"/de/compounds.txt"
languagetool-language-modules/de/rules/de/SwissCompoundRule.java:52:"/de/compound-cities.txt"
languagetool-language-modules/de/rules/de/SimpleReplaceRule.java:45:"/de/replace.txt"
languagetool-language-modules/de/rules/de/SimpleReplaceRule.java:45:"/de/replace_custom.txt"
languagetool-language-modules/de/rules/de/CompoundCheckFilter.java:20:"/de/addedCompound.txt"
languagetool-language-modules/de/rules/de/OldSpellingRule.java:38:"/de/alt_neu.csv"
languagetool-language-modules/de/rules/de/CaseRuleExceptions.java:37:"/de/eigennamen_gross.txt"
languagetool-language-modules/de/rules/de/CaseRuleExceptions.java:38:"/de/case_rule_exceptions.txt"
languagetool-language-modules/de/rules/de/UpperCaseNgramRule.java:50:"/de/ambiguous_case.txt"
languagetool-language-modules/de/rules/de/SwissGermanSpellerRule.java:36:"de/hunspell/spelling-de-CH.txt"
languagetool-language-modules/de/rules/de/SwissGermanSpellerRule.java:57:"/de/hunspell/spelling-de-CH.txt"
languagetool-language-modules/de/rules/de/GermanMultitokenSpeller.java:32:"/de/multitoken-suggest.txt"
languagetool-language-modules/de/rules/de/GermanMultitokenSpeller.java:32:"/spelling_global.txt"
languagetool-language-modules/de/rules/de/GermanMultitokenSpeller.java:32:"de/hunspell/spelling.txt"
languagetool-language-modules/de/rules/de/GermanRepeatedWordsRule.java:38:"/de/synonyms.txt"
languagetool-language-modules/de/rules/de/AustrianGermanSpellerRule.java:36:"de/hunspell/spelling-de-AT.txt"
languagetool-language-modules/de/rules/de/AustrianGermanSpellerRule.java:57:"/de/hunspell/spelling-de-AT.txt"
languagetool-language-modules/de/rules/de/ProhibitedCompoundRule.java:209:"/de/confusion_sets.txt"
languagetool-language-modules/de/rules/de/ProhibitedCompoundRule.java:388:"/de/compound_exceptions.txt"
languagetool-language-modules/de/tagging/disambiguation/rules/de/GermanRuleDisambiguator.java:38:"/de/multitoken-ignore.txt"
languagetool-language-modules/de/tagging/disambiguation/rules/de/GermanRuleDisambiguator.java:41:"/de/multitoken-suggest.txt"
languagetool-language-modules/de/tagging/disambiguation/rules/de/GermanRuleDisambiguator.java:44:"/spelling_global.txt"
languagetool-language-modules/de/rules/de/MorfologikGermanyGermanSpellerRule.java:38:"/de/hunspell/de_DE.dict"
languagetool-language-modules/de/rules/de/GermanStyleRepeatedWordRule.java:118:"/de/hunspell/de_DE.dict"
languagetool-language-modules/de/rules/de/CompoundInfinitivRule.java:350:"/de/hunspell/de_DE.dict"
languagetool-language-modules/de/tagging/de/GermanTagger.java:51:"https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/de/src/main/resources/org/languagetool/resource/de/tagset.txt"
languagetool-language-modules/de/tagging/de/GermanTagger.java:124:"/de/german.dict"
languagetool-language-modules/de/tagging/de/GermanTagger.java:133:"de/hunspell/spelling.txt"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1789:"/de/words_infix_s.txt"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1790:"/de/verb_stems.txt"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1791:"/de/verb_prefixes.txt"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1792:"/de/other_prefixes.txt"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1793:"/de/alt_neu.csv"
languagetool-language-modules/de/rules/de/GermanSpellerRule.java:1991:"/hunspell/spelling_recommendation.txt"
```

### D.languagetool-language-modules_en
```
languagetool-language-modules/en/synthesis/en/EnglishSynthesizer.java:49:"/en/english_synth.dict"
languagetool-language-modules/en/synthesis/en/EnglishSynthesizer.java:50:"/en/english_tags.txt"
languagetool-language-modules/en/synthesis/en/EnglishSynthesizer.java:51:"/en/en.sor"
languagetool-language-modules/en/language/AmericanEnglish.java:72:"/en/en-US/replace.txt"
languagetool-language-modules/en/rules/en/EnglishMultitokenSpeller.java:32:"/en/multiwords.txt"
languagetool-language-modules/en/rules/en/EnglishMultitokenSpeller.java:32:"/spelling_global.txt"
languagetool-language-modules/en/rules/en/EnglishMultitokenSpeller.java:32:"/en/hyphenated_words.txt"
languagetool-language-modules/en/rules/en/EnglishForGermansFalseFriendRule.java:50:"confusion_sets_l2_de.txt"
languagetool-language-modules/en/rules/en/WordCoherencyRule.java:35:"/en/coherency.txt"
languagetool-language-modules/en/rules/en/EnglishDiacriticsRule.java:46:"/en/diacritics.txt"
languagetool-language-modules/en/rules/en/ContractionSpellingRule.java:41:"/en/contractions.txt"
languagetool-language-modules/en/rules/en/SimpleReplaceRule.java:42:"/en/replace.txt"
languagetool-language-modules/en/rules/en/SimpleReplaceRule.java:42:"/en/replace_custom.txt"
languagetool-language-modules/en/rules/en/EnglishPlainEnglishRule.java:46:"/en/wordiness.txt"
languagetool-language-modules/en/language/BritishEnglish.java:71:"/en/en-GB/replace.txt"
languagetool-language-modules/en/tagging/en/EnglishHybridDisambiguator.java:39:"/en/multiwords.txt"
languagetool-language-modules/en/tagging/en/EnglishHybridDisambiguator.java:40:"/spelling_global.txt"
languagetool-language-modules/en/rules/en/MorfologikSouthAfricanSpellerRule.java:34:"/en/hunspell/en_ZA.dict"
languagetool-language-modules/en/rules/en/MorfologikSouthAfricanSpellerRule.java:35:"en/hunspell/spelling_en-ZA.txt"
languagetool-language-modules/en/rules/en/MorfologikSouthAfricanSpellerRule.java:36:"en/en-US-GB.txt"
languagetool-language-modules/en/rules/en/FindSuggestionsFilter.java:33:"/en/english.dict"
languagetool-language-modules/en/language/NewZealandEnglish.java:60:"/en/en-NZ/replace.txt"
languagetool-language-modules/en/rules/en/EnglishRepeatedWordsRule.java:198:"/en/synonyms.txt"
languagetool-language-modules/en/rules/en/MorfologikCanadianSpellerRule.java:34:"/en/hunspell/en_CA.dict"
languagetool-language-modules/en/rules/en/MorfologikCanadianSpellerRule.java:35:"en/hunspell/spelling_en-CA.txt"
languagetool-language-modules/en/rules/en/MorfologikCanadianSpellerRule.java:36:"en/en-US-GB.txt"
languagetool-language-modules/en/rules/en/EnglishDashRule.java:66:"/en/compounds.txt"
languagetool-language-modules/en/rules/en/EnglishForFrenchFalseFriendRule.java:50:"confusion_sets_l2_fr.txt"
languagetool-language-modules/en/rules/en/MorfologikAustralianSpellerRule.java:34:"/en/hunspell/en_AU.dict"
languagetool-language-modules/en/rules/en/MorfologikAustralianSpellerRule.java:35:"en/hunspell/spelling_en-AU.txt"
languagetool-language-modules/en/rules/en/MorfologikAustralianSpellerRule.java:36:"en/en-US-GB.txt"
languagetool-language-modules/en/rules/en/EnglishForSpaniardsFalseFriendRule.java:50:"confusion_sets_l2_es.txt"
languagetool-language-modules/en/rules/en/MorfologikBritishSpellerRule.java:36:"/en/hunspell/en_GB.dict"
languagetool-language-modules/en/rules/en/MorfologikBritishSpellerRule.java:37:"en/hunspell/spelling_en-GB.txt"
languagetool-language-modules/en/rules/en/MorfologikBritishSpellerRule.java:38:"en/en-US-GB.txt"
languagetool-language-modules/en/rules/en/AvsAnData.java:36:"/en/det_a.txt"
languagetool-language-modules/en/rules/en/AvsAnData.java:37:"/en/det_an.txt"
languagetool-language-modules/en/rules/en/SimpleReplaceProfanityRule.java:50:"/en/replace_profanity.txt"
languagetool-language-modules/en/rules/en/MorfologikNewZealandSpellerRule.java:34:"/en/hunspell/en_NZ.dict"
languagetool-language-modules/en/rules/en/MorfologikNewZealandSpellerRule.java:35:"en/hunspell/spelling_en-NZ.txt"
languagetool-language-modules/en/rules/en/MorfologikNewZealandSpellerRule.java:36:"en/en-US-GB.txt"
languagetool-language-modules/en/rules/en/EnglishForDutchmenFalseFriendRule.java:50:"confusion_sets_l2_nl.txt"
languagetool-language-modules/en/rules/en/EnglishSpecificCaseRule.java:34:"/en/specific_case.txt"
languagetool-language-modules/en/rules/en/MorfologikAmericanSpellerRule.java:35:"/en/hunspell/en_US.dict"
languagetool-language-modules/en/rules/en/MorfologikAmericanSpellerRule.java:36:"en/hunspell/spelling_en-US.txt"
languagetool-language-modules/en/rules/en/MorfologikAmericanSpellerRule.java:37:"en/en-US-GB.txt"
languagetool-language-modules/en/language/English.java:157:"/org/languagetool/rules/en/grammar-l2-de.xml"
languagetool-language-modules/en/language/English.java:159:"/org/languagetool/rules/en/grammar-l2-fr.xml"
languagetool-language-modules/en/rules/en/EnglishRedundancyRule.java:47:"/en/redundancies.txt"
languagetool-language-modules/en/tagging/en/EnglishTagger.java:33:"https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/en/src/main/resources/org/languagetool/resource/en/tagset.txt"
languagetool-language-modules/en/tagging/en/EnglishTagger.java:42:"/en/english.dict"
languagetool-language-modules/en/rules/en/CompoundRule.java:161:"/en/compounds.txt"
languagetool-language-modules/en/rules/en/UpperCaseNgramRule.java:556:"en/specific_case.txt"
languagetool-language-modules/en/rules/en/UpperCaseNgramRule.java:557:"spelling_global.txt"
languagetool-language-modules/en/chunking/EnglishChunker.java:45:"/en-token.bin"
languagetool-language-modules/en/chunking/EnglishChunker.java:46:"/en-pos-maxent.bin"
languagetool-language-modules/en/chunking/EnglishChunker.java:47:"/en-chunker.bin"
languagetool-language-modules/en/rules/en/AbstractEnglishSpellerRule.java:57:"/en/multiwords.txt"
languagetool-language-modules/en/rules/en/AbstractEnglishSpellerRule.java:418:".txt"
languagetool-language-modules/en/rules/en/AbstractEnglishSpellerRule.java:418:".txt"
languagetool-language-modules/en/rules/en/EnglishWrongWordInContextRule.java:52:"/en/wrongWordInContext.txt"
```

### D.languagetool-language-modules_fr
```
languagetool-language-modules/fr/synthesis/FrenchSynthesizer.java:41:"fr/fr.sor"
languagetool-language-modules/fr/synthesis/FrenchSynthesizer.java:41:"/fr/french_synth.dict"
languagetool-language-modules/fr/synthesis/FrenchSynthesizer.java:41:"/fr/french_tags.txt"
languagetool-language-modules/fr/rules/fr/FrenchRepeatedWordsRule.java:39:"/fr/synonyms.txt"
languagetool-language-modules/fr/rules/fr/CompoundRule.java:65:"/fr/compounds.txt"
languagetool-language-modules/fr/rules/fr/SimpleReplaceRule.java:43:"/fr/replace.txt"
languagetool-language-modules/fr/rules/fr/SimpleReplaceRule.java:43:"/fr/replace_custom.txt"
languagetool-language-modules/fr/rules/fr/MorfologikFrenchSpellerRule.java:43:"/fr/hunspell/spelling.txt"
languagetool-language-modules/fr/rules/fr/MorfologikFrenchSpellerRule.java:90:"/fr/french.dict"
languagetool-language-modules/fr/rules/fr/FrenchMultitokenSpeller.java:32:"/fr/multiwords.txt"
languagetool-language-modules/fr/rules/fr/FrenchMultitokenSpeller.java:32:"/spelling_global.txt"
languagetool-language-modules/fr/rules/fr/FrenchMultitokenSpeller.java:32:"/fr/hyphenated_words.txt"
languagetool-language-modules/fr/tagging/disambiguation/fr/FrenchHybridDisambiguator.java:41:"/fr/multiwords.txt"
languagetool-language-modules/fr/tagging/disambiguation/fr/FrenchHybridDisambiguator.java:43:"/spelling_global.txt"
languagetool-language-modules/fr/tagging/fr/FrenchTagger.java:59:"/fr/french.dict"
```

## Appendix E Thrown exceptions with literal messages and sendError calls (file:line text)

### E.languagetool-core
```
Premium.java:57 throw new RuntimeException("Object for class '" + className + "' could not be created", e);
Premium.java:72 throw new RuntimeException("Object for class '" + className + "' could not be created", e);
Languages.java:65 throw new RuntimeException("Please specify a dictPath that ends in '.dict' (Morfologik binary dictionary) or '.dic' (Hunspell dictionary): " + dictPath);
Languages.java:116 throw new RuntimeException("Key '" + PROPERTIES_KEY + "' not found in " + url);
Languages.java:152 throw new RuntimeException("Class '" + className + "' specified in " + url + " could not be found in classpath", e);
Languages.java:154 throw new RuntimeException("Object for class '" + className + "' specified in " + url + " could not be created", e);
Languages.java:189 throw new RuntimeException("Class '" + className + " could not be found in classpath", e);
Languages.java:191 throw new RuntimeException("Object for class '" + className + " could not be created", e);
Languages.java:239 throw new IllegalArgumentException("'" + langCode + "' is not a language code known to LanguageTool." +
Languages.java:296 throw new RuntimeException("No appropriate language found, not even en-US. Supported languages: " + get());
Languages.java:348 throw new IllegalArgumentException("'" + langCode + "' isn't a valid language code");
ResultCache.java:69 throw new IllegalArgumentException("Result cache size must be >= 0: " + maxSize);
tokenizers/SrxTools.java:60 throw new RuntimeException("Could not load SRX rules", e);
synthesis/ManualSynthesizer.java:77 throw new UnsupportedOperationException("Too many values (" + valueCount + "), the storage needs adjusting");
synthesis/ManualSynthesizer.java:114 throw new UnsupportedOperationException("Words can't start with " + SUFFIX_MARKER);
synthesis/ManualSynthesizer.java:208 throw new IOException("Unknown line format when loading manual synthesizer dictionary, " +
XMLValidator.java:70 throw new IOException("Not found in classpath: " + filename);
XMLValidator.java:76 throw new IOException("Cannot load or parse '" + filename + "'", e);
XMLValidator.java:89 throw new IOException("File not found in classpath: " + filename);
XMLValidator.java:93 throw new IOException("XML schema not found in classpath: " + xmlSchemaPath);
XMLValidator.java:97 throw new IOException("Cannot load or parse '" + filename + "'", e);
XMLValidator.java:111 throw new IOException("File not found in classpath: " + filename);
XMLValidator.java:114 throw new IOException("File not found in classpath: " + baseFilename);
XMLValidator.java:118 throw new IOException("XML schema not found in classpath: " + xmlSchemaPath);
XMLValidator.java:122 throw new IOException("Cannot load or parse '" + filename + "'", e);
XMLValidator.java:163 throw new IOException("XML schema not found in classpath: " + xmlSchemaPath);
XMLValidator.java:183 throw new RuntimeException("DTD not found in classpath: " + dtdPath);
XMLValidator.java:189 throw new IOException("No XML declaration found in '" + cleanXml.substring(0, Math.min(100, cleanXml.length())) + "...'");
languagemodel/LuceneSingleIndexLanguageModel.java:57 throw new RuntimeException("Not found or is not a directory:\n" +
languagemodel/LuceneSingleIndexLanguageModel.java:69 throw new RuntimeException("Directory must contain at least '1grams', '2grams', and '3grams': " + topIndexDir.getAbsolutePath());
languagemodel/LuceneSingleIndexLanguageModel.java:72 throw new RuntimeException("Expected at least '1grams', '2grams', and '3grams' sub directories but only got " + dirs + " in " + topIndexDir.getAbsolutePath());
languagemodel/LuceneSingleIndexLanguageModel.java:98 throw new RuntimeException("No directories '1grams' ... '3grams' found in " + topIndexDir);
languagemodel/LuceneSingleIndexLanguageModel.java:116 throw new RuntimeException("Searcher for ngram size " + ngramSize + " already exists");
languagemodel/LuceneSingleIndexLanguageModel.java:126 throw new RuntimeException("Requested " + tokens.size() + "gram but index has only up to " + maxNgram + "gram: " + tokens);
languagemodel/LuceneSingleIndexLanguageModel.java:150 throw new RuntimeException("Expected 'totalTokenCount' meta documents not found in 1grams index: " + luceneSearcher.directory);
languagemodel/LuceneSingleIndexLanguageModel.java:152 throw new RuntimeException("Did not expect more than 1000 'totalTokenCount' meta documents: " + docs.totalHits + " in " + luceneSearcher.directory);
languagemodel/LuceneSingleIndexLanguageModel.java:173 throw new RuntimeException("No " + ngramSize + "grams directory found in " + topIndexDir);
languagemodel/LuceneSingleIndexLanguageModel.java:198 throw new RuntimeException("More than 2000 matches for '" + term + "' not supported for performance reasons: " +
language/identifier/LanguageIdentifier.java:67 throw new IllegalArgumentException("maxLength must be >= 10 (but values > 100 are recommended): " + maxLength);
language/identifier/LanguageIdentifier.java:118 throw new IllegalArgumentException("preferredLanguages may only contain language codes without variants (e.g. 'en', but not 'en-US'): " + preferredLangs + ". Use 'preferredVariants' to specify
language/identifier/detector/CommonWordsDetector.java:68 throw new IOException("Common words file not found for " + lang + ": " + path);
language/identifier/detector/FastTextDetector.java:116 throw new FastTextException("FastText output is expected to start with '__label__': ''" + buffer + "'", true);
language/identifier/detector/FastTextDetector.java:119 throw new FastTextException("Error while parsing fasttext output, expected pairs of '__label_xx' and float: '" + buffer + "'", true);
rules/AbstractRepeatedWordsRule.java:212 throw new RuntimeException("Format error in file " + path + ", line: " + line);
rules/AbstractRepeatedWordsRule.java:215 throw new RuntimeException("Format error in file " + path + ", line: " + line);
rules/AbstractRepeatedWordsRule.java:222 throw new RuntimeException("Word found in more than one line. \"" + word + "\" in line: " + line);
rules/AbstractRepeatedWordsRule.java:236 throw new RuntimeException("Word found in more than one line. \"" + key + "\" in line: " + line);
rules/AbstractAdvancedSynthesizerFilter.java:74 throw new IllegalArgumentException("AdvancedSynthesizerFilter: Index out of bounds in "
rules/AbstractAdvancedSynthesizerFilter.java:90 throw new IllegalArgumentException("AdvancedSynthesizerFilter: Index out of bounds in "
rules/AbstractAdvancedSynthesizerFilter.java:111 throw new IllegalArgumentException("AdvancedSynthesizerFilter: undefined POS tag for rule " +
ShortDescriptionProvider.java:60 throw new RuntimeException("Format in " + path + " not expected, expected 2 tab-separated columns: '" + line + "'");
synthesis/BaseSynthesizer.java:158 throw new RuntimeException("Could not load dictionary", e);
synthesis/BaseSynthesizer.java:261 throw new RuntimeException("Error trying to synthesize POS tag " + posTag +
bitext/TabBitextReader.java:70 throw new RuntimeException("Unexpected format, expected two tab-separated columns: " + line);
JLanguageTool.java:364 throw new RuntimeException("Could not activate rules", e);
JLanguageTool.java:527 throw new RuntimeException("Could not get rules of language " + language, e);
JLanguageTool.java:602 throw new RuntimeException("Could not load language model capable rules.", e);
JLanguageTool.java:645 throw new IOException("Could not load remote rules.", e);
JLanguageTool.java:647 throw new IOException("Could not load remote rules configuration at " + configFile.getAbsolutePath(), e);
JLanguageTool.java:1426 throw new RuntimeException("Couldn't access remote matches cache.");
JLanguageTool.java:1617 throw new ErrorRateTooHighException("ErrorRateTooHigh is reached by a single sentence after rule: " + rule.getFullId() + ". " +
JLanguageTool.java:1737 throw new IllegalStateException("listUnknownWords is set to false, unknown words not stored");
JLanguageTool.java:2123 throw new IllegalArgumentException("Unknown mode: " + mode);
JLanguageTool.java:2150 throw new RuntimeException("Getting line/column positions failed for match " + match + " Sentence: " + match.getSentence().getText(), e);
JLanguageTool.java:2158 throw new RuntimeException("Getting positions failed for match " + match + " Sentence: " + match.getSentence().getText(), e);
JLanguageTool.java:2203 //  throw new RuntimeException("fake crash");
JLanguageTool.java:2248 throw new ErrorRateTooHighException("Text checking was stopped due to too many errors (more than " + String.format("%.0f", maxErrorsPerWordRate * 100) +
JLanguageTool.java:2260 throw new RuntimeException("Could not check sentence (language: " + language + "): <sentcontent>"
rules/GRPCPostProcessing.java:195 throw new TimeoutException("gRPC postprocessing timed out: " + e.getMessage());
AnalyzedTokenReadings.java:774 throw new NoSuchElementException("No such element: " + i + ", element count: " + anTokReadings.length);
rules/GRPCRule.java:189 throw new IllegalArgumentException("No configuration for connection given");
rules/GRPCRule.java:382 throw new RuntimeException("Missing description for rule with ID " + match.getId() + "_" + match.getSubId());
rules/GRPCRule.java:392 throw new RuntimeException("Missing message for match with ID " + subRule.getId());
rules/RuleMatchFilter.java:37 throw new RuntimeException("Method not implemented");
rules/ExampleSentence.java:35 throw new IllegalArgumentException("Example contains <marker> but lacks </marker>:" + example);
rules/ExampleSentence.java:38 throw new IllegalArgumentException("Example contains </marker> but lacks <marker>:" + example);
rules/ExampleSentence.java:41 throw new IllegalArgumentException("Example <marker> comes before </marker>:" + example);
rules/IsEnglishWordFilter.java:68 throw new RuntimeException("The number of forms and postags has to be the same in disambiguation rule with " +
rules/RuleMatch.java:168 throw new IllegalArgumentException("fromPos (" + fromPos + ") must be less than toPos (" + toPos + ")");
rules/RuleMatch.java:347 throw new RuntimeException("fromPos (" + fromPos + ") must be less than toPos (" + toPos + ")");
rules/RuleMatch.java:394 throw new RuntimeException("fromPos (" + fromPos + ") must be less than toPos (" + toPos + ") for match: <sentcontent>" + this + "</sentcontent>");
rules/RuleMatch.java:401 throw new RuntimeException("fromPos (" + fromPos + ") must be less than toPos (" + toPos + ") for match: <sentcontent>" + this + "</sentcontent>");
rules/YMDDateHelper.java:34 throw new IllegalArgumentException("Missing key 'date'");
rules/YMDDateHelper.java:38 throw new RuntimeException("Expected date in format 'yyyy-mm-dd': '" + dateString + "'");
rules/Example.java:51 throw new IllegalArgumentException("Example text must contain '<marker>...</marker>': " + example);
rules/WordCoherencyDataLoader.java:52 throw new IOException("Format error in file " + path + ", line: " + line);
rules/WordCoherencyDataLoader.java:66 throw new RuntimeException("Could not load coherency data from " + path, e);
rules/patterns/PasswordAuthenticator.java:46 throw new RuntimeException("Invalid userInfo format, expected 'user:password': " + userInfo);
rules/PartialPosTagFilter.java:57 throw new RuntimeException("Set 'no', 'regexp' and 'postag_regexp' for filter " + PartialPosTagFilter.class.getSimpleName());
rules/PartialPosTagFilter.java:81 throw new RuntimeException("Got " + matcher.groupCount() + " groups for regex '" + pattern.pattern() + "', expected 1");
rules/PartialPosTagFilter.java:84 throw new RuntimeException("Got " + matcher.groupCount() + " groups for regex '" + pattern.pattern() + "', expected 2");
rules/GenericUnpairedQuotesRule.java:53 throw new IllegalArgumentException("Different number of start and end symbols: " + startSymbols + " vs. " + endSymbols);
broker/DefaultResourceDataBroker.java:277 throw new RuntimeException("Path " + path + " not found in class path at " + completePath);
rules/AbstractSimpleReplaceRule2.java:410 throw new RuntimeException("More than one consecutive space in " + filePath + " - use a tab character as " +
rules/AbstractSimpleReplaceRule2.java:430 throw new IOException("Format error in file " + filePath + ". Expected at most 1 '=' character and at " +
rules/AbstractSimpleReplaceRule2.java:437 throw new IOException("Format error in file " + filePath
rules/AbstractSimpleReplaceRule2.java:446 throw new IOException("Format error in file " + filePath
rules/patterns/PatternRuleMatcher.java:119 throw new IOException("Error analyzing sentence: '" + sentence + "'", e);
rules/patterns/PatternRuleMatcher.java:121 throw new RuntimeException("Error analyzing sentence: '" + sentence + "' with rule " + rule.getFullId(), e);
rules/CategoryId.java:34 throw new IllegalArgumentException("Category id must not be empty: '" + id + "'");
rules/CheckPostagsInSuggestionFilter.java:48 throw new IOException("Language tagger not available in rule " + match.getRule().getFullId());
rules/CheckPostagsInSuggestionFilter.java:57 throw new IOException("Mismatch between number of tokens and number of tags in rule " + match.getRule().getFullId()
languagemodel/MultiLanguageModel.java:35 throw new IllegalArgumentException("List of language models is empty");
rules/WhitespaceCheckFilter.java:35 throw new IllegalArgumentException("Wrong position in WhitespaceCheckFilter: " + pos + ", must be 1 to " + patternTokens.length);
rules/ITSIssueType.java:46 throw new IllegalArgumentException("No IssueType found for name '" + name + "'. Valid values: " + Arrays.toString(values()));
markup/AnnotatedText.java:111 throw new IllegalArgumentException("plainTextPosition must be >= 0: " + plainTextPosition);
markup/AnnotatedText.java:131 throw new RuntimeException("Could not map " + plainTextPosition + " to original position. isToPos: " + isToPos + ", " + msg);
rules/TextLevelRule.java:68 throw new RuntimeException("Not implemented for a text-level rule");
rules/patterns/RuleFilterEvaluator.java:58 throw new RuntimeException("Invalid syntax for key/value, expected 'key:value', got: '" + arg + "'");
rules/patterns/RuleFilterEvaluator.java:65 throw new RuntimeException("Your reference number " + refNumber + " is bigger than the number of tokens: " + tokenPositions.size());
rules/patterns/RuleFilterEvaluator.java:69 throw new RuntimeException("Your reference number " + refNumber +
rules/patterns/RuleFilterEvaluator.java:73 throw new RuntimeException("Duplicate key '" + key + "'");
rules/ConfusionPair.java:40 throw new IllegalArgumentException("factor must be >= 1: " + factor);
rules/ConfusionPair.java:50 throw new IllegalArgumentException("factor must be >= 1: " + factor);
rules/patterns/RuleFilter.java:70 throw new IllegalArgumentException("Missing key '" + key + "'");
rules/patterns/RuleFilter.java:103 throw new IllegalArgumentException("RuleFilter: Index out of bounds in "
rules/patterns/RuleFilter.java:145 throw new RuntimeException("AbstractAdvancedSynthesizerFilter only works with pattern rules. " + rule.getFullId() + " is not a pattern rule");
rules/patterns/RegexRuleFilterEvaluator.java:53 throw new RuntimeException("Invalid syntax for key/value, expected 'key:value', got: '" + arg + "'");
rules/ConfusionSetLoader.java:57 throw new RuntimeException("Unexpected format: '" + line + "' - expected three semicolon-separated values: word1; word2; factor");
rules/ConfusionSetLoader.java:72 throw new RuntimeException("Order words alphabetically per line in the confusion set file: " + line + ": found " + word + " after " + prevWord);
rules/ConfusionSetLoader.java:77 throw new RuntimeException("Word appears twice in same confusion set: '" + word + "'");
rules/SimpleReplaceDataLoader.java:49 throw new RuntimeException("Could not load simple replacement data from: " + path + ". " +
rules/SimpleReplaceDataLoader.java:53 throw new RuntimeException("Could not load simple replacement data from: " + path + ". " +
rules/patterns/FalseFriendRuleLoader.java:69 throw new IOException("Could not load false friend rules from " + file, e);
rules/CompoundRuleData.java:56 throw new RuntimeException("Could not load compound data from " + path, e);
rules/CompoundRuleData.java:143 throw new IllegalArgumentException("Not a compound in file " + path + ": " + line);
rules/CompoundRuleData.java:146 throw new IllegalArgumentException("Too many compound parts in file " + path + ": " + line + ", maximum allowed: " + AbstractCompoundRule.MAX_TERMS);
rules/CompoundRuleData.java:149 throw new IllegalArgumentException("Duplicated word in file " + path + ": " + line);
rules/ScoredConfusionSet.java:43 throw new IllegalArgumentException("factor must be > 0: " + score);
rules/patterns/bitext/BitextPatternRuleHandler.java:158 throw new RuntimeException("'triggers_error' is not supported for bitext XML");
rules/ngrams/Probability.java:33 throw new RuntimeException("Probability must be >= 0: " + prob);
rules/ngrams/Probability.java:36 //  throw new RuntimeException("Probability must be 0.0 to 1.0: " + prob);
tagging/ner/NERService.java:101 throw new RuntimeException("Timeout (" + TIMEOUT_MILLIS + "ms) exhausted getting NER results", e);
tagging/ner/NERService.java:150 throw new IllegalArgumentException("fromPos must be < toPos: fromPos: " + fromPos + ", toPos: " + toPos);
language/identifier/DefaultLanguageIdentifier.java:118 throw new RuntimeException("Could not set up language identifier", e);
language/identifier/DefaultLanguageIdentifier.java:128 throw new RuntimeException("Could not start fasttext process for language identification @ " + fasttextBinary + " with model @ " + fasttextModel, e);
language/identifier/DefaultLanguageIdentifier.java:167 throw new RuntimeException("Could not load ngram data language identification from " + ngramDir, e);
rules/patterns/PatternRuleLoader.java:82 throw new IOException("Cannot load or parse input stream of '" + filename + "'", e);
rules/spelling/morfologik/MorfologikSpellerRule.java:244 throw new RuntimeException("Cannot find dictionary file " + getFileName());
rules/spelling/suggestions/SuggestionsOrdererFeatureExtractor.java:193 throw new RuntimeException("Unknown scoring method: " + score);
rules/patterns/PatternRuleHandler.java:179 throw new RuntimeException("Rule group " + ruleGroupId + " has " + MINPREVMATCHES + "=" + ruleGroupMinPrevMatches
rules/patterns/PatternRuleHandler.java:189 throw new RuntimeException("Rule group " + ruleGroupId + " has " + DISTANCETOKENS + "=" + ruleGroupDistanceTokens
rules/patterns/PatternRuleHandler.java:235 throw new RuntimeException("id is null for rule with name '" + name + "'");
rules/patterns/PatternRuleHandler.java:239 throw new RuntimeException("Rule group " + ruleGroupId + " is off by default, thus a subrule of " + id + " cannot specify 'default=...'. \033[1m Remove 'default=...' from rule group or subrule leve
rules/patterns/PatternRuleHandler.java:242 throw new RuntimeException("Rule group " + ruleGroupId + " is off by default, thus a subrule of " + id + " cannot specify 'default=...'. \033[1m Remove 'default=...' from rule group or subrule leve
rules/patterns/PatternRuleHandler.java:449 throw new IllegalStateException("'<marker>' may not be nested in rule '" + id + "'");
rules/patterns/PatternRuleHandler.java:616 throw new RuntimeException("<antipattern>s can only contain <example>s without errors (i.e. no 'correction=...'). " +
rules/patterns/PatternRuleHandler.java:794 throw new RuntimeException("<regexp> rules currently cannot be used together with <antipattern>. Rule id: " + id + "[" + subId + "]");
rules/patterns/PatternRuleHandler.java:799 throw new IllegalStateException("Neither '<pattern>' tokens nor '<regexp>' is set in rule '" + id + "'");
rules/patterns/PatternRuleHandler.java:905 throw new RuntimeException("Cannot activate rule '" + id + "', it is outside of a <category>...</category>");
rules/patterns/PatternRuleHandler.java:918 throw new RuntimeException("Could not parse URL for rule: " + rule + ": '" + url + "'", e);
rules/patterns/PatternRuleHandler.java:924 throw new RuntimeException("Could not parse URL for rule: " + rule + ": '" + urlForRuleGroup + "'", e);
rules/GenericUnpairedBracketsRule.java:64 throw new IllegalArgumentException("Different number of start and end symbols: " + startSymbols + " vs. " + endSymbols);
rules/ConfusionSet.java:41 throw new IllegalArgumentException("factor must be >= 1: " + factor);
rules/ConfusionSet.java:52 throw new IllegalArgumentException("factor must be >= 1: " + factor);
rules/patterns/XMLRuleHandler.java:425 throw new SAXException("References cannot be empty: " + "\n Line: "
rules/patterns/XMLRuleHandler.java:429 throw new SAXException("References must be larger than 0: "
rules/patterns/XMLRuleHandler.java:437 throw new SAXException("Only backward references in match elements are possible, tried to specify token "
rules/patterns/XMLRuleHandler.java:506 throw new RuntimeException("Contradicting regex contains both '?i' (case-insensitive) and \\p{Lu}/\\p{Ll} (case-sensitive): "
rules/patterns/XMLRuleHandler.java:536 throw new SAXException("You cannot set both 'chunk' and 'chunk_re' for " + id);
rules/patterns/XMLRuleHandler.java:635 throw new SAXException("Please set min and max attributes on the " +
rules/patterns/XMLRuleHandler.java:696 throw new RuntimeException("Rule " + rule.getFullId() + " of type " + rule.getClass() + " cannot have a filter (" + filterClassName + ")");
rules/patterns/bitext/BitextPatternRuleLoader.java:48 throw new IOException("Cannot load or parse '" + filename + "'", e);
rules/ngrams/ConfusionProbabilityRule.java:109 throw new IllegalArgumentException("grams must be between 1 and 5: " + grams);
rules/ngrams/ConfusionProbabilityRule.java:297 throw new RuntimeException("Confusion set must be of size 2: " + confusionSet);
rules/ngrams/ConfusionProbabilityRule.java:309 throw new RuntimeException("No alternative found for: " + token);
rules/ngrams/ConfusionProbabilityRule.java:318 throw new RuntimeException("Not found in set '" + confusionSet + "': " + token);
rules/ngrams/ConfusionProbabilityRule.java:332 throw new RuntimeException("Only 3grams and 4grams are supported");
rules/AbstractUnitConversionRule.java:150 throw new RuntimeException("Unknown message type: " + message);
rules/AbstractUnitConversionRule.java:168 throw new RuntimeException("Unknown message type: " + message);
rules/patterns/Unifier.java:107 throw new RuntimeException("isSatisfied called without features being set");
rules/patterns/Unifier.java:124 throw new IllegalStateException("Unification feature '" + feat.getKey() + "' is not defined in this unifier. " +
rules/RemoteRuleMetrics.java:42 throw new IllegalStateException("RemoteRuleMetrics should only be used via static methods.");
rules/spelling/hunspell/Hunspell.java:158 throw new RuntimeException("Failed to convert resource URL to file path", e);
rules/spelling/hunspell/Hunspell.java:165 throw new RuntimeException("Could not find the dictionary for language \"" + language + "\" in the classpath");
rules/spelling/hunspell/Hunspell.java:176 throw new RuntimeException("Could not create temporary dictionaries for language \"" + language + "\"", e);
rules/patterns/ApostropheTypeFilter.java:46 throw new IllegalArgumentException("ApostropheTypeFilter: Index out of bounds in "
rules/RemoteRule.java:91 throw new IllegalArgumentException("suppressMisspelledMatch must be a valid regex", e);
rules/RemoteRule.java:100 throw new IllegalArgumentException("suppressMisspelledSuggestions must be a valid regex", e);
tagging/disambiguation/rules/XmlRuleDisambiguator.java:60 throw new RuntimeException("Problems with loading disambiguation file: " + disambiguationFile, e);
tagging/disambiguation/rules/XmlRuleDisambiguator.java:67 throw new RuntimeException("Problems with loading global disambiguation file: " + GLOBAL_DISAMBIGUATION_FILE, e);
rules/patterns/PatternTokenBuilder.java:85 throw new IllegalArgumentException("minOccurrence must be >= 0: " + minOccurrence);
rules/patterns/PatternTokenBuilder.java:163 throw new IllegalArgumentException("minOccurrence must <= maxOccurrence: minOccurrence " + minOccurrence + ", maxOccurrence " + maxOccurrence);
rules/patterns/RuleFilterCreator.java:49 throw new RuntimeException("Constructor of filter class '"
rules/patterns/RuleFilterCreator.java:55 throw new RuntimeException("Constructor of filter class '" + className + "' must not have arguments: " + constructor);
rules/patterns/RuleFilterCreator.java:61 throw new RuntimeException("Filter class '" + className + "' must implement interface " + RuleFilter.class.getSimpleName());
rules/patterns/RuleFilterCreator.java:64 throw new RuntimeException("Could not create filter class using constructor " + constructor, e);
rules/patterns/RuleFilterCreator.java:68 throw new RuntimeException("Could not find filter class: '"
tagging/BaseTagger.java:162 throw new RuntimeException("Could not load manual tagger data from " + getManualAdditionsFileNames(), e);
rules/spelling/morfologik/MorfologikSpeller.java:83 throw new RuntimeException("maxEditDistance must be > 0: " + maxEditDistance);
rules/patterns/FalseFriendRuleHandler.java:106 throw new RuntimeException("Translation language (" + currentTranslationLanguage + ") must not be the same as pattern language (" + language + ") for rule " + id);
rules/patterns/FalseFriendRuleHandler.java:120 throw new RuntimeException("'triggers_error' is not supported for false friend XML");
rules/patterns/PatternRuleXmlCreator.java:76 throw new RuntimeException("Could not turn rule '" + ruleId + "' for language " + language + " into a string", e);
rules/patterns/PatternRuleXmlCreator.java:79 throw new RuntimeException("Could not find rule '" + ruleId + "' for language " + language + " in files: " + filenames);
rules/patterns/RegexAntiPatternFilter.java:41 throw new RuntimeException("Missing 'antiPatterns:' in 'args' in <filter> of rule " + match.getRule().getFullId());
tagging/disambiguation/rules/DisambiguationRuleHandler.java:269 throw new IllegalStateException("'<marker>' may not be nested in rule '" + id + "'");
tagging/disambiguation/rules/DisambiguationRuleHandler.java:282 throw new SAXException("Only backward references in match elements are possible, tried to specify token "
rules/patterns/RegexRuleFilterCreator.java:39 throw new RuntimeException("Constructor of filter class '"
rules/patterns/RegexRuleFilterCreator.java:45 throw new RuntimeException("Constructor of filter class '" + className + "' must not have arguments: " + constructor);
rules/patterns/RegexRuleFilterCreator.java:51 throw new RuntimeException("Filter class '" + className + "' must implement interface " + RegexRuleFilter.class.getSimpleName());
rules/patterns/RegexRuleFilterCreator.java:54 throw new RuntimeException("Could not create filter class using constructor " + constructor, e);
rules/patterns/RegexRuleFilterCreator.java:57 throw new RuntimeException("Could not find filter class: '"
rules/spelling/SymSpellRule.java:109 throw new RuntimeException("Could not read resource " + resource, e);
rules/spelling/SymSpellRule.java:251 throw new RuntimeException("not implemented");
rules/patterns/PatternToken.java:404 throw new IllegalArgumentException("'skip' should be between -1 and " + Byte.MAX_VALUE);
rules/patterns/PatternToken.java:415 throw new IllegalArgumentException("minOccurrences must be 0 or 1: " + i);
rules/patterns/PatternToken.java:426 throw new IllegalArgumentException("maxOccurrences may not be 0");
rules/patterns/PatternToken.java:429 throw new IllegalArgumentException("maxOccurrences should be between -1 and " + Byte.MAX_VALUE + " but was: " + i);
rules/patterns/PatternToken.java:496 throw new IllegalStateException("Could not clone element", e);
rules/spelling/VagueSpellChecker.java:66 throw new RuntimeException("Unknown rule type for language " + lang.getShortCodeWithCountryAndVariant() + ": " + rule);
rules/spelling/VagueSpellChecker.java:81 throw new RuntimeException("No spelling rule found for language " + lang.getShortCodeWithCountryAndVariant() +
rules/spelling/VagueSpellChecker.java:105 throw new RuntimeException("not implemented");
rules/spelling/multitoken/MultitokenSpeller.java:82 throw new RuntimeException("Error generating suggestions for: " + normalizedWord, e.getCause());
rules/spelling/symspell/implementation/EditDistance.java:57 throw new IllegalArgumentException("unknown DistanceAlgorithm");
rules/spelling/morfologik/MorfologikMultiSpeller.java:209 throw new IllegalStateException("No user / dict caching / dict name configured: "
rules/spelling/morfologik/MorfologikMultiSpeller.java:418 throw new RuntimeException("Error generating suggestions for: " + word, e.getCause());
rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.java:179 throw new IllegalArgumentException("Unknown operation: " + operation);
rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.java:252 throw new NullPointerException("s1 must not be null");
rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.java:256 throw new NullPointerException("s2 must not be null");
rules/spelling/hunspell/DumontsHunspellDictionary.java:52 throw new RuntimeException("Could not create hunspell instance. Please note that LanguageTool supports only 64-bit platforms " +
rules/spelling/hunspell/DumontsHunspellDictionary.java:60 throw new RuntimeException("Attempt to use hunspell instance after closing");
rules/spelling/hunspell/DumontsHunspellDictionary.java:68 throw new RuntimeException("Attempt to use hunspell instance after closing");
rules/spelling/hunspell/DumontsHunspellDictionary.java:76 throw new RuntimeException("Attempt to use hunspell instance after closing");
tools/StringTools.java:747 throw new RuntimeException("Could not load data from " + path, e);
rules/spelling/symspell/implementation/SymSpell.java:321 throw new IllegalArgumentException("Dist to big: " + maxEditDistance);
rules/spelling/symspell/implementation/SymSpell.java:508 throw new IllegalArgumentException("Dist to big " + maxEditDistance);
chunking/ChunkTag.java:40 throw new IllegalArgumentException("chunkTag cannot be null or empty: '" + chunkTag + "'");
tagging/disambiguation/MultiWordChunker2.java:110 throw new RuntimeException("Invalid format in " + filename + ": '" + posToken + "', expected two tab-separated parts");
tagging/ManualTagger.java:69 throw new UnsupportedOperationException("Too many values (" + valueCount + "), the storage needs adjusting");
tagging/ManualTagger.java:105 throw new RuntimeException("Non-breaking space found in line #" + lineCount + ": '" + line + "', please remove it");
tagging/ManualTagger.java:110 throw new IOException("Unknown line format in line " + lineCount + " when loading manual tagger dictionary, " +
tools/Tools.java:177 throw new RuntimeException("Unknown constructor type for rule class " + class1.getName()
tools/Tools.java:182 throw new RuntimeException("Failed to load bitext rules", e);
tools/Tools.java:269 throw new IOException("Could not load file from classpath: '" + path + "'");
tools/Tools.java:285 throw new IOException("Checksum mismatch for the file '" + path + "': expected " + requiredHash + ", got " + computedHash);
tagging/MorfologikTagger.java:96 throw new RuntimeException("Could not tag word '" + word + "'", e);
chunking/TokenPredicate.java:47 throw new RuntimeException("Could not parse expression: " + getDescription());
chunking/TokenPredicate.java:97 throw new RuntimeException("Expression type not supported: '" + exprType + "'");
tagging/disambiguation/rules/DisambiguationPatternRule.java:76 throw new NullPointerException("disambiguated POS cannot be null with posSelect == null and " + disambAction);
```

### E.languagetool-commandline
```
commandline/CommandLineParser.java:61 throw new IllegalArgumentException("Unknown level '" + level + "' - currently, only 'PICKY' is supported");
commandline/CommandLineParser.java:66 throw new IllegalArgumentException("You cannot list unknown words when tagging only");
commandline/CommandLineParser.java:69 throw new IllegalArgumentException("You cannot apply suggestions when tagging only");
commandline/CommandLineParser.java:77 throw new IllegalArgumentException("You cannot specify both disabled rules and enabledonly");
commandline/CommandLineParser.java:82 throw new IllegalArgumentException("You cannot specify both disabled rules and enabledonly");
commandline/CommandLineParser.java:132 throw new IllegalArgumentException("You cannot list unknown words when tagging only");
commandline/CommandLineParser.java:139 throw new IllegalArgumentException("JSON output format makes no sense for automatic application of suggestions");
commandline/CommandLineParser.java:142 throw new IllegalArgumentException("JSON output format is not implemented for \"line by line\" analysis");
commandline/CommandLineParser.java:145 throw new IllegalArgumentException("JSON output format is not implemented for Bitext");
commandline/CommandLineParser.java:148 throw new IllegalArgumentException("You cannot list unknown words in JSON output format");
commandline/CommandLineParser.java:153 throw new IllegalArgumentException("You cannot apply suggestions when tagging only");
commandline/CommandLineParser.java:156 throw new IllegalArgumentException("JSON output format makes no sense for automatic application of suggestions");
commandline/CommandLineParser.java:161 throw new IllegalArgumentException("JSON output format makes no sense for profiling");
commandline/CommandLineParser.java:164 throw new IllegalArgumentException("Applying suggestions makes no sense for profiling");
commandline/CommandLineParser.java:167 throw new IllegalArgumentException("Tagging makes no sense for profiling");
commandline/CommandLineParser.java:174 throw new UnknownParameterException("Unknown parameter: " + args[i]);
commandline/CommandLineParser.java:233 throw new IllegalArgumentException("Missing argument to " + option + " command line option.");
commandline/Main.java:213 throw new IllegalArgumentException("Profiling mode cannot be used with input from STDIN");
commandline/Main.java:329 throw new RuntimeException("Could not check text in file " + file, e);
commandline/Main.java:362 throw new RuntimeException("Could not create LanguageTool instance for language " + language, e);
commandline/Main.java:434 throw new RuntimeException("No rules are active. Please make sure your rule ids " +
commandline/Main.java:455 throw new IllegalArgumentException("You have to set the source language (as mother tongue) in bitext mode");
```

### E.languagetool-server
```
server/RequestLimiter.java:179 throw new TooManyRequestsException("User request limit of " + maxRequests + " per day exceeded. Try again after midnight UTC.");
server/RequestLimiter.java:209 throw new TooManyRequestsException("Whitelist request limit of " + whitelistLimit + " requests per " +
server/RequestLimiter.java:219 throw new TooManyRequestsException("Client request limit of " + requestLimit + " requests per " +
server/RequestLimiter.java:223 throw new TooManyRequestsException("IP request limit of " + ipRequestLimit + " requests per " +
server/RequestLimiter.java:229 throw new TooManyRequestsException("Client request size limit of " + requestLimitInBytes + " bytes per " +
server/RequestLimiter.java:234 throw new TooManyRequestsException("IP request size limit of " + ipRequestLimitInBytes + " bytes per " +
server/RequestLimiter.java:240 throw new TooManyRequestsException("Client request size limit of " + requestLimitInBytes + " bytes per " +
server/RequestLimiter.java:245 throw new TooManyRequestsException("IP request size limit of " + ipRequestLimitInBytes + " bytes per " +
server/HTTPSServer.java:101 throw new RuntimeException("Could not set up SSL context", e);
server/HTTPSServer.java:149 throw new RuntimeException("Could not start LanguageTool HTTPS server on " + HTTPServerConfig.DEFAULT_HOST + ", port " + config.getPort(), e);
server/ResultExtender.java:96 throw new RuntimeException("not implemented");
server/ConfidenceMapLoader.java:43 throw new RuntimeException("The 'ruleIdToConfidenceFile' parameter must contain '{lang}' as a placeholder for the language code");
server/ConfidenceMapLoader.java:64 throw new RuntimeException("Invalid confidence float value in " + fileName + ", expected 'RULE_ID,float_value[,...]': " + line);
server/ConfidenceMapLoader.java:67 throw new RuntimeException("Invalid line in " + fileName + ", expected 'RULE_ID,float_value[,...]': " + line);
server/ConfidenceMapLoader.java:73 throw new RuntimeException("No confidence values could be loaded for " + filePattern +
server/LanguageToolHttpHandler.java:162 sendError(httpExchange, HttpURLConnection.HTTP_FORBIDDEN, errorMessage);
server/LanguageToolHttpHandler.java:184 sendError(httpExchange, code, errorMessage);
server/LanguageToolHttpHandler.java:199 sendError(httpExchange, code, errorMessage);
server/LanguageToolHttpHandler.java:215 throw new BadRequestException("You're using an old version of our API that's not supported anymore. Please see " + API_DOC_URL);
server/LanguageToolHttpHandler.java:217 throw new BadRequestException("Missing arguments for LanguageTool API. Please see " + API_DOC_URL);
server/LanguageToolHttpHandler.java:219 throw new BadRequestException("You have '/v2/' in your path, but not at the root. Try an URL like 'http://server/v2/...' ");
server/LanguageToolHttpHandler.java:221 sendError(httpExchange, HttpURLConnection.HTTP_NOT_FOUND, "Not found");
server/LanguageToolHttpHandler.java:223 throw new BadRequestException("This is the LanguageTool API. You have not specified any parameters. Please see " + API_DOC_URL);
server/LanguageToolHttpHandler.java:227 sendError(httpExchange, HttpURLConnection.HTTP_FORBIDDEN, errorMessage);
server/LanguageToolHttpHandler.java:271 sendError(httpExchange, errorCode, "Error: " + response);
server/LanguageToolHttpHandler.java:325 sendError(httpExchange, HTTP_UNAVAILABLE, "Error: " + response);
server/LanguageToolHttpHandler.java:333 sendError(httpExchange, HTTP_UNAVAILABLE, "Error: " + response);
server/LanguageToolHttpHandler.java:433 private void sendError(HttpExchange httpExchange, int httpReturnCode, String response) throws IOException {
server/LanguageToolHttpHandler.java:468 throw new TextTooLongException("Your text's length exceeds this server's hard limit of " + generousMaxLength + " characters.");
server/LanguageToolHttpHandler.java:496 throw new BadRequestException("Could not decode query. Query length: " + query.length() +
server/HTTPSServerConfig.java:83 throw new IllegalConfigurationException("Parameter --config must be set and point to a property file");
server/HTTPSServerConfig.java:93 throw new RuntimeException("Could not load properties from '" + config + "'", e);
server/HTTPServer.java:147 throw new IOException("No free port in range ("+ minPort + " - " + maxPort + ") found.");
server/HTTPServer.java:149 throw new IOException("Invalid port configuration found. " +
server/HTTPServer.java:184 throw new RuntimeException("Could not start LanguageTool HTTP server on " + DEFAULT_HOST + ", port " + config.getPort(), e);
server/DatabaseAccessOpenSource.java:206 throw new IllegalArgumentException("username must be set");
server/DatabaseAccessOpenSource.java:209 throw new IllegalArgumentException("apiKey must be set");
server/DatabaseAccessOpenSource.java:212 throw new AuthException("This is the endpoint for the basic version of LanguageTool. " +
server/DatabaseAccessOpenSource.java:229 throw new IllegalArgumentException("No user found for given username '" + username + "' and given api key");
server/DatabaseAccessOpenSource.java:234 throw new IllegalStateException("Could not fetch given user '" + username + "' from cache", e);
server/DatabaseAccessOpenSource.java:323 throw new BadRequestException("Invalid word, cannot be empty or whitespace only");
server/DatabaseAccessOpenSource.java:326 throw new BadRequestException("Invalid word, you can only add words that don't contain spaces: '" + word + "'");
server/LocalAbTestService.java:46 throw new RuntimeException("Object for class '" + className + "' could not be created", e);
server/DatabaseAccess.java:79 throw new IllegalStateException("DatabaseAccess.init() has not been called yet or failed");
server/HTTPTestTools.java:86 throw new RuntimeException("Could not connect to " + url, e);
server/PipelinePool.java:227 throw new RuntimeException("config.getRulesConfigFile() is null");
server/ServerTools.java:145 throw new BadRequestException("apiKey AND password was set, set only apiKey");
server/ServerTools.java:157 throw new BadRequestException("With 'username' set, you also need to specify 'apiKey'");
server/ServerTools.java:161 throw new BadRequestException("apiKey was set, but username was not: " + params.get("apiKey"));
server/ServerTools.java:164 throw new BadRequestException("password was set, but username was not");
server/ServerTools.java:188 throw new BadRequestException("Mode must be one of 'textLevelOnly', 'allButTextLevelOnly', or 'all' but was: '" + modeParam + "'");
server/ServerTools.java:232 throw new BadRequestException("Unknown value '" + param + "' for parameter 'level'. Valid values: " +
server/TextChecker.java:265 throw new BadRequestException(e.getMessage());
server/TextChecker.java:286 throw new RuntimeException("SHA-256 not supported", e);
server/TextChecker.java:324 throw new RuntimeException("Error while prewarming pipeline", e);
server/TextChecker.java:405 throw new AuthException("Anonymous access is prohibited on this server, please provide authentication.");
server/TextChecker.java:414 throw new TextTooLongException("Your text exceeds the limit of " + limits.getMaxTextLength() +
server/TextChecker.java:474 throw new BadRequestException("You can specify 'noopLanguages' only when also using 'language=auto'");
server/TextChecker.java:540 throw new BadRequestException("You specified altLanguage '" + langCode + "', but for this language you need to specify a variant, e.g. 'en-GB' instead of just 'en'");
server/TextChecker.java:563 throw new BadRequestException("You cannot specify disabled rules or categories using enabledOnly=true");
server/TextChecker.java:567 throw new BadRequestException("You must specify enabled rules or categories when using enabledOnly=true");
server/TextChecker.java:630 throw new UnavailableException("Server overloaded, please try again later", e);
server/TextChecker.java:886 throw new BadRequestException("Missing 'text' or 'data' parameter");
server/TextChecker.java:905 throw new BadRequestException("'sourceLanguage' parameter missing - must be set when 'sourceText' is set");
server/TextChecker.java:1017 throw new BadRequestException("Invalid format for 'preferredVariants', expected a dash as in 'en-GB': '" + preferredVariant + "'");
server/TextChecker.java:1023 throw new BadRequestException("Invalid 'preferredVariants', no such language/variant found: '" + preferredVariant + "'");
server/TextChecker.java:1090 throw new BadRequestException("'callback' value must match [a-zA-Z]+: '" + callback + "'");
server/BasicAuthentication.java:32 throw new AuthException("Expected Basic Authentication");
server/BasicAuthentication.java:40 throw new AuthException("Expected Basic Authentication");
server/ApiV2.java:105 throw new PathNotFoundException("Unsupported action: '" + path + "'. Please see " + API_DOC_URL);
server/ApiV2.java:127 throw new BadRequestException("'language' parameter missing");
server/ApiV2.java:148 throw new BadRequestException("Set only 'text' or 'data' parameter, not both");
server/ApiV2.java:157 throw new BadRequestException("Could not parse JSON from 'data' parameter", e);
server/ApiV2.java:160 throw new BadRequestException("'data' key in JSON requires either 'text' or 'annotation' key, not both");
server/ApiV2.java:166 throw new BadRequestException("'data' key in JSON requires 'text' or 'annotation' key");
server/ApiV2.java:169 throw new BadRequestException("Missing 'text' or 'data' parameter");
server/ApiV2.java:196 throw new IllegalArgumentException("Use parameter 'dicts', not 'dict' in GET /words API method.");
server/ApiV2.java:267 throw new BadRequestException("'lang' parameter missing");
server/ApiV2.java:270 throw new BadRequestException("'ruleId' parameter missing");
server/ApiV2.java:285 throw new PathNotFoundException("Rule '" + params.get("ruleId") + "' not found for language " + lang +
server/ApiV2.java:360 throw new AuthException("Expected Basic Authentication");
server/ApiV2.java:366 throw new IllegalArgumentException("Unknown authMethod: " + authParameter);
server/ApiV2.java:395 throw new IllegalStateException("Could not fetch user information");
server/ApiV2.java:402 throw new BadRequestException(url + " needs to be called with GET");
server/ApiV2.java:408 throw new BadRequestException(url + " needs to be called with POST");
server/ApiV2.java:416 throw new BadRequestException("This end point needs a user id");
server/ApiV2.java:484 throw new BadRequestException("Only either 'text' or 'markup' are supported in an object in 'annotation' list, not both: " + node);
server/ApiV2.java:486 throw new BadRequestException("'text' cannot be used with 'interpretAs' (only 'markup' can): " + node);
server/ApiV2.java:496 throw new BadRequestException("Only 'text' and 'markup' are supported in 'annotation' list: " + node);
server/V2TextChecker.java:98 throw new BadRequestException("Missing 'language' parameter, e.g. 'language=en-US' for American English or 'language=fr' for French");
server/V2TextChecker.java:101 throw new BadRequestException("You specified 'enabled' but the parameter is now called 'enabledRules' in v2 of the API");
server/V2TextChecker.java:104 throw new BadRequestException("You specified 'disabled' but the parameter is now called 'disabledRules' in v2 of the API");
server/V2TextChecker.java:107 throw new BadRequestException("You specified 'preferredvariants' but the parameter is now called 'preferredVariants' (uppercase 'V') in v2 of the API");
server/V2TextChecker.java:110 throw new BadRequestException("You specified 'autodetect' but automatic language detection is now activated with 'language=auto' in v2 of the API");
server/V2TextChecker.java:138 throw new BadRequestException("You specified 'preferredVariants' but you didn't specify 'language=auto'");
server/HTTPServerConfig.java:267 throw new IllegalArgumentException("Cannot use --premiumAlways with non-premium version");
server/HTTPServerConfig.java:296 throw new IllegalArgumentException("Missing argument for '--logIpMatchingPattern' (e.g. any random String)");
server/HTTPServerConfig.java:299 throw new IllegalArgumentException("Missing argument for '--logIpMatchingPattern' (e.g. any random String)");
server/HTTPServerConfig.java:343 throw new IllegalArgumentException("maxWorkQueueSize must be >= 0: " + maxWorkQueueSize);
server/HTTPServerConfig.java:364 throw new IllegalArgumentException("Invalid value for maxCheckThreads, must be >= 1: " + maxCheckThreads);
server/HTTPServerConfig.java:369 throw new IllegalArgumentException("Invalid value for maxTextCheckerThreads, must be >= 1: " + maxTextCheckerThreads);
server/HTTPServerConfig.java:373 throw new IllegalArgumentException("Invalid value for textCheckerQueueSize, must be >= 1: " + textCheckerQueueSize);
server/HTTPServerConfig.java:378 throw new IllegalArgumentException("The AfterTheDeadline mode is not supported anymore in LanguageTool 3.8 or later");
server/HTTPServerConfig.java:384 throw new RuntimeException("Rules Configuration file cannot be found: " + rulesConfigFile);
server/HTTPServerConfig.java:391 throw new RuntimeException("Remote rules configuration file cannot be found: " + remoteRulesConfigFile);
server/HTTPServerConfig.java:396 throw new IllegalArgumentException("Invalid value for cacheSize: " + cacheSize + ", use 0 to deactivate cache");
server/HTTPServerConfig.java:399 throw new IllegalArgumentException("Use of cacheTTLSeconds without also setting cacheSize has no effect.");
server/HTTPServerConfig.java:417 throw new IllegalArgumentException("Cannot use premiumOnly=true with non-premium version");
server/HTTPServerConfig.java:462 throw new IllegalArgumentException("dbLogging can only be true if dbDriver, dbUrl, dbUsername, and dbPassword are all set");
server/HTTPServerConfig.java:489 throw new IllegalArgumentException("beolingusFile not found: " + beolingusFile);
server/HTTPServerConfig.java:516 throw new IllegalArgumentException("ngramLangIdentData does not exist or is a directory (needs to be a ZIP file): " + ngramLangIdentData);
server/HTTPServerConfig.java:522 throw new RuntimeException("Could not load properties from '" + file + "'", e);
server/HTTPServerConfig.java:532 throw new IllegalArgumentException("code is supposed to be a 2 (or rarely 3) character code (unless it uses a format with variant, like xx-YY): '" + code + "'");
server/HTTPServerConfig.java:543 throw new IllegalArgumentException("dictionary file does not exist or is not a file: '" + dictPath + "'");
server/HTTPServerConfig.java:549 throw new IllegalArgumentException("Common words path not found: '" + lang.getCommonWordsPath() + "'");
server/HTTPServerConfig.java:561 throw new RuntimeException("LanguageModel directory not found or is not a directory: " + languageModelDir);
server/HTTPServerConfig.java:569 throw new RuntimeException("Fasttext model path not valid (file doesn't exist or is a directory): " + fasttextModelPath);
server/HTTPServerConfig.java:572 throw new RuntimeException("Fasttext binary path not valid (file doesn't exist, is a directory or not executable): " + fasttextBinaryPath);
server/HTTPServerConfig.java:635 throw new IllegalArgumentException("Could not parse provided serverURL: '" + url + "'", e);
server/HTTPServerConfig.java:1395 throw new IllegalConfigurationException("Property '" + propertyName + "' must be set in " + config);
```

### E.languagetool-language-modules_de
```
language/GermanyGerman.java:93 throw new RuntimeException("GermanyGerman(Premium) language expected, got " + language);
rules/de/CaseRuleExceptions.java:71 throw new IllegalArgumentException("Invalid line in " + path + ", starts or ends with whitespace: '" + line + "'");
rules/de/LineExpander.java:51 throw new IllegalArgumentException("Unexpected line format, expected at most one '_': " + line);
rules/de/LineExpander.java:54 throw new IllegalArgumentException("Unexpected line format, '_' cannot be combined with '/': " + line);
rules/de/LineExpander.java:71 throw new RuntimeException("Could not expand '" + parts[1] + "' from line '" + line + "', no forms found");
rules/de/LineExpander.java:107 throw new IllegalArgumentException("Unexpected line format, expected at most one slash: " + line);
rules/de/LineExpander.java:148 throw new IllegalArgumentException("Unknown suffix: " + suffix + " in line: " + line);
rules/de/CaseRule.java:1347 throw new RuntimeException("Could not lookup '" + word + "'.", e);
rules/de/UpperCaseNgramRule.java:57 throw new RuntimeException("Only entries with uppercase first chars expected in " + path + ": " + line);
language/German.java:726 throw new RuntimeException("You should not obtain the German language instance. Use getInstance method of derived language class instead. Or maybe subclass did not implement the getInstance method.");
rules/de/YMDDateCheckFilter.java:39 throw new RuntimeException("Set only 'weekDay' and 'date' for " + YMDDateCheckFilter.class.getSimpleName());
rules/de/GermanStyleRepeatedWordRule.java:125 throw new IllegalStateException("LinguServices or Speller must be not null to check spelling in CompoundInfinitivRule");
rules/de/UppercaseNounReadingFilter.java:46 throw new RuntimeException("Set 'token' for filter " + UppercaseNounReadingFilter.class.getName() + " in rule " + match.getRule().getId());
rules/de/CompoundCheckFilter.java:45 throw new RuntimeException("Format error in file " + path + ", line: "
rules/de/CompoundInfinitivRule.java:260 throw new IllegalStateException("LinguServices or Speller must be not null to check spelling in CompoundInfinitivRule");
rules/de/SpellingData.java:57 throw new RuntimeException("Unexpected format in file " + filePath + ": " + line);
rules/de/SpellingData.java:86 throw new RuntimeException("Old and new spelling are the same in " + filePath + ": " + line);
rules/de/SpellingData.java:90 throw new RuntimeException("Contradictory entry in " + filePath + ": '" + oldSpelling + "' suggests '" + lookup + "' and vice versa");
rules/de/SpellingData.java:93 throw new RuntimeException("Duplicate key in " + filePath + ": " + oldSpelling + ", val: " + coherencyMap.get(oldSpelling) + " vs. " + newSpelling);
chunking/GermanChunker.java:375 throw new RuntimeException("Could not apply chunk regexp '" + regex + "' to tokens: " + tokens, e);
rules/de/YMDNewYearDateFilter.java:40 throw new RuntimeException("Set only 'weekDay' and 'date' for " + YMDDateCheckFilter.class.getSimpleName());
rules/de/UnitConversionRule.java:118 throw new RuntimeException("Unknown message type: " + message);
rules/de/UnitConversionRule.java:134 throw new RuntimeException("Unknown message type: " + message);
rules/de/ProhibitedCompoundRule.java:226 throw new IllegalArgumentException("Use all-lowercase word in " + ProhibitedCompoundRule.class + ": " + lcPair.part1);
rules/de/ProhibitedCompoundRule.java:229 throw new IllegalArgumentException("Use all-lowercase word in " + ProhibitedCompoundRule.class + ": " + lcPair.part2);
rules/de/ProhibitedCompoundRule.java:247 throw new RuntimeException("Got confusion set with != 2 items: " + cSet);
rules/de/DateFilterHelper.java:46 throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
rules/de/DateFilterHelper.java:69 throw new RuntimeException("Could not find month '" + monthStr + "'");
rules/de/AdaptSuggestionFilter.java:149 throw new RuntimeException("Unexpected POS tag: " + newDetPos);
rules/de/SubjectVerbAgreementRule.java:681 throw new RuntimeException("No singular found for '" + token + "'");
rules/de/SubjectVerbAgreementRule.java:690 throw new RuntimeException("No plural found for '" + token + "'");
tagging/de/GermanTagger.java:138 throw new RuntimeException("Use '/P' or '/A', but not both for a word in " + filename + ": " + line);
rules/de/GermanSpellerRule.java:1803 throw new RuntimeException("Syntax '/{X}' for expansion not supported in this file: '" + line + "' in " + fileInClasspath);
rules/de/GermanSpellerRule.java:1806 throw new RuntimeException("Syntax '_in' not supported in this file: '" + line + "' in " + fileInClasspath);
rules/de/GermanSpellerRule.java:2016 throw new RuntimeException("Could not set up morfologik spell checker", e);
```

### E.languagetool-language-modules_en
```
language/BritishEnglish.java:46 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/BritishEnglish.java:114 throw new RuntimeException("BritishEnglish language expected, got " + language);
language/CanadianEnglish.java:45 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/CanadianEnglish.java:91 throw new RuntimeException("CanadianEnglish language expected, got " + language);
rules/en/NoDisambiguationEnglishPartialPosTagFilter.java:45 throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
rules/en/YMDNewYearDateFilter.java:39 throw new RuntimeException("Set only 'weekDay' and 'date' for " + YMDDateCheckFilter.class.getSimpleName());
rules/en/YMDDateCheckFilter.java:39 throw new RuntimeException("Set only 'weekDay' and 'date' for " + YMDDateCheckFilter.class.getSimpleName());
chunking/EnglishChunker.java:73 throw new RuntimeException("Could not initialize English chunker", e);
chunking/EnglishChunker.java:91 throw new RuntimeException("Length of results must be the same: " + tokens.length + ", " + posTags.length + ", " + chunkTags.length);
rules/en/AbstractEnglishSpellerRule.java:388 throw new IllegalArgumentException("Only column 0 and 1 are supported: " + column);
rules/en/AbstractEnglishSpellerRule.java:399 throw new RuntimeException("Unexpected format in " + path + ": " + line + " - expected two parts delimited by ';'");
rules/en/translation/BeoLingusTranslator.java:94 throw new IOException("Invalid line format (DE item count != EN item count): " + line);
rules/en/translation/BeoLingusTranslator.java:183 throw new RuntimeException("Not supported: " + fromLang + " -> " + toLang);
rules/en/translation/BeoLingusTranslator.java:220 throw new RuntimeException("Could not tag '" + term + "'", e);
language/AmericanEnglish.java:48 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/AmericanEnglish.java:98 throw new RuntimeException("AmericanEnglish language expected, got " + language);
rules/en/EnglishPartialPosTagFilter.java:52 throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
rules/en/DateFilterHelper.java:45 throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
rules/en/DateFilterHelper.java:67 throw new RuntimeException("Could not find month '" + monthStr + "'");
chunking/EnglishChunkFilter.java:53 throw new IllegalStateException("Unknown chunk type: " + chunkType);
```

### E.languagetool-language-modules_fr
```
language/CanadianFrench.java:32 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/French.java:84 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/French.java:599 throw new RuntimeException("French(Premium) language expected, got " + language);
language/SwissFrench.java:32 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
language/BelgianFrench.java:32 throw new RuntimeException("Language was already instantiated, see the cause stacktrace below.", trace);
rules/fr/DateFilterHelper.java:43 throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
rules/fr/DateFilterHelper.java:71 throw new RuntimeException("Could not find month '" + monthStr + "'");
rules/fr/FrenchPartialPosTagFilter.java:49 throw new RuntimeException("Could not tag and disambiguate '" + token + "'", e);
rules/fr/WordWithDeterminerFilter.java:64 throw new IllegalArgumentException("WordWithDeterminerFilter: Index out of bounds in "
rules/fr/WordWithDeterminerFilter.java:69 throw new IllegalArgumentException("WordWithDeterminerFilter: Index out of bounds in "
rules/fr/WordWithDeterminerFilter.java:73 throw new IllegalArgumentException("WordWithDeterminerFilter: undefined parameters wordFrom or determinerFrom in "
rules/fr/DMYDateCheckFilter.java:36 throw new RuntimeException("Set only 'weekDay' and 'date' for " + DMYDateCheckFilter.class.getSimpleName());
rules/fr/DMYDateCheckFilter.java:41 throw new RuntimeException("Expected date in format 'dd-mm-yyyy': '" + dateString + "'");
rules/fr/InterrogativeVerbFilter.java:68 throw new IllegalArgumentException("ConfusionCheckFilter: Index out of bounds in " + match.getRule().getFullId()
rules/fr/GrammalecteRule.java:653 throw new RuntimeException("No 'data' found in grammalecte JSON: " + map);  // handled in match()
rules/fr/GrammalecteRule.java:712 throw new RuntimeException("Not implemented");
```

## Appendix F System properties and environment variables
```
XMLValidator.java:49: System.setProperty("jdk.xml.totalEntitySizeLimit", "10000000");
XMLValidator.java:50: System.setProperty("jdk.xml.entityExpansionLimit", "10000000");
rules/patterns/PatternRuleMatcher.java:56: private static final boolean monitorRules = System.getProperty("monitorActiveRules") != null;
rules/patterns/PatternRuleMatcher.java:72: //String slowMatchThresholdStr = System.getProperty("slowMatchThreshold");
rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.java:36: String enableMLSuggestionsOrderingProperty = System.getProperty(PROP_NAME, "false");
rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.java:41: System.setProperty(PROP_NAME, String.valueOf(MLSuggestionsOrderingEnabled));
tools/JnaTools.java:37: System.setProperty("jna.nosys", "true");
rules/spelling/hunspell/HunspellRule.java:75: private static final boolean monitorRules = System.getProperty("monitorActiveRules") != null;
rules/spelling/hunspell/HunspellRule.java:596: File tempDir = new File(System.getProperty("java.io.tmpdir"));
server/Server.java:179: if ("root".equals(System.getProperty("user.name"))) {
server/HTTPServer.java:102: if (System.getProperty("monitorActiveRules") != null) {
server/TextChecker.java:137: String onlyUsersEnv = System.getenv("LT_TEST_ONLY_USERS");
server/TextChecker.java:147: String onlyRulesEnv = System.getenv("LT_TEST_ONLY_RULES");
server/TextChecker.java:157: String onlyLanguagesEnv = System.getenv("LT_TEST_ONLY_LANGUAGES");
server/TextChecker.java:167: String onlyClientsEnv = System.getenv("LT_TEST_ONLY_CLIENTS");
server/HTTPTestTools.java:53: String defaultPort = System.getProperty("lt.default.port");
server/HTTPTestTools.java:95: String keepAlive = System.getProperty("http.keepAlive");
server/HTTPTestTools.java:97: System.setProperty("http.keepAlive", "false"); // without this, there's an overhead of about 1 second - not sure why
server/HTTPTestTools.java:110: System.setProperty("http.keepAlive", keepAlive);
```
