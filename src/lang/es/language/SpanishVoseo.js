// Java: org.languagetool.language.SpanishVoseo
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Spanish } from './Spanish.js';

// Java: SpanishVoseo
export class SpanishVoseo extends Spanish {
  static FQCN = 'org.languagetool.language.SpanishVoseo';

  // Java: SpanishVoseo#SpanishVoseo() (super(true): no instantiation guard)
  constructor() {
    super(true);
  }

  // Java: SpanishVoseo#getName()
  getName() {
    return 'Spanish (voseo)';
  }

  // Java: SpanishVoseo#getCountries()
  getCountries() {
    return ['AR'];
  }

  // Java: SpanishVoseo#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return ['VOSEO'];
  }
}

registerClass(SpanishVoseo.FQCN, SpanishVoseo);
