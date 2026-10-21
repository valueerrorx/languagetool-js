// Java: German#getRelevantRules (+ GermanyGerman compound rule): the German rules ported so far, in Java list order (F57; F56 rules are inserted here when ported)
import { Example } from '../../src/core/rules/model/Examples.js';
import { getUrl } from '../../src/core/Tools.js';
import { WhiteSpaceBeforeParagraphEnd } from '../../src/core/rules/WhiteSpaceBeforeParagraphEnd.js';
import { WhiteSpaceAtBeginOfParagraph } from '../../src/core/rules/WhiteSpaceAtBeginOfParagraph.js';
import { EmptyLineRule } from '../../src/core/rules/EmptyLineRule.js';
import { LongParagraphRule } from '../../src/core/rules/LongParagraphRule.js';
import { PunctuationMarkAtParagraphEnd } from '../../src/core/rules/PunctuationMarkAtParagraphEnd.js';
import { GermanCompoundRule } from '../../src/lang/de/rules/GermanCompoundRule.js';
import { SwissCompoundRule } from '../../src/lang/de/rules/SwissCompoundRule.js';
import { GermanCommaWhitespaceRule } from '../../src/lang/de/rules/GermanCommaWhitespaceRule.js';
import { OldSpellingRule } from '../../src/lang/de/rules/OldSpellingRule.js';
import { SentenceWhitespaceRule } from '../../src/lang/de/rules/SentenceWhitespaceRule.js';
import { GermanDoublePunctuationRule } from '../../src/lang/de/rules/GermanDoublePunctuationRule.js';
import { MissingVerbRule } from '../../src/lang/de/rules/MissingVerbRule.js';
import { DashRule } from '../../src/lang/de/rules/DashRule.js';
import { VerbAgreementRule } from '../../src/lang/de/rules/VerbAgreementRule.js';
import { SubjectVerbAgreementRule } from '../../src/lang/de/rules/SubjectVerbAgreementRule.js';
import { WiederVsWiderRule } from '../../src/lang/de/rules/WiederVsWiderRule.js';
import { CompoundCoherencyRule } from '../../src/lang/de/rules/CompoundCoherencyRule.js';
import { ConjunctionAtBeginOfSentenceRule } from '../../src/lang/de/rules/ConjunctionAtBeginOfSentenceRule.js';
import { DuUpperLowerCaseRule } from '../../src/lang/de/rules/DuUpperLowerCaseRule.js';
import { MissingCommaRelativeClauseRule } from '../../src/lang/de/rules/MissingCommaRelativeClauseRule.js';
import { CompoundInfinitivRule } from '../../src/lang/de/rules/CompoundInfinitivRule.js';
import { SimpleReplaceRule } from '../../src/lang/de/rules/SimpleReplaceRule.js';
import { GermanUnpairedBracketsRule } from '../../src/lang/de/rules/GermanUnpairedBracketsRule.js';
import { GermanUnpairedQuotesRule } from '../../src/lang/de/rules/GermanUnpairedQuotesRule.js';
import { GermanWordRepeatRule } from '../../src/lang/de/rules/GermanWordRepeatRule.js';
import { GermanWordRepeatBeginningRule } from '../../src/lang/de/rules/GermanWordRepeatBeginningRule.js';
import { GermanWrongWordInContextRule } from '../../src/lang/de/rules/GermanWrongWordInContextRule.js';
import { AgreementRule } from '../../src/lang/de/rules/AgreementRule.js';
import { AgreementRule2 } from '../../src/lang/de/rules/AgreementRule2.js';
import { CaseRule } from '../../src/lang/de/rules/CaseRule.js';
import { WordCoherencyRule } from '../../src/lang/de/rules/WordCoherencyRule.js';
import { SimilarNameRule } from '../../src/lang/de/rules/SimilarNameRule.js';
import { GermanStyleRepeatedWordRule } from '../../src/lang/de/rules/GermanStyleRepeatedWordRule.js';
import { LongSentenceRule } from '../../src/lang/de/rules/LongSentenceRule.js';
import { GermanFillerWordsRule } from '../../src/lang/de/rules/GermanFillerWordsRule.js';
import { PassiveSentenceRule } from '../../src/lang/de/rules/PassiveSentenceRule.js';
import { SentenceWithModalVerbRule } from '../../src/lang/de/rules/SentenceWithModalVerbRule.js';
import { SentenceWithManRule } from '../../src/lang/de/rules/SentenceWithManRule.js';
import { NonSignificantVerbsRule } from '../../src/lang/de/rules/NonSignificantVerbsRule.js';
import { UnnecessaryPhraseRule } from '../../src/lang/de/rules/UnnecessaryPhraseRule.js';
import { GermanParagraphRepeatBeginningRule } from '../../src/lang/de/rules/GermanParagraphRepeatBeginningRule.js';
import { UnitConversionRule } from '../../src/lang/de/rules/UnitConversionRule.js';
import { RedundantModalOrAuxiliaryVerb } from '../../src/lang/de/rules/RedundantModalOrAuxiliaryVerb.js';
import { GermanReadabilityRule } from '../../src/lang/de/rules/GermanReadabilityRule.js';
import { StyleRepeatedVeryShortSentences } from '../../src/lang/de/rules/StyleRepeatedVeryShortSentences.js';
import { StyleRepeatedSentenceBeginning } from '../../src/lang/de/rules/StyleRepeatedSentenceBeginning.js';
import { GermanRepeatedWordsRule } from '../../src/lang/de/rules/GermanRepeatedWordsRule.js';
import { StyleTooOftenUsedVerbRule } from '../../src/lang/de/rules/StyleTooOftenUsedVerbRule.js';
import { StyleTooOftenUsedNounRule } from '../../src/lang/de/rules/StyleTooOftenUsedNounRule.js';
import { StyleTooOftenUsedAdjectiveRule } from '../../src/lang/de/rules/StyleTooOftenUsedAdjectiveRule.js';

// Java: German#getRelevantRules(ResourceBundle,UserConfig,Language,List) (ported rules only), GermanyGerman/NonSwissGerman#getRelevantRules (GermanCompoundRule last)
export function germanRelevantRules(l, m, uc) {
  return [
    new GermanCommaWhitespaceRule(m,
      Example.wrong('Die Partei<marker> ,</marker> die die letzte Wahl gewann.'),
      Example.fixed('Die Partei<marker>,</marker> die die letzte Wahl gewann.'),
      getUrl('https://languagetool.org/insights/de/beitrag/grammatik-leerzeichen/#fehler-1-leerzeichen-vor-und-nach-satzzeichen')),
    new GermanUnpairedBracketsRule(m, l),
    new GermanUnpairedQuotesRule(m, l),
    new WhiteSpaceBeforeParagraphEnd(m, l),
    new WhiteSpaceAtBeginOfParagraph(m),
    new EmptyLineRule(m, l),
    new LongParagraphRule(m, l, uc),
    new PunctuationMarkAtParagraphEnd(m, l),
    new SimpleReplaceRule(m, l),
    new OldSpellingRule(m, l),
    new SentenceWhitespaceRule(m),
    new GermanDoublePunctuationRule(m),
    new MissingVerbRule(m, l),
    new GermanWordRepeatRule(m, l),
    new GermanWordRepeatBeginningRule(m, l),
    new GermanWrongWordInContextRule(m, l),
    new AgreementRule(m, l),
    new AgreementRule2(m, l),
    new CaseRule(m, l),
    new DashRule(m),
    new VerbAgreementRule(m, l),
    new SubjectVerbAgreementRule(m, l),
    new WordCoherencyRule(m),
    new SimilarNameRule(m),
    new WiederVsWiderRule(m),
    new GermanStyleRepeatedWordRule(m, l, uc),
    new CompoundCoherencyRule(m),
    new LongSentenceRule(m, uc, 40),
    new GermanFillerWordsRule(m, l, uc),
    new PassiveSentenceRule(m, l, uc),
    new SentenceWithModalVerbRule(m, l, uc),
    new SentenceWithManRule(m, l, uc),
    new ConjunctionAtBeginOfSentenceRule(m, l, uc),
    new NonSignificantVerbsRule(m, l, uc),
    new UnnecessaryPhraseRule(m, l, uc),
    new GermanParagraphRepeatBeginningRule(m, l),
    new DuUpperLowerCaseRule(m),
    new UnitConversionRule(m),
    new MissingCommaRelativeClauseRule(m),
    new MissingCommaRelativeClauseRule(m, true),
    new RedundantModalOrAuxiliaryVerb(m),
    new GermanReadabilityRule(m, l, uc, true),
    new GermanReadabilityRule(m, l, uc, false),
    new CompoundInfinitivRule(m, l, uc),
    new StyleRepeatedVeryShortSentences(m, l, uc),
    new StyleRepeatedSentenceBeginning(m),
    new GermanRepeatedWordsRule(m),
    new StyleTooOftenUsedVerbRule(m, l, uc),
    new StyleTooOftenUsedNounRule(m, l, uc),
    new StyleTooOftenUsedAdjectiveRule(m, l, uc),
    l.getShortCodeWithCountryAndVariant() === 'de-CH' ? new SwissCompoundRule(m, l, uc) : new GermanCompoundRule(m, l, uc), // SwissGerman vs GermanyGerman/AustrianGerman#getRelevantRules
  ];
}
