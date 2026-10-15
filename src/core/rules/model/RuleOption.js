// org.languagetool.rules.RuleOption; typed values: Integer = number, Boolean = boolean, String = string, Float/Double = typedHash boxes, Character = JChar
import { Float } from '../../../lib/java/float.js';
import { Double } from '../../../lib/java/numbers.js';
import { JBoolean } from '../../../lib/java/numbers.js';
import { Integer } from '../../../lib/java/int.js';
import { typedHash } from '../../../lib/java/hash.js';
import { javaSplit, javaTrim, charAt, substring } from '../../../lib/java/strings.js';

// Java: java.lang.Character (boxed char; value = one UTF-16 unit string)
export class JChar {
  static FQCN = 'java.lang.Character';
  kind = 'Character';

  // Java: Character#valueOf(char)
  constructor(value) {
    this.value = value;
  }

  // Java: Character#hashCode()
  hashCode() {
    return this.value.charCodeAt(0);
  }

  // Java: Character#equals(Object)
  equals(o) {
    return o instanceof JChar && o.value === this.value;
  }

  // Java: Character#toString()
  toString() {
    return this.value;
  }
}

// kind of a boxed value: 'Integer' for plain numbers
function kindOf(o) {
  if (typeof o === 'number') return 'Integer';
  if (typeof o === 'boolean') return 'Boolean';
  if (o !== null && typeof o === 'object' && typeof o.kind === 'string') return o.kind;
  return 'String';
}

export class RuleOption {
  static FQCN = 'org.languagetool.rules.RuleOption';
  static DEFAULT_VALUE = 'defaultValue';
  static DEFAULT_TYPE = 'defaultType';
  static MIN_CONF_VALUE = 'minConfigurableValue';
  static MAX_CONF_VALUE = 'maxConfigurableValue';
  static CONF_TEXT = 'configureText';

  // Java: RuleOption#RuleOption(Object,String[,Object,Object])
  constructor(defaultValue, configureText, minConfigurableValue = 0, maxConfigurableValue = 100) {
    this.defaultValue = defaultValue;
    this.configureText = configureText;
    const k = kindOf(defaultValue);
    if (minConfigurableValue !== null && minConfigurableValue !== undefined && maxConfigurableValue !== null && maxConfigurableValue !== undefined &&
        (k === 'Integer' || k === 'Character' || k === 'Float' || k === 'Double')) {
      this.minConfigurableValue = minConfigurableValue;
      this.maxConfigurableValue = maxConfigurableValue;
    } else {
      this.minConfigurableValue = 0;
      this.maxConfigurableValue = 100;
    }
  }

  // Java: RuleOption#getDefaultValue()
  getDefaultValue() {
    return this.defaultValue;
  }

  // Java: RuleOption#getConfigureText()
  getConfigureText() {
    return this.configureText;
  }

  // Java: RuleOption#getMinConfigurableValue()
  getMinConfigurableValue() {
    return this.minConfigurableValue;
  }

  // Java: RuleOption#getMaxConfigurableValue()
  getMaxConfigurableValue() {
    return this.maxConfigurableValue;
  }

  // Java: RuleOption#objectToString(Object)
  static objectToString(o) {
    const k = kindOf(o);
    const c = k === 'Integer' ? 'i' : k === 'Character' ? 'c' : k === 'Boolean' ? 'b' : k === 'Float' ? 'f' : k === 'Double' ? 'd' : 's';
    return c + String(o);
  }

  // Java: RuleOption#objectsToString(Object[])
  static objectsToString(o) {
    let s = '';
    for (let i = 0; i < o.length; i++) {
      if (i > 0) {
        s += ';';
      }
      s += RuleOption.objectToString(o[i]);
    }
    return s;
  }

  // Java: RuleOption#stringToObject(String)
  static stringToObject(s) {
    let o;
    const c = String.fromCharCode(charAt(s, 0));
    const str = substring(s, 1);
    if (c === 's') {
      o = str;
    } else if (c === 'b') {
      o = JBoolean.parseBoolean(str);
    } else if (c === 'f') {
      o = typedHash.Float(Float.parseFloat(str));
    } else if (c === 'd') {
      o = typedHash.Double(Double.parseDouble(str));
    } else if (c === 'c') {
      o = new JChar(String.fromCharCode(charAt(str, 0)));
    } else if (c === 'i') {
      o = Integer.parseInt(str);
    } else { // compatible to old version
      o = Integer.parseInt(s);
    }
    return o;
  }

  // Java: RuleOption#stringToObjects(String)
  static stringToObjects(s) {
    const strs = javaSplit(s, ';');
    const o = new Array(strs.length);
    for (let i = 0; i < strs.length; i++) {
      const str = javaTrim(strs[i]);
      o[i] = RuleOption.stringToObject(str);
    }
    return o;
  }
}
