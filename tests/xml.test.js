import { describe, expect, it } from 'vitest';
import { parseXml, parserOptions } from '../src/core/resources/xml.js';

function events(xml, profile = 'pattern') {
  const out = [];
  parseXml(xml, {
    startElement: (n, a) => out.push(`S ${n}${[...Array(a.getLength()).keys()].map((i) => ` ${a.getQName(i)}=${a.getValue(i)}`).join('')}`),
    endElement: (n) => out.push(`E ${n}`),
    characters: (t) => out.push(`T ${t}`),
  }, parserOptions(profile));
  return out;
}

describe('xml entity expansion', () => {
  it('expands nested internal entities in content and attributes', () => {
    const xml = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY e "val &amp; more"><!ENTITY f "[&e;]">]><r a="&e;">&e;&f;</r>';
    expect(events(xml)).toEqual(['S r a=val & more', 'T val & more[val & more]', 'E r']);
  });
  it('joins text around comments and CDATA into one node', () => {
    expect(events('<r>a<!-- c -->b<![CDATA[<c>]]>d</r>')).toEqual(['S r', 'T ab<c>d', 'E r']);
  });
  it('parses markup inside entity text', () => {
    expect(events('<!DOCTYPE r [<!ENTITY e "<b x=\'1\'>in</b>">]><r>&e;</r>')).toEqual(['S r', 'S b x=1', 'T in', 'E b', 'E r']);
  });
  it('reports undefined entities and recursion like Xerces', () => {
    expect(() => events('<r>&u;</r>')).toThrow('The entity "u" was referenced, but not declared.');
    expect(() => events('<!DOCTYPE r [<!ENTITY a "&b;"><!ENTITY b "&a;">]><r>&a;</r>')).toThrow('Recursive entity reference "a". (Reference path: a -> b -> a),');
  });
  it('limits expansions only in the plain profile', () => {
    const decl = '<!ENTITY a "x"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;"><!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;"><!ENTITY e "&d;&d;&d;&d;&d;&d;&d;&d;&d;&d;"><!ENTITY f "&e;&e;&e;&e;&e;&e;&e;&e;&e;&e;">';
    const xml = `<!DOCTYPE r [${decl}]><r>&f;</r>`;
    expect(events(xml, 'pattern')[1]).toHaveLength(2 + 100000);
    expect(() => events(xml, 'plain')).toThrow('JAXP00010001');
  });
});
