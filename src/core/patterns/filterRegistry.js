// FQCN registrations of the rule filter base classes and placeholders for XML filter classes that are ported later (F30/F34/language steps).
import { registerClass, hasClass } from '../resources/ClassBroker.js';
import { notPortedYet } from '../language/components.js';
import { RuleFilter } from './RuleFilter.js';
import { RegexRuleFilter } from './RegexRuleFilter.js';

RuleFilter.JAVA_ABSTRACT = true;
RegexRuleFilter.JAVA_ABSTRACT = true;
registerClass(RuleFilter.FQCN, RuleFilter);
registerClass(RegexRuleFilter.FQCN, RegexRuleFilter);

// filter classes referenced by the de/en/fr/core rule files (grep of <filter class=...>)
const PENDING_RULE_FILTERS = [
  'org.languagetool.rules.DateRangeChecker',
  'org.languagetool.rules.IsEnglishWordFilter',
  'org.languagetool.rules.SuppressIfAnyRuleMatchesFilter',
  'org.languagetool.rules.UnderlineSpacesFilter',
  'org.languagetool.rules.WhitespaceCheckFilter',
  'org.languagetool.rules.de.AdvancedSynthesizerFilter',
  'org.languagetool.rules.de.CompoundCheckFilter',
  'org.languagetool.rules.de.DateCheckFilter',
  'org.languagetool.rules.de.FutureDateFilter',
  'org.languagetool.rules.de.GermanNumberInWordFilter',
  'org.languagetool.rules.de.InsertCommaFilter',
  'org.languagetool.rules.de.NewYearDateFilter',
  'org.languagetool.rules.de.PotentialCompoundFilter',
  'org.languagetool.rules.de.RecentYearFilter',
  'org.languagetool.rules.de.RemoveUnknownCompoundsFilter',
  'org.languagetool.rules.de.ValidWordFilter',
  'org.languagetool.rules.de.YMDNewYearDateFilter',
  'org.languagetool.rules.en.AdverbFilter',
  'org.languagetool.rules.en.DateCheckFilter',
  'org.languagetool.rules.en.EnglishNumberInWordFilter',
  'org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.en.FindSuggestionsFilter',
  'org.languagetool.rules.en.FutureDateFilter',
  'org.languagetool.rules.en.NewYearDateFilter',
  'org.languagetool.rules.en.NoDisambiguationEnglishPartialPosTagFilter',
  'org.languagetool.rules.en.OrdinalSuffixFilter',
  'org.languagetool.rules.en.YMDNewYearDateFilter',
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
  'org.languagetool.rules.patterns.ApostropheTypeFilter',
  'org.languagetool.rules.AddCommasFilter',
  'org.languagetool.rules.AdaptSuggestionsFilter',
  'org.languagetool.rules.CheckPostagsInSuggestionFilter',
  'org.languagetool.rules.ConvertToSentenceCaseFilter',
  'org.languagetool.rules.ca.CatalanSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.de.GermanSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.es.FindSuggestionsFilter',
  'org.languagetool.rules.nl.DutchNumberInWordFilter',
  'org.languagetool.rules.ru.RussianSuppressMisspelledSuggestionsFilter',
  'org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter',
];
const PENDING_REGEX_RULE_FILTERS = ['org.languagetool.rules.patterns.RegexAntiPatternFilter'];

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
for (const fqcn of PENDING_REGEX_RULE_FILTERS) {
  if (!hasClass(fqcn)) registerClass(fqcn, pendingFilterClass(fqcn, RegexRuleFilter, 'acceptRuleMatch'));
}

// abstract filter base classes: class -> public constructors (Class#getConstructors(), JDK 17 reflection of the pinned jars); newInstance throws InstantiationException
const ABSTRACT_RULE_FILTERS = {
  'org.languagetool.rules.AbstractAdvancedSynthesizerFilter': [[]],
  'org.languagetool.rules.AbstractDateCheckFilter': [[]],
  'org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter': [[]],
  'org.languagetool.rules.AbstractFindSuggestionsFilter': [[]],
  'org.languagetool.rules.AbstractFutureDateFilter': [[]],
  'org.languagetool.rules.AbstractMakeContractionsFilter': [[]],
  'org.languagetool.rules.AbstractNewYearDateFilter': [[]],
  'org.languagetool.rules.AbstractNumberInWordFilter': [],
  'org.languagetool.rules.AbstractSuppressMisspelledSuggestionsFilter': [],
  'org.languagetool.rules.AbstractTextToNumberFilter': [[]],
  'org.languagetool.rules.PartialPosTagFilter': [[]],
};
for (const [fqcn, ctors] of Object.entries(ABSTRACT_RULE_FILTERS)) {
  if (hasClass(fqcn)) continue;
  const C = pendingFilterClass(fqcn, RuleFilter, 'acceptRuleMatch');
  C.JAVA_ABSTRACT = true;
  C.JAVA_CONSTRUCTORS = ctors.map((params) => ({ params, text: `public ${fqcn}(${params.join(',')})` }));
  registerClass(fqcn, C);
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
