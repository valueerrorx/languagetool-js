// Java: org.languagetool.server.TextChecker.QueryParams (request settings that decide which pipeline is used)
import { Objects } from '../lib/java/Objects.js';
import { listHashCode } from '../lib/java/hash.js';
import { BadRequestException } from './BadRequestException.js';

// Java: EqualsBuilder#append(Object,Object) on lists (element-wise equals, null-safe)
const listEquals = (a, b) => {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return a.length === b.length && a.every((x, i) => Objects.equals(x, b[i]));
};
// Java: HashCodeBuilder#append(Object) step: total * constant + hashCode (null: total * constant)
const step = (total, constant, h) => (Math.imul(total, constant) + h) | 0;

export class QueryParams {
  static FQCN = 'org.languagetool.server.TextChecker.QueryParams';

  // Java: QueryParams#QueryParams(List,List,List,List,List,boolean,boolean,boolean,boolean,boolean,boolean,Mode,Level,Set,String,boolean)
  constructor(altLanguages, enabledRules, disabledRules, enabledCategories, disabledCategories, useEnabledOnly, useQuerySettings,
    allowIncompleteResults, enableHiddenRules, premium, enableTempOffRules, mode, level, toneTags, callback, inputLogging = true) {
    this.altLanguages = Objects.requireNonNull(altLanguages);
    this.enabledRules = enabledRules;
    this.disabledRules = disabledRules;
    this.enabledCategories = enabledCategories;
    this.disabledCategories = disabledCategories;
    this.useEnabledOnly = useEnabledOnly;
    this.useQuerySettings = useQuerySettings;
    this.allowIncompleteResults = allowIncompleteResults;
    this.enableHiddenRules = enableHiddenRules;
    this.premium = premium;
    this.enableTempOffRules = enableTempOffRules;
    this.regressionTestMode = enableTempOffRules;
    this.mode = Objects.requireNonNull(mode);
    this.level = Objects.requireNonNull(level);
    this.toneTags = toneTags;
    if (callback !== null && callback !== undefined && !/^[a-zA-Z]+$/.test(callback)) {
      throw new BadRequestException(`'callback' value must match [a-zA-Z]+: '${callback}'`);
    }
    this.callback = callback ?? null;
    this.inputLogging = inputLogging;
  }

  // Java: QueryParams#hashCode() (HashCodeBuilder(17, 37); booleans append as value ? 0 : 1)
  hashCode() {
    let t = 17;
    const obj = (o) => { t = o === null || o === undefined ? Math.imul(t, 37) : step(t, 37, Objects.hashCode(o)); };
    const bool = (b) => { t = step(t, 37, b ? 0 : 1); };
    obj({ hashCode: () => listHashCode(this.altLanguages) });
    obj({ hashCode: () => listHashCode(this.enabledRules) });
    obj({ hashCode: () => listHashCode(this.disabledRules) });
    obj({ hashCode: () => listHashCode(this.enabledCategories) });
    obj({ hashCode: () => listHashCode(this.disabledCategories) });
    bool(this.useEnabledOnly);
    bool(this.useQuerySettings);
    bool(this.allowIncompleteResults);
    bool(this.enableHiddenRules);
    bool(this.premium);
    bool(this.enableTempOffRules);
    bool(this.regressionTestMode);
    obj(this.mode);
    obj(this.level);
    obj(this.callback);
    bool(this.inputLogging);
    return t;
  }

  // Java: QueryParams#equals(Object)
  equals(obj) {
    if (obj === this) return true;
    if (obj === null || obj === undefined || obj.constructor !== this.constructor) return false;
    return listEquals(this.altLanguages, obj.altLanguages)
      && listEquals(this.enabledRules, obj.enabledRules)
      && listEquals(this.disabledRules, obj.disabledRules)
      && listEquals(this.enabledCategories, obj.enabledCategories)
      && listEquals(this.disabledCategories, obj.disabledCategories)
      && this.useEnabledOnly === obj.useEnabledOnly
      && this.useQuerySettings === obj.useQuerySettings
      && this.allowIncompleteResults === obj.allowIncompleteResults
      && this.enableHiddenRules === obj.enableHiddenRules
      && this.premium === obj.premium
      && this.enableTempOffRules === obj.enableTempOffRules
      && this.regressionTestMode === obj.regressionTestMode
      && this.mode === obj.mode
      && this.level === obj.level
      && Objects.equals(this.callback, obj.callback)
      && this.inputLogging === obj.inputLogging;
  }

  // Java: QueryParams#toString() (ToStringBuilder default style)
  toString() {
    const l = (x) => `[${x.map((e) => String(e)).join(',')}]`;
    return `${QueryParams.FQCN}@${(Objects.hashCode(this) >>> 0).toString(16)}[altLanguages=${l(this.altLanguages)},enabledRules=${l(this.enabledRules)},`
      + `disabledRules=${l(this.disabledRules)},enabledCategories=${l(this.enabledCategories)},disabledCategories=${l(this.disabledCategories)},`
      + `useEnabledOnly=${this.useEnabledOnly},useQuerySettings=${this.useQuerySettings},allowIncompleteResults=${this.allowIncompleteResults},`
      + `enableHiddenRules=${this.enableHiddenRules},premium=${this.premium},enableTempOffRules=${this.enableTempOffRules},`
      + `regressionTestMode=${this.regressionTestMode},mode=${this.mode},level=${this.level},callback=${this.callback === null ? '<null>' : this.callback},`
      + `inputLogging=${this.inputLogging}]`;
  }
}
