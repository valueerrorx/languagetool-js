// org.languagetool.rules.fr.MakeContractionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { AbstractMakeContractionsFilter } from '../../../core/rules/AbstractMakeContractionsFilter.js';

const FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;
const DE_LE = Pattern.compile('\\bde le\\b', FLAGS); // Java: MakeContractionsFilter#DE_LE
const A_LE = Pattern.compile('\\bà le\\b', FLAGS); // Java: MakeContractionsFilter#A_LE
const DE_LES = Pattern.compile('\\bde les\\b', FLAGS); // Java: MakeContractionsFilter#DE_LES
const A_LES = Pattern.compile('\\bà les\\b', FLAGS); // Java: MakeContractionsFilter#A_LES

// Java: MakeContractionsFilter
export class MakeContractionsFilter extends AbstractMakeContractionsFilter {
  static FQCN = 'org.languagetool.rules.fr.MakeContractionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.MakeContractionsFilter()' }];

  // Java: MakeContractionsFilter#fixContractions(String)
  fixContractions(suggestion) {
    let matcher = DE_LE.matcher(suggestion);
    suggestion = matcher.replaceAll('du');
    matcher = A_LE.matcher(suggestion);
    suggestion = matcher.replaceAll('au');
    matcher = DE_LES.matcher(suggestion);
    suggestion = matcher.replaceAll('des');
    matcher = A_LES.matcher(suggestion);
    suggestion = matcher.replaceAll('aux');
    return suggestion;
  }
}

registerClass(MakeContractionsFilter.FQCN, MakeContractionsFilter);
