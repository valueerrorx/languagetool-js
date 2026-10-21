// org.languagetool.rules.de.GermanFillerWordsRule
import { AbstractStatisticStyleRule } from '../../../core/rules/AbstractStatisticStyleRule.js';
import { RuleOption } from '../../../core/rules/model/RuleOption.js';
import { d2i } from '../../../lib/java/casts.js';

const DEFAULT_MIN_PERCENT = 8;
const DEFAULT_TWO_FOLLOWING = false;
const DEFAULT_MANY_IN_SENTENCE = false;

const DEFAULT_SENTENCE_MSG1 = 'Zwei potentielle Füllwörter hintereinander. Mindestens eins sollte gelöscht werden.';
const DEFAULT_SENTENCE_MSG2 = 'Mehr als zwei potentielle Füllwörter in einem Satz. Mindestens eins sollte gelöscht werden.';

// Java: GermanFillerWordsRule#fillerWords (219 entries)
const fillerWords = new Set([
  'aber', 'abermals', 'allein', 'allemal', 'allenfalls', 'allenthalben', 'allerdings', 'allesamt', 'allzu', 'also', 'alt', 'andauernd',
  'andererseits', 'andernfalls', 'anscheinend', 'auch', 'auffallend', 'augenscheinlich', 'ausdrücklich', 'ausgerechnet', 'ausnahmslos', 'außerdem',
  'äußerst', 'beinahe', 'bekanntlich', 'bereits', 'besonders', 'bestenfalls', 'bestimmt', 'bloß', 'dabei', 'dadurch', 'dafür', 'dagegen', 'daher',
  'damals', 'danach', 'demgegenüber', 'demgemäß', 'demnach', 'denkbar', 'denn', 'dennoch', 'deshalb', 'deswegen', 'doch', 'durchaus', 'durchweg',
  'eben', 'eigentlich', 'einerseits', 'einfach', 'einige', 'einigermaßen', 'einmal', 'ergo', 'erheblich', 'etliche', 'etwa', 'etwas', 'fast',
  'folgendermaßen', 'folglich', 'förmlich', 'fortwährend', 'fraglos', 'freilich', 'ganz', 'gänzlich', 'gar', 'gelegentlich', 'gemeinhin', 'genau',
  'geradezu', 'gewiss', 'gewissermaßen', 'glatt', 'gleichsam', 'gleichwohl', 'glücklicherweise', 'gottseidank', 'größtenteils', 'häufig', 'hingegen',
  'hinlänglich', 'höchst', 'höchstens', 'immer', 'immerhin', 'immerzu', 'indessen', 'infolgedessen', 'insbesondere', 'inzwischen', 'irgend',
  'irgendein', 'irgendjemand', 'irgendwann', 'irgendwie', 'irgendwo', 'ja', 'je', 'jedenfalls', 'jedoch', 'jemals', 'kaum', 'keinesfalls',
  'keineswegs', 'längst', 'lediglich', 'leider', 'letztlich', 'manchmal', 'mehrfach', 'meinetwegen', 'meist', 'meistens', 'meistenteils',
  'mindestens', 'mithin', 'mitunter', 'möglicherweise', 'möglichst', 'nämlich', 'naturgemäß', 'natürlich', 'neuerdings', 'neuerlich', 'neulich',
  'nichtsdestoweniger', 'nie', 'niemals', 'nun', 'nur', 'offenbar', 'offenkundig', 'offensichtlich', 'oft', 'ohnedies', 'partout', 'plötzlich',
  'praktisch', 'quasi', 'recht', 'reichlich', 'reiflich', 'relativ', 'restlos', 'richtiggehend', 'rundheraus', 'rundum', 'sattsam', 'schlicht',
  'schlichtweg', 'schließlich', 'schlussendlich', 'schon', 'sehr', 'selbst', 'selbstredend', 'selbstverständlich', 'selten', 'seltsamerweise',
  'sicher', 'sicherlich', 'so', 'sogar', 'sonst', 'sowieso', 'sozusagen', 'stellenweise', 'stets', 'trotzdem', 'überaus', 'überdies', 'überhaupt',
  'übrigens', 'umständehalber', 'unbedingt', 'unerhört', 'ungefähr', 'ungemein', 'ungewöhnlich', 'ungleich', 'unglücklicherweise', 'unlängst',
  'unmaßgeblich', 'unsagbar', 'unsäglich', 'unstreitig', 'unzweifelhaft', 'vergleichsweise', 'vermutlich', 'vielfach', 'vielleicht', 'voll',
  'vollends', 'völlig', 'vollkommen', 'vollständig', 'wahrscheinlich', 'weidlich', 'weitgehend', 'wenigstens', 'wieder', 'wiederum', 'wirklich',
  'wohl', 'wohlgemerkt', 'womöglich', 'ziemlich', 'zudem', 'zugegeben', 'zumeist', 'zusehends', 'zuweilen', 'zweifellos', 'zweifelsfrei',
  'zweifelsohne',
]);

// Java: GermanFillerWordsRule
export class GermanFillerWordsRule extends AbstractStatisticStyleRule {
  static FQCN = 'org.languagetool.rules.de.GermanFillerWordsRule';

  // Java: GermanFillerWordsRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
    if (userConfig !== null && userConfig !== undefined) {
      const linguServices = userConfig.getLinguServices();
      if (linguServices !== null && linguServices !== undefined) {
        linguServices.setThesaurusRelevantRule(this);
      }
    }
    this.testTwoFollowing = this.getTwoFollowing(userConfig);
    this.TestManyInSentence = this.getManyInSentence(userConfig);
  }

  // Java: GermanFillerWordsRule#getTwoFollowing(UserConfig)
  getTwoFollowing(userConfig) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null && cf.length > 2 && cf[2] !== null && cf[2] !== undefined && typeof cf[2] === 'boolean') {
        return cf[2];
      }
    }
    return DEFAULT_TWO_FOLLOWING;
  }

  // Java: GermanFillerWordsRule#getManyInSentence(UserConfig); reads cf[2] like Java (copy of getTwoFollowing)
  getManyInSentence(userConfig) {
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null && cf.length > 2 && cf[2] !== null && cf[2] !== undefined && typeof cf[2] === 'boolean') {
        return cf[2];
      }
    }
    return DEFAULT_MANY_IN_SENTENCE;
  }

  // Java: GermanFillerWordsRule#isException(AnalyzedTokenReadings[],int)
  static isException(tokens, num) {
    if (num === 1 || ',' === tokens[num - 1].getToken()) {
      return true;
    }
    if ('allein' === tokens[num].getToken()) {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i].hasLemma('sein')) {
          return true;
        }
      }
      return false;
    }
    if ('recht' === tokens[num].getToken()) {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i].hasAnyLemma('haben', 'geben')) {
          return true;
        }
      }
    }
    if (num < tokens.length - 1 && ('so' === tokens[num].getToken() || 'besonders' === tokens[num].getToken())
        && tokens[num + 1].hasPosTagStartingWith('ADJ')) {
      return true;
    }
    if (tokens[num].hasPosTagStartingWith('ADJ') && 'so' === tokens[num - 1].getToken()) {
      return true;
    }
    if ('nur' === tokens[num].getToken() && 'nicht' === tokens[num - 1].getToken()) {
      for (let i = num + 1; i < tokens.length - 2; i++) {
        if (',' === tokens[i].getToken() && ('auch' === tokens[i + 1].getToken()
            || ('sondern' === tokens[i + 1].getToken() && 'auch' === tokens[i + 2].getToken()))) {
          return true;
        }
      }
    }
    if (num > 2 && 'auch' === tokens[num].getToken() && 'sondern' === tokens[num - 1].getToken() && ',' === tokens[num - 2].getToken()) {
      for (let i = 1; i < num - 2; i++) {
        if ('nicht' === tokens[i].getToken() && 'nur' === tokens[i + 1].getToken()) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: GermanFillerWordsRule#conditionFulfilled(AnalyzedTokenReadings[],int)
  conditionFulfilled(tokens, nToken) {
    if (fillerWords.has(tokens[nToken].getToken()) && !GermanFillerWordsRule.isException(tokens, nToken)
         && (nToken < 2 || !GermanFillerWordsRule.isTwoWordException(tokens[nToken - 1].getToken(), tokens[nToken].getToken()))
         && (nToken > tokens.length - 2 || !GermanFillerWordsRule.isTwoWordException(tokens[nToken].getToken(), tokens[nToken + 1].getToken()))
         ) {
      return nToken;
    }
    return -1;
  }

  // Java: GermanFillerWordsRule#isTwoWordException(String,String)
  static isTwoWordException(first, second) {
    return (('aber' === first && ('nur' === second || 'auch' === second))
        || ('auch' === first && 'nur' === second)
        || ('immer' === first && 'wieder' === second)
        || ('genau' === first && 'so' === second)
        || ('so' === first && ('etwas' === second || 'viel' === second || 'oft' === second))
        || ('schon' === first && 'fast' === second)
        );
  }

  // Java: GermanFillerWordsRule#sentenceConditionFulfilled(AnalyzedTokenReadings[],int)
  sentenceConditionFulfilled(tokens, nToken) {
    if (this.testTwoFollowing) {
      if ((nToken > 1 && fillerWords.has(tokens[nToken - 1].getToken()) && !GermanFillerWordsRule.isException(tokens, nToken - 1)) ||
          (nToken < tokens.length - 1 && fillerWords.has(tokens[nToken + 1].getToken()) && !GermanFillerWordsRule.isException(tokens, nToken + 1))) {
        this.sentenceMessage = DEFAULT_SENTENCE_MSG1;
        return true;
      }
    }
    if (this.TestManyInSentence) {
      let n = 0;
      for (let i = nToken - 2; i > 0; i--) {
        if (this.conditionFulfilled(tokens, i) === i) {
          n++;
          if (n > 1) {
            this.sentenceMessage = DEFAULT_SENTENCE_MSG2;
            return true;
          }
        }
      }
      for (let i = nToken + 2; i < tokens.length; i++) {
        if (this.conditionFulfilled(tokens, i) === i) {
          n++;
          if (n > 1) {
            this.sentenceMessage = DEFAULT_SENTENCE_MSG2;
            return true;
          }
        }
      }
    }
    return false;
  }

  // Java: GermanFillerWordsRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: GermanFillerWordsRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Dieses Wort könnte ein Füllwort sein. Möglicherweise ist es besser es zu löschen.';
    }
    return 'Mehr als ' + limit + '% Füllwörter {' + d2i(percent + 0.5) + '%} gefunden. Möglicherweise ist es besser dieses potentielle Füllwort zu löschen.';
  }

  // Java: GermanFillerWordsRule#getSentenceMessage()
  getSentenceMessage() {
    return this.sentenceMessage;
  }

  // Java: GermanFillerWordsRule#getId()
  getId() {
    return 'FILLER_WORDS_DE';
  }

  // Java: GermanFillerWordsRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Füllwörter';
  }

  // Java: GermanFillerWordsRule#getConfigurePercentText()
  getConfigurePercentText() {
    return 'Anzeigen wenn mehr als ...% eines Kapitels Füllwörter sind:';
  }

  // Java: GermanFillerWordsRule#getConfigureWithoutDirectSpeachText()
  getConfigureWithoutDirectSpeachText() {
    return 'Keine wörtliche Rede und Zitate berücksichtigen';
  }

  // Java: GermanFillerWordsRule#getRuleOptions()
  getRuleOptions() {
    return [
      new RuleOption(DEFAULT_MIN_PERCENT, this.getConfigurePercentText(), 0, 100),
      new RuleOption(this.excludeDirectSpeech(), this.getConfigureWithoutDirectSpeachText()),
      new RuleOption(DEFAULT_TWO_FOLLOWING, 'Zeige zwei aufeinander folgende Füllwörter'),
      new RuleOption(DEFAULT_MANY_IN_SENTENCE, 'Zeige mehr als zwei Füllwörter in einem Satz'),
    ];
  }
}
