// Java: org.languagetool.server.PipelinePool (caches pre-configured JLanguageTool instances, keyed by PipelineSettings)
import { NoSuchElementException, IllegalStateException } from '../lib/java/errors.js';
import { DictionaryMatchFilter } from '../core/rules/DictionaryMatchFilter.js';
import { DictionarySpellMatchFilter } from '../core/rules/DictionarySpellMatchFilter.js';
import { selectRules } from '../core/Tools.js';
import { notPortedYet } from '../core/language/components.js';
import { Pipeline } from './Pipeline.js';
import { Configuration } from './gui/Configuration.js';
import { print } from './ServerTools.js';
import { CategoryId } from '../core/rules/model/Category.js';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { GenericKeyedObjectPool } from './KeyedObjectPool.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.server.PipelinePool');

// Java: org.languagetool.gui.Tools#configureFromRules(JLanguageTool,Configuration)
function configureFromRules(lt, config) {
  const disabledRules = config.getDisabledRuleIds();
  if (disabledRules !== null) {
    for (const ruleId of disabledRules) lt.disableRule(ruleId);
  }
  const disabledCategories = config.getDisabledCategoryNames();
  if (disabledCategories !== null) {
    for (const categoryName of disabledCategories) lt.disableCategory(new CategoryId(categoryName));
  }
  if (config.getEnabledRulesOnly()) {
    for (const rule of lt.getAllRules()) lt.disableRule(rule.getId());
  }
  const enabledRules = config.getEnabledRuleIds();
  if (enabledRules !== null) {
    for (const ruleName of enabledRules) lt.enableRule(ruleName);
  }
  lt.setConfigValues(config.getConfigurableValues());
}

export class PipelinePool {
  static FQCN = 'org.languagetool.server.PipelinePool';

  // Java: PipelinePool#PipelinePool(HTTPServerConfig,ResultCache,boolean)
  constructor(config, cache, internalServer) {
    this.internalServer = internalServer;
    this.config = config;
    this.cache = cache;
    const maxPoolSize = config.getMaxPipelinePoolSize();
    if (config.isPipelineCachingEnabled()) {
      // could try setting wait time, idle time (from expireTime), use another eviction policy, ...
      this.pool = new GenericKeyedObjectPool(this, { maxTotal: maxPoolSize, maxIdlePerKey: maxPoolSize, maxTotalPerKey: maxPoolSize });
    } else {
      this.pool = null;
    }
    if (config.getRemoteRulesConfigFile() !== null) {
      throw notPortedYet('RemoteRuleFallbackManager (DEV-001)');
    }
  }

  // Java: PipelinePool#getPipeline(PipelineSettings)
  getPipeline(settings) {
    if (this.pool === null) {
      return this.createPipeline(settings.lang, settings.motherTongue, settings.query, settings.globalConfig, settings.userConfig, this.config.getDisabledRuleIds());
    }
    try {
      return this.pool.borrowObject(settings);
    } catch (e) {
      if (!(e instanceof NoSuchElementException)) throw e;
      logger.info('Pipeline pool capacity reached: {} active objects, {} idle', this.pool.getNumActive(), this.pool.getNumIdle());
      return this.createPipeline(settings.lang, settings.motherTongue, settings.query, settings.globalConfig, settings.userConfig, this.config.getDisabledRuleIds());
    }
  }

  // Java: PipelinePool#returnPipeline(PipelineSettings,Pipeline)
  returnPipeline(settings, pipeline) {
    if (this.pool === null) return;
    try {
      this.pool.returnObject(settings, pipeline);
    } catch (e) {
      if (!(e instanceof IllegalStateException)) throw e;
      // this might happen when pool capacity is reached and we return newly created objects that were never borrowed
      logger.info('Exception while trying to return pipeline to pool; this is expected when pipeline capacity is reached', e);
    }
  }

  // Java: PipelinePool#createPipeline(Language,Language,QueryParams,GlobalConfig,UserConfig,List): JLanguageTool for a language, mother tongue and rule configuration
  createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds) {
    const config = this.config;
    const withLanguageModel = config.getLanguageModelDir() !== null;
    const lt = new Pipeline(lang, params.altLanguages, motherTongue, this.cache, globalConfig, userConfig, params.inputLogging, withLanguageModel);
    // userConfig.getRules(): custom rules need a database (RuleMatchFilter rules are added as match filters)
    lt.setMaxErrorsPerWordRate(config.getMaxErrorsPerWordRate());
    lt.disableRules(disabledRuleIds);
    if (withLanguageModel) {
      throw notPortedYet('PipelinePool#createPipeline language model rules (DEV-001)');
    }
    if (config.getRulesConfigFile() !== null) {
      this.configureFromRulesFile(lt, lang);
    }
    // else configureFromGUI only applies to the internal (GUI) server; remote rules need a config file (DEV-001)
    if (params.useQuerySettings) {
      selectRules(lt, new Set(params.disabledCategories), new Set(params.enabledCategories),
        new Set(params.disabledRules), new Set(params.enabledRules), params.useEnabledOnly, params.enableTempOffRules);
    }
    if (userConfig.filterDictionaryMatches()) {
      lt.addMatchFilter(new DictionaryMatchFilter(userConfig));
    }
    lt.addMatchFilter(new DictionarySpellMatchFilter(userConfig));
    // premiumOnly cannot be set (refused in this build); PremiumOff: no premium rules to disable
    // AB treatment: LocalAbTestService#configureLTForTreatment does nothing
    if (this.pool !== null) {
      lt.setupFinished();
    }
    return lt;
  }

  // Java: PipelinePool#configureFromRulesFile(JLanguageTool,Language)
  configureFromRulesFile(lt, lang) {
    const rulesFile = String(this.config.getRulesConfigFile());
    print(`Using options configured in ${rulesFile}`);
    let canonical = path.resolve(rulesFile);
    try {
      canonical = realpathSync(canonical);
    } catch {
      // File#getCanonicalFile() of a missing file: the absolute normalised path
    }
    configureFromRules(lt, new Configuration(path.dirname(canonical), path.basename(rulesFile), lang));
  }

  // Java: PipelinePool#makeObject(PipelineSettings)
  makeObject(pipelineSettings) {
    return this.createPipeline(pipelineSettings.lang, pipelineSettings.motherTongue, pipelineSettings.query,
      pipelineSettings.globalConfig, pipelineSettings.userConfig, this.config.getDisabledRuleIds());
  }
}
