// Shared code of the X-PIPE adapters (F35): JS twins of PipeOps rules/filters (docs/review/F35-oracle.md).
import { Pattern } from '../../src/lib/java/regex/index.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { AssertionError, IOException, IllegalArgumentException, IllegalStateException, RuntimeException, StackOverflowError } from '../../src/lib/java/errors.js';
import { make } from './_synth-rules.mjs';

export const notPorted = (what) => Object.assign(new Error(`not ported yet: ${what}`), { notPorted: true });

// Java: PipeOps.XRule (kind boom: throws; kind newlang: sets newLanguageMatches)
export class XRule extends Rule {
  constructor(spec) {
    super();
    this.id = String(spec.id);
    this.kind = String(spec.kind);
    this.how = spec.throw ?? null;
    this.pattern = Pattern.compile(String(spec.regex));
    this.langs = new Map(Object.entries(spec.newLanguages ?? {}).map(([k, v]) => [k, Math.fround(v)]));
  }

  getId() { return this.id; }

  getDescription() { return `Synthetic ${this.id}`; }

  // Java: PipeOps.XRule#match(AnalyzedSentence)
  match(sentence) {
    const out = [];
    const toks = sentence.getTokensWithoutWhitespace();
    for (let i = 1; i < toks.length; i++) {
      const tok = toks[i].getToken();
      if (tok.length === 0 || !this.pattern.matcher(tok).matches()) continue;
      if (this.kind === 'boom') {
        switch (this.how) {
          case 'runtime': throw new RuntimeException(`boom in ${this.id}`);
          case 'io': throw new IOException(`io boom in ${this.id}`);
          case 'illegal': throw new IllegalStateException('illegal boom');
          case 'so': throw new StackOverflowError();
          case 'assert': throw new AssertionError('assert boom');
          default: throw new IllegalArgumentException(this.how);
        }
      }
      const m = new RuleMatch(this, sentence, toks[i].getStartPos(), toks[i].getEndPos(), `new language ${tok}`);
      m.setNewLanguageMatches(new Map(this.langs));
      out.push(m);
    }
    return out;
  }
}

// Java: PipeOps#build(JsonNode)
export function build(spec) {
  const kind = spec.kind ?? null;
  const r = kind === 'boom' || kind === 'newlang' ? new XRule(spec) : make(spec);
  if (spec.officeDefaultOff === true) r.setOfficeDefaultOff();
  if (spec.officeDefaultOn === true) r.setOfficeDefaultOn();
  if (spec.defaultOff === true && r instanceof XRule) r.setDefaultOff();
  return r;
}

// Java: PipeOps#buildAll(JsonNode)
export const buildAll = (specs) => (specs ?? []).map(build);

// Java: PipeOps#filter(JsonNode)
export function filter(f) {
  const k = f.kind;
  return {
    filter(ms) {
      if (k === 'dropRule') return ms.filter((m) => m.getRule().getId() !== f.id);
      if (k === 'reverse') return [...ms].reverse();
      if (k === 'suffix') { for (const m of ms) m.setMessage(m.getMessage() + f.suffix + ms.length); return [...ms]; }
      throw new IllegalArgumentException(k);
    },
  };
}
