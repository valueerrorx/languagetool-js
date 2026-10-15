// Ported from ContextToolsTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { ContextTools } from '../../src/core/text/ContextTools.js';

describe('ContextToolsTest', () => {
  // Java: ContextToolsTest#testGetContext
  it('testGetContext', () => {
    const contextTools = new ContextTools();
    const context = contextTools.getContext(4, 8, 'Hi, this is some nice text waiting for its error markers.');
    expect(context).toBe('Hi, <b><font bgcolor="#ff8b8b">this</font></b> is some nice text waiting for its error...');
    const context2 = contextTools.getContext(3, 5, 'xxx\n \nyyy');
    expect(context2).toBe('xxx<b><font bgcolor="#ff8b8b">&nbsp;&nbsp;</font></b> yyy');
  });

  // Java: ContextToolsTest#testPlainTextContext
  it('testPlainTextContext', () => {
    const contextTools = new ContextTools();
    contextTools.setContextSize(5);
    const input = "This is a test sentence. Here's another sentence with more text.";
    expect(contextTools.getPlainTextContext(8, 14, input)).toBe('...s is a test sent...\n        ^^^^^^     ');
  });

  // Java: ContextToolsTest#testPlainTextContextWithLineBreaks
  it('testPlainTextContextWithLineBreaks', () => {
    const contextTools = new ContextTools();
    contextTools.setContextSize(5);
    const input = "One.\nThis is a test sentence.\nHere's another sentence.";
    expect(contextTools.getPlainTextContext(15, 19, input)).toBe('...is a test sent...\n        ^^^^     ');
  });

  // Java: ContextToolsTest#testPlainTextContextWithDosLineBreaks
  it('testPlainTextContextWithDosLineBreaks', () => {
    const contextTools = new ContextTools();
    contextTools.setContextSize(5);
    const input = "One.\r\nThis is a test sentence.\r\nHere's another sentence.";
    expect(contextTools.getPlainTextContext(16, 20, input)).toBe('...is a test sent...\n        ^^^^     ');
  });

  // Java: ContextToolsTest#testLargerContext
  it('testLargerContext', () => {
    const contextTools = new ContextTools();
    contextTools.setContextSize(100);
    const context = contextTools.getContext(4, 8, 'Hi, this is some nice text waiting for its error markers.');
    expect(context).toBe('Hi, <b><font bgcolor="#ff8b8b">this</font></b> is some nice text waiting for its error markers.');
  });

  // Java: ContextToolsTest#testHtmlEscape
  it('testHtmlEscape', () => {
    const contextTools = new ContextTools();
    expect(contextTools.getContext(0, 2, 'Hi, this is <html>.')).toBe('<b><font bgcolor="#ff8b8b">Hi</font></b>, this is &lt;html&gt;.');
    contextTools.setEscapeHtml(false);
    expect(contextTools.getContext(0, 2, 'Hi, this is <html>.')).toBe('<b><font bgcolor="#ff8b8b">Hi</font></b>, this is <html>.');
  });

  // Java: ContextToolsTest#testMarkers
  it('testMarkers', () => {
    const contextTools = new ContextTools();
    contextTools.setErrorMarker('<X>', '</X>');
    expect(contextTools.getContext(0, 2, 'Hi, this is it.')).toBe('<X>Hi</X>, this is it.');
  });
});
