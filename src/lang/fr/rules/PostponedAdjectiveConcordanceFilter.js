// org.languagetool.rules.fr.PostponedAdjectiveConcordanceFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { arrayGet } from '../../../lib/java/arrays.js';
import { equalsIgnoreCase, toLowerCase } from '../../../lib/java/strings.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { FrenchSynthesizer } from '../synthesis/FrenchSynthesizer.js';

const maxLevels = 4; // Java: PostponedAdjectiveConcordanceFilter#maxLevels (instance final field)

const NOM = Pattern.compile('[NZ] .*');
const NOM_MS = Pattern.compile('[NZ] m s');
const NOM_FS = Pattern.compile('[NZ] f s');
const NOM_MP = Pattern.compile('[NZ] m p');
const NOM_MN = Pattern.compile('[NZ] m sp');
const NOM_FP = Pattern.compile('[NZ] f p');
const NOM_CS = Pattern.compile('[NZ] e s');
const NOM_CP = Pattern.compile('[NZ] e sp');
const NOM_DET = Pattern.compile('[NZ] .*|(P\\+)?D .*');
const _GN_ = Pattern.compile('_GN_.*');
const _GN_MS = Pattern.compile('_GN_MS');
const _GN_FS = Pattern.compile('_GN_FS');
const _GN_MP = Pattern.compile('_GN_MP');
const _GN_FP = Pattern.compile('_GN_FP');
const _GN_CS = Pattern.compile('_GN_[MF]S');
const _GN_CP = Pattern.compile('_GN_[MF]P');
const _GN_MN = Pattern.compile('_GN_M[SP]');
const _GN_FN = Pattern.compile('_GN_F[SP]');
const DET = Pattern.compile('(P\\+)?D .*');
const DET_CS = Pattern.compile('(P\\+)?D e s');
const DET_MS = Pattern.compile('(P\\+)?D m s');
const DET_FS = Pattern.compile('(P\\+)?D f s');
const DET_MP = Pattern.compile('(P\\+)?D m p');
const DET_FP = Pattern.compile('(P\\+)?D f p');
const DET_CP = Pattern.compile('(P\\+)?D e p');
const GN_MS = Pattern.compile('[NZ] [me] (s|sp)|J [me] (s|sp)|V ppa m s|(P\\+)?D m (s|sp)');
const GN_FS = Pattern.compile('[NZ] [fe] (s|sp)|J [fe] (s|sp)|V ppa f s|(P\\+)?D f (s|sp)');
const GN_MP = Pattern.compile('[NZ] [me] (p|sp)|J [me] (p|sp)|V ppa m p|(P\\+)?D m (p|sp)');
const GN_FP = Pattern.compile('[NZ] [fe] (p|sp)|J [fe] (p|sp)|V ppa f p|(P\\+)?D f (p|sp)');
const GN_CP = Pattern.compile('[NZ] [fme] (p|sp)|J [fme] (p|sp)|(P\\+)?D [fme] (p|sp)');
const GN_CS = Pattern.compile('[NZ] [fme] (s|sp)|J [fme] (s|sp)|(P\\+)?D [fme] (s|sp)');
const GN_MN = Pattern.compile('[NZ] [me] (s|p|sp)|J [me] (s|p|sp)|(P\\+)?D [me] (s|p|sp)');
const GN_FN = Pattern.compile('[NZ] [fe] (s|p|sp)|J [fe] (s|p|sp)|(P\\+)?D [fe] (s|p|sp)');
const ADJECTIU = Pattern.compile('J .*|V ppa .*|PX.*');
const ADJECTIU_MS = Pattern.compile('J [me] (s|sp)|V ppa m s');
const ADJECTIU_FS = Pattern.compile('J [fe] (s|sp)|V ppa f s');
const ADJECTIU_MP = Pattern.compile('J [me] (p|sp)|V ppa m p');
const ADJECTIU_FP = Pattern.compile('J [fe] (p|sp)|V ppa f p');
const ADJECTIU_CP = Pattern.compile('J e (p|sp)');
const ADJECTIU_CS = Pattern.compile('J e (s|sp)');
const ADJECTIU_MN = Pattern.compile('J m sp');
const ADJECTIU_FN = Pattern.compile('J f sp');
const ADJECTIU_S = Pattern.compile('J .* (s|sp)|V ppa . s');
const ADJECTIU_P = Pattern.compile('J .* (p|sp)|V ppa . p');
const ADJECTIU_M = Pattern.compile('J [me] .*|V ppa [me] .*');
const ADJECTIU_F = Pattern.compile('J [fe] .*|V ppa [fe] .*');
const ADVERBI = Pattern.compile('A');
const CONJUNCIO = Pattern.compile('C .*');
const PUNTUACIO = Pattern.compile('_PUNCT');
const LOC_ADV = Pattern.compile('A');
const ADVERBIS_ACCEPTATS = Pattern.compile('A');
const COORDINACIO_IONI = Pattern.compile('et|ou|ni');
const KEEP_COUNT = Pattern.compile('Y|J .*|N .*|D .*|P.*|V ppa .*|M nonfin|UNKNOWN|Z.*|V.* inf|V ppr');
const KEEP_COUNT2 = Pattern.compile(',|et|ou|ni');
const STOP_COUNT = Pattern.compile('[;:\\(\\)\\[\\]–—―‒]');
const PREPOSICIONS = Pattern.compile('P.*');
const PREPOSICIO_CANVI_NIVELL = Pattern.compile('d\'|de|des|du|à|au|aux|en|dans|sur|entre|par|pour|avec|sans|contre|comme');
const VERB = Pattern.compile('V.* (inf|ind|sub|con|ppr|imp).*');
const INFINITIVE = Pattern.compile('V.* inf');
const GV = Pattern.compile('_GV_');

// Java: PostponedAdjectiveConcordanceFilter (checks if an adjective doesn't agree with the previous noun and with any of the previous words)
export class PostponedAdjectiveConcordanceFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.fr.PostponedAdjectiveConcordanceFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.PostponedAdjectiveConcordanceFilter()' }];

  adverbAppeared = false;
  conjunctionAppeared = false;
  punctuationAppeared = false;
  infinitiveAppeared = false;

  // Java: PostponedAdjectiveConcordanceFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos) {
    const tokens = match.getSentence().getTokensWithoutWhitespace();
    const i = patternTokenPos;
    let j;
    let isPlural = true;
    let isPrevNoun = false;
    let substPattern = null;
    let gnPattern = null;
    let adjPattern = null;
    let canBeMS = false;
    let canBeFS = false;
    let canBeMP = false;
    let canBeFP = false;
    let canBeP = false;
    /* Count all nouns and determiners before the adjectives */
    // Takes care of acceptable combinations.
    const cNt = new Array(maxLevels).fill(0);
    const cNMS = new Array(maxLevels).fill(0);
    const cNFS = new Array(maxLevels).fill(0);
    const cNMP = new Array(maxLevels).fill(0);
    const cNMN = new Array(maxLevels).fill(0);
    const cNFP = new Array(maxLevels).fill(0);
    const cNCS = new Array(maxLevels).fill(0);
    const cNCP = new Array(maxLevels).fill(0);
    const cDMS = new Array(maxLevels).fill(0);
    const cDFS = new Array(maxLevels).fill(0);
    const cDMP = new Array(maxLevels).fill(0);
    const cDFP = new Array(maxLevels).fill(0);
    const cN = new Array(maxLevels).fill(0);
    const cD = new Array(maxLevels).fill(0);
    let level = 0;
    j = 1;
    this.initializeApparitions();
    while (i - j > 0 && this.keepCounting(tokens[i - j]) && level < maxLevels) {
      if (!isPrevNoun) {
        if (this.matchPostagRegexp(tokens[i - j], NOM) || (
        // adjectiu o participi sense nom, però amb algun determinant davant
        i - j - 1 > 0 && !this.matchPostagRegexp(tokens[i - j], NOM) && this.matchPostagRegexp(tokens[i - j], ADJECTIU)
            && this.matchPostagRegexp(tokens[i - j - 1], DET))) {
          if (this.matchPostagRegexp(tokens[i - j], _GN_MS)) {
            cNMS[level]++;
            canBeMS = true;
          }
          if (this.matchPostagRegexp(tokens[i - j], _GN_FS)) {
            cNFS[level]++;
            canBeFS = true;
          }
          if (this.matchPostagRegexp(tokens[i - j], _GN_MP)) {
            cNMP[level]++;
            canBeMP = true;
          }
          if (this.matchPostagRegexp(tokens[i - j], _GN_FP)) {
            cNFP[level]++;
            canBeFP = true;
          }
        }
        if (!this.matchPostagRegexp(tokens[i - j], _GN_)) {
          if (this.matchPostagRegexp(tokens[i - j], NOM_MS)) {
            cNMS[level]++;
            canBeMS = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_FS)) {
            cNFS[level]++;
            canBeFS = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_MP)) {
            cNMP[level]++;
            canBeMP = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_MN)) {
            cNMN[level]++;
            canBeMS = true;
            canBeMP = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_FP)) {
            cNFP[level]++;
            canBeFP = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_CS)) {
            cNCS[level]++;
            canBeMS = true;
            canBeFS = true;
          } else if (this.matchPostagRegexp(tokens[i - j], NOM_CP)) {
            cNCP[level]++;
            canBeFP = true;
            canBeMP = true;
          }
        }
      }
      // avoid two consecutive nouns
      if (this.matchPostagRegexp(tokens[i - j], NOM)) {
        cNt[level]++;
        isPrevNoun = true;
      } else {
        isPrevNoun = false;
      }

      if (this.matchPostagRegexp(tokens[i - j], DET_CS)) {
        if (this.matchPostagRegexp(tokens[i - j + 1], NOM_MS)) {
          cDMS[level]++;
          canBeMS = true;
        }
        if (this.matchPostagRegexp(tokens[i - j + 1], NOM_FS)) {
          cDFS[level]++;
          canBeFS = true;
        }
      }
      if (this.matchPostagRegexp(tokens[i - j], DET_CP)) {
        if (this.matchPostagRegexp(tokens[i - j + 1], NOM_MP)) {
          cDMS[level]++;
          canBeMP = true;
        }
        if (this.matchPostagRegexp(tokens[i - j + 1], NOM_FP)) {
          cDFS[level]++;
          canBeFP = true;
        }
      }
      // TODO (Java) DET_CS, DET_CP without noun afterwards
      if (!this.matchPostagRegexp(tokens[i - j], ADVERBI)) {
        if (this.matchPostagRegexp(tokens[i - j], DET_MS)) {
          cDMS[level]++;
          canBeMS = true;
        }
        if (this.matchPostagRegexp(tokens[i - j], DET_FS)) {
          cDFS[level]++;
          canBeFS = true;
        }
        if (this.matchPostagRegexp(tokens[i - j], DET_MP)) {
          cDMP[level]++;
          canBeMP = true;
        }
        if (this.matchPostagRegexp(tokens[i - j], DET_FP)) {
          cDFP[level]++;
          canBeFP = true;
        }
      }
      if (i - j - 1 > 0) {
        if (this.matchRegexp(tokens[i - j].getToken(), PREPOSICIO_CANVI_NIVELL)
            && this.matchPostagRegexp(tokens[i - j], PREPOSICIONS) // exclude "des" when it is only determiner
            && !this.matchPostagRegexp(tokens[i - j], CONJUNCIO) // "com" com a conjunció
            && !this.matchRegexp(tokens[i - j - 1].getToken(), COORDINACIO_IONI)
            && !this.matchPostagRegexp(tokens[i - j + 1], ADVERBI)) {
          level++;
          // exception: d'environ
        } else if (equalsIgnoreCase(tokens[i - j].getToken(), "d'")
            && equalsIgnoreCase(tokens[i - j + 1].getToken(), 'environ')) {
          level++;
        }
      }
      j = this.updateJValue(tokens, i, j, level);
      this.updateApparitions(tokens[i - j]);
      j++;
    }
    level++;
    if (level > maxLevels) {
      level = maxLevels;
    }
    j = 0;
    let cNtotal = 0;
    let cDtotal = 0;
    while (j < level) {
      cN[j] = cNMS[j] + cNFS[j] + cNMP[j] + cNFP[j] + cNCS[j] + cNCP[j] + cNMN[j];
      cD[j] = cDMS[j] + cDFS[j] + cDMP[j] + cDFP[j];
      cNtotal += cN[j];
      cDtotal += cD[j];

      // exceptions: adjective is plural and there are several nouns before
      if (this.matchPostagRegexp(arrayGet(tokens, i), ADJECTIU_MP) && (cN[j] > 1 || cD[j] > 1)
          && (cNMS[j] + cNMN[j] + cNMP[j] + cNCS[j] + cNCP[j] + cDMS[j] + cDMP[j]) > 0
          && (cNFS[j] + cNFP[j] <= cNt[j])) {
        return null;
      }
      if (this.matchPostagRegexp(arrayGet(tokens, i), ADJECTIU_FP) && (cN[j] > 1 || cD[j] > 1)
          && ((cNMS[j] + cNMP[j] + cNMN[j] + cDMS[j] + cDMP[j]) === 0 || (cNt[j] > 0 && cNFS[j] + cNFP[j] >= cNt[j]))) {
        return null;
      }
      // Adjective can't be singular
      if (cN[j] + cD[j] > 0) { // && level>1
        isPlural = isPlural && cD[j] > 1 && level > 1; // cN[j]>1
        canBeP = canBeP || cN[j] > 1;
      }
      j++;
    }
    // comma + plural noun
    isPlural = isPlural || (i - 2 > 0 && cNMP[0] + cNFP[0] + cNCP[0] > 0 && tokens[i - 2].getToken() === ',');

    // there is no noun, (no determinant --> && cDtotal==0)
    if (cNtotal === 0 && cDtotal === 0) {
      return null;
    }

    // patterns according to the analyzed adjective
    if (this.matchPostagRegexp(tokens[i], ADJECTIU_CS)) {
      substPattern = GN_CS;
      adjPattern = ADJECTIU_S;
      gnPattern = _GN_CS;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_CP)) {
      substPattern = GN_CP;
      adjPattern = ADJECTIU_P;
      gnPattern = _GN_CP;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_MN)) {
      substPattern = GN_MN;
      adjPattern = ADJECTIU_M;
      gnPattern = _GN_MN;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_FN)) {
      substPattern = GN_FN;
      adjPattern = ADJECTIU_FN;
      gnPattern = _GN_FN;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_MS)) {
      substPattern = GN_MS;
      adjPattern = ADJECTIU_MS;
      gnPattern = _GN_MS;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_FS)) {
      substPattern = GN_FS;
      adjPattern = ADJECTIU_FS;
      gnPattern = _GN_FS;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_MP)) {
      substPattern = GN_MP;
      adjPattern = ADJECTIU_MP;
      gnPattern = _GN_MP;
    } else if (this.matchPostagRegexp(tokens[i], ADJECTIU_FP)) {
      substPattern = GN_FP;
      adjPattern = ADJECTIU_FP;
      gnPattern = _GN_FP;
    }

    if (substPattern === null || gnPattern === null || adjPattern === null) {
      return null;
    }

    // combinations Det/Nom + adv (1,2..) + adj.
    // If there is agreement, the rule doesn't match
    j = 1;
    let keepCount = true;
    while (i - j > 0 && keepCount) {
      if (this.matchPostagRegexp(tokens[i - j], NOM_DET) && this.matchPostagRegexp(tokens[i - j], gnPattern)) {
        return null; // there is a previous agreeing noun
      } else if (!this.matchPostagRegexp(tokens[i - j], _GN_) && this.matchPostagRegexp(tokens[i - j], substPattern)) {
        return null; // there is a previous agreeing noun
      }
      keepCount = !this.matchPostagRegexp(tokens[i - j], NOM_DET);
      j++;
    }

    // Necessary condition: previous token is a non-agreeing noun
    // or it is adjective or adverb (not preceded by verb)
    if ((this.matchPostagRegexp(arrayGet(tokens, i - 1), NOM) && !this.matchPostagRegexp(tokens[i - 1], substPattern))
        || (this.matchPostagRegexp(tokens[i - 1], _GN_) && !this.matchPostagRegexp(tokens[i - 1], gnPattern))
        || (this.matchPostagRegexp(tokens[i - 1], ADJECTIU) && !this.matchPostagRegexp(tokens[i - 1], adjPattern))
        || (i > 2 && this.matchPostagRegexp(tokens[i - 1], ADVERBIS_ACCEPTATS) && !this.matchPostagRegexp(tokens[i - 2], VERB)
            && !this.matchPostagRegexp(tokens[i - 2], PREPOSICIONS))
        || (i > 3 && this.matchPostagRegexp(tokens[i - 1], LOC_ADV) && this.matchPostagRegexp(tokens[i - 2], LOC_ADV)
            && !this.matchPostagRegexp(tokens[i - 3], VERB) && !this.matchPostagRegexp(tokens[i - 3], PREPOSICIONS))) {
      // continue
    } else {
      return null;
    }

    // Adjective can't be singular. The rule matches
    if (!(isPlural && this.matchPostagRegexp(tokens[i], ADJECTIU_S))) {
      // look into previous words
      j = 1;
      this.initializeApparitions();
      while (i - j > 0 && this.keepCounting(tokens[i - j]) && (level > 1 || j < 4)) {
        // there is a previous agreeing noun
        if (!this.matchPostagRegexp(tokens[i - j], _GN_) && this.matchPostagRegexp(tokens[i - j], NOM_DET)
            && this.matchPostagRegexp(tokens[i - j], substPattern)) {
          return null;
          // there is a previous agreeing adjective (in a nominal group)
        } else if (this.matchPostagRegexp(tokens[i - j], gnPattern)) {
          return null;
          // if there is no nominal group, it requires noun
        }
        j = this.updateJValue(tokens, i, j, 0);
        this.updateApparitions(tokens[i - j]);
        j++;
      }
    }

    const synth = FrenchSynthesizer.INSTANCE;

    // The rule matches
    // Synthesize suggestions
    let suggestions = [];
    let at = this.getAnalyzedToken(tokens[patternTokenPos], ADJECTIU_CS);
    if (at !== null) {
      suggestions.push(...synth.synthesize(at, 'J e p', true));
    }
    if (suggestions.length === 0) {
      at = this.getAnalyzedToken(tokens[patternTokenPos], ADJECTIU_CP);
      if (at !== null) {
        suggestions.push(...synth.synthesize(at, 'J e s', true));
      }
    }
    if (suggestions.length === 0 && isPlural) {
      at = this.getAnalyzedToken(tokens[patternTokenPos], ADJECTIU_P);
      if (at !== null) {
        suggestions.push(...synth.synthesize(at, 'J . p|V ppa . p', true));
      }
    }
    at = this.getAnalyzedToken(tokens[patternTokenPos], ADJECTIU);
    if (at !== null && suggestions.length === 0) {
      if (canBeMS && !isPlural) {
        suggestions.push(...synth.synthesize(at, 'J [me] sp?|V ppa m s', true));
      }
      if (canBeFS && !isPlural) {
        suggestions.push(...synth.synthesize(at, 'J [fe] sp?|V ppa f s', true));
      }
      if (canBeMP) {
        suggestions.push(...synth.synthesize(at, 'J [me] s?p|V ppa m p', true));
      }
      if (canBeFP) {
        suggestions.push(...synth.synthesize(at, 'J [fe] s?p|V ppa f p', true));
      }
      if (canBeMS && (isPlural || canBeP)) {
        suggestions.push(...synth.synthesize(at, 'J [me] s?p|V ppa m p', true));
      }
      if (canBeFS && !canBeMS && (isPlural || canBeP)) {
        suggestions.push(...synth.synthesize(at, 'J [fe] s?p|V ppa f p', true));
      }
    }

    // set suggestion removing duplicates
    suggestions = [...new Set(suggestions)];
    // avoid the original token as suggestion
    const lowerToken = toLowerCase(tokens[patternTokenPos].getToken());
    if (suggestions.includes(lowerToken)) {
      suggestions.splice(suggestions.indexOf(lowerToken), 1);
    }
    if (suggestions.length === 0) {
      return null;
    }
    match.setSuggestedReplacements(suggestions);
    return match;
  }

  // Java: PostponedAdjectiveConcordanceFilter#updateJValue(AnalyzedTokenReadings[],int,int,int)
  updateJValue(tokens, i, j) {
    // deux ou plus
    if (this.matchRegexp(tokens[i - j].getToken(), COORDINACIO_IONI)) {
      if (i - j - 1 > 0 && i - j + 1 < tokens.length) {
        if (this.matchPostagRegexp(tokens[i - j - 1], DET) && tokens[i - j + 1].getToken() === 'plus') {
          j = j + 1;
        }
      }
    }
    return j;
  }

  // Java: PostponedAdjectiveConcordanceFilter#keepCounting(AnalyzedTokenReadings)
  keepCounting(aTr) {
    if (this.matchRegexp(aTr.getToken(), PREPOSICIO_CANVI_NIVELL)) {
      return true;
    }
    if (aTr.getToken() === '.') { // it is not sentence end, but abbreviation
      return true;
    }
    // stop searching if there is some of these combinations:
    // adverb+comma, adverb+conjunction, comma+conjunction,
    // punctuation+punctuation
    if ((this.adverbAppeared && this.conjunctionAppeared) || (this.adverbAppeared && this.punctuationAppeared)
        || (this.conjunctionAppeared && this.punctuationAppeared) || (this.punctuationAppeared && this.matchPostagRegexp(aTr, PUNTUACIO))
        || (this.infinitiveAppeared && this.matchRegexp(aTr.getToken(), COORDINACIO_IONI))
        || (this.infinitiveAppeared && this.adverbAppeared)) {
      return false;
    }
    return (this.matchPostagRegexp(aTr, KEEP_COUNT) || this.matchRegexp(aTr.getToken(), KEEP_COUNT2)
        || this.matchPostagRegexp(aTr, ADVERBIS_ACCEPTATS)) && !this.matchRegexp(aTr.getToken(), STOP_COUNT)
        && (!this.matchPostagRegexp(aTr, GV) || this.matchPostagRegexp(aTr, _GN_));
  }

  // Java: PostponedAdjectiveConcordanceFilter#initializeApparitions()
  initializeApparitions() {
    this.adverbAppeared = false;
    this.conjunctionAppeared = false;
    this.punctuationAppeared = false;
    this.infinitiveAppeared = false;
  }

  // Java: PostponedAdjectiveConcordanceFilter#updateApparitions(AnalyzedTokenReadings)
  updateApparitions(aTr) {
    this.conjunctionAppeared ||= this.matchPostagRegexp(aTr, CONJUNCIO);
    if (aTr.getToken() === 'com') {
      return;
    }
    if (this.matchPostagRegexp(aTr, NOM) || this.matchPostagRegexp(aTr, ADJECTIU)) {
      this.initializeApparitions();
      return;
    }
    this.adverbAppeared ||= this.matchPostagRegexp(aTr, ADVERBI);
    this.punctuationAppeared ||= (this.matchPostagRegexp(aTr, PUNTUACIO) || aTr.getToken() === ',');
    this.infinitiveAppeared ||= this.matchPostagRegexp(aTr, INFINITIVE);
  }

  // Java: PostponedAdjectiveConcordanceFilter#matchPostagRegexp(AnalyzedTokenReadings,Pattern)
  matchPostagRegexp(aToken, pattern) {
    let matches = false;
    for (const analyzedToken of aToken) {
      let posTag = analyzedToken.getPOSTag();
      if (posTag === null) {
        posTag = 'UNKNOWN';
      }
      const m = pattern.matcher(posTag);
      if (m.matches()) {
        matches = true;
        break;
      }
    }
    return matches;
  }

  // Java: PostponedAdjectiveConcordanceFilter#matchRegexp(String,Pattern)
  matchRegexp(s, pattern) {
    const m = pattern.matcher(s);
    return m.matches();
  }

  // Java: PostponedAdjectiveConcordanceFilter#getAnalyzedToken(AnalyzedTokenReadings,Pattern)
  getAnalyzedToken(aToken, pattern) {
    for (const analyzedToken of aToken) {
      let posTag = analyzedToken.getPOSTag();
      if (posTag === null) {
        posTag = 'UNKNOWN';
      }
      const m = pattern.matcher(posTag);
      if (m.matches()) {
        return analyzedToken;
      }
    }
    return null;
  }
}

registerClass(PostponedAdjectiveConcordanceFilter.FQCN, PostponedAdjectiveConcordanceFilter);
