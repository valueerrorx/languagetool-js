// I06: resource files that no runtime path of the port reads (trace docs/review/I06-trace/); applied by scripts/resources.mjs.
// Each group: reason + entries; an entry is an exact path, or ends with '/' (prefix) or contains '*' (glob over one path segment).
const R = 'org/languagetool/resource/';

export const EXCLUDES = [
  {
    reason: 'language-detection profiles of languages that are not in the distribution language list (DefaultLanguageIdentifier#getLanguageCodes never asks for them)',
    entries: [
      ...['af', 'an', 'ast', 'bg', 'bn', 'cs', 'cy', 'et', 'eu', 'fi', 'gl', 'gu', 'he', 'hi', 'hr', 'ht', 'hu', 'id', 'is', 'kn', 'ko', 'lt', 'lv', 'mk', 'ml', 'mr', 'ms', 'mt', 'ne', 'no', 'oc', 'pa', 'so', 'sq', 'sr', 'sw', 'te', 'th', 'tr', 'ur', 'vi', 'yi'].map((c) => `languages/${c}`),
      `${R}ast/ast.profile`, // external profiles are only loaded for eo and crh
    ],
  },
  {
    reason: 'languages.shorttext/ profiles: the short-text n-gram profiles of the Java distribution are never loaded (no code refers to the directory)',
    entries: ['languages.shorttext/'],
  },
  {
    reason: 'training/candidate/work-in-progress data and ML models that no code refers to',
    entries: [
      `${R}de/confusion_set_candidates.txt`, `${R}de/errors.txt`, `${R}de/hunspell/spelling_merged.txt`, `${R}de/spelling_correction_model.bin`,
      `${R}de/words-similar.txt`, // also excluded from the Java jar (languagetool-language-modules/de/pom.xml)
      `${R}en/confusion_set_candidates.txt`, `${R}en/confusion_sets_extended.txt`, `${R}en/confusion_sets_l2_nl_wip.txt`, `${R}en/errors.txt`,
      `${R}en/spelling_correction_model.bin`, `${R}en/confusion_sets.README`, `${R}en/SynthDictionaryBuilder*.txt`,
      `${R}es/confusion_set_candidates.txt`, `${R}es/test.txt`, `${R}es/test-tagged.txt`, `${R}es/verb_noun.txt`, 'org/languagetool/rules/es/el.txt',
      `${R}ru/russian_manual_add.txt`, 'org/languagetool/rules/sk/grammar-nezaradene.xml',
    ],
  },
  {
    reason: 'data of n-gram language-model rules, which are not ported (DEV-001: English/German/... getRelevantLanguageModelRules are empty or throw notPortedYet)',
    entries: [
      `${R}de/ambiguous_case.txt`, `${R}de/compound_exceptions.txt`, // UpperCaseNgramRule, ProhibitedCompoundRule
      `${R}en/confusion_sets_l2_de.txt`, `${R}en/confusion_sets_l2_es.txt`, `${R}en/confusion_sets_l2_fr.txt`, `${R}en/confusion_sets_l2_nl.txt`, // EnglishForL2SpeakersFalseFriendRule
      `${R}es/confusion_sets.txt`, `${R}it/confusion_sets.txt`, `${R}ru/confusion_sets.txt`, // XxConfusionProbabilityRule (needs an n-gram index)
    ],
  },
  {
    reason: 'word-list build inputs that the Java jar itself leaves out (en/pom.xml excludes) or that only the dictionary build tools use',
    entries: [
      `${R}en/filter-archaic.txt`, `${R}en/filter-minus.txt`, `${R}en/numbers.txt`, `${R}en/partlycountable.txt`, `${R}en/uncountable.txt`, `${R}en/*.awk`,
    ],
  },
  {
    reason: 'POS tagset descriptions (documentation only, no code reads tagset.txt)',
    entries: ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'sk'].map((c) => `${R}${c}/tagset.txt`).concat(`${R}es/etiquetas-eagles.md`),
  },
  {
    reason: 'dictionary build scripts and hunspell header fragments (shell, awk, python)',
    entries: [
      `${R}de/hunspell/create_dict.sh`, `${R}de/hunspell/de_AT.dic.header`, `${R}de/hunspell/de_CH.dic.header`, `${R}de/hunspell/de_DE.dic.header`,
      `${R}es/synthesis.awk`, `${R}it/morph_data_italian.awk`, `${R}it/not_smi.awk`,
      `${R}ru/hunspell/freq-wordlist.awk`, `${R}ru/hunspell/make-freq-wordlist-ru.sh`, `${R}ru/hunspell/make_ru_RU.sh`, `${R}ru/hunspell/make_spell_dict.awk`,
      `${R}ru/make_dict_ru.sh`, `${R}ru/yo.awk`, `${R}sk/bin/filter_lft.py`, `${R}sk/create_dictionary.sh`, 'org/languagetool/rules/en/indent.sh',
    ],
  },
  {
    reason: 'XSLT/CSS/HTML presentation files of the rule XML (editor tooling, never read)',
    entries: [
      'org/languagetool/rules/false-friends.css', 'org/languagetool/rules/false-friends.html', 'org/languagetool/rules/print-ff.xsl',
      'org/languagetool/rules/print.xsl', 'org/languagetool/rules/rules.css',
    ],
  },
  {
    reason: 'XSD/DTD schemas nothing reads (XSD/DTD validity is not ported, D-048). Kept on purpose: logback.xml, server mapper XMLs and mybatis-config.xml (read by parity case X-XML/sax-core)',
    entries: [
      `${R}api-output.dtd`, `${R}disambiguation.xsd`,
      'org/languagetool/rules/bitext.xsd', 'org/languagetool/rules/pattern.xsd', 'org/languagetool/rules/remote-rules.xsd', 'org/languagetool/rules/rules.xsd',
    ],
  },
];

// Java: n/a (glob of one path segment: '*' = any characters except '/')
function matcher(entry) {
  if (entry.endsWith('/')) return (rel) => rel.startsWith(entry);
  if (entry.includes('*')) {
    const re = new RegExp(`^${entry.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
    return (rel) => re.test(rel);
  }
  return (rel) => rel === entry;
}

const MATCHERS = EXCLUDES.flatMap((g) => g.entries.map(matcher));

// true when the resources/ path (also .dup/<n>/<path>) is on the exclude list
export function isExcluded(rel) {
  const base = rel.replace(/^\.dup\/\d+\//, '');
  return MATCHERS.some((m) => m(base));
}
