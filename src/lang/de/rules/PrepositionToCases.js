// org.languagetool.rules.de.PrepositionToCases (tuned for AgreementSuggestor, be careful when using it for other use cases)
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';

// Java: PrepositionToCases.Case
export class Case extends JavaEnum {
  static FQCN = 'org.languagetool.rules.de.PrepositionToCases.Case';
}
export const Nom = new Case('Nom', 0);
export const Akk = new Case('Akk', 1);
export const Gen = new Case('Gen', 2);
export const Dat = new Case('Dat', 3);

const prep2Cases = new Map(); // Java: PrepositionToCases#prep2Cases (HashMap, only get is used)

// Java: PrepositionToCases#add(String,Case...)
function add(prep, ...cases) {
  prep2Cases.set(prep, cases);
}

// sources: http://deutsche-rechtschreibung.org/woerterbuecher/rektion-praepositionen.php,
//  https://deutschegrammatik20.de/spezielle-verben/verben-mit-praeposition/verb-mit-praeposition-kasus/
add('ab', Dat);
add('abseits', Gen);
add('abzüglich', Gen);
add('an', Dat, Akk);
add('angesichts', Gen);
add('anhand', Gen);
add('anlässlich', Gen);
add('anstatt', Gen);
add('anstelle', Gen);
add('auf', Dat, Akk);
add('aufgrund', Gen);
add('aus', Dat);
add('ausgangs', Gen);
add('ausgenommen', Akk);
add('ausschließlich', Gen);
add('ausweislich', Gen);
add('außer', Dat);
add('außerhalb', Gen);
add('bar', Gen);
add('behufs', Gen);
add('bei', Dat);
add('beidseits', Gen);
add('betreffend', Akk);
add('betreffs', Gen);
add('bezüglich', Gen);
add('binnen', Dat);
add('bis', Akk);
add('bis auf', Akk);
add('dank', Dat, Gen);
add('diesseits', Gen);
add('durch', Akk);
add('eingangs', Gen);
add('eingedenk', Gen);
add('einschließlich', Gen);
add('entgegen', Dat);
add('entlang', Dat, Akk, Gen);
add('entsprechend', Dat);
add('exklusive', Gen);
add('fern', Dat);
add('fernab', Gen);
add('für', Akk);
add('gegen', Akk);
add('gegenüber', Dat);
add('gemäß', Dat);
add('getreu', Dat);
add('halber', Gen);
add('hinsichtlich', Gen);
add('hinter', Dat, Akk);
//add('in', Dat, Akk);  // "und in das Sauerstoff nur ..."
add('in puncto', Gen);
add('infolge', Gen);
add('inklusive', Gen);
add('inmitten', Gen);
add('innerhalb', Gen);
add('innert', Gen);
add('je', Akk);
add('jenseits', Gen);
add('kontra', Akk);
add('kraft', Gen);
add('laut', Gen, Dat);
add('längs', Gen);
add('längsseits', Gen);
add('mangels', Gen);
add('mit', Dat);
add('mitsamt', Dat);
add('mittels', Gen);
add('nach', Dat);
add('namens', Gen);
add('neben', Dat, Akk);
add('nebst', Dat);
add('nächst', Dat);
//add('ob', Gen);   // "ob das Touristen überhaupt betrifft"
add('oberhalb', Gen);
add('ohne', Akk);
add('per', Akk);
add('pro', Akk);
add('rücksichtlich', Gen);
add('samt', Dat);
add('seit', Dat);
add('seitens', Gen);
add('seitlich', Gen);
add('statt', Gen);
add('trotz', Gen);
add('um', Akk);
add('unbeschadet', Gen);
add('uneingedenk', Gen);
add('ungeachtet', Gen);
add('unter', Dat, Akk);
add('unterhalb', Gen);
add('unweit', Gen);
add('vermittels', Gen);
add('vermittelst', Gen);
add('vermöge', Gen);
add('versus', Akk);
add('via', Akk);
add('vis-à-vis', Dat);
add('von', Dat);
add('vor', Dat, Akk);
add('vorbehaltlich', Gen);
add('wegen', Gen);
add('weitab', Gen);
add('wider', Akk);
add('während', Gen);
add('zeit', Gen);
add('zu', Dat);
add('zufolge', Dat);
add('zugunsten', Gen);
add('zuliebe', Dat);
add('zuungunsten', Gen);
add('zuwider', Dat);
add('zuzüglich', Gen);
add('zwecks', Gen);
add('zwischen', Dat, Akk);
add('à', Akk);
add('über', Dat, Akk);

// Java: PrepositionToCases#getCasesFor(String)
export function getCasesFor(prep) {
  if (prep === null || prep === undefined) throw new NullPointerException('Cannot invoke "String.toLowerCase()" because "prep" is null');
  const key = toLowerCase(prep);
  return prep2Cases.has(key) ? prep2Cases.get(key) : [];
}

export const PrepositionToCases = { Case, getCasesFor };
