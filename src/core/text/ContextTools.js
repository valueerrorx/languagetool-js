// org.languagetool.tools.ContextTools
import { NullPointerException } from '../../lib/java/errors.js';
import { substring, replaceChar, indexOfChar, lastIndexOf } from '../../lib/java/strings.js';
import { escapeHTML } from './StringTools.js';

// Java: StringUtils.repeat(char,int)
function repeatChar(ch, n) {
  return n <= 0 ? '' : ch.repeat(n);
}

// Java: s.length() on the contents argument
function contentsOf(contents) {
  if (contents === null || contents === undefined) throw new NullPointerException('Cannot invoke "String.length()" because "contents" is null');
  return contents;
}

export class ContextTools {
  static FQCN = 'org.languagetool.tools.ContextTools';

  // Java: ContextTools#ContextTools()
  constructor() {
    this.contextSize = 40;
    this.escapeHtml = true;
    this.errorMarkerStart = '<b><font bgcolor="#ff8b8b">';
    this.errorMarkerEnd = '</font></b>';
  }

  // Java: ContextTools#getContext(int,int,String)
  getContext(fromPos, toPos, contents) {
    // calculate context region:
    let startContent = fromPos - this.contextSize;
    let prefix = '...';
    let postfix = '...';
    if (startContent < 0) {
      prefix = '';
      startContent = 0;
    }
    let endContent = toPos + this.contextSize;
    const textLength = contentsOf(contents).length;
    if (endContent > textLength) {
      postfix = '';
      endContent = textLength;
    }
    // now build context string plus marker:
    let sb = '';
    sb += prefix;
    sb += replaceChar(substring(contents, startContent, endContent), 0x0a, 0x20);
    const markerStr = ContextTools.getMarker(fromPos, toPos, startContent, endContent, prefix);
    sb += postfix;
    const startMark = indexOfChar(markerStr, 0x5e);
    const endMark = lastIndexOf(markerStr, '^');
    let result = sb;
    if (this.escapeHtml) {
      const escapedErrorPart = escapeHTML(substring(result, startMark, endMark + 1))
        .split(' ').join('&nbsp;'); // make sure whitespace errors are visible
      result = escapeHTML(substring(result, 0, startMark))
          + this.errorMarkerStart
          + escapedErrorPart
          + this.errorMarkerEnd + escapeHTML(substring(result, endMark + 1));
    } else {
      result = substring(result, 0, startMark) + this.errorMarkerStart
          + substring(result, startMark, endMark + 1) + this.errorMarkerEnd
          + substring(result, endMark + 1);
    }
    return result;
  }

  // Java: ContextTools#getPlainTextContext(int,int,String)
  getPlainTextContext(fromPos, toPos, contents) {
    // calculate context region:
    let startContent = fromPos - this.contextSize;
    let prefix = '...';
    let postfix = '...';
    if (startContent < 0) {
      prefix = '';
      startContent = 0;
    }
    let endContent = toPos + this.contextSize;
    if (endContent > contentsOf(contents).length) {
      postfix = '';
      endContent = contents.length;
    }
    return prefix +
           replaceChar(replaceChar(replaceChar(substring(contents, startContent, endContent), 0x0a, 0x20), 0x0d, 0x20), 0x09, 0x20) +
           postfix + '\n' +
           ContextTools.getMarker(fromPos, toPos, startContent, endContent, prefix);
  }

  // Java: ContextTools#setErrorMarker(String,String)
  setErrorMarker(start, end) {
    this.errorMarkerStart = start;
    this.errorMarkerEnd = end;
  }

  // Java: ContextTools#setErrorMarkerStart(String)
  setErrorMarkerStart(errorMarkerStart) {
    this.errorMarkerStart = errorMarkerStart;
  }

  // Java: ContextTools#setErrorMarkerEnd(String)
  setErrorMarkerEnd(errorMarkerEnd) {
    this.errorMarkerEnd = errorMarkerEnd;
  }

  // Java: ContextTools#setContextSize(int)
  setContextSize(contextSize) {
    this.contextSize = contextSize;
  }

  // Java: ContextTools#setEscapeHtml(boolean)
  setEscapeHtml(escapeHtml) {
    this.escapeHtml = escapeHtml;
  }

  // Java: ContextTools#getMarker(int,int,int,int,String)
  static getMarker(fromPos, toPos, startContent, endContent, prefix) {
    return repeatChar(' ', prefix.length + fromPos - startContent) +
           repeatChar('^', toPos - fromPos) +
           repeatChar(' ', endContent - toPos);
  }
}
