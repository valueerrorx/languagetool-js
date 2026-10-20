// Ported from GermanHelperTest
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../../src/core/AnalyzedTokenReadings.js';
import { POSType } from '../../../../src/lang/de/tagging/GermanToken.js';
import * as GermanHelper from '../../../../src/lang/de/rules/GermanHelper.js';

describe('GermanHelperTest', () => {
  // Java: GermanHelperTest#testHasReadingOfType
  it('testHasReadingOfType', () => {
    const readings = new AnalyzedTokenReadings(new AnalyzedToken('der', 'ART:DEF:DAT:SIN:FEM', null), 0);
    expect(GermanHelper.hasReadingOfType(readings, POSType.DETERMINER)).toBe(true);
    expect(GermanHelper.hasReadingOfType(readings, POSType.NOMEN)).toBe(false);
  });

  // Java: GermanHelperTest#testGetDeterminerNumber
  it('testGetDeterminerNumber', () => {
    expect(GermanHelper.getDeterminerNumber('ART:DEF:DAT:SIN:FEM')).toBe('SIN');
  });

  // Java: GermanHelperTest#testGetDeterminerDefiniteness
  it('testGetDeterminerDefiniteness', () => {
    expect(GermanHelper.getDeterminerDefiniteness('ART:DEF:DAT:SIN:FEM')).toBe('DEF');
  });

  // Java: GermanHelperTest#testGetDeterminerCase
  it('testGetDeterminerCase', () => {
    expect(GermanHelper.getDeterminerCase('ART:DEF:DAT:SIN:FEM')).toBe('DAT');
  });

  // Java: GermanHelperTest#testGetDeterminerGender
  it('testGetDeterminerGender', () => {
    expect(GermanHelper.getDeterminerGender(null)).toBe('');
    expect(GermanHelper.getDeterminerGender('')).toBe('');
    expect(GermanHelper.getDeterminerGender('ART:DEF:DAT:SIN:FEM')).toBe('FEM');
  });
});
