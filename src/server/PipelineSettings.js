// Java: org.languagetool.server.PipelineSettings (key of the pipeline pool: language, mother tongue, query params, global and user config)
import { Objects } from '../lib/java/Objects.js';
import { QueryParams } from './QueryParams.js';
import { Level, Mode } from '../core/JLanguageTool.js';
import { GlobalConfig } from '../core/rules/model/GlobalConfig.js';

export class PipelineSettings {
  static FQCN = 'org.languagetool.server.PipelineSettings';

  // Java: PipelineSettings#PipelineSettings(Language,UserConfig) / (Language,Language,QueryParams,GlobalConfig,UserConfig)
  constructor(...a) {
    if (a.length === 2) {
      this.lang = a[0];
      this.motherTongue = null;
      this.query = new QueryParams([], [], [], [], [], false, false, false, false, false, false, Mode.ALL, Level.DEFAULT, null, null);
      this.globalConfig = new GlobalConfig();
      this.userConfig = a[1];
    } else {
      [this.lang, this.motherTongue, this.query, this.globalConfig, this.userConfig] = a;
    }
  }

  // Java: PipelineSettings#hashCode() (HashCodeBuilder(17, 31) over lang, motherTongue, query, globalConfig, userConfig)
  hashCode() {
    let t = 17;
    for (const o of [this.lang, this.motherTongue, this.query, this.globalConfig, this.userConfig]) {
      t = o === null || o === undefined ? Math.imul(t, 31) : (Math.imul(t, 31) + Objects.hashCode(o)) | 0;
    }
    return t;
  }

  // Java: PipelineSettings#equals(Object)
  equals(obj) {
    if (obj === this) return true;
    if (obj === null || obj === undefined || obj.constructor !== this.constructor) return false;
    return Objects.equals(this.lang, obj.lang)
      && Objects.equals(this.motherTongue, obj.motherTongue)
      && Objects.equals(this.query, obj.query)
      && Objects.equals(this.globalConfig, obj.globalConfig)
      && Objects.equals(this.userConfig, obj.userConfig);
  }

  // Java: PipelineSettings#toString() (ToStringBuilder default style)
  toString() {
    const v = (x) => (x === null || x === undefined ? '<null>' : String(x));
    return `${PipelineSettings.FQCN}@${(Objects.hashCode(this) >>> 0).toString(16)}[lang=${v(this.lang)},motherTongue=${v(this.motherTongue)},`
      + `query=${v(this.query)},globalConfig=${v(this.globalConfig)},user=${v(this.userConfig)}]`;
  }
}

