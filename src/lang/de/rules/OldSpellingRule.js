// org.languagetool.rules.de.OldSpellingRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';
import { javaSplit, regionMatches, substring, toLowerCase } from '../../../lib/java/strings.js';
import { SpellingData } from './SpellingData.js';

const FILE_PATH = '/de/alt_neu.csv'; // Java: OldSpellingRule#FILE_PATH
// Java: OldSpellingRule#EXCEPTIONS
const EXCEPTIONS = [
  'Schloß Holte',
  'Schloß Neuhaus',
  'Schloß Ricklingen',
  'Schloß-Nauses',
  'Schloß Rötteln',
  'Klinikum Schloß Winnenden',
  'Grazer Schloßberg',
  'Höchster Schloß',
  'Bell Telephone',
  'Telephone Company',
  'American Telephone',
  'England Telephone',
  'Mobile Telephone',
  'Cordless Telephone',
  'Telephone Line',
  'World Telephone',
  'Tip Top',
  'Hans Joachim Blaß',
  'kurz fassen',
];
let data = null; // Java: OldSpellingRule#DATA (Suppliers.memoize)
const CHARS = Pattern.compile('[a-zA-Zöäüß]'); // Java: OldSpellingRule#CHARS

// Java: OldSpellingRule#DATA.get()
function getData() {
  if (data === null) {
    data = new SpellingData(FILE_PATH);
  }
  return data;
}

// Java: OldSpellingRule
export class OldSpellingRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.OldSpellingRule';

  // Java: OldSpellingRule(ResourceBundle,Language)
  constructor(messages, language) {
    super();
    this.language = language;
    this.setCategory(Categories.TYPOS.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.addExamplePair(Example.wrong('Der <marker>Abfluß</marker> ist schon wieder verstopft.'),
      Example.fixed('Der <marker>Abfluss</marker> ist schon wieder verstopft.'));
  }

  // Java: OldSpellingRule#getId()
  getId() {
    return 'OLD_SPELLING_RULE';
  }

  // Java: OldSpellingRule#getDescription()
  getDescription() {
    return 'Findet Schreibweisen, die nur in der alten Rechtschreibung gültig waren';
  }

  // Java: OldSpellingRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const text = sentence.getText();
    const hits = getData().getTrie().parseText(text);
    const sentStartHits = getData().getSentenceStartTrie().parseText(text);
    const startPositions = new Set();
    hits.reverse(); // work on longest matches first
    for (const hit of hits) {
      if (startPositions.has(hit.begin)) {
        continue; // avoid overlapping matches
      }
      if (!this.ignoreMatch(hit, text)) {
        this.addMatch(sentence, hit, matches);
        startPositions.add(hit.begin);
      }
    }
    for (const hit of sentStartHits) {
      if (startPositions.has(hit.begin)) {
        continue; // avoid overlapping matches
      }
      if (hit.begin === 0 && !this.ignoreMatch(hit, text)) { // e.g. "Läßt du das bitte", i.e. uppercase at start of sentence
        this.addMatch(sentence, hit, matches);
        break; // there can only be one match at the start of a sentence
      }
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: OldSpellingRule#addMatch(AnalyzedSentence,Hit,List)
  addMatch(sentence, hit, matches) {
    const message = 'Diese Schreibweise war nur in der alten Rechtschreibung korrekt.';
    const match = new RuleMatch(this, sentence, hit.begin, hit.end, message, 'Alte Rechtschreibung');
    const suggestions = javaSplit(hit.value, '\\|');
    match.setSuggestedReplacements(suggestions);
    const covered = substring(sentence.getText(), hit.begin, hit.end);
    if (suggestions.length > 0 && replaceOnce(suggestions[0], 'ss', 'ß') === covered) {
      if (this.language.getShortCodeWithCountryAndVariant() === 'de-AT' && toLowerCase(covered).includes('geschoß')) {
        // special case for Austria: "Geschoß" is correct in both old and new spelling in de-AT (because of the pronunciation)
        return;
      }
      match.setMessage(message + " Das Wort wird mit 'ss' geschrieben, wenn davor eine kurz gesprochene Silbe steht.");
    }
    matches.push(match);
  }

  // Java: OldSpellingRule#ignoreMatch(Hit,String)
  ignoreMatch(hit, text) {
    for (const exception of EXCEPTIONS) {
      if (regionMatches(text, true, hit.begin, exception, 0, exception.length)
        || regionMatches(text, true, hit.end - exception.length, exception, 0, exception.length)) {
        return true;
      }
    }
    if (hit.begin > 0 && !this.isBoundary(substring(text, hit.begin - 1, hit.begin))) { // prevent substring matches
      return true;
    }
    if (hit.end < text.length && !this.isBoundary(substring(text, hit.end, hit.end + 1))) { // prevent substring matches, e.g. "Foto" for "Photons"
      return true;
    }
    if (hit.begin - 6 >= 0) {
      if (text.startsWith('Prof.', hit.begin - 6)) {
        return true;
      }
    }
    if (hit.begin - 5 >= 0) {
      const before5 = substring(text, hit.begin - 5, hit.begin - 1);
      if (before5 === 'Herr' || before5 === 'Frau') {
        return true;
      }
    }
    if (hit.begin - 4 >= 0) {
      const before4 = substring(text, hit.begin - 4, hit.begin - 1);
      if (before4 === 'Hr.' || before4 === 'Fr.' || before4 === 'Dr.') {
        return true;
      }
    }
    return false;
  }

  // Java: OldSpellingRule#isBoundary(String)
  isBoundary(s) {
    return !CHARS.matcher(s).matches();
  }
}
