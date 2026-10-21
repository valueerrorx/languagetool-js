// Java: org.languagetool.server.TextChecker (+ V2TextChecker; /v2/check flow). Checks run on the text checker pool (check workers, see worker/CheckBackend.js).
import { createHash } from 'node:crypto';
import '../lang/register.js';
import { Languages } from '../core/Languages.js';
import { CategoryId } from '../core/rules/model/Category.js';
import { ToneTag } from '../core/rules/model/Tag.js';
import { UserConfig } from '../core/rules/model/UserConfig.js';
import { DetectedLanguage } from '../core/rules/model/DetectedLanguage.js';
import { RuleMatchesAsJsonSerializer } from '../core/RuleMatchesAsJsonSerializer.js';
import { LanguageIdentifierService } from '../core/language/identifier/LanguageIdentifierService.js';
import { IllegalArgumentException, IOException, RuntimeException, ExecutionException, OutOfMemoryError, RejectedExecutionException, TimeoutException, isThrowable } from '../lib/java/errors.js';
import { readFileSync, existsSync } from 'node:fs';
import { Integer } from '../lib/java/int.js';
import { arrayGet } from '../lib/java/arrays.js';
import { RuleOption } from '../core/rules/model/RuleOption.js';
import { Rule } from '../core/rules/model/Rule.js';
import { RuleMatch } from '../core/rules/model/RuleMatch.js';
import { CheckResults } from '../core/rules/model/CheckResults.js';
import { Mode } from '../core/JLanguageTool.js';
import { DatabaseAccess } from './DatabaseAccess.js';
import { ConfidenceMapLoader } from './ConfidenceMapLoader.js';
import { javaSplit, isEmpty } from '../lib/java/strings.js';
import { notPortedYet } from '../core/language/components.js';
import { BadRequestException } from './BadRequestException.js';
import { QueryParams } from './QueryParams.js';
export { QueryParams };
import { AuthException, TextTooLongException, TooManyRequestsException, UnavailableException } from './exceptions.js';
import { RequestLimiter } from './RequestLimiter.js';
import { detectLanguageOfString } from './detectLanguageOfString.js';
import { getAuthHeader, getLevel, getMode, getUserLimits, setCommonHeaders, cleanUserTextFromMessage } from './ServerTools.js';
import { CheckExecutor } from './CheckExecutor.js';
import { InlineBackend, WorkerBackend } from './worker/CheckBackend.js';
import {
  annotatedTextToDto, languageToDto, queryParamsToDto, userConfigToDto,
} from './worker/transport.js';
import { LtThreadPoolFactory } from '../core/tools/LtThreadPoolFactory.js';
import { Language } from '../core/Language.js';
import { formatFixed } from '../lib/java/Formatter.js';
import { ErrorRateTooHighException } from '../core/check/ErrorRateTooHighException.js';

export const CONTEXT_SIZE = 40; // characters
const JSON_CONTENT_TYPE = 'application/json';
const COMMA_WHITESPACE = ',\\s*';

const envList = (name) => {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return [];
  return v.split(',').map((s) => s.trim()).filter((s) => s !== '');
};
// Java: TextChecker static initialiser (LT_TEST_ONLY_* environment variables)
const onlyTestUsers = envList('LT_TEST_ONLY_USERS');
const onlyTestRules = envList('LT_TEST_ONLY_RULES');
const onlyTestLanguages = envList('LT_TEST_ONLY_LANGUAGES');
const onlyTestClients = envList('LT_TEST_ONLY_CLIENTS');

// Java: ExceptionUtils#getRootCause(Throwable) (null when there is no cause)
export function getRootCause(e) {
  let cur = e;
  let cause = isThrowable(cur) ? cur.getCause() : null;
  if (cause === null || cause === undefined) return null;
  while (cause !== null && cause !== undefined) {
    cur = cause;
    cause = isThrowable(cur) ? cur.getCause() : null;
  }
  return cur;
}

// Java: Premium#isPremiumStatusCheck(AnnotatedText)
function isPremiumStatusCheck(text) {
  return text.getOriginalText() === 'The languagetool testrule 8634756.' || text.getOriginalText() === 'languagetool testrule 8634756';
}

// Java: TextChecker#checkText(...) anonymous Rule "PREMIUM_FAKE_RULE"
class PremiumFakeRule extends Rule {
  getId() { return 'PREMIUM_FAKE_RULE'; }
  getDescription() { return 'PREMIUM_FAKE_RULE'; }
  match() { return RuleMatch.EMPTY_ARRAY; }
}

// Java: TextChecker#computeTextSessionID(String,String) (first 8 bytes of SHA-256 as signed long)
export function computeTextSessionID(textSessionIdParam, ip) {
  const input = textSessionIdParam !== undefined && textSessionIdParam !== null ? textSessionIdParam : ip;
  if (input === null || input === undefined) return null;
  const bytes = createHash('sha256').update(Buffer.from(input, 'utf8')).digest();
  return bytes.readBigInt64BE(0);
}

// Java: LocalAbTestService#getActiveAbTestForClient(Map,HTTPServerConfig)
function getActiveAbTestForClient(params, config) {
  let abTest = null;
  const agent = params.has('useragent') ? params.get('useragent') : 'unknown';
  const paramActivatedAbTest = params.get('abtest');
  const abTestClients = config.abTestClients;
  if (paramActivatedAbTest !== undefined && abTestClients !== null && abTestClients.matcher(agent).matches()) {
    const tmpAb = [];
    for (const abParam of javaSplit(paramActivatedAbTest.trim(), ',')) {
      if (config.abTest.includes(abParam)) tmpAb.push(abParam.trim());
    }
    if (tmpAb.length > 0) abTest = tmpAb;
  }
  return abTest;
}

export class TextChecker {
  static FQCN = 'org.languagetool.server.TextChecker';

  languageCheckCounts = new Map();

  // Java: TextChecker#TextChecker(HTTPServerConfig,boolean,Queue,RequestCounter)
  constructor(config, internalServer, workQueue, reqCounter) {
    this.config = config;
    this.workQueue = workQueue;
    this.reqCounter = reqCounter;
    if (config.isLocalApiMode()) {
      this.languageIdentifier = LanguageIdentifierService.INSTANCE.getSimpleLanguageIdentifier(config.preferredLanguages);
    } else {
      this.languageIdentifier = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(
        0, config.getNgramLangIdentData(), config.getFasttextBinary(), config.getFasttextModel());
    }
    this.executorService = LtThreadPoolFactory.createFixedThreadPoolExecutor(
      LtThreadPoolFactory.TEXT_CHECKER_POOL,
      config.getMaxTextCheckerThreads(), config.getMaxTextCheckerThreads(),
      config.getTextCheckerQueueSize(),
      60, false, () => {
        // log.error("Thread: " + thread.getName() + " failed with: " + throwable.getMessage()) (F71)
      },
      false);
    // Java: RemoteRuleConfig.parse(fis).size(); an unreadable/invalid file is only logged (IOException), configured remote rules are DEV-001
    let remoteRuleCount = 0;
    if (config.getRemoteRulesConfigFile() !== null) {
      try {
        const parsed = JSON.parse(readFileSync(config.getRemoteRulesConfigFile().toString(), 'utf8'));
        remoteRuleCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch { /* log.error("Couldn't read RemoteRule configuration", e) (F71) */ }
    }
    if (remoteRuleCount > 0) {
      throw notPortedYet('TextChecker remote rules (DEV-001)');
    }
    // JS: the cache, the pipeline pool and prewarming live in the check workers (LTJS_CHECK_BACKEND=inline: in this thread)
    if ((process.env.LTJS_CHECK_BACKEND ?? 'worker') === 'inline') {
      this.localExecutor = new CheckExecutor(config, internalServer);
      this.backend = new InlineBackend(this.localExecutor);
    } else {
      this.localExecutor = null;
      this.backend = new WorkerBackend(config, config.getMaxTextCheckerThreads());
    }
    this.prewarmDone = Promise.resolve();
    if (config.isPipelinePrewarmingEnabled()) {
      // log.info("Prewarming pipelines...") (F71)
      this.prewarmDone = this.backend.prewarm(config.preferredLanguages);
      this.prewarmDone.catch(() => { });
    }
    if (config.abTest !== null) UserConfig.enableABTests();
  }

  // Java: TextChecker#pipelinePool (package-private field, replaced by mocks in tests); only available with the inline backend
  get pipelinePool() {
    return this.localExecutor !== null ? this.localExecutor.pipelinePool : null;
  }

  set pipelinePool(pool) {
    this.localExecutor.pipelinePool = pool;
  }

  // Java: TextChecker#cache; only available with the inline backend
  get cache() {
    return this.localExecutor !== null ? this.localExecutor.cache : null;
  }

  // Java: TextChecker#parseLanguage(String)
  static parseLanguage(code) {
    try {
      return Languages.getLanguageForShortCode(code);
    } catch (e) {
      if (e instanceof IllegalArgumentException) throw new BadRequestException(e.getMessage());
      throw e;
    }
  }

  // Java: TextChecker#shutdownNow()
  shutdownNow() {
    this.executorService.shutdownNow();
    this.backend.shutdown();
  }

  // Java: TextChecker#shouldRunRestrictedRulesTest(Map,String,Language,List)
  shouldRunRestrictedRulesTest(params, agent, lang, abTest) {
    const username = params.has('username') ? params.get('username') : '';
    return (onlyTestUsers.includes(username) || (abTest !== null && abTest.includes('only')))
      && onlyTestLanguages.includes(lang.getShortCodeWithCountryAndVariant())
      && onlyTestClients.includes(agent);
  }

  // Java: TextChecker#isOptInThirdPartyAI(UserLimits,Map,HTTPServerConfig)
  isOptInThirdPartyAI(limits, params, config) {
    if (limits.getAccount() !== null) return limits.getAccount().isOpt_in_3rd_party_ai_grammar_checker();
    if (params.has('optInThirdPartyAI')) return params.get('optInThirdPartyAI') === 'true';
    return config.defaultThirdPartyAI;
  }

  // Java: TextChecker#checkText(AnnotatedText,HttpExchange,Map,ErrorRequestLimiter,String)
  async checkText(aText, httpExchange, params, errorRequestLimiter, remoteAddress) { // errorRequestLimiter: only used for timeouts (worker pool step)
    const config = this.config;
    this.checkParams(params);
    const authHeader = getAuthHeader(httpExchange.getRequestHeaders());
    const limits = getUserLimits(params, config, authHeader);

    if (isPremiumStatusCheck(aText)) { // Java: Premium.isPremiumStatusCheck(AnnotatedText)
      const premiumStatusCheckLang = Languages.getLanguageForShortCode('en-US');
      const matches = [];
      if (limits.hasPremium() || config.premiumAlways) {
        matches.push(new RuleMatch(new PremiumFakeRule(), null, 0, 1, ''));
      }
      const detectedLanguage = new DetectedLanguage(premiumStatusCheckLang, premiumStatusCheckLang, 0.99999076, 'ngram');
      const compactMode = Integer.parseInt(params.has('c') ? params.get('c') : '0');
      const response = this.getResponse(aText, premiumStatusCheckLang, detectedLanguage, premiumStatusCheckLang,
        [new CheckResults(matches, [])], [], null, compactMode, !limits.hasPremium(), Mode.ALL);
      this.setHeaders(httpExchange);
      const bytes = Buffer.from(response, 'utf8');
      httpExchange.sendResponseHeaders(200, bytes.length);
      httpExchange.write(bytes);
      return;
    }

    const agent = params.get('useragent') !== undefined ? params.get('useragent') : '-';

    if (!config.isAnonymousAccessAllowed() && limits.getPremiumUid() === null) {
      throw new AuthException('Anonymous access is prohibited on this server, please provide authentication.');
    }

    const length = aText.getPlainText().length;
    if (length > limits.getMaxTextLength()) {
      throw new TextTooLongException(`Your text exceeds the limit of ${limits.getMaxTextLength()} characters (it's ${length} characters). Please submit a shorter text.`);
    }
    // static because we can't rely on errorRequestLimiter, null when timeoutRequestLimit option not set
    if (!config.isLocalApiMode()) {
      try {
        RequestLimiter.checkUserLimit(httpExchange.getRequestHeaders().getFirst('Referer'), httpExchange.getRequestHeaders().getFirst('User-Agent'), limits);
      } catch (e) {
        if (!(e instanceof TooManyRequestsException)) throw e;
        const response = `Error: Access denied: ${e.getMessage()}`;
        const bytes = Buffer.from(response, 'utf8');
        httpExchange.sendResponseHeaders(403, bytes.length);
        httpExchange.write(bytes);
        // log.warn("Blocked request from uid:" ...) (F71)
        return;
      }
    }
    let dictGroups = null;
    let dictName = 'default';
    if (params.has('dicts')) {
      dictGroups = javaSplit(params.get('dicts'), ',');
      dictGroups.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      dictName = `groups_${dictGroups.join(',')}`;
    }
    // Java: TextChecker#getUserDictWords(UserLimits,List) / DatabaseAccess#getWords: empty without database
    const dictWords = limits.getPremiumUid() !== null ? DatabaseAccess.getInstance().getWords(limits, dictGroups, 0, Integer.MAX_VALUE) : [];

    const filterDictionaryMatches = (params.has('filterDictionaryMatches') ? params.get('filterDictionaryMatches') : 'true') === 'true';

    const textSessionId = computeTextSessionID(params.get('textSessionId'), remoteAddress);

    const abTest = getActiveAbTestForClient(params, config);

    let enableHiddenRules = params.get('enableHiddenRules') === 'true';
    if (limits.hasPremium()) enableHiddenRules = false;

    const autoDetectLanguage = this.getLanguageAutoDetect(params);
    const preferredVariants = this.getPreferredVariants(params);
    if (params.get('noopLanguages') !== undefined && !autoDetectLanguage) {
      throw new BadRequestException("You can specify 'noopLanguages' only when also using 'language=auto'");
    }
    const noopLangs = params.get('noopLanguages') !== undefined ? javaSplit(params.get('noopLanguages'), ',') : [];
    const preferredLangs = params.get('preferredLanguages') !== undefined ? javaSplit(params.get('preferredLanguages'), ',') : [];
    const detLang = this.getLanguage(aText.getPlainText(), params, preferredVariants, noopLangs, preferredLangs,
      (params.has('ld') ? params.get('ld') : 'control').toLowerCase() === 'test');
    const lang = detLang.getGivenLanguage();

    const userRules = limits.getPremiumUid() !== null && DatabaseAccess.isReady() ? DatabaseAccess.getInstance().getRules(limits, lang, dictGroups) : [];
    const ltAgent = params.has('useragent') ? params.get('useragent') : 'unknown';
    const trustedSourcesPattern = config.getTrustedSources();
    const trustedSource = trustedSourcesPattern === null || (limits.hasPremium() || trustedSourcesPattern.matcher(ltAgent).matches());
    const optInThirdPartyAI = this.isOptInThirdPartyAI(limits, params, config);

    // set default value for tokenType
    let tokenType = authHeader === null ? UserConfig.TokenType.NO_TOKEN : UserConfig.TokenType.INVALID_TOKEN;
    const jwtContent = limits.getJwtContent();
    if (jwtContent !== null && jwtContent.isValid()) {
      tokenType = jwtContent.isPremium() ? UserConfig.TokenType.TRIAL_TOKEN : UserConfig.TokenType.TEST_TOKEN;
    }
    const userConfig = new UserConfig(dictWords, userRules, this.getRuleValues(params), config.maxSpellingSuggestions,
      limits.getPremiumUid(), dictName, limits.getDictCacheSize(), null, filterDictionaryMatches, abTest, textSessionId,
      !limits.hasPremium() && enableHiddenRules, preferredLangs, trustedSource, optInThirdPartyAI, limits.hasPremium(), tokenType);

    const key = lang.getShortCodeWithCountryAndVariant();
    const count = (this.languageCheckCounts.get(key) ?? 0) + 1;
    const motherTongueParam = params.get('motherTongue');
    const motherTongue = motherTongueParam !== undefined ? TextChecker.parseLanguage(motherTongueParam) : null;
    let useEnabledOnly = params.get('enabledOnly') === 'yes' || params.get('enabledOnly') === 'true';
    const altLanguages = [];
    if (params.get('altLanguages') !== undefined) {
      for (const langCode of javaSplit(params.get('altLanguages'), COMMA_WHITESPACE)) {
        const altLang = TextChecker.parseLanguage(langCode);
        altLanguages.push(altLang);
        if (altLang.hasVariant() && !altLang.isVariant()) {
          throw new BadRequestException(`You specified altLanguage '${langCode}', but for this language you need to specify a variant, e.g. 'en-GB' instead of just 'en'`);
        }
      }
    }
    let enabledRules = this.getEnabledRuleIds(params);
    let disabledRules = this.getDisabledRuleIds(params);
    let enabledCategories = this.getCategoryIds('enabledCategories', params);
    let disabledCategories = this.getCategoryIds('disabledCategories', params);

    if (this.shouldRunRestrictedRulesTest(params, agent, lang, abTest)) {
      useEnabledOnly = true;
      enabledRules = onlyTestRules;
      // need to clear these settings, leads to conflict with useEnabledOnly otherwise
      disabledRules = [];
      disabledCategories = [];
    }

    if ((disabledRules.length > 0 || disabledCategories.length > 0) && useEnabledOnly) {
      throw new BadRequestException('You cannot specify disabled rules or categories using enabledOnly=true');
    }
    if (enabledRules.length === 0 && enabledCategories.length === 0 && useEnabledOnly) {
      throw new BadRequestException('You must specify enabled rules or categories when using enabledOnly=true');
    }

    const enableTempOffRules = params.get('enableTempOffRules') === 'true';
    const useQuerySettings = enabledRules.length > 0 || disabledRules.length > 0
      || enabledCategories.length > 0 || disabledCategories.length > 0 || enableTempOffRules;
    const allowIncompleteResults = params.get('allowIncompleteResults') === 'true';
    const mode = getMode(params);
    const level = getLevel(params);
    const toneTagNames = params.get('toneTags') !== undefined ? javaSplit(params.get('toneTags'), ',') : null;
    const toneTags = new Set();
    if (toneTagNames !== null) {
      if (toneTagNames.length === 1 && toneTagNames[0] === '') { // &toneTags=
        toneTags.add(ToneTag.ALL_WITHOUT_GOAL_SPECIFIC);
      } else {
        for (const toneTagName of toneTagNames) {
          if (toneTagNames.length > 1 && (toneTagName === 'NO_TONE_RULE' || toneTagName === 'ALL_TONE_RULES')) continue;
          try {
            toneTags.add(ToneTag.valueOf(toneTagName));
          } catch (ex) {
            if (!(ex instanceof IllegalArgumentException)) throw ex;
            // just ignore unsupported toneTags
          }
        }
      }
    } else {
      toneTags.add(ToneTag.ALL_WITHOUT_GOAL_SPECIFIC); // No toneTags param in request
    }

    const callback = params.get('callback') ?? null;
    // allowed to log input on errors?
    const inputLogging = (params.has('inputLogging') ? params.get('inputLogging') : '') !== 'no';
    const premiumStatus = limits.hasPremium();
    const qParams = new QueryParams(altLanguages, enabledRules, disabledRules, enabledCategories, disabledCategories, useEnabledOnly,
      useQuerySettings, allowIncompleteResults, enableHiddenRules, premiumStatus, enableTempOffRules, mode, level, toneTags, callback, inputLogging);

    const requestId = httpExchange.getRequestHeaders().getFirst('X-Request-ID');
    const ruleMatchesSoFar = [];
    const payload = {
      aText: annotatedTextToDto(aText), lang: languageToDto(lang instanceof Language ? lang : null), motherTongue: languageToDto(motherTongue),
      parameters: [...params], qParams: queryParamsToDto(qParams), userConfig: userConfigToDto(userConfig),
    };
    await this.prewarmDone;
    let future;
    try {
      future = this.executorService.submit(async (thread) => {
        const job = this.backend.submit(payload, qParams.allowIncompleteResults ? (m) => ruleMatchesSoFar.push(new CheckResults([m], [])) : null);
        thread.onInterrupt = () => job.interrupt();
        try {
          return await job.promise;
        } finally {
          thread.onInterrupt = null;
        }
      });
    } catch (e) {
      if (e instanceof RejectedExecutionException) throw new UnavailableException('Server overloaded, please try again later', e);
      throw e;
    }
    let res;
    let incompleteResultReason = null;
    try {
      if (limits.getMaxCheckTimeMillis() < 0) {
        res = await future.get();
      } else {
        res = await future.get(limits.getMaxCheckTimeMillis());
      }
    } catch (e) {
      if (e instanceof ExecutionException) {
        future.cancel(true);
        if (e.jsCause !== undefined && e.jsCause !== null && e.jsCause.notPorted === true) throw e.jsCause; // JS: not-ported marker
        if (getRootCause(e) instanceof ErrorRateTooHighException && qParams.allowIncompleteResults) {
          // log.warn(e.getMessage() + " - returning " + ruleMatchesSoFar.size() + " matches found so far. Detected language: ...") (F71)
          res = [...ruleMatchesSoFar]; // threads might still be running, so make a copy
          incompleteResultReason = `Results are incomplete: ${getRootCause(e).getMessage()}`;
        } else if (e.getCause() !== null && e.getCause() instanceof OutOfMemoryError) {
          throw e.getCause();
        } else {
          throw new RuntimeException(`${cleanUserTextFromMessage(e.getMessage(), params)}, detected: ${detLang}`, e);
        }
      } else if (e instanceof TimeoutException) {
        const cancelled = future.cancel(true);
        const loadInfo = existsSync('/proc/loadavg') ? `[${readFileSync('/proc/loadavg', 'utf8').split(/\r\n|\n|\r/).filter((l, i, a) => i < a.length - 1 || l !== '').join(', ')}]` : '(unknown)';
        if (errorRequestLimiter !== null && errorRequestLimiter !== undefined) {
          errorRequestLimiter.logAccess(remoteAddress, httpExchange.getRequestHeaders(), params);
        }
        const message = `Text checking took longer than allowed maximum of ${limits.getMaxCheckTimeMillis()} milliseconds (cancelled: ${cancelled}`
          + `, lang: ${lang.getShortCodeWithCountryAndVariant()}, detected: ${detLang}, #${count}, ${length} characters of text`
          + `, mode: ${mode.toString().toLowerCase()}, h: ${this.reqCounter.getHandleCount()}, r: ${this.reqCounter.getRequestCount()}`
          + `, requestId: ${requestId}, system load: ${loadInfo})`;
        if (qParams.allowIncompleteResults) {
          // log.info(message + " - returning " + ruleMatchesSoFar.size() + " matches found so far") (F71)
          res = [...ruleMatchesSoFar]; // threads might still be running, so make a copy
          incompleteResultReason = `Results are incomplete: text checking took longer than allowed maximum of ${formatFixed(limits.getMaxCheckTimeMillis() / 1000.0, 2)} seconds`;
        } else {
          throw new RuntimeException(message, e);
        }
      } else {
        throw e;
      }
    }
    // no lazy computation at later points (outside of timeout enforcement)
    for (const checkResults of res) for (const m of checkResults.getRuleMatches()) m.discardLazySuggestedReplacements();

    this.setHeaders(httpExchange);

    // premium matches are never produced (Premium.get() is PremiumOff): no hidden matches
    const hiddenMatches = [];

    const compactMode = Integer.parseInt(params.has('c') ? params.get('c') : '0');
    let response = this.getResponse(aText, lang, detLang, motherTongue, res, hiddenMatches, incompleteResultReason, compactMode,
      limits.getPremiumUid() === null, qParams.mode);
    if (qParams.callback !== null) {
      // JSONP - still needed today for the special case of hosting your own on-premise LT without SSL
      response = `${qParams.callback}(${response});`;
    }
    const bytes = Buffer.from(response, 'utf8');
    httpExchange.sendResponseHeaders(200, bytes.length);
    httpExchange.write(bytes);
    this.languageCheckCounts.set(key, count);
  }

  // Java: TextChecker#checkerQueueAlmostFull()
  checkerQueueAlmostFull() {
    const threadPoolExecutor = this.executorService;
    const maxQueueSize = this.config.getTextCheckerQueueSize();
    const queuesize = threadPoolExecutor.getQueue().size();
    if (queuesize > Math.trunc(maxQueueSize / 2)) { // should not happen in normal cases (workQueue.size() == config.getTextCheckerQueueSize())
      // log.warn("TextChecker queue is almost full requests in queue: {} active request: {}", queuesize, threadPoolExecutor.getActiveCount()) (F71)
      return true;
    }
    return false;
  }

  // Java: TextChecker#getRuleValues(Map)
  getRuleValues(parameters) {
    const ruleValues = new Map();
    const parameterString = parameters.get('ruleValues');
    if (parameterString === undefined) return ruleValues;
    const pairs = javaSplit(parameterString, ',');
    for (const pair of pairs) {
      const ruleAndValue = javaSplit(pair, ':');
      const objects = RuleOption.stringToObjects(arrayGet(ruleAndValue, 1));
      ruleValues.set(ruleAndValue[0], objects);
    }
    return ruleValues;
  }

  // Java: TextChecker#checkParams(Map)
  checkParams(parameters) {
    if (parameters.get('text') === undefined && parameters.get('data') === undefined) {
      throw new BadRequestException("Missing 'text' or 'data' parameter");
    }
  }

  // Java: TextChecker#getCategoryIds(String,Map)
  getCategoryIds(paramName, parameters) {
    return this.getCommaSeparatedStrings(paramName, parameters).map((id) => new CategoryId(id));
  }

  // Java: TextChecker#getCommaSeparatedStrings(String,Map)
  getCommaSeparatedStrings(paramName, parameters) {
    const disabledParam = parameters.get(paramName);
    return disabledParam !== undefined ? javaSplit(disabledParam, ',') : [];
  }
}

// Java: org.languagetool.server.V2TextChecker
export class V2TextChecker extends TextChecker {
  static FQCN = 'org.languagetool.server.V2TextChecker';

  // Java: V2TextChecker#V2TextChecker(HTTPServerConfig,boolean,Queue,RequestCounter)
  constructor(config, internalServer, workQueue, reqCounter) {
    super(config, internalServer, workQueue, reqCounter);
    this.confidenceMap = null;
    try {
      if (config.getRuleIdToConfidenceFile() !== null) {
        this.confidenceMap = new ConfidenceMapLoader().load(config.getRuleIdToConfidenceFile());
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // Java: V2TextChecker#setHeaders(HttpExchange)
  setHeaders(httpExchange) {
    setCommonHeaders(httpExchange, JSON_CONTENT_TYPE, this.config.allowOriginUrl);
  }

  // Java: V2TextChecker#getResponse(AnnotatedText,Language,DetectedLanguage,Language,List,List,String,int,boolean,Mode)
  getResponse(text, usedLang, lang, motherTongue, matches, hiddenMatches, incompleteResultsReason, compactMode, showPremiumHint, mode) {
    const serializer = new RuleMatchesAsJsonSerializer(compactMode, usedLang);
    serializer.setRuleIdToConfidenceMap(this.confidenceMap);
    return serializer.ruleMatchesToJson2(matches, hiddenMatches, text, CONTEXT_SIZE, lang, incompleteResultsReason, showPremiumHint, mode);
  }

  // Java: V2TextChecker#getEnabledRuleIds(Map)
  getEnabledRuleIds(parameters) {
    const enabledParam = parameters.get('enabledRules');
    return enabledParam !== undefined ? javaSplit(enabledParam, ',') : [];
  }

  // Java: V2TextChecker#getDisabledRuleIds(Map)
  getDisabledRuleIds(parameters) {
    return this.getCommaSeparatedStrings('disabledRules', parameters);
  }

  // Java: V2TextChecker#getLanguageAutoDetect(Map)
  getLanguageAutoDetect(parameters) {
    return parameters.get('language') === 'auto';
  }

  // Java: V2TextChecker#checkParams(Map)
  checkParams(parameters) {
    super.checkParams(parameters);
    if (parameters.get('language') === undefined || isEmpty(parameters.get('language'))) {
      throw new BadRequestException("Missing 'language' parameter, e.g. 'language=en-US' for American English or 'language=fr' for French");
    }
    if (parameters.get('enabled') !== undefined) {
      throw new BadRequestException("You specified 'enabled' but the parameter is now called 'enabledRules' in v2 of the API");
    }
    if (parameters.get('disabled') !== undefined) {
      throw new BadRequestException("You specified 'disabled' but the parameter is now called 'disabledRules' in v2 of the API");
    }
    if (parameters.get('preferredvariants') !== undefined) {
      throw new BadRequestException("You specified 'preferredvariants' but the parameter is now called 'preferredVariants' (uppercase 'V') in v2 of the API");
    }
    if (parameters.get('autodetect') !== undefined) {
      throw new BadRequestException("You specified 'autodetect' but automatic language detection is now activated with 'language=auto' in v2 of the API");
    }
  }

  // Java: V2TextChecker#getLanguage(String,Map,List,List,List,boolean)
  getLanguage(text, parameters, preferredVariants, noopLangs, preferredLangs) {
    const langParam = parameters.get('language');
    const forcePreferredLanguages = parameters.get('forcePreferredLanguages') === 'true';
    const detectedLang = detectLanguageOfString(this.languageIdentifier, text, null, preferredVariants, noopLangs, preferredLangs, forcePreferredLanguages);
    let givenLang;
    if (this.getLanguageAutoDetect(parameters)) {
      givenLang = detectedLang.getDetectedLanguage();
    } else {
      givenLang = TextChecker.parseLanguage(langParam);
    }
    return new DetectedLanguage(givenLang, detectedLang.getDetectedLanguage(), detectedLang.getDetectionConfidence(), detectedLang.getDetectionSource());
  }

  // Java: V2TextChecker#getPreferredVariants(Map)
  getPreferredVariants(parameters) {
    let preferredVariants;
    if (parameters.get('preferredVariants') !== undefined) {
      preferredVariants = javaSplit(parameters.get('preferredVariants'), COMMA_WHITESPACE);
      if (parameters.get('language') !== 'auto' && (parameters.get('multilingual') === undefined || parameters.get('multilingual') === 'false')) {
        throw new BadRequestException("You specified 'preferredVariants' but you didn't specify 'language=auto'");
      }
    } else {
      preferredVariants = [];
    }
    return preferredVariants;
  }
}

