// edu.washington.cs.knowitall.regex.FiniteAutomaton (openregex 1.1.1): NFA with epsilon edges, evaluated by parallel state sets
import { AssertionError } from '../../java/errors.js';
import { AssertionExpression, BaseExpression, MatchingGroup } from './Expression.js';
import { IntermediateMatch, FinalMatch, Group } from './Match.js';

// Java: List#iterator() (hasNext/next)
function listIterator(list) {
  let i = 0;
  return { hasNext: () => i < list.length, next: () => list[i++] };
}

// Java: FiniteAutomaton.AbstractEdge<E>
export class AbstractEdge {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$AbstractEdge';

  // Java: FiniteAutomaton.AbstractEdge#AbstractEdge(State)
  constructor(dest) {
    this.dest = dest;
  }
}

// Java: FiniteAutomaton.Edge<E>
export class Edge extends AbstractEdge {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$Edge';

  // Java: FiniteAutomaton.Edge#Edge(State,Expression)
  constructor(dest, expression) {
    super(dest);
    this.expression = expression;
  }

  // Java: FiniteAutomaton.Edge#toString()
  toString() {
    return `(${this.expression.toString()}) -> ${this.dest.toString()}`;
  }

  // Java: FiniteAutomaton.Edge#apply(E)
  apply(argument) {
    if (this.expression === null) {
      return true;
    }
    return this.expression.apply(argument);
  }
}

// Java: FiniteAutomaton.Epsilon<E>
export class Epsilon extends AbstractEdge {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$Epsilon';

  // Java: FiniteAutomaton.Epsilon#toString()
  toString() {
    return `(epsilon) -> ${this.dest.toString()}`;
  }

  // Java: FiniteAutomaton.Epsilon#apply(E)
  apply() {
    return true;
  }
}

// Java: FiniteAutomaton.State<E>
export class State {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$State';

  constructor() {
    this.edges = [];
    this.epsilons = [];
  }

  // Java: FiniteAutomaton.State#connect(State) (epsilon) / connect(State,Expression) (edge)
  connect(state, expression) {
    if (arguments.length === 1) {
      this.epsilons.push(new Epsilon(state));
    } else {
      this.edges.push(new Edge(state, expression));
    }
  }

  // Java: FiniteAutomaton.State#toString()
  toString() {
    return `${this.constructor.name}:${this.edges.length}`;
  }
}

// Java: FiniteAutomaton.TerminusState<E>
export class TerminusState extends State {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$TerminusState';

  // Java: FiniteAutomaton.TerminusState#TerminusState(Expression)
  constructor(expression) {
    super();
    this.expression = expression;
  }

  // Java: FiniteAutomaton.TerminusState#toString()
  toString() {
    return `${this.constructor.name}(${this.expression.toString()}):${this.edges.length}`;
  }
}

// Java: FiniteAutomaton.StartState<E>
export class StartState extends TerminusState {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$StartState';

  // Java: FiniteAutomaton.StartState#minMatchingLength()
  minMatchingLength() {
    return this.expression.minMatchingLength();
  }
}

// Java: FiniteAutomaton.EndState<E>
export class EndState extends TerminusState {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$EndState';
}

// Java: FiniteAutomaton.Automaton.Step<E>
class Step {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$Automaton$Step';

  // Java: FiniteAutomaton.Automaton.Step#Step(State) / Step(State,Step,AbstractEdge)
  constructor(state, prev = null, path = null) {
    this.state = state;
    this.prev = prev;
    this.path = path;
  }

  // Java: FiniteAutomaton.Automaton.Step#toString()
  toString() {
    return this.state.toString();
  }
}

// Java: FiniteAutomaton.Automaton<E>
export class Automaton {
  static FQCN = 'edu.washington.cs.knowitall.regex.FiniteAutomaton$Automaton';

  // Java: FiniteAutomaton.Automaton#Automaton(StartState,EndState) / Automaton(Expression)
  constructor(startOrExpression, end) {
    if (end !== undefined) {
      this.start = startOrExpression;
      this.end = end;
    } else {
      this.start = new StartState(startOrExpression);
      this.end = new EndState(startOrExpression);
    }
  }

  // Java: FiniteAutomaton.Automaton#apply(List)
  apply(tokens) {
    return this.evaluate(tokens, true) !== null;
  }

  // Java: FiniteAutomaton.Automaton#minMatchingLength()
  minMatchingLength() {
    return this.start.minMatchingLength();
  }

  // Java: FiniteAutomaton.Automaton#lookingAt(List) / lookingAt(List,int)
  lookingAt(tokens, offset = 0) {
    if (tokens.length - offset - this.minMatchingLength() < 0) {
      return null;
    }
    const subList = tokens.slice(offset, tokens.length);
    let step = this.evaluate(subList, offset === 0);
    if (step === null) {
      return null;
    }
    const path = [];
    while (step.state !== this.start) {
      path.push(step.path);
      step = step.prev;
    }
    const match = new IntermediateMatch();
    this.buildMatch(listIterator(subList), null, { v: offset }, this.start, listIterator(path.reverse()), match);
    return new FinalMatch(match);
  }

  // Java: FiniteAutomaton.Automaton#buildMatch(Iterator,Expression,AtomicInteger,State,Iterator,IntermediateMatch) (private)
  buildMatch(tokenIterator, expression, index, state, pathIterator, parent) {
    const matches = new IntermediateMatch();
    while (pathIterator.hasNext() && !(state instanceof EndState && state.expression === expression)) {
      const edge = pathIterator.next();
      if (edge instanceof Edge && !(edge.expression instanceof AssertionExpression)) {
        const token = tokenIterator.next();
        matches.add(edge.expression, token, index.v++);
        state = edge.dest;
      } else if (state instanceof StartState) {
        const subExpression = state.expression;
        state = this.buildMatch(tokenIterator, subExpression, index, edge.dest, pathIterator, matches);
        if (!(state instanceof EndState && state.expression === subExpression)) throw new AssertionError();
      } else {
        if (!(edge instanceof Epsilon)) throw new AssertionError();
        state = edge.dest;
      }
    }
    if (expression !== null && (!matches.isEmpty() || expression instanceof MatchingGroup)) {
      const group = new Group(expression);
      for (const pair of matches.pairs()) {
        if (pair.expr instanceof BaseExpression) {
          group.addTokens(pair);
        }
      }
      parent.add(group);
    }
    parent.addAll(matches.pairs());
    return state;
  }

  // Java: FiniteAutomaton.Automaton#expandEpsilons(List) (private)
  expandEpsilons(steps) {
    const size = steps.length;
    for (let i = 0; i < size; i++) {
      this.expandEpsilon(steps[i], steps);
    }
  }

  // Java: FiniteAutomaton.Automaton#expandEpsilon(Step,List) (private)
  expandEpsilon(step, steps) {
    for (const edge of step.state.epsilons) {
      if (!steps.some((s) => s.state === edge.dest)) {
        const newStep = new Step(edge.dest, step, edge);
        steps.push(newStep);
        this.expandEpsilon(newStep, steps);
      }
    }
  }

  // Java: FiniteAutomaton.Automaton#expandAssertions(List,List,boolean,List,int) (private)
  expandAssertions(steps, newSteps, first, tokens, size) {
    for (const step of steps) {
      for (const edge of step.state.edges) {
        if (edge.expression instanceof AssertionExpression) {
          const assertion = edge.expression;
          if (assertion.applyAt(first, tokens, size)) {
            newSteps.push(new Step(edge.dest, step, edge));
          }
        }
      }
    }
  }

  // Java: FiniteAutomaton.Automaton#evaluate(List,boolean) (private) / evaluate(List,List,boolean) (private)
  evaluate(tokens, first) {
    const steps = [new Step(this.start)];
    return this.evaluateSteps(tokens, steps, first);
  }

  // Java: FiniteAutomaton.Automaton#evaluate(List,List,boolean) (private)
  evaluateSteps(tokens, steps, first) {
    const size = tokens.length;
    let minRemaining = size;
    let best = null;
    while (steps.length !== 0) {
      this.expandEpsilons(steps);
      let pending = [...steps];
      const newSteps = [];
      do {
        for (const step of pending) {
          if (step.state === this.end) {
            if (tokens.length === size) {
              continue; // empty match
            }
            if (tokens.length < minRemaining) {
              best = step;
              minRemaining = tokens.length;
            }
          }
        }
        newSteps.length = 0;
        this.expandAssertions(pending, newSteps, first, tokens, size);
        this.expandEpsilons(newSteps);
        pending.length = 0;
        pending.push(...newSteps);
        steps.push(...newSteps);
      } while (newSteps.length > 0);
      newSteps.length = 0;
      if (tokens.length !== 0) {
        for (const step of steps) {
          for (const edge of step.state.edges) {
            if (edge.apply(tokens[0])) {
              newSteps.push(new Step(edge.dest, step, edge));
            }
          }
        }
        tokens = tokens.slice(1);
      }
      steps = newSteps;
    }
    return best;
  }
}
