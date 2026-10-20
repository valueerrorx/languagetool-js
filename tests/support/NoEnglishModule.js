// The Java de module tests run without the en module on the classpath: IsEnglishWordFilter then finds no English language and accepts no match.
import { registerClass } from '../../src/core/resources/ClassBroker.js';
import '../../src/core/patterns/filterRegistry.js';
import { IsEnglishWordFilter } from '../../src/core/rules/IsEnglishWordFilter.js';

// IsEnglishWordFilter as in a classpath without Language en-US (Languages.getLanguageForShortCode throws, tagger stays null)
class NoEnglishIsEnglishWordFilter extends IsEnglishWordFilter {
  // Java: IsEnglishWordFilter#IsEnglishWordFilter() with no English language available
  constructor() {
    super();
    this.english = null;
    this.tagger = null;
  }
}

// call before the first analysis of a German sentence in the test file
export function simulateNoEnglishModule() {
  registerClass(IsEnglishWordFilter.FQCN, NoEnglishIsEnglishWordFilter);
}
