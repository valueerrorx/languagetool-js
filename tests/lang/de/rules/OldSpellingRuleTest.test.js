// Ported from OldSpellingRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { OldSpellingRule } from '../../../../src/lang/de/rules/OldSpellingRule.js';
import { newLt } from '../../../support/ruleTestSupport.js';

describe('OldSpellingRuleTest', () => {
  const germanDE = Languages.getLanguageForShortCode('de-DE');
  const rule = new OldSpellingRule(JLanguageTool.getMessageBundle(), germanDE);
  const lt = newLt(germanDE); // Java: new JLanguageTool(germanDE), only used for getAnalyzedSentence

  // Java: OldSpellingRuleTest#assertMatch(String)
  function assertMatch(input) {
    const match = rule.match(lt.getAnalyzedSentence(input));
    expect(match.length).toBe(1);
  }

  // Java: OldSpellingRuleTest#assertNoMatch(String)
  function assertNoMatch(input) {
    const match = rule.match(lt.getAnalyzedSentence(input));
    if (match.length > 0) {
      throw new Error(`Unexpected match for '${input}': ${match[0]}`);
    }
  }

  // Java: OldSpellingRuleTest#test
  it('test', () => {
    const sentence1 = lt.getAnalyzedSentence("Ein Kuß");
    expect(rule.match(sentence1).length).toBe(1);
    expect(`[${rule.match(sentence1)[0].getSuggestedReplacements().join(', ')}]`).toBe("[Kuss]");

    const sentence2 = lt.getAnalyzedSentence("Das Corpus delicti");
    expect(rule.match(sentence2).length).toBe(1);
    expect(`[${rule.match(sentence2)[0].getSuggestedReplacements().join(', ')}]`).toBe("[Corpus Delicti]");

    // inflected forms should work, too (as long as the inflection database still contains the old variants):
    const sentence3 = lt.getAnalyzedSentence("In Rußlands Weiten");
    expect(rule.match(sentence3).length).toBe(1);
    expect(`[${rule.match(sentence3)[0].getSuggestedReplacements().join(', ')}]`).toBe("[Russlands]");

    const sentence4 = lt.getAnalyzedSentence("Hot pants");
    expect(rule.match(sentence4).length).toBe(1);
    expect(`[${rule.match(sentence4)[0].getSuggestedReplacements().join(', ')}]`).toBe("[Hotpants]");

    const sentence5 = lt.getAnalyzedSentence("Ich muß los");
    expect(rule.match(sentence5).length).toBe(1);
    expect(`[${rule.match(sentence5)[0].getSuggestedReplacements().join(', ')}]`).toBe("[muss]");

    const sentence6 = lt.getAnalyzedSentence("schwarzweißmalen");
    expect(rule.match(sentence6).length).toBe(1);
    expect(`[${rule.match(sentence6)[0].getSuggestedReplacements().join(', ')}]`).toBe("[schwarzweiß malen, schwarz-weiß malen]");

    expect(`[${rule.match(lt.getAnalyzedSentence("geschneuzt"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[geschnäuzt]");
    expect(`[${rule.match(lt.getAnalyzedSentence("naß machen"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[nassmachen]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Midlife-crisis"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Midlife-Crisis, Midlifecrisis]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Schluß"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Schluss]");
    expect(rule.match(lt.getAnalyzedSentence("schluß")).length).toBe(0);
    expect(`[${rule.match(lt.getAnalyzedSentence("Schloß"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Schloss]");
    expect(`[${rule.match(lt.getAnalyzedSentence("radfahren"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Rad fahren]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Photo"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Foto]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Geschoß"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Geschoss]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Erdgeschoß"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Erdgeschoss]");
    expect(`[${rule.match(lt.getAnalyzedSentence("Erdgeschoßes"))[0].getSuggestedReplacements().join(', ')}]`).toBe("[Erdgeschosses]");

    assertNoMatch("In Russland");
    assertNoMatch("In Russlands Weiten");
    assertNoMatch("Schlüsse");
    assertNoMatch("Schloß Holte");
    assertNoMatch("in Schloß Holte");
    assertNoMatch("Schloß Holte ist");
    assertNoMatch("Asse");
    assertNoMatch("Photons");  // not "Photo" substring match
    assertNoMatch("Photon");
    assertNoMatch("Des Photons");
    assertNoMatch("Photons ");
    assertNoMatch("Hallo Herr Naß");
    assertNoMatch("Hallo Hr. Naß");
    assertNoMatch("Hallo Frau Naß");
    assertNoMatch("Hallo Fr. Naß");
    assertNoMatch("Fr. Naß");
    assertNoMatch("Dr. Naß");
    assertNoMatch("Prof. Naß");
    assertNoMatch("Bell Telephone");
    assertNoMatch("Telephone Company");
    assertMatch("Naß ist das Wasser");
    assertMatch("Läßt du das bitte");
    assertNoMatch("Das mögliche Bestehenbleiben");
    assertNoMatch("Das mögliche Bloßstrampeln verhindern.");
    assertMatch("Bloßstrampeln konnte er sich nicht.");
  });

  // Java: OldSpellingRuleTest#testGermanAT
  it('testGermanAT', () => {
    const germanAT = Languages.getLanguageForShortCode("de-AT");
    const rule = new OldSpellingRule(JLanguageTool.getMessageBundle(), germanAT);
    const lt = newLt(germanAT);
    // this is a special case for Austria because of the pronunciation:
    expect(rule.match(lt.getAnalyzedSentence("Geschoß")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Erdgeschoß")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Erdgeschoßes")).length).toBe(0);
  });
});
