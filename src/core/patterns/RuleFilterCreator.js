// org.languagetool.rules.patterns.RuleFilterCreator (instantiates <filter class=...> via the ClassBroker, cached per class)
import { ClassNotFoundException, InstantiationException, InvocationTargetException, JavaError, NullPointerException, RuntimeException, Throwable } from '../../lib/java/errors.js';
import { getClassBroker } from '../resources/LtStatics.js';
import { getConstructors } from '../resources/ClassBroker.js';
import { RuleFilter } from './RuleFilter.js';
import './filterRegistry.js';

// Java: Constructor#newInstance() (abstract classes throw InstantiationException, constructor exceptions are wrapped in InvocationTargetException)
export function newInstance(cls) {
  if (cls.JAVA_ABSTRACT === true && Object.hasOwn(cls, 'JAVA_ABSTRACT')) throw new InstantiationException(null);
  try {
    return new cls();
  } catch (e) {
    if (e instanceof Throwable && e.notPorted !== true) throw new InvocationTargetException(e); // constructor exceptions are wrapped
    throw e;
  }
}

// Java: RuleFilterCreator
export class RuleFilterCreator {
  static FQCN = 'org.languagetool.rules.patterns.RuleFilterCreator';
  static INSTANCE = null;

  // Java: RuleFilterCreator() (private)
  constructor() {
    this.myFilterCache = new Map(); // Class -> RuleFilter (ConcurrentHashMap)
  }

  /**
   * @param className fully qualified class Name of a class implementing RuleFilter
   */
  // Java: RuleFilterCreator#getFilter(String)
  getFilter(className) {
    let aClass;
    try {
      aClass = getClassBroker().forName(className);
    } catch (e) {
      if (e instanceof ClassNotFoundException) {
        throw new RuntimeException('Could not find filter class: \''
          + className + '\' - make sure to use a fully qualified class name like \'org.languagetool.rules.MyFilter\'');
      }
      throw e;
    }
    // Java: myFilterCache.computeIfAbsent(aClass, clazz -> {...}) (a throwing mapping function caches nothing)
    if (this.myFilterCache.has(aClass)) return this.myFilterCache.get(aClass);
    const constructors = getConstructors(aClass);
    if (constructors.length !== 1) {
      throw new RuntimeException('Constructor of filter class \''
        + className + '\' must have exactly one constructor, but it has ' + constructors.length);
    }
    const constructor = constructors[0];
    let filter;
    try {
      if (constructor.params.length !== 0) {
        throw new RuntimeException('Constructor of filter class \'' + className + '\' must not have arguments: ' + constructor.text);
      }
      const created = newInstance(aClass);
      if (created instanceof RuleFilter) {
        filter = created;
      } else {
        throw new RuntimeException('Filter class \'' + className + '\' must implement interface ' + RuleFilter.FQCN.substring(RuleFilter.FQCN.lastIndexOf('.') + 1));
      }
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
      if (!(e instanceof Throwable) || e instanceof JavaError) throw e; // catch (Exception e): Errors and JS failures pass
      throw new RuntimeException('Could not create filter class using constructor ' + constructor.text, e);
    }
    this.myFilterCache.set(aClass, filter);
    return filter;
  }

  // Java: RuleFilterCreator#getInstance()
  static getInstance() {
    return RuleFilterCreator.INSTANCE;
  }
}

RuleFilterCreator.INSTANCE = new RuleFilterCreator();
