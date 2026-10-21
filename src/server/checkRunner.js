// Java: TextChecker#getRuleMatches/#getPipelineResults behind one async function (a worker pool replaces runTextCheck later)
import { Language } from '../core/Language.js';
import { CheckResults } from '../core/rules/model/CheckResults.js';
import { JLanguageTool } from '../core/JLanguageTool.js';
import { DictionaryMatchFilter } from '../core/rules/DictionaryMatchFilter.js';
import { checkBitext, getBitextRules } from '../core/bitext/BitextTools.js';
import { TextChecker } from './TextChecker.js';
import { BadRequestException } from './BadRequestException.js';
import { createPipeline, checkWithPipeline } from './Pipeline.js';

// Java: TextChecker#getRuleMatches(...) + #getPipelineResults(...)
export async function runTextCheck(aText, lang, motherTongue, parameters, params, userConfig, config) {
  if (parameters.get('sourceText') !== undefined) {
    if (parameters.get('sourceLanguage') === undefined) {
      throw new BadRequestException("'sourceLanguage' parameter missing - must be set when 'sourceText' is set");
    }
    const sourceLanguage = TextChecker.parseLanguage(parameters.get('sourceLanguage'));
    const sourceLt = new JLanguageTool(sourceLanguage);
    const targetLt = new JLanguageTool(lang);
    if (userConfig.filterDictionaryMatches()) {
      targetLt.addMatchFilter(new DictionaryMatchFilter(userConfig));
    }
    const bitextRules = getBitextRules(sourceLanguage, lang);
    const bitextRes = [new CheckResults(checkBitext(parameters.get('sourceText'), aText.getPlainText(), sourceLt, targetLt, bitextRules), [])];
    for (const r of bitextRes) for (const m of r.getRuleMatches()) m.computeLazySuggestedReplacements();
    return bitextRes;
  }
  // DEV-008: languages that exist only as detection descriptors have no rules: no matches
  if (!(lang instanceof Language)) return [new CheckResults([], [])];
  const lt = createPipeline(config, lang, motherTongue, params, config.globalConfig, userConfig, config.getDisabledRuleIds());
  const textSessionId = params.regressionTestMode ? -2n : userConfig.getTextSessionId();
  const res = [checkWithPipeline(lt, lang, aText, null, params, textSessionId)];
  // generate suggestions, otherwise this is not part of the timeout logic
  for (const r of res) for (const m of r.getRuleMatches()) m.computeLazySuggestedReplacements();
  return res;
}
