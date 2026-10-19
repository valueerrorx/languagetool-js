import { describe, it, expect } from 'vitest';
import { loadModels } from '../../../src/lib/opennlp/Models.js';
import { TokenizerME } from '../../../src/lib/opennlp/TokenizerME.js';
import { POSTaggerME } from '../../../src/lib/opennlp/POSTaggerME.js';
import { ChunkerME } from '../../../src/lib/opennlp/ChunkerME.js';

describe('OpenNLP inference (F44)', () => {
  const { tm, pm, cm } = loadModels();
  it('loads the models', () => {
    expect(tm.getMaxentModel().getNumOutcomes()).toBe(2);
    expect(pm.getPosModel().getNumOutcomes()).toBe(45);
    expect(cm.getChunkerModel().getNumOutcomes()).toBe(22);
    expect(pm.getTagDictionary().dictionary.size).toBe(16204);
  });
  it('GIS eval of an empty context is uniform', () => {
    const p = tm.getMaxentModel().eval([]);
    expect(Array.from(p)).toEqual([0.5, 0.5]);
  });
  it('tokenizes, tags and chunks (values from the X-OPENNLP golden run-edge-00)', () => {
    expect(new TokenizerME(tm).tokenize('...')).toEqual(['...']);
    const tags = new POSTaggerME(pm).tag(['.']);
    expect(tags).toEqual(['.']);
    const c = new ChunkerME(cm);
    expect(c.chunk(['.'], tags)).toEqual(['O']);
    expect(Array.from(c.probs())).toEqual([0.9906793536577913]);
  });
  it('empty input', () => {
    expect(new TokenizerME(tm).tokenize('')).toEqual([]);
    expect(new POSTaggerME(pm).tag([])).toEqual([]);
  });
});
