// Java exception hierarchy (java.lang.Throwable and subclasses); see ARCHITECTURE.md section 11.
import { Objects, valueOf } from './Objects.js';

// Java: java.lang.Throwable
export class Throwable extends Error {
  static FQCN = 'java.lang.Throwable';

  // Java: Throwable#Throwable() / (String) / (String,Throwable) / (Throwable)
  // SEMANTICS P14b: Java new X((Throwable) null) is ported as new X(null, null); new X(null) means (String) null.
  constructor(...args) {
    super();
    let message = null;
    let cause = null;
    let causeSet = false;
    if (args.length === 1 && args[0] instanceof Throwable) {
      cause = args[0]; // Java: Throwable(Throwable)
      causeSet = true;
      message = cause.toString();
    } else if (args.length >= 1) {
      message = args[0] === undefined ? null : args[0]; // Java: Throwable(String[,Throwable])
      if (args.length >= 2) {
        cause = args[1] ?? null;
        causeSet = true;
      }
    }
    Object.defineProperty(this, 'message', { value: message, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(this, '_cause', { value: cause, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(this, '_causeSet', { value: causeSet, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(this, '_suppressed', { value: [], writable: true, configurable: true, enumerable: false });
  }

  // fully qualified Java class name
  get javaClass() {
    return this.constructor.FQCN;
  }

  // JS-side view of Throwable#getCause() for generic error reporters (parity envelope)
  get cause() {
    return this._cause ?? undefined;
  }

  // Java: Throwable#getMessage()
  getMessage() {
    return this.message;
  }

  // Java: Throwable#getLocalizedMessage()
  getLocalizedMessage() {
    return this.getMessage();
  }

  // Java: Throwable#getCause()
  getCause() {
    return this._cause;
  }

  // Java: Throwable#initCause(Throwable)
  initCause(cause) {
    if (this._causeSet) throw new IllegalStateException(`Can't overwrite cause with ${Objects.toString(cause, 'a null')}`, this);
    if (cause === this) throw new IllegalArgumentException('Self-causation not permitted', this);
    this._cause = cause ?? null;
    this._causeSet = true;
    return this;
  }

  // Java: Throwable#addSuppressed(Throwable)
  addSuppressed(t) {
    if (t === this) throw new IllegalArgumentException('Self-suppression not permitted', t);
    if (t === null || t === undefined) throw new NullPointerException('Cannot suppress a null exception.');
    this._suppressed.push(t);
  }

  // Java: Throwable#getSuppressed()
  getSuppressed() {
    return this._suppressed.slice();
  }

  // Java: Throwable#toString()
  toString() {
    const s = this.javaClass;
    const m = this.getLocalizedMessage();
    return m !== null && m !== undefined ? `${s}: ${m}` : s;
  }

  // Java: Throwable#getStackTrace() (frames come from the JS stack, DEV-003)
  getStackTrace() {
    return String(this.stack ?? '').split('\n').filter((l) => /^\s+at /.test(l)).map((l) => l.trim().slice(3));
  }

  // Java: Throwable#printStackTrace(PrintStream) (stream = object with println, default stderr)
  printStackTrace(stream) {
    const out = stream ?? { println: (s) => process.stderr.write(`${s}\n`) };
    const dejaVu = new Set();
    dejaVu.add(this);
    out.println(this.toString());
    const trace = this.getStackTrace();
    for (const f of trace) out.println(`\tat ${f}`);
    for (const se of this._suppressed) se._printEnclosed(out, trace, 'Suppressed: ', '\t', dejaVu);
    const ourCause = this.getCause();
    if (ourCause) ourCause._printEnclosed(out, trace, 'Caused by: ', '', dejaVu);
  }

  // Java: Throwable#printEnclosedStackTrace(PrintStreamOrWriter,StackTraceElement[],String,String,Set)
  _printEnclosed(out, enclosingTrace, caption, prefix, dejaVu) {
    if (dejaVu.has(this)) {
      out.println(`${prefix}${caption}[CIRCULAR REFERENCE: ${this.toString()}]`);
      return;
    }
    dejaVu.add(this);
    const trace = this.getStackTrace();
    let m = trace.length - 1;
    let n = enclosingTrace.length - 1;
    while (m >= 0 && n >= 0 && trace[m] === enclosingTrace[n]) {
      m--;
      n--;
    }
    const framesInCommon = trace.length - 1 - m;
    out.println(`${prefix}${caption}${this.toString()}`);
    for (let i = 0; i <= m; i++) out.println(`${prefix}\tat ${trace[i]}`);
    if (framesInCommon !== 0) out.println(`${prefix}\t... ${framesInCommon} more`);
    for (const se of this._suppressed) se._printEnclosed(out, trace, 'Suppressed: ', `${prefix}\t`, dejaVu);
    const ourCause = this.getCause();
    if (ourCause) ourCause._printEnclosed(out, trace, 'Caused by: ', prefix, dejaVu);
  }
}

// creates a subclass with a JDK fully qualified name
function defineThrowable(name, Parent, fqcn) {
  const C = class extends Parent {
    static FQCN = fqcn;
  };
  Object.defineProperty(C, 'name', { value: name });
  return C;
}

export const Exception = defineThrowable('Exception', Throwable, 'java.lang.Exception');
export const RuntimeException = defineThrowable('RuntimeException', Exception, 'java.lang.RuntimeException');
export const JavaError = defineThrowable('Error', Throwable, 'java.lang.Error');
export const IllegalArgumentException = defineThrowable('IllegalArgumentException', RuntimeException, 'java.lang.IllegalArgumentException');
export const IllegalStateException = defineThrowable('IllegalStateException', RuntimeException, 'java.lang.IllegalStateException');
export const NullPointerException = defineThrowable('NullPointerException', RuntimeException, 'java.lang.NullPointerException');
export const ClassCastException = defineThrowable('ClassCastException', RuntimeException, 'java.lang.ClassCastException');
export const ArithmeticException = defineThrowable('ArithmeticException', RuntimeException, 'java.lang.ArithmeticException');
export const UnsupportedOperationException = defineThrowable('UnsupportedOperationException', RuntimeException, 'java.lang.UnsupportedOperationException');
export const NumberFormatException = defineThrowable('NumberFormatException', IllegalArgumentException, 'java.lang.NumberFormatException');
export const IndexOutOfBoundsException = defineThrowable('IndexOutOfBoundsException', RuntimeException, 'java.lang.IndexOutOfBoundsException');
export const ArrayIndexOutOfBoundsException = defineThrowable('ArrayIndexOutOfBoundsException', IndexOutOfBoundsException, 'java.lang.ArrayIndexOutOfBoundsException');
export const StringIndexOutOfBoundsException = defineThrowable('StringIndexOutOfBoundsException', IndexOutOfBoundsException, 'java.lang.StringIndexOutOfBoundsException');
export const NegativeArraySizeException = defineThrowable('NegativeArraySizeException', RuntimeException, 'java.lang.NegativeArraySizeException');
export const ConcurrentModificationException = defineThrowable('ConcurrentModificationException', RuntimeException, 'java.util.ConcurrentModificationException');
export const DateTimeParseException = defineThrowable('DateTimeParseException', RuntimeException, 'java.time.format.DateTimeParseException');
export const NoSuchElementException = defineThrowable('NoSuchElementException', RuntimeException, 'java.util.NoSuchElementException');
export const InterruptedException = defineThrowable('InterruptedException', Exception, 'java.lang.InterruptedException');
export const CloneNotSupportedException = defineThrowable('CloneNotSupportedException', Exception, 'java.lang.CloneNotSupportedException');
export const ReflectiveOperationException = defineThrowable('ReflectiveOperationException', Exception, 'java.lang.ReflectiveOperationException');
export const InstantiationException = defineThrowable('InstantiationException', ReflectiveOperationException, 'java.lang.InstantiationException');
export const ClassNotFoundException = defineThrowable('ClassNotFoundException', ReflectiveOperationException, 'java.lang.ClassNotFoundException');
export const IOException = defineThrowable('IOException', Exception, 'java.io.IOException');
export const FileNotFoundException = defineThrowable('FileNotFoundException', IOException, 'java.io.FileNotFoundException');
export const UnsupportedEncodingException = defineThrowable('UnsupportedEncodingException', IOException, 'java.io.UnsupportedEncodingException');
export const MalformedInputException = defineThrowable('MalformedInputException', IOException, 'java.nio.charset.MalformedInputException');
export const EOFException = defineThrowable('EOFException', IOException, 'java.io.EOFException');
export const UnmappableCharacterException = defineThrowable('UnmappableCharacterException', IOException, 'java.nio.charset.UnmappableCharacterException');
export const NoSuchFileException = defineThrowable('NoSuchFileException', IOException, 'java.nio.file.NoSuchFileException');
export const BufferOverflowException = defineThrowable('BufferOverflowException', RuntimeException, 'java.nio.BufferOverflowException');
export const UnsupportedCharsetException = defineThrowable('UnsupportedCharsetException', IllegalArgumentException, 'java.nio.charset.UnsupportedCharsetException');
export const IllegalCharsetNameException = defineThrowable('IllegalCharsetNameException', IllegalArgumentException, 'java.nio.charset.IllegalCharsetNameException');
export const ExecutionException = defineThrowable('ExecutionException', Exception, 'java.util.concurrent.ExecutionException');
export const TimeoutException = defineThrowable('TimeoutException', Exception, 'java.util.concurrent.TimeoutException');
export const RejectedExecutionException = defineThrowable('RejectedExecutionException', RuntimeException, 'java.util.concurrent.RejectedExecutionException');
export const CancellationException = defineThrowable('CancellationException', IllegalStateException, 'java.util.concurrent.CancellationException');
export const AbstractMethodError = defineThrowable('AbstractMethodError', JavaError, 'java.lang.AbstractMethodError');
export const VirtualMachineError = defineThrowable('VirtualMachineError', JavaError, 'java.lang.VirtualMachineError');
export const StackOverflowError = defineThrowable('StackOverflowError', VirtualMachineError, 'java.lang.StackOverflowError');
export const OutOfMemoryError = defineThrowable('OutOfMemoryError', VirtualMachineError, 'java.lang.OutOfMemoryError');
export const NotImplementedException = defineThrowable('NotImplementedException', UnsupportedOperationException, 'org.apache.commons.lang3.NotImplementedException');

// Java: java.lang.AssertionError (constructors (), (Object), (String,Throwable))
export class AssertionError extends JavaError {
  static FQCN = 'java.lang.AssertionError';

  // Java: AssertionError#AssertionError() / (Object) / (String,Throwable)
  constructor(...args) {
    if (args.length >= 2) {
      super(args[0], args[1]);
    } else if (args.length === 1) {
      const detail = args[0];
      super(valueOf(detail)); // Java: this(String.valueOf(detail))
      if (detail instanceof Throwable) this.initCause(detail);
    } else {
      super();
    }
  }
}

// Java: org.xml.sax.SAXException (constructors (), (String), (Exception), (String,Exception))
export class SAXException extends Exception {
  static FQCN = 'org.xml.sax.SAXException';

  // Java: SAXException#SAXException() / (String) / (Exception) / (String,Exception)
  constructor(...args) {
    super(...args);
    const last = args.length >= 1 ? args[args.length - 1] : null;
    Object.defineProperty(this, 'exception', { value: last instanceof Throwable ? last : null, writable: true, configurable: true, enumerable: false });
  }

  // Java: SAXException#getException()
  getException() {
    return this.exception;
  }

  // Java: SAXException#getMessage()
  getMessage() {
    const message = super.getMessage();
    if (message === null && this.exception !== null) return this.exception.getMessage();
    return message;
  }

  // Java: SAXException#getCause()
  getCause() {
    return this.exception;
  }

  // Java: SAXException#toString()
  toString() {
    if (this.exception !== null) return `${super.toString()}\n${this.exception.toString()}`;
    return super.toString();
  }
}

// Java: javax.xml.transform.TransformerException (message)
export const TransformerException = defineThrowable('TransformerException', Exception, 'javax.xml.transform.TransformerException');
// Java: javax.xml.xpath.XPathExpressionException (cause)
export const XPathExpressionException = defineThrowable('XPathExpressionException', Exception, 'javax.xml.xpath.XPathExpressionException');

// Java: java.lang.reflect.InvocationTargetException (constructor (Throwable): message null, getCause() = target)
export class InvocationTargetException extends ReflectiveOperationException {
  static FQCN = 'java.lang.reflect.InvocationTargetException';

  // Java: InvocationTargetException#InvocationTargetException(Throwable)
  constructor(target) {
    super();
    Object.defineProperty(this, 'target', { value: target ?? null, writable: true, configurable: true, enumerable: false });
    this._cause = this.target;
    this._causeSet = true;
  }

  // Java: InvocationTargetException#getTargetException()
  getTargetException() {
    return this.target;
  }

  // Java: InvocationTargetException#getCause()
  getCause() {
    return this.target;
  }
}

// Java: java.io.UncheckedIOException (constructors (String,IOException) and (IOException); null cause -> NPE)
export class UncheckedIOException extends RuntimeException {
  static FQCN = 'java.io.UncheckedIOException';

  // Java: UncheckedIOException#UncheckedIOException(String,IOException) / (IOException)
  constructor(...args) {
    if (args.length === 1) super(requireCause(args[0]));
    else super(args[0], requireCause(args[1]));
  }
}

// Java: Objects.requireNonNull(cause) as used by UncheckedIOException
function requireCause(cause) {
  if (cause === null || cause === undefined) throw new NullPointerException();
  return cause;
}

// Java: java.util.regex.PatternSyntaxException
export class PatternSyntaxException extends IllegalArgumentException {
  static FQCN = 'java.util.regex.PatternSyntaxException';

  // Java: PatternSyntaxException#PatternSyntaxException(String,String,int)
  constructor(desc, regex, index) {
    super();
    this.desc = desc;
    this.pattern = regex;
    this.index = index;
    Object.defineProperty(this, 'message', { get: () => this.getMessage(), configurable: true, enumerable: false });
  }

  // Java: PatternSyntaxException#getIndex()
  getIndex() {
    return this.index;
  }

  // Java: PatternSyntaxException#getDescription()
  getDescription() {
    return this.desc;
  }

  // Java: PatternSyntaxException#getPattern()
  getPattern() {
    return this.pattern;
  }

  // Java: PatternSyntaxException#getMessage()
  getMessage() {
    let sb = this.desc;
    if (this.index >= 0) {
      sb += ` near index ${this.index}`;
    }
    sb += '\n';
    sb += this.pattern;
    if (this.index >= 0 && this.pattern !== null && this.index < this.pattern.length) {
      sb += '\n';
      for (let i = 0; i < this.index; i++) sb += ' ';
      sb += '^';
    }
    return sb;
  }
}

// Java: java.util.MissingResourceException
export class MissingResourceException extends RuntimeException {
  static FQCN = 'java.util.MissingResourceException';

  // Java: MissingResourceException#MissingResourceException(String,String,String)
  constructor(s, className, key) {
    super(s);
    this.className = className;
    this.key = key;
  }

  // Java: MissingResourceException#getClassName()
  getClassName() {
    return this.className;
  }

  // Java: MissingResourceException#getKey()
  getKey() {
    return this.key;
  }
}

// Java: org.xml.sax.SAXParseException (message and position only)
export class SAXParseException extends SAXException {
  static FQCN = 'org.xml.sax.SAXParseException';

  // Java: SAXParseException#SAXParseException(String,String,String,int,int)
  constructor(message, publicId = null, systemId = null, lineNumber = -1, columnNumber = -1) {
    super(message);
    this.publicId = publicId;
    this.systemId = systemId;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }

  // Java: SAXParseException#getLineNumber()
  getLineNumber() {
    return this.lineNumber;
  }

  // Java: SAXParseException#getColumnNumber()
  getColumnNumber() {
    return this.columnNumber;
  }

  // Java: SAXParseException#toString()
  toString() {
    let buf = this.javaClass;
    const m = this.getLocalizedMessage();
    if (this.publicId !== null) buf += `publicId: ${this.publicId}`; // JDK 17 omits the "; " prefix here
    if (this.systemId !== null) buf += `; systemId: ${this.systemId}`;
    if (this.lineNumber !== -1) buf += `; lineNumber: ${this.lineNumber}`;
    if (this.columnNumber !== -1) buf += `; columnNumber: ${this.columnNumber}`;
    if (m !== null && m !== undefined) buf += `; ${m}`;
    return buf;
  }
}

// true for ported Java throwables (used by catch sites to tell them from JS-native errors)
export function isThrowable(e) {
  return e instanceof Throwable;
}

