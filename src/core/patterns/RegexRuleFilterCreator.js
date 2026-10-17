// org.languagetool.rules.patterns.RegexRuleFilterCreator (instantiates <filter class=...> of <regexp> rules via the ClassBroker)
import { ClassNotFoundException, JavaError, NullPointerException, RuntimeException, Throwable } from '../../lib/java/errors.js';
import { getClassBroker } from '../resources/LtStatics.js';
import { getConstructors } from '../resources/ClassBroker.js';
import { RegexRuleFilter } from './RegexRuleFilter.js';
import { newInstance } from './RuleFilterCreator.js';

// Java: RegexRuleFilterCreator
export class RegexRuleFilterCreator {
  static FQCN = 'org.languagetool.rules.patterns.RegexRuleFilterCreator';

  /**
   * @param className fully qualified class Name of a class implementing RegexRuleFilter
   */
  // Java: RegexRuleFilterCreator#getFilter(String)
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
    const constructors = getConstructors(aClass);
    if (constructors.length !== 1) {
      throw new RuntimeException('Constructor of filter class \''
        + className + '\' must have exactly one constructor, but it has ' + constructors.length);
    }
    const constructor = constructors[0];
    try {
      if (constructor.params.length !== 0) {
        throw new RuntimeException('Constructor of filter class \'' + className + '\' must not have arguments: ' + constructor.text);
      }
      const filter = newInstance(aClass);
      if (filter instanceof RegexRuleFilter) {
        return filter;
      } else {
        throw new RuntimeException('Filter class \'' + className + '\' must implement interface ' + RegexRuleFilter.FQCN.substring(RegexRuleFilter.FQCN.lastIndexOf('.') + 1));
      }
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
      if (!(e instanceof Throwable) || e instanceof JavaError) throw e; // catch (Exception e): Errors and JS failures pass
      throw new RuntimeException('Could not create filter class using constructor ' + constructor.text, e);
    }
  }
}
