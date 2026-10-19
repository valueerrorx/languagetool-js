// Java: org.languagetool.tools.StringInterner (JS strings are values: interning is the identity)
export class StringInterner {
  static FQCN = 'org.languagetool.tools.StringInterner';

  // Java: StringInterner#intern(String)
  static intern(s) {
    return s;
  }
}
