// Ported from AvsAnRuleTest (languagetool-language-modules/en); class pulled forward from F48 for EnglishSynthesizer
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../src/core/Languages.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { AvsAnRule, Determiner } from '../../../src/lang/en/rules/AvsAnRule.js';
import { englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('AvsAnRuleTest', () => {
  const english = Languages.getLanguageForShortCode('en');
  useNoopAnalysis(english);
  const rule = new AvsAnRule(englishMessages());
  const lt = newLt(english);
  const assertCorrect = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(0);
  const assertIncorrect = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(1);

  // Java: AvsAnRuleTest#testRule()
  it('testRule', () => {
    // correct sentences:
    assertCorrect('It must be an xml name.');
    assertCorrect('analyze an hprof file');
    assertCorrect('This is an sbt project.');
    assertCorrect('Import an Xcode project.');
    assertCorrect('This is a oncer.');
    assertCorrect('She was a Oaxacan chef.');
    assertCorrect('The doctor requested a urinalysis.');
    assertCorrect('She brought a Ouija board.');
    assertCorrect('This is a test sentence.');
    assertCorrect('It was an hour ago.');
    assertCorrect('A university is ...');
    assertCorrect('A one-way street ...');
    assertCorrect("An hour's work ...");
    assertCorrect('Going to an "industry party".');
    assertCorrect('An 8-year old boy ...');
    assertCorrect('An 18-year old boy ...');
    assertCorrect('The A-levels are ...');
    assertCorrect('An NOP check ...');
    assertCorrect('A USA-wide license ...');
    assertCorrect('...asked a UN member.');
    assertCorrect('In an un-united Germany...');
    // fixed false alarms:
    assertCorrect('See an:Grammatica');
    assertCorrect('See http://www.an.com');
    assertCorrect('Station A equals station B.');
    assertCorrect('e.g., the case endings -a -i -u and mood endings -u -a');
    assertCorrect("A'ight, y'all.");
    assertCorrect('Do an ngram tokenization fix.');
    assertCorrect('A car with a unibody construction.');
    assertCorrect('Given a Userset, create and return a matching PrincipalModel.');
    assertCorrect('An uninterpreted dream is like an unopened letter.');
    assertCorrect('Here ζ refers to the Riemann zeta function, the identity relating the product over primes to ζ(2) is an example of an Euler product, and the evaluation of ζ(2) as π2/6 is the Basel problem, solved by Leonhard Euler in 1735.');
    assertCorrect('In more technical terms, a navigation is in part made of a series of channels nearly parallel to the valley gradient and stream bed of an unimproved river, and which always shares the drainage basin of the river.');
    assertCorrect('This approach both allows the trial court to perform its gatekeeping function at the summary judgment stage of the proceedings and avoids placing an onerous burden upon the nonmoving party," the court said.');
    assertCorrect('The Queen travelled through the tunnel to Calais on a Eurostar train, which stopped nose to nose with the train that carried President Mitterrand from Paris.');
    assertCorrect('He has been a utilities lawyer for over 30 years.');
    assertCorrect('He has a unibrow.');
    assertCorrect("When compensated for temperature, the forward voltage drop of a transistor's base-emitter junction can provide a usably accurate logarithmic or exponential function.");

    // errors:
    assertIncorrect('It was a hour ago.');
    assertIncorrect("It was an sentence that's long.");
    assertIncorrect('It was a uninteresting talk.');
    assertIncorrect('An university');
    assertIncorrect('A unintersting ...');
    assertIncorrect("A hour's work ...");
    assertIncorrect('Going to a "industry party".');
    assertIncorrect('It was a unidentifiable object.');
    assertIncorrect(" I'll set you up with an userid and password so you can pick the...");
    const matches = rule.match(lt.getAnalyzedSentence('It was a uninteresting talk with an long sentence.'));
    expect(matches.length).toBe(2);

    // With uppercase letters:
    assertCorrect('A University');
    assertCorrect('A Europe wide something');

    assertIncorrect('then an University sdoj fixme sdoopsd');
    assertIncorrect('A 8-year old boy ...');
    assertIncorrect('A 18-year old boy ...');
    assertIncorrect('...asked an UN member.');
    assertIncorrect('In a un-united Germany...');

    // Test on acronyms/initials:
    assertCorrect('A. R.J. Turgot');

    // list items

    // mixed case as dictionary-based exception
    assertCorrect('Anyone for an MSc?');
    assertIncorrect('Anyone for a MSc?');
    // mixed case from general case
    assertCorrect('Anyone for an XMR-based writer?');

    // Test on apostrophes
    assertCorrect("Its name in English is a[1] (), plural A's, As, as, or a's.");

    // Both are correct according to Merriam Webster
    assertCorrect('An historic event');
    assertCorrect('A historic event');
  });

  // SKIPPED: these sentences of testRule need the English disambiguator (disambiguation.xml, F45/F48); no-op disambiguator used here
  it.skip('testRule (disambiguation dependent sentences)', () => {
    assertCorrect('Here, a and b are supplementary angles.');
    assertCorrect("The Qur'an was translated into Polish.");
    assertCorrect("He also wrote the comic strips Abbie an' Slats.");
    assertCorrect('Make sure that 3.a as well as 3.b are correct.');
  });

  // Java: AvsAnRuleTest#testSuggestions()
  it('testSuggestions', () => {
    expect(rule.suggestAorAn('string')).toBe('a string');
    expect(rule.suggestAorAn('university')).toBe('a university');
    expect(rule.suggestAorAn('hour')).toBe('an hour');
    expect(rule.suggestAorAn('all-terrain')).toBe('an all-terrain');
    expect(rule.suggestAorAn('UNESCO')).toBe('a UNESCO');
    expect(rule.suggestAorAn('historical')).toBe('a historical');
  });

  const getDeterminerFor = (word) => AvsAnRule.getCorrectDeterminerFor(new AnalyzedTokenReadings(new AnalyzedToken(word, 'fake-postag', 'fake-lemma'), 0));

  // Java: AvsAnRuleTest#testGetCorrectDeterminerFor()
  it('testGetCorrectDeterminerFor', () => {
    expect(getDeterminerFor('string')).toBe(Determiner.A);
    expect(getDeterminerFor('university')).toBe(Determiner.A);
    expect(getDeterminerFor('UNESCO')).toBe(Determiner.A);
    expect(getDeterminerFor('one-way')).toBe(Determiner.A);
    expect(getDeterminerFor('interesting')).toBe(Determiner.AN);
    expect(getDeterminerFor('hour')).toBe(Determiner.AN);
    expect(getDeterminerFor('all-terrain')).toBe(Determiner.AN);
    expect(getDeterminerFor('historical')).toBe(Determiner.A_OR_AN);
    expect(getDeterminerFor('')).toBe(Determiner.UNKNOWN);
    expect(getDeterminerFor('-way')).toBe(Determiner.UNKNOWN);
    expect(getDeterminerFor('camelCase')).toBe(Determiner.UNKNOWN);
  });

  // Java: AvsAnRuleTest#testGetCorrectDeterminerForException()
  it('testGetCorrectDeterminerForException', () => {
    expect(() => AvsAnRule.getCorrectDeterminerFor(null)).toThrow(/NullPointerException|null/);
  });

  // Java: AvsAnRuleTest#testPositions()
  it('testPositions', () => {
    const pos = (s, from, to) => {
      const matches = rule.match(lt.getAnalyzedSentence(s));
      expect(matches[0].getFromPos()).toBe(from);
      expect(matches[0].getToPos()).toBe(to);
    };
    // no quotes etc.:
    pos('a industry standard.', 0, 1);
    // quotes..
    pos('a "industry standard".', 0, 1);
    pos('a “industry standard”.', 0, 1);
    pos('a ‘industry standard’.', 0, 1);
    pos('a - industry standard".', 0, 1);
    pos('This is a "industry standard".', 8, 9);
    pos('"a industry standard".', 1, 2);
    pos('"Many say this is a industry standard".', 18, 19);
    pos('Like many "an desperado" before him, Bart headed south into Mexico.', 11, 13);
  });
});
