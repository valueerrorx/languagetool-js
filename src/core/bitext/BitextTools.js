// Tools bitext helpers (org.languagetool.tools.Tools#checkBitext/getBitextRules/selectBitextRules); kept apart from Tools.js to avoid an import cycle with JLanguageTool
import { existsSync, readFileSync, statSync } from 'node:fs';
import { FileNotFoundException } from '../../lib/java/errors.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { ParagraphHandling } from '../JLanguageTool.js';
import { BitextRule } from './BitextRule.js';
import './bitextRules.js';
import { BitextPatternRuleLoader } from './BitextPatternRuleLoader.js';
import { FalseFriendsAsBitextLoader } from './FalseFriendsAsBitextLoader.js';

// Java: Tools#checkBitext(String,String,JLanguageTool,JLanguageTool,List)
export function checkBitext(src, trg, srcLt, trgLt, bRules) {
  const srcText = srcLt.getAnalyzedSentence(src);
  const trgText = trgLt.getAnalyzedSentence(trg);
  const nonBitextRules = trgLt.getAllActiveRules();
  const ruleMatches = trgLt.checkAnalyzedSentence(ParagraphHandling.NORMAL, nonBitextRules, trgText, true);
  for (const bRule of bRules) {
    const curMatch = bRule.match(srcText, trgText);
    if (curMatch !== null && curMatch.length > 0) {
      // adjust positions for bitext rules
      for (const match of curMatch) {
        if (match.getColumn() < 0) {
          match.setColumn(1);
        }
        if (match.getEndColumn() < 0) {
          match.setEndColumn(trg.length + 1); // we count from 0
        }
        if (match.getLine() < 0) {
          match.setLine(1);
        }
        if (match.getEndLine() < 0) {
          match.setEndLine(1);
        }
        ruleMatches.push(match);
      }
    }
  }
  return ruleMatches;
}

// Java: Tools#getBitextRules(Language,Language[,File])
export function getBitextRules(source, target, externalBitextRuleFile = null) {
  const bRules = [];
  // try to load the bitext pattern rules for the language...
  const ruleLoader = new BitextPatternRuleLoader();
  const name = '/' + target.getShortCode() + '/bitext.xml';
  if (getDataBroker().ruleFileExists(name)) {
    const is = getDataBroker().getFromRulesDirAsStream(name);
    if (is !== null) {
      bRules.push(...ruleLoader.getRules(is, name));
    }
  }
  if (externalBitextRuleFile !== null) {
    const path = externalBitextRuleFile.getAbsolutePath();
    let bytes;
    try {
      bytes = readFileSync(path);
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR' || e.code === 'EISDIR' || e.code === 'EACCES') {
        let reason = 'No such file or directory';
        if (existsSync(path)) reason = statSync(path).isDirectory() ? 'Is a directory' : 'Permission denied';
        throw new FileNotFoundException(`${externalBitextRuleFile.getPath()} (${reason})`);
      }
      throw e;
    }
    bRules.push(...ruleLoader.getRules(bytes, path));
  }

  // load the false friend rules in the bitext mode:
  const fRuleLoader = new FalseFriendsAsBitextLoader();
  const falseFriendsFile = '/false-friends.xml';
  const rules = fRuleLoader.getFalseFriendsAsBitext(falseFriendsFile, source, target);
  bRules.push(...rules);

  // load Java bitext rules:
  bRules.push(...getAllBuiltinBitextRules());
  return bRules;
}

// Java: Tools#getAllBuiltinBitextRules(Language,ResourceBundle); all relevant rules have a no-arg constructor
function getAllBuiltinBitextRules() {
  const rules = [];
  for (const class1 of BitextRule.getRelevantRules()) {
    rules.push(new class1());
  }
  return rules;
}

// Java: Tools#selectBitextRules(List,List,List,boolean)
export function selectBitextRules(bRules, disabledRules, enabledRules, useEnabledOnly) {
  const newBRules = bRules.slice();
  const rulesToDisable = [];
  if (useEnabledOnly) {
    for (const enabledRule of enabledRules) {
      for (const b of bRules) {
        if (b.getId() !== enabledRule) {
          rulesToDisable.push(b);
        }
      }
    }
  } else {
    for (const disabledRule of disabledRules) {
      for (const b of newBRules) {
        if (b.getId() === disabledRule) {
          rulesToDisable.push(b);
        }
      }
    }
  }
  const toRemove = new Set(rulesToDisable);
  return newBRules.filter((b) => !toRemove.has(b));
}
