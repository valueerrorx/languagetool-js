// Shared helpers of the exec-* adapters (LtjsBridge#config, #err, #settings).
import '../../src/lang/register.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';
import { DatabaseAccess } from '../../src/server/DatabaseAccess.js';
import { Languages } from '../../src/core/Languages.js';
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { GlobalConfig } from '../../src/core/rules/model/GlobalConfig.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { Level, Mode } from '../../src/core/JLanguageTool.js';
import { QueryParams } from '../../src/server/QueryParams.js';
import { PipelineSettings } from '../../src/server/PipelineSettings.js';

// Java: LtjsBridge#err(Throwable)
export function err(t) {
  return { class: t.javaClass ?? t.constructor.name, message: t.getMessage ? t.getMessage() : t.message };
}

// Java: LtjsBridge#config(JsonNode): HTTPServerConfig parsed from a temporary properties file (like --config)
export function config(c) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-srv-'));
  const f = path.join(dir, 'ltjs-srv.properties');
  let sb = '';
  if (c && c.props) for (const [k, v] of Object.entries(c.props)) sb += `${k}=${v}\n`;
  writeFileSync(f, sb, 'utf8');
  const args = ['--config', f];
  if (c && c.args) for (const x of c.args) args.push(String(x));
  const cfg = new HTTPServerConfig(args);
  DatabaseAccess.init(cfg); // like HTTPServer.main
  return cfg;
}

const strings = (n) => (n === undefined || n === null ? [] : n.map(String));
const lang = (n) => (n === undefined || n === null ? null : Languages.getLanguageForShortCode(String(n)));

// Java: LtjsBridge#settings(JsonNode)
export function settings(s) {
  const q = s.query ?? {};
  const alt = (q.altLanguages ?? []).map((n) => Languages.getLanguageForShortCode(String(n)));
  const en = strings(q.enabledCategories).map((x) => new CategoryId(x));
  const dis = strings(q.disabledCategories).map((x) => new CategoryId(x));
  const qp = new QueryParams(alt, strings(q.enabledRules), strings(q.disabledRules), en, dis,
    q.useEnabledOnly === true, q.useQuerySettings === true, q.allowIncompleteResults === true,
    q.enableHiddenRules === true, q.premium === true, q.enableTempOffRules === true,
    Mode.valueOf(q.mode ?? 'ALL'), Level.valueOf(q.level ?? 'DEFAULT'), null,
    q.callback !== undefined && q.callback !== null ? String(q.callback) : null, q.inputLogging ?? true);
  const u = s.user ?? {};
  const rv = new Map();
  if (u.ruleValues) {
    for (const [k, v] of Object.entries(u.ruleValues)) {
      rv.set(k, v.map((x) => (Number.isInteger(x) ? x : typeof x === 'boolean' ? x : String(x))));
    }
  }
  const uc = new UserConfig(strings(u.words), [], rv, u.maxSpellingSuggestions ?? 0,
    u.premiumUid !== undefined && u.premiumUid !== null ? BigInt(u.premiumUid) : null,
    u.dictName !== undefined && u.dictName !== null ? String(u.dictName) : null, null, null,
    u.filterDictionaryMatches === true, u.abTest !== undefined ? strings(u.abTest) : null, null,
    u.hidePremiumMatches === true, strings(u.preferredLanguages), u.trustedSource === true,
    u.optInThirdPartyAI === true, u.isPremium === true, UserConfig.TokenType.valueOf(u.tokenType ?? 'NO_TOKEN'));
  const gc = new GlobalConfig();
  if (s.global && s.global.grammalecteServer !== undefined) gc.setGrammalecteServer(String(s.global.grammalecteServer));
  return new PipelineSettings(lang(s.lang), lang(s.motherTongue), qp, gc, uc);
}
