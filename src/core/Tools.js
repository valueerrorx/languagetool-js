// org.languagetool.tools.Tools (message formatting and rule selection; the rest follows in later steps).
import { MessageFormat } from '../lib/java/MessageFormat.js';
import { RuntimeException } from '../lib/java/errors.js';
import { MalformedURLException, URL } from '../lib/java/URL.js';

// Java: Tools#i18n(ResourceBundle,String,Object...)
export function i18n(messages, key, ...messageArguments) {
  const formatter = new MessageFormat('');
  formatter.applyPattern(messages.getString(key));
  return formatter.format(messageArguments);
}

// Java: Tools#getUrl(String)
export function getUrl(url) {
  try {
    return new URL(url);
  } catch (e) {
    if (e instanceof MalformedURLException) throw new RuntimeException(e);
    throw e;
  }
}

// Java: Set<CategoryId>#contains via CategoryId#equals (ids compared as strings)
function categoryIdSet(ids) {
  const s = new Set();
  for (const id of ids) s.add(id.toString());
  return s;
}

// Java: Tools#selectRules(JLanguageTool,List,List,boolean)
export function selectRules4(lt, disabledRuleIds, enabledRuleIds, useEnabledOnly) {
  const disabledRuleIdsSet = new Set(disabledRuleIds);
  const enabledRuleIdsSet = new Set(enabledRuleIds);
  selectRules(lt, [], [], disabledRuleIdsSet, enabledRuleIdsSet, useEnabledOnly, false);
}

// Java: Tools#selectRules(JLanguageTool,Set,Set,Set,Set,boolean,boolean); stdout line for temp_off activation as Java
export function selectRules(lt, disabledCategories, enabledCategories, disabledRules, enabledRules, useEnabledOnly, enableTempOff) {
  if (arguments.length === 4) {
    selectRules4(lt, disabledCategories, enabledCategories, disabledRules);
    return;
  }
  const enabledRuleSet = enabledRules instanceof Set ? enabledRules : new Set(enabledRules);
  const enabledCats = [...enabledCategories];
  const enabledCatIds = categoryIdSet(enabledCats);
  if (enableTempOff) {
    for (const rule of lt.getAllRules()) {
      if (rule.isDefaultTempOff()) {
        process.stdout.write(`Activating ${rule.getFullId()}, which is default='temp_off'\n`);
        lt.enableRule(rule.getFullId());
      }
    }
  }
  for (const id of disabledCategories) {
    lt.disableCategory(id);
  }
  for (const id of enabledCats) {
    lt.enableRuleCategory(id);
  }
  // disable rules that are disabled explicitly:
  for (const disabledRule of disabledRules) {
    lt.disableRule(disabledRule);
  }
  // enable rules
  for (const ruleName of enabledRuleSet) {
    lt.enableRule(ruleName);
  }
  if (useEnabledOnly) {
    if (enabledRuleSet.size !== 0 && enabledCats.length === 0) {
      // With rule IDs only, disable every rule that was not enabled explicitly.
      for (const rule of lt.getAllRules()) {
        const enabledById = enabledRuleSet.has(rule.getFullId()) || enabledRuleSet.has(rule.getId());
        if (!enabledById) {
          lt.disableRule(rule.getFullId());
        }
      }
    } else if (enabledCats.length !== 0) {
      if (enabledRuleSet.size === 0) {
        // With categories only, disable categories outside the enabled set.
        for (const categoryId of lt.getCategories().keySet()) {
          if (!enabledCatIds.has(categoryId.toString())) {
            lt.disableCategory(categoryId);
          }
        }
      } else {
        // With both, keep each rule's current state inside enabled categories
        // and add explicitly enabled rules from outside those categories.
        for (const rule of lt.getAllRules()) {
          const enabledById = enabledRuleSet.has(rule.getFullId()) || enabledRuleSet.has(rule.getId());
          const inEnabledCategory = enabledCatIds.has(rule.getCategory().getId().toString());
          if (!enabledById && !inEnabledCategory) {
            lt.disableRule(rule.getFullId());
          }
        }
      }
    }
  }
}
