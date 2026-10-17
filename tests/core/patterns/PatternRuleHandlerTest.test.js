// Ported from PatternRuleHandlerTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { PatternRuleHandler } from '../../../src/core/patterns/PatternRuleHandler.js';

describe('PatternRuleHandlerTest', () => {
  // Java: PatternRuleHandlerTest#testReplaceSpacesInRegex
  it('testReplaceSpacesInRegex', () => {
    const handler = new PatternRuleHandler();
    const s = '(?:[\\s  ]+)';
    expect(handler.replaceSpacesInRegex('foo bar')).toBe(`foo${s}bar`);
    expect(handler.replaceSpacesInRegex('foo bar x')).toBe(`foo${s}bar${s}x`);
    expect(handler.replaceSpacesInRegex('foo  bar')).toBe(`foo${s}${s}bar`); // well, does not really make sense
    expect(handler.replaceSpacesInRegex('fo[xy ] bar')).toBe(`fo[xy ]${s}bar`);
  });
});
