// org.languagetool.rules.en.EnglishWordRepeatRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaMatches, equalsIgnoreCase } from '../../../lib/java/strings.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const SINGLE_CHAR = Pattern.compile('(?i)^[a-z]$');

// plain "repetitionOf(word)" branches of the Java else-if chain, in source order ("wait" only at position 2)
const REPETITION_WORDS = [
  'aye', 'blah', 'mau', 'uh', 'paw', 'cha', 'yum', 'wop', 'woop', 'fnarr', 'fnar', 'ha', 'omg', 'boo', 'tick', 'twinkle', 'ta', 'la', 'x',
  'hi', 'ho', 'heh', 'jay', 'walla', 'sri', 'hey', 'hah', 'heh', 'oh', 'ouh', 'chop', 'ring', 'beep', 'bleep', 'yeah', 'gout', 'wait',
  'quack', 'meow', 'squawk', 'whoa', 'si', 'honk', 'brum', 'chi', 'santorio', 'lapu', 'chow', 'beep', 'shh', 'yummy', 'boom', 'bye', 'ah',
  'aah', 'bang', 'woof', 'wink', 'yes', 'tsk', 'hush', 'ding', 'choo', 'miu', 'tuk', 'yadda', 'walla', 'doo', 'sapiens', 'tse', 'no', 'Bora',
];

// Java: EnglishWordRepeatRule
export class EnglishWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.en.EnglishWordRepeatRule';

  // Java: EnglishWordRepeatRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('This <marker>is is</marker> just an example sentence.'),
      Example.fixed('This <marker>is</marker> just an example sentence.'));
  }

  // Java: EnglishWordRepeatRule#getId()
  getId() {
    return 'ENGLISH_WORD_REPEAT_RULE';
  }

  // Java: EnglishWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    if (position === 0) {
      return false;
    }
    // TODO:
    // What that is is a ...
    // but you you're my best friend ...
    // I'm so so happy
    // I'm very very happy
    const word = tokens[position].getToken();
    if ((this.repetitionOf('did', tokens, position) || this.repetitionOf('do', tokens, position)
        || this.repetitionOf('does', tokens, position)) && (position + 1 < tokens.length)
        && equalsIgnoreCase(tokens[position + 1].getToken(), "n't")) {
      return true;
    } else if (this.repetitionOf('her', tokens, position) && this.posIsIn(tokens, position - 2, 'VB', 'VBP', 'VBZ', 'VBG', 'VBD', 'VBN') && this.posIsIn(tokens, position + 1, 'NN', 'NNS', 'NN:U', 'NN:UN', 'NNP')) {
      return true; // "Please pass her her phone."
    } else if (this.repetitionOf('had', tokens, position) && this.posIsIn(tokens, position - 2, 'PRP', 'NN')) {
      return true; // "If I had had time, I would have gone to see him."
    } else if (this.repetitionOf('that', tokens, position) && this.posIsIn(tokens, position + 1, 'MD', 'NN', 'PRP$', 'JJ', 'VBZ', 'VBD')) {
      return true; // "I don't think that that is a problem."
    } else if (this.repetitionOf('can', tokens, position) && this.posIsIn(tokens, position - 1, 'NN')) {
      return true; // "The can can hold the water."
    } else if (this.repetitionOf('hip', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'hooray')) {
      return true;
    } else if (this.repetitionOf('bam', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'bigelow')) {
      return true;
    } else if (this.repetitionOf('wild', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'west')) {
      return true; // In the wild wild west (https://en.wikipedia.org/wiki/Wild_Wild_West)
    } else if (this.repetitionOf('far', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'away')) {
      return true;
    } else if (this.repetitionOf('so', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'much')) {
      return true;
    } else if (this.repetitionOf('so', tokens, position) && (position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), 'many')) {
      return true;
    } else if (this.repetitionOf('s', tokens, position) && position > 1 && javaMatches(tokens[position - 2].getToken(), "['’`´‘]")) {
      return true; // It's S.T.E.A.M.
    } else if (this.repetitionOf('in', tokens, position) && position > 2 && javaMatches(tokens[position - 3].getToken(), 'log(ged|s)?|sign(ed|s)?')) {
      return true; // log them in in the
    } else if (this.repetitionOf('in', tokens, position) && position > 1 && javaMatches(tokens[position - 2].getToken(), 'log(ged|s)?|sign(ed|s)?')) {
      return true; // log in in the
    } else if (this.repetitionOf('a', tokens, position) && position > 1 && tokens[position - 2].getToken() === '.') {
      return true; // "a.k.a a"
    } else if (this.repetitionOf('on', tokens, position) && position > 1 && tokens[position - 2].getToken() === '.') {
      return true; // "You can contact E.ON on Instagram"
    } else if (equalsIgnoreCase(tokens[position - 1].getToken(), word) && (((position + 1 < tokens.length) && equalsIgnoreCase(tokens[position + 1].getToken(), word)) || (position > 1 && equalsIgnoreCase(tokens[position - 2].getToken(), word)))) {
      // three time word repetition
      return true;
    } else if (SINGLE_CHAR.matcher(tokens[position].getToken()).matches() && position > 1
        && SINGLE_CHAR.matcher(tokens[position - 2].getToken()).matches()
        && (position + 1 < tokens.length) && SINGLE_CHAR.matcher(tokens[position + 1].getToken()).matches()) {
      // spelling with spaces in between: "b a s i c a l l y"
      return true;
    }
    for (const w of REPETITION_WORDS) {
      if (this.repetitionOf(w, tokens, position) && (w !== 'wait' || position === 2)) {
        return true;
      }
    }
    if (tokens[position].getToken().endsWith('ay')) {
      if (tokens[position - 1].getToken() === 'may' && tokens[position].getToken() === 'May') {
        return true; // "may May"
      }
      if (tokens[position - 1].getToken() === 'May' && tokens[position].getToken() === 'may') {
        return true; // "May may"
      }
      if (tokens[1].getToken() === 'May' && tokens[2].getToken() === 'May') {
        return true; // "May May" SENT_START
      }
    } else if (tokens[position].getToken().endsWith('ill')) {
      return (position > 0 && tokens[position - 1].getToken() === 'will' && tokens[position].getToken() === 'Will') // will Wills
        || (tokens[position - 1].getToken() === 'Will' && tokens[position].getToken() === 'will') // Will will ...
        || (tokens[1].getToken() === 'Will' && tokens[2].getToken() === 'Will'); // "Will Will" SENT_START
    }
    return super.ignore(tokens, position);
  }

  // Java: EnglishWordRepeatRule#posIsIn(AnalyzedTokenReadings[],int,String...)
  posIsIn(tokens, position, ...posTags) {
    if (position >= 0 && position < tokens.length) {
      for (const posTag of posTags) {
        if (tokens[position].hasPartialPosTag(posTag)) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: EnglishWordRepeatRule#repetitionOf(String,AnalyzedTokenReadings[],int)
  repetitionOf(word, tokens, position) {
    return position > 0 && equalsIgnoreCase(tokens[position - 1].getToken(), word) && equalsIgnoreCase(tokens[position].getToken(), word);
  }
}
