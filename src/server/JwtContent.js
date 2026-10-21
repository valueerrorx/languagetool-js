// Java: org.languagetool.server.JwtContent (record)
export class JwtContent {
  static FQCN = 'org.languagetool.server.JwtContent';

  // Java: JwtContent#JwtContent(boolean,boolean,Map)
  constructor(isValid, isPremium, claims) {
    this.valid = isValid;
    this.premium = isPremium;
    this.claimsMap = claims;
  }

  // Java: JwtContent#isValid()
  isValid() {
    return this.valid;
  }

  // Java: JwtContent#isPremium()
  isPremium() {
    return this.premium;
  }

  // Java: JwtContent#claims()
  claims() {
    return this.claimsMap;
  }
}

JwtContent.NONE = new JwtContent(false, false, new Map());
