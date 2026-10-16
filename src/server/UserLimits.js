// Java: org.languagetool.server.UserLimits (anonymous limits only; account based limits follow with the user steps)
export class UserLimits {
  static FQCN = 'org.languagetool.server.UserLimits';

  // Java: UserLimits#UserLimits(int,long,Long,boolean)
  constructor(maxTextLength, maxCheckTimeMillis, premiumUid, hasPremium) {
    this.maxTextLength = maxTextLength;
    this.maxCheckTimeMillis = maxCheckTimeMillis;
    this.premiumUid = premiumUid;
    this.premium = hasPremium;
    this.dictionaryCacheSize = null;
    this.skipLimits = false;
    this.account = null;
    this.jwtContent = null;
  }

  // Java: UserLimits#getDefaultLimits(HTTPServerConfig)
  static getDefaultLimits(config) {
    if (config.premiumAlways) {
      return new UserLimits(config.getMaxTextLengthPremium(), config.getMaxCheckTimeMillisAnonymous(), 1n, true);
    }
    return new UserLimits(config.getMaxTextLengthAnonymous(), config.getMaxCheckTimeMillisAnonymous(), null, false);
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
