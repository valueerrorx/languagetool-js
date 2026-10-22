// Public API of @ltjs/core: check(), startServer(), listLanguages().
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import './lang/register.js'; // registers the core classes and every installed language package (top-level await)
import { Languages } from './core/Languages.js';
import { JLanguageTool, Level, ParagraphHandling } from './core/JLanguageTool.js';
import { RuleMatchesAsJsonSerializer } from './core/RuleMatchesAsJsonSerializer.js';
import { DetectedLanguage } from './core/rules/model/DetectedLanguage.js';
import { CategoryId } from './core/rules/model/Category.js';
import { selectRules } from './core/Tools.js';
import { LanguageIdentifierService } from './core/language/identifier/LanguageIdentifierService.js';
import { detectLanguageOfString } from './server/detectLanguageOfString.js';
import { HTTPServer, DEFAULT_ALLOWED_IPS } from './server/HTTPServer.js';
import { HTTPServerConfig, DEFAULT_HOST } from './server/HTTPServerConfig.js';
import { DatabaseAccess } from './server/DatabaseAccess.js';
import { VERSION } from './core/LtBuildInfo.js';
import { getExtraRuleIds, parseExtraRulesFlag } from './core/ltjs/extraRules.js';

const CONTEXT_SIZE = 40; // as the server (TextChecker.CONTEXT_SIZE)
const MAX_CACHED_INSTANCES = 8;
const cache = new Map(); // key -> JLanguageTool (insertion order = LRU order)

export { VERSION };

// lists the registered languages like GET /v2/languages: [{name, code, longCode}]
export function listLanguages() {
  return Languages.get().map((lang) => ({ name: lang.getName(), code: lang.getShortCode(), longCode: lang.getShortCodeWithCountryAndVariant() }));
}

// resolves a language code ("de", "de-DE", "auto") to a registered Language
function resolveLanguage(code, text) {
  if (code === undefined || code === null || code === '') throw new Error("check(): option 'language' is required (e.g. 'de-DE' or 'auto')");
  if (code === 'auto') {
    const identifier = LanguageIdentifierService.INSTANCE.getSimpleLanguageIdentifier([]);
    return detectLanguageOfString(identifier, text, null, [], [], []).getGivenLanguage();
  }
  return Languages.getLanguageForShortCode(code);
}

// JLanguageTool of a language/rule selection, kept in a small LRU cache (creating one loads all rules)
function getInstance(lang, motherTongue, o) {
  const key = JSON.stringify([lang.getShortCodeWithCountryAndVariant(), motherTongue?.getShortCodeWithCountryAndVariant() ?? null,
    o.enabledRules, o.disabledRules, o.enabledCategories, o.disabledCategories, o.enabledOnly]);
  let lt = cache.get(key);
  if (lt !== undefined) {
    cache.delete(key);
    cache.set(key, lt);
    return lt;
  }
  lt = new JLanguageTool(lang, motherTongue);
  selectRules(lt, new Set(o.disabledCategories.map((c) => new CategoryId(c))), new Set(o.enabledCategories.map((c) => new CategoryId(c))),
    new Set(o.disabledRules), new Set(o.enabledRules), o.enabledOnly, false);
  cache.set(key, lt);
  if (cache.size > MAX_CACHED_INSTANCES) cache.delete(cache.keys().next().value);
  return lt;
}

const list = (v) => (v === undefined || v === null ? [] : (Array.isArray(v) ? v : String(v).split(',').filter((s) => s !== '')));

/**
 * Checks a text. Returns the LanguageTool /v2/check JSON object ({software, warnings, language, matches, ...}).
 * options: language (required, e.g. 'de-DE', 'en', 'auto'), motherTongue, enabledRules, disabledRules, enabledCategories,
 * disabledCategories (arrays or comma separated strings), enabledOnly (bool), level ('default' | 'picky'),
 * extraRules (bool, default true: the LTJS rule layer, D-061; env LTJS_EXTRA_RULES=0 removes it process-wide).
 */
export async function check(text, options = {}) {
  if (typeof text !== 'string') throw new TypeError('check(): text must be a string');
  const lang = resolveLanguage(options.language, text);
  const motherTongue = options.motherTongue ? Languages.getLanguageForShortCode(options.motherTongue) : null;
  const level = String(options.level ?? 'default').toLowerCase() === 'picky' ? Level.PICKY : Level.DEFAULT;
  const enabledOnly = options.enabledOnly === true;
  // LTJS layer (D-061): extraRules: false switches the layer's rules off for this call
  const extraOff = !parseExtraRulesFlag(options.extraRules) && !enabledOnly ? getExtraRuleIds(lang.getShortCode()) : [];
  const lt = getInstance(lang, motherTongue, {
    enabledRules: list(options.enabledRules), disabledRules: [...list(options.disabledRules), ...extraOff],
    enabledCategories: list(options.enabledCategories), disabledCategories: list(options.disabledCategories),
    enabledOnly,
  });
  const matches = lt.check(text, true, ParagraphHandling.NORMAL, null, level);
  const json = new RuleMatchesAsJsonSerializer().ruleMatchesToJson(matches, text, CONTEXT_SIZE, new DetectedLanguage(lang, lang));
  return JSON.parse(json);
}

/**
 * Starts the HTTP API server. Returns {port, host, server, close()}.
 * options: port (default 8081), host (default 'localhost'; null binds all interfaces without the IP allow list),
 * config (object of LanguageTool server properties, e.g. {maxTextLength: 50000, cacheSize: 1000}), args (extra command line args).
 */
export async function startServer({ port = 8081, host = DEFAULT_HOST, config = {}, args = [] } = {}) {
  let tmp = null;
  const argv = ['--port', String(port), ...args];
  const entries = Object.entries(config ?? {});
  if (entries.length > 0) {
    tmp = mkdtempSync(path.join(tmpdir(), 'ltjs-'));
    const file = path.join(tmp, 'server.properties');
    writeFileSync(file, entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    argv.push('--config', file);
  }
  try {
    const cfg = new HTTPServerConfig(argv);
    DatabaseAccess.init(cfg);
    const server = host === null ? await HTTPServer.create(cfg, false, null, null) : await HTTPServer.create(cfg, false, host, DEFAULT_ALLOWED_IPS);
    server.run();
    return { port: server.port, host, server, close: () => server.stop() };
  } finally {
    if (tmp !== null) rmSync(tmp, { recursive: true, force: true });
  }
}
