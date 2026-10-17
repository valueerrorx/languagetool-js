// Extra tests (no Java original): F25b review round 1 (XPath id errors, postag templates, unifier maps, filter creation)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { xpathLiteral } from '../../../src/core/patterns/PatternRuleXmlCreator.js';
import { StringMatcher } from '../../../src/core/patterns/StringMatcher.js';
import { UnifierConfiguration } from '../../../src/core/patterns/UnifierConfiguration.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { RuleFilterCreator, newInstance } from '../../../src/core/patterns/RuleFilterCreator.js';
import { InvocationTargetException, NullPointerException, RuntimeException } from '../../../src/lib/java/errors.js';

const chain = (f) => {
  try { f(); return null; } catch (e) {
    const out = [];
    for (let c = e; c; c = c.getCause()) out.push(`${c.javaClass}: ${c.getMessage()}`);
    return out;
  }
};

describe('F25b review', () => {
  // recorded from javax.xml.xpath over "/rules/category/rule[@id='<id>']" (OpenJDK 17.0.20)
  it('xpath ids with quotes fail like the JDK XPath compiler', () => {
    expect(xpathLiteral('A"B')).toBe('A"B');
    expect(chain(() => xpathLiteral("A'B"))).toEqual([
      'javax.xml.xpath.XPathExpressionException: javax.xml.transform.TransformerException: misquoted literal... expected single quote!',
      'javax.xml.transform.TransformerException: misquoted literal... expected single quote!']);
    expect(chain(() => xpathLiteral("A'B\"C"))[1]).toBe('javax.xml.transform.TransformerException: misquoted literal... expected double quote!');
    expect(chain(() => xpathLiteral("''"))[1]).toBe("javax.xml.transform.TransformerException: Expected ], but found: ''");
    expect(chain(() => xpathLiteral("a'b'c\"d"))[1]).toBe('javax.xml.transform.TransformerException: Expected ], but found: b');
    expect(chain(() => xpathLiteral("A' ( 'B"))[1]).toBe('javax.xml.transform.TransformerException: Expected ], but found: (');
    expect(chain(() => xpathLiteral("A' 5-3 'B"))[1]).toBe('javax.xml.transform.TransformerException: Expected ], but found: 5');
  });

  // Java: StringMatcher#tryCreatePostagTemplateMatcher
  it('postag template matcher via createWithKnownValues', () => {
    const m = StringMatcher.createWithKnownValues('NN|VB[A-C].*', true, true, null);
    expect(m.getPossibleValues()).toBeNull();
    expect(m.matches('NN')).toBe(true);
    expect(m.matches('NNS')).toBe(false);
    expect(m.matches('VBB:x')).toBe(true);
    expect(m.matches('VBD')).toBe(false);
    expect(StringMatcher.createWithKnownValues('N(N)', true, true, null).matches('NN')).toBe(true); // groups fall back to the regex
    expect(StringMatcher.createWithKnownValues('[^N]', true, true, null).matches('A')).toBe(true);
  });

  // Java: UnifierConfiguration#setEquivalence (ConcurrentHashMap)
  it('unifier configuration rejects a null feature like ConcurrentHashMap', () => {
    const c = new UnifierConfiguration();
    expect(() => c.setEquivalence(null, 'sg', new PatternToken('', true, false, false)))
      .toThrow('Cannot invoke "Object.hashCode()" because "key" is null');
    const d = new UnifierConfiguration();
    d.setEquivalence('number', 'sg', new PatternToken('', true, false, false));
    d.setEquivalence('number', 'pl', new PatternToken('', true, false, false));
    expect(d.getEquivalenceFeatures().entrySet().map(([k, v]) => [k, [...v]])).toEqual([['number', ['sg', 'pl']]]);
  });

  // Java: Constructor#newInstance
  it('constructor failures are wrapped in InvocationTargetException', () => {
    class Boom { constructor() { throw new RuntimeException('boom'); } }
    try { newInstance(Boom); expect.unreachable(); } catch (e) {
      expect(e).toBeInstanceOf(InvocationTargetException);
      expect(e.getMessage()).toBeNull();
      expect(e.getCause().getMessage()).toBe('boom');
    }
  });

  it('abstract and non-filter classes fail like in Java', () => {
    const f = RuleFilterCreator.getInstance();
    expect(chain(() => f.getFilter('org.languagetool.rules.AbstractDateCheckFilter')))
      .toEqual(['java.lang.RuntimeException: Could not create filter class using constructor public org.languagetool.rules.AbstractDateCheckFilter()',
        'java.lang.InstantiationException: null']);
    expect(chain(() => f.getFilter('java.lang.Integer'))[0]).toBe("java.lang.RuntimeException: Constructor of filter class 'java.lang.Integer' must have exactly one constructor, but it has 2");
    expect(new NullPointerException().getMessage()).toBeNull();
  });
});
