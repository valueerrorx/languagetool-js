// Java: org.languagetool.rules.es.SpanishWikipediaRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { getUrl } from '../../../core/Tools.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getClassBroker } from '../../../core/resources/LtStatics.js';

const FILE_NAME = '/es/wikipedia.txt';
const ES_LOCALE = new Locale('es'); // locale used on case-conversion

// Java: SpanishWikipediaRule
export class SpanishWikipediaRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.es.SpanishWikipediaRule';
  static WIKIPEDIA_COMMON_ERRORS = 'ES_WIKIPEDIA_COMMON_ERRORS';

  // Java: SpanishWikipediaRule#getFileNames()
  getFileNames() {
    return [FILE_NAME];
  }

  // Java: SpanishWikipediaRule(ResourceBundle)
  constructor(messages) {
    super(messages, getClassBroker().forName('org.languagetool.language.Spanish').getInstance());
    this.setCategory(Categories.WIKIPEDIA.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong('<marker>a basto</marker>'),
      Example.fixed('<marker>abasto</marker>'));
    this.setDefaultOff();
  }

  // Java: SpanishWikipediaRule#getId()
  getId() {
    return SpanishWikipediaRule.WIKIPEDIA_COMMON_ERRORS;
  }

  // Java: SpanishWikipediaRule#getDescription()
  getDescription() {
    return 'Errores frecuentes en los artículos de la Wikipedia';
  }

  // Java: SpanishWikipediaRule#getShort()
  getShort() {
    return 'Error gramatical u ortográfico';
  }

  // Java: SpanishWikipediaRule#getMessage()
  getMessage() {
    return "'$match' es una expresión errónea. Pruebe a utilizar $suggestions";
  }

  // Java: SpanishWikipediaRule#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ' o ';
  }

  // Java: SpanishWikipediaRule#getUrl()
  getUrl() {
    return getUrl('https://es.wikipedia.org/wiki/Wikipedia:Lista_de_errores_ortogr%C3%A1ficos_comunes/M%C3%A1quinas');
  }

  // Java: SpanishWikipediaRule#getLocale()
  getLocale() {
    return ES_LOCALE;
  }
}
