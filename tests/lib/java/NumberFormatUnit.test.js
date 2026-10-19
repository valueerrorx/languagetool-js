// NumberFormat.getNumberInstance(Locale) with HALF_UP/maxFractionDigits 2, parse, URLEncoder.encode, Math.round(double) vs the JDK 17 probe (fixtures/NumberFormatUnit-jdk17.*)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DecimalFormat } from '../../../src/lib/java/DecimalFormat.js';
import { Locale } from '../../../src/lib/java/Locale.js';
import { ParseException } from '../../../src/lib/java/errors.js';
import { URLEncoder } from '../../../src/lib/java/net.js';
import { mathRoundDouble } from '../../../src/lib/java/float.js';
import { Double } from '../../../src/lib/java/numbers.js';

const lines = readFileSync(new URL('./fixtures/NumberFormatUnit-jdk17.txt', import.meta.url), 'utf8').trim().split('\n');
const items = (line) => [...line.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]);
const LOCALES = { en: Locale.ENGLISH, en_US: Locale.US, en_GB: Locale.UK, de_DE: Locale.GERMANY };
const DS = [0.005, 0.015, 0.025, 1.005, 2.675, 1.115, 0.125, 1234567.891, -0.004, -0.005, 0.0, -0.0, 1e-7, 99.995, 999.995, 10000.75, 4.535923, 1e21, 123456789012.345, NaN, Infinity, 0.1 + 0.2, 160.9344, 5.0e-324];
const LS = [0n, 5n, -5n, 1234n, 1000000n, 9223372036854775807n, -9223372036854775808n];
const PS = ['6', '10,000.75', '10.000,75', '1,83', '1.83', '-5', '-0', '0', '0.5', '.5', '1,2,3', '1..2', '12abc', 'abc', '', '-', '1e5', '００７', '1,', '1.', '3.14159', '123456789012345678901234567890', '0.000000000001', '1,000', '1.000', '1 000'];

describe('NumberFormat.getNumberInstance HALF_UP vs JDK 17', () => {
  for (const [name, locale] of Object.entries(LOCALES)) {
    const f = DecimalFormat.getNumberInstance(locale);
    f.setMaximumFractionDigits(2);
    f.setRoundingMode('HALF_UP');
    const fl = lines.find((l) => l.startsWith(`${name} F:`));
    const pl = lines.find((l) => l.startsWith(`${name} P:`));
    it(`${name} format`, () => {
      const exp = items(fl.substring(fl.indexOf(' F:')));
      const got = [...DS.map((d) => f.formatDouble(d)), ...LS.map((x) => f.formatLong(x))];
      expect(got).toEqual(exp);
    });
    it(`${name} parse`, () => {
      const exp = items(pl.substring(pl.indexOf(' P:')));
      const got = PS.map((p) => {
        try {
          return Double.toString(f.parse(p));
        } catch (e) {
          if (e instanceof ParseException) return 'ERR';
          throw e;
        }
      });
      expect(got).toEqual(exp);
    });
  }

  it('URLEncoder.encode', () => {
    const exp = items(lines.find((l) => l.startsWith('ENC:')));
    const got = ['convert 100 °F to metric', 'a b*c-d.e_f~g/h?i', 'ß€😀', '\uD800x', 'x\uDC00', '5\'6"', '1⁄4 cup'].map((s) => URLEncoder.encode(s, 'utf-8'));
    expect(got).toEqual(exp);
  });

  it('Math.round(double)', () => {
    const exp = items(lines.find((l) => l.startsWith('RND:')));
    const got = [0.5, 1.5, 2.5, -0.5, -1.5, -2.5, 0.49999999999999994, 4503599627370497.0, 1e19, -1e19, NaN, 37.78, 2.4999, -0.0, 9.223372036854776e18].map((d) => String(mathRoundDouble(d)));
    expect(got).toEqual(exp);
  });
});
