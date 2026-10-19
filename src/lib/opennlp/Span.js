// opennlp.tools.util.Span
import { IllegalArgumentException } from '../java/errors.js';

// Java: opennlp.tools.util.Span
export class Span {
  static FQCN = 'opennlp.tools.util.Span';

  // Java: Span#Span(int,int,String) / (int,int)
  constructor(s, e, type = null) {
    if (s < 0) throw new IllegalArgumentException('start index must be zero or greater: ' + s);
    if (e < 0) throw new IllegalArgumentException('end index must be zero or greater: ' + e);
    if (s > e) throw new IllegalArgumentException('start index must not be larger than end index: start=' + s + ', end=' + e);
    this.start = s;
    this.end = e;
    this.type = type;
  }

  // Java: Span#getStart()
  getStart() {
    return this.start;
  }

  // Java: Span#getEnd()
  getEnd() {
    return this.end;
  }

  // Java: Span#toString()
  toString() {
    let toStringBuffer = '[' + this.start + '..' + this.end + ')';
    if (this.type !== null) toStringBuffer += ' ' + this.type;
    return toStringBuffer;
  }
}
