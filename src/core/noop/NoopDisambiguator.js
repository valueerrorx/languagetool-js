// Java: org.languagetool.noop.NoopDisambiguator (extends AbstractDisambiguator)
export class NoopDisambiguator {
  static FQCN = 'org.languagetool.noop.NoopDisambiguator';

  // Java: AbstractDisambiguator#preDisambiguate(AnalyzedSentence)
  preDisambiguate(input) {
    return input;
  }

  // Java: NoopDisambiguator#disambiguate(AnalyzedSentence)
  disambiguate(input) {
    return input;
  }
}
