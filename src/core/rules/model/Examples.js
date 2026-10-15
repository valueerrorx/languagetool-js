// org.languagetool.rules.ExampleSentence, CorrectExample, IncorrectExample, ErrorTriggeringExample, Example
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { javaReplace } from '../../../lib/java/strings.js';

// Java: org.languagetool.rules.ExampleSentence
export class ExampleSentence {
  static FQCN = 'org.languagetool.rules.ExampleSentence';

  // Java: ExampleSentence#ExampleSentence(String)
  constructor(example) {
    this.example = Objects.requireNonNull(example);
    const markerStart = example.indexOf('<marker>');
    const markerEnd = example.indexOf('</marker>');
    if (markerStart !== -1 && markerEnd === -1) {
      throw new IllegalArgumentException(`Example contains <marker> but lacks </marker>:${example}`);
    }
    if (markerStart === -1 && markerEnd !== -1) {
      throw new IllegalArgumentException(`Example contains </marker> but lacks <marker>:${example}`);
    }
    if (markerStart > markerEnd) {
      throw new IllegalArgumentException(`Example <marker> comes before </marker>:${example}`);
    }
  }

  // Java: ExampleSentence#cleanMarkersInExample(String)
  static cleanMarkersInExample(str) {
    return javaReplace(javaReplace(str, '<marker>', ''), '</marker>', '');
  }

  // Java: ExampleSentence#getExample()
  getExample() {
    return this.example;
  }

  // Java: ExampleSentence#toString()
  toString() {
    return this.example;
  }
}

// Java: org.languagetool.rules.CorrectExample
export class CorrectExample extends ExampleSentence {
  static FQCN = 'org.languagetool.rules.CorrectExample';
}

// Java: org.languagetool.rules.ErrorTriggeringExample
export class ErrorTriggeringExample extends ExampleSentence {
  static FQCN = 'org.languagetool.rules.ErrorTriggeringExample';
}

// Java: org.languagetool.rules.IncorrectExample
export class IncorrectExample extends ExampleSentence {
  static FQCN = 'org.languagetool.rules.IncorrectExample';

  // Java: IncorrectExample#IncorrectExample(String[,List])
  constructor(example, corrections = []) {
    super(example);
    this.corrections = corrections.length === 0 ? null : corrections.length === 1 ? corrections[0] : corrections.slice();
  }

  // Java: IncorrectExample#getCorrections()
  getCorrections() {
    return this.corrections === null ? [] : typeof this.corrections === 'string' ? [this.corrections] : this.corrections.slice();
  }

  // Java: IncorrectExample#toString()
  toString() {
    return `${this.example} [${this.getCorrections().join(', ')}]`;
  }
}

// Java: org.languagetool.rules.Example
export const Example = {
  // Java: Example#wrong(String)
  wrong(example) {
    requireMarkup(example);
    return new IncorrectExample(example);
  },

  // Java: Example#fixed(String)
  fixed(example) {
    return new CorrectExample(example);
  },
};

// Java: Example#requireMarkup(String)
function requireMarkup(example) {
  if (!example.includes('<marker>') || !example.includes('</marker>')) {
    throw new IllegalArgumentException(`Example text must contain '<marker>...</marker>': ${example}`);
  }
}
