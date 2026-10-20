// edu.washington.cs.knowitall.logic.LogicExpression (openregex 1.1.1): boolean expression over predicates
import { EmptyStackException } from '../../java/errors.js';
import { Apply, Arg, Op, Mon, Bin, Pred, ParenL, ParenR } from './Expression.js';
import { CompileLogicException, ApplyLogicException } from './LogicException.js';
import { LogicExpressionParser } from './LogicExpressionParser.js';

// Java: java.util.Stack#pop()
function pop(stack) {
  if (stack.length === 0) throw new EmptyStackException();
  return stack.pop();
}

// Java: java.util.Stack#toString()
const stackToString = (stack) => `[${stack.map((e) => e.toString()).join(', ')}]`;

// Java: LogicExpression<E>
export class LogicExpression {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpression';

  // Java: LogicExpression#LogicExpression(List)
  constructor(expressions) {
    const rpn = this.rpn(expressions);
    this.expression = LogicExpression.buildAst(rpn);
  }

  // Java: LogicExpression#compile(List) / compile(String,Function)
  static compile(expressionsOrString, factoryDelegate) {
    if (typeof expressionsOrString === 'string') {
      const parser = new (class extends LogicExpressionParser {
        // Java: LogicExpression$1#factory(String)
        factory(argument) {
          return factoryDelegate(argument);
        }
      })();
      return parser.parse(expressionsOrString);
    }
    return new LogicExpression(expressionsOrString);
  }

  // Java: LogicExpression#toString()
  toString() {
    if (this.isEmpty()) {
      return '(empty)';
    }
    return this.expression.toString();
  }

  // Java: LogicExpression#isEmpty()
  isEmpty() {
    return this.expression === null;
  }

  // Java: LogicExpression#apply(E)
  apply(argument) {
    if (this.isEmpty()) {
      return true;
    }
    return this.expression.apply(argument);
  }

  // Java: LogicExpression#buildAst(List)
  static buildAst(expressions) {
    if (expressions.length === 0) {
      return null;
    }
    const stack = [];
    for (const expression of expressions) {
      if (expression instanceof Arg) {
        stack.push(expression);
      } else if (expression instanceof Op) {
        try {
          if (expression instanceof Mon) {
            const sub = pop(stack);
            expression.sub = sub;
            stack.push(expression);
          }
          if (expression instanceof Bin) {
            const right = pop(stack);
            const left = pop(stack);
            expression.left = left;
            expression.right = right;
            stack.push(expression);
          }
        } catch (e) {
          if (!(e instanceof EmptyStackException)) throw e;
          throw new CompileLogicException(`No argument for operator (stack empty): ${expression.toString()}`);
        }
      }
    }
    if (stack.length > 1) {
      throw new ApplyLogicException(`Stack has multiple elements after apply: ${stackToString(stack)}`);
    }
    if (stack.length === 0) {
      throw new ApplyLogicException('Stack has zero elements after apply.');
    }
    if (!(stack[stack.length - 1] instanceof Apply)) {
      throw new ApplyLogicException(`Stack contains non-appliable tokens after apply: ${stackToString(stack)}`);
    }
    return pop(stack);
  }

  // Java: LogicExpression#getArgs()
  getArgs() {
    const args = [];
    this.getArgsOf(this.expression, args);
    return args;
  }

  // Java: LogicExpression#getArgs(Apply,List) (private)
  getArgsOf(expression, args) {
    if (expression instanceof Bin) {
      this.getArgsOf(expression.left, args);
      this.getArgsOf(expression.right, args);
    } else if (expression instanceof Pred) {
      args.push(expression.getDescription());
    }
  }

  // Java: LogicExpression#rpn(List)
  rpn(expressions) {
    const stack = [];
    const queue = [];
    for (const expression of expressions) {
      if (expression instanceof ParenL) {
        stack.push(expression);
      } else if (expression instanceof ParenR) {
        let pooped;
        do {
          pooped = pop(stack);
          if (!(pooped instanceof ParenL)) {
            queue.push(pooped);
          }
        } while (!(pooped instanceof ParenL));
      } else if (expression instanceof Mon) {
        stack.push(expression);
      } else if (expression instanceof Bin) {
        while (stack.length !== 0 && stack[stack.length - 1] instanceof Op && stack[stack.length - 1].preceeds(expression)) {
          queue.push(stack.pop());
        }
        stack.push(expression);
      } else if (expression instanceof Arg) {
        queue.push(expression);
      }
    }
    while (stack.length !== 0) {
      const expression = stack.pop();
      if (expression instanceof ParenL || expression instanceof ParenR) {
        throw new CompileLogicException('Unbalanced parentheses.');
      }
      queue.push(expression);
    }
    return queue;
  }
}
