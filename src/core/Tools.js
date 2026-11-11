// org.languagetool.tools.Tools (bitext helpers live in bitext/BitextTools.js)
import { MessageFormat } from '../lib/java/MessageFormat.js';
import { listGet } from '../lib/java/arrays.js';
import { sha256Hex } from '#platform';
import { IOException, RuntimeException } from '../lib/java/errors.js';
import { StringBuilder } from '../lib/java/strings.js';
import { getDataBroker } from './resources/LtStatics.js';
import { MalformedURLException, URL } from '../lib/java/URL.js';
import { TextLevelRule } from './rules/model/TextLevelRule.js';

// Java: Tools#i18n(ResourceBundle,String,Object...)
export function i18n(messages, key, ...messageArguments) {
  const formatter = new MessageFormat('');
  formatter.applyPattern(messages.getString(key));
  return formatter.format(messageArguments);
}

let linguServices = null;

// Java: Tools#profileRulesOnLine(String,JLanguageTool,Rule)
export function profileRulesOnLine(contents, lt, rule) {
  let count = 0;
  for (const sentence of lt.sentenceTokenize(contents)) {
    const analyzed = lt.getAnalyzedSentence(sentence);
    // DEV-018: Java throws 'Not implemented for a text-level rule'; text-level rules are profiled on the line as a one-sentence text
    count += (rule instanceof TextLevelRule ? rule.match([analyzed]) : rule.match(analyzed)).length;
  }
  return count;
}

// Java: Tools#correctText(String,JLanguageTool)
export function correctText(contents, lt) {
  const ruleMatches = lt.check(contents);
  if (ruleMatches.length === 0) {
    return contents;
  }
  return correctTextFromMatches(contents, ruleMatches);
}

// Java: Tools#correctTextFromMatches(String,List)
export function correctTextFromMatches(contents, matches) {
  const sb = new StringBuilder(contents);
  const errors = [];
  for (const rm of matches) {
    const replacements = rm.getSuggestedReplacements();
    if (replacements.length !== 0) {
      errors.push(sb.substring(rm.getFromPos(), rm.getToPos()));
    }
  }
  let offset = 0;
  let counter = 0;
  for (const rm of matches) {
    const replacements = rm.getSuggestedReplacements();
    if (replacements.length !== 0) {
      // make sure the error hasn't been already corrected:
      if (rm.getFromPos() - offset >= 0
          && rm.getToPos() - offset >= rm.getFromPos() - offset
          && errors[counter] === sb.substring(rm.getFromPos() - offset, rm.getToPos() - offset)) {
        sb.replace(rm.getFromPos() - offset, rm.getToPos() - offset, replacements[0]);
        offset += rm.getToPos() - rm.getFromPos() - replacements[0].length;
      }
      counter++;
    }
  }
  return sb.toString();
}

// Java: Tools#getFullStackTrace(Throwable)
export function getFullStackTrace(e) {
  let out = '';
  e.printStackTrace({ println: (line) => { out += `${line}\n`; } });
  return out;
}

// Java: Tools#getStream(String) / getStream(String,String); streams are Buffers
export function getStream(path, requiredHash) {
  if (requiredHash === undefined) {
    const is = getDataBroker().getAsStream(path);
    if (is === null || is === undefined) {
      throw new IOException(`Could not load file from classpath: '${path}'`);
    }
    return is;
  }
  const data = getStream(path);
  const computedHash = sha256Hex(data);
  if (computedHash !== requiredHash) {
    throw new IOException(`Checksum mismatch for the file '${path}': expected ${requiredHash}, got ${computedHash}`);
  }
  return Buffer.from(data);
}

// Java: Tools#setLinguisticServices(LinguServices)
export function setLinguisticServices(ls) {
  linguServices = ls;
}

// Java: Tools#isExternSpeller()
export function isExternSpeller() {
  return linguServices !== null;
}

// Java: Tools#getLinguisticServices()
export function getLinguisticServices() {
  return linguServices;
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

// Java: Tools#isParagraphEnd(List,int,Language)
export function isParagraphEnd(sentences, nTest, lang) {
  if (nTest >= sentences.length - 1) {
    return true;
  }
  if (lang.getSentenceTokenizer().singleLineBreaksMarksPara()) {
    if (listGet(sentences, nTest).getText().endsWith('\n') || listGet(sentences, nTest).getText().endsWith('\n\r')) {
      return true;
    }
  } else if (listGet(sentences, nTest).getText().endsWith('\n\n') || listGet(sentences, nTest).getText().endsWith('\n\r\n\r') || listGet(sentences, nTest).getText().endsWith('\r\n\r\n')) {
    return true;
  }
  if (listGet(sentences, nTest + 1).getText().startsWith('\n') || listGet(sentences, nTest + 1).getText().startsWith('\r\n')) {
    return true;
  }
  return false;
}
