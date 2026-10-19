// org.languagetool.rules.TestHackHelper (JUnit detection: a JS test run switches it on explicitly, default false like the production JVM)
let junit = false;

// Java: TestHackHelper
export class TestHackHelper {
  static FQCN = 'org.languagetool.rules.TestHackHelper';

  // Java: TestHackHelper#isJUnitTest()
  static isJUnitTest() {
    return junit;
  }

  // test harness hook replacing the Java stack-trace inspection (org.junit.* or PatternRuleTest in the call stack)
  static setJUnitTest(value) {
    junit = value;
  }
}
