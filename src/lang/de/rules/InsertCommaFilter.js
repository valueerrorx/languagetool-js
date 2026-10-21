// org.languagetool.rules.de.InsertCommaFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit } from '../../../lib/java/strings.js';
import { arrayGet } from '../../../lib/java/arrays.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { GermanTagger } from '../tagging/GermanTagger.js';

const WHITESPACE = Pattern.compile('\\s'); // Java: InsertCommaFilter#WHITESPACE
const SAGT = Pattern.compile('[Ss]agt?'); // Java: InsertCommaFilter#SAGT
const DER_ETC = Pattern.compile('der|die|das|seine|ihre|deine|unsere|meine|folgender|dieser'); // Java: InsertCommaFilter#DER_ETC
const DENKE_ETC = Pattern.compile('denke|dachte|glaube|schätze|vermute|behaupte'); // Java: InsertCommaFilter#DENKE_ETC
const BEI_FUER_MIT = Pattern.compile('bei|für|mit'); // Java: InsertCommaFilter#BEI_FUER_MIT
const DIR_ETC = Pattern.compile('[Di]ir|[Dd]ich|[Ee]uer|[Ee]uch'); // Java: InsertCommaFilter#DIR_ETC

// Java: InsertCommaFilter#getTag(int,String[]) (private static)
function getTag(i, parts) {
  return GermanTagger.INSTANCE.tag([arrayGet(parts, i)]);
}

// Java: InsertCommaFilter#hasTag(List,String) (private)
function hasTag(tags, tagStart) {
  return tags.some((k) => k.hasPosTagStartingWith(tagStart));
}

// Java: InsertCommaFilter
export class InsertCommaFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.InsertCommaFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.InsertCommaFilter()' }];

  // Java: InsertCommaFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), match.getMessage(), match.getShortMessage());
    const suggestions = [];
    for (const replacement of match.getSuggestedReplacements()) {
      const parts = WHITESPACE.split(replacement);
      try {
        if (parts.length === 2) {
          suggestions.push(parts[0] + ', ' + parts[1]);
        } else if (parts.length === 3) {
          const tags1 = getTag(0, parts);
          const tags2 = getTag(1, parts);
          const tags3 = getTag(2, parts);
          if (hasTag(tags1, 'VER:') && hasTag(tags2, 'PRO:PER:')) {
            // "Ich hoffe(,) es geht Ihnen gut."
            suggestions.push(parts[0] + ', ' + parts[1] + ' ' + parts[2]);
          } else if (SAGT.matcher(parts[0]).matches() && parts[1] === 'mal' && hasTag(tags3, 'VER:')) {
            // "Sag mal(,) hast du"
            suggestions.push(parts[0] + ' ' + parts[1] + ', ' + parts[2]);
          } else if (hasTag(tags1, 'VER:') && hasTag(tags2, 'ADV:') && hasTag(tags3, 'VER:')) {
            // "Ich denke(,) hier kann aber auch ..."
            suggestions.push(parts[0] + ', ' + parts[1] + ' ' + parts[2]);
          }
        } else if (parts.length >= 4 && parts.length <= 7) {
          const tags1 = getTag(0, parts);
          const tags2 = getTag(1, parts);
          const tags3 = getTag(2, parts);
          const tags4 = getTag(3, parts);
          const rest1 = parts.slice(1).join(' ');
          if (patternTokenPos <= 2 || (patternTokenPos === 3 && match.getSentence().getTokens().length >= 1 && arrayGet(match.getSentence().getTokens(), 1).hasPosTagStartingWith('ADV:'))) {
            if (parts.length === 5 && hasTag(tags1, 'VER:') && hasTag(tags2, 'ART:') && hasTag(tags3, 'SUB:') && hasTag(getTag(3, parts), 'SUB:') && hasTag(getTag(4, parts), 'VER:')) {
              // "Ist der Kunde Verbraucher(,) gilt ..."
              suggestions.push(parts[0] + ' ' + parts[1] + ' ' + parts[2] + ' ' + parts[3] + ',');
            } else if (parts.length === 4 &&
              arrayGet(patternTokens, 0).hasPosTagStartingWith('VER:') &&
              DER_ETC.matcher(arrayGet(patternTokens, 1).getToken()).matches()) {
              // "Aristoteles meint(,) das Genussleben führe nicht zum Glück."
              suggestions.push(parts[0] + ', ' + rest1);
            } else if (hasTag(tags1, 'VER:') && hasTag(tags2, 'PRO:POS:') && hasTag(tags3, 'SUB:')) {
              // "Ich glaube(,) eure Premium-Accounts sind noch aktiv."
              suggestions.push(parts[0] + ', ' + rest1);
            } else if (hasTag(tags1, 'VER:') && hasTag(tags2, 'PRO:PER:') && hasTag(tags3, 'ADV:INR')) {
              // "Weißt du(,) warum diese Regel aus ist?"
              const rest2 = parts.slice(2).join(' ');
              suggestions.push(parts[0] + ' ' + parts[1] + ', ' + rest2);
            } else if (hasTag(tags1, 'VER:') && hasTag(tags2, 'PRO:POS:') && hasTag(tags3, 'ADJ:')) {
              // "Ich glaube(,) eure individuellen Premium-Accounts sind noch aktiv."
              suggestions.push(parts[0] + ', ' + rest1);
            } else if (DENKE_ETC.matcher(parts[0]).matches() && hasTag(tags2, 'PRO:DEM:') && hasTag(tags3, 'SUB:')) {
              // "Ich schätze(,) diese Krawatte passt gut zum Anzug."
              suggestions.push(parts[0] + ', ' + rest1);
            } else if (patternTokenPos === 1 && BEI_FUER_MIT.matcher(parts[1]).matches() &&
                       DIR_ETC.matcher(parts[2]).matches() && hasTag(tags4, 'VER:')) {
              // "Hoffe(,) bei euch ist alles gut."
              suggestions.push(parts[0] + ', ' + rest1);
            }
          }
        }
      } catch (e) {
        if (e instanceof IOException) throw new RuntimeException(e);
        throw e;
      }
    }
    ruleMatch.setSuggestedReplacements(suggestions);
    ruleMatch.setType(match.getType());
    return ruleMatch;
  }
}

registerClass(InsertCommaFilter.FQCN, InsertCommaFilter);
