// Java: org.languagetool.tools.InterruptibleCharSequence (JS regex engines never call charAt: interruption only via charAt)
import { InterruptedException, RuntimeException } from '../../lib/java/errors.js';
import { charAt, subSequence } from '../../lib/java/strings.js';
import { Thread } from '../../lib/java/Thread.js';

// Java: InterruptibleCharSequence
export class InterruptibleCharSequence {
  static FQCN = 'org.languagetool.tools.InterruptibleCharSequence';

  // Java: InterruptibleCharSequence#InterruptibleCharSequence(CharSequence)
  constructor(inner) {
    this.inner = inner;
  }

  // Java: InterruptibleCharSequence#charAt(int)
  charAt(index) {
    if (Thread.interrupted()) {
      throw new RuntimeException(new InterruptedException());
    }
    return charAt(this.inner, index);
  }

  // Java: InterruptibleCharSequence#length()
  length() {
    return this.inner.length;
  }

  // Java: InterruptibleCharSequence#subSequence(int,int)
  subSequence(start, end) {
    return new InterruptibleCharSequence(subSequence(this.inner, start, end));
  }

  // Java: InterruptibleCharSequence#toString()
  toString() {
    return String(this.inner);
  }
}

// JS: the check that Java's InterruptibleCharSequence#charAt performs on the first access of a non-empty input (V8 regexps never call charAt)
export function checkInterrupted(s) {
  if (s.length !== 0 && Thread.interrupted()) {
    throw new RuntimeException(new InterruptedException());
  }
}
