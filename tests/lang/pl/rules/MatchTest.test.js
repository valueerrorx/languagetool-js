// Ported from MatchTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../../src/core/AnalyzedTokenReadings.js';
import { Match } from '../../../../src/core/patterns/Match.js';
import { MatchState } from '../../../../src/core/patterns/MatchState.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

const { CaseConversion, IncludeRange } = Match;
const str = (a) => `[${a.join(', ')}]`;
const atr = (token, posTag, lemma) => new AnalyzedTokenReadings(new AnalyzedToken(token, posTag, lemma), 0);
const getMatch = (posTag, posTagReplace, spell) => new Match(posTag, posTagReplace, true, null, null, CaseConversion.NONE, false, spell, IncludeRange.NONE);
const getTextMatch = (regexMatch, regexpReplace, spell) => new Match(null, null, false, regexMatch, regexpReplace, CaseConversion.NONE, false, spell, IncludeRange.NONE);

describe('MatchTest (pl)', () => {
  // Java: MatchTest#testSpeller
  it('testSpeller', () => {
    let match = getMatch('POS1', 'POS2', true);
    const polish = new Polish();
    let matchState = new MatchState(match, polish.getSynthesizer());
    matchState.setToken(atr('inflectedform11', 'POS1', 'Lemma1'));
    expect(str(matchState.toFinalString(polish))).toBe('[<mistake/>]');
    match = getMatch('POS1', 'POS2', false);
    matchState = new MatchState(match, polish.getSynthesizer());
    matchState.setToken(atr('inflectedform11', 'POS1', 'Lemma1'));
    expect(str(matchState.toFinalString(polish))).toBe('[(inflectedform11)]');
    match = getMatch('subst:sg:acc.nom:m3', 'subst:sg:gen:m3', true);
    matchState = new MatchState(match, polish.getSynthesizer());
    matchState.setToken(atr('AON', 'subst:sg:acc.nom:m3', 'AON'));
    expect(str(matchState.toFinalString(polish))).toBe('[AON-u]');
    match = getTextMatch('^(.*)$', '$0-u', true);
    match.setLemmaString('AON');
    matchState = new MatchState(match, polish.getSynthesizer());
    expect(str(matchState.toFinalString(polish))).toBe('[AON-u]');
    match.setLemmaString('batalion');
    matchState = new MatchState(match, polish.getSynthesizer());
    expect(str(matchState.toFinalString(polish))).toBe('[<mistake/>]');
    match.setLemmaString('ASEAN');
    matchState = new MatchState(match, polish.getSynthesizer());
    expect(str(matchState.toFinalString(polish))).toBe('[ASEAN-u]');
  });
});
