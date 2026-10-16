// Java: org.languagetool.tagging.de.GermanTagger (German POS tagger over de/german.dict with spelling.txt expansion and compound lookup)
import { ArrayIndexOutOfBoundsException, ClassCastException, RuntimeException } from '../../../lib/java/errors.js';
import { isDigit, isUpperCase } from '../../../lib/java/Character.js';
import { Locale } from '../../../lib/java/Locale.js';
import { removePattern, replaceFirst } from '../../../lib/java/RegExUtils.js';
import { Pattern, javaReplaceFirst, javaSplit } from '../../../lib/java/regex/index.js';
import { javaReplace, javaTrim, substring, toLowerCase, toUpperCase } from '../../../lib/java/strings.js';
import {
  containsAny, endsWith, equalsAny, equalsAnyIgnoreCase, isAllBlank, isAlphanumeric, isWhitespace, removeEnd, removeStart,
  splitByChar, startsWithAny,
} from '../../../lib/java/StringUtils.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { CachingWordListLoader } from '../../../core/rules/spelling/CachingWordListLoader.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { CombiningTagger } from '../../../core/tagging/CombiningTagger.js';
import { TaggedWord } from '../../../core/tagging/TaggedWord.js';
import { lowercaseFirstChar, startsWithLowercase, startsWithUppercase, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';
import { GermanCompoundTokenizer } from '../tokenizers/GermanCompoundTokenizer.js';
import { AdjectiveTags } from './AdjectiveTags.js';
import { VerbPrefixes } from './VerbPrefixes.js';

// Java: GermanTagger#allAdjGruTags
const allAdjGruTags = [];
for (const nomAkkGenDat of ['NOM', 'AKK', 'GEN', 'DAT']) {
  for (const pluSin of ['PLU', 'SIN']) {
    for (const masFemNeu of ['MAS', 'FEM', 'NEU']) {
      for (const defIndSol of ['DEF', 'IND', 'SOL']) {
        allAdjGruTags.push(`ADJ:${nomAkkGenDat}:${pluSin}:${masFemNeu}:GRU:${defIndSol}`);
      }
    }
  }
}
const mitarbeitendenPattern = Pattern.compile('[A-ZÖÄÜ][a-zöäüß]{2,25}mitarbeitenden?');
const genderGapChars = Pattern.compile('[*:_/]');
const afterAsterisk = Pattern.compile('in(nen)?|r|e');
const innenPattern1 = Pattern.compile('in(nen)-[A-ZÖÄÜ][a-zöäüß-]+');
const anythingDash = Pattern.compile('.*-');
const innenPattern2 = Pattern.compile('innen[a-zöäüß-]+');
const DDD_ER_PATTERN = Pattern.compile('\\d{4}+er');
const SLASH_ANY = Pattern.compile('/.*'); // Java: line.replaceFirst("/.*", "")
const DOT_I_PLUS = Pattern.compile('.*i.+'); // Java: word.matches(".*i.+")
const DOMAINS = Pattern.compile('com|net|org|de|at|ch|fr|uk|gov');
const BITTER_ETC = '^(bitter|dunkel|erz|extra|früh|gemein|grund|hyper|lau|mega|minder|stock|super|tod|ultra|u[nr]|voll)';

// do not add noun tags to these words, e.g. don't add noun tags to "Wegstrecken" for weg_strecken from spelling.txt:
const nounTagExpansionExceptions = ['Wegstrecken'];

// Java: GermanTagger#prefixesSeparableVerbs
const prefixesSeparableVerbs = [
  'gegeneinander', 'durcheinander', 'nebeneinander', 'übereinander', 'aufeinander', 'auseinander', 'beieinander',
  'aneinander', 'ineinander', 'zueinander', 'gegenüber', 'beisammen', 'gegenüber', 'hernieder', 'rückwärts',
  'wiederauf', 'wiederein', 'wiederher', 'zufrieden', 'zwangsvor', 'entgegen', 'hinunter', 'abhanden', 'aufrecht',
  'aufwärts', 'auswärts', 'beiseite', 'danieder', 'drauflos', 'einwärts', 'herunter', 'hindurch', 'verrückt',
  'vorwärts', 'zunichte', 'zusammen', 'zwangsum', 'zwischen', 'abseits', 'abwärts', 'entlang', 'hinfort', 'ähnlich',
  'daneben', 'general', 'herüber', 'hierher', 'hierhin', 'hinüber', 'schwarz', 'trocken', 'überein', 'vorlieb',
  'vorüber', 'wichtig', 'zurecht', 'zuwider', 'hinweg', 'allein', 'besser', 'daheim', 'doppel', 'feinst', 'fertig',
  'herauf', 'heraus', 'herbei', 'hinauf', 'hinaus', 'hinein', 'kaputt', 'kennen', 'kürzer', 'mittag', 'nieder',
  'runter', 'sicher', 'sitzen', 'voraus', 'vorbei', 'vorweg', 'weiter', 'wieder', 'zugute', 'zurück', 'zwangs',
  'abend', 'blank', 'brust', 'dahin', 'davon', 'drauf', 'drein', 'durch', 'einig', 'empor', 'grund', 'herum', 'höher',
  'klein', 'knapp', 'krank', 'krumm', 'kugel', 'näher', 'neben', 'offen', 'preis', 'rüber', 'ruhig', 'statt', 'still',
  'übrig', 'umher', 'unter', 'voran', 'zweck', 'acht', 'drei', 'fehl', 'feil', 'fort', 'frei', 'groß', 'hand', 'hart',
  'heim', 'hier', 'hoch', 'klar', 'lahm', 'miss', 'nach', 'nahe', 'quer', 'rauf', 'raus', 'rein', 'rück', 'satt',
  'stoß', 'teil', 'über', 'voll', 'wach', 'wahr', 'warm', 'wert', 'wohl', 'auf', 'aus', 'bei', 'ehe', 'ein', 'eis',
  'end', 'her', 'hin', 'los', 'maß', 'mit', 'out', 'ran', 'rum', 'tot', 'vor', 'weg', 'weh', 'ab', 'an', 'da', 'um',
  'zu',
];

// Java: GermanTagger#prefixesNonSeparableVerbs
const prefixesNonSeparableVerbs = [
  'be', 'emp', 'ent', 'er', 'hinter', 'miss', 'un', 'ver', 'zer',
];

// Java: GermanTagger#prefixesVerbs
const prefixesVerbs = [
  'gegeneinander', 'durcheinander', 'nebeneinander', 'übereinander', 'aufeinander', 'auseinander', 'beieinander',
  'aneinander', 'ineinander', 'zueinander', 'gegenüber', 'beisammen', 'gegenüber', 'hernieder', 'rückwärts',
  'wiederauf', 'wiederein', 'wiederher', 'zufrieden', 'zwangsvor', 'entgegen', 'hinunter', 'abhanden', 'aufrecht',
  'aufwärts', 'auswärts', 'beiseite', 'danieder', 'drauflos', 'einwärts', 'herunter', 'hindurch', 'verrückt',
  'vorwärts', 'zunichte', 'zusammen', 'zwangsum', 'zwischen', 'abseits', 'abwärts', 'entlang', 'hinfort', 'ähnlich',
  'daneben', 'general', 'herüber', 'hierher', 'hierhin', 'hinüber', 'schwarz', 'trocken', 'überein', 'vorlieb',
  'vorüber', 'wichtig', 'zurecht', 'zuwider', 'hinweg', 'hinter', 'allein', 'besser', 'daheim', 'doppel', 'feinst',
  'fertig', 'herauf', 'heraus', 'herbei', 'hinauf', 'hinaus', 'hinein', 'kaputt', 'kennen', 'kürzer', 'mittag',
  'nieder', 'runter', 'sicher', 'sitzen', 'voraus', 'vorbei', 'vorweg', 'weiter', 'wieder', 'zugute', 'zurück',
  'zwangs', 'abend', 'blank', 'brust', 'dahin', 'davon', 'drauf', 'drein', 'durch', 'einig', 'empor', 'grund', 'herum',
  'höher', 'klein', 'knapp', 'krank', 'krumm', 'kugel', 'näher', 'neben', 'offen', 'preis', 'rüber', 'ruhig', 'statt',
  'still', 'übrig', 'umher', 'unter', 'voran', 'zweck', 'miss', 'acht', 'drei', 'fehl', 'feil', 'fort', 'frei', 'groß',
  'hand', 'hart', 'heim', 'hier', 'hoch', 'klar', 'lahm', 'miss', 'nach', 'nahe', 'quer', 'rauf', 'raus', 'rein',
  'rück', 'satt', 'stoß', 'teil', 'über', 'voll', 'wach', 'wahr', 'warm', 'wert', 'wohl', 'emp', 'ent', 'ver', 'zer',
  'auf', 'aus', 'bei', 'ehe', 'ein', 'eis', 'end', 'her', 'hin', 'los', 'maß', 'mit', 'out', 'ran', 'rum', 'tot',
  'vor', 'weg', 'weh', 'be', 'er', 'un', 'ab', 'an', 'da', 'um', 'zu',
];

// Java: GermanTagger#partizip2contains1PluPra
const partizip2contains1PluPra = [
  'blasen', 'fahren', 'fallen', 'fangen', 'fressen', 'geben', 'halten', 'kommen', 'laden', 'lassen', 'laufen', 'lesen',
  'messen', 'raten', 'schlafen', 'schlagen', 'sehen', 'tragen', 'treten',
];

// Java: GermanTagger#partizip2contains1PluPrt
const partizip2contains1PluPrt = [
  'bieten', 'bleiben', 'fliegen', 'fließen', 'heben', 'leiden', 'meiden', 'scheiden', 'schließen', 'schreiben',
  'stehen', 'steigen', 'streiten', 'treiben', 'weisen', 'ziehen',
];

// Java: GermanTagger#postagsPartizipEndingE
const postagsPartizipEndingE = [
  'AKK:PLU:FEM:GRU:SOL:VER', 'AKK:PLU:MAS:GRU:SOL:VER', 'AKK:PLU:NEU:GRU:SOL:VER', 'AKK:SIN:FEM:GRU:DEF:VER',
  'AKK:SIN:FEM:GRU:IND:VER', 'AKK:SIN:FEM:GRU:SOL:VER', 'AKK:SIN:NEU:GRU:DEF:VER', 'NOM:PLU:FEM:GRU:SOL:VER',
  'NOM:PLU:MAS:GRU:SOL:VER', 'NOM:PLU:NEU:GRU:SOL:VER', 'NOM:SIN:FEM:GRU:DEF:VER', 'NOM:SIN:FEM:GRU:IND:VER',
  'NOM:SIN:FEM:GRU:SOL:VER', 'NOM:SIN:MAS:GRU:DEF:VER', 'NOM:SIN:NEU:GRU:DEF:VER',
];

// Java: GermanTagger#postagsPartizipEndingEm
const postagsPartizipEndingEm = [
  'DAT:SIN:MAS:GRU:SOL:VER', 'DAT:SIN:NEU:GRU:SOL:VER',
];

// Java: GermanTagger#postagsPartizipEndingEn
const postagsPartizipEndingEn = [
  'AKK:PLU:FEM:GRU:DEF:VER', 'AKK:PLU:FEM:GRU:IND:VER', 'AKK:PLU:MAS:GRU:DEF:VER', 'AKK:PLU:MAS:GRU:IND:VER',
  'AKK:PLU:NEU:GRU:DEF:VER', 'AKK:PLU:NEU:GRU:IND:VER', 'AKK:SIN:MAS:GRU:DEF:VER', 'AKK:SIN:MAS:GRU:IND:VER',
  'AKK:SIN:MAS:GRU:SOL:VER', 'DAT:PLU:FEM:GRU:DEF:VER', 'DAT:PLU:FEM:GRU:IND:VER', 'DAT:PLU:FEM:GRU:SOL:VER',
  'DAT:PLU:MAS:GRU:DEF:VER', 'DAT:PLU:MAS:GRU:IND:VER', 'DAT:PLU:MAS:GRU:SOL:VER', 'DAT:PLU:NEU:GRU:DEF:VER',
  'DAT:PLU:NEU:GRU:IND:VER', 'DAT:PLU:NEU:GRU:SOL:VER', 'DAT:SIN:FEM:GRU:DEF:VER', 'DAT:SIN:FEM:GRU:IND:VER',
  'DAT:SIN:MAS:GRU:DEF:VER', 'DAT:SIN:MAS:GRU:IND:VER', 'DAT:SIN:NEU:GRU:DEF:VER', 'DAT:SIN:NEU:GRU:IND:VER',
  'GEN:PLU:FEM:GRU:DEF:VER', 'GEN:PLU:FEM:GRU:IND:VER', 'GEN:PLU:MAS:GRU:DEF:VER', 'GEN:PLU:MAS:GRU:IND:VER',
  'GEN:PLU:NEU:GRU:DEF:VER', 'GEN:PLU:NEU:GRU:IND:VER', 'GEN:SIN:FEM:GRU:DEF:VER', 'GEN:SIN:FEM:GRU:IND:VER',
  'GEN:SIN:MAS:GRU:DEF:VER', 'GEN:SIN:MAS:GRU:IND:VER', 'GEN:SIN:MAS:GRU:SOL:VER', 'GEN:SIN:NEU:GRU:DEF:VER',
  'GEN:SIN:NEU:GRU:IND:VER', 'GEN:SIN:NEU:GRU:SOL:VER', 'NOM:PLU:FEM:GRU:DEF:VER', 'NOM:PLU:FEM:GRU:IND:VER',
  'NOM:PLU:MAS:GRU:DEF:VER', 'NOM:PLU:MAS:GRU:IND:VER', 'NOM:PLU:NEU:GRU:DEF:VER', 'NOM:PLU:NEU:GRU:IND:VER',
];

// Java: GermanTagger#postagsPartizipEndingEr
const postagsPartizipEndingEr = [
  'DAT:SIN:FEM:GRU:SOL:VER', 'GEN:PLU:FEM:GRU:SOL:VER', 'GEN:PLU:MAS:GRU:SOL:VER', 'GEN:PLU:NEU:GRU:SOL:VER',
  'GEN:SIN:FEM:GRU:SOL:VER', 'NOM:SIN:MAS:GRU:IND:VER', 'NOM:SIN:MAS:GRU:SOL:VER', 'DAT:SIN:FEM:GRU:SOL:VER',
  'GEN:PLU:FEM:GRU:SOL:VER', 'GEN:PLU:MAS:GRU:SOL:VER', 'GEN:PLU:NEU:GRU:SOL:VER', 'GEN:SIN:FEM:GRU:SOL:VER',
  'NOM:SIN:MAS:GRU:IND:VER', 'NOM:SIN:MAS:GRU:SOL:VER',
];

// Java: GermanTagger#postagsPartizipEndingEs
const postagsPartizipEndingEs = [
  'AKK:SIN:NEU:GRU:IND:VER', 'AKK:SIN:NEU:GRU:SOL:VER', 'NOM:SIN:NEU:GRU:IND:VER', 'NOM:SIN:NEU:GRU:SOL:VER',
];

// Java: GermanTagger#notAVerb
const notAVerb = [
  'angebot', 'anteil', 'aufenthalt', 'ausdruck', 'auswärtsspiel', 'beispiel', 'bereich', 'besondere', 'daring',
  'einfach', 'einfachst', 'endkasten', 'freibetrag', 'grautöne', 'grüntöne', 'großherzöge', 'großteil', 'hochhaus',
  'klarerweise', 'maßnahme', 'mitglieder', 'nachricht', 'nebenfach', 'niederlage', 'nothing', 'notscheid', 'preisver',
  'reinweiß', 'schwarzweiß', 'schwarzgrau', 'schwarzgrün', 'schwarztöne', 'unbesiegt', 'unmenge', 'unrat', 'unver',
  'verrückterweise', 'versonnen', 'vorlieb', 'vorteil', 'warmweiß', 'wohldefiniert', 'wohlergehen', 'wohlgemerkt',
  'zuende', 'zuhause', 'zumal', 'zuver', 'darauf', 'einmal', 'kleinkram', 'hochsicher', 'ehering', 'freitag',
  'großmeister', 'handwerk', 'herpes', 'nachfolger',
];

// Java: GermanTagger#prefixesSeparableVerbsRegexp
const prefixesSeparableVerbsRegexp = '^(gegeneinander|durcheinander|nebeneinander|übereinander|aufeinander|auseinander|beieinander|aneinander|ineinander|zueinander|gegenüber|beisammen|gegenüber|hernieder|rückwärts|wiederauf|wiederein|wiederher|zufrieden|zwangsvor|entgegen|hinunter|abhanden|aufrecht|aufwärts|auswärts|beiseite|danieder|drauflos|einwärts|herunter|hindurch|verrückt|vorwärts|zunichte|zusammen|zwangsum|zwischen|abseits|abwärts|entlang|hinfort|ähnlich|daneben|general|herüber|hierher|hierhin|hinüber|schwarz|trocken|überein|vorlieb|vorüber|wichtig|zurecht|zuwider|hinweg|allein|besser|daheim|doppel|feinst|fertig|herauf|heraus|herbei|hinauf|hinaus|hinein|kaputt|kennen|kürzer|mittag|nieder|runter|sicher|sitzen|voraus|vorbei|vorweg|weiter|wieder|zugute|zurück|zwangs|abend|blank|brust|dahin|davon|drauf|drein|durch|einig|empor|grund|herum|höher|klein|knapp|krank|krumm|kugel|näher|neben|offen|preis|rüber|ruhig|statt|still|übrig|umher|unter|voran|zweck|acht|drei|fehl|feil|fort|frei|groß|hand|hart|heim|hier|hoch|klar|lahm|miss|nach|nahe|quer|rauf|raus|rein|rück|satt|stoß|teil|über|voll|wach|wahr|warm|wert|wohl|auf|aus|bei|ehe|ein|eis|end|her|hin|los|maß|mit|not|out|ran|rum|tot|vor|weg|weh|ab|an|da|um|zu)';

// Java: GermanTagger#prefixesNonSeparableVerbsRegexp
const prefixesNonSeparableVerbsRegexp = '^(be|emp|ent|er|hinter|miss|un|ver|zer)';

// Java: GermanTagger#prefixesVerbsRegexp
const prefixesVerbsRegexp = '^(gegeneinander|durcheinander|nebeneinander|übereinander|aufeinander|auseinander|beieinander|aneinander|ineinander|zueinander|gegenüber|beisammen|gegenüber|hernieder|rückwärts|wiederauf|wiederein|wiederher|zufrieden|zwangsvor|entgegen|hinunter|abhanden|aufrecht|aufwärts|auswärts|beiseite|danieder|drauflos|einwärts|herunter|hindurch|verrückt|vorwärts|zunichte|zusammen|zwangsum|zwischen|abseits|abwärts|entlang|hinfort|ähnlich|daneben|general|herüber|hierher|hierhin|hinüber|schwarz|trocken|überein|vorlieb|vorüber|wichtig|zurecht|zuwider|hinweg|hinter|allein|besser|daheim|doppel|feinst|fertig|herauf|heraus|herbei|hinauf|hinaus|hinein|kaputt|kennen|kürzer|mittag|nieder|runter|sicher|sitzen|voraus|vorbei|vorweg|weiter|wieder|zugute|zurück|zwangs|abend|blank|brust|dahin|davon|drauf|drein|durch|einig|empor|grund|herum|höher|klein|knapp|krank|krumm|kugel|näher|neben|offen|preis|rüber|ruhig|statt|still|übrig|umher|unter|voran|zweck|miss|acht|drei|fehl|feil|fort|frei|groß|hand|hart|heim|hier|hoch|klar|lahm|miss|nach|nahe|quer|rauf|raus|rein|rück|satt|stoß|teil|über|voll|wach|wahr|warm|wert|wohl|emp|ent|ver|zer|auf|aus|bei|ehe|ein|eis|end|her|hin|los|maß|mit|not|out|ran|rum|tot|vor|weg|weh|be|er|un|ab|an|da|um|zu)';

// Java: GermanTagger#tag(List,boolean) local prfxs
const PRFXS = [
  'ab', 'abend', 'abhanden', 'acht', 'ähnlich', 'allein', 'an', 'auf', 'aufeinander', 'aufrecht', 'aufwärts', 'aus',
  'auseinander', 'auswärts', 'bei', 'beieinander', 'beisammen', 'beiseite', 'besser', 'blank', 'brust', 'da', 'daheim',
  'dahin', 'daneben', 'danieder', 'davon', 'doppel', 'drauflos', 'drei', 'drein', 'durch', 'durcheinander', 'ehe',
  'ein', 'einig', 'einwärts', 'eis', 'empor', 'end', 'fehl', 'feil', 'feinst', 'fort', 'frei', 'gegenüber', 'general',
  'groß', 'grund', 'hand', 'hart', 'heim', 'her', 'herauf', 'heraus', 'herbei', 'hernieder', 'herüber', 'herum',
  'herunter', 'hier', 'hierher', 'hierhin', 'hin', 'hinauf', 'hinaus', 'hindurch', 'hinein', 'hinüber', 'hoch',
  'höher', 'ineinander', 'kaputt', 'kennen', 'klar', 'klein', 'knapp', 'krank', 'krumm', 'kugel', 'kürzer', 'lahm',
  'los', 'maß', 'miss', 'mit', 'mittag', 'nach', 'nahe', 'näher', 'neben', 'nebeneinander', 'nieder', 'offen', 'out',
  'preis', 'quer', 'ran', 'rauf', 'raus', 'rein', 'rüber', 'rück', 'rückwärts', 'ruhig', 'rum', 'runter', 'satt',
  'schwarz', 'sicher', 'sitzen', 'statt', 'still', 'stoß', 'teil', 'tot', 'trocken', 'über', 'überein', 'übereinander',
  'übrig', 'um', 'umher', 'unter', 'verrückt', 'voll', 'vor', 'voran', 'voraus', 'vorbei', 'vorlieb', 'vorüber',
  'vorwärts', 'vorweg', 'wach', 'wahr', 'warm', 'weg', 'weh', 'weiter', 'wert', 'wichtig', 'wieder', 'wiederauf',
  'wiederein', 'wiederher', 'wohl', 'zu', 'zueinander', 'zufrieden', 'zugute', 'zunichte', 'zurecht', 'zurück',
  'zusammen', 'zuwider', 'zwangs', 'zwangsum', 'zwangsvor', 'zweck', 'zwischen',
];

// Java: GermanTagger#tagsForWeise ("kofferweise", "idealerweise" etc.)
const tagsForWeise = [
  'ADJ:AKK:PLU:FEM:GRU:SOL', 'ADJ:AKK:PLU:MAS:GRU:SOL', 'ADJ:AKK:PLU:NEU:GRU:SOL', 'ADJ:AKK:SIN:FEM:GRU:DEF',
  'ADJ:AKK:SIN:FEM:GRU:IND', 'ADJ:AKK:SIN:FEM:GRU:SOL', 'ADJ:AKK:SIN:NEU:GRU:DEF', 'ADJ:NOM:PLU:FEM:GRU:SOL',
  'ADJ:NOM:PLU:MAS:GRU:SOL', 'ADJ:NOM:PLU:NEU:GRU:SOL', 'ADJ:NOM:SIN:FEM:GRU:DEF', 'ADJ:NOM:SIN:FEM:GRU:IND',
  'ADJ:NOM:SIN:FEM:GRU:SOL', 'ADJ:NOM:SIN:MAS:GRU:DEF', 'ADJ:NOM:SIN:NEU:GRU:DEF', 'ADJ:PRD:GRU',
];

// Java: String#toLowerCase() / toUpperCase() (default locale)
const lc = (s) => toLowerCase(s);
const uc = (s) => toUpperCase(s);

// Java: word.equals(word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase()) || word.equals(word.toLowerCase())
const isCapitalizedOrLower = (word) => word === uc(substring(word, 0, 1)) + lc(substring(word, 1)) || word === lc(word);

// Java: word.equals(word.substring(0, 1).toLowerCase() + word.substring(1))
const isLowerFirst = (word) => word === lc(substring(word, 0, 1)) + substring(word, 1);

// Java: List<String>#indexOf(Object)
const indexOf = (list, word) => list.indexOf(word);

// Java: AbstractCollection#toString() of a List<AnalyzedToken>
const readingsToString = (readings) => `[${readings.map((r) => r.toString()).join(', ')}]`;

// Java: GermanTagger.PrefixInfixVerb
class PrefixInfixVerb {
  // Java: PrefixInfixVerb#PrefixInfixVerb(String,String,String)
  constructor(prefix, infix, verbBaseform) {
    this.prefix = prefix;
    this.infix = infix;
    this.verbBaseform = verbBaseform;
  }
}

// Java: GermanTagger.AdjInfo
class AdjInfo {
  // Java: AdjInfo#AdjInfo(String,String,String)
  constructor(baseform, fullForm, tag) {
    this.baseform = baseform;
    this.fullForm = fullForm;
    this.tag = tag;
  }
}

// Java: GermanTagger.NominalizedVerb / NominalizedGenitiveVerb
class NominalizedVerb {
  // Java: NominalizedVerb#NominalizedVerb(String,String)
  constructor(prefix, verbBaseform) {
    this.prefix = prefix;
    this.verbBaseform = verbBaseform;
  }
}

// Java: GermanTagger.ExpansionInfos
class ExpansionInfos {
  // Java: ExpansionInfos#ExpansionInfos(Map,Map,Map,Map)
  constructor(verbInfos, nominalizedVerbInfos, nominalizedGenVerbInfos, adjInfos) {
    this.verbInfos = verbInfos;
    this.nominalizedVerbInfos = nominalizedVerbInfos;
    this.nominalizedGenVerbInfos = nominalizedGenVerbInfos;
    this.adjInfos = adjInfos;
  }
}

let expansionInfosValue = null;

// Java: GermanTagger#expansionInfos (Suppliers.memoize(GermanTagger::initExpansionInfos))
function expansionInfos() {
  if (expansionInfosValue === null) expansionInfosValue = initExpansionInfos();
  return expansionInfosValue;
}

// Java: GermanTagger#initExpansionInfos()
function initExpansionInfos() {
  const verbInfos = new Map(); // Java: Object2ObjectOpenHashMap (lookup only)
  const nominalizedVerbInfos = new Map();
  const nominalizedGenVerbInfos = new Map();
  const adjInfos = new Map();
  const filename = 'de/hunspell/spelling.txt';
  const spellingWords = new CachingWordListLoader().loadWords(filename);
  for (const line of spellingWords) {
    // '/A' adds the typical adjective endings, so assume it's an adjective:
    if (line.endsWith('/PA') || line.endsWith('/AP')) {
      throw new RuntimeException(`Use '/P' or '/A', but not both for a word in ${filename}: ${line}`);
    } if (line.endsWith('/P')) {
      const word = SLASH_ANY.matcher(line).replaceFirst('');
      fillAdjInfos(word, '', toPA2(AdjectiveTags.tagsForAdj), adjInfos);
      fillAdjInfos(word, 'e', toPA2(AdjectiveTags.tagsForAdjE), adjInfos);
      fillAdjInfos(word, 'en', toPA2(AdjectiveTags.tagsForAdjEn), adjInfos);
      fillAdjInfos(word, 'er', toPA2(AdjectiveTags.tagsForAdjEr), adjInfos);
      fillAdjInfos(word, 'em', toPA2(AdjectiveTags.tagsForAdjEm), adjInfos);
      fillAdjInfos(word, 'es', toPA2(AdjectiveTags.tagsForAdjEs), adjInfos);
    } else if (line.endsWith('/A')
        && !line.endsWith('ste/A') // don't tag e.g. "fünftjünste/A", would miss the comparative tagging
        && !line.endsWith('er/A')) { // don't tag e.g. "margenstärker/A", would miss the comparative tagging
      const word = SLASH_ANY.matcher(line).replaceFirst('');
      fillAdjInfos(word, '', AdjectiveTags.tagsForAdj, adjInfos);
      fillAdjInfos(word, 'e', AdjectiveTags.tagsForAdjE, adjInfos);
      fillAdjInfos(word, 'en', AdjectiveTags.tagsForAdjEn, adjInfos);
      fillAdjInfos(word, 'er', AdjectiveTags.tagsForAdjEr, adjInfos);
      fillAdjInfos(word, 'em', AdjectiveTags.tagsForAdjEm, adjInfos);
      fillAdjInfos(word, 'es', AdjectiveTags.tagsForAdjEs, adjInfos);
    } else if (line.includes('_') && !line.endsWith('_in')) {
      const parts = javaSplit(javaTrim(javaReplace(line, '#.*', '')), '_'); // literal replace: a no-op, as in Java
      if (parts.length < 2) throw new ArrayIndexOutOfBoundsException(`Index 1 out of bounds for length ${parts.length}`);
      const prefix = parts[0];
      const verbBaseform = parts[1];
      const forms = GermanSynthesizer.INSTANCE.synthesizeForPosTags(verbBaseform, (s) => s.startsWith('VER:'));
      for (const form of forms) {
        if (!form.includes('ß')) { // skip these, it's too risky to introduce old spellings like "gewußt" from the synthesizer
          verbInfos.set(prefix + form, new PrefixInfixVerb(prefix, '', verbBaseform));
        }
      }
      verbInfos.set(`${prefix}zu${verbBaseform}`, new PrefixInfixVerb(prefix, 'zu', verbBaseform)); // "zu<verb>" is not part of forms from synthesizer
      nominalizedVerbInfos.set(uppercaseFirstChar(prefix) + verbBaseform,
        new NominalizedVerb(uppercaseFirstChar(prefix), verbBaseform));
      nominalizedGenVerbInfos.set(`${uppercaseFirstChar(prefix) + verbBaseform}s`,
        new NominalizedVerb(uppercaseFirstChar(prefix), verbBaseform));
    }
  }
  return new ExpansionInfos(verbInfos, nominalizedVerbInfos, nominalizedGenVerbInfos, adjInfos);
}

// Java: GermanTagger#toPA2(List)
function toPA2(tags) {
  return tags.map((k) => javaReplace(k, 'ADJ:', 'PA2:')).map((k) => `${k}:VER`);
}

// Java: GermanTagger#fillAdjInfos(String,String,List,Map)
function fillAdjInfos(word, suffix, tagsForForm, adjInfos) {
  const l = [];
  const fullform = word + suffix;
  for (const tag of tagsForForm) {
    l.push(new AdjInfo(word, fullform, tag));
  }
  adjInfos.set(fullform, l);
}

// Java: GermanTagger
export class GermanTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.de.GermanTagger';

  // Java: GermanTagger#INSTANCE
  static get INSTANCE() {
    return sharedComponent(GermanTagger.FQCN);
  }

  // Java: GermanTagger#GermanTagger()
  constructor() {
    super('/de/german.dict', Locale.GERMAN);
    const wt = this.getWordTagger();
    if (!(wt instanceof CombiningTagger)) throw new ClassCastException(`class ${wt.constructor.FQCN} cannot be cast to class org.languagetool.tagging.CombiningTagger`);
    this.removalTagger = wt.getRemovalTagger();
  }

  // Java: GermanTagger#addStem(List,String)
  addStem(analyzedWordResults, stem) {
    const result = [];
    for (const tw of analyzedWordResults) {
      let lemma = tw.getLemma();
      if (stem.length > 0 && stem.charAt(stem.length - 1) !== '-' && tw.getPosTag().startsWith('SUB')) {
        lemma = lc(lemma);
      }
      result.push(new TaggedWord(stem + lemma, tw.getPosTag()));
    }
    return result;
  }

  // Java: GermanTagger#sanitizeWord(String) (removes the irrelevant part of dash-linked words: SSL-Zertifikat -> Zertifikat)
  sanitizeWord(word) {
    let result = word;
    // Skip words ending in a dash as they'll be misrecognized
    if (!word.endsWith('-')) {
      const splitWord = javaSplit(word, '-');
      let lastPart = splitWord.length > 1 && !(javaTrim(splitWord[splitWord.length - 1]) === '') ? splitWord[splitWord.length - 1] : word;
      // Find only the actual important part of the word
      const compoundedWord = GermanCompoundTokenizer.getStrictInstance().tokenize(lastPart);
      if (compoundedWord.length > 1 && startsWithUppercase(word)) { // don't uppercase last part of e.g. "vanillig-karamelligen"
        lastPart = uppercaseFirstChar(compoundedWord[compoundedWord.length - 1]);
      } else {
        lastPart = compoundedWord[compoundedWord.length - 1];
      }
      // Only give result if the last part is either a noun or an adjective (or adjective written in Uppercase)
      const tagged = this.tag(lastPart);
      if (tagged.length > 0 && (startsWithAny(tagged[0].getPosTag(), 'SUB', 'ADJ') || this.matchesUppercaseAdjective(lastPart))) {
        result = lastPart;
      }
    }
    return result;
  }

  // Java: GermanTagger#lookup(String) (first reading or null)
  lookup(word) {
    const result = this.tagTokens([word], false);
    const atr = result[0];
    if (atr.getAnalyzedToken(0).getPOSTag() === null) {
      return null;
    }
    return atr;
  }

  // Java: GermanTagger#tag(String) / tag(List) / tag(List,boolean); the overload is chosen by the argument type
  tag(wordOrTokens, ignoreCase = true) {
    if (typeof wordOrTokens === 'string') {
      return this.getWordTagger().tag(wordOrTokens);
    }
    return this.tagTokens(wordOrTokens, ignoreCase);
  }

  // Java: GermanTagger#matchesUppercaseAdjective(String)
  matchesUppercaseAdjective(unknownUppercaseToken) {
    const temp = this.getWordTagger().tag(lowercaseFirstChar(unknownUppercaseToken));
    return temp.length > 0 && temp[0].getPosTag().startsWith('ADJ');
  }

  // Java: GermanTagger#tag(List,boolean)
  tagTokens(sentenceTokens, ignoreCase) {
    let firstWord = true;
    const tokenReadings = [];
    let pos = 0;
    let idxPos = 0;

    let prevWord = null;
    for (let word of sentenceTokens) {
      let readings = [];
      let taggerTokens = null;
      // Gender star etc:
      if (idxPos + 2 < sentenceTokens.length && genderGapChars.matcher(sentenceTokens[idxPos + 1]).matches()) {
        if (afterAsterisk.matcher(sentenceTokens[idxPos + 2]).matches()) { // "jede*r", "sein*e"
          taggerTokens = [];
          taggerTokens.push(...this.getWordTagger().tag(word));
          taggerTokens.push(...this.getWordTagger().tag(word + sentenceTokens[idxPos + 2]));
        } else if (innenPattern1.matcher(sentenceTokens[idxPos + 2]).matches()) {
          // e.g. Werkstudent:innen-Zielgruppe -> take tags of 'Zielgruppe':
          const lastPart = anythingDash.matcher(sentenceTokens[idxPos + 2]).replaceFirst('');
          taggerTokens = [...this.getWordTagger().tag(lastPart)];
        } else if (innenPattern2.matcher(sentenceTokens[idxPos + 2]).matches()) {
          // e.g. Werkstudent:innenzielgruppe -> take tags of 'Zielgruppe':
          const idx = sentenceTokens[idxPos + 2].lastIndexOf('innen');
          const lastPart = uppercaseFirstChar(sentenceTokens[idxPos + 2].substring(idx + 'innen'.length));
          taggerTokens = [...this.getWordTagger().tag(lastPart)];
        }
      }
      if (taggerTokens === null) {
        taggerTokens = this.getWordTagger().tag(word);
      }

      // Only first iteration. Consider ":" as a potential sentence start marker
      if ((firstWord || prevWord === ':') && taggerTokens.length === 0 && ignoreCase) { // e.g. "Das" -> "das" at start of sentence
        taggerTokens = this.getWordTagger().tag(lc(word));
        firstWord = !isAlphanumeric(word);
      } else if (pos === 0 && ignoreCase) { // "Haben", "Sollen", "Können", "Gerade" etc. at start of sentence
        taggerTokens.push(...this.getWordTagger().tag(lc(word)));
      } else if (pos > 1 && taggerTokens.length === 0 && ignoreCase) {
        const idx = indexOf(sentenceTokens, word);
        // add lowercase token readings to words at start of direct speech
        if (idx > 2 && sentenceTokens[idx - 1] === '„' && sentenceTokens[idx - 3] === ':') {
          taggerTokens.push(...this.getWordTagger().tag(lc(word)));
        }
      }

      if (taggerTokens.length > 0) { // Word known, just add analyzed token to readings
        readings.push(...this.getAnalyzedTokens(taggerTokens, word));
        // for non separable verbs with prefix and verbs without prefix: VER:IMP:SIN:SFT <-> VER:1:SIN:PRÄ:SFT ('NON' excluded)
        if (!startsWithAny(lc(word), ...prefixesSeparableVerbs)
          && (!startsWithAny(lc(word), ...notAVerb))
          && isCapitalizedOrLower(word)) {
          let lstPrt = '';
          let frstPrt = '';
          if (startsWithAny(lc(word), ...prefixesNonSeparableVerbs)) {
            lstPrt = removePattern(lc(word), prefixesNonSeparableVerbsRegexp);
            frstPrt = removeEnd(word, lstPrt);
          } else {
            lstPrt = word;
            frstPrt = '';
          }
          const verbs = this.getWordTagger().tag(lstPrt);
          for (const v of verbs) {
            if ((indexOf(sentenceTokens, word) === 0 || isLowerFirst(word))
              && !equalsAny(lstPrt, 'gar', 'mal', 'null', 'trotz')) {
              if (startsWithAny(v.getPosTag(), 'VER:IMP:SIN:SFT') && (!readingsToString(readings).includes('VER:1:SIN:PRÄ:SFT'))) {
                readings.push(new AnalyzedToken(word, 'VER:1:SIN:PRÄ:SFT', lc(frstPrt) + v.getLemma()));
              }
              if (startsWithAny(v.getPosTag(), 'VER:1:SIN:PRÄ:SFT') && (!readingsToString(readings).includes('VER:IMP:SIN:SFT'))) {
                readings.push(new AnalyzedToken(word, 'VER:IMP:SIN:SFT', lc(frstPrt) + v.getLemma()));
              }
            }
          }
        }
      } else { // Word not known, try to decompose it and use the last part for POS tagging:
        const verbInfo = expansionInfos().verbInfos.get(word) ?? null;
        const nomVerbInfo = expansionInfos().nominalizedVerbInfos.get(word) ?? null;
        const nomGenVerbInfo = expansionInfos().nominalizedGenVerbInfos.get(word) ?? null;
        const adjInfos = expansionInfos().adjInfos.get(word) ?? null;
        const addNounTags = !nounTagExpansionExceptions.includes(word);
        if (verbInfo !== null) { // e.g. "herumgeben" with "herum_geben" in spelling.txt
          if (startsWithLowercase(verbInfo.prefix)) {
            const noPrefixForm = substring(word, verbInfo.prefix.length + verbInfo.infix.length); // infix can be "zu"
            const tags = this.tag(noPrefixForm);
            let isSFT = false; // SFT = schwaches Verb
            for (const tag of tags) {
              if (tag.getPosTag() !== null && (startsWithAny(tag.getPosTag(), 'VER:', 'PA1:', 'PA2:')
                && (!startsWithAny(tag.getPosTag(), 'VER:MOD', 'VER:AUX')))) { // e.g. "schicke" is verb and adjective
                const flektion = tag.getPosTag().substring(tag.getPosTag().length - 3);
                if (startsWithAny(verbInfo.prefix, ...prefixesSeparableVerbs)
                  && (!containsAny(word, ...notAVerb))) {
                  if (startsWithAny(tag.getPosTag(), 'VER:1', 'VER:2', 'VER:3') && (indexOf(sentenceTokens, word) === 0 || isLowerFirst(word))) {
                    readings.push(new AnalyzedToken(word, `${tag.getPosTag()}:NEB`, verbInfo.prefix + tag.getLemma()));
                  } else if (!startsWithAny(tag.getPosTag(), 'VER:IMP')) {
                    readings.push(new AnalyzedToken(word, tag.getPosTag(), verbInfo.prefix + tag.getLemma()));
                  } else if (startsWithAny(tag.getPosTag(), 'VER:IMP:SIN')) { // Java: && !readings.contains("VER:1:SIN:PRÄ") (List<AnalyzedToken> never contains a String)
                    if (flektion === 'SFT' || !DOT_I_PLUS.matcher(word).matches()) { // Avoids 'aufnimm'
                      readings.push(new AnalyzedToken(word, `VER:1:SIN:PRÄ:${flektion}:NEB`, verbInfo.prefix + tag.getLemma()));
                    }
                  }
                } else if (startsWithAny(verbInfo.prefix, ...prefixesNonSeparableVerbs) // Excludes "ge" (both too rare as verb prefix and prone to FP)
                  && (!containsAny(word, ...notAVerb))) {
                  // Java: !readings.contains("VER:1:SIN:PRÄ") / !readings.contains("VER:IMP:SIN") are always true
                  if (startsWithAny(tag.getPosTag(), 'VER:IMP:SIN') || startsWithAny(tag.getPosTag(), 'VER:1:SIN:PRÄ')) {
                    if (flektion === 'SFT' || !DOT_I_PLUS.matcher(word).matches()) { // Avoids 'zernimm'
                      readings.push(new AnalyzedToken(word, `VER:IMP:SIN${flektion}`, verbInfo.prefix + tag.getLemma())); // Java: no ':' before flektion
                      readings.push(new AnalyzedToken(word, `VER:1:SIN:PRÄ:${flektion}`, verbInfo.prefix + tag.getLemma()));
                    }
                  } else {
                    readings.push(new AnalyzedToken(word, tag.getPosTag(), verbInfo.prefix + tag.getLemma()));
                  }
                }
                if (tag.getPosTag().includes(':SFT')) {
                  isSFT = true;
                }
              }
            }
            if (verbInfo.infix === 'zu') {
              readings = [];
              readings.push(new AnalyzedToken(word, `VER:EIZ:${isSFT ? 'SFT' : 'NON'}`, verbInfo.prefix + verbInfo.verbBaseform));
            }
          }
        } else if (nomVerbInfo !== null && addNounTags) {
          // e.g. "herum_geben" in spelling.txt -> "(das) Herumgeben"
          readings.push(new AnalyzedToken(word, 'SUB:NOM:SIN:NEU:INF', nomVerbInfo.prefix + nomVerbInfo.verbBaseform));
          readings.push(new AnalyzedToken(word, 'SUB:AKK:SIN:NEU:INF', nomVerbInfo.prefix + nomVerbInfo.verbBaseform));
          readings.push(new AnalyzedToken(word, 'SUB:DAT:SIN:NEU:INF', nomVerbInfo.prefix + nomVerbInfo.verbBaseform));
        } else if (nomGenVerbInfo !== null && addNounTags) {
          // e.g. "herum_geben" in spelling.txt -> "(des) Herumgebens"
          readings.push(new AnalyzedToken(word, 'SUB:GEN:SIN:NEU:INF', nomGenVerbInfo.prefix + nomGenVerbInfo.verbBaseform));
        } else if (adjInfos !== null) {
          for (const adjInfo of adjInfos) {
            readings.push(new AnalyzedToken(adjInfo.fullForm, adjInfo.tag, adjInfo.baseform));
          }
        } else if (this.isWeiseException(word)) { // "idealerweise" etc. but not "überweise", "eimerweise"
          for (const tag of tagsForWeise) {
            readings.push(new AnalyzedToken(word, tag, word));
          }
        } else if (!isAllBlank(word) && mitarbeitendenPattern.matcher(word).matches()) {
          const idx = word.indexOf('mitarbeitende');
          const firstPart = word.substring(0, idx); // we might tag invalid words, but that should be okay
          const lastPart = word.substring(idx);
          const mitarbeitendeTags = this.getWordTagger().tag(uppercaseFirstChar(lastPart));
          for (const mitarbeitendeTag of mitarbeitendeTags) {
            readings.push(new AnalyzedToken(word, mitarbeitendeTag.getPosTag(), `${firstPart}mitarbeitende`));
          }
        } else if (!isAllBlank(word)) {
          const compoundParts = GermanCompoundTokenizer.getStrictInstance().tokenize(word);
          if (compoundParts.length <= 1) { // Could not find simple compound parts
            // Recognize alternative imperative forms (e.g., "Geh bitte!" in addition to "Gehe bitte!")
            const imperativeFormList = this.getImperativeForm(word, sentenceTokens, pos);
            const substantivatedFormsList = this.getSubstantivatedForms(word, sentenceTokens);
            if (imperativeFormList.length > 0) {
              readings.push(...imperativeFormList);
            } else if (substantivatedFormsList.length > 0) {
              readings.push(...substantivatedFormsList);
            } else {
              if (startsWithAny(word, 'bitter', 'dunkel', 'erz', 'extra', 'früh',
                'gemein', 'hyper', 'lau', 'mega', 'minder', 'stock', 'super', 'tod', 'ultra', 'un', 'ur')) {
                const lastPart = removePattern(word, BITTER_ETC);
                if (lastPart.length > 3) {
                  const firstPart = removeEnd(word, lastPart);
                  const taggedWords = this.getWordTagger().tag(lastPart);
                  for (const taggedWord of taggedWords) {
                    if (!(firstPart.length === 2 && taggedWord.getPosTag().startsWith('VER'))) {
                      readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), firstPart + taggedWord.getLemma()));
                    }
                  }
                }
              }
              // Separate dash-linked words
              // Only check single word tokens and skip words containing numbers because it's unpredictable
              if (splitByChar(word, ' ').length === 1 && !isDigit(word.charCodeAt(0))) {
                const wordOrig = word;
                word = this.sanitizeWord(word);
                const wordStem = wordOrig.substring(0, wordOrig.length - word.length);

                // Tokenize, start word uppercase if it's a result of splitting
                const compoundedWord = GermanCompoundTokenizer.getStrictInstance().tokenize(word);
                if (compoundedWord.length > 1) {
                  word = uppercaseFirstChar(compoundedWord[compoundedWord.length - 1]);
                } else {
                  word = compoundedWord[compoundedWord.length - 1];
                }

                let linkedTaggerTokens = this.addStem(this.getWordTagger().tag(word), wordStem); // Try to analyze the last part found

                // Some words that are linked with a dash ('-') will be written in uppercase, even adjectives
                if (wordOrig.includes('-') && linkedTaggerTokens.length === 0 && this.matchesUppercaseAdjective(word)) {
                  word = lowercaseFirstChar(word);
                  linkedTaggerTokens = this.getWordTagger().tag(word);
                }

                word = wordOrig;

                const wordStartsUppercase = startsWithUppercase(word);
                if (linkedTaggerTokens.length === 0) {
                  // separable prefix verbs: 'einlädst' [VER:2:SIN:PRÄ:NON:NEB] vs. 'lädst ein' [VER:2:SIN:PRÄ:NON] + [ZUS]
                  if (startsWithAny(lc(word), ...prefixesVerbs)
                     && (!containsAny(lc(word), ...notAVerb))
                     && isCapitalizedOrLower(word)) { // avoids CamelCase, ALLCAPS...
                    const lastPart = removePattern(lc(word), prefixesVerbsRegexp);
                    if (lastPart.length > 2) { // e. g. 'kau', 'iss', 'ess'
                      this.tagPrefixedVerb(word, lastPart, sentenceTokens, readings);
                    }
                  } else {
                    readings.push(this.getNoInfoToken(word));
                  }
                } else {
                  if (wordStartsUppercase) { // Choose between uppercase/lowercase Lemma
                    readings.push(...this.getAnalyzedTokens(linkedTaggerTokens, word));
                  } else {
                    readings.push(...this.getAnalyzedTokensForParts(linkedTaggerTokens, word, compoundedWord));
                  }
                }
              } else {
                readings.push(this.getNoInfoToken(word));
              }
            }
          } else if (!(idxPos + 2 < sentenceTokens.length && sentenceTokens[idxPos + 1] === '.' && DOMAINS.matcher(sentenceTokens[idxPos + 2]).matches())) { // TODO: find better way to ignore domains
            // last part governs a word's POS:
            let lastPart = compoundParts[compoundParts.length - 1];
            if (startsWithUppercase(word) && !containsAny(lastPart, 'freie', 'freier', 'freien', 'freies', 'freiem')) {
              lastPart = uppercaseFirstChar(lastPart);
            }
            const partTaggerTokens = this.getWordTagger().tag(lastPart);
            if (partTaggerTokens.length === 0) {
              readings.push(this.getNoInfoToken(word));
            } else {
              let temp = this.getAnalyzedTokensForParts(partTaggerTokens, word, compoundParts);
              const firstPart = compoundParts[0];
              if (PRFXS.includes(firstPart)) {
                for (const tag of partTaggerTokens) {
                  if (startsWithAny(tag.getPosTag(), 'VER:1', 'VER:2', 'VER:3') && (indexOf(sentenceTokens, word) === 0 || isLowerFirst(word))) {
                    if (endsWith(tag.getPosTag(), 'NEB')) {
                      readings.push(new AnalyzedToken(word, tag.getPosTag(), firstPart + tag.getLemma()));
                    } else {
                      readings.push(new AnalyzedToken(word, `${tag.getPosTag()}:NEB`, firstPart + tag.getLemma()));
                    }
                  } else if (!startsWithAny(tag.getPosTag(), 'VER:IMP')) {
                    readings.push(new AnalyzedToken(word, tag.getPosTag(), firstPart + tag.getLemma()));
                  }
                }
              } else {
                temp = temp.filter((k) => !k.getPOSTag().includes('VER'));
                readings.push(...temp);
              }
            }
          }
        }
        if (readings.length === 0) {
          readings.push(this.getNoInfoToken(word));
        }
      }
      tokenReadings.push(new AnalyzedTokenReadings(readings, pos));
      pos += word.length;
      prevWord = word;
      idxPos++;
    }
    return tokenReadings;
  }

  // Java: GermanTagger#tag(List,boolean) block for unknown words starting with a verb prefix (inlined in Java)
  tagPrefixedVerb(word, lastPart, sentenceTokens, readings) {
    const firstPart = removeEnd(word, lastPart);
    // Erweiterter Infinitiv mit zu
    if (startsWithAny(lastPart, 'zu')) {
      const infinitiv = removeStart(lastPart, 'zu');
      const infs = this.getWordTagger().tag(infinitiv);
      for (const inf of infs) {
        if (inf.getPosTag().startsWith('VER:INF')) {
          const pstg = replaceFirst(inf.getPosTag(), 'INF', 'EIZ');
          readings.push(new AnalyzedToken(word, pstg, firstPart + inf.getLemma()));
        }
      }
    }
    // Checks for postag information in the last part of given word
    const taggedWords = this.getWordTagger().tag(lastPart);
    for (const taggedWord of taggedWords) {
      if ((taggedWord.getPosTag().startsWith('VER') && (!taggedWord.getPosTag().startsWith('VER:PA')))
        && (!taggedWord.getPosTag().startsWith('VER:AUX'))
        && (!taggedWord.getPosTag().startsWith('VER:MOD'))
        && (!(firstPart === 'un'))) { // avoids 'unbeeindruckt' -> VER.*
        if (taggedWord.getPosTag().startsWith('VER:INF')) {
          if (word === uc(substring(word, 0, 1)) + substring(word, 1)) {
            readings.push(new AnalyzedToken(word, 'SUB:NOM:SIN:NEU:INF', word));
            readings.push(new AnalyzedToken(word, 'SUB:DAT:SIN:NEU:INF', word));
            readings.push(new AnalyzedToken(word, 'SUB:AKK:SIN:NEU:INF', word));
            if (indexOf(sentenceTokens, word) === 0) {
              readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
            }
          } else {
            readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
          }
        } else if (taggedWord.getPosTag().startsWith('VER:IMP')) {
          const flekt = taggedWord.getPosTag().substring(taggedWord.getPosTag().length - 3);
          if ((word === lc(word) || indexOf(sentenceTokens, word) === 0)) {
            if (!equalsAny(lc(firstPart), ...prefixesSeparableVerbs)) { // Separable verbs do not have imperative form.
              readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
              // Java: !readings.contains("VER:1:SIN:PRÄ") and !readings.contains("VER:IMP:SIN:NON") are always true
              if (taggedWord.getPosTag().startsWith('VER:IMP:SIN')) {
                readings.push(new AnalyzedToken(word, `VER:1:SIN:PRÄ:${flekt}`, firstPart + taggedWord.getLemma()));
              }
            } else if (flekt === 'SFT' || !DOT_I_PLUS.matcher(word).matches()) { // Java: && !readings.contains("VER:1:SIN:PRÄ") (always true)
              readings.push(new AnalyzedToken(word, `VER:1:SIN:PRÄ:${flekt}:NEB`, firstPart + taggedWord.getLemma()));
            }
          }
        } else if (equalsAny(lc(firstPart), ...prefixesSeparableVerbs)
          && (word === lc(word) || indexOf(sentenceTokens, word) === 0)) {
          if (taggedWord.getPosTag().endsWith(':NEB')) {
            readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
          } else {
            readings.push(new AnalyzedToken(word, `${taggedWord.getPosTag()}:NEB`, lc(firstPart) + taggedWord.getLemma()));
          }
          if (taggedWord.getPosTag().startsWith('VER:3:SIN:PRÄ')
            && (firstPart === 'durch' || firstPart === 'um')) {
            // 'durch'/'um' verbs can be separable and non separable ('Tom läuft durch den Wald', 'Tom durchläuft eine Durststrecke')
            if (taggedWord.getPosTag().startsWith('VER:3:SIN:PRÄ')) {
              readings.push(new AnalyzedToken(word, 'VER:PA2:SFT', firstPart + taggedWord.getLemma()));
            } else {
              readings.push(new AnalyzedToken(word, 'VER:PA2:NON', firstPart + taggedWord.getLemma()));
            }
            readings.push(new AnalyzedToken(word, 'PA2:PRD:GRU:VER', word));
          }
        } else if (equalsAny(lc(firstPart), ...prefixesNonSeparableVerbs)
          && (word === lc(word) || indexOf(sentenceTokens, word) === 0)) {
          readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
          // derives 'VER:PA2:SFT' and 'PA2:PRD:GRU:VER' if the postag of 'lastPart' is 'VER:3:SIN:PRÄ:SFT' (erstickt = er + stickt)
          if (taggedWord.getPosTag().startsWith('VER:3:SIN:PRÄ:SFT')
            || (taggedWord.getPosTag().startsWith('VER:1:PLU:PRÄ:NON') && (containsAny(taggedWord.getLemma(), ...partizip2contains1PluPra)))
            || (taggedWord.getPosTag().startsWith('VER:1:PLU:PRT:NON') && (containsAny(taggedWord.getLemma(), ...partizip2contains1PluPrt)))) {
            if (!(firstPart === 'un')) { // Avoids 'unbeeindruckt' -> 'VER.*'
              const fl = taggedWord.getPosTag().substring(taggedWord.getPosTag().length - 3);
              readings.push(new AnalyzedToken(word, `VER:PA2:${fl}`, firstPart + taggedWord.getLemma()));
            }
            readings.push(new AnalyzedToken(word, 'PA2:PRD:GRU:VER', word));
          }
        }
      } else if (((taggedWord.getPosTag().startsWith('PA') || taggedWord.getPosTag().startsWith('VER:PA'))
        && (word === lc(word) || indexOf(sentenceTokens, word) === 0))) {
        if (!(firstPart === 'un' && taggedWord.getPosTag().startsWith('VER:PA'))) {
          readings.push(new AnalyzedToken(word, taggedWord.getPosTag(), lc(firstPart) + taggedWord.getLemma()));
        }
      }
    }
    // derives 'PA2:[NGDA].*' if the word has suffix 'e[mnrs]?' and 'middlePart' is 'VER:3:SIN:PRÄ:SFT' (erstickter = er + stickt + er)
    const partizipSuffixes = ['e', 'em', 'en', 'er', 'es'];
    let middlePart = '';
    let suffix = '';
    for (const sffx of partizipSuffixes) {
      if (lastPart.endsWith(sffx)) {
        middlePart = lastPart.substring(0, lastPart.length - sffx.length);
        suffix = sffx;
      }
    }
    const taggedMiddle = this.getWordTagger().tag(middlePart);
    for (const taggedM of taggedMiddle) {
      if (taggedM.getPosTag().startsWith('VER:3:SIN:PRÄ:SFT')
        && (word === lc(word) || indexOf(sentenceTokens, word) === 0)) {
        const lemma = word.substring(0, word.length - suffix.length);
        let tags = null;
        switch (suffix) {
          case 'e': tags = postagsPartizipEndingE; break;
          case 'em': tags = postagsPartizipEndingEm; break;
          case 'en': tags = postagsPartizipEndingEn; break;
          case 'er': tags = postagsPartizipEndingEr; break;
          case 'es': tags = postagsPartizipEndingEs; break;
          default: break;
        }
        if (tags !== null) {
          for (const posEnd of tags) {
            readings.push(new AnalyzedToken(word, `PA2:${posEnd}`, lemma));
          }
        }
      }
    }
  }

  // Java: GermanTagger#prefixedVerbLastPart(String)
  prefixedVerbLastPart(word) {
    // "aufstöhnen" (auf+stöhnen) etc.
    for (const prefix of VerbPrefixes.get()) {
      if (word.startsWith(prefix)) {
        const tags = this.tag(javaReplaceFirst(word, `^${prefix}`, ''));
        if (tags.some((k) => k.getPosTag() !== null && k.getPosTag().startsWith('VER'))) {
          return word.substring(prefix.length);
        }
      }
    }
    return null;
  }

  // Java: GermanTagger#isWeiseException(String)
  isWeiseException(word) {
    if (word.endsWith('erweise')) { // "idealerweise" etc.
      const tags = this.tag(removeEnd(word, 'erweise'));
      return tags.some((k) => k.getPosTag() !== null && k.getPosTag().startsWith('ADJ'));
    }
    return false;
  }

  // Java: GermanTagger#getImperativeForm(String,List,int) (alternative imperative forms, e.g. "Geh bitte!")
  getImperativeForm(word, sentenceTokens, pos) {
    let idx = indexOf(sentenceTokens, word);
    let previousWord = '';
    while (--idx > -1) {
      previousWord = sentenceTokens[idx];
      if (!isWhitespace(previousWord)) {
        break;
      }
    }
    if (!(pos === 0 && sentenceTokens.length > 1)
        && !equalsAnyIgnoreCase(previousWord, 'ich', 'er', 'es', 'sie', 'bitte', 'aber', 'nun', 'jetzt', '„')) {
      return [];
    }
    const w = pos === 0 || previousWord === '„' ? lc(word) : word;
    const taggedWithE = this.getWordTagger().tag(`${w}e`);
    for (const tagged of taggedWithE) {
      if (tagged.getPosTag().startsWith('VER:IMP:SIN')) {
        // do not overwrite manually removed tags
        if (this.removalTagger === null || !this.removalTagger.tag(w).some((x) => x.equals(tagged))) {
          return this.getAnalyzedTokens([tagged], word);
        }
        break;
      }
    }
    return [];
  }

  // Java: GermanTagger#getSubstantivatedForms(String,List) (e.g. "Verletzter" -> SUB:NOM:SIN:MAS)
  getSubstantivatedForms(word, sentenceTokens) {
    if (word.endsWith('er')) {
      if (DDD_ER_PATTERN.matcher(word).matches()) {
        // e.g. "Den 2019er Wert hatten sie geschätzt"
        const list = [];
        for (const tag of allAdjGruTags) {
          list.push(new AnalyzedToken(word, tag, word));
        }
        return list;
      }
      const lowerCaseTags = this.getWordTagger().tag(lc(word));
      // do not add tag words whose lower case variant is an adverb (e.g, "Früher") to avoid false negatives for DE_CASE
      if (lowerCaseTags.some((t) => t.getPosTag().startsWith('ADV'))) {
        return [];
      }
      let idx = indexOf(sentenceTokens, word);
      // is followed by an uppercase word? If 'yes', the word is probably not substantivated
      while (++idx < sentenceTokens.length) {
        const nextWord = sentenceTokens[idx];
        if (isWhitespace(nextWord)) {
          continue;
        }
        if (nextWord.length > 0 && (isUpperCase(nextWord.charCodeAt(0)) || nextWord === 'als')) {
          return [];
        }
        break;
      }
      const femaleForm = word.substring(0, word.length - 1);
      const taggedFemaleForm = this.getWordTagger().tag(femaleForm);
      const isSubstantivatedForm = taggedFemaleForm.some((t) => t.getPosTag() === 'SUB:NOM:SIN:FEM:ADJ');
      if (isSubstantivatedForm) {
        const list = [];
        list.push(new AnalyzedToken(word, 'SUB:NOM:SIN:MAS:ADJ', word));
        list.push(new AnalyzedToken(word, 'SUB:GEN:PLU:MAS:ADJ', word));
        return list;
      }
    }
    return [];
  }

  // Java: GermanTagger#getNoInfoToken(String)
  getNoInfoToken(word) {
    return new AnalyzedToken(word, null, null);
  }

  // Java: GermanTagger#getAnalyzedTokens(List,String)
  getAnalyzedTokens(taggedWords, word) {
    const result = [];
    for (const taggedWord of taggedWords) {
      result.push(new AnalyzedToken(word, taggedWord.getPosTag(), taggedWord.getLemma()));
    }
    return result;
  }

  // Java: GermanTagger#getAnalyzedTokens(List,String,List)
  getAnalyzedTokensForParts(taggedWords, word, compoundParts) {
    const result = [];
    for (const taggedWord of taggedWords) {
      if (taggedWord.getPosTag() !== null && taggedWord.getPosTag().startsWith('VER:IMP')) {
        // ignore imperative, as otherwise e.g. "zehnfach" will be interpreted as a verb (zehn + fach)
        continue;
      }
      const allButLastPart = compoundParts.slice(0, compoundParts.length - 1);
      let lemma = '';
      let i = 0;
      for (const s of allButLastPart) {
        lemma += i === 0 ? s : lowercaseFirstChar(s);
        i++;
      }
      lemma += lowercaseFirstChar(taggedWord.getLemma());
      result.push(new AnalyzedToken(word, taggedWord.getPosTag(), lemma));
    }
    return result;
  }
}

registerComponent(GermanTagger.FQCN, () => new GermanTagger());
