// org.languagetool.rules.de.AgreementSuggestor2 (suggestions for German noun phrases that lack agreement)
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { Character } from '../../../lib/java/Character.js';
import { NullPointerException, RuntimeException } from '../../../lib/java/errors.js';
import { levenshteinDistance } from '../../../lib/java/LevenshteinDistance.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';
import { javaMatches, javaReplaceFirst } from '../../../lib/java/regex/index.js';
import { javaReplace, substring, toLowerCase, toUpperCase } from '../../../lib/java/strings.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { ReplacementType } from './AgreementRule.js';
import * as PrepositionToCases from './PrepositionToCases.js';

const detTemplate = 'ART:IND/DEF:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU';
const proPosTemplate = ['PRO:POS:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:BEG',
  'PRO:POS:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:B/S'];
const proDemTemplates = [
  'PRO:DEM:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:BEG',
  'PRO:DEM:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:B/S'];
const proIndTemplates = [
  'PRO:IND:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:BEG',
  'PRO:IND:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:B/S',
];
const adjTemplate = 'ADJ:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:GRU:IND/DEF';
const pa1Template = 'PA1:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:GRU:IND/DEF:VER';
const pa2Template = 'PA2:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:GRU:IND/DEF:VER';
const nounTemplates = [
  'SUB:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU',
  'SUB:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:INF']; // INF is for cases like "das Züchten" etc.
const number = ['SIN', 'PLU'];
const gender = ['MAS', 'FEM', 'NEU', 'NOG'];
const cases = ['NOM', 'AKK', 'DAT', 'GEN'];
const nounCasesDefault = ['NOM', 'AKK', 'DAT', 'GEN'];
const skipSuggestions = new JavaHashSet(['unsren', 'unsrem', 'unsres', 'unsre', 'unsern', 'unserm', 'unsrer']);

// Java: AgreementSuggestor2.Suggestion
class Suggestion {
  // Java: Suggestion#Suggestion(String,int,int)
  constructor(phrase, tokenLevelEdits, charLevelEdits) {
    if (phrase === null || phrase === undefined) throw new NullPointerException();
    this.phrase = phrase;
    this.tokenLevelEdits = tokenLevelEdits;
    this.charLevelCorrections = charLevelEdits;
  }

  // Java: Suggestion#compareTo(Suggestion)
  compareTo(o) {
    if (this.tokenLevelEdits === o.tokenLevelEdits) {
      return this.charLevelCorrections - o.charLevelCorrections;
    } else {
      return this.tokenLevelEdits - o.tokenLevelEdits;
    }
  }

  // Java: Suggestion#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.tokenLevelEdits === o.tokenLevelEdits && this.phrase === o.phrase;
  }

  // Java: Suggestion#toString()
  toString() {
    return this.phrase + '/c=' + this.tokenLevelEdits;
  }
}

// Java: AgreementSuggestor2
export class AgreementSuggestor2 {
  static FQCN = 'org.languagetool.rules.de.AgreementSuggestor2';

  // Java: AgreementSuggestor2(Synthesizer,ATR,ATR,ReplacementType) / (Synthesizer,ATR,ATR,ATR,ReplacementType) / (Synthesizer,ATR,ATR,ATR,ATR,ReplacementType), overloaded by argument count
  constructor(...a) {
    if (a.length === 4) {
      const [synthesizer, determinerToken, nounToken, replacementType] = a;
      return new AgreementSuggestor2(synthesizer, determinerToken, null, nounToken, replacementType);
    }
    if (a.length === 5) {
      const [synthesizer, determinerToken, adjToken1, nounToken, replacementType] = a;
      return new AgreementSuggestor2(synthesizer, determinerToken, adjToken1, null, nounToken, replacementType);
    }
    const [synthesizer, determinerToken, adjToken1, adjToken2, nounToken, replacementType] = a;
    this.prepositionToken = null;
    this.skippedStr = null;
    this.synthesizer = synthesizer;
    this.determinerToken = determinerToken;
    this.adjToken1 = adjToken1;
    this.adjToken2 = adjToken2;
    this.nounToken = nounToken;
    this.replacementType = replacementType;
    this.origPhrase = this.getOrigPhrase();
  }

  // Java: AgreementSuggestor2#setPreposition(AnalyzedTokenReadings)
  setPreposition(prep) {
    this.prepositionToken = prep;
  }

  // Java: AgreementSuggestor2#setSkipped(String)
  setSkipped(skippedStr) {
    this.skippedStr = skippedStr;
  }

  // Java: AgreementSuggestor2#getSuggestions() / getSuggestions(boolean), filter: only the best suggestions (fewest replaced words)
  getSuggestions(filter = false) {
    if (this.replacementType === ReplacementType.Zur) {
      this.prepositionToken = new AnalyzedTokenReadings(new AnalyzedToken('zu', '', 'zu'));
    } else if (this.replacementType === ReplacementType.Ins) {
      this.prepositionToken = new AnalyzedTokenReadings(new AnalyzedToken('in', '', 'zu'));
    }
    try {
      const suggestions = this.getSuggestionsInternal();
      suggestions.sort((x, y) => x.compareTo(y)); // sort so that suggestions with fewer edits come first
      this.addContraction(suggestions);
      if (filter) {
        const filteredSuggestions = [];
        const prevCorrections = suggestions.length > 0 ? suggestions[0].tokenLevelEdits : 0;
        let hadRealSuggestions = false;
        for (const suggestion of suggestions) {
          if (hadRealSuggestions && suggestion.tokenLevelEdits > prevCorrections) {
            break;
          }
          hadRealSuggestions = suggestion.tokenLevelEdits > 0;
          filteredSuggestions.push(suggestion);
        }
        return filteredSuggestions.map((k) => k.phrase);
      } else {
        return suggestions.map((k) => k.phrase);
      }
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      throw new RuntimeException(e);
    }
  }

  // Java: AgreementSuggestor2#addContraction(List)
  addContraction(suggestions) {
    if (this.replacementType === ReplacementType.Zur) {
      suggestions.forEach((k) => {
        if (k.phrase.startsWith('der')) {
          k.phrase = replaceOnce(k.phrase, 'der', 'zur');
        } else if (k.phrase.startsWith('den')) {
          k.phrase = replaceOnce(k.phrase, 'den', 'zu'); // usually sounds more natural than "zu den"
        } else if (k.phrase.startsWith('dem')) {
          k.phrase = replaceOnce(k.phrase, 'dem', 'zum');
        }
      });
    } else if (this.replacementType === ReplacementType.Ins) {
      for (let i = 0; i < suggestions.length;) {
        const s = suggestions[i];
        if (s.phrase.startsWith('das')) {
          s.phrase = replaceOnce(s.phrase, 'das', 'ins');
        } else if (s.phrase.startsWith('dem')) {
          s.phrase = replaceOnce(s.phrase, 'dem', 'im');
        } else if (s.phrase.startsWith('den')) {
          s.phrase = replaceOnce(s.phrase, 'den', 'in den');
        } else if (s.phrase.startsWith('die')) {
          s.phrase = replaceOnce(s.phrase, 'die', 'in die');
        } else {
          suggestions.splice(i, 1);
          continue;
        }
        i++;
      }
    }
  }

  // Java: AgreementSuggestor2#getSuggestionsInternal()
  getSuggestionsInternal() {
    const nounCases = this.getNounCases();
    const result = [];
    for (const num of number) {
      for (const gen of gender) {
        for (const aCase of cases) {
          if (!nounCases.includes(aCase)) {
            continue;
          }
          for (const detReading of this.determinerToken.getReadings()) {
            if (gen === 'NOG') { // needed to offer suggestions for e.g. "meinem Eltern" -> "meine Eltern, ..."
              const detSynthesized = this.getDetOrPronounSynth(num, 'MAS', aCase, detReading);
              const adj1Synthesized = this.getAdjSynth(num, 'MAS', aCase, this.adjToken1, detReading);
              const adj2Synthesized = this.getAdjSynth(num, 'MAS', aCase, this.adjToken2, detReading);
              const nounSynthesized = this.getNounSynth(num, 'NOG', aCase);
              this.combineSynth(result, detSynthesized, adj1Synthesized, adj2Synthesized, nounSynthesized);
            } else {
              const detSynthesized = this.getDetOrPronounSynth(num, gen, aCase, detReading);
              const adj1Synthesized = this.getAdjSynth(num, gen, aCase, this.adjToken1, detReading);
              const adj2Synthesized = this.getAdjSynth(num, gen, aCase, this.adjToken2, detReading);
              const nounSynthesized = this.getNounSynth(num, gen, aCase);
              this.combineSynth(result, detSynthesized, adj1Synthesized, adj2Synthesized, nounSynthesized);
            }
          }
        }
      }
    }
    return result;
  }

  // Java: AgreementSuggestor2#getNounCases()
  getNounCases() {
    if (this.prepositionToken !== null) { // also "bis zur" = "bis" must not be considered preposition: "zur" = "zu der"
      // some prepositions require specific cases, so only generated those:
      const result = [];
      const casesForToken = PrepositionToCases.getCasesFor(this.prepositionToken.getToken());
      if (casesForToken.length > 0) {
        for (const aCase of casesForToken) {
          const val = toLowerCase(aCase.name());
          if (!result.includes(val)) {
            result.push(toUpperCase(val));
          }
        }
        return result;
      }
    }
    return nounCasesDefault;
  }

  // Java: AgreementSuggestor2#getDetOrPronounSynth(String,String,String,AnalyzedToken)
  getDetOrPronounSynth(num, gen, aCase, detReading) {
    const detPos = detReading.getPOSTag();
    if (detPos === null) {
      return [];
    }
    let isDef = detPos.includes(':DEF:');
    let templates;
    if (javaMatches(detReading.getToken(), '([Dd]as|[Dd]er|[Dd]ie|[Dd]em|[Dd]es)selben?')) {
      templates = ['PRO:DEM:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU'];
    } else if (javaMatches(detReading.getToken(), '[Ww]elche[nmsr]?')) {
      templates = ['PRO:RIN:NOM/AKK/DAT/GEN:SIN/PLU:MAS/FEM/NEU:B/S'];
    } else if (detPos.includes('ART:')) {
      templates = [detTemplate];
    } else if (detPos.includes('PRO:POS:')) {
      templates = proPosTemplate;
    } else if (detPos.includes('PRO:DEM:')) {
      templates = proDemTemplates;
    } else if (detPos.includes('PRO:IND:')) {
      templates = proIndTemplates;
    } else if (detReading.getToken() === 'zur') {
      templates = [detTemplate];
      detReading = new AnalyzedToken('der', '', 'der');
      isDef = true;
    } else if (detReading.getToken() === 'ins') {
      templates = [detTemplate];
      detReading = new AnalyzedToken('das', '', 'der');
      isDef = true;
    } else {
      return [];
    }
    const synthesized = [];
    for (let template of templates) {
      template = replaceOnce(template, 'IND/DEF', isDef ? 'DEF' : 'IND');
      const pos = this.replaceVars(template, num, gen, aCase);
      const tmp = this.synthesizer.synthesize(detReading, pos);
      const origFirstChar = substring(detReading.getToken(), 0, 1);
      synthesized.push(...tmp
        .filter((k) => toLowerCase(k).startsWith(toLowerCase(origFirstChar)))
        .filter((k) => !skipSuggestions.contains(toLowerCase(k)))
        .map((k) => (Character.isUpperCase(origFirstChar.charCodeAt(0)) ? uppercaseFirstChar(k) : k))); // don't suggest "dein" for "mein" etc.
    }
    return synthesized;
  }

  // Java: AgreementSuggestor2#getAdjSynth(String,String,String,AnalyzedTokenReadings,AnalyzedToken)
  getAdjSynth(num, gen, aCase, adjToken, detReading) {
    const adjSynthesized = [];
    if (adjToken !== null) {
      for (const adjReading of adjToken.getReadings()) {
        if (adjReading.getPOSTag() === null || detReading.getPOSTag() === null) {
          continue;
        }
        if (adjReading.getToken() === 'meisten' && num === 'SIN') {
          continue;
        }
        if (adjReading.getPOSTag().startsWith('ADV:')) { // adverb, nothing to synthesize
          adjSynthesized.push(adjReading.getToken());
          continue;
        }
        const detIsDef = detReading.getPOSTag().includes(':DEF:') || detReading.getToken() === 'ins';
        let template;
        if (adjReading.getPOSTag().startsWith('PA1')) {
          template = pa1Template;
        } else if (adjReading.getPOSTag().startsWith('PA2')) {
          template = pa2Template;
        } else {
          template = adjTemplate;
        }
        if (adjReading.getPOSTag().includes(':KOM:')) {
          template = javaReplace(template, ':GRU:', ':KOM:');
        } else if (adjReading.getPOSTag().includes(':SUP:')) {
          template = javaReplace(template, ':GRU:', ':SUP:');
        }
        template = replaceOnce(template, 'IND/DEF', detIsDef ? 'DEF' : 'IND');
        const adjPos = this.replaceVars(template, num, gen, aCase);
        const synthesize = this.synthesizer.synthesize(adjReading, adjPos);
        for (const synthNoun of synthesize) {
          if (!adjSynthesized.includes(synthNoun)) {
            adjSynthesized.push(synthNoun);
          }
        }
      }
    } else {
      adjSynthesized.push(''); // noun phrase without an adjective
    }
    return adjSynthesized;
  }

  // Java: AgreementSuggestor2#getNounSynth(String,String,String)
  getNounSynth(num, gen, aCase) {
    const result = [];
    for (const nounReading of this.nounToken.getReadings()) {
      for (const nounTemplate of nounTemplates) {
        const nounPos = this.replaceVars(nounTemplate, num, gen, aCase);
        let nounSynthesized = this.synthesizer.synthesize(nounReading, nounPos);
        if (nounSynthesized.length === 0 && nounReading.getToken().includes('-')) {
          const firstPart = substring(nounReading.getToken(), 0, nounReading.getToken().lastIndexOf('-') + 1);
          const lastTokenPart = javaReplaceFirst(this.nounToken.getToken(), '.*-', '');
          const lastLemmaPart = nounReading.getLemma() !== null ? javaReplaceFirst(nounReading.getLemma(), '.*-', '') : null;
          nounSynthesized = this.synthesizer.synthesize(new AnalyzedToken(lastTokenPart, 'fake_value', lastLemmaPart), nounPos);
          for (const lastPartInflected of nounSynthesized) {
            result.push(firstPart + lastPartInflected);
          }
        } else {
          result.push(...nounSynthesized);
        }
      }
    }
    // remove forms like "Blutfluß" if there's also "Blutfluss" - must be old spelling then:
    const oldSpelling = new Set(result.filter((k) => k.includes('ss')).map((k) => javaReplace(k, 'ss', 'ß')));
    return result.filter((k) => !oldSpelling.has(k));
  }

  // Java: AgreementSuggestor2#combineSynth(List,String[],String[],String[],String[])
  combineSynth(result, detSynthesized, adj1Synthesized, adj2Synthesized, nounSynthesized) {
    for (const detSynthesizedElem of detSynthesized) {
      for (const adj1SynthesizedElem of adj1Synthesized) {
        for (const adj2SynthesizedElem of adj2Synthesized) {
          for (const nounSynthesizedElem of nounSynthesized) {
            let elem = detSynthesizedElem;
            if (this.skippedStr !== null) {
              elem += ' ' + this.skippedStr;
            }
            if (adj1SynthesizedElem.length !== 0) {
              elem += ' ' + adj1SynthesizedElem;
            }
            if (adj2SynthesizedElem.length !== 0) {
              elem += ' ' + adj2SynthesizedElem;
            }
            elem += ' ' + nounSynthesizedElem;
            const edits = (detSynthesizedElem === this.determinerToken.getToken() ? 0 : 1) +
              (this.adjToken1 === null || adj1SynthesizedElem === this.adjToken1.getToken() ? 0 : 1) +
              (this.adjToken2 === null || adj2SynthesizedElem === this.adjToken2.getToken() ? 0 : 1) +
              (nounSynthesizedElem === this.nounToken.getToken() ? 0 : 1);
            if (edits === 0) {
              continue;
            }
            const charLevelEdits = levenshteinDistance(elem, this.origPhrase);
            const suggestion = new Suggestion(elem, edits, charLevelEdits);
            if (!result.some((r) => r.equals(suggestion))) {
              result.push(suggestion);
            }
          }
        }
      }
    }
  }

  // Java: AgreementSuggestor2#getOrigPhrase()
  getOrigPhrase() {
    if (this.determinerToken === null) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedTokenReadings.getToken()" because "this.determinerToken" is null');
    let origElem = this.determinerToken.getToken();
    if (this.adjToken1 !== null) {
      origElem += ' ' + this.adjToken1.getToken();
    }
    if (this.adjToken2 !== null) {
      origElem += ' ' + this.adjToken2.getToken();
    }
    if (this.nounToken === null) throw new NullPointerException('Cannot invoke "org.languagetool.AnalyzedTokenReadings.getToken()" because "this.nounToken" is null');
    origElem += ' ' + this.nounToken.getToken();
    return origElem;
  }

  // Java: AgreementSuggestor2#replaceVars(String,String,String,String)
  replaceVars(template, num, gen, aCase) {
    template = replaceOnce(template, 'SIN/PLU', num);
    template = replaceOnce(template, 'MAS/FEM/NEU', gen);
    template = replaceOnce(template, 'NOM/AKK/DAT/GEN', aCase);
    return template;
  }
}
