// Java: org.languagetool.server.HTTPServerConfig (command line and --config properties; DB/redis/remote keys are parsed, their features follow in later steps)
import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { ArrayIndexOutOfBoundsException, FileNotFoundException, IllegalArgumentException, RuntimeException } from '../lib/java/errors.js';
import { Integer } from '../lib/java/int.js';
import { Long } from '../lib/java/long.js';
import { Float } from '../lib/java/float.js';
import { File } from '../lib/java/io/File.js';
import { decodeLatin1, loadProperties, propertiesKeyOrder } from '../lib/java/Properties.js';
import { javaSplit, equalsIgnoreCase, javaTrim, javaReplace, javaMatches } from '../lib/java/strings.js';
import { Pattern } from '../lib/java/regex/index.js';
import { URI, URISyntaxException } from '../lib/java/net.js';
import { Languages } from '../core/Languages.js';
import { JLanguageTool } from '../core/JLanguageTool.js';
import { SuggestionsOrdererConfig } from '../core/rules/spelling/morfologik/suggestions_ordering/SuggestionsOrdererConfig.js';
import { print } from './ServerTools.js';
import { IllegalConfigurationException } from './exceptions.js';
import { GlobalConfig } from '../core/rules/model/GlobalConfig.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';
import { valueOf } from '../lib/java/Objects.js';

const logger = LoggerFactory.getLogger('org.languagetool.server.HTTPServerConfig');

// Java: File#isFile() / File#isDirectory()
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const isDirectory = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };

export const DEFAULT_HOST = 'localhost'; // Java: HTTPServerConfig.DEFAULT_HOST
export const DEFAULT_PORT = 8081; // Java: HTTPServerConfig.DEFAULT_PORT
const LANGUAGE_MODEL_OPTION = '--languageModel';

// Java: HTTPServerConfig.KNOWN_OPTION_KEYS
const KNOWN_OPTION_KEYS = ['abTest', 'abTestClients', 'abTestRollout',
  'beolingusFile', 'blockedReferrers', 'cacheSize', 'cacheTTLSeconds',
  'dbDriver', 'dbPassword', 'dbUrl', 'dbUsername', 'disabledRuleIds', 'fasttextBinary', 'fasttextModel', 'grammalectePassword',
  'grammalecteServer', 'grammalecteUser', 'ipFingerprintFactor', 'languageModel', 'maxCheckThreads', 'maxTextCheckerThreads', 'textCheckerQueueSize', 'maxCheckTimeMillis',
  'maxCheckTimeWithApiKeyMillis', 'maxErrorsPerWordRate', 'maxPipelinePoolSize', 'suggestionsEnabled', 'maxSpellingSuggestions', 'maxTextHardLength',
  'maxTextLength', 'maxTextLengthWithApiKey', 'maxWorkQueueSize', 'pipelineCaching',
  'pipelineExpireTimeInSeconds', 'pipelinePrewarming', 'prometheusMonitoring', 'prometheusPort', 'remoteRulesFile',
  'requestLimit', 'requestLimitInBytes', 'requestLimitPeriodInSeconds', 'requestLimitWhitelistUsers', 'requestLimitWhitelistLimit',
  'rulesFile', 'serverURL',
  'skipLoggingChecks', 'skipLoggingRuleMatches', 'timeoutRequestLimit', 'trustXForwardForHeader',
  'keystore', 'password', 'maxTextLengthPremium', 'maxTextLengthAnonymous', 'maxTextLengthLoggedIn', 'gracefulDatabaseFailure',
  'ngramLangIdentData',
  'dbTimeoutSeconds', 'dbMaxConnections', 'dbErrorRateThreshold', 'dbTimeoutRateThreshold', 'dbDownIntervalSeconds',
  'redisDatabase', 'redisUseSSL', 'redisTimeoutMilliseconds', 'redisConnectionTimeoutMilliseconds',
  'anonymousAccessAllowed',
  'premiumAlways', 'trustedSource',
  'redisPassword', 'redisHost', 'redisCertificate', 'redisKey', 'redisKeyPassword',
  'redisUseSentinel', 'sentinelHost', 'sentinelPort', 'sentinelPassword', 'sentinelMasterId',
  'dbLogging', 'premiumOnly', 'nerUrl', 'minPort', 'maxPort', 'localApiMode', 'motherTongue', 'preferredLanguages',
  'dictLimitUser', 'dictLimitTeam', 'styleGuideLimitUser', 'styleGuideLimitTeam',
  'passwortLoginAccessListPath', 'redisDictTTLSeconds', 'requestLimitAccessToken', 'trustedSources',
  'ruleIdToConfidenceFile', 'jwtSecret', 'externalRolloutServiceUrl', 'externalRolloutServiceApiKey'];

const parseBoolean = (s) => s !== null && s !== undefined && equalsIgnoreCase(s, 'true'); // Java: Boolean#parseBoolean / valueOf

// Java: FileInputStream#FileInputStream(File) failure text
export function openError(file) {
  const path = file.toString();
  let reason = 'No such file or directory';
  if (existsSync(path)) reason = statSync(path).isDirectory() ? 'Is a directory' : 'Permission denied';
  return new FileNotFoundException(`${path} (${reason})`);
}

export class HTTPServerConfig {
  static FQCN = 'org.languagetool.server.HTTPServerConfig';

  verbose = false;
  publicAccess = false;
  port = DEFAULT_PORT;
  minPort = 0;
  maxPort = 0;
  allowOriginUrl = null;
  logIp = true;
  logIpMatchingPattern = '__logIPNowForLanguageTool__';
  serverURL = null;
  maxTextLengthAnonymous = 2147483647;
  maxTextLengthLoggedIn = 2147483647;
  maxTextLengthPremium = 2147483647;
  maxTextHardLength = 2147483647;
  maxCheckTimeMillisAnonymous = -1;
  maxCheckTimeMillisLoggedIn = -1;
  maxCheckTimeMillisPremium = -1;
  maxCheckThreads = 10;
  maxTextCheckerThreads = 0; // default to same value as maxCheckThreads
  textCheckerQueueSize = 8;
  languageModelDir = null;
  ruleIdToConfidenceFile = null;
  pipelineCaching = false;
  pipelinePrewarming = false;
  maxPipelinePoolSize = 0;
  pipelineExpireTime = 0;
  fasttextModel = null;
  fasttextBinary = null;
  requestLimit = 0;
  requestLimitInBytes = 0;
  timeoutRequestLimit = 0;
  requestLimitPeriodInSeconds = 0;
  requestLimitWhitelistUsers = null;
  requestLimitWhitelistLimit = 0;
  ipFingerprintFactor = 1;
  trustXForwardForHeader = false;
  maxWorkQueueSize = 0;
  rulesConfigFile = null;
  remoteRulesConfigFile = null;
  cacheSize = 0;
  cacheTTLSeconds = 300;
  maxErrorsPerWordRate = 0;
  suggestionsEnabled = true;
  maxSpellingSuggestions = 0;
  blockedReferrers = [];
  trustedSources = null;
  premiumAlways = false;
  premiumOnly = false;
  requestLimitAccessToken = null;
  defaultThirdPartyAI = false;
  anonymousAccessAllowed = true;
  disabledRuleIds = [];
  stoppable = false;
  abTest = [];
  abTestClients = null;
  abTestRollout = 100;
  ngramLangIdentData = null;
  localApiMode = false;
  motherTongue = 'en-US';
  preferredLanguages = [];
  jwtSecret = null;
  externalRolloutServiceUrl = null;
  externalRolloutServiceApiKey = null;
  gracefulDatabaseFailure = false;
  dbDriver = null;
  dbUrl = null;
  dbUsername = null;
  dbPassword = null;
  dbTimeoutSeconds = 10;
  dbMaxConnections = 10;
  databaseTimeoutRateThreshold = 100;
  databaseErrorRateThreshold = 50;
  databaseDownIntervalSeconds = 10;
  dbLogging = false;
  prometheusMonitoring = false;
  prometheusPort = 9301;
  passwortLoginAccessListPath = '';
  redisHost = null;
  redisPort = 6379;
  redisDatabase = 0;
  redisUseSSL = true;
  redisCertificate = null;
  redisKey = null;
  redisKeyPassword = null;
  redisPassword = null;
  redisDictTTL = 600;
  redisTimeout = 100;
  redisConnectionTimeout = 5000;
  redisUseSentinel = false;
  sentinelHost = null;
  sentinelPort = 26379;
  sentinelPassword = null;
  sentinelMasterId = null;
  skipLoggingRuleMatches = false;
  skipLoggingChecks = false;
  slowRuleLoggingThreshold = -1;
  dictLimitUser = 0;
  dictLimitTeam = 0;
  styleGuideLimitUser = 0;
  styleGuideLimitTeam = 0;
  globalConfig = new GlobalConfig();

  // Java: HTTPServerConfig#HTTPServerConfig() / (int) / (int,boolean) / (String[])
  constructor(...a) {
    if (a.length === 1 && Array.isArray(a[0])) {
      this.#parseArgs(a[0]);
    } else if (a.length === 0) {
      this.port = DEFAULT_PORT;
    } else {
      this.port = a[0];
      this.verbose = a[1] ?? false;
    }
  }

  // Java: HTTPServerConfig#HTTPServerConfig(String[])
  #parseArgs(args) {
    for (let i = 0; i < args.length; i++) {
      if (javaMatches(args[i], '--[a-zA-Z]+=.+')) {
        process.stderr.write(`WARNING: use \`--option value\`, not \`--option=value\`, parameters will be ignored otherwise: ${args[i]}\n`);
      }
      switch (args[i]) {
        case '--config': {
          i++;
          if (i >= args.length) throw new IllegalArgumentException(`Missing value for option ${args[i - 1]}`); // DEV-020
          this.parseConfigFile(new File(args[i]), !args.includes(LANGUAGE_MODEL_OPTION));
          break;
        }
        case '-p':
        case '--port':
          i++;
          if (i >= args.length) throw new IllegalArgumentException(`Missing value for option ${args[i - 1]}`); // DEV-020
          this.port = Integer.parseInt(args[i]);
          break;
        case '-v':
        case '--verbose':
          this.verbose = true;
          break;
        case '--public':
          this.publicAccess = true;
          break;
        case '--premiumAlways':
          // Premium.isPremiumVersion() is false in this build
          throw new IllegalArgumentException('Cannot use --premiumAlways with non-premium version');
        case '--allow-origin':
          i++;
          if (i >= args.length) {
            this.allowOriginUrl = '*';
          } else {
            this.allowOriginUrl = args[i];
            if (this.allowOriginUrl.startsWith('--')) { // no parameter, next option starts instead
              this.allowOriginUrl = '*';
              i--;
            }
          }
          break;
        case LANGUAGE_MODEL_OPTION:
          i++;
          if (i >= args.length) throw new IllegalArgumentException(`Missing value for option ${args[i - 1]}`); // DEV-020
          this.setLanguageModelDirectory(args[i]);
          break;
        case '--stoppable': // internal only, doesn't need to be documented
          this.stoppable = true;
          break;
        case '--notLogIP':
          this.logIp = false;
          break;
        case '--logIpMatchingPattern':
          i++;
          if (i >= args.length) throw new IllegalArgumentException("Missing argument for '--logIpMatchingPattern' (e.g. any random String)");
          this.logIpMatchingPattern = args[i];
          if (this.logIpMatchingPattern.startsWith('--')) {
            throw new IllegalArgumentException("Missing argument for '--logIpMatchingPattern' (e.g. any random String)");
          }
          break;
        default:
          if (args[i].includes('=')) {
            process.stdout.write(`WARNING: unknown option: ${args[i]} - please note that parameters are given as '--arg param', i.e. without '=' between argument and parameter\n`);
          } else {
            process.stdout.write(`WARNING: unknown option: ${args[i]}\n`);
          }
      }
    }
  }

  // Java: HTTPServerConfig#parseConfigFile(File,boolean)
  parseConfigFile(file, loadLangModel) {
    try {
      let buf;
      try {
        buf = readFileSync(file.toString());
      } catch {
        throw openError(file);
      }
      const props = loadProperties(decodeLatin1(buf));
      const keyOrder = propertiesKeyOrder(props); // Java: props.keySet() iteration order
      const opt = (name, def) => (props.has(name) ? props.get(name) : def); // Java: getOptionalProperty
      const int = (name, def) => Integer.parseInt(opt(name, def));
      this.maxTextHardLength = int('maxTextHardLength', '2147483647');

      this.maxTextLengthAnonymous = this.maxTextLengthLoggedIn = this.maxTextLengthPremium = int('maxTextLength', '2147483647');
      this.maxTextLengthAnonymous = int('maxTextLengthAnonymous', String(this.maxTextLengthAnonymous));
      this.maxTextLengthLoggedIn = int('maxTextLengthLoggedIn', String(this.maxTextLengthLoggedIn));
      this.maxTextLengthPremium = int('maxTextLengthPremium', String(this.maxTextLengthPremium));

      this.maxCheckTimeMillisAnonymous = this.maxCheckTimeMillisLoggedIn = this.maxCheckTimeMillisPremium = int('maxCheckTimeMillis', '-1');
      this.maxCheckTimeMillisAnonymous = Number(Long.parseLong(opt('maxCheckTimeMillisAnonymous', String(this.maxCheckTimeMillisAnonymous))));
      this.maxCheckTimeMillisLoggedIn = Number(Long.parseLong(opt('maxCheckTimeMillisLoggedIn', String(this.maxCheckTimeMillisLoggedIn))));
      this.maxCheckTimeMillisPremium = Number(Long.parseLong(opt('maxCheckTimeMillisPremium', String(this.maxCheckTimeMillisPremium))));
      this.requestLimit = int('requestLimit', '0');
      this.requestLimitInBytes = int('requestLimitInBytes', '0');
      this.timeoutRequestLimit = int('timeoutRequestLimit', '0');
      this.requestLimitWhitelistUsers = javaSplit(opt('requestLimitWhitelistUsers', ''), ',\\s*');
      this.requestLimitWhitelistLimit = int('requestLimitWhitelistLimit', '0');
      this.pipelineCaching = parseBoolean(javaTrim(opt('pipelineCaching', 'false')));
      this.pipelinePrewarming = parseBoolean(javaTrim(opt('pipelinePrewarming', 'false')));
      this.maxPipelinePoolSize = int('maxPipelinePoolSize', '5');
      this.pipelineExpireTime = int('pipelineExpireTimeInSeconds', '10');
      this.requestLimitPeriodInSeconds = int('requestLimitPeriodInSeconds', '0');
      this.ipFingerprintFactor = int('ipFingerprintFactor', '1');
      this.trustXForwardForHeader = parseBoolean(javaTrim(opt('trustXForwardForHeader', 'false')));
      this.maxWorkQueueSize = int('maxWorkQueueSize', '0');
      if (this.maxWorkQueueSize < 0) {
        throw new IllegalArgumentException(`maxWorkQueueSize must be >= 0: ${this.maxWorkQueueSize}`);
      }
      this.minPort = int('minPort', '0');
      this.maxPort = int('maxPort', '0');
      const url = opt('serverURL', null);
      this.setServerURL(url);
      const ruleIdToConfidence = opt('ruleIdToConfidenceFile', null);
      if (ruleIdToConfidence !== null) {
        this.ruleIdToConfidenceFile = new File(ruleIdToConfidence);
      }
      const langModel = opt('languageModel', null);
      if (langModel !== null && loadLangModel) {
        this.setLanguageModelDirectory(langModel);
      }
      const fasttextModel = opt('fasttextModel', null);
      const fasttextBinary = opt('fasttextBinary', null);
      if (fasttextBinary !== null && fasttextModel !== null) {
        this.setFasttextPaths(fasttextModel, fasttextBinary);
      }
      this.maxCheckThreads = int('maxCheckThreads', '10');
      if (this.maxCheckThreads < 1) {
        throw new IllegalArgumentException(`Invalid value for maxCheckThreads, must be >= 1: ${this.maxCheckThreads}`);
      }
      // default value 0 = use maxCheckThreads setting (for compatibility)
      this.maxTextCheckerThreads = int('maxTextCheckerThreads', '0');
      if (this.maxTextCheckerThreads < 0) {
        throw new IllegalArgumentException(`Invalid value for maxTextCheckerThreads, must be >= 1: ${this.maxTextCheckerThreads}`);
      }
      this.textCheckerQueueSize = int('textCheckerQueueSize', '8');
      if (this.textCheckerQueueSize < 0) {
        throw new IllegalArgumentException(`Invalid value for textCheckerQueueSize, must be >= 1: ${this.textCheckerQueueSize}`);
      }

      const atdMode = equalsIgnoreCase(opt('mode', 'LanguageTool'), 'AfterTheDeadline');
      if (atdMode) {
        throw new IllegalArgumentException('The AfterTheDeadline mode is not supported anymore in LanguageTool 3.8 or later');
      }
      const rulesConfigFilePath = opt('rulesFile', null);
      if (rulesConfigFilePath !== null) {
        this.rulesConfigFile = new File(rulesConfigFilePath);
        if (!existsSync(this.rulesConfigFile.toString()) || !statSync(this.rulesConfigFile.toString()).isFile()) {
          throw new RuntimeException(`Rules Configuration file cannot be found: ${this.rulesConfigFile}`);
        }
      }
      const remoteRulesConfigFilePath = opt('remoteRulesFile', null);
      if (remoteRulesConfigFilePath !== null) {
        this.remoteRulesConfigFile = new File(remoteRulesConfigFilePath);
        if (!existsSync(this.remoteRulesConfigFile.toString()) || !statSync(this.remoteRulesConfigFile.toString()).isFile()) {
          throw new RuntimeException(`Remote rules configuration file cannot be found: ${this.remoteRulesConfigFile}`);
        }
      }
      this.cacheSize = int('cacheSize', '0');
      if (this.cacheSize < 0) {
        throw new IllegalArgumentException(`Invalid value for cacheSize: ${this.cacheSize}, use 0 to deactivate cache`);
      }
      if (props.has('cacheTTLSeconds') && !props.has('cacheSize')) {
        throw new IllegalArgumentException('Use of cacheTTLSeconds without also setting cacheSize has no effect.');
      }
      this.cacheTTLSeconds = int('cacheTTLSeconds', '300');
      this.maxErrorsPerWordRate = Float.parseFloat(opt('maxErrorsPerWordRate', '0'));
      this.suggestionsEnabled = parseBoolean(opt('suggestionsEnabled', 'true'));
      this.maxSpellingSuggestions = int('maxSpellingSuggestions', '0');
      this.blockedReferrers = javaSplit(opt('blockedReferrers', ''), ',\\s*');
      this.setTrustedSources(opt('trustedSources', null));
      const premiumAlwaysValue = props.has('premiumAlways') ? props.get('premiumAlways') : null;
      if (premiumAlwaysValue !== null) {
        this.premiumAlways = parseBoolean(javaTrim(premiumAlwaysValue));
        if (this.premiumAlways) {
          process.stdout.write('*** Running in PREMIUM-ALWAYS mode\n');
        }
      }
      this.premiumOnly = parseBoolean(javaTrim(opt('premiumOnly', 'false')));
      if (this.premiumOnly) {
        // Premium.isPremiumVersion() is false in this build
        throw new IllegalArgumentException('Cannot use premiumOnly=true with non-premium version');
      }
      this.anonymousAccessAllowed = parseBoolean(javaTrim(opt('anonymousAccessAllowed', 'true')));
      if (!this.anonymousAccessAllowed) {
        process.stdout.write('*** Running in RESTRICTED-ACCESS mode\n');
      }

      this.redisHost = opt('redisHost', null);
      this.redisPort = int('redisPort', '6379');
      this.redisDatabase = int('redisDatabase', '0');
      this.redisUseSSL = parseBoolean(javaTrim(opt('redisUseSSL', 'true')));
      this.redisPassword = opt('redisPassword', null);
      this.redisDictTTL = int('redisDictTTLSeconds', '600');
      this.redisTimeout = int('redisTimeoutMilliseconds', '100');
      this.redisConnectionTimeout = int('redisConnectionTimeoutMilliseconds', '5000');

      this.redisCertificate = opt('redisCertificate', null);
      this.redisKey = opt('redisKey', null);
      this.redisKeyPassword = opt('redisKeyPassword', null);

      this.redisUseSentinel = parseBoolean(javaTrim(opt('redisUseSentinel', 'false')));
      this.sentinelHost = opt('sentinelHost', null);
      this.sentinelPort = int('sentinelPort', '26379');
      this.sentinelPassword = opt('sentinelPassword', null);
      this.sentinelMasterId = opt('sentinelMasterId', null);

      this.gracefulDatabaseFailure = parseBoolean(javaTrim(opt('gracefulDatabaseFailure', 'false')));
      this.dbDriver = opt('dbDriver', null);
      this.dbUrl = opt('dbUrl', null);
      this.dbUsername = opt('dbUsername', null);
      this.dbPassword = opt('dbPassword', null);
      this.dbTimeoutSeconds = int('dbTimeoutSeconds', '10');
      this.dbMaxConnections = int('dbMaxConnections', '10');
      this.databaseErrorRateThreshold = int('dbErrorRateThreshold', '50');
      this.databaseTimeoutRateThreshold = int('dbTimeoutRateThreshold', '100');
      this.databaseDownIntervalSeconds = int('dbDownIntervalSeconds', '10');
      this.dbLogging = parseBoolean(javaTrim(opt('dbLogging', 'false')));
      this.passwortLoginAccessListPath = opt('passwortLoginAccessListPath', '');
      this.prometheusMonitoring = parseBoolean(javaTrim(opt('prometheusMonitoring', 'false')));
      this.prometheusPort = int('prometheusPort', '9301');
      this.skipLoggingRuleMatches = parseBoolean(javaTrim(opt('skipLoggingRuleMatches', 'false')));
      this.skipLoggingChecks = parseBoolean(javaTrim(opt('skipLoggingChecks', 'false')));
      if (this.dbLogging && (this.dbDriver === null || this.dbUrl === null || this.dbUsername === null || this.dbPassword === null)) {
        throw new IllegalArgumentException('dbLogging can only be true if dbDriver, dbUrl, dbUsername, and dbPassword are all set');
      }
      this.slowRuleLoggingThreshold = int('slowRuleLoggingThreshold', '-1');
      this.disabledRuleIds = javaSplit(opt('disabledRuleIds', ''), ',\\s*');
      this.localApiMode = parseBoolean(opt('localApiMode', 'false'));
      this.motherTongue = opt('motherTongue', 'en-US');
      const preferredLanguages = javaReplace(opt('preferredLanguages', ''), ' ', '');
      if (preferredLanguages !== '') {
        this.preferredLanguages = javaSplit(preferredLanguages, ',');
      }
      this.dictLimitUser = int('dictLimitUser', '0');
      this.dictLimitTeam = int('dictLimitTeam', '0');
      this.styleGuideLimitUser = int('styleGuideLimitUser', '0');
      this.styleGuideLimitTeam = int('styleGuideLimitTeam', '0');
      this.requestLimitAccessToken = opt('requestLimitAccessToken', null);
      this.jwtSecret = opt('jwtSecret', null);
      this.externalRolloutServiceUrl = opt('externalRolloutServiceUrl', null);
      this.externalRolloutServiceApiKey = opt('externalRolloutServiceApiKey', null);

      this.globalConfig.setGrammalecteServer(opt('grammalecteServer', null));
      this.globalConfig.setGrammalecteUser(opt('grammalecteUser', null));
      this.globalConfig.setGrammalectePassword(opt('grammalectePassword', null));
      const beolingusFile = opt('beolingusFile', null);
      if (beolingusFile !== null) {
        if (new File(beolingusFile).exists()) {
          this.globalConfig.setBeolingusFile(new File(beolingusFile));
        } else {
          throw new IllegalArgumentException(`beolingusFile not found: ${beolingusFile}`);
        }
      }
      const nerUrl = opt('nerUrl', null);
      if (nerUrl !== null) {
        this.globalConfig.setNERUrl(nerUrl);
        logger.info(`Using NER service: ${valueOf(this.globalConfig.getNerUrl())}`);
      }
      for (const key of keyOrder) {
        if (!KNOWN_OPTION_KEYS.includes(key) && !javaMatches(key, 'lang-[a-z]+-dictPath') && !javaMatches(key, 'lang-[a-z]+')) {
          process.stderr.write('***** WARNING: ****\n');
          process.stderr.write(`Key '${key}' from configuration file '${file}' is unknown. Please check the key's spelling (case is significant).\n`);
          process.stderr.write(`Known keys: [${KNOWN_OPTION_KEYS.join(', ')}]\n`);
        }
      }

      this.addDynamicLanguages(props, keyOrder);
      this.setAbTest(opt('abTest', null));
      this.setAbTestClients(opt('abTestClients', null));
      this.setAbTestRollout(int('abTestRollout', '100'));
      const ngramLangIdentData = opt('ngramLangIdentData', null);
      this.setDefaultThirdPartyAI(parseBoolean(opt('defaultThirdPartyAI', 'false')));

      if (ngramLangIdentData !== null) {
        const dir = new File(ngramLangIdentData);
        if (!existsSync(dir.toString()) || statSync(dir.toString()).isDirectory()) {
          throw new IllegalArgumentException(`ngramLangIdentData does not exist or is a directory (needs to be a ZIP file): ${ngramLangIdentData}`);
        }
        this.setNgramLangIdentData(dir);
      }
    } catch (e) {
      if (e instanceof FileNotFoundException) {
        throw new RuntimeException(`Could not load properties from '${file}'`, e); // Java: catch (IOException e)
      }
      throw e;
    }
  }

  // Java: HTTPServerConfig#addDynamicLanguages(Properties)
  addDynamicLanguages(props, keyOrder) {
    for (const key of keyOrder) {
      if (key.startsWith('lang-') && !key.includes('-dictPath')) {
        const code = key.substring('lang-'.length);
        if (!code.includes('-') && code.length !== 2 && code.length !== 3) {
          throw new IllegalArgumentException(`code is supposed to be a 2 (or rarely 3) character code (unless it uses a format with variant, like xx-YY): '${code}'`);
        }
        const nameKey = `lang-${code}`;
        const name = props.has(nameKey) ? props.get(nameKey) : null;
        const dictPathKey = `lang-${code}-dictPath`;
        const dictPath = props.has(dictPathKey) ? props.get(dictPathKey) : null;
        if (dictPath === null) {
          throw new IllegalArgumentException(`${dictPathKey} must be set`);
        }
        const dictPathFile = new File(dictPath);
        if (!dictPathFile.exists() || !isFile(dictPathFile.toString())) {
          throw new IllegalArgumentException(`dictionary file does not exist or is not a file: '${dictPath}'`);
        }
        print(`Adding dynamic spell checker language ${name}, code: ${code}, dictionary: ${dictPath}`);
        const lang = Languages.addLanguage(name, code, new File(dictPath));
        // better fail early in case of misconfiguration, so use the language now:
        if (!new File(lang.getCommonWordsPath()).exists()) {
          throw new IllegalArgumentException(`Common words path not found: '${lang.getCommonWordsPath()}'`);
        }
        const lt = new JLanguageTool(lang);
        lt.check('test');
      }
    }
  }

  // Java: HTTPServerConfig#setLanguageModelDirectory(String)
  setLanguageModelDirectory(langModelDir) {
    SuggestionsOrdererConfig.setNgramsPath(langModelDir);
    this.languageModelDir = new File(langModelDir);
    if (!this.languageModelDir.exists() || !isDirectory(this.languageModelDir.toString())) {
      throw new RuntimeException(`LanguageModel directory not found or is not a directory: ${this.languageModelDir}`);
    }
  }

  // Java: HTTPServerConfig#setFasttextPaths(String,String)
  setFasttextPaths(fasttextModelPath, fasttextBinaryPath) {
    this.fasttextModel = new File(fasttextModelPath);
    this.fasttextBinary = new File(fasttextBinaryPath);
    if (!existsSync(fasttextModelPath) || statSync(fasttextModelPath).isDirectory()) {
      throw new RuntimeException(`Fasttext model path not valid (file doesn't exist or is a directory): ${fasttextModelPath}`);
    }
    let canExecute = false;
    try {
      accessSync(fasttextBinaryPath, constants.X_OK);
      canExecute = true;
    } catch { /* not executable */ }
    if (!existsSync(fasttextBinaryPath) || statSync(fasttextBinaryPath).isDirectory() || !canExecute) {
      throw new RuntimeException(`Fasttext binary path not valid (file doesn't exist, is a directory or not executable): ${fasttextBinaryPath}`);
    }
  }

  // Java: HTTPServerConfig#getRuleIdToConfidenceFile()
  getRuleIdToConfidenceFile() {
    return this.ruleIdToConfidenceFile;
  }

  // Java: HTTPServerConfig#getProperty(Properties,String,File)
  getProperty(props, propertyName, config) {
    const propertyValue = props.has(propertyName) ? props.get(propertyName) : null;
    if (propertyValue === null || javaTrim(propertyValue) === '') {
      throw new IllegalConfigurationException(`Property '${propertyName}' must be set in ${config}`);
    }
    return propertyValue;
  }

  // Java: HTTPServerConfig#getOptionalProperty(Properties,String,String)
  getOptionalProperty(props, propertyName, defaultValue) {
    return props.has(propertyName) ? props.get(propertyName) : defaultValue;
  }

  // Java: HTTPServerConfig#isVerbose()
  isVerbose() {
    return this.verbose;
  }

  // Java: HTTPServerConfig#isPublicAccess()
  isPublicAccess() {
    return this.publicAccess;
  }

  // Java: HTTPServerConfig#getPort()
  getPort() {
    return this.port;
  }

  // Java: HTTPServerConfig#getMinPort()
  getMinPort() {
    return this.minPort;
  }

  // Java: HTTPServerConfig#getMaxPort()
  getMaxPort() {
    return this.maxPort;
  }

  // Java: HTTPServerConfig#getAllowOriginUrl()
  getAllowOriginUrl() {
    return this.allowOriginUrl;
  }

  // Java: HTTPServerConfig#setAllowOriginUrl(String)
  setAllowOriginUrl(allowOriginUrl) {
    this.allowOriginUrl = allowOriginUrl;
  }

  // Java: HTTPServerConfig#getServerURL()
  getServerURL() {
    return this.serverURL;
  }

  // Java: HTTPServerConfig#setServerURL(String)
  setServerURL(url) {
    if (url !== null && url !== undefined) {
      try {
        // ignore different protocols, ports,... just use path for relative requests
        this.serverURL = new URI(new URI(url).getPath());
      } catch (e) {
        if (e instanceof URISyntaxException) {
          throw new IllegalArgumentException(`Could not parse provided serverURL: '${url}'`, e);
        }
        throw e;
      }
    } else {
      this.serverURL = null;
    }
  }

  // Java: HTTPServerConfig#setMaxTextLengthAnonymous(int)
  setMaxTextLengthAnonymous(len) {
    this.maxTextLengthAnonymous = len;
  }

  // Java: HTTPServerConfig#setMaxTextLengthLoggedIn(int)
  setMaxTextLengthLoggedIn(len) {
    this.maxTextLengthLoggedIn = len;
  }

  // Java: HTTPServerConfig#setMaxTextLengthPremium(int)
  setMaxTextLengthPremium(len) {
    this.maxTextLengthPremium = len;
  }

  // Java: HTTPServerConfig#setMaxTextHardLength(int)
  setMaxTextHardLength(len) {
    this.maxTextHardLength = len;
  }

  // Java: HTTPServerConfig#getMaxTextLengthAnonymous()
  getMaxTextLengthAnonymous() {
    return this.maxTextLengthAnonymous;
  }

  // Java: HTTPServerConfig#getMaxTextLengthLoggedIn()
  getMaxTextLengthLoggedIn() {
    return this.maxTextLengthLoggedIn;
  }

  // Java: HTTPServerConfig#getMaxTextLengthPremium()
  getMaxTextLengthPremium() {
    return this.maxTextLengthPremium;
  }

  // Java: HTTPServerConfig#getMaxTextHardLength()
  getMaxTextHardLength() {
    return this.maxTextHardLength;
  }

  // Java: HTTPServerConfig#getRequestLimitWhitelistUsers()
  getRequestLimitWhitelistUsers() {
    return this.requestLimitWhitelistUsers;
  }

  // Java: HTTPServerConfig#setRequestLimitWhitelistUsers(List)
  setRequestLimitWhitelistUsers(users) {
    this.requestLimitWhitelistUsers = users;
  }

  // Java: HTTPServerConfig#getMaxCheckTimeMillisAnonymous()
  getMaxCheckTimeMillisAnonymous() {
    return this.maxCheckTimeMillisAnonymous;
  }

  // Java: HTTPServerConfig#getMaxCheckTimeMillisLoggedIn()
  getMaxCheckTimeMillisLoggedIn() {
    return this.maxCheckTimeMillisLoggedIn;
  }

  // Java: HTTPServerConfig#getMaxCheckTimeMillisPremium()
  getMaxCheckTimeMillisPremium() {
    return this.maxCheckTimeMillisPremium;
  }

  // Java: HTTPServerConfig#getMaxCheckThreads()
  getMaxCheckThreads() {
    return this.maxCheckThreads;
  }

  // Java: HTTPServerConfig#setMaxTextCheckerThreads(int)
  setMaxTextCheckerThreads(n) {
    this.maxTextCheckerThreads = n;
  }

  // Java: HTTPServerConfig#getMaxTextCheckerThreads()
  getMaxTextCheckerThreads() {
    // unset - use maxCheckThreads
    return this.maxTextCheckerThreads !== 0 ? this.maxTextCheckerThreads : this.maxCheckThreads;
  }

  // Java: HTTPServerConfig#getTextCheckerQueueSize()
  getTextCheckerQueueSize() {
    return this.textCheckerQueueSize;
  }

  // Java: HTTPServerConfig#setTextCheckerQueueSize(int)
  setTextCheckerQueueSize(n) {
    this.textCheckerQueueSize = n;
  }

  // Java: HTTPServerConfig#getTrustXForwardForHeader()
  getTrustXForwardForHeader() {
    return this.trustXForwardForHeader;
  }

  // Java: HTTPServerConfig#getMaxWorkQueueSize()
  getMaxWorkQueueSize() {
    return this.maxWorkQueueSize;
  }

  // Java: HTTPServerConfig#getRequestLimit()
  getRequestLimit() {
    return this.requestLimit;
  }

  // Java: HTTPServerConfig#getRequestLimitInBytes()
  getRequestLimitInBytes() {
    return this.requestLimitInBytes;
  }

  // Java: HTTPServerConfig#getTimeoutRequestLimit()
  getTimeoutRequestLimit() {
    return this.timeoutRequestLimit;
  }

  // Java: HTTPServerConfig#getRequestLimitPeriodInSeconds()
  getRequestLimitPeriodInSeconds() {
    return this.requestLimitPeriodInSeconds;
  }

  // Java: HTTPServerConfig#getBlockedReferrers()
  getBlockedReferrers() {
    return this.blockedReferrers;
  }

  // Java: HTTPServerConfig#setBlockedReferrers(List)
  setBlockedReferrers(blockedReferrers) {
    if (blockedReferrers === null || blockedReferrers === undefined) throw new RuntimeException('NullPointerException');
    this.blockedReferrers = blockedReferrers;
  }

  // Java: HTTPServerConfig#getTrustedSources()
  getTrustedSources() {
    return this.trustedSources;
  }

  // Java: HTTPServerConfig#setTrustedSources(String)
  setTrustedSources(pattern) {
    this.trustedSources = pattern === null || pattern === undefined ? null : Pattern.compile(pattern);
  }

  // Java: HTTPServerConfig#getDisabledRuleIds()
  getDisabledRuleIds() {
    return this.disabledRuleIds;
  }

  // Java: HTTPServerConfig#isStoppable()
  isStoppable() {
    return this.stoppable;
  }

  // Java: HTTPServerConfig#isAnonymousAccessAllowed()
  isAnonymousAccessAllowed() {
    return this.anonymousAccessAllowed;
  }

  // Java: HTTPServerConfig#isPremiumAlways()
  isPremiumAlways() {
    return this.premiumAlways;
  }

  // Java: HTTPServerConfig#getRequestLimitAccessToken()
  getRequestLimitAccessToken() {
    return this.requestLimitAccessToken;
  }

  // Java: HTTPServerConfig#getMaxErrorsPerWordRate()
  getMaxErrorsPerWordRate() {
    return this.maxErrorsPerWordRate;
  }

  // Java: HTTPServerConfig#getCacheSize()
  getCacheSize() {
    return this.cacheSize;
  }

  // Java: HTTPServerConfig#setCacheSize(int)
  setCacheSize(n) {
    this.cacheSize = n;
  }

  // Java: HTTPServerConfig#getCacheTTLSeconds()
  getCacheTTLSeconds() {
    return this.cacheTTLSeconds;
  }

  // Java: HTTPServerConfig#isPipelineCachingEnabled()
  isPipelineCachingEnabled() {
    return this.pipelineCaching;
  }

  // Java: HTTPServerConfig#setPipelineCaching(boolean)
  setPipelineCaching(b) {
    this.pipelineCaching = b;
  }

  // Java: HTTPServerConfig#isPipelinePrewarmingEnabled()
  isPipelinePrewarmingEnabled() {
    return this.pipelinePrewarming;
  }

  // Java: HTTPServerConfig#setPipelinePrewarming(boolean)
  setPipelinePrewarming(b) {
    this.pipelinePrewarming = b;
  }

  // Java: HTTPServerConfig#getMaxPipelinePoolSize()
  getMaxPipelinePoolSize() {
    return this.maxPipelinePoolSize;
  }

  // Java: HTTPServerConfig#setMaxPipelinePoolSize(int)
  setMaxPipelinePoolSize(n) {
    this.maxPipelinePoolSize = n;
  }

  // Java: HTTPServerConfig#getPipelineExpireTime()
  getPipelineExpireTime() {
    return this.pipelineExpireTime;
  }

  // Java: HTTPServerConfig#setPipelineExpireTime(int)
  setPipelineExpireTime(n) {
    this.pipelineExpireTime = n;
  }

  // Java: HTTPServerConfig#getLanguageModelDir()
  getLanguageModelDir() {
    return this.languageModelDir;
  }

  // Java: HTTPServerConfig#getRemoteRulesConfigFile()
  getRemoteRulesConfigFile() {
    return this.remoteRulesConfigFile;
  }

  // Java: HTTPServerConfig#getRulesConfigFile()
  getRulesConfigFile() {
    return this.rulesConfigFile;
  }

  // Java: HTTPServerConfig#setAbTest(String)
  setAbTest(abTest) {
    if (abTest !== null && abTest !== undefined && javaTrim(abTest) !== '') {
      this.abTest = javaSplit(javaTrim(abTest), ',');
    } else {
      this.abTest = [];
    }
  }

  // Java: HTTPServerConfig#setAbTestClients(String)
  setAbTestClients(pattern) {
    this.abTestClients = pattern === null || pattern === undefined ? null : Pattern.compile(pattern);
  }

  // Java: HTTPServerConfig#setAbTestRollout(int)
  setAbTestRollout(abTestRollout) {
    this.abTestRollout = abTestRollout;
  }

  // Java: HTTPServerConfig#setNgramLangIdentData(File)
  setNgramLangIdentData(f) {
    this.ngramLangIdentData = f;
  }

  // Java: HTTPServerConfig#getNgramLangIdentData()
  getNgramLangIdentData() {
    return this.ngramLangIdentData;
  }

  // Java: HTTPServerConfig#getFasttextBinary()
  getFasttextBinary() {
    return this.fasttextBinary;
  }

  // Java: HTTPServerConfig#getFasttextModel()
  getFasttextModel() {
    return this.fasttextModel;
  }

  // Java: HTTPServerConfig#setDefaultThirdPartyAI(boolean)
  setDefaultThirdPartyAI(v) {
    this.defaultThirdPartyAI = v;
  }

  // Java: HTTPServerConfig#isLocalApiMode()
  isLocalApiMode() {
    return this.localApiMode;
  }
}
