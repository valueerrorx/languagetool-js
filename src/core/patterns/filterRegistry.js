// FQCN registrations of the rule filter base classes and placeholders for XML filter classes that are ported later (F34/language steps).
import { registerClass, hasClass } from '../resources/ClassBroker.js';
import { notPortedYet } from '../language/components.js';
import { RuleFilter } from './RuleFilter.js';
import { RegexRuleFilter } from './RegexRuleFilter.js';
import { RegexAntiPatternFilter } from './RegexAntiPatternFilter.js';
import { AbstractAdvancedSynthesizerFilter } from '../rules/AbstractAdvancedSynthesizerFilter.js';
import { AbstractDateCheckFilter } from '../rules/AbstractDateCheckFilter.js';
import { AbstractDateCheckWithSuggestionsFilter } from '../rules/AbstractDateCheckWithSuggestionsFilter.js';
import { AbstractFindSuggestionsFilter } from '../rules/AbstractFindSuggestionsFilter.js';
import { AbstractFutureDateFilter } from '../rules/AbstractFutureDateFilter.js';
import { AbstractMakeContractionsFilter } from '../rules/AbstractMakeContractionsFilter.js';
import { AbstractNewYearDateFilter } from '../rules/AbstractNewYearDateFilter.js';
import { AbstractNumberInWordFilter } from '../rules/AbstractNumberInWordFilter.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../rules/AbstractSuppressMisspelledSuggestionsFilter.js';
import { AbstractTextToNumberFilter } from '../rules/AbstractTextToNumberFilter.js';
import { AddCommasFilter } from '../rules/AddCommasFilter.js';
import { AdaptSuggestionsFilter } from '../rules/AdaptSuggestionsFilter.js';
import { CheckPostagsInSuggestionFilter } from '../rules/CheckPostagsInSuggestionFilter.js';
import { ConvertToSentenceCaseFilter } from '../rules/ConvertToSentenceCaseFilter.js';
import { DateRangeChecker } from '../rules/DateRangeChecker.js';
import { IsEnglishWordFilter } from '../rules/IsEnglishWordFilter.js';
import { PartialPosTagFilter } from '../rules/PartialPosTagFilter.js';
import { ShortenedYearRangeChecker } from '../rules/ShortenedYearRangeChecker.js';
import { SuppressIfAnyRuleMatchesFilter } from '../rules/SuppressIfAnyRuleMatchesFilter.js';
import { UnderlineSpacesFilter } from '../rules/UnderlineSpacesFilter.js';
import { WhitespaceCheckFilter } from '../rules/WhitespaceCheckFilter.js';
import { MultitokenSpellerFilter } from '../rules/spelling/multitoken/MultitokenSpellerFilter.js';
import { ApostropheTypeFilter } from './ApostropheTypeFilter.js';

RuleFilter.JAVA_ABSTRACT = true;
RegexRuleFilter.JAVA_ABSTRACT = true;
registerClass(RuleFilter.FQCN, RuleFilter);
registerClass(RegexRuleFilter.FQCN, RegexRuleFilter);
registerClass(RegexAntiPatternFilter.FQCN, RegexAntiPatternFilter);

// core filters of F34 (abstract bases carry JAVA_ABSTRACT/JAVA_CONSTRUCTORS themselves)
for (const cls of [AbstractAdvancedSynthesizerFilter, AbstractDateCheckFilter, AbstractDateCheckWithSuggestionsFilter, AbstractFindSuggestionsFilter,
  AbstractFutureDateFilter, AbstractMakeContractionsFilter, AbstractNewYearDateFilter, AbstractNumberInWordFilter, AbstractSuppressMisspelledSuggestionsFilter,
  AbstractTextToNumberFilter, PartialPosTagFilter, AddCommasFilter, AdaptSuggestionsFilter, CheckPostagsInSuggestionFilter, ConvertToSentenceCaseFilter,
  DateRangeChecker, IsEnglishWordFilter, ShortenedYearRangeChecker, SuppressIfAnyRuleMatchesFilter, UnderlineSpacesFilter, WhitespaceCheckFilter,
  MultitokenSpellerFilter, ApostropheTypeFilter]) {
  registerClass(cls.FQCN, cls);
}

// filter classes referenced by the de/en/fr/core rule files (grep of <filter class=...>)
const PENDING_RULE_FILTERS = [
  'org.languagetool.rules.fr.AdvancedSynthesizerFilter',
  'org.languagetool.rules.fr.DMYDateCheckFilter',
  'org.languagetool.rules.fr.DateCheckFilter',
  'org.languagetool.rules.fr.FindSuggestionsFilter',
  'org.languagetool.rules.fr.FrenchNumberInWordFilter',
  'org.languagetool.rules.fr.FrenchSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.fr.InterrogativeVerbFilter',
  'org.languagetool.rules.fr.MakeContractionsFilter',
  'org.languagetool.rules.fr.NewYearDateFilter',
  'org.languagetool.rules.fr.PostponedAdjectiveConcordanceFilter',
  'org.languagetool.rules.fr.SuggestionsFilter',
  'org.languagetool.rules.fr.WordWithDeterminerFilter',
  'org.languagetool.rules.ca.CatalanSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.es.FindSuggestionsFilter',
  'org.languagetool.rules.nl.DutchNumberInWordFilter',
  'org.languagetool.rules.ru.RussianSuppressMisspelledSuggestionsFilter',
];

// class that loads and instantiates like the Java filter but throws notPorted when the filter runs
function pendingFilterClass(fqcn, Base, method) {
  const C = class extends Base {
    static FQCN = fqcn;
    static JAVA_PENDING = true;
  };
  C.prototype[method] = function pending() {
    throw notPortedYet(`${fqcn}#${method} (filter class not ported yet)`);
  };
  return C;
}

// a later step that ports the class calls registerClass(fqcn, cls), which replaces the placeholder
for (const fqcn of PENDING_RULE_FILTERS) {
  if (!hasClass(fqcn)) registerClass(fqcn, pendingFilterClass(fqcn, RuleFilter, 'acceptRuleMatch'));
}

// classes that exist in Java (JDK or other LT classes) but are no rule filters: only Class.forName and getConstructors() are modelled
const JAVA_CLASS_STUBS = {
  'java.lang.Integer': [['int'], ['java.lang.String']],
  'java.util.ArrayList': [['int'], [], ['java.util.Collection']],
  'java.lang.Runnable': [],
  'java.lang.Thread': [[], ['java.lang.Runnable'], ['java.lang.ThreadGroup', 'java.lang.Runnable'], ['java.lang.String'], ['java.lang.ThreadGroup', 'java.lang.String'],
    ['java.lang.Runnable', 'java.lang.String'], ['java.lang.ThreadGroup', 'java.lang.Runnable', 'java.lang.String'],
    ['java.lang.ThreadGroup', 'java.lang.Runnable', 'java.lang.String', 'long'], ['java.lang.ThreadGroup', 'java.lang.Runnable', 'java.lang.String', 'long', 'boolean']],
  'org.languagetool.JLanguageTool': [['org.languagetool.Language'], ['org.languagetool.Language', 'org.languagetool.Language'],
    ['org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.UserConfig'],
    ['org.languagetool.Language', 'org.languagetool.Language', 'org.languagetool.ResultCache'],
    ['org.languagetool.Language', 'org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.UserConfig'],
    ['org.languagetool.Language', 'java.util.List', 'org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.GlobalConfig', 'org.languagetool.UserConfig'],
    ['org.languagetool.Language', 'java.util.List', 'org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.GlobalConfig', 'org.languagetool.UserConfig', 'boolean'],
    ['org.languagetool.Language', 'java.util.List', 'org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.GlobalConfig', 'org.languagetool.UserConfig', 'boolean', 'boolean'],
    ['org.languagetool.Language', 'java.util.List', 'org.languagetool.Language', 'org.languagetool.ResultCache', 'org.languagetool.GlobalConfig', 'org.languagetool.UserConfig', 'boolean', 'boolean', 'java.util.List']],
  'org.languagetool.rules.Rule': [[], ['java.util.ResourceBundle']],
  'org.languagetool.rules.patterns.PatternRule': [
    ['java.lang.String', 'org.languagetool.Language', 'java.util.List', 'java.lang.String', 'java.lang.String', 'java.lang.String'],
    ['java.lang.String', 'org.languagetool.Language', 'java.util.List', 'java.lang.String', 'java.lang.String', 'java.lang.String', 'java.lang.String'],
    ['java.lang.String', 'org.languagetool.Language', 'java.util.List', 'java.lang.String', 'java.lang.String', 'java.lang.String', 'java.lang.String', 'boolean'],
    ['java.lang.String', 'org.languagetool.Language', 'java.util.List', 'java.lang.String', 'java.lang.String', 'java.lang.String', 'java.lang.String', 'boolean', 'boolean']],
};
for (const [fqcn, ctors] of Object.entries(JAVA_CLASS_STUBS)) {
  if (hasClass(fqcn)) continue;
  const C = class { static FQCN = fqcn; };
  C.JAVA_CONSTRUCTORS = ctors.map((params) => ({ params, text: `public ${fqcn}(${params.join(',')})` }));
  registerClass(fqcn, C);
}
