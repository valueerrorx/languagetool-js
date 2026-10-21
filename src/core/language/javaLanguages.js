// Interim guard (docs/PLAN.md F39 note): language codes of Java modules that are not ported yet fail as notPorted instead of "unknown language"
import { Languages } from '../Languages.js';
import { notPortedYet } from './components.js';

const JAVA_LANGUAGE_BASES = new Set('ar ast be br ca crh da de el en eo es fa fr ga gl is it ja km lt ml nl pl pt ro ru sk sl sr sv ta tl uk zh'.split(' '));

// true if the code belongs to a Java language module that the port does not provide
export function isUnportedJavaLanguage(code) {
  if (typeof code !== 'string' || !JAVA_LANGUAGE_BASES.has(code.split('-')[0])) return false;
  if (Languages.isLanguageSupported(code)) return false;
  try {
    Languages.getLanguageForShortCode(code); // long codes such as fr-FR resolve through the long code mapping (LibreOffice)
    return false;
  } catch (e) {
    return true;
  }
}

// Java: Languages#getLanguageForShortCode(String); notPorted for Java languages that are missing in the port
export function getLanguageForShortCodeGuarded(code) {
  if (isUnportedJavaLanguage(code)) throw notPortedYet(`language ${code}`);
  return Languages.getLanguageForShortCode(code);
}

// Java: Languages#isLanguageSupported(String); notPorted for Java languages that are missing in the port
export function isLanguageSupportedGuarded(code) {
  if (isUnportedJavaLanguage(code)) throw notPortedYet(`language ${code}`);
  return Languages.isLanguageSupported(code);
}
