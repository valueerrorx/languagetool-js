// org.languagetool.GlobalConfig
import { Objects } from '../../../lib/java/Objects.js';

let verbose = false;

export class GlobalConfig {
  static FQCN = 'org.languagetool.GlobalConfig';

  // Java: GlobalConfig#GlobalConfig()
  constructor() {
    this.grammalecteServer = null;
    this.grammalecteUser = null;
    this.grammalectePassword = null;
    this.beolingusFile = null;
    this.nerUrl = null;
  }

  // Java: GlobalConfig#isVerbose()
  static isVerbose() {
    return verbose;
  }

  // Java: GlobalConfig#setVerbose(boolean)
  static setVerbose(v) {
    verbose = v;
  }

  // Java: GlobalConfig#setGrammalecteServer(String)
  setGrammalecteServer(serverUrl) {
    this.grammalecteServer = serverUrl;
  }

  // Java: GlobalConfig#setGrammalecteUser(String)
  setGrammalecteUser(user) {
    this.grammalecteUser = user;
  }

  // Java: GlobalConfig#setGrammalectePassword(String)
  setGrammalectePassword(password) {
    this.grammalectePassword = password;
  }

  // Java: GlobalConfig#setBeolingusFile(File)
  setBeolingusFile(beolingusFile) {
    this.beolingusFile = beolingusFile;
  }

  // Java: GlobalConfig#setNERUrl(String)
  setNERUrl(nerUrl) {
    this.nerUrl = nerUrl;
  }

  // Java: GlobalConfig#getGrammalecteServer()
  getGrammalecteServer() {
    return this.grammalecteServer;
  }

  // Java: GlobalConfig#getGrammalecteUser()
  getGrammalecteUser() {
    return this.grammalecteUser;
  }

  // Java: GlobalConfig#getGrammalectePassword()
  getGrammalectePassword() {
    return this.grammalectePassword;
  }

  // Java: GlobalConfig#getBeolingusFile()
  getBeolingusFile() {
    return this.beolingusFile;
  }

  // Java: GlobalConfig#getNerUrl()
  getNerUrl() {
    return this.nerUrl;
  }

  // Java: GlobalConfig#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.grammalecteServer, o.grammalecteServer)
      && Objects.equals(this.grammalecteUser, o.grammalecteUser)
      && Objects.equals(this.grammalectePassword, o.grammalectePassword)
      && Objects.equals(this.beolingusFile, o.beolingusFile)
      && Objects.equals(this.nerUrl, o.nerUrl);
  }

  // Java: GlobalConfig#hashCode()
  hashCode() {
    return Objects.hash(this.grammalecteServer, this.beolingusFile, this.nerUrl);
  }
}
