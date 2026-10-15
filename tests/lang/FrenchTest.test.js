// Ported from FrenchTest (testSentenceTokenizer, testAdvancedTypography); testRules needs the French rules (later steps), plus filter smoke tests for F17.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { French } from '../../src/lang/fr/language/French.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';

class R extends Rule {
  constructor(id) { super(); this.id = id; }

  getId() { return this.id; }

  getDescription() { return this.id; }

  match() { return []; }
}

describe('FrenchTest', () => {
  it('testSentenceTokenizer', () => {
    const tokenizer = French.getInstance().getSentenceTokenizer();
    expect(tokenizer.tokenize('Arrête de le cajoler... ça ne donnera rien.').length).toBe(1);
    expect(tokenizer.tokenize('Arrête de le cajoler… ça ne donnera rien.').length).toBe(1);
    expect(tokenizer.tokenize('Il est possible de le contacter par tous les moyens (courrier, téléphone, mail...) à condition de vous présenter.').length).toBe(1);
  });

  it('testAdvancedTypography', () => {
    const lang = French.getInstance();
    expect(lang.toAdvancedTypography('"C\'est"')).toBe('« C’est »');
    expect(lang.toAdvancedTypography('"C\'est" ')).toBe('« C’est » ');
    expect(lang.toAdvancedTypography("'C'est'")).toBe('‘C’est’');
    expect(lang.toAdvancedTypography("Vouliez-vous dire 'C'est'?")).toBe('Vouliez-vous dire ‘C’est’ ?');
    expect(lang.toAdvancedTypography('Vouliez-vous dire "C\'est"?')).toBe('Vouliez-vous dire « C’est » ?');
    expect(lang.toAdvancedTypography("Vouliez-vous dire <suggestion>C'est</suggestion>?")).toBe('Vouliez-vous dire « C’est » ?');
    expect(lang.toAdvancedTypography("C'est l'\"homme\".")).toBe('C’est l’«\u00a0homme\u00a0».');
    expect(lang.toAdvancedTypography('Vouliez-vous dire <suggestion>50\u00a0$</suggestion>?')).toBe('Vouliez-vous dire «\u00a050\u00a0$\u00a0»\u202f?');
  });

  it('adjustFrenchRuleMatch typographical apostrophe', () => {
    const lang = French.getInstance();
    const sent = new AnalyzedSentence([new AnalyzedTokenReadings(new AnalyzedToken("l'air", null, null), 0)]);
    const rm = new RuleMatch(new R('X'), sent, 0, 5, 'm', 's');
    rm.setSuggestedReplacements(["l'a", "'"]);
    lang.adjustFrenchRuleMatch(rm, new Set(['APOS_TYP']));
    expect(rm.getSuggestedReplacements()).toEqual(['l’a', "'"]);
  });
});
