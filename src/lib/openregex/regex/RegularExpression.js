// edu.washington.cs.knowitall.regex.RegularExpression (openregex 1.1.1): regular expression over token lists
import { stringHashCode } from '../../java/strings.js';
import { MatchingGroup } from './Expression.js';
import { RegularExpressionParser } from './RegularExpressionParser.js';

// Java: RegularExpression<E>
export class RegularExpression {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpression';

  // Java: RegularExpression#RegularExpression(List)
  constructor(expressions) {
    this.expressions = expressions;
    this.auto = RegularExpression.build(expressions);
  }

  // Java: RegularExpression#compile(List) / compile(String,Function)
  static compile(expressionsOrString, factoryDelegate) {
    if (typeof expressionsOrString === 'string') {
      const parser = new (class extends RegularExpressionParser {
        static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpression$1';

        // Java: RegularExpression$1#factory(String)
        factory(string) {
          return factoryDelegate.apply(string);
        }
      })();
      return parser.parse(expressionsOrString);
    }
    return new RegularExpression(expressionsOrString);
  }

  // Java: RegularExpression#equals(Object)
  equals(obj) {
    if (!(obj instanceof RegularExpression)) {
      return false;
    }
    return this.toString() === obj.toString();
  }

  // Java: RegularExpression#hashCode()
  hashCode() {
    return stringHashCode(this.toString());
  }

  // Java: RegularExpression#toString()
  toString() {
    return this.expressions.map((e) => e.toString()).join(' ');
  }

  // Java: RegularExpression#build(List)
  static build(expressions) {
    const group = new MatchingGroup(expressions);
    return group.build();
  }

  // Java: RegularExpression#apply(List)
  apply(tokens) {
    return this.find(tokens) !== null;
  }

  // Java: RegularExpression#matches(List)
  matches(tokens) {
    const match = this.lookingAt(tokens, 0);
    return match !== null && match.endIndex() === tokens.length;
  }

  // Java: RegularExpression#find(List) / find(List,int)
  find(tokens, start = 0) {
    for (let i = start; i <= tokens.length - this.auto.minMatchingLength(); i++) {
      const match = this.lookingAt(tokens, i);
      if (match !== null) {
        return match;
      }
    }
    return null;
  }

  // Java: RegularExpression#lookingAt(List) / lookingAt(List,int)
  lookingAt(tokens, start = 0) {
    return this.auto.lookingAt(tokens, start);
  }

  // Java: RegularExpression#match(List)
  match(tokens) {
    const match = this.lookingAt(tokens, 0);
    if (match !== null && match.endIndex() === tokens.length) {
      return match;
    }
    return null;
  }

  // Java: RegularExpression#findAll(List)
  findAll(tokens) {
    const matches = [];
    let i = 0;
    let match;
    do {
      match = this.find(tokens, i);
      if (match !== null) {
        i = match.endIndex();
        if (!match.isEmpty()) {
          matches.push(match);
        }
      }
    } while (match !== null);
    return matches;
  }
}
