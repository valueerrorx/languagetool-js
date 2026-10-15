// JS twins of the oracle's synthetic test rules (SynthRules.java, docs/review/F15-oracle.md); test fixtures, not production.
import { Pattern } from '../../src/lib/java/regex/index.js';
import { javaReplace } from '../../src/lib/java/strings.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { TextLevelRule } from '../../src/core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { Category, CategoryId, Location } from '../../src/core/rules/model/Category.js';

export const PREFIX = 'SYN_';

// Java: SynthRules#s(JsonNode,String)
const s = (n, k) => (n[k] !== undefined && n[k] !== null ? String(n[k]) : null);

// Java: java.net.URL (only toString of the spec string is observed)
export class JavaURL {
  static FQCN = 'java.net.URL';

  constructor(spec) {
    this.spec = spec;
  }

  toString() {
    return this.spec;
  }
}

// Java: SynthRules#configure(Rule,JsonNode)
function configure(r, spec) {
  if (spec.category !== undefined && spec.category !== null) {
    const c = spec.category;
    const defaultOff = c.defaultOff === true;
    const loc = c.location !== undefined ? Location.valueOf(String(c.location)) : Location.INTERNAL;
    r.setCategory(new Category(new CategoryId(String(c.id)), c.name !== undefined ? String(c.name) : `Synthetic ${c.id}`, loc, !defaultOff));
  }
  if (spec.defaultOff === true) r.setDefaultOff();
  if (spec.defaultTempOff === true) r.setDefaultTempOff();
  if (spec.tags !== undefined) r.addTags(spec.tags.map(String));
  if (spec.toneTags !== undefined) r.addToneTags(spec.toneTags.map(String));
  if (spec.goalSpecific !== undefined) r.setGoalSpecific(spec.goalSpecific === true);
  if (s(spec, 'url') !== null) r.setUrl(new JavaURL(s(spec, 'url')));
}

// Java: SynthRules#make(JsonNode)
export function make(spec) {
  const kind = s(spec, 'kind');
  const r = kind === 'text' ? new TextRule(spec) : new WordRule(spec);
  configure(r, spec);
  return r;
}

// Java: SynthRules#makeAll(JsonNode)
export function makeAll(specs) {
  const l = [];
  if (specs !== undefined && specs !== null) for (const sp of specs) l.push(make(sp));
  return l;
}

// Java: SynthRules#subst(String,String)
const subst = (t, tok) => (t === null ? null : javaReplace(t, '{t}', tok));

// Java: SynthRules.WordRule (matches each non-whitespace token, not SENT_START, whose text fully matches `regex`)
export class WordRule extends Rule {
  constructor(spec) {
    super();
    this.id = s(spec, 'id');
    this.subId = s(spec, 'subId');
    this.description = s(spec, 'description') !== null ? s(spec, 'description') : `Synthetic ${this.id}`;
    this.message = s(spec, 'message') !== null ? s(spec, 'message') : `msg ${this.id}`;
    this.shortMessage = s(spec, 'shortMessage');
    this.url = s(spec, 'url');
    this.pattern = Pattern.compile(String(spec.regex));
    this.suggestions = (spec.suggestions ?? []).map(String);
  }

  getId() { return this.id; }

  getSubId() { return this.subId; }

  getDescription() { return this.description; }

  // Java: WordRule#match(AnalyzedSentence)
  match(sentence) {
    const out = [];
    const toks = sentence.getTokensWithoutWhitespace();
    for (let i = 1; i < toks.length; i++) {
      const tok = toks[i].getToken();
      if (tok.length === 0 || !this.pattern.matcher(tok).matches()) continue;
      const m = new RuleMatch(this, sentence, toks[i].getStartPos(), toks[i].getEndPos(), subst(this.message, tok), subst(this.shortMessage, tok));
      m.setSuggestedReplacements(this.suggestions.map((x) => subst(x, tok)));
      if (this.url !== null) m.setUrl(new JavaURL(this.url));
      out.push(m);
    }
    return out;
  }
}

// Java: SynthRules.TextRule (every non-empty find() of `regex` over the concatenated sentence texts)
export class TextRule extends TextLevelRule {
  constructor(spec) {
    super();
    this.id = s(spec, 'id');
    this.subId = s(spec, 'subId');
    this.description = s(spec, 'description') !== null ? s(spec, 'description') : `Synthetic ${this.id}`;
    this.message = s(spec, 'message') !== null ? s(spec, 'message') : `msg ${this.id}`;
    this.shortMessage = s(spec, 'shortMessage');
    this.url = s(spec, 'url');
    this.pattern = Pattern.compile(String(spec.regex));
    this.minToCheck = spec.minToCheckParagraph ?? 0;
    this.shiftFrom = spec.shiftFrom ?? 0;
    this.shiftTo = spec.shiftTo ?? 0;
    this.suggestions = (spec.suggestions ?? []).map(String);
  }

  getId() { return this.id; }

  getSubId() { return this.subId; }

  getDescription() { return this.description; }

  minToCheckParagraph() { return this.minToCheck; }

  // Java: TextRule#match(List<AnalyzedSentence>)
  match(sentences) {
    let sb = '';
    const starts = [];
    for (const a of sentences) { starts.push(sb.length); sb += a.getText(); }
    const out = [];
    const mt = this.pattern.matcher(sb);
    while (mt.find()) {
      if (mt.end() === mt.start()) continue;
      let k = 0;
      while (k + 1 < starts.length && starts[k + 1] <= mt.start()) k++;
      const tok = mt.group();
      const m = new RuleMatch(this, sentences[k], mt.start() + this.shiftFrom, mt.end() + this.shiftTo, subst(this.message, tok), subst(this.shortMessage, tok));
      m.setSuggestedReplacements(this.suggestions.map((x) => subst(x, tok)));
      if (this.url !== null) m.setUrl(new JavaURL(this.url));
      out.push(m);
    }
    return out;
  }
}
