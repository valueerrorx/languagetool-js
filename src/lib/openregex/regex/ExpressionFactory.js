// edu.washington.cs.knowitall.regex.ExpressionFactory (openregex 1.1.1)

// Java: ExpressionFactory<E> (abstract; create(String) is implemented by subclasses)
export class ExpressionFactory {
  static FQCN = 'edu.washington.cs.knowitall.regex.ExpressionFactory';

  // Java: ExpressionFactory#apply(String)
  apply(argument) {
    return this.create(argument);
  }
}
