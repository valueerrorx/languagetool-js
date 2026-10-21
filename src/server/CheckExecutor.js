// Java: the part of org.languagetool.server.TextChecker that runs inside a pool thread (cache, pipeline pool, getRuleMatches, prewarming)
import '../lang/register.js';
import { Languages } from '../core/Languages.js';
import { CheckResults } from '../core/rules/model/CheckResults.js';
import { UserConfig } from '../core/rules/model/UserConfig.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../core/JLanguageTool.js';
import { ResultCache } from '../core/ResultCache.js';
import { DictionaryMatchFilter } from '../core/rules/DictionaryMatchFilter.js';
import { checkBitext, getBitextRules } from '../core/bitext/BitextTools.js';
import { TimeUnit } from '../lib/java/TimeUnit.js';
import { formatFixed } from '../lib/java/Formatter.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';
import { IllegalArgumentException, RuntimeException } from '../lib/java/errors.js';
import { BadRequestException } from './BadRequestException.js';
import { PipelinePool } from './PipelinePool.js';
import { PipelineSettings } from './PipelineSettings.js';
import { QueryParams } from './QueryParams.js';
import {
  annotatedTextFromDto, checkResultsToDto, languageFromDto, queryParamsFromDto, ruleMatchToDto, userConfigFromDto,
} from './worker/transport.js';

const log = LoggerFactory.getLogger('org.languagetool.server.TextChecker');

const CACHE_STATS_PRINT = 500;
const DEFAULT_PREWARM_LANGUAGES = ['de-DE', 'en-US', 'en-GB', 'pt-BR', 'ru-RU', 'es', 'it', 'fr', 'pl-PL', 'uk-UA'];

// Java: TextChecker#parseLanguage(String)
function parseLanguage(code) {
  try {
    return Languages.getLanguageForShortCode(code);
  } catch (e) {
    if (e instanceof IllegalArgumentException) throw new BadRequestException(e.getMessage());
    throw e;
  }
}

export class CheckExecutor {
  static FQCN = 'org.languagetool.server.TextChecker';

  // Java: TextChecker#TextChecker(...) cache and pipelinePool fields
  constructor(config, internalServer) {
    this.config = config;
    this.cache = config.getCacheSize() > 0 ? new ResultCache(config.getCacheSize(), config.getCacheTTLSeconds(), TimeUnit.SECONDS) : null;
    this.pipelinePool = new PipelinePool(config, this.cache, internalServer);
  }

  // Java: the Callable submitted by TextChecker#checkText; payload from transport.js, emit(matchDto) streams matches found so far
  run(payload, emit) {
    const lang = languageFromDto(payload.lang);
    const results = lang === null ? [new CheckResults([], [])] // DEV-008: languages without a port have no rules
      : this.getRuleMatches(annotatedTextFromDto(payload.aText), lang, languageFromDto(payload.motherTongue), new Map(payload.parameters),
        queryParamsFromDto(payload.qParams), userConfigFromDto(payload.userConfig), emit === null ? null : { matchFound: (m) => emit(ruleMatchToDto(m)) });
    // generate suggestions, otherwise this is not part of the timeout logic and not properly measured in the metrics
    for (const r of results) for (const m of r.getRuleMatches()) m.computeLazySuggestedReplacements();
    return results.map(checkResultsToDto);
  }

  // Java: TextChecker#getRuleMatches(AnnotatedText,Language,Language,Map,QueryParams,UserConfig,RuleMatchListener)
  getRuleMatches(aText, lang, motherTongue, parameters, params, userConfig, listener) {
    if (this.cache !== null && this.cache.requestCount() > 0 && this.cache.requestCount() % CACHE_STATS_PRINT === 0) {
      const sentenceHitPercentage = formatFixed(this.cache.getSentenceCache().stats().hitRate() * 100.0, 2);
      const matchesHitPercentage = formatFixed(this.cache.getMatchesCache().stats().hitRate() * 100.0, 2);
      const remoteHitPercentage = formatFixed(this.cache.getRemoteMatchesCache().stats().hitRate() * 100.0, 2);
      log.info(`Cache stats: ${sentenceHitPercentage}% / ${matchesHitPercentage}% / ${remoteHitPercentage}% hit rate`);
    }
    if (parameters.get('sourceText') !== undefined) {
      if (parameters.get('sourceLanguage') === undefined) {
        throw new BadRequestException("'sourceLanguage' parameter missing - must be set when 'sourceText' is set");
      }
      const sourceLanguage = parseLanguage(parameters.get('sourceLanguage'));
      const sourceLt = new JLanguageTool(sourceLanguage);
      const targetLt = new JLanguageTool(lang);
      if (userConfig.filterDictionaryMatches()) {
        targetLt.addMatchFilter(new DictionaryMatchFilter(userConfig));
      }
      const bitextRules = getBitextRules(sourceLanguage, lang);
      return [new CheckResults(checkBitext(parameters.get('sourceText'), aText.getPlainText(), sourceLt, targetLt, bitextRules), [])];
    }
    return [...this.getPipelineResults(aText, lang, motherTongue, params, userConfig, listener)];
  }

  // Java: TextChecker#getPipelineResults(AnnotatedText,Language,Language,QueryParams,UserConfig,RuleMatchListener)
  getPipelineResults(aText, lang, motherTongue, params, userConfig, listener) {
    let settings = null;
    let lt = null;
    const res = [];
    try {
      settings = new PipelineSettings(lang, motherTongue, params, this.config.globalConfig, userConfig);
      lt = this.pipelinePool.getPipeline(settings);
      let textSessionId = userConfig.getTextSessionId();
      if (params.regressionTestMode) {
        textSessionId = -2n; // magic value for remote rule roll-out - includes all results, even from disabled models
      }
      res.push(lt.check2(aText, true, ParagraphHandling.NORMAL, listener, params.mode, params.level, params.toneTags, textSessionId));
    } finally {
      if (lt !== null) {
        this.pipelinePool.returnPipeline(settings, lt);
      }
    }
    return res;
  }

  // Java: TextChecker#prewarmPipelinePool(); preferredLanguages: config.preferredLanguages (empty: the default list restricted to ported languages)
  prewarmPipelinePool(preferredLanguages) {
    // setting + number of pipelines; typical addon settings at the moment (2018-11-05)
    const prewarmSettings = [];
    const prewarmLanguages = [];
    if (preferredLanguages.length === 0) {
      for (const s of DEFAULT_PREWARM_LANGUAGES) {
        try {
          prewarmLanguages.push(Languages.getLanguageForShortCode(s));
        } catch (e) {
          if (!(e instanceof IllegalArgumentException)) throw e; // JS: languages without a port are skipped (DEV-006)
        }
      }
    } else {
      for (const s of preferredLanguages) prewarmLanguages.push(Languages.getLanguageForShortCode(s));
    }
    const user = new UserConfig();
    for (const language of prewarmLanguages) {
      const params = new QueryParams([], [], [], [], [], false, true, true, true, false, false, Mode.ALL, Level.PICKY, null, null);
      prewarmSettings.push(new PipelineSettings(Languages.getLanguageForShortCode('en-US'), language, params, this.config.globalConfig, user));
      prewarmSettings.push(new PipelineSettings(language, Languages.getLanguageForName('English'), params, this.config.globalConfig, user));
    }
    log.info('Prewarming {} pipelines', prewarmSettings.length);
    for (const setting of prewarmSettings) {
      try {
        const pipeline = this.pipelinePool.getPipeline(setting);
        pipeline.check('LanguageTool');
        this.pipelinePool.returnPipeline(setting, pipeline);
      } catch (e) {
        if (e !== null && typeof e === 'object' && e.notPorted === true) throw e;
        throw new RuntimeException('Error while prewarming pipeline', e);
      }
    }
    return prewarmSettings.length;
  }
}

