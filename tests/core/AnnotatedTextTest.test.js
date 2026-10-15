// Ported from AnnotatedTextTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { MetaDataKey } from '../../src/core/text/AnnotatedText.js';
import { ContextTools } from '../../src/core/text/ContextTools.js';

describe('AnnotatedTextTest', () => {
  // Java: AnnotatedTextTest#test
  it('test', () => {
    const text = new AnnotatedTextBuilder()
      .addGlobalMetaData('foo', 'val')
      .addGlobalMetaData(MetaDataKey.EmailToAddress, 'Foo Bar <foo@foobar.org>')
      // hello <b>user!</b>
      .addText('hello ')
      .addMarkup('<b>')
      .addText('user!')
      .addMarkup('</b>')
      .build();
    expect(text.getGlobalMetaData('foo', '')).toBe('val');
    expect(text.getGlobalMetaData('non-existing-key', 'xxx')).toBe('xxx');
    expect(text.getGlobalMetaData(MetaDataKey.EmailToAddress, 'xxx')).toBe('Foo Bar <foo@foobar.org>');
    expect(text.getGlobalMetaData(MetaDataKey.DocumentTitle, 'default-title')).toBe('default-title');
    expect(text.getPlainText()).toBe('hello user!');
    expect(text.getOriginalTextPositionFor(0, false)).toBe(0);
    expect(text.getOriginalTextPositionFor(5, false)).toBe(5);
    expect(text.getOriginalTextPositionFor(6, false)).toBe(9);
    expect(text.getOriginalTextPositionFor(7, false)).toBe(10);
    expect(text.getOriginalTextPositionFor(8, false)).toBe(11);
  });

  // Java: AnnotatedTextTest#testIgnoreInterpretAs
  it('testIgnoreInterpretAs', () => {
    const text = new AnnotatedTextBuilder()
      .addText('hello ')
      .addMarkup('<p>', '\n\n')
      .addText('more xxxx text!')
      .build();
    expect(text.getPlainText()).toBe('hello \n\nmore xxxx text!');
    expect(text.getTextWithMarkup()).toBe('hello <p>more xxxx text!');
    const contextTools = new ContextTools();
    contextTools.setErrorMarker('#', '#');
    contextTools.setEscapeHtml(false);
    expect(contextTools.getContext(14, 18, text.getTextWithMarkup())).toBe('hello <p>more #xxxx# text!');
  });
});
