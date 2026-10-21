// Ported from CompoundInfinitivRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundInfinitivRule } from '../../../../src/lang/de/rules/CompoundInfinitivRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('CompoundInfinitivRuleTest', () => {
  // Java: CompoundInfinitivRuleTest#testRule
  it('testRule', () => {
    const german = Languages.getLanguageForShortCode('de');
    const rule = new CompoundInfinitivRule(messagesFor(german), german, null);
    const lt = newLt(german); // Java: new JLanguageTool(german), only used for getAnalyzedSentence
    expect(rule.match(lt.getAnalyzedSentence("Ich brachte ihn dazu, mein Zimmer sauber zu machen.")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("Du brauchst nicht bei mir vorbei zu kommen.")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("Ich ging zur Seite, um die alte Dame vorbei zu lassen.")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("Seine Frau gab vor zu schlafen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Mein Herz hörte auf zu schlagen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Den Sonnenaufgang von einem Berggipfel aus zu sehen, ist eine Wonne.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Hör auf zu schreien")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Sie riss sich zusammen und fing wieder an zu reden.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Fang an zu zählen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Er hatte nichts weiter zu sagen")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Sie strengte sich an zu schwimmen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Er erhob sich von dem Stuhl, auf dem er gesessen hatte, und begann im Zimmer auf und ab zu schreiten.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Tom stand auf und fing an, auf und ab zu gehen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Aber um auf Nummer sicher zu gehen, schrieb er es auf.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Sie scheint aus Spanien heraus zu kaufen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Hab keine Lust, mir Gedanken darüber zu machen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Fang an zu lesen, wo du aufgehört hast.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Fang dort an zu lesen, wo du aufgehört hast.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Der diensthabende Kollege hatte ganz schön zu tun.")).length).toBe(0);
  });
});
