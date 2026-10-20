// JS twin of DeSpellOps (sr-misc kinds "de-*", docs/review/F52-oracle.md): de-lineexpand, de-gsr, de-data.
import { createHash } from 'node:crypto';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { SuggestedReplacement } from '../../src/core/rules/model/SuggestedReplacement.js';
import { GermanSpellerRule } from '../../src/lang/de/rules/GermanSpellerRule.js';
import { LineExpander } from '../../src/lang/de/rules/LineExpander.js';
import { MorfologikGermanyGermanSpellerRule } from '../../src/lang/de/rules/MorfologikGermanyGermanSpellerRule.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { runCase } from './check2.mjs';
import { ADDITIONAL_SUGGESTIONS_ENTRIES, PREVENT_SUGGESTION_PATTERNS } from '../../src/lang/de/rules/GermanSpellerRuleData.js';
import { getBytesUtf8 } from '../../src/lib/java/charset.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { err, safe, spellingRules, strs, userConfig } from './_spellrule-common.mjs';
import { notPorted } from './_pipe-common.mjs';

// Java: DeSpellOps#repl(Object)
const repl = (l) => l.map((x) => (x instanceof SuggestedReplacement ? x.getReplacement() : String(x)));

// Java: DeSpellOps#sha(Collection)
function sha(c) {
  const l = [...c].sort(javaCompare);
  const h = createHash('sha1');
  for (const s of l) {
    h.update(getBytesUtf8(s));
    h.update(Uint8Array.of(10));
  }
  return h.digest('hex');
}

// Java: DeSpellOps#misc(JsonNode)
export function run(a) {
  const kind = a.kind;
  const res = {};
  switch (kind) {
    case 'de-lineexpand': {
      const le = new LineExpander();
      res.results = strs(a, 'lines').map((s) => ({ line: s, result: safe(() => le.expandLine(s)) }));
      break;
    }
    case 'de-gsr': {
      const l = languageFor(a.lang);
      let r;
      try {
        r = spellingRules(l, userConfig(a)).find((x) => x.getId() === a.id) ?? null;
      } catch (t) {
        res.buildError = err(t);
        return res;
      }
      if (r === null) {
        res.noRule = true;
        return res;
      }
      res.class = r.constructor.FQCN;
      const o = [];
      for (const w of strs(a, 'words')) {
        const m = { w };
        m.misspelled = safe(() => r.isMisspelled(w));
        m.candidates = safe(() => (r instanceof GermanSpellerRule ? r.getCandidates(w) : null));
        m.onlySuggestions = safe(() => repl(r.getOnlySuggestions(w)));
        m.noSuggest = safe(() => repl(r.filterNoSuggestWords([new SuggestedReplacement(w), new SuggestedReplacement(`${w}s`), new SuggestedReplacement(w.toLowerCase())])));
        m.suggestions = safe(() => r.getSuggestions(w));
        m.sorted = safe(() => r.sortSuggestionByQuality(w, [...r.getSuggestions(w)]));
        m.message = safe(() => {
          const sg = r.getSuggestions(w);
          return r.getMessage(w, new SuggestedReplacement(sg.length === 0 ? '' : sg[0]));
        });
        o.push(m);
      }
      res.results = o;
      // explicit (word, firstSuggestion) message pairs
      if (a.messages !== undefined) {
        res.messages = a.messages.map((p) => ({
          pair: p,
          message: safe(() => r.getMessage(String(p[0]), p[1] === null ? null : new SuggestedReplacement(String(p[1])))),
        }));
      }
      // addIgnoreWords(line) then word checks
      if (a.addIgnore !== undefined) {
        res.addIgnore = strs(a, 'addIgnore').map((s) => safe(() => { r.addIgnoreWords(s); return true; }));
        res.afterWords = strs(a, 'afterWords').map((w) => ({
          w,
          misspelled: safe(() => r.isMisspelled(w)),
          ignoreWord: safe(() => r.ignoreWord(w)),
          potentially: safe(() => r.ignorePotentiallyMisspelledWord(w)),
        }));
      }
      break;
    }
    case 'de-data': {
      const l = languageFor(a.lang);
      let r;
      try {
        r = spellingRules(l, null).find((x) => x.getId() === a.id) ?? null;
      } catch (t) {
        res.buildError = err(t);
        return res;
      }
      if (r === null) {
        res.noRule = true;
        return res;
      }
      const sets = {};
      const src = {
        verbStems: GermanSpellerRule.verbStems,
        verbPrefixes: GermanSpellerRule.verbPrefixes,
        otherPrefixes: GermanSpellerRule.otherPrefixes,
        oldSpelling: GermanSpellerRule.oldSpelling,
        wordsToBeIgnoredInCompounds: r.wordsToBeIgnoredInCompounds,
        wordStartsToBeProhibited: r.wordStartsToBeProhibited,
        wordEndingsToBeProhibited: r.wordEndingsToBeProhibited,
        wordsNeedingInfixS: r.wordsNeedingInfixS,
        lcDoNotSuggestWords: GermanSpellerRule.lcDoNotSuggestWords,
      };
      for (const n of Object.keys(src)) {
        sets[n] = safe(() => {
          const cs = src[n];
          return { size: cs.size, sha1: sha(cs), contains: strs(a, 'probes').map((p) => cs.has(p)) };
        });
      }
      res.sets = sets;
      res.additionalSuggestions = safe(() => ADDITIONAL_SUGGESTIONS_ENTRIES.length);
      res.preventSuggestionPatterns = safe(() => PREVENT_SUGGESTION_PATTERNS.length);
      break;
    }
    // {lang, words, cases}: MorfologikGermanyGermanSpellerRule (not registered) on de_DE.dict
    case 'de-morfologik': {
      const l = languageFor(a.lang);
      let r;
      try {
        r = new MorfologikGermanyGermanSpellerRule(getMessageBundleForLanguage(l), l, null, []);
      } catch (t) {
        res.buildError = err(t);
        return res;
      }
      res.id = r.getId();
      res.file = r.getFileName();
      res.desc = safe(() => r.getDescription());
      res.examples = safe(() => r.getIncorrectExamples().map((x) => x.getExample()));
      res.results = strs(a, 'words').map((w) => ({ w, misspelled: safe(() => r.isMisspelled(w)) }));
      const lt = new JLanguageTool(l, [], null, null, null, null, true, false, []);
      lt.addRule(r);
      lt.setCleanOverlappingMatches(false);
      selectRules(lt, [], [], new Set(), new Set([r.getId()]), true, false);
      res.cases = a.cases.map((c) => runCase(lt, c));
      break;
    }
    default:
      throw notPorted(`sr-misc kind ${kind}`);
  }
  return res;
}
