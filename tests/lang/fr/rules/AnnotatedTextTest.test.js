// Ported from AnnotatedTextTest (rules.fr package, fr module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../../../../src/core/text/AnnotatedTextBuilder.js';
import { French } from '../../../../src/lang/fr/language/French.js';

describe('AnnotatedTextTest (fr)', () => {
  const lt = new JLanguageTool(French.getInstance());

  // Java: AnnotatedTextTest#testInterpretAsBefore
  it('testInterpretAsBefore', () => {
    // "échapatoire" should be "échappatoire" with two 'p'
    const textToCheck = 'Une &eacute;chapatoire est possible.';
    const builder = new AnnotatedTextBuilder()
      .addText('Une ')
      .addMarkup('&eacute;', 'é')
      .addText('chapatoire est possible.');
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('&eacute;chapatoire');
  });

  // Java: AnnotatedTextTest#testInterpretAsAfter
  it('testInterpretAsAfter', () => {
    // "trouuvé" should be "trouvé"
    const textToCheck = "J'ai trouuv&eacute; le livre.";
    const builder = new AnnotatedTextBuilder()
      .addText("J'ai trouuv")
      .addMarkup('&eacute;', 'é')
      .addText(' le livre.');
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('trouuv&eacute;');
  });

  // Java: AnnotatedTextTest#testWithSimpleMarkup
  it('testWithSimpleMarkup', () => {
    // "louper" should be "loupé"
    const textToCheck = "J'ai louper le train.<span> Ce n'était pas dans mes habitudes.</span>";
    const builder = new AnnotatedTextBuilder()
      .addText("J'ai louper le train.")
      .addMarkup('<span>')
      .addText(" Ce n'était pas dans mes habitudes.")
      .addMarkup('</span>');
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('louper');
  });

  // Java: AnnotatedTextTest#testWithMultipleSimpleMarkup
  it('testWithMultipleSimpleMarkup', () => {
    // "louper" should be "loupé"
    const textToCheck = "J'ai louper le train.<span> Ce n'était pas dans mes habitudes.</span>";
    const builder = new AnnotatedTextBuilder()
      .addText("J'ai louper le train.")
      .addMarkup('<span>')
      .addText(" Ce n'était pas dans mes habitudes.")
      .addMarkup('</span>')
      .addMarkup('<span>')
      .addMarkup('</span>');
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('louper');
  });

  // Java: AnnotatedTextTest#testWithFakeMarkupInSimpleMarkupeMarkup
  it('testWithFakeMarkupInSimpleMarkupeMarkup', () => {
    // "échapatoire" should be "échappatoire" with two 'p'
    const textToCheck = "Une <span class='red'>&eacute;chapatoire</span> est possible.";
    const builder = new AnnotatedTextBuilder()
      .addText('Une ')
      .addMarkup("<span class='red'>")
      .addMarkup('&eacute;', 'é')
      .addText('chapatoire')
      .addMarkup('</span>')
      .addText(' est possible.');
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('&eacute;chapatoire');
  });

  // Java: AnnotatedTextTest#testWithBr
  it('testWithBr', () => {
    // "louper" should be "loupé"
    const textToCheck = "J'ai louper le train.<br/> Ce n'était pas dans mes habitudes.";
    const builder = new AnnotatedTextBuilder()
      .addText("J'ai louper le train.")
      .addMarkup('<br/>', '\n')
      .addText(" Ce n'était pas dans mes habitudes.");
    const match = lt.check(builder.build())[0];
    expect(textToCheck.substring(match.getFromPos(), match.getToPos())).toBe('louper');
  });
});
