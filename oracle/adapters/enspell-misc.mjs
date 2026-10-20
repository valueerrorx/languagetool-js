// JS twin of harness op "enspell-misc" (EnSpellOps#misc, docs/review/F46-oracle.md): kinds prepare, inflect, beolingus, instance, dynamic.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import '../../src/lang/register.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { Languages } from '../../src/core/Languages.js';
import { DynamicMorfologikLanguage } from '../../src/core/DynamicLanguage.js';
import { GlobalConfig } from '../../src/core/rules/model/GlobalConfig.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { File } from '../../src/lib/java/io/File.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { Inflector } from '../../src/lang/en/rules/translation/Inflector.js';
import { BeoLingusTranslator } from '../../src/lang/en/rules/translation/BeoLingusTranslator.js';
import { errorOf } from './_check-pipe-common.mjs';
import { runCase } from './check2.mjs';

let counter = 0;
let root = null;

// each case file is its own JVM in the oracle: counter and temp dir start fresh
export function beginCase() {
  counter = 0;
  if (root !== null) rmSync(root, { recursive: true, force: true });
  root = null;
}

// Java: EnSpellOps#safe(C0)
function safe(c) {
  try {
    return c();
  } catch (t) {
    return { error: errorOf(t) };
  }
}

// Java: EnSpellOps#str(JsonNode)
const str = (n) => (n === undefined || n === null ? null : String(n));

// Java: EnSpellOps#entries(List)
const entries = (l) => l.map((e) => [e.getL1(), e.getL2(), e.getItemCount()]);

// Java: System.getProperty("java.io.tmpdir") + name: the oracle's tmp dir shows up as <TMP> after normalisation
function tmpSub(name) {
  if (root === null) root = mkdtempSync(path.join(tmpdir(), 'ltjs-enspell-'));
  const d = path.join(root, name);
  mkdirSync(d, { recursive: true });
  return d;
}

// Java: EnSpellOps#misc(JsonNode)
export function run(a) {
  const res = misc(a);
  const t = root === null ? '' : root;
  return t === '' ? res : JSON.parse(JSON.stringify(res).split(t).join('<TMP>'));
}

function misc(a) {
  const kind = a.kind;
  const res = {};
  switch (kind) {
    case 'prepare': {
      const l = Languages.getLanguageForShortCode(a.lang !== undefined ? a.lang : 'en');
      res.class = l.constructor.FQCN;
      res.results = a.lines.map((n) => ({ line: str(n), result: safe(() => l.prepareLineForSpeller(str(n))) }));
      break;
    }
    case 'inflect': {
      const inf = safe(() => new Inflector());
      if (!(inf instanceof Inflector)) {
        res.buildError = inf;
        break;
      }
      res.results = a.cases.map((c) => ({
        token: str(c.token),
        tag: str(c.tag),
        single: safe(() => inf.inflectSingleWord(str(c.token), str(c.tag))),
        inflect: safe(() => inf.inflect(str(c.token), str(c.tag))),
      }));
      break;
    }
    case 'beolingus': {
      const dir = tmpSub(`beolingus-${counter++}`);
      let f = path.join(dir, 'beolingus.txt');
      writeFileSync(f, a.lines.map((n) => `${n}\n`).join(''), 'utf8');
      if (a.missingFile !== undefined) f = path.join(dir, 'nonexistent.txt');
      const tr = safe(() => new BeoLingusTranslator(new File(f)));
      if (!(tr instanceof BeoLingusTranslator)) {
        res.buildError = tr;
        break;
      }
      res.deEnSize = safe(() => tr.getDeEnSize());
      res.message = safe(() => tr.getMessage());
      res.dataSource = safe(() => {
        const ds = tr.getDataSource();
        return [ds.licenseUrl, ds.sourceName, ds.sourceUrl];
      });
      res.results = a.ops.map((c) => ({
        op: c,
        result: safe(() => {
          switch (c.fn) {
            case 'translate': return entries(tr.translate(str(c.term), str(c.from), str(c.to)));
            case 'split': return tr.split(str(c.s));
            case 'splitAtSemicolon': return tr.splitAtSemicolon(str(c.s));
            case 'clean': return tr.cleanTranslationForReplace(str(c.s), str(c.prev));
            case 'suffix': return tr.getTranslationSuffix(str(c.s));
            default: throw new IllegalArgumentException(`fn ${c.fn}`);
          }
        }),
      }));
      break;
    }
    case 'instance': {
      // BeoLingusTranslator.getInstance(GlobalConfig) with no file / null config
      res.nullConfig = safe(() => String(BeoLingusTranslator.getInstance(null)));
      res.noFile = safe(() => String(BeoLingusTranslator.getInstance(new GlobalConfig())));
      break;
    }
    case 'dynamic': {
      const dir = tmpSub(`dynmorf-${counter++}`);
      const base = a.dict !== undefined ? a.dict : 'en_US';
      const dict = path.join(dir, `${base}.dict`);
      for (const ext of ['.dict', '.info']) {
        if (ext === '.info' && a.noInfo === true) continue;
        writeFileSync(path.join(dir, base + ext), getDataBroker().getFromResourceDirAsStream(`/en/hunspell/${base}${ext}`));
      }
      const dp = a.missingDict !== undefined ? path.join(dir, 'none.dict') : dict;
      const lang = safe(() => new DynamicMorfologikLanguage(str(a.name), str(a.code), new File(dp)));
      if (!(lang instanceof DynamicMorfologikLanguage)) {
        res.buildError = lang;
        break;
      }
      res.class = lang.constructor.FQCN;
      res.name = lang.getName();
      res.shortCode = lang.getShortCode();
      res.countries = lang.getCountries();
      let lt;
      try {
        lt = new JLanguageTool(lang, null, null);
      } catch (t) {
        Object.assign(res, { ltError: errorOf(t) });
        break;
      }
      lt.setCleanOverlappingMatches(false);
      res.activeRules = lt.getAllActiveRules().map((r) => `${r.getId()}|${r.constructor.FQCN}|${r.getDescription()}`);
      res.cases = a.cases.map((c) => safe(() => runCase(lt, c)));
      break;
    }
    default: throw new IllegalArgumentException(`kind ${kind}`);
  }
  return res;
}
