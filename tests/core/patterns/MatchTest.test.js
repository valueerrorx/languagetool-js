// Ported from MatchTest (languagetool-core): all tests need MatchState (F29)
import { describe, it } from 'vitest';

describe('MatchTest', () => {
  for (const name of ['testStartUpper', 'testStartLower', 'testAllUpper', 'testAllLower', 'testPreserveStartUpper',
    'testStaticLemmaPreserveStartLower', 'testStaticLemmaPreserveStartUpper', 'testStaticLemmaPreserveAllUpper',
    'testStaticLemmaPreserveMixed', 'testPreserveStartLower', 'testPreserveAllUpper', 'testPreserveMixed',
    'testPreserveNoneUpper', 'testPreserveNoneLower', 'testPreserveNoneMixed', 'testSimpleIncludeFollowing',
    'testPOSIncludeFollowing', 'testIncludeAll', 'testPOSIncludeAll']) {
    it.skip(`${name} (F29: MatchState#toFinalString)`, () => {});
  }
});
