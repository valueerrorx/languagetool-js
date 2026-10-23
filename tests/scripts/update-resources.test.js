import { describe, expect, it } from 'vitest';
import { diffManifests, groupByLanguage, languageOf, parseManifest, scanFilterClasses } from '../../scripts/lib/update-resources.mjs';

const h = (c) => c.repeat(64);

describe('update-resources helpers', () => {
  it('parses and diffs manifests', () => {
    const a = parseManifest(`${h('a')}  x/one\n${h('b')}  x/two\n${h('c')}  x/three\n`);
    const b = parseManifest(`${h('a')}  x/one\n${h('d')}  x/two\n${h('e')}  x/four\n`);
    expect(diffManifests(a, b)).toEqual({ added: ['x/four'], removed: ['x/three'], changed: ['x/two'] });
    expect(diffManifests(a, a)).toEqual({ added: [], removed: [], changed: [] });
  });

  it('groups by language', () => {
    expect(languageOf('org/languagetool/rules/de/grammar.xml')).toBe('de');
    expect(languageOf('.dup/1/org/languagetool/resource/en/x.txt')).toBe('en');
    expect(languageOf('MANIFEST.sha256')).toBe('other');
    const g = groupByLanguage(['org/languagetool/rules/fr/a.xml', 'logback.xml', 'org/languagetool/rules/de/b.xml']);
    expect([...g.keys()]).toEqual(['de', 'fr', 'other']);
  });

  it('scans filter classes', () => {
    const xml = '<rule><filter class="org.A" args="x:\\1"/><filter\n class="org.B"/><x class="no"/></rule>';
    expect([...scanFilterClasses(xml)]).toEqual(['org.A', 'org.B']);
  });
});
