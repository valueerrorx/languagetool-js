// Java: org.languagetool.server.ServerTools
import { Mode, Level } from '../core/JLanguageTool.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { BadRequestException } from './BadRequestException.js';
import { UserLimits } from './UserLimits.js';

// Java: ServerTools#print(String,PrintStream) with SimpleDateFormat("yyyy-MM-dd HH:mm:ss ZZ") in UTC
export function print(s, stream = process.stdout) {
  const d = new Date(currentTimeMillis());
  const p = (n) => String(n).padStart(2, '0');
  const now = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
  stream.write(`${now} ${s}\n`);
}

// Java: ServerTools#setCommonHeaders(HttpExchange,String,String)
export function setCommonHeaders(httpExchange, contentType, allowOriginUrl) {
  httpExchange.getResponseHeaders().set('Content-Type', contentType);
  setAllowOrigin(httpExchange, allowOriginUrl);
}

// Java: ServerTools#setAllowOrigin(HttpExchange,String)
export function setAllowOrigin(httpExchange, allowOriginUrl) {
  if (allowOriginUrl !== null && allowOriginUrl !== undefined) {
    httpExchange.getResponseHeaders().set('Access-Control-Allow-Origin', allowOriginUrl);
  }
}

// Java: ServerTools#getUserLimits(Map,HTTPServerConfig[,String])
export function getUserLimits(params, config, authHeader = null) {
  if (params.get('username') !== undefined) {
    if (params.get('apiKey') !== undefined && params.get('password') !== undefined) {
      throw new BadRequestException('apiKey AND password was set, set only apiKey');
    }
    if (params.get('apiKey') !== undefined) {
      return UserLimits.getLimitsByApiKey(config, params.get('username'), params.get('apiKey'));
    } else if (params.get('password') !== undefined) {
      return UserLimits.getLimitsFromUserAccount(config, params.get('username'), params.get('password'));
    } else if (params.get('tokenV2') !== undefined) {
      if (authHeader !== null) {
        return UserLimits.getLimitsWithJwtToken(config, authHeader, params.get('username'), params.get('tokenV2'));
      }
      return UserLimits.getLimitsByAddonToken(config, params.get('username'), params.get('tokenV2'));
    }
    throw new BadRequestException("With 'username' set, you also need to specify 'apiKey'");
  }
  if (params.get('apiKey') !== undefined) {
    throw new BadRequestException(`apiKey was set, but username was not: ${params.get('apiKey')}`);
  }
  if (params.get('password') !== undefined) {
    throw new BadRequestException('password was set, but username was not');
  }
  if (authHeader !== null) {
    return UserLimits.getLimitsWithJwtToken(config, authHeader, null, params.get('tokenV2') ?? null);
  }
  return UserLimits.getDefaultLimits(config);
}

// Java: ServerTools#getMode(Map)
export function getMode(params) {
  let mode;
  if (params.get('mode') !== undefined) {
    const modeParam = params.get('mode');
    if (modeParam === 'textLevelOnly') {
      mode = Mode.TEXTLEVEL_ONLY;
    } else if (modeParam === 'allButTextLevelOnly') {
      mode = Mode.ALL_BUT_TEXTLEVEL_ONLY;
    } else if (modeParam === 'all') {
      mode = Mode.ALL;
    } else if (modeParam === 'batch') {
      // used in undocumented API for /words/add, /words/delete; ignore
      mode = Mode.ALL;
    } else {
      throw new BadRequestException(`Mode must be one of 'textLevelOnly', 'allButTextLevelOnly', or 'all' but was: '${modeParam}'`);
    }
  } else {
    mode = Mode.ALL;
  }
  return mode;
}

// Java: ServerTools#getModeForLog(Mode)
export function getModeForLog(mode) {
  switch (mode) {
    case Mode.TEXTLEVEL_ONLY: return 'tlo';
    case Mode.ALL_BUT_TEXTLEVEL_ONLY: return '!tlo';
    case Mode.ALL: return 'all';
    default: return '?';
  }
}

const LEVELS = { default: 'DEFAULT', picky: 'PICKY', academic: 'ACADEMIC', clarity: 'CLARITY', professional: 'PROFESSIONAL', creative: 'CREATIVE', customer: 'CUSTOMER', jobapp: 'JOBAPP', objective: 'OBJECTIVE', elegant: 'ELEGANT' };

// Java: ServerTools#getLevel(Map)
export function getLevel(params) {
  if (params.get('level') !== undefined) {
    const param = params.get('level');
    if (Object.hasOwn(LEVELS, param)) return Level[LEVELS[param]];
    throw new BadRequestException(`Unknown value '${param}' for parameter 'level'. Valid values: ${Object.keys(LEVELS).join(', ')}`);
  }
  return Level.DEFAULT;
}

// Java: ServerTools#cleanUserTextFromMessage(String,Map)
export function cleanUserTextFromMessage(s, params) {
  if ((params.has('inputLogging') ? params.get('inputLogging') : '') === 'no') {
    return s.replace(/<sentcontent>[\s\S]*<\/sentcontent>/g, '<< content removed >>');
  }
  return s;
}

// Java: ServerTools#siteMatches(String,String)
export function siteMatches(referrer, blockedRef) {
  return referrer.startsWith(blockedRef)
    || referrer.startsWith(`http://${blockedRef}`) || referrer.startsWith(`https://${blockedRef}`)
    || referrer.startsWith(`http://www.${blockedRef}`) || referrer.startsWith(`https://www.${blockedRef}`);
}

// Java: ServerTools#getAuthHeader(Headers)
export function getAuthHeader(headers) {
  let authHeader = null;
  if (headers !== null && headers !== undefined) {
    authHeader = headers.getFirst('Authorization');
    if (authHeader !== null && authHeader.trim() === '') authHeader = null; // String#isBlank, ASCII/Unicode whitespace
  }
  return authHeader;
}

// Java: ServerTools#getHttpUserAgent(HttpExchange)
export function getHttpUserAgent(httpExchange) {
  return httpExchange.getRequestHeaders().getFirst('User-Agent');
}

// Java: ServerTools#getHttpReferrer(HttpExchange)
export function getHttpReferrer(httpExchange) {
  return httpExchange.getRequestHeaders().getFirst('Referer');
}
