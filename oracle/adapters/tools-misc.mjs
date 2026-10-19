// JS twin of harness op "tools-misc" (ToolsOps#misc, docs/review/F40-oracle.md).
import { createHash } from 'node:crypto';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { getFullStackTrace, getLinguisticServices, getStream, getUrl, i18n, isExternSpeller, isParagraphEnd, profileRulesOnLine, setLinguisticServices } from '../../src/core/Tools.js';
import { IOException, IllegalArgumentException, IllegalStateException, RuntimeException } from '../../src/lib/java/errors.js';
import { javaSplit } from '../../src/lib/java/strings.js';
import { errorOf, withNoopAnalysis } from './_check-pipe-common.mjs';
import { langFor, lt, notPorted, s } from './_bitext-common.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const strs = (n) => (n === undefined || n === null ? [] : n.map(String));

// Java: ToolsOps#misc(JsonNode)
export function run(a) {
  const res = {};
  try {
    switch (a.fn) {
      case 'stacktrace': {
        let t = new IllegalStateException(a.message);
        if (a.cause !== undefined) t = new RuntimeException(a.message, new IOException(a.cause));
        const st = getFullStackTrace(t);
        const lines = javaSplit(st, '\\R');
        res.firstLine = lines[0];
        res.hasAtLines = st.includes('\n\tat ');
        res.hasCausedBy = st.includes(`Caused by: java.io.IOException: ${a.cause !== undefined ? a.cause : ''}`) && a.cause !== undefined;
        res.endsWithNewline = st.endsWith('\n');
        break;
      }
      case 'getStream': {
        const path = a.path;
        let hash = s(a, 'hash');
        if (hash === 'SELF') {
          hash = sha(getStream(path));
          res.selfHashLength = hash.length;
        }
        if (a.hash !== undefined) {
          if (a.upper !== undefined) hash = hash.toUpperCase();
          const d = getStream(path, hash);
          res.length = d.length;
          res.sha256 = sha(d);
        } else {
          const d = getStream(path);
          res.length = d.length;
          res.sha256 = sha(d);
        }
        break;
      }
      case 'getUrl': {
        const u = getUrl(a.url);
        res.url = u.toString();
        res.protocol = u.getProtocol();
        res.host = u.getHost();
        res.path = u.getPath();
        break;
      }
      case 'paragraphEnd': {
        const l = lt(a.lang, null);
        const texts = a.sentences !== undefined ? strs(a.sentences) : l.sentenceTokenize(a.text);
        // isParagraphEnd reads only the sentence texts
        const sents = withNoopAnalysis(l.getLanguage(), true, () => texts.map((t) => l.getAnalyzedSentence(t)));
        res.sentences = texts;
        res.singleLineBreaksMarksPara = l.getLanguage().getSentenceTokenizer().singleLineBreaksMarksPara();
        const r = [];
        const lo = a.lo !== undefined ? a.lo : 0;
        const hi = a.hi !== undefined ? a.hi : texts.length + 1;
        for (let n = lo; n <= hi; n++) r.push(isParagraphEnd(sents, n, l.getLanguage()));
        res.lo = lo;
        res.results = r;
        break;
      }
      case 'profile': {
        const l = lt(a.lang, null);
        let rule = null;
        for (const x of l.getAllRules()) if (x.getId() === a.ruleId) { rule = x; break; }
        if (rule === null) throw notPorted(`tools-misc profile: rule ${a.ruleId} (built-in Java rules not ported, F45+)`);
        res.ruleFound = true;
        res.count = profileRulesOnLine(a.text, l, rule);
        break;
      }
      case 'linguServices': {
        res.isExternSpeller = isExternSpeller();
        res.services = getLinguisticServices();
        setLinguisticServices(null);
        res.afterSetNull = isExternSpeller();
        break;
      }
      case 'i18n': {
        const mb = JLanguageTool.getMessageBundle(langFor(a.lang));
        res.text = i18n(mb, a.key, ...a.args.map((x) => (typeof x === 'number' ? x : String(x))));
        break;
      }
      default: throw new IllegalArgumentException(`fn ${JSON.stringify(a.fn)}`);
    }
  } catch (t) {
    res.error = errorOf(t);
  }
  return res;
}
