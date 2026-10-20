// org.languagetool.rules.en.AbstractEnglishSpellerRule (shared logic of the English Morfologik speller rules)
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { getUrl } from '../../../core/Tools.js';
import { startsWithUppercase, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { BeoLingusTranslator } from './translation/BeoLingusTranslator.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { IOException, RuntimeException, IllegalArgumentException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';
import { javaReplace, javaReplaceFirst, javaSplit, javaTrim, substring, toLowerCase } from '../../../lib/java/strings.js';
import { LC_DO_NOT_SUGGEST_WORDS, getTopSuggestions, getTopSuggestionsIgnoreCase } from './AbstractEnglishSpellerRuleData.js';

const { topMatch } = SuggestedReplacement;
const FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;

const PROFILERATION = Pattern.compile("[Pp]rofileration");
const CEMETARY = Pattern.compile("[Cc]emetary");
const CEMETARIES = Pattern.compile("[Cc]emetaries");
const BASICLY = Pattern.compile("[Bb]asicly");
const BELEIVES = Pattern.compile("[Bb]eleives?");
const BELIVES = Pattern.compile("[Bb]elives?");
const BIZZARE = Pattern.compile("[Bb]izzare");
const COMPLETLY = Pattern.compile("[Cc]ompletly");
const DISSAPEARS = Pattern.compile("[Dd]issapears?");
const FARENHEIT = Pattern.compile("[Ff]arenheit");
const FREINDS = Pattern.compile("[Ff]reinds?");
const INCIDENTLY = Pattern.compile("[Ii]ncidently");
const INTERUPTS = Pattern.compile("[Ii]nterupts?");
const LOLLYPOPS = Pattern.compile("[Ll]ollypops?");
const OCASSIONS = Pattern.compile("[Oo]cassions?");
const OCCURANCES = Pattern.compile("[Oo]ccurances?");
const PERSISTANT = Pattern.compile("[Pp]ersistant");
const PEICES = Pattern.compile("[Pp]eices?");
const SEIGES = Pattern.compile("[Ss]eiges?");
const SUPERCEDES = Pattern.compile("[Ss]upercedes?");
const THRESHHOLDS = Pattern.compile("[Tt]hreshholds?");
const TOMMORROWS = Pattern.compile("[Tt]ommorrows?");
const TOUTES = Pattern.compile("[Tt]ounges?");
const WIERD = Pattern.compile("[Ww]ierd");
const SARGENT = Pattern.compile("[Ss]argent");
const SWIMMED = Pattern.compile("swimmed");
const MISSPELT = Pattern.compile("misspelt");
const JIST = Pattern.compile("[Jj]ist");
const ADHOC = Pattern.compile("[Ad]hoc");
const DEACTIVE = Pattern.compile("[De]eactive");
const HONGKONG = Pattern.compile("[hH]on[kg]kong");
const AFAIK = Pattern.compile("afaik");
const JANUARY = Pattern.compile("january");
const ADMITTINGLY = Pattern.compile("[Aa]dmittingly");
const APRIL = Pattern.compile("april");
const SEPTEMBER = Pattern.compile("september");
const OCTOBER = Pattern.compile("october");
const NOVEMBER = Pattern.compile("november");
const DECEMBER = Pattern.compile("december");
const ENGLISH = Pattern.compile("english");
const SPANISH = Pattern.compile("spanish");
const GITLAB = Pattern.compile("[Gg]itlab");
const BONAFIDE = Pattern.compile("[Bb]onafide");
const WHEREEVER = Pattern.compile("[Ww]hereever");
const UNINSPIRATIONAL = Pattern.compile("[Uu]ninspirational");
const WHATSAPP = Pattern.compile("[Ww]hatsapp");
const JETLAGGED = Pattern.compile("jetlagged");
const MACBOOK = Pattern.compile("[Mm]acbooks?");
const LIKELYHOOD = Pattern.compile("[Ll]ikelyhood");
const FORSEEABLE = Pattern.compile("[Ff]orseeable");
const UNFORSEEABLE = Pattern.compile("[Uu]nforseeable");
const FORSEEABLY = Pattern.compile("[Ff]orseeably");
const UNFORSEEABLY = Pattern.compile("[Uu]nforseeably");
const UNECESSARY = Pattern.compile("[Uu]necessary");
const HUBSPOT = Pattern.compile("[Hh]ubspot");
const URL = Pattern.compile("[Uu]rl");
const TV = Pattern.compile("tv");
const HTTP = Pattern.compile("[Hh]ttp");
const HTTPS = Pattern.compile("[Hh]ttps");
const EUROPEAN = Pattern.compile("european");
const EUROPEANS = Pattern.compile("europeans");
const FYI = Pattern.compile("[Ff]yi");
const MICROSOFT = Pattern.compile("microsoft");
const DEVOPS = Pattern.compile("[Dd]evops");
const ALLRIGHT = Pattern.compile("[Aa]llright");
const INTRANSPARENT = Pattern.compile("intransparent(ly)?");
const ADDON = Pattern.compile("[Aa]ddons?");
const WDYT = Pattern.compile("[Ww]dyt");
const UNCOMPLIANT = Pattern.compile("[UuIi]ncompliant");
const UX = Pattern.compile("ux");
const LANGUAGETOOL = Pattern.compile("[Ll]anguagetool");
const UNDETERMINISTIC = Pattern.compile("undeterministic");
const QUILLBOT_POS = Pattern.compile("QuillBots");
const QUILLBOT1 = Pattern.compile("[Qq]uill?bot");
const QUILLBOT1_POS = Pattern.compile("[Qq]uill?bots");
const QUILLBOT2 = Pattern.compile("QuilBot");
const QUILLBOT2_POS = Pattern.compile("QuilBots");

const CONTAINS_TOKEN = Pattern.compile('.* (b|c|d|e|f|g|h|j|k|l|m|n|o|p|q|r|s|t|v|w|y|z|ll|ve)'); // Java: AbstractEnglishSpellerRule#CONTAINS_TOKEN

const maxPatterns = 9;
const wordPatterns = new Array(maxPatterns).fill(null); // Java: AbstractEnglishSpellerRule#wordPatterns
const blogLinks = new Array(maxPatterns).fill(null); // Java: AbstractEnglishSpellerRule#blogLinks
wordPatterns[0] = Pattern.compile(".*[yi][zs]e([sd])?|.*[yi][zs]ings?|.*i[zs]ations?", FLAGS);
blogLinks[0] = "https://quillbot.com/blog/category/uk-vs-us/";
wordPatterns[1] = Pattern.compile(".*(defen[cs]e|offen[sc]e|preten[sc]e).*", FLAGS);
blogLinks[1] = "https://quillbot.com/blog/category/uk-vs-us/";
wordPatterns[2] = Pattern.compile(".*og|.*ogue", FLAGS);
blogLinks[2] = "https://quillbot.com/blog/category/uk-vs-us/";
wordPatterns[3] = Pattern.compile(".*(or|our).*", FLAGS);
blogLinks[3] = "https://languagetool.org/insights/post/our-or/#colour-or-color%E2%80%94colourise-or-colorize";
wordPatterns[4] = Pattern.compile(".*e?able|.*dge?ments?|aging|ageing|ax|axe|.*grame?s?|neuron|neurone|neurons|neurones", FLAGS);
blogLinks[4] = "https://languagetool.org/insights/post/our-or/#likeable-vs-likable-judgement-vs-judgment-oestrogen-vs-estrogen";
wordPatterns[5] = Pattern.compile(".*(centre|center).*|.*(re|er)", FLAGS);
blogLinks[5] = "https://languagetool.org/insights/post/re-vs-er/#the-difference-of-%E2%80%9C-reer%E2%80%9D-at-the-center-of-attention";
wordPatterns[6] = Pattern.compile("canceled|cancelled|canceling|cancelling|chili|chilli|chilies|chillies|chilis|chillis|counselor|counsellor|counselors|counsellors|defueled|defuelled|defueling|defuelling|defuelings|defuellings|dialed|dialled|dialer|dialler|dialers|diallers|dialing|dialling|dialog|dialogue|dialogize|dialogise|dialogized|dialogised|dialogizes|dialogises|dialogizing|dialogising|dialogs|dialogues|dialyzable|dialysable|dialyze|dialyse|dialyzed|dialysed|dialyzes|dialyses|dialyzing|dialysing|enroll|enrol|enrolled|enroled|enrolling|enroling|enrollment|enrolment|enrollments|enrolments|enrolls|enrols|fueled|fuelled|fueling|fuelling|fulfill|fulfil|fulfillment|fulfilment|fulfills|fulfils|installment|instalment|installments|instalments|jewelry|jewellery|labeled|labelled|labeling|labelling|marvelous|marvellous|medalist|medallist|medalists|medallists|modeled|modelled|modeling|modelling|noise-canceling|noise-cancelling|refueled|refuelled|refueling|refuelling|relabeled|relabelled|relabeling|relabelling|remodeled|remodelled|remodeling|remodelling|signalization|signalisation|signalize|signalise|signalized|signalised|signalizes|signalises|signalizing|signalising|skillful|skilful|skillfully|skilfully|tranquilize|tranquillize|tranquilized|tranquillized|tranquilizes|tranquillizes|traveled|travelled|traveler|traveller|travelers|travellers|traveling|travelling|uncanceled|uncancelled|uncanceling|uncancelling|unlabeled|unlabelled|wooly|woolly", FLAGS);
blogLinks[6] = "https://languagetool.org/insights/post/re-vs-er/#british-english-prefers-doubling-consonants-doesn%E2%80%99t-it";
wordPatterns[7] = Pattern.compile("airfoil|aerofoil|airfoils|aerofoils|airplane|aeroplane|airplanes|aeroplanes|aluminum|aluminium|artifact|artefact|artifacts|artefacts|backdraft|backdraught|cozy|cosy|", FLAGS);
blogLinks[7] = "https://languagetool.org/insights/post/re-vs-er/#more-radical-differences-between-british-and-american-english-spellings";
wordPatterns[8] = Pattern.compile("amenorrhea|amenorrhoea|anesthesia|anaesthesia|anesthesias|anaesthesias|anesthetic|anaesthetic|anesthetically|anaesthetically|anesthetics|anaesthetics|anesthetist|anaesthetist|anesthetists|anaesthetists|anesthetization|anaesthetisation|anesthetizations|anaesthetisations|anesthetize|anaesthetise|anesthetized|anaesthetised|anesthetizes|anaesthetises|anesthetizing|anaesthetising|archeological|archaeological|archeologically|archaeologically|archeologies|archaeologies|archeology|archaeology|cesium|caesium|diarrhea|diarrhoea|diarrheal|diarrhoeal|dyslipidemia|dyslipidaemia|dyslipidemias|dyslipidaemias|edematous|oedematous|encyclopedia|encyclopaedia|encyclopedias|encyclopaedias|eon|aeon|eons|aeons|esophagi|oesophagi|esophagus|oesophagus|esophaguses|oesophaguses|esthetic|aesthetic|esthetical|aesthetical|esthetically|aesthetically|esthetician|aesthetician|estheticians|aestheticians|estrogen|oestrogen|estrus|oestrus|etiologies|aetiologies|etiology|aetiology|feces|faeces|fetal|foetal|fetus|foetus|fetuses|foetuses|gastroesophageal|gastro-oesophageal|glycemic|glycaemic|gynecomastia|gynaecomastia|hematemesis|haematemesis|hematoma|haematoma|hematomas|haematomas|hematopoietic|haematopoietic|hematuria|haematuria|hematurias|haematurias|hemolytic|haemolytic|hemophilia|haemophilia|hemorrhage|haemorrhage|hemorrhages|haemorrhages|hemostasis|haemostasis|homeopathies|homoeopathies|homeopathy|homoeopathy|hyperemia|hyperaemia|hyperemic|hyperaemic|hypnopedia|hypnopaedia|hypnopedic|hypnopaedic|hypocalcaemia|hypocalcaemia|hypokalaemic|hypokalemic|kinesthesia|kinaesthesia|kinesthesis|kinaesthesis|kinesthetic|kinaesthetic|kinesthetically|kinaesthetically|maneuver|manoeuvre|maneuvers|manoeuvres|orthopedic|orthopaedic|orthopedics|orthopaedics|paleoecology|palaeoecology|paleogeographical|palaeogeographical|paleogeographically|palaeogeographically|paleogeography|palaeogeography|paresthesia|paraesthesia|pediatric|paediatric|pediatrically|paediatrically|pediatrician|paediatrician|pediatricians|paediatricians|pedomorphic|paedomorphic|pedophile|paedophile|pedophiles|paedophiles|polycythemia|polycythaemia|pretorium|praetorium|pyorrhea|pyorrhoea|septicemia|septicaemia|synesthesia|synaesthesia|synesthete|synaesthete|synesthetes|synaesthetes|tracheoesophageal|tracheo-oesophageal", FLAGS);
blogLinks[8] = "https://languagetool.org/insights/post/our-or/#likeable-vs-likable-judgement-vs-judgment-oestrogen-vs-estrogen";

// Java: AbstractEnglishSpellerRule.IrregularForms (private static class)
class IrregularForms {
  // Java: IrregularForms(String,String,String,List)
  constructor(baseform, posName, formName, forms) {
    this.baseform = baseform;
    this.posName = posName;
    this.formName = formName;
    this.forms = forms;
  }
}

// Java: AbstractEnglishSpellerRule (abstract: getFileName, getId)
export class AbstractEnglishSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.en.AbstractEnglishSpellerRule';
  static JAVA_ABSTRACT = true;

  // Java: AbstractEnglishSpellerRule(ResourceBundle,Language) / (ResourceBundle,Language,UserConfig,List) / (ResourceBundle,Language,GlobalConfig,UserConfig,List,LanguageModel,Language)
  constructor(messages, language, ...rest) {
    let globalConfig = null;
    let userConfig = null;
    let altLanguages = [];
    let languageModel = null;
    let motherTongue = null;
    if (rest.length === 5) {
      [globalConfig, userConfig, altLanguages, languageModel, motherTongue] = rest;
    } else if (rest.length === 2) {
      [userConfig, altLanguages] = rest;
    }
    super(messages, language, globalConfig, userConfig, altLanguages, languageModel, motherTongue);
    this.ignoreWordsWithLength = 1;
    this.setCheckCompound(true);
    this.addExamplePair(Example.wrong('This <marker>sentenc</marker> contains a spelling mistake.'),
      Example.fixed('This <marker>sentence</marker> contains a spelling mistake.'));
    const languageSpecificIgnoreFile = javaReplace(this.getSpellingFileName(), '.txt', `_${language.getShortCodeWithCountryAndVariant()}.txt`);
    for (const ignoreWord of this.wordListLoader.loadWords(languageSpecificIgnoreFile)) {
      this.addIgnoreWords(ignoreWord);
    }
    this.translator = BeoLingusTranslator.getInstance(globalConfig);
    this.topSuggestions = getTopSuggestions();
    this.topSuggestionsIgnoreCase = getTopSuggestionsIgnoreCase();
    // Java: nerPipe = new NERService(globalConfig.getNerUrl()) is only used together with a BaseLanguageModel (EN-0080, LM not ported)
  }

  // Java: AbstractEnglishSpellerRule#getAdditionalSpellingFileNames()
  getAdditionalSpellingFileNames() {
    // NOTE: also add to GermanSpellerRule.getSpeller() when adding items here:
    return [this.language.getShortCode() + MorfologikSpellerRule.CUSTOM_SPELLING_FILE, MorfologikSpellerRule.GLOBAL_SPELLING_FILE,
      '/en/multiwords.txt'];
  }

  // Java: AbstractEnglishSpellerRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = super.match(sentence);
    // Java: NER filtering needs a BaseLanguageModel and nerPipe (EN-0080), neither exists in this port
    // add custom URLs
    for (const match of matches) {
      const misspelledWord = substring(match.getSentence().getText(), match.getFromPos(), match.getToPos());
      if (this.isValidInOtherVariant(misspelledWord) !== null) {
        for (let i = 0; i < maxPatterns; i++) {
          const m = wordPatterns[i].matcher(misspelledWord);
          if (m.matches()) {
            match.setUrl(getUrl(blogLinks[i]));
            break;
          }
        }
      }
    }
    return matches;
  }

  // Java: AbstractEnglishSpellerRule#filterNoSuggestWords(List)
  filterNoSuggestWords(l) {
    return l.filter((k) => !LC_DO_NOT_SUGGEST_WORDS.has(toLowerCase(k.getReplacement())));
  }

  // Java: AbstractEnglishSpellerRule#loadWordlist(String,int)
  static loadWordlist(path, column) {
    if (column !== 0 && column !== 1) {
      throw new IllegalArgumentException(`Only column 0 and 1 are supported: ${column}`);
    }
    const words = new Map();
    const lines = getDataBroker().getFromResourceDirAsLines(path);
    for (let line of lines) {
      line = javaTrim(line);
      if (line.length === 0 || line.startsWith('#')) {
        continue;
      }
      const parts = javaSplit(line, ';');
      if (parts.length !== 2) {
        throw new RuntimeException(`Unexpected format in ${path}: ${line} - expected two parts delimited by ';'`);
      }
      words.set(toLowerCase(parts[column]), parts[column === 1 ? 0 : 1]);
    }
    return words;
  }

  // Java: AbstractEnglishSpellerRule#filterSuggestions(List)
  filterSuggestions(suggestions) {
    const result = super.filterSuggestions(suggestions);
    const clean = [];
    for (const suggestion of result) {
      if (!CONTAINS_TOKEN.matcher(suggestion.getReplacement()).matches()) { // e.g. 'timezones' suggests 'timezone s'
        clean.push(suggestion);
      }
    }
    return clean;
  }

  // Java: AbstractEnglishSpellerRule#getRuleMatches(String,int,AnalyzedSentence,List,int,AnalyzedTokenReadings[])
  getRuleMatches(word, startPos, sentence, ruleMatchesSoFar, idx, tokens) {
    const ruleMatches = super.getRuleMatches(word, startPos, sentence, ruleMatchesSoFar, idx, tokens);
    if (ruleMatches.length > 0) {
      // so 'word' is misspelled:
      const forms = this.getIrregularFormsOrNull(word);
      if (forms !== null) {
        const message = `Possible spelling mistake. Did you mean <suggestion>${forms.forms[0]}</suggestion>, the ${forms.formName} form of the ${forms.posName} '${forms.baseform}'?`;
        this.addFormsToFirstMatch(message, sentence, ruleMatches, forms.forms);
      } else {
        const variantInfo = this.isValidInOtherVariant(word);
        if (variantInfo !== null) {
          const message = `Possible spelling mistake. '${word}' is ${variantInfo.getVariantName()}.`;
          const suggestion = startsWithUppercase(word)
            ? uppercaseFirstChar(variantInfo.otherVariant()) : variantInfo.otherVariant();
          this.replaceFormsOfFirstMatch(message, sentence, ruleMatches, suggestion);
        }
      }
    }
    // filter "re ..." (#2562):
    return ruleMatches.map((m) => {
      const copy = new RuleMatch(m);
      copy.setLazySuggestedReplacements(() => cleanSuggestions(m));
      return copy;
    });
  }

  // Java: AbstractEnglishSpellerRule#isValidInOtherVariant(String)
  isValidInOtherVariant() {
    return null;
  }

  // Java: AbstractEnglishSpellerRule#addFormsToFirstMatch(String,AnalyzedSentence,List,List)
  addFormsToFirstMatch(message, sentence, ruleMatches, forms) {
    // recreating match, might overwrite information by SuggestionsRanker;
    // this has precedence
    const oldMatch = ruleMatches[0];
    const newMatch = new RuleMatch(this, sentence, oldMatch.getFromPos(), oldMatch.getToPos(), message);
    newMatch.setType(oldMatch.getType());
    newMatch.setLazySuggestedReplacements(() => this.filterDupes([
      ...forms.map((f) => new SuggestedReplacement(f)),
      ...oldMatch.getSuggestedReplacementObjects(),
    ]));
    ruleMatches[0] = newMatch;
  }

  // Java: AbstractEnglishSpellerRule#replaceFormsOfFirstMatch(String,AnalyzedSentence,List,String)
  replaceFormsOfFirstMatch(message, sentence, ruleMatches, suggestion) {
    // recreating match, might overwrite information by SuggestionsRanker;
    // this has precedence
    const oldMatch = ruleMatches[0];
    const newMatch = new RuleMatch(this, sentence, oldMatch.getFromPos(), oldMatch.getToPos(), message);
    newMatch.setType(oldMatch.getType());
    const sugg = new SuggestedReplacement(suggestion);
    sugg.setShortDescription(this.language.getName());
    newMatch.setSuggestedReplacementObjects([sugg]);
    ruleMatches[0] = newMatch;
  }

  // Java: AbstractEnglishSpellerRule#getIrregularFormsOrNull(String) and (String,String,List,String,String,String)
  getIrregularFormsOrNull(word, wordSuffix, suffixes, posTag, posName, formName) {
    if (wordSuffix === undefined) {
      let irregularFormsOrNull = this.getIrregularFormsOrNull(word, 'ed', ['ed'], 'VBD', 'verb', 'past tense');
      if (irregularFormsOrNull !== null) return irregularFormsOrNull;
      irregularFormsOrNull = this.getIrregularFormsOrNull(word, 'ed', ['d' /* e.g. awaked */], 'VBD', 'verb', 'past tense');
      if (irregularFormsOrNull !== null) return irregularFormsOrNull;
      irregularFormsOrNull = this.getIrregularFormsOrNull(word, 's', ['s'], 'NNS', 'noun', 'plural');
      if (irregularFormsOrNull !== null) return irregularFormsOrNull;
      irregularFormsOrNull = this.getIrregularFormsOrNull(word, 'es', ['es'/* e.g. 'analysises' */], 'NNS', 'noun', 'plural');
      if (irregularFormsOrNull !== null) return irregularFormsOrNull;
      irregularFormsOrNull = this.getIrregularFormsOrNull(word, 'er', ['er'/* e.g. 'farer' */], 'JJR', 'adjective', 'comparative');
      if (irregularFormsOrNull !== null) return irregularFormsOrNull;
      irregularFormsOrNull = this.getIrregularFormsOrNull(word, 'est', ['est'/* e.g. 'farest' */], 'JJS', 'adjective', 'superlative');
      return irregularFormsOrNull;
    }
    try {
      for (const suffix of suffixes) {
        if (word.endsWith(wordSuffix)) {
          const baseForm = substring(word, 0, word.length - suffix.length);
          const forms = Objects.requireNonNull(this.language.getSynthesizer()).synthesize(new AnalyzedToken(word, null, baseForm), posTag);
          const result = [];
          for (const form of forms) {
            if (!this.speller1.isMisspelled(form)) {
              // only accept suggestions that the spellchecker will accept
              result.push(form);
            }
          }
          // the internal dict might contain forms that the spell checker doesn't accept (e.g. 'criterions'),
          // but we trust the spell checker in this case:
          removeFirst(result, word);
          removeFirst(result, 'badder'); // non-standard usage
          removeFirst(result, 'baddest'); // non-standard usage
          removeFirst(result, 'spake'); // can be removed after dict update
          if (result.length > 0) {
            return new IrregularForms(baseForm, posName, formName, result);
          }
        }
      }
      return null;
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // Java: AbstractEnglishSpellerRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    const curatedSuggestions = [];
    curatedSuggestions.push(...(this.topSuggestions.has(word) ? this.topSuggestions.get(word) : []));
    const lc = toLowerCase(word);
    curatedSuggestions.push(...(this.topSuggestionsIgnoreCase.has(lc) ? this.topSuggestionsIgnoreCase.get(lc) : []));
    if (curatedSuggestions.length !== 0) {
      return SuggestedReplacement.convert(curatedSuggestions);
    } else if (word.endsWith('ys')) {
      const suggestion = javaReplaceFirst(word, 'ys$', 'ies');
      if (!this.speller1.isMisspelled(suggestion)) {
        return SuggestedReplacement.convert([suggestion]);
      }
    }
    return super.getAdditionalTopSuggestions(suggestions, word);
  }

  // trivial approach that assumes only one part of the hyphenated word has a typo...
  // Java: AbstractEnglishSpellerRule#addHyphenSuggestions(String[],List)
  addHyphenSuggestions(parts, topSuggestions) {
    let i = 0;
    for (const part of parts) {
      if (this.isMisspelled(part)) {
        let partSuggestions = this.speller1.getSuggestions(part);
        if (partSuggestions.length === 0) {
          partSuggestions = this.speller2.getSuggestions(part);
        }
        if (partSuggestions.length > 0) {
          const suggestion = this.getHyphenatedWordSuggestion(parts, i, partSuggestions[0]);
          topSuggestions.push(new SuggestedReplacement(suggestion));
        }
      }
      i++;
    }
  }

  // Java: AbstractEnglishSpellerRule#getHyphenatedWordSuggestion(String[],int,String)
  getHyphenatedWordSuggestion(parts, currentPos, currentPostSuggestion) {
    const newParts = [];
    for (let j = 0; j < parts.length; j++) {
      if (currentPos === j) {
        newParts.push(currentPostSuggestion);
      } else {
        newParts.push(parts[j]);
      }
    }
    return newParts.join('-');
  }

  // Java: AbstractEnglishSpellerRule#getTranslator(GlobalConfig)
  getTranslator() {
    return this.translator;
  }

  // Do not tokenize new words from spelling.txt...
  // Multi-token words should be in multiwords.txt
  // Java: AbstractEnglishSpellerRule#tokenizeNewWords()
  tokenizeNewWords() {
    return false;
  }

  // Java: AbstractEnglishSpellerRule#getOnlySuggestions(String)
  getOnlySuggestions(word) {
    // NOTE: only add words here that would otherwise have more than one suggestion
    // and have apply to all variants of English (en-US, en-GB, ...):
    if (PROFILERATION.matcher(word).matches()) return topMatch(replaceOnce(word, "rofileration", "roliferation"), "rapid expansion");
    if (CEMETARY.matcher(word).matches()) return topMatch(replaceOnce(word, "emetary", "emetery"));
    if (CEMETARIES.matcher(word).matches()) return topMatch(replaceOnce(word, "emetaries", "emeteries"));
    if (BASICLY.matcher(word).matches()) return topMatch(replaceOnce(word, "asicly", "asically"));
    if (BELEIVES.matcher(word).matches()) return topMatch(replaceOnce(word, "eleive", "elieve"));
    if (BELIVES.matcher(word).matches()) return topMatch(replaceOnce(word, "elive", "elieve"));
    if (BIZZARE.matcher(word).matches()) return topMatch(replaceOnce(word, "izzare", "izarre"));
    if (COMPLETLY.matcher(word).matches()) return topMatch(replaceOnce(word, "ompletly", "ompletely"));
    if (DISSAPEARS.matcher(word).matches()) return topMatch(replaceOnce(word, "issapear", "isappear"));
    if (FARENHEIT.matcher(word).matches()) return topMatch(replaceOnce(word, "arenheit", "ahrenheit"));
    if (FREINDS.matcher(word).matches()) return topMatch(replaceOnce(word, "reind", "riend"));
    if (INCIDENTLY.matcher(word).matches()) return topMatch(replaceOnce(word, "ncidently", "ncidentally"));
    if (INTERUPTS.matcher(word).matches()) return topMatch(replaceOnce(word, "nterupt", "nterrupt"));
    if (LOLLYPOPS.matcher(word).matches()) return topMatch(replaceOnce(word, "ollypop", "ollipop"));
    if (OCASSIONS.matcher(word).matches()) return topMatch(replaceOnce(word, "cassion", "ccasion"));
    if (OCCURANCES.matcher(word).matches()) return topMatch(replaceOnce(word, "ccurance", "ccurrence"));
    if (PERSISTANT.matcher(word).matches()) return topMatch(replaceOnce(word, "ersistant", "ersistent"));
    if (PEICES.matcher(word).matches()) return topMatch(replaceOnce(word, "eice", "iece"));
    if (SEIGES.matcher(word).matches()) return topMatch(replaceOnce(word, "eige", "iege"));
    if (SUPERCEDES.matcher(word).matches()) return topMatch(replaceOnce(word, "upercede", "upersede"));
    if (THRESHHOLDS.matcher(word).matches()) return topMatch(replaceOnce(word, "hreshhold", "hreshold"));
    if (TOMMORROWS.matcher(word).matches()) return topMatch(replaceOnce(word, "ommorrow", "omorrow"));
    if (TOUTES.matcher(word).matches()) return topMatch(replaceOnce(word, "ounge", "ongue"));
    if (WIERD.matcher(word).matches()) return topMatch(replaceOnce(word, "ierd", "eird"));
    if (SARGENT.matcher(word).matches()) return topMatch(replaceOnce(word, "argent", "ergeant"));
    if (SWIMMED.matcher(word).matches()) return topMatch("swam");
    if (MISSPELT.matcher(word).matches()) return topMatch("misspelled");
    if (ADHOC.matcher(word).matches()) return topMatch("ad hoc");
    if (DEACTIVE.matcher(word).matches()) return topMatch("inactive");
    if (HUBSPOT.matcher(word).matches()) return topMatch("HubSpot");
    if (URL.matcher(word).matches()) return topMatch("URL");
    if (HTTP.matcher(word).matches()) return topMatch("HTTP");
    if (HTTPS.matcher(word).matches()) return topMatch("HTTPS");
    if (FYI.matcher(word).matches()) return topMatch("FYI");
    if (EUROPEAN.matcher(word).matches()) return topMatch("European");
    if (EUROPEANS.matcher(word).matches()) return topMatch("Europeans");
    if (DEVOPS.matcher(word).matches()) return topMatch("DevOps");
    if (MICROSOFT.matcher(word).matches()) return topMatch("Microsoft");
    if (LANGUAGETOOL.matcher(word).matches()) return topMatch("LanguageTool");
    if (HONGKONG.matcher(word).matches()) return topMatch("Hong Kong");
    if (OCTOBER.matcher(word).matches()) return topMatch("October");
    if (SEPTEMBER.matcher(word).matches()) return topMatch("September");
    if (DECEMBER.matcher(word).matches()) return topMatch("December");
    if (NOVEMBER.matcher(word).matches()) return topMatch("November");
    if (APRIL.matcher(word).matches()) return topMatch("April");
    if (AFAIK.matcher(word).matches()) return topMatch("AFAIK");
    if (JANUARY.matcher(word).matches()) return topMatch("January");
    if (ADMITTINGLY.matcher(word).matches()) return topMatch(replaceOnce(word, "dmittingly", "dmittedly"));
    if (ENGLISH.matcher(word).matches()) return topMatch("English");
    if (SPANISH.matcher(word).matches()) return topMatch("Spanish");
    if (UNDETERMINISTIC.matcher(word).matches()) return topMatch("nondeterministic");
    if (WDYT.matcher(word).matches()) return topMatch("WDYT");
    if (INTRANSPARENT.matcher(word).matches()) return topMatch(replaceOnce(word, "in", "un"));
    if (UNCOMPLIANT.matcher(word).matches()) return topMatch("non-compliant");
    if (UX.matcher(word).matches()) return topMatch("UX");
    if (GITLAB.matcher(word).matches()) return topMatch("GitLab");
    if (BONAFIDE.matcher(word).matches()) return topMatch(replaceOnce(word, "onafide", "ona fide"));
    if (ALLRIGHT.matcher(word).matches()) return topMatch(replaceOnce(word, "llright", "lright"));
    if (ADDON.matcher(word).matches()) return topMatch(replaceOnce(word, "ddon", "dd-on"));
    if (WHEREEVER.matcher(word).matches()) return topMatch(replaceOnce(word, "hereever", "herever"));
    if (WHATSAPP.matcher(word).matches()) return topMatch("WhatsApp");
    if (UNINSPIRATIONAL.matcher(word).matches()) return topMatch(replaceOnce(word, "ninspirational", "ninspiring"));
    if (JETLAGGED.matcher(word).matches()) return topMatch("jet-lagged");
    if (MACBOOK.matcher(word).matches()) return topMatch(replaceOnce(word, "acbook", "acBook"));
    if (LIKELYHOOD.matcher(word).matches()) return topMatch(replaceOnce(word, "ikelyhood", "ikelihood"));
    if (UNECESSARY.matcher(word).matches()) return topMatch(replaceOnce(word, "necessary", "nnecessary"));
    if (FORSEEABLE.matcher(word).matches()) return topMatch(replaceOnce(word, "orseeable", "oreseeable"));
    if (UNFORSEEABLE.matcher(word).matches()) return topMatch(replaceOnce(word, "orseeable", "oreseeable"));
    if (FORSEEABLY.matcher(word).matches()) return topMatch(replaceOnce(word, "orseeably", "oreseeably"));
    if (UNFORSEEABLY.matcher(word).matches()) return topMatch(replaceOnce(word, "orseeably", "oreseeably"));
    if (QUILLBOT1.matcher(word).matches() || QUILLBOT2.matcher(word).matches()) return topMatch("QuillBot");
    if (QUILLBOT_POS.matcher(word).matches() || QUILLBOT1_POS.matcher(word).matches()
      || QUILLBOT2_POS.matcher(word).matches()) {
      return [new SuggestedReplacement("QuillBot's"), new SuggestedReplacement('QuillBot')];
    }
    if (TV.matcher(word).matches()) {
      return [new SuggestedReplacement('TV'), new SuggestedReplacement('to')];
    }
    if (JIST.matcher(word).matches()) {
      return [new SuggestedReplacement('just'), new SuggestedReplacement('gist')];
    }
    return [];
  }
}

// Java: List#remove(Object) (first occurrence)
function removeFirst(list, o) {
  const i = list.indexOf(o);
  if (i >= 0) list.splice(i, 1);
}

// Java: AbstractEnglishSpellerRule#cleanSuggestions(RuleMatch) (private static)
function cleanSuggestions(ruleMatch) {
  return ruleMatch.getSuggestedReplacementObjects().filter((k) => {
    const rep = k.getReplacement();
    if (!rep.includes(' ')) {
      return true;
    }
    const repLc = toLowerCase(rep);
    return true
      && !repLc.startsWith("re ")
      && !repLc.startsWith("en ")
      && !repLc.startsWith("co ")
      && !repLc.startsWith("cl ")
      && !repLc.startsWith("de ")
      && !repLc.startsWith("ex ")
      && !repLc.startsWith("es ")
      && !repLc.startsWith("ab ")
      && !repLc.startsWith("ty ")
      && !repLc.startsWith("mid ")
      && !repLc.startsWith("non ")
      && !repLc.startsWith("bio ")
      && !repLc.startsWith("bi ")
      && !repLc.startsWith("op ")
      && !repLc.startsWith("con ")
      && !repLc.startsWith("pre ")
      && !repLc.startsWith("mis ")
      && !repLc.startsWith("socio ")
      && !repLc.startsWith("proto ")
      && !repLc.startsWith("neo ")
      && !repLc.startsWith("geo ")
      && !repLc.startsWith("inter ")
      && !repLc.startsWith("multi ")
      && !repLc.startsWith("retro ")
      && !repLc.startsWith("extra ")
      && !repLc.startsWith("mega ")
      && !repLc.startsWith("meta ")
      && !repLc.startsWith("poly ")
      && !repLc.startsWith("para ")
      && !repLc.startsWith("uni ")
      && !repLc.startsWith("anti ")
      && !repLc.startsWith("necro ")
      && !repLc.startsWith("photo ")
      && !repLc.startsWith("post ")
      && !repLc.startsWith("sub ")
      && !repLc.startsWith("auto ")
      && !repLc.startsWith("pl ")
      && !repLc.startsWith("ht ")
      && !repLc.startsWith("dis ")
      && !repLc.startsWith("est ")
      && !repLc.startsWith("mono ")
      && !repLc.startsWith("trans ")
      && !repLc.startsWith("neuro ")
      && !repLc.startsWith("hetero ")
      && !repLc.startsWith("ultra ")
      && !repLc.startsWith("mini ")
      && !repLc.startsWith("hyper ")
      && !repLc.startsWith("micro ")
      && !repLc.startsWith("counter ")
      && !repLc.startsWith("over ")
      && !repLc.startsWith("overs ")
      && !repLc.startsWith("overt ")
      && !repLc.startsWith("under ")
      && !repLc.startsWith("cyber ")
      && !repLc.startsWith("hydro ")
      && !repLc.startsWith("ergo ")
      && !repLc.startsWith("fore ")
      && !repLc.startsWith("pro ")
      && !repLc.startsWith("pseudo ")
      && !repLc.startsWith("psycho ")
      && !repLc.startsWith("mi ")
      && !repLc.startsWith("nano ")
      && !repLc.startsWith("ans ")
      && !repLc.startsWith("semi ")
      && !repLc.startsWith("infra ")
      && !repLc.startsWith("hypo ")
      && !repLc.startsWith("syn ")
      && !repLc.startsWith("adv ")
      && !repLc.startsWith("com ")
      && !repLc.startsWith("res ")
      && !repLc.startsWith("resp ")
      && !repLc.startsWith("lo ")
      && !repLc.startsWith("ed ")
      && !repLc.startsWith("ac ")
      && !repLc.startsWith("al ")
      && !repLc.startsWith("ea ")
      && !repLc.startsWith("ge ")
      && !repLc.startsWith("mu ")
      && !repLc.startsWith("ma ")
      && !repLc.startsWith("la ")
      && !repLc.startsWith("bis ")
      && !repLc.startsWith("ger ")
      && !repLc.startsWith("inf ")
      && !repLc.startsWith("tar ")
      && !repLc.startsWith("f ")
      && !repLc.startsWith("k ")
      && !repLc.startsWith("l ")
      && !repLc.startsWith("b ")
      && !repLc.startsWith("e ")
      && !repLc.startsWith("c ")
      && !repLc.startsWith("d ")
      && !repLc.startsWith("p ")
      && !repLc.startsWith("v ")
      && !repLc.startsWith("h ")
      && !repLc.startsWith("r ")
      && !repLc.startsWith("s ")
      && !repLc.startsWith("t ")
      && !repLc.startsWith("u ")
      && !repLc.startsWith("w ")
      && !repLc.startsWith("um ")
      && !repLc.startsWith("oft ")
      && !rep.startsWith("i ")
      && !rep.startsWith("sh ")
      && !rep.startsWith("li ")
      && !rep.startsWith("ha ")
      && !rep.startsWith("st ")
      && !rep.startsWith("ins ")
      && !rep.endsWith(" i")
      && !rep.endsWith(" ING")
      && !rep.endsWith(" able")
      && !rep.endsWith(" om")
      && !rep.endsWith(" ox")
      && !rep.endsWith(" ht")
      && !rep.endsWith(" wide")
      && !rep.endsWith(" less")
      && !rep.endsWith(" sly")
      && !rep.endsWith(" OO")
      && !rep.endsWith(" HHH")
      && !rep.endsWith(" ally")
      && !rep.endsWith(" ize")
      && !rep.endsWith(" sh")
      && !rep.endsWith(" st")
      && !rep.endsWith(" est")
      && !rep.endsWith(" em")
      && !rep.endsWith(" ward")
      && !rep.endsWith(" ability")
      && !rep.endsWith(" ware")
      && !rep.endsWith(" logy")
      && !rep.endsWith(" ting")
      && !rep.endsWith(" ion")
      && !rep.endsWith(" ions")
      && !rep.endsWith(" cal")
      && !rep.endsWith(" ted")
      && !rep.endsWith(" sphere")
      && !rep.endsWith(" ell")
      && !rep.endsWith(" co")
      && !rep.endsWith(" con")
      && !rep.endsWith(" com")
      && !rep.endsWith(" sis")
      && !rep.endsWith(" like")
      && !rep.endsWith(" full")
      && !rep.endsWith(" en")
      && !rep.endsWith(" ne")
      && !rep.endsWith(" ed")
      && !rep.endsWith(" al")
      && !rep.endsWith(" ans")
      && !rep.endsWith(" mans")
      && !rep.endsWith(" ti")
      && !rep.endsWith(" de")
      && !rep.endsWith(" ea")
      && !rep.endsWith(" ge")
      && !rep.endsWith(" ab")
      && !rep.endsWith(" rs")
      && !rep.endsWith(" mi")
      && !rep.endsWith(" tar")
      && !rep.endsWith(" adv")
      && !rep.endsWith(" re")
      && !rep.endsWith(" e")
      && !rep.endsWith(" c")
      && !rep.endsWith(" v")
      && !rep.endsWith(" h")
      && !rep.endsWith(" s")
      && !rep.endsWith(" r")
      && !rep.endsWith(" l")
      && !rep.endsWith(" u")
      && !rep.endsWith(" um")
      && !rep.endsWith(" er")
      && !rep.endsWith(" es")
      && !rep.endsWith(" ex")
      && !rep.endsWith(" na")
      && !rep.endsWith(" ifs")
      && !rep.endsWith(" gs")
      && !rep.endsWith(" don")
      && !rep.endsWith(" dons")
      && !rep.endsWith(" la")
      && !rep.endsWith(" ism")
      && !rep.endsWith(" ma");
  });
}
