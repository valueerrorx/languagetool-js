// edu.washington.cs.knowitall.logic.ArgFactory (openregex 1.1.1)

// Java: ArgFactory<E> (abstract; create(String) is implemented by subclasses)
export class ArgFactory {
  static FQCN = 'edu.washington.cs.knowitall.logic.ArgFactory';

  // Java: ArgFactory#apply(String)
  apply(argument) {
    return this.create(argument);
  }
}
