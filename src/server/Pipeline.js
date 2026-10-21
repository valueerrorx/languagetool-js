// Java: PipelinePool#createPipeline (one fresh JLanguageTool per request; pooling/freezing follows with the worker pool)
import { JLanguageTool, ParagraphHandling } from '../core/JLanguageTool.js';
import { selectRules } from '../core/Tools.js';
import { notPortedYet } from '../core/language/components.js';

// Java: PipelinePool#createPipeline(Language,Language,QueryParams,GlobalConfig,UserConfig,List)
export function createPipeline(config, lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds) {
  const withLanguageModel = config.languageModelDir !== null;
  if (withLanguageModel) throw notPortedYet('PipelinePool#createPipeline language model rules (DEV-001)');
  if (config.rulesConfigFile !== null) throw notPortedYet('PipelinePool#configureFromRulesFile');
  const lt = new JLanguageTool(lang, params.altLanguages, motherTongue, null, globalConfig, userConfig, params.inputLogging, withLanguageModel, null);
  lt.setMaxErrorsPerWordRate(config.getMaxErrorsPerWordRate());
  lt.disableRules(disabledRuleIds);
  if (params.useQuerySettings) {
    selectRules(lt, new Set(params.disabledCategories), new Set(params.enabledCategories),
      new Set(params.disabledRules), new Set(params.enabledRules), params.useEnabledOnly, params.enableTempOffRules);
  }
  // DictionaryMatchFilter / DictionarySpellMatchFilter: no user dictionary words without accounts, nothing to filter
  return lt;
}

// Java: Pipeline#check2(...)
export function checkWithPipeline(lt, lang, aText, listener, params, textSessionId) {
  return lt.check2(aText, true, ParagraphHandling.NORMAL, listener, params.mode, params.level, params.toneTags, textSessionId);
}
