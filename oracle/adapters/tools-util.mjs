// JS twin of harness op "tools-util" (ToolsOps#util, docs/review/F40-oracle.md).
import { TestHackHelper } from '../../src/core/rules/TestHackHelper.js';
import { UnsyncStack } from '../../src/core/rules/UnsyncStack.js';
import { TranslationData } from '../../src/core/rules/translation/TranslationData.js';
import { TranslationEntry } from '../../src/core/rules/translation/TranslationEntry.js';
import { InterruptibleCharSequence } from '../../src/core/tools/InterruptibleCharSequence.js';
import { JnaTools } from '../../src/core/tools/JnaTools.js';
import { getMarker, LoggingTools } from '../../src/core/tools/LoggingTools.js';
import { MostlySingularMultiMap } from '../../src/core/tools/MostlySingularMultiMap.js';
import { MultiKeyProperties } from '../../src/core/tools/MultiKeyProperties.js';
import { StringInterner } from '../../src/core/tools/StringInterner.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { Pattern } from '../../src/lib/java/regex/Pattern.js';
import { System } from '../../src/lib/java/System.js';
import { Thread } from '../../src/lib/java/Thread.js';
import { abstractCollectionToString } from '../../src/lib/java/toString.js';
import { errorOf } from './_check-pipe-common.mjs';
import { notPorted } from './_bitext-common.mjs';

const strs = (n) => (n === undefined || n === null ? [] : n.map(String));

// Java: ToolsOps#util(JsonNode)
export function run(a) {
  const res = {};
  try {
    switch (a.kind) {
      case 'multikey': {
        const p = new MultiKeyProperties(Buffer.from(a.content, 'utf8'));
        const vals = {};
        for (const k of a.keys) vals[k] = p.getProperty(k);
        res.values = vals;
        break;
      }
      case 'ics': {
        const q = new InterruptibleCharSequence(a.text);
        res.length = q.length();
        res.toString = q.toString();
        if (a.charAt !== undefined) {
          res.charAt = a.charAt.map((i) => {
            try {
              return String.fromCharCode(q.charAt(i));
            } catch (t) {
              return errorOf(t);
            }
          });
        }
        if (a.sub !== undefined) {
          try {
            const sub = q.subSequence(a.sub[0], a.sub[1]);
            res.sub = sub.toString();
            res.subClass = sub.constructor.name;
          } catch (t) {
            res.subError = errorOf(t);
          }
        }
        if (a.regex !== undefined) {
          const m = Pattern.compile(a.regex).matcher(q.toString());
          const hits = [];
          while (m.find()) hits.push([m.start(), m.end(), m.group()]);
          res.hits = hits;
        }
        if (a.interrupted === true) {
          if (a.regex !== undefined) throw notPorted('tools-util ics: regex engines of the port never call charAt (interruption of Matcher.find not modelled)');
          Thread.currentThread().interrupt();
          try {
            res.charAtAfterInterrupt = String.fromCharCode(q.charAt(0));
          } catch (t) {
            res.interruptError = errorOf(t);
          }
          res.flagAfter = Thread.currentThread().isInterrupted();
          Thread.interrupted();
        }
        break;
      }
      case 'msmm': {
        const src = new Map();
        for (const [k, v] of Object.entries(a.contents)) src.set(k, strs(v));
        const m = new MostlySingularMultiMap(src);
        const vals = {};
        for (const k of a.keys) vals[k] = m.getList(k);
        res.values = vals;
        break;
      }
      case 'stack': {
        const st = new UnsyncStack();
        const log = [];
        for (const o of a.ops) {
          try {
            switch (o[0]) {
              case 'push': log.push(st.push(String(o[1]))); break;
              case 'pop': log.push(st.pop()); break;
              case 'peek': log.push(st.peek()); break;
              case 'empty': log.push(st.empty()); break;
              case 'search': log.push(st.search(String(o[1]))); break;
              case 'size': log.push(st.size()); break;
              case 'toString': log.push(st.toString()); break;
              default: log.push('?');
            }
          } catch (t) {
            log.push(errorOf(t));
          }
        }
        res.log = log;
        break;
      }
      case 'interner': {
        res.results = a.strings.map((x) => {
          const orig = String(x);
          const i1 = StringInterner.intern(orig);
          const i2 = StringInterner.intern(String(x));
          return [i1, i1 === orig, i1 === i2];
        });
        break;
      }
      case 'markers': {
        res.markers = [LoggingTools.INIT, LoggingTools.CHECK, LoggingTools.REQUEST, LoggingTools.BAD_REQUEST, LoggingTools.AUTH, LoggingTools.SYSTEM, LoggingTools.DB, LoggingTools.REDIS, LoggingTools.CACHE].map((x) => x.getName());
        res.sameInstance = LoggingTools.REQUEST === getMarker('REQUEST');
        break;
      }
      case 'jna': {
        res.before = System.getProperty('jna.nosys');
        JnaTools.setBugWorkaroundProperty();
        res.after = System.getProperty('jna.nosys');
        break;
      }
      case 'testHack': {
        res.isJUnitTest = TestHackHelper.isJUnitTest();
        break;
      }
      case 'translation': {
        const r = [];
        for (const e of a.entries) {
          const t = new TranslationEntry(strs(e.l1), strs(e.l2), e.n);
          const u = new TranslationEntry(strs(e.l1), strs(e.l2), e.n + 1);
          r.push({
            toString: t.toString(),
            itemCount: t.getItemCount(),
            equalsOtherCount: t.equals(u),
            equalsSelf: t.equals(t),
            equalsNull: t.equals(null),
            equalsString: t.equals('x'),
            hashEqual: t.hashCode() === u.hashCode(),
            hash: t.hashCode(),
          });
        }
        res.entries = r;
        try {
          new TranslationEntry(null, [], 1);
        } catch (t) {
          res.nullL1 = errorOf(t);
        }
        const d = new TranslationData([new TranslationEntry(['a'], ['b'], 1)], null);
        res.data = abstractCollectionToString(d.getTranslations());
        break;
      }
      default: throw new IllegalArgumentException(`kind ${JSON.stringify(a.kind)}`);
    }
  } catch (t) {
    res.error = errorOf(t);
  }
  return res;
}
