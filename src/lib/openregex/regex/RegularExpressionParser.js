// edu.washington.cs.knowitall.regex.RegularExpressionParser (openregex 1.1.1): tokenizer of regular expression strings
import { IllegalStateException, IndexOutOfBoundsException } from '../../java/errors.js';
import { Pattern } from '../../java/regex/index.js';
import { Integer } from '../../java/int.js';
import {
  NamedGroup, NonMatchingGroup, MatchingGroup, StartAssertion, EndAssertion, Or, Option, Star, Plus, MinMax,
} from './Expression.js';
import { TokenizationRegexException } from './RegexException.js';
import { RegularExpression } from './RegularExpression.js';

// Java: RegularExpressionParser#indexOfClose(String,int,char,char) (private static)
function indexOfClose(string, index, open, close) {
  index--;
  let depth = 0;
  do {
    index++;
    if (index >= string.length) {
      return -1;
    }
    const c = string.charAt(index);
    if (c === open) {
      depth++;
    } else if (c === close) {
      depth--;
    }
  } while (depth > 0);
  return index;
}

// Java: RegularExpressionParser<E> (abstract; factory(String) is implemented by subclasses)
export class RegularExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParser';

  // Java: RegularExpressionParser#parse(String)
  parse(string) {
    const expressions = this.tokenize(string);
    return new RegularExpression(expressions);
  }

  // Java: RegularExpressionParser#apply(String)
  apply(argument) {
    return this.parse(argument);
  }

  // Java: RegularExpressionParser#readToken(String)
  readToken(string) {
    const i = 0;
    const c = string.charAt(0);
    let end;
    if (c === '<') {
      end = indexOfClose(string, i, '<', '>');
    } else if (c === '[') {
      end = indexOfClose(string, i, '[', ']');
    } else {
      throw new IllegalStateException();
    }
    if (end === -1) {
      throw new TokenizationRegexException(`bad token. Non-matching brackets (<> or []): ${i}:"${string.substring(i)}"`);
    }
    return string.substring(i, end + 1);
  }

  // Java: RegularExpressionParser#tokenize(String)
  tokenize(string) {
    const expressions = [];
    const whitespace = Pattern.compile('\\s+');
    const modifier = Pattern.compile('[*?+]');
    const minMax = Pattern.compile('\\{(\\d+),(\\d+)\\}');
    const or = Pattern.compile('[|]');
    const ors = [];
    let lastOp = ' ';
    // Matcher#region(i,length).lookingAt(): the patterns have no anchors or look-behind, so matching the suffix is equal
    const lookingAt = (pattern, from) => {
      const m = pattern.matcher(string.substring(from));
      return m.lookingAt() ? m : null;
    };
    for (let i = 0; i < string.length;) {
      let m;
      if ((m = lookingAt(whitespace, i)) !== null) {
        i += m.end();
        continue;
      }
      const c = string.charAt(i);
      if (c === '(' || c === '<' || c === '[' || c === '$' || c === '^') {
        if (string.charAt(i) === '(') {
          const close = indexOfClose(string, i, '(', ')');
          if (close === -1) {
            throw new TokenizationRegexException(`unclosed parenthesis: ${i}:"${string.substring(i)})"`);
          }
          let group = string.substring(i + 1, close);
          i = close + 1;
          const namedGroup = Pattern.compile('<(\\w*)>:(.*)');
          const nonMatchingGroup = Pattern.compile('\\?:(.*)');
          let gm = namedGroup.matcher(group);
          if (gm.matches()) {
            const name = gm.group(1);
            group = gm.group(2);
            const subexpressions = this.tokenize(group);
            expressions.push(new NamedGroup(name, subexpressions));
          } else {
            gm = nonMatchingGroup.matcher(group);
            if (gm.matches()) {
              group = gm.group(1);
              const subexpressions = this.tokenize(group);
              expressions.push(new NonMatchingGroup(subexpressions));
            } else {
              const subexpressions = this.tokenize(group);
              expressions.push(new MatchingGroup(subexpressions));
            }
          }
        } else if (c === '<' || c === '[') {
          const token = this.readToken(string.substring(i));
          try {
            const group = token.substring(1, token.length - 1);
            const expr = this.factory(group);
            expressions.push(expr);
            i += token.length;
          } catch (e) {
            if (e.notPorted === true) throw e;
            throw new TokenizationRegexException(`error parsing token: ${token}`, e);
          }
        } else if (c === '^') {
          expressions.push(new StartAssertion());
          i++;
        } else if (c === '$') {
          expressions.push(new EndAssertion());
          i++;
        }
        if (lastOp === '|') {
          lastOp = ' ';
          try {
            if (expressions.length < 2) {
              throw new IllegalStateException('OR operator is applied to fewer than 2 elements.');
            }
            const expr1 = expressions.pop();
            const expr2 = expressions.pop();
            expressions.push(new Or(expr1, expr2));
          } catch (e) {
            if (e.notPorted === true) throw e;
            throw new TokenizationRegexException('error parsing OR (|) operator.', e);
          }
        }
      } else if ((m = lookingAt(modifier, i)) !== null) {
        const op = m.group(0).charAt(0);
        const expr = removeLast(expressions);
        let newExpr;
        if (op === '?') {
          newExpr = new Option(expr);
        } else if (op === '*') {
          newExpr = new Star(expr);
        } else if (op === '+') {
          newExpr = new Plus(expr);
        } else {
          throw new IllegalStateException();
        }
        expressions.push(newExpr);
        i += m.end();
      } else if ((m = lookingAt(minMax, i)) !== null) {
        const minOccurrences = Integer.parseInt(m.group(1));
        const maxOccurrences = Integer.parseInt(m.group(2));
        const expr = removeLast(expressions);
        const newExpr = new MinMax(expr, minOccurrences, maxOccurrences);
        expressions.push(newExpr);
        i += m.end();
      } else if ((m = lookingAt(or, i)) !== null) {
        ors.push(m.group(0));
        lastOp = '|';
        i += m.end();
      } else {
        throw new TokenizationRegexException(`unknown symbol: ${string.substring(i)}`);
      }
    }
    if (lastOp === '|') {
      throw new TokenizationRegexException('OR remains on the stack.');
    }
    return expressions;
  }
}

// Java: ArrayList#remove(int) with index size()-1 (IndexOutOfBoundsException on an empty list)
function removeLast(list) {
  if (list.length === 0) throw new IndexOutOfBoundsException(`Index -1 out of bounds for length 0`);
  return list.pop();
}
