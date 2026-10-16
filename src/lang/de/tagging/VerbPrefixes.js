// Java: org.languagetool.tagging.de.VerbPrefixes (list of German verb prefixes)
import { javaCompare } from '../../../lib/java/strings.js';

// Java: VerbPrefixes#prefixes
const prefixes = [
  'ab', 'an', 'auf', 'aus', 'auseinander', 'bei', 'ein', 'empor', 'entgegen', 'entlang', 'entzwei', 'fehl', 'fern',
  'fest', 'fort', 'gegenüber', 'heim', 'hinterher', 'hoch', 'los', 'mit', 'nach', 'neben', 'nieder', 'vor', 'weg',
  'weiter', 'zu', 'zurecht', 'zurück', 'zusammen', 'da', 'hin', 'her', 'herab', 'heran', 'herauf', 'heraus', 'herbei',
  'herein', 'hernieder', 'herüber', 'herum', 'herunter', 'hervor', 'herzu', 'hinab', 'hinan', 'hinauf', 'hinaus',
  'hinein', 'hinüber', 'hinunter', 'hinweg', 'hinzu', 'vorab', 'voran', 'vorauf', 'voraus', 'vorbei', 'vorweg',
  'vorher', 'vorüber', 'dabei', 'dafür', 'dagegen', 'daher', 'dahin', 'dahinter', 'daneben', 'daran', 'darauf',
  'darein', 'darüber', 'darunter', 'hinter', 'dran', 'drauf', 'drein', 'drüber', 'drunter', 'davon', 'davor', 'dazu',
  'dazwischen', 'durch', 'über', 'unter', 'um', 'wider', 'wieder', 'rüber', 'aneinander', 'ran', 'rauf', 'runter',
  'rein', 'umher', 'ent', 'frei', 'ver', 'zer', 'gegen',
];
// sort alphabetically and then longest first:
prefixes.sort(javaCompare);
prefixes.sort((k, v) => (v.length < k.length ? -1 : (v.length === k.length ? 0 : 1)));
Object.freeze(prefixes);

// Java: VerbPrefixes
export class VerbPrefixes {
  static FQCN = 'org.languagetool.tagging.de.VerbPrefixes';

  // Java: VerbPrefixes#get()
  static get() {
    return prefixes;
  }
}
