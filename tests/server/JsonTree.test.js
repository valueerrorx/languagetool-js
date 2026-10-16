// Jackson readTree subset (SEMANTICS S6: trailing content ignored, last duplicate key wins, MissingNode for empty input).
import { describe, it, expect } from 'vitest';
import { readTree, JsonProcessingException } from '../../src/server/JsonTree.js';

describe('readTree', () => {
  it('parses objects and ignores trailing content', () => {
    const n = readTree('{"a":1,"b":[true,null,"x"]} trailing');
    expect(n.toString()).toBe('{"a":1,"b":[true,null,"x"]}');
  });
  it('last duplicate key wins at the first position', () => {
    expect(readTree('{"a":1,"b":2,"a":3}').toString()).toBe('{"a":3,"b":2}');
  });
  it('empty input is a missing node, non-objects have no fields', () => {
    expect(readTree('  ').kind).toBe('missing');
    expect(readTree('[1]').get('text')).toBeNull();
    expect(readTree('"s"').get('text')).toBeNull();
  });
  it('asText follows Jackson', () => {
    const n = readTree('{"a":null,"b":1.5,"c":12,"d":true,"e":{"x":1},"f":1e2}');
    expect(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => n.get(k).asText())).toEqual(['null', '1.5', '12', 'true', '', '100.0']);
  });
  it('rejects invalid JSON', () => {
    for (const bad of ['not json', '{"a":1', '{"a":01}', "{'a':1}", '{"a":1,}', '{"annotation":{"text": "A "}]}', '"abc', '[1,]', 'tru']) {
      expect(() => readTree(bad), bad).toThrow(JsonProcessingException);
    }
  });
  it('quotes strings like Jackson', () => {
    expect(readTree('{"k":"a\\"b\\\\c\\n\\u0001é"}').toString()).toBe('{"k":"a\\"b\\\\c\\n\\u0001é"}');
  });
  it('depth limit 1000', () => {
    expect(() => readTree('['.repeat(1001))).toThrow(JsonProcessingException);
  });
});
