// Port of ConfidenceMapLoaderTest (the Java Map<ConfidenceKey,Float> is a JS Map keyed by ConfidenceKey objects; lookups go through equals()).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { ConfidenceKey } from '../../src/core/RuleMatchesAsJsonSerializer.js';
import { File } from '../../src/lib/java/io/File.js';
import { ConfidenceMapLoader } from '../../src/server/ConfidenceMapLoader.js';

const get = (map, key) => { // Java: Map#get
  let found = null;
  for (const [k, v] of map) if (key.equals(k)) found = v;
  return found;
};

describe('ConfidenceMapLoaderTest', () => {
  // Java: ConfidenceMapLoaderTest#testLoading()
  it('testLoading', () => {
    const map = new ConfidenceMapLoader().load(new File('tests/resources/server/confidence-map-{lang}.csv'));
    expect(map.size).toBe(7 * 3); // 7 language variantes, 3 rules each
    const en = Languages.getLanguageForShortCode('en');
    expect(get(map, new ConfidenceKey(en, 'FOO_1'))).not.toBeNull();
    expect(get(map, new ConfidenceKey(en, 'FOO_1'))).toBe(Math.fround(0.72));
    expect(get(map, new ConfidenceKey(en, 'OTHER_RULE_1'))).not.toBeNull();
    expect(get(map, new ConfidenceKey(en, 'OTHER_RULE_2'))).not.toBeNull();
  });

  // Java: ConfidenceMapLoaderTest#testLoadingFail()
  it('testLoadingFail', () => {
    expect(() => new ConfidenceMapLoader().load(new File('tests/resources/server/confidence-map.csv')))
      .toThrow("The 'ruleIdToConfidenceFile' parameter must contain '{lang}' as a placeholder for the language code");
    expect(() => new ConfidenceMapLoader().load(new File('tests/resources/server/does-not-exist-{lang}.csv')))
      .toThrow(/^No confidence values could be loaded for tests\/resources\/server\/does-not-exist-\{lang\}\.csv -- please check/);
  });
});
