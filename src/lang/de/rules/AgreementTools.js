// org.languagetool.rules.de.AgreementTools
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { AnalyzedGermanToken } from '../tagging/AnalyzedGermanToken.js';
import { Determination, Genus } from '../tagging/GermanToken.js';
import { GrammarCategory } from './AgreementRule.js';

const { ALLGEMEIN, MASKULINUM, FEMININUM, NEUTRUM } = Genus;

// Java: AgreementTools#getAgreementCategories(AnalyzedTokenReadings,Set,boolean) (Return Kasus, Numerus, Genus of those forms with a determiner)
export function getAgreementCategories(aToken, omit, skipSol) {
  const set = new Set();
  const readings = aToken.getReadings();
  for (const tmpReading of readings) {
    if (skipSol && tmpReading.getPOSTag() !== null && tmpReading.getPOSTag().endsWith(':SOL')) {
      // SOL = alleinstehend - needs to be skipped so we find errors like "An der roter Ampel."
      continue;
    }
    const reading = new AnalyzedGermanToken(tmpReading);
    if (reading.getCasus() === null && reading.getNumerus() === null &&
      reading.getGenus() === null) {
      continue;
    }
    if (reading.getGenus() === ALLGEMEIN &&
      tmpReading.getPOSTag() !== null && !tmpReading.getPOSTag().endsWith(':STV') && // STV: stellvertretend (!= begleitend)
      !possessiveSpecialCase(aToken, tmpReading)) {
      // genus=ALG in the original data. Not sure if this is allowed, but expand this so
      // e.g. "Ich Arbeiter" doesn't get flagged as incorrect:
      if (reading.getDetermination() === null) {
        // Nouns don't have the determination property (definite/indefinite), and as we don't want to
        // introduce a special case for that, we just pretend they always fulfill both properties:
        set.add(makeString(reading.getCasus(), reading.getNumerus(), MASKULINUM, Determination.DEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), MASKULINUM, Determination.INDEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), FEMININUM, Determination.DEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), FEMININUM, Determination.INDEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), NEUTRUM, Determination.DEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), NEUTRUM, Determination.INDEFINITE, omit));
      } else {
        set.add(makeString(reading.getCasus(), reading.getNumerus(), MASKULINUM, reading.getDetermination(), omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), FEMININUM, reading.getDetermination(), omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), NEUTRUM, reading.getDetermination(), omit));
      }
    } else {
      if (reading.getDetermination() === null || 'jed' === tmpReading.getLemma() || 'manch' === tmpReading.getLemma()) { // "jeder" etc. needs a special case to avoid false alarm
        set.add(makeString(reading.getCasus(), reading.getNumerus(), reading.getGenus(), Determination.DEFINITE, omit));
        set.add(makeString(reading.getCasus(), reading.getNumerus(), reading.getGenus(), Determination.INDEFINITE, omit));
      } else {
        set.add(makeString(reading.getCasus(), reading.getNumerus(), reading.getGenus(), reading.getDetermination(), omit));
      }
    }
  }
  return set;
}

// Java: AgreementTools#getAgreementSOLCategories(AnalyzedTokenReadings,Set)
export function getAgreementSOLCategories(aToken, omit) {
  const set = new Set();
  const readings = aToken.getReadings();
  for (const tmpReading of readings) {
    if (tmpReading.getPOSTag() !== null && !tmpReading.getPOSTag().endsWith(':SOL')) {
      continue;
    }
    const reading = new AnalyzedGermanToken(tmpReading);
    if (reading.getCasus() === null && reading.getNumerus() === null && reading.getGenus() === null) {
      continue;
    }
    set.add(makeString(reading.getCasus(), reading.getNumerus(), reading.getGenus(), Determination.DEFINITE, omit));
    set.add(makeString(reading.getCasus(), reading.getNumerus(), reading.getGenus(), Determination.INDEFINITE, omit));
  }
  return set;
}

// Java: AgreementTools#possessiveSpecialCase(AnalyzedTokenReadings,AnalyzedToken)
function possessiveSpecialCase(aToken, tmpReading) {
  // would cause error misses as it contains 'ALG', e.g. in "Der Zustand meiner Gehirns."
  return aToken.hasPosTagStartingWith('PRO:POS') && equalsAny(tmpReading.getLemma(), 'ich', 'sich');
}

// Java: AgreementTools#makeString(GermanToken.Kasus,GermanToken.Numerus,GermanToken.Genus,Determination,Set)
function makeString(casus, num, gen, determination, omit) {
  const l = [];
  if (casus !== null && !omit.has(GrammarCategory.KASUS)) {
    l.push(casus.toString());
  }
  if (num !== null && !omit.has(GrammarCategory.NUMERUS)) {
    l.push(num.toString());
  }
  if (gen !== null && !omit.has(GrammarCategory.GENUS)) {
    l.push(gen.toString());
  }
  if (determination !== null) {
    l.push(determination.toString());
  }
  return l.join('/');
}

export const AgreementTools = { getAgreementCategories, getAgreementSOLCategories };

// Java: Set#retainAll(Collection) (AbstractCollection, Set arguments)
export function retainAll(set, other) {
  for (const e of [...set]) {
    if (!other.has(e)) set.delete(e);
  }
}
