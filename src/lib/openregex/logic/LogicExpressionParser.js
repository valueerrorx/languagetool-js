// edu.washington.cs.knowitall.logic.LogicExpressionParser (openregex 1.1.1): tokenizer of logic expressions
import { Pattern } from '../../java/regex/index.js';
import { javaTrim } from '../../java/strings.js';
import { Not, And, Or, ParenL, ParenR } from './Expression.js';
import { LogicExpression } from './LogicExpression.js';
import { TokenizeLogicException } from './LogicException.js';

// Java: LogicExpressionParser.doubleQuoteStringLiteralRegex / singleQuoteStringLiteralRegex / regexLiteralRegex
const doubleQuoteStringLiteralRegex = Pattern.compile('"([^"\\p{Cntrl}\\\\]*+(?:\\\\[\\\\\'"bfnrt])*+(?:\\\\u[a-fA-F0-9]{4})*+)*+"');
const singleQuoteStringLiteralRegex = Pattern.compile("'(?:[^']*+)'");
const regexLiteralRegex = Pattern.compile('/(?:(?:[^/\\\\]*+(?:\\\\)*+(?:\\\\/)*+)*+)/');
const literalPatterns = [doubleQuoteStringLiteralRegex, singleQuoteStringLiteralRegex, regexLiteralRegex];

// Java: LogicExpressionParser<E> (abstract; factory(String) is implemented by subclasses)
export class LogicExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParser';

  static doubleQuoteStringLiteralRegex = doubleQuoteStringLiteralRegex;
  static singleQuoteStringLiteralRegex = singleQuoteStringLiteralRegex;
  static regexLiteralRegex = regexLiteralRegex;

  // Java: LogicExpressionParser#parse(String)
  parse(argument) {
    const tokens = this.tokenize(argument);
    return new LogicExpression(tokens);
  }

  // Java: LogicExpressionParser#apply(String)
  apply(argument) {
    return this.parse(argument);
  }

  // Java: LogicExpressionParser#readToken(String)
  readToken(string) {
    let token;
    try {
      const stack = [];
      let i = 0;
      loop: for (; i < string.length; i++) {
        const c = string.charAt(i);
        let literal = null;
        for (const pattern of literalPatterns) {
          // Matcher.region(i, length).lookingAt(): the patterns have no anchors or look-behind, so matching the suffix is equal
          const m = pattern.matcher(string.substring(i));
          if (m.lookingAt()) {
            literal = m.group(0);
            break;
          }
        }
        if (literal !== null) {
          i += literal.length - 1;
        } else if (c === '(') {
          stack.push(c);
        } else if (c === ')') {
          if (stack.length === 0) {
            break loop;
          }
          stack.pop();
        } else if (c === '&' || c === '|') {
          break loop;
        }
      }
      token = javaTrim(string.substring(0, i));
    } catch (e) {
      if (e.notPorted === true) throw e;
      throw new TokenizeLogicException(`Error parsing token: ${string}`, e);
    }
    if (token.length === 0) {
      throw new TokenizeLogicException('zero-length token found.');
    }
    return token;
  }

  // Java: LogicExpressionParser#tokenize(String)
  tokenize(string) {
    const expressions = [];
    for (let i = 0; i < string.length;) {
      const substring = string.substring(i);
      const c = substring.charAt(0);
      if (c === ' ') {
        i++;
        continue;
      }
      if (c === '(') {
        expressions.push(new ParenL());
        i++;
      } else if (c === ')') {
        expressions.push(new ParenR());
        i++;
      } else if (c === '!') {
        expressions.push(new Not());
        i++;
      } else if (c === '&') {
        expressions.push(new And());
        i++;
      } else if (c === '|') {
        expressions.push(new Or());
        i++;
      } else {
        const token = this.readToken(substring);
        expressions.push(this.factory(token));
        i += token.length;
      }
    }
    return expressions;
  }
}
