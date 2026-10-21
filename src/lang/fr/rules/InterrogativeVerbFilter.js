// org.languagetool.rules.fr.InterrogativeVerbFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { Integer } from '../../../lib/java/int.js';
import { equalsIgnoreCase, javaReplace, substring } from '../../../lib/java/strings.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { preserveCase } from '../../../core/text/StringTools.js';
import { FrenchSynthesizer } from '../synthesis/FrenchSynthesizer.js';
import { FrenchTagger } from '../tagging/FrenchTagger.js';
import { French } from './FrenchLazy.js';

// Java: InterrogativeVerbFilter
export class InterrogativeVerbFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.fr.InterrogativeVerbFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.InterrogativeVerbFilter() throws java.io.IOException' }];

  // Java: InterrogativeVerbFilter#InterrogativeVerbFilter()
  constructor() {
    super();
    this.morfologikRule = French.getInstance().getDefaultSpellingRule();
  }

  // Java: InterrogativeVerbFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const replacements = [];
    const pronounFrom = this.getRequired('PronounFrom', arguments_);
    const verbFrom = this.getRequired('VerbFrom', arguments_);
    let desiredPostag = null;
    const extraSuggestions = [];
    if (pronounFrom !== null && verbFrom !== null) {
      const posPronoun = Integer.parseInt(pronounFrom);
      if (posPronoun < 1 || posPronoun > patternTokens.length) {
        throw new IllegalArgumentException('ConfusionCheckFilter: Index out of bounds in ' + match.getRule().getFullId()
            + ', PronounFrom: ' + posPronoun);
      }
      const posVerb = Integer.parseInt(verbFrom);
      if (posVerb < 1 || posVerb > patternTokens.length) {
        throw new IllegalArgumentException(
            'ConfusionCheckFilter: Index out of bounds in ' + match.getRule().getFullId() + ', VerbFrom: ' + posVerb);
      }
      const atrPronoun = patternTokens[posPronoun - 1];

      // vous
      if (atrPronoun.matchesPosTagRegex('R pers obj 2 p')) {
        desiredPostag = 'V.* (imp) [23] [sp]|V .*(ind|cond).* 2 p';
      } else if (atrPronoun.matchesPosTagRegex('R pers obj 1 p')) { // nous
        desiredPostag = 'V.* (imp) .*|V .*(ind|cond).* 1 p';
      } else if (atrPronoun.matchesPosTagRegex('R pers obj.*')) { // moi, toi, le, la, lui, nous, vous, les, leur
        desiredPostag = 'V.* (imp) .*';
      } else if (atrPronoun.matchesPosTagRegex('.* 1 s')) {
        desiredPostag = 'V .*(ind|cond).* 1 s';
        const atrVerb = patternTokens[posVerb - 1];
        const reading = atrVerb.readingWithTagRegex('V .*');
        if (reading !== null) {
          const participles = FrenchSynthesizer.INSTANCE.synthesize(reading, 'V ppa [me] sp?', true);
          if (participles.length > 0) {
            if (participles[0].endsWith('é')) {
              extraSuggestions.push(participles[0]);
              extraSuggestions.push(substring(participles[0], 0, participles[0].length - 1) + 'è');
            }
          }
        }
      } else if (atrPronoun.matchesPosTagRegex('.* 2 s')) {
        desiredPostag = 'V .*(ind|cond).* 2 s';
      } else if (atrPronoun.matchesPosTagRegex('.* 3( [mfe])? s')) {
        desiredPostag = 'V .*(ind|cond).* 3 s';
      } else if (atrPronoun.matchesPosTagRegex('.* 1 p')) {
        desiredPostag = 'V .*(ind|cond).* 1 p';
      } else if (atrPronoun.matchesPosTagRegex('.* 2 p')) {
        desiredPostag = 'V .*(ind|cond).* 2 p';
      } else if (atrPronoun.matchesPosTagRegex('.* 3( [mf])? p')) {
        desiredPostag = 'V .*(ind|cond).* 3 p';
      }

      // add: trompè-je and trompé-je for original sentence "trompe-je"
      if (extraSuggestions.length > 0) {
        for (const extraSuggestion of extraSuggestions) {
          const separator = (atrPronoun.getToken().startsWith('-') ? '' : '-');
          const completeSuggestion = extraSuggestion + separator + atrPronoun.getToken();
          if (!replacements.includes(completeSuggestion)
              && !completeSuggestion.endsWith('e-je')) { // exclude trompe-je
            replacements.push(completeSuggestion);
          }
        }
      } else if (desiredPostag !== null) {
        const auxPatternTokens = new Array(1);
        if (patternTokens[posVerb - 1].isTagged()) {
          auxPatternTokens[0] = new AnalyzedTokenReadings(
              new AnalyzedToken(this.makeWrong(patternTokens[posVerb - 1].getToken()), null, null));
        } else {
          auxPatternTokens[0] = patternTokens[posVerb - 1];
        }
        const sentence = new AnalyzedSentence(auxPatternTokens);
        const matches = this.morfologikRule.match(sentence);
        if (matches.length > 0) {
          const suggestions = matches[0].getSuggestedReplacements();
          const analyzedSuggestions = FrenchTagger.INSTANCE.tag(suggestions);
          for (const analyzedSuggestion of analyzedSuggestions) {
            if (analyzedSuggestion.matchesPosTagRegex(desiredPostag)) {
              const separator = (atrPronoun.getToken().startsWith('-') ? '' : '-');
              let completeSuggestion = analyzedSuggestion.getToken() + separator + atrPronoun.getToken();
              if (equalsIgnoreCase(completeSuggestion, 'peux-je')) {
                completeSuggestion = preserveCase('puis-je', completeSuggestion);
              }
              if (completeSuggestion.endsWith('e-je')) { // exclude trompe-je -> trompé-je, trompè-je
                completeSuggestion = substring(completeSuggestion, 0, completeSuggestion.length - 4) + 'é-je';
                if (!replacements.includes(completeSuggestion)) {
                  replacements.push(completeSuggestion);
                }
                completeSuggestion = substring(completeSuggestion, 0, completeSuggestion.length - 4) + 'è-je';
                if (!replacements.includes(completeSuggestion)) {
                  replacements.push(completeSuggestion);
                }
              } else if (!replacements.includes(completeSuggestion)) {
                replacements.push(completeSuggestion);
              }
            }
          }
        }
      }
    }

    const message = match.getMessage();
    const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(),
        message, match.getShortMessage());
    ruleMatch.setType(match.getType());
    if (replacements.length > 0) {
      ruleMatch.setSuggestedReplacements(replacements);
    }
    return ruleMatch;
  }

  // Java: InterrogativeVerbFilter#makeWrong(String)
  makeWrong(s) {
    /* this doesn't work for some cases: ex. tarta / trata */
    if (s.includes('a')) { return javaReplace(s, 'a', 'ä'); }
    if (s.includes('e')) { return javaReplace(s, 'e', 'ë'); }
    if (s.includes('i')) { return javaReplace(s, 'i', 'í'); }
    if (s.includes('o')) { return javaReplace(s, 'o', 'ö'); }
    if (s.includes('u')) { return javaReplace(s, 'u', 'ü'); }
    if (s.includes('é')) { return javaReplace(s, 'é', 'ë'); }
    if (s.includes('à')) { return javaReplace(s, 'à', 'ä'); }
    if (s.includes('è')) { return javaReplace(s, 'è', 'ë'); }
    if (s.includes('ù')) { return javaReplace(s, 'ù', 'ü'); }
    if (s.includes('â')) { return javaReplace(s, 'â', 'ä'); }
    if (s.includes('ê')) { return javaReplace(s, 'ê', 'ë'); }
    if (s.includes('î')) { return javaReplace(s, 'î', 'ï'); }
    if (s.includes('ô')) { return javaReplace(s, 'ô', 'ö'); }
    if (s.includes('û')) { return javaReplace(s, 'û', 'ü'); }
    return s + '-';
  }
}

registerClass(InterrogativeVerbFilter.FQCN, InterrogativeVerbFilter);
