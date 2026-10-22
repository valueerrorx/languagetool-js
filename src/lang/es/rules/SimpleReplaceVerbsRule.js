// Java: org.languagetool.rules.es.SimpleReplaceVerbsRule
import { AbstractSimpleReplaceRule } from '../../../core/rules/AbstractSimpleReplaceRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { Locale } from '../../../lib/java/Locale.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, toLowerCase } from '../../../lib/java/strings.js';

let wrongWords = null; // Java: static wrongWords = loadFromPath("/es/replace_verbs.txt")
const ES_LOCALE = new Locale('ES');

const endings = 'a|aba|abais|aban|abas|ad|ada|adas|ado|ados|amos|an|ando|ar|ara|'
  + 'arais|aran|aras|are|areis|aremos|aren|ares|aron|ará|arán|arás|aré|aréis|aría|aríais|aríamos|arían|'
  + 'arías|as|ase|aseis|asen|ases|aste|asteis|e|emos|en|es|o|ábamos|áis|áramos|áremos|ásemos|é|éis|ó|'
  + 'arse|arme|arte|arlos|arles|arlas|arnos|aros'; // Java: SimpleReplaceVerbsRule#endings
const desinencies_1conj_0 = Pattern.compile('(.+?)(' + endings + ')');
const desinencies_1conj_1 = Pattern.compile('(.+)(' + endings + ')');

// Java: SimpleReplaceVerbsRule (es)
export class SimpleReplaceVerbsRule extends AbstractSimpleReplaceRule {
  static FQCN = 'org.languagetool.rules.es.SimpleReplaceVerbsRule';

  // Java: SimpleReplaceVerbsRule#getWrongWords()
  getWrongWords() {
    if (wrongWords === null) wrongWords = AbstractSimpleReplaceRule.loadFromPath('/es/replace_verbs.txt');
    return wrongWords;
  }

  // Java: SimpleReplaceVerbsRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.getWrongWords(); // Java: static initializer runs at class load
    super.setCategory(Categories.TYPOS.getCategory(messages));
    super.setLocQualityIssueType(ITSIssueType.Misspelling);
    super.setIgnoreTaggedWords();
    super.useSubRuleSpecificIds();
    this.tagger = language.getTagger();
    this.synth = language.getSynthesizer();
  }

  // Java: SimpleReplaceVerbsRule#getId()
  getId() {
    return 'ES_SIMPLE_REPLACE_VERBS';
  }

  // Java: SimpleReplaceVerbsRule#getDescription()
  getDescription() {
    return 'Detecta verbos incorrectos y propone sugerencias.';
  }

  // Java: SimpleReplaceVerbsRule#getShort()
  getShort() {
    return 'Verbo incorrecto';
  }

  // Java: SimpleReplaceVerbsRule#getMessage(String,List)
  getMessage() {
    return 'Verbo incorrecto: $match';
  }

  // Java: SimpleReplaceVerbsRule#getLocale()
  getLocale() {
    return ES_LOCALE;
  }

  // Java: SimpleReplaceVerbsRule#match(AnalyzedSentence)
  match(sentence) {
    const wrong = this.getWrongWords();
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();

    for (const tokenReadings of tokens) {
      const originalTokenStr = tokenReadings.getToken();
      if (this.ignoreTaggedWords && tokenReadings.isTagged()) {
        continue;
      }
      const tokenString = toLowerCase(originalTokenStr, this.getLocale());
      let analyzedTokenReadings = null;
      let infinitive = null;
      let i = 0;
      while (i < 2 && analyzedTokenReadings === null) {
        const m = i === 0 ? desinencies_1conj_0.matcher(tokenString) : desinencies_1conj_1.matcher(tokenString);
        if (m.matches()) {
          let lexeme = m.group(1);
          const desinence = m.group(2);
          if (desinence.startsWith('e') || desinence.startsWith('é') || desinence.startsWith('i')
              || desinence.startsWith('ï')) {
            if (lexeme.endsWith('c')) {
              lexeme = lexeme.substring(0, lexeme.length - 1).concat('z');
            } else if (lexeme.endsWith('qu')) {
              lexeme = lexeme.substring(0, lexeme.length - 2).concat('c');
            } else if (lexeme.endsWith('g')) {
              lexeme = lexeme.substring(0, lexeme.length - 1).concat('j');
            } else if (lexeme.endsWith('gü')) {
              lexeme = lexeme.substring(0, lexeme.length - 2).concat('gu');
            } else if (lexeme.endsWith('gu')) {
              lexeme = lexeme.substring(0, lexeme.length - 2).concat('g');
            }
          }
          infinitive = lexeme.concat('ar');
          if (wrong.has(infinitive)) {
            const analyzedTokenReadingsList = this.tagger.tag(['am'.concat(desinence)]);
            const pos = analyzedTokenReadingsList[0].getAnalyzedToken(0).getPOSTag();
            if (pos !== null && pos !== undefined) {
              analyzedTokenReadings = analyzedTokenReadingsList[0];
            }
          }
        }
        i++;
      }

      // synthesize replacements
      if (analyzedTokenReadings !== null) {
        const possibleReplacements = [];
        const replacementInfinitives = wrong.get(infinitive);
        for (const replacementInfinitive of replacementInfinitives) {
          if (replacementInfinitive.startsWith('(')) {
            possibleReplacements.push(replacementInfinitive);
          } else {
            const parts = javaSplit(replacementInfinitive, ' '); // the first part is the verb
            const infinitiveAsAnTkn = new AnalyzedToken(parts[0], 'V.*', parts[0]);
            for (const analyzedToken of analyzedTokenReadings.getReadings()) {
              let POSTag = analyzedToken.getPOSTag();
              if (infinitiveAsAnTkn.getLemma() === 'haver') {
                POSTag = 'VA' + POSTag.substring(2);
              }
              const synthesized = this.synth.synthesize(infinitiveAsAnTkn, POSTag);
              for (let s of synthesized) {
                for (let j = 1; j < parts.length; j++) {
                  s = s.concat(' ').concat(parts[j]);
                }
                if (!possibleReplacements.includes(s)) {
                  possibleReplacements.push(s);
                }
              }
            }
          }
        }
        if (possibleReplacements.length > 0) {
          const potentialRuleMatch = this.createRuleMatch(tokenReadings, possibleReplacements, sentence, infinitive);
          ruleMatches.push(potentialRuleMatch);
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
