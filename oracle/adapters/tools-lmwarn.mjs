// JS twin of harness op "tools-lmwarn" (ToolsOps#lmWarn, docs/review/F40-oracle.md).
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { File } from '../../src/lib/java/io/File.js';
import { errorOf } from './_check-pipe-common.mjs';
import { langFor, s } from './_bitext-common.mjs';

// language module class -> short code used to look up the registered language
const CLASS_CODES = { Dutch: 'nl', Russian: 'ru', French: 'fr', Chinese: 'zh', English: 'en', GermanyGerman: 'de-DE' };

// Java: ToolsOps#lmWarn(JsonNode)
export function run(a) {
  const old = process.cwd();
  const work = realpathSync(mkdtempSync(path.join(tmpdir(), 'ltjs-lmwarn-')));
  process.chdir(work);
  const realWrite = process.stderr.write;
  try {
    const out = [];
    const dir = a.dir;
    if (a.makeSub !== undefined) {
      mkdirSync(path.join(dir, a.makeSub), { recursive: true });
      langFor(CLASS_CODES[a.class.split('.').pop()]);
      const err = new Error('not ported yet: LuceneLanguageModel loader (DEV-001): existing language model directory');
      err.notPorted = true;
      throw err;
    }
    const code = CLASS_CODES[a.class.split('.').pop()];
    const proto = langFor(code);
    let first = true;
    for (const inst of a.instances) {
      // the registry already holds the one allowed instance of guarded languages (Java: first fresh instance in the harness JVM)
      let l;
      if (first) {
        l = proto;
        l.noLmWarningPrinted = false;
        l.languageModel = null;
        first = false;
      } else {
        l = new proto.constructor();
      }
      const calls = [];
      for (let i = 0; i < inst.calls; i++) {
        let captured = '';
        process.stderr.write = (chunk) => { captured += String(chunk); return true; };
        const c = {};
        try {
          const lm = l.getLanguageModel(new File(s(inst, 'dir') === null ? dir : inst.dir));
          c.model = lm === null ? null : lm.constructor.name;
        } catch (t) {
          c.error = errorOf(t);
        } finally {
          process.stderr.write = realWrite;
        }
        c.stderr = captured;
        calls.push(c);
      }
      out.push({ calls });
    }
    return out;
  } finally {
    process.stderr.write = realWrite;
    process.chdir(old);
    rmSync(work, { recursive: true, force: true });
  }
}
