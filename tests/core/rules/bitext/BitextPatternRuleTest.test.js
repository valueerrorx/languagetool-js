// Ported from BitextPatternRuleTest (languagetool-core); runs for the languages that provide a bitext.xml (none among the ported ones).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { BitextPatternRuleLoader } from '../../../../src/core/bitext/BitextPatternRuleLoader.js';

// Java: BitextPatternRuleTest#cleanXML(String)
function cleanXML(str) {
  return str.replace(/<([^<].*?)>/g, '');
}

// Java: BitextPatternRuleTest#cleanSentence(String)
function cleanSentence(str) {
  return cleanXML(str.replace(/[\n\t]+/g, ''));
}

// Java: BitextPatternRuleTest#testMarker(int,int,Rule,Language)
function testMarker(expectedMatchStart, expectedMatchEnd, rule, lang) {
  if (expectedMatchStart === -1 || expectedMatchEnd === -1) {
    throw new Error(`${lang}: No error position markup ('<marker>...</marker>') in bad example in rule ${rule}`);
  }
}

// Java: BitextPatternRuleTest#getMatches(Rule,String,JLanguageTool)
function getMatches(rule, sentence, lt) {
  return rule.match(lt.getAnalyzedSentence(sentence));
}

// Java: BitextPatternRuleTest#testBadSentence(String,List,int,int,AbstractPatternRule,Language,JLanguageTool)
function testBadSentence(origBadSentence, suggestedCorrection, expectedMatchStart, expectedMatchEnd, rule, lang, lt) {
  const badSentence = cleanXML(origBadSentence);
  expect(badSentence.trim().length > 0).toBe(true);
  let matches = getMatches(rule, badSentence, lt);
  expect(matches.length, `${lang}: Did expect one error in: "${badSentence}" (Rule: ${rule}), got ${matches.length}. Additional info:${rule.getMessage()}`).toBe(1);
  expect(matches[0].getFromPos(), `${lang}: Incorrect match position markup (start) for rule ${rule}`).toBe(expectedMatchStart);
  expect(matches[0].getToPos(), `${lang}: Incorrect match position markup (end) for rule ${rule}`).toBe(expectedMatchEnd);
  // make sure suggestion is what we expect it to be
  if (suggestedCorrection !== null && suggestedCorrection.length > 0) {
    expect(rule.getMessage().includes('<suggestion>'), `You specified a correction but your message has no suggestions in rule ${rule}`).toBe(true);
    expect(JSON.stringify(suggestedCorrection), `${lang}: Incorrect suggestions for rule ${rule}`).toBe(JSON.stringify(matches[0].getSuggestedReplacements()));
    if (matches[0].getSuggestedReplacements().length > 0) {
      const fromPos = matches[0].getFromPos();
      const toPos = matches[0].getToPos();
      for (const repl of matches[0].getSuggestedReplacements()) {
        const fixedSentence = badSentence.substring(0, fromPos) + repl + badSentence.substring(toPos);
        matches = getMatches(rule, fixedSentence, lt);
        if (matches.length > 0) {
          throw new Error(`Incorrect input:\n  ${badSentence}\nCorrected sentence:\n  ${fixedSentence}\nBy Rule:\n  ${rule}\nThe correction triggered an error itself:\n  ${matches[0]}\n`);
        }
      }
    }
  }
}

// Java: BitextPatternRuleTest#match(BitextPatternRule,String,String,JLanguageTool,JLanguageTool)
function match(rule, src, trg, srcLanguageTool, trgLanguageTool) {
  const srcText = srcLanguageTool.getAnalyzedSentence(src);
  const trgText = trgLanguageTool.getAnalyzedSentence(trg);
  return rule.match(srcText, trgText).length > 0;
}

// Java: BitextPatternRuleTest#testBitextRule(BitextPatternRule,Language,JLanguageTool)
function testBitextRule(rule, lang, lt) {
  const srcTool = new JLanguageTool(rule.getSourceLanguage());
  for (const goodSentence of rule.getCorrectBitextExamples()) {
    expect(cleanSentence(goodSentence.getSource()).trim().length > 0, `Got good sentence: '${goodSentence.getSource()}'`).toBe(true);
    expect(cleanSentence(goodSentence.getTarget()).trim().length > 0, `Got good sentence: '${goodSentence.getTarget()}'`).toBe(true);
    expect(match(rule, goodSentence.getSource(), goodSentence.getTarget(), srcTool, lt), `${lang}: Did not expect error in: ${goodSentence} (Rule: ${rule})`).toBe(false);
  }
  for (const origBadExample of rule.getIncorrectBitextExamples()) {
    // enable indentation use
    const example = origBadExample.getExample();
    const origBadSrcSentence = example.getSource().replace(/[\n\t]+/g, '');
    const origBadTrgSentence = example.getTarget().replace(/[\n\t]+/g, '');
    const suggestedCorrection = origBadExample.getCorrections();
    const expectedSrcMatchStart = origBadSrcSentence.indexOf('<marker>');
    const expectedSrcMatchEnd = origBadSrcSentence.indexOf('</marker>') - '<marker>'.length;
    testMarker(expectedSrcMatchStart, expectedSrcMatchEnd, rule, lang);
    const expectedTrgMatchStart = origBadTrgSentence.indexOf('<marker>');
    const expectedTrgMatchEnd = origBadTrgSentence.indexOf('</marker>') - '<marker>'.length;
    testMarker(expectedTrgMatchStart, expectedTrgMatchEnd, rule, lang);

    testBadSentence(origBadSrcSentence, suggestedCorrection, expectedSrcMatchStart, expectedSrcMatchEnd, rule.getSrcRule(), lang, srcTool);
    testBadSentence(origBadTrgSentence, suggestedCorrection, expectedTrgMatchStart, expectedTrgMatchEnd, rule.getTrgRule(), lang, lt);
  }
}

describe('BitextPatternRuleTest', () => {
  // Java: BitextPatternRuleTest#testBitextRulesFromXML
  it('testBitextRulesFromXML', () => {
    for (const lang of Languages.getWithDemoLanguage()) {
      const ruleLoader = new BitextPatternRuleLoader();
      const name = '/' + lang.getShortCode() + '/bitext.xml';
      let is;
      try {
        is = JLanguageTool.getDataBroker().getFromRulesDirAsStream(name);
      } catch (ignored) {
        if (!(ignored instanceof RuntimeException)) throw ignored;
        // thrown if there is no bitext.xml file
        continue;
      }
      const lt = new JLanguageTool(lang);
      const rules = ruleLoader.getRules(is, name);
      for (const rule of rules) {
        testBitextRule(rule, lang, lt);
      }
    }
  });
});
