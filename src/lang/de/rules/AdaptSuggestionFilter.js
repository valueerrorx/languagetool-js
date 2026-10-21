// org.languagetool.rules.de.AdaptSuggestionFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaReplace, javaSplit, substring, toLowerCase } from '../../../lib/java/strings.js';
import { arrayGet } from '../../../lib/java/arrays.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SuggestionFilter } from '../../../core/rules/SuggestionFilter.js';
import { startsWithUppercase, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';
import { GermanTagger } from '../tagging/GermanTagger.js';
import { German } from '../language/German.js';
import { AgreementRule } from './AgreementRule.js';

let germanInstance = null; // Java: AdaptSuggestionFilter#german (private static final, new German())
// Java: AdaptSuggestionFilter#german
function german() {
  if (germanInstance === null) germanInstance = new German();
  return germanInstance;
}
const ART_PRO_PATTERN = Pattern.compile('(ART|PRO):.*'); // Java: AdaptSuggestionFilter#ART_PRO_PATTERN
const MAS_FEM_NEU_PATTERN = Pattern.compile('MAS|FEM|NEU'); // Java: AdaptSuggestionFilter#MAS_FEM_NEU_PATTERN
const PRO_POS_ETC_PATTERN = Pattern.compile('PRO:POS:(NOM|AKK|GEN|DAT):(SIN|PLU):(MAS|FEM|NEU)'); // Java: AdaptSuggestionFilter#PRO_POS_ETC_PATTERN
const STV_BEG_PATTERN = Pattern.compile(':(STV|BEG).*'); // Java: AdaptSuggestionFilter#STV_BEG_PATTERN

// Java: AdaptSuggestionFilter
export class AdaptSuggestionFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.AdaptSuggestionFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.AdaptSuggestionFilter()' }];

  // Java: AdaptSuggestionFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos) {
    let newMatch = null;
    let newSugg = [];
    if (patternTokenPos > 0) {
      const tokens = match.getSentence().getTokensWithoutWhitespace();
      const prevToken = arrayGet(tokens, patternTokenPos - 1);
      const detNoun = prevToken.hasPosTagStartingWith('ART:') || prevToken.hasPosTagStartingWith('PRO:');
      const detAdjNoun = patternTokenPos > 1
        && (arrayGet(tokens, patternTokenPos - 2).hasPosTagStartingWith('ART:') || arrayGet(tokens, patternTokenPos - 2).hasPosTagStartingWith('PRO:'))
        && prevToken.hasPosTagStartingWith('ADJ:');
      if (detNoun) {
        newMatch = new RuleMatch(match.getRule(), match.getSentence(), prevToken.getStartPos(), match.getToPos(), match.getMessage(), match.getShortMessage());
        for (const replacement of match.getSuggestedReplacements()) {
          const adaptedDets = this.getAdaptedDet(prevToken, replacement);
          for (const adaptedDet of adaptedDets) {
            const newRepl = adaptedDet + ' ' + replacement;
            if (!newSugg.includes(newRepl)) {
              newSugg.push(newRepl);
            }
          }
        }
        newMatch.setSuggestedReplacements(newSugg);
      } else if (detAdjNoun && false) { // Java: "&& false", TODO: needs more testing before commenting in
        const prevPrevToken = arrayGet(tokens, patternTokenPos - 2);
        newMatch = new RuleMatch(match.getRule(), match.getSentence(), prevPrevToken.getStartPos(), match.getToPos(), match.getMessage(), match.getShortMessage());
        for (const replacement of match.getSuggestedReplacements()) {
          const adaptedDets = this.getAdaptedDetAdj(prevPrevToken, prevToken, replacement);
          for (const adaptedDet of adaptedDets) {
            newSugg.push(adaptedDet + ' ' + replacement);
          }
        }
      }
    }
    const agreementRule = new AgreementRule(JLanguageTool.getMessageBundle(), german());
    const suggestionFilter = new SuggestionFilter(agreementRule, german());
    if (newSugg.length > 0) {
      if (startsWithUppercase(newSugg[0])) {
        newSugg = suggestionFilter.filter(newSugg, '{} ist das.');
      } else {
        newSugg = suggestionFilter.filter(newSugg, 'Das ist {}.');
      }
      newMatch.setSuggestedReplacements(newSugg);
      return newMatch;
    } else {
      return match;
    }
  }

  // Java: AdaptSuggestionFilter#getAdaptedDet(AnalyzedTokenReadings,String) (package-private)
  getAdaptedDet(detToken, repl) {
    const oldDetBaseform = this.getBaseform(detToken, '(ART|PRO):.*');
    const result = [];
    try {
      const replGender = this.getNounGender(repl);
      if (replGender === null || oldDetBaseform === null) {
        return result;
      }
      for (const reading of detToken.getReadings()) {
        if (reading.getPOSTag() === null || !(reading.getPOSTag().startsWith('ART:') || reading.getPOSTag().startsWith('PRO:'))) {
          continue;
        }
        const newDetPos = javaReplace(javaReplace(MAS_FEM_NEU_PATTERN.matcher(reading.getPOSTag()).replaceAll(replGender), 'BEG', '(BEG|B/S)'), ':STV', '');
        const replDet = GermanSynthesizer.INSTANCE.synthesize(new AnalyzedToken(oldDetBaseform, null, oldDetBaseform), newDetPos, true);
        for (const s of replDet) {
          if (startsWithUppercase(detToken.getToken())) {
            if (!toLowerCase(s).startsWith(toLowerCase(substring(detToken.getToken(), 0, 1)))) {
              continue; // see below
            }
            result.push(uppercaseFirstChar(s));
          } else {
            if (!s.startsWith(substring(detToken.getToken(), 0, 1))) {
              continue; // mein, dein, sein etc. all share the same lemma ("mein"), but don't suggest "dein" for "mein"
            }
            result.push(s);
          }
        }
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
    return result;
  }

  // Java: AdaptSuggestionFilter#getAdaptedDetAdj(AnalyzedTokenReadings,AnalyzedTokenReadings,String) (package-private)
  getAdaptedDetAdj(detToken, adjToken, repl) {
    const oldDetBaseform = this.getBaseform(detToken, '(ART|PRO):.*');
    const oldAdjBaseform = this.getBaseform(adjToken, 'ADJ:.*');
    const result = [];
    try {
      const replGender = this.getNounGender(repl);
      if (replGender === null || oldDetBaseform === null || oldAdjBaseform === null) {
        return result;
      }
      for (const reading of detToken.getReadings()) {
        if (reading.getPOSTag() === null || !ART_PRO_PATTERN.matcher(reading.getPOSTag()).matches()) {
          continue;
        }
        const newDetPos = javaReplace(MAS_FEM_NEU_PATTERN.matcher(reading.getPOSTag()).replaceAll(replGender), 'BEG', '(BEG|B/S)');
        let newAdjPos;
        if (newDetPos.startsWith('ART:')) {
          newAdjPos = javaReplace(javaReplace(MAS_FEM_NEU_PATTERN.matcher(reading.getPOSTag()).replaceAll(replGender), 'BEG', '(BEG|B/S)'), ':STV', '');
        } else if (newDetPos.startsWith('PRO:')) {
          newAdjPos = STV_BEG_PATTERN.matcher(PRO_POS_ETC_PATTERN.matcher(newDetPos).replaceAll('ADJ:$1:$2:$3')).replaceFirst(':GRU:IND');
        } else {
          throw new RuntimeException('Unexpected POS tag: ' + newDetPos);
        }
        const replDet = GermanSynthesizer.INSTANCE.synthesize(new AnalyzedToken(oldDetBaseform, null, oldDetBaseform), newDetPos, true);
        const replAdj = GermanSynthesizer.INSTANCE.synthesize(new AnalyzedToken(oldAdjBaseform, null, oldAdjBaseform), newAdjPos, true);
        for (const det of replDet) {
          if (!det.startsWith(substring(detToken.getToken(), 0, 1))) {
            continue; // mein, dein, sein etc. all share the same lemma ("mein"), but don't suggest "dein" for "mein"
          }
          for (const adj of replAdj) {
            const newDetAdj = det + ' ' + adj;
            if (!result.includes(newDetAdj)) {
              result.push(newDetAdj);
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
    return result;
  }

  // Java: AdaptSuggestionFilter#getBaseform(AnalyzedTokenReadings,String) (private)
  getBaseform(token, tagStartsWith) {
    let baseform = null;
    const pattern = Pattern.compile(tagStartsWith); // String#matches(regex)
    for (const reading of token.getReadings()) {
      if (reading.getPOSTag() !== null && pattern.matcher(reading.getPOSTag()).matches()) {
        baseform = reading.getLemma();
      }
      // TODO (Java): what if more than one match?
    }
    return baseform;
  }

  // Java: AdaptSuggestionFilter#getNounGender(String) (private)
  getNounGender(word) {
    const readings = GermanTagger.INSTANCE.tag([word]);
    for (const atr of readings) {
      if (atr.getReadings().length > 0) {
        const pos = atr.getReadings()[0].getPOSTag();
        if (pos !== null && pos.startsWith('SUB:')) {
          const parts = javaSplit(pos, ':');
          if (parts.length >= 4) {
            return parts[3];
          }
        }
      }
    }
    return null;
  }
}

registerClass(AdaptSuggestionFilter.FQCN, AdaptSuggestionFilter);
