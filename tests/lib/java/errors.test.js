import { describe, it, expect } from 'vitest';
import {
  Throwable, RuntimeException, IllegalArgumentException, NumberFormatException, ExecutionException, NullPointerException,
  UncheckedIOException, IOException, PatternSyntaxException, ArrayIndexOutOfBoundsException, MissingResourceException,
  IllegalStateException, JavaError, AssertionError, SAXException, SAXParseException,
} from '../../../src/lib/java/errors.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

describe('errors (X-ERRORS)', () => {
  it('toString with and without message', () => {
    expect(new RuntimeException().toString()).toBe('java.lang.RuntimeException');
    expect(new RuntimeException('boom').toString()).toBe('java.lang.RuntimeException: boom');
    expect(new RuntimeException().getMessage()).toBeNull();
    expect(new RuntimeException('x') instanceof Throwable).toBe(true);
    expect(new RuntimeException('x') instanceof Error).toBe(true);
  });
  it('cause constructor uses cause.toString()', () => {
    const c = new IllegalArgumentException('bad');
    const e = new RuntimeException(c);
    expect(e.getMessage()).toBe('java.lang.IllegalArgumentException: bad');
    expect(e.getCause()).toBe(c);
    expect(new RuntimeException('m', c).getMessage()).toBe('m');
    expect(new ExecutionException(new RuntimeException(e)).getMessage()).toBe(
      'java.lang.RuntimeException: java.lang.RuntimeException: java.lang.IllegalArgumentException: bad');
  });
  it('hierarchy', () => {
    const e = new NumberFormatException('For input string: "x"');
    expect(e instanceof IllegalArgumentException).toBe(true);
    expect(e.javaClass).toBe('java.lang.NumberFormatException');
    expect(new ArrayIndexOutOfBoundsException('Index 1 out of bounds for length 1').javaClass).toBe('java.lang.ArrayIndexOutOfBoundsException');
  });
  it('UncheckedIOException', () => {
    const io = new IOException('disk');
    expect(new UncheckedIOException(io).getMessage()).toBe('java.io.IOException: disk');
    expect(new UncheckedIOException('m', io).getMessage()).toBe('m');
    assertThrowsJava(() => new UncheckedIOException(null), 'java.lang.NullPointerException');
  });
  it('PatternSyntaxException message', () => {
    const e = new PatternSyntaxException('Unclosed group', '(ab', 3);
    expect(e.getMessage()).toBe('Unclosed group near index 3\n(ab');
    expect(e.message).toBe(e.getMessage());
    expect(new PatternSyntaxException('Dangling meta character \'*\'', '*a', 0).getMessage()).toBe("Dangling meta character '*' near index 0\n*a\n^");
  });
  it('MissingResourceException and suppressed', () => {
    expect(new MissingResourceException('nope', 'Cls', 'key').getKey()).toBe('key');
    const e = new RuntimeException('a');
    e.addSuppressed(new NullPointerException('n'));
    expect(e.getSuppressed().length).toBe(1);
    assertThrowsJava(() => e.addSuppressed(e), 'java.lang.IllegalArgumentException', 'Self-suppression not permitted');
  });
  it('printStackTrace prints header, frames, Caused by', () => {
    const lines = [];
    const e = new RuntimeException(new IllegalArgumentException('bad'));
    e.printStackTrace({ println: (s) => lines.push(s) });
    expect(lines[0]).toBe('java.lang.RuntimeException: java.lang.IllegalArgumentException: bad');
    expect(lines.some((l) => l === 'Caused by: java.lang.IllegalArgumentException: bad')).toBe(true);
    expect(lines.some((l) => l.startsWith('\tat '))).toBe(true);
  });
  // expected strings below come from a JDK 17 run (java T.java)
  it('SAXParseException#toString combos (JDK 17 omits "; " before publicId)', () => {
    expect(new SAXParseException('m', 'pub', 'sys', 3, 4).toString()).toBe('org.xml.sax.SAXParseExceptionpublicId: pub; systemId: sys; lineNumber: 3; columnNumber: 4; m');
    expect(new SAXParseException('m', null, null, -1, -1).toString()).toBe('org.xml.sax.SAXParseException; m');
    expect(new SAXParseException('m', 'pub', null, -1, -1).toString()).toBe('org.xml.sax.SAXParseExceptionpublicId: pub; m');
    expect(new SAXParseException('m', null, 'sys', 0, 0).toString()).toBe('org.xml.sax.SAXParseException; systemId: sys; lineNumber: 0; columnNumber: 0; m');
    expect(new SAXParseException(null, null, 'sys', 5, -1).toString()).toBe('org.xml.sax.SAXParseException; systemId: sys; lineNumber: 5');
    expect(new SAXParseException('m', null, null, -1, 7).toString()).toBe('org.xml.sax.SAXParseException; columnNumber: 7; m');
    expect(new SAXParseException('m', 'pub', 'sys', 0, -1).toString()).toBe('org.xml.sax.SAXParseExceptionpublicId: pub; systemId: sys; lineNumber: 0; m');
    expect(new SAXParseException(null, 'pub', null, -1, -1).toString()).toBe('org.xml.sax.SAXParseExceptionpublicId: pub');
  });
  it('SAXException with wrapped exception', () => {
    const inner = new RuntimeException('inner');
    const e = new SAXException(inner);
    expect(e.toString()).toBe('org.xml.sax.SAXException: java.lang.RuntimeException: inner\njava.lang.RuntimeException: inner');
    expect(e.getMessage()).toBe('java.lang.RuntimeException: inner');
    expect(e.getCause()).toBe(inner);
    const e2 = new SAXException('x', inner);
    expect(e2.toString()).toBe('org.xml.sax.SAXException: x\njava.lang.RuntimeException: inner');
    expect(e2.getMessage()).toBe('x');
    expect(new SAXException(new RuntimeException()).getMessage()).toBe('java.lang.RuntimeException');
  });
  it('initCause preconditions', () => {
    const t = new RuntimeException('a');
    const self = assertThrowsJava(() => t.initCause(t), 'java.lang.IllegalArgumentException', 'Self-causation not permitted');
    expect(self.getCause()).toBe(t);
    assertThrowsJava(() => new RuntimeException('a', null).initCause(new JavaError('q')), 'java.lang.IllegalStateException', "Can't overwrite cause with java.lang.Error: q");
    assertThrowsJava(() => new RuntimeException('a', new JavaError('z')).initCause(new JavaError('q')), 'java.lang.IllegalStateException', "Can't overwrite cause with java.lang.Error: q");
    assertThrowsJava(() => new RuntimeException('a', null).initCause(null), 'java.lang.IllegalStateException', "Can't overwrite cause with a null");
    assertThrowsJava(() => new RuntimeException(new JavaError('z')).initCause(null), 'java.lang.IllegalStateException', "Can't overwrite cause with a null");
    const u = new RuntimeException('u');
    u.initCause(new JavaError('q'));
    expect(u.getCause().toString()).toBe('java.lang.Error: q');
    assertThrowsJava(() => u.initCause(new JavaError('r')), 'java.lang.IllegalStateException', "Can't overwrite cause with java.lang.Error: r");
    const v = new RuntimeException('u');
    v.initCause(null);
    expect(v.getCause()).toBeNull();
    assertThrowsJava(() => v.initCause(new JavaError('r')), 'java.lang.IllegalStateException', "Can't overwrite cause with java.lang.Error: r");
    const w = new RuntimeException();
    assertThrowsJava(() => w.initCause(w), 'java.lang.IllegalArgumentException', 'Self-causation not permitted');
    expect(new IllegalStateException('s', new RuntimeException('c')).getCause().getMessage()).toBe('c');
  });
  it('AssertionError(Object)', () => {
    expect(new AssertionError(null).getMessage()).toBe('null');
    expect(new AssertionError('s').getMessage()).toBe('s');
    expect(new AssertionError(5).getMessage()).toBe('5');
    expect(new AssertionError(1.5).getMessage()).toBe('1.5');
    expect(new AssertionError(-0).getMessage()).toBe('-0.0');
    const c = new RuntimeException('c');
    const e = new AssertionError(c);
    expect(e.getMessage()).toBe('java.lang.RuntimeException: c');
    expect(e.getCause()).toBe(c);
    expect(new AssertionError('s').getCause()).toBeNull();
    expect(new AssertionError('s', new JavaError('e')).getCause().toString()).toBe('java.lang.Error: e');
    expect(new AssertionError().getMessage()).toBeNull();
    assertThrowsJava(() => e.initCause(null), 'java.lang.IllegalStateException', "Can't overwrite cause with a null");
  });
  it('printStackTrace: "... N more", circular reference, suppressed', () => {
    const frames = (...f) => () => f;
    const top = new RuntimeException('top');
    const c1 = new IllegalStateException('c1');
    top.getStackTrace = frames('A.m(A.java:1)', 'B.n(B.java:2)');
    c1.getStackTrace = frames('C.m(C.java:1)', 'B.n(B.java:2)');
    top.initCause(c1);
    c1.initCause(top);
    const lines = [];
    top.printStackTrace({ println: (s) => lines.push(s) });
    expect(lines.join('\n')).toBe([
      'java.lang.RuntimeException: top', '\tat A.m(A.java:1)', '\tat B.n(B.java:2)',
      'Caused by: java.lang.IllegalStateException: c1', '\tat C.m(C.java:1)', '\t... 1 more',
      'Caused by: [CIRCULAR REFERENCE: java.lang.RuntimeException: top]'].join('\n'));
    const s1 = new RuntimeException('main');
    const s2 = new JavaError('sup');
    s1.getStackTrace = frames('A.m(A.java:1)', 'B.n(B.java:2)');
    s2.getStackTrace = frames('S.m(S.java:9)', 'B.n(B.java:2)');
    s1.addSuppressed(s2);
    const l2 = [];
    s1.printStackTrace({ println: (s) => l2.push(s) });
    expect(l2.join('\n')).toBe([
      'java.lang.RuntimeException: main', '\tat A.m(A.java:1)', '\tat B.n(B.java:2)',
      '\tSuppressed: java.lang.Error: sup', '\t\tat S.m(S.java:9)', '\t\t... 1 more'].join('\n'));
  });
});

describe('EmptyStackException (F51)', () => {
  it('has the java.util name and RuntimeException parent', async () => {
    const { EmptyStackException, RuntimeException } = await import('../../../src/lib/java/errors.js');
    const e = new EmptyStackException();
    expect(e.javaClass).toBe('java.util.EmptyStackException');
    expect(e).toBeInstanceOf(RuntimeException);
    expect(e.toString()).toBe('java.util.EmptyStackException');
  });
});
