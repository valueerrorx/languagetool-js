// JS twin of harness op "lang-detect" (DetectOps#run).
import '../../src/lang/register.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { floatToString } from '../../src/lib/java/toString.js';
import { DefaultLanguageIdentifier } from '../../src/core/language/identifier/DefaultLanguageIdentifier.js';
import { getLanguageForShortCode, languageClassName } from '../../src/core/language/identifier/DetectionLanguages.js';
import { LanguageIdentifierService } from '../../src/core/language/identifier/LanguageIdentifierService.js';
import { CommonWordsDetector } from '../../src/core/language/identifier/detector/CommonWordsDetector.js';
import { UnicodeBasedDetector } from '../../src/core/language/identifier/detector/UnicodeBasedDetector.js';
import { detectLanguageOfString } from '../../src/server/detectLanguageOfString.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { safe } from './_text-common.mjs';

let IDS = new Map();
let common = null;
let checkerIdentifier = null;
let lastDefault = null;

// each case file is a fresh JVM in the oracle (service singleton, identifier cache)
export function beginCase() {
  IDS = new Map();
  common = null;
  checkerIdentifier = null;
  lastDefault = null;
  LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('both');
}

// Java: DetectOps#strs(JsonNode)
const strs = (n) => (n === undefined || n === null ? [] : n.map((x) => (x === null ? null : String(x))));
// Java: DetectOps#s(JsonNode,String)
const s = (n, k) => (n[k] === undefined || n[k] === null ? null : String(n[k]));

// Java: Float.floatToRawIntBits(float)
function floatBits(f) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, f);
  return dv.getInt32(0);
}

// Java: DetectOps#identifier(int)
function identifier(maxLength) {
  let li = IDS.get(maxLength);
  if (li === undefined) {
    li = new DefaultLanguageIdentifier(maxLength);
    IDS.set(maxLength, li);
  }
  return li;
}

// Java: DetectOps#ident(JsonNode)
const ident = (c) => identifier(c.maxLength !== undefined ? c.maxLength | 0 : 1000);

// Java: DetectOps#lang(Language)
export function lang(l) {
  const dv = l.getDefaultLanguageVariant();
  return {
    code: l.getShortCodeWithCountryAndVariant(),
    shortCode: l.getShortCode(),
    name: l.getName(),
    class: languageClassName(l),
    spellcheckOnly: l.isSpellcheckOnlyLanguage(),
    defaultVariant: dv === null ? null : dv.getShortCodeWithCountryAndVariant(),
  };
}

// Java: DetectOps#detected(DetectedLanguage) (float confidence as its Float.toString value)
function detected(d) {
  if (d === null) return null;
  const g = d.getGivenLanguage();
  return {
    given: g === null ? null : g.getShortCodeWithCountryAndVariant(),
    detected: lang(d.getDetectedLanguage()),
    confidence: Number(floatToString(d.getDetectionConfidence())),
    confidenceBits: floatBits(d.getDetectionConfidence()),
    source: d.getDetectionSource(),
  };
}

// Java: DetectOps#cleaned(LanguageIdentifier,JsonNode)
const cleaned = (li, c) => (c.clean !== undefined && !c.clean ? c.text : li.cleanAndShortenText(c.text));

// Java: DetectOps#checker() -> the identifier a V2TextChecker built from new HTTPServerConfig(new String[0]) uses
function checker() {
  if (checkerIdentifier === null) checkerIdentifier = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(0, null, null, null);
  return checkerIdentifier;
}

// Java: DetectOps svc step
function svcStep(st) {
  const svc = LanguageIdentifierService.INSTANCE;
  switch (st.fn) {
    case 'clear': svc.clearLanguageIdentifier(String(st.type)); return 'cleared';
    case 'getDefault': {
      const li = svc.getDefaultLanguageIdentifier(st.maxLength | 0, null, null, null);
      const o = { class: li.constructor.FQCN, sameAsBefore: li === lastDefault };
      lastDefault = li;
      o.cleanLenProbe = li.cleanAndShortenText('x'.repeat(1200)).length;
      return o;
    }
    case 'getInitialized': { const li = svc.getInitialized(); return li === null ? null : li.constructor.FQCN; }
    case 'canDetect': return svc.canLanguageBeDetected(s(st, 'code'), strs(st.additional));
    case 'langForShortCode': return lang(getLanguageForShortCode(s(st, 'code'), strs(st.additional)));
    default: throw new IllegalArgumentException(`bad svc fn ${st.fn}`);
  }
}

// Java: DetectOps#run(JsonNode)
export function run(a) {
  return a.calls.map((c) => safe(() => {
    switch (c.fn) {
      case 'clean': return ident(c).cleanAndShortenText(c.text);
      case 'construct': identifier(c.maxLength | 0); return 'ok';
      case 'detect': {
        const li = ident(c);
        const t = cleaned(li, c);
        const d = c.force !== undefined && c.force !== null
          ? li.detectLanguage(t, strs(c.noop), strs(c.preferred), Boolean(c.force))
          : li.detectLanguage(t, strs(c.noop), strs(c.preferred));
        return { clean: t, result: detected(d) };
      }
      case 'detect1': {
        const li = ident(c);
        const l = li.detectLanguage(cleaned(li, c));
        return l === null ? null : lang(l);
      }
      case 'scores': {
        const li = ident(c);
        const t = cleaned(li, c);
        return li.getDetectedLanguageScores(t, strs(c.noop), strs(c.preferred), Boolean(c.force), c.count | 0).map(detected);
      }
      case 'server':
        return detected(detectLanguageOfString(checker(), c.text, s(c, 'fallback'), strs(c.variants), strs(c.noop), strs(c.preferred), Boolean(c.force)));
      case 'unicode': {
        const u = c.maxCheckLength !== undefined ? new UnicodeBasedDetector(c.maxCheckLength | 0) : new UnicodeBasedDetector();
        return u.getDominantLangCodes(c.text);
      }
      case 'common': {
        if (common === null) common = new CommonWordsDetector();
        const rows = [...common.getKnownWordsPerLanguage(c.text)].map(([l, n]) => [l.getShortCodeWithCountryAndVariant(), n]);
        rows.sort((x, y) => javaCompare(x[0], y[0]));
        return rows;
      }
      case 'svc': return c.steps.map((st) => safe(() => svcStep(st)));
      default: throw new IllegalArgumentException(`bad fn ${c.fn}`);
    }
  }));
}
