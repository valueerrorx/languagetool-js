// indriya 1.3 subset vs the pinned JDK 17 run (IndriyaProbe.java.txt, run against the distribution jars): unit tables of the four rules
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getMessageBundle } from '../../../src/core/resources/ResourceBundleTools.js';
import { UnitConversionRuleUS } from '../../../src/lang/en/rules/UnitConversionRuleUS.js';
import { UnitConversionRuleImperial } from '../../../src/lang/en/rules/UnitConversionRuleImperial.js';
import { UnitConversionRule as EnRule } from '../../../src/lang/en/rules/UnitConversionRule.js';
import { UnitConversionRule as DeRule } from '../../../src/lang/de/rules/UnitConversionRule.js';
import { IDENTITY, RationalConverter, MultiplyConverter, AddConverter } from '../../../src/lib/units/converters.js';

const golden = JSON.parse(readFileSync(new URL('./indriya-golden.json', import.meta.url), 'utf8'));
const CLASSES = { 'org.languagetool.rules.en.UnitConversionRuleUS': UnitConversionRuleUS, 'org.languagetool.rules.en.UnitConversionRuleImperial': UnitConversionRuleImperial, 'org.languagetool.rules.en.UnitConversionRule': EnRule, 'org.languagetool.rules.de.UnitConversionRule': DeRule };
const VALUES = [1, 0.3, 123.456, 1e10, -5, 7.77, 1e-7, 3.5, 100, 0.5];

const steps = (c) => c.getConversionSteps().map((s) => {
  if (s === IDENTITY) return ['I'];
  if (s instanceof MultiplyConverter) return ['M', s.getFactor()];
  if (s instanceof RationalConverter) return ['R', Number(s.dividend), Number(s.divisor)];
  if (s instanceof AddConverter) return ['A', s.getOffset()];
  return ['?'];
});

describe('indriya subset vs JDK 17 probe', () => {
  for (const g of golden) {
    it(g.cls, () => {
      const rule = new CLASSES[g.cls](getMessageBundle());
      expect(rule.unitPatterns.length).toBe(g.units.length);
      const metric = rule.metricUnits;
      g.units.forEach((gu, i) => {
        const { pattern, unit } = rule.unitPatterns[i];
        expect(pattern.toString()).toBe(gu.pat);
        expect(steps(unit.getSystemConverter())).toEqual(gu.sys);
        expect(metric.findIndex((m) => m.equals(unit))).toBe(gu.mi);
        expect(rule.unitPatterns.findIndex((e) => e.unit.equals(unit))).toBe(gu.eq);
        const entry = rule.unitSymbols.get(unit.key());
        expect(entry === undefined ? null : entry.symbols).toEqual(gu.syms);
        const to = [];
        metric.forEach((m, k) => {
          if (!unit.isCompatible(m)) return;
          const c = unit.getConverterTo(m);
          to.push({ k, steps: steps(c), v: VALUES.map((v) => c.convert(v)) });
        });
        expect(to.map((t) => ({ ...t, v: t.v.map(String) }))).toEqual(gu.to.map((t) => ({ k: t.k, steps: t.steps, v: t.v.map((x) => String(Number(x))) })));
        const inc = [];
        rule.unitPatterns.forEach((e, j) => {
          if (!unit.isCompatible(e.unit)) return;
          if (g.cls.endsWith('.de.UnitConversionRule') || j < 3) {
            const c = unit.getConverterTo(e.unit);
            inc.push({ j, steps: steps(c), v: String(c.convert(12.34)) });
          }
        });
        expect(inc).toEqual(gu.incompat.map((x) => ({ j: x.j, steps: x.steps, v: String(Number(x.v)) })));
      });
    });
  }
});
