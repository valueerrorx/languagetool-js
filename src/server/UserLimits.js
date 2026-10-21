// Java: org.languagetool.server.UserLimits (limits of anonymous users and of requests to a server without database)
import { notPortedYet } from '../core/language/components.js';
import { DatabaseAccess } from './DatabaseAccess.js';
import { JwtContent } from './JwtContent.js';

export class UserLimits {
  static FQCN = 'org.languagetool.server.UserLimits';

  // Java: UserLimits#UserLimits(int,long,Long,boolean[,Long,Long,LimitEnforcementMode,UserInfoEntry,JwtContent])
  constructor(maxTextLength, maxCheckTimeMillis, premiumUid, hasPremium, dictCacheSize = null, requestsPerDay = null, limitEnforcement = null, account = null, jwtContent = null) {
    this.maxTextLength = maxTextLength;
    this.maxCheckTimeMillis = maxCheckTimeMillis;
    this.premiumUid = premiumUid;
    this.premium = hasPremium;
    this.dictionaryCacheSize = dictCacheSize;
    this.requestsPerDay = requestsPerDay;
    this.limitEnforcementMode = limitEnforcement;
    this.skipLimits = false;
    this.account = account;
    this.jwtContent = jwtContent;
  }

  // Java: UserLimits#getDefaultLimits(HTTPServerConfig)
  static getDefaultLimits(config) {
    if (config.premiumAlways) {
      return new UserLimits(config.getMaxTextLengthPremium(), config.getMaxCheckTimeMillisAnonymous(), 1n, true);
    }
    return new UserLimits(config.getMaxTextLengthAnonymous(), config.getMaxCheckTimeMillisAnonymous(), null, false);
  }

  // Java: UserLimits#getLimitsFromUserAccount(HTTPServerConfig,String,String)
  static getLimitsFromUserAccount(config, username, password) {
    const entry = DatabaseAccess.getInstance().getUserInfoWithPassword(username, password);
    if (entry === null) { // transparent fallback to anonymous user if DB down
      return UserLimits.getUserLimitsFromWhitelistOrDefault(config, username);
    }
    throw notPortedYet('UserLimits#getLimitsFromUserAccount (database user)');
  }

  // Java: UserLimits#getLimitsByApiKey(HTTPServerConfig,String,String)
  static getLimitsByApiKey(config, username, apiKey) {
    const db = DatabaseAccess.getInstance();
    const data = db.getUserInfoWithApiKey(username, apiKey);
    if (data === null) { // transparent fallback to anonymous user if DB down
      return UserLimits.getUserLimitsFromWhitelistOrDefault(config, username);
    }
    throw notPortedYet('UserLimits#getLimitsByApiKey (database user)');
  }

  // Java: UserLimits#getLimitsByAddonToken(HTTPServerConfig,String,String)
  static getLimitsByAddonToken(config, username, addonToken) {
    const db = DatabaseAccess.getInstance();
    const data = db.getUserInfoWithAddonToken(username, addonToken);
    if (data === null) { // transparent fallback to anonymous user if DB down
      return UserLimits.getUserLimitsFromWhitelistOrDefault(config, username);
    }
    throw notPortedYet('UserLimits#getLimitsByAddonToken (database user)');
  }

  // Java: UserLimits#getLimitsWithJwtToken(HTTPServerConfig,String,String,String)
  static getLimitsWithJwtToken(config, authHeader, username, addonToken) {
    const db = DatabaseAccess.isReady() ? DatabaseAccess.getInstance() : null;
    const data = (db !== null && username !== null && username !== undefined && username !== ''
      && addonToken !== null && addonToken !== undefined && addonToken !== '') ? db.getUserInfoWithAddonToken(username, addonToken) : null;
    const jwtContent = db !== null ? db.validateAuthHeader(authHeader) : JwtContent.NONE;
    if (data !== null) throw notPortedYet('UserLimits#getLimitsWithJwtToken (database user)');
    // nonPremium User send an invalid premium-token
    if (!jwtContent.isValid() && jwtContent.isPremium()) {
      const userLimits = username !== null && username !== undefined ? UserLimits.getUserLimitsFromWhitelistOrDefault(config, username) : UserLimits.getDefaultLimits(config);
      userLimits.jwtContent = jwtContent;
      return userLimits;
    }
    // anonymous user
    if (jwtContent.isPremium()) {
      return new UserLimits(config.getMaxTextLengthPremium(), config.getMaxCheckTimeMillisPremium(), null, true, null, null, null, null, jwtContent);
    }
    const userLimits = username !== null && username !== undefined ? UserLimits.getUserLimitsFromWhitelistOrDefault(config, username) : UserLimits.getDefaultLimits(config);
    userLimits.jwtContent = jwtContent;
    return userLimits;
  }

  // Java: UserLimits#getUserLimitsFromWhitelistOrDefault(HTTPServerConfig,String)
  static getUserLimitsFromWhitelistOrDefault(config, username) {
    if (config.getRequestLimitWhitelistUsers() === null) {
      return UserLimits.getDefaultLimits(config);
    }
    const mailDomain = username.substring(username.indexOf('@') + 1);
    let isWhitelisted = false;
    for (const whitelisted of config.getRequestLimitWhitelistUsers()) {
      if (whitelisted === username || whitelisted === mailDomain) {
        isWhitelisted = true;
        break;
      }
    }
    if (isWhitelisted) {
      return new UserLimits(config.getMaxTextLengthPremium(), config.getMaxCheckTimeMillisPremium(), null, true);
    }
    return UserLimits.getDefaultLimits(config);
  }

  // Java: UserLimits#getMaxTextLength()
  getMaxTextLength() {
    return this.maxTextLength;
  }

  // Java: UserLimits#getMaxCheckTimeMillis()
  getMaxCheckTimeMillis() {
    return this.maxCheckTimeMillis;
  }

  // Java: UserLimits#hasPremium()
  hasPremium() {
    return this.premium;
  }

  // Java: UserLimits#getPremiumUid()
  getPremiumUid() {
    return this.premiumUid;
  }

  // Java: UserLimits#getDictCacheSize()
  getDictCacheSize() {
    return this.dictionaryCacheSize;
  }

  // Java: UserLimits#getAccount()
  getAccount() {
    return this.account;
  }

  // Java: UserLimits#getJwtContent()
  getJwtContent() {
    return this.jwtContent;
  }

  // Java: UserLimits#getSkipLimits()
  getSkipLimits() {
    return this.skipLimits;
  }
}
