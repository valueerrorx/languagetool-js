// org.languagetool.GlobalConfig: only the static verbose flag so far (rest follows in F14).
let verbose = false;

export class GlobalConfig {
  static FQCN = 'org.languagetool.GlobalConfig';

  // Java: GlobalConfig#isVerbose()
  static isVerbose() {
    return verbose;
  }

  // Java: GlobalConfig#setVerbose(boolean)
  static setVerbose(v) {
    verbose = v;
  }
}
