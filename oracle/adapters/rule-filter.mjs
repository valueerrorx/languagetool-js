// JS twin of harness op "rule-filter" (RuleInfraOps#ruleFilter): RuleFilterEvaluator and RuleFilter helpers via an echo subclass.
import { resetState, sentences } from './_unify-common.mjs';
import { err, lang, optional, resolve } from './_ruleinfra-common.mjs';
import { RuleFilter } from '../../src/core/patterns/RuleFilter.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';
import { IllegalArgumentException, IllegalStateException, IOException } from '../../src/lib/java/errors.js';

export function beginCase() { resetState(); }

// Java: RuleInfraOps#pairs(Map)
function pairs(m) {
  if (m instanceof Map) return [...m.entries()].map(([k, v]) => [k, v]);
  return m.entrySet().map((e) => [e[0], e[1]]);
}

// Java: RuleInfraOps.Echo
class Echo extends RuleFilter {
  seen = null;

  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    this.seen = {
      args: pairs(args), patternTokenPos, tokens: patternTokens.map((t) => t.getToken()), tokenPositions: [...tokenPositions],
      match: match === null ? null : [match.getFromPos(), match.getToPos(), match.getMessage()],
    };
    if (args.containsKey('throw')) throw new IllegalStateException('boom');
    if (args.containsKey('io')) throw new IOException('io-boom');
    if (args.containsKey('reject')) return null;
    return match;
  }
}

// Java: RuleInfraOps.FakeRule
class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'fake'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

// Java: RuleInfraOps#pairMap(JsonNode)
function pairMap(n) {
  const m = new JavaHashMap();
  if (n !== undefined && n !== null) for (const p of n) m.put(p[0], p[1] === undefined ? null : p[1]);
  return m;
}

// Java: RuleInfraOps#tokens(Language,JsonNode)
function tokens(l, a) {
  let all;
  if (a.text !== undefined) {
    const s = sentences(l, a.lang, [a.text], null)[0];
    all = s.getTokensWithoutWhitespace();
  } else {
    all = [];
    let pos = 0;
    for (const t of a.tokens) {
      all.push(new AnalyzedTokenReadings(new AnalyzedToken(t, null, null), pos));
      pos += t.length;
    }
  }
  return a.window !== undefined ? all.slice(a.window[0], a.window[1]) : all;
}

// Java: RuleInfraOps#ruleFilter(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  try {
    const echo = new Echo();
    switch (a.kind) {
      case 'resolve': {
        const { RuleFilterEvaluator } = await optional('core/patterns/RuleFilterEvaluator.js', 'RuleFilterEvaluator (F30)');
        const t = tokens(l, a);
        const r = new RuleFilterEvaluator(echo).getResolvedArguments(a.filterArgs, t, a.patternTokenPos, [...a.tokenPositions]);
        return { pairs: pairs(r) };
      }
      case 'run': {
        const { RuleFilterEvaluator } = await optional('core/patterns/RuleFilterEvaluator.js', 'RuleFilterEvaluator (F30)');
        const t = tokens(l, a);
        const rule = a.src !== undefined ? resolve(a.src, a) : new FakeRule();
        const m = new RuleMatch(rule, null, a.from ?? 0, a.to ?? 1, 'msg');
        const res = new RuleFilterEvaluator(echo).runFilter(a.filterArgs, m, t, a.patternTokenPos, [...a.tokenPositions]);
        return { result: res === null ? null : (res === m ? 'same' : 'other'), seen: echo.seen };
      }
      case 'helper': return helper(a, l, echo);
      default: throw new IllegalArgumentException(`unknown kind ${a.kind}`);
    }
  } catch (t) { return err(t); }
}

// Java: RuleInfraOps#ruleFilter case "helper"
function helper(a, l, echo) {
  const map = pairMap(a.map);
  switch (a.method) {
    case 'getRequired': return { value: echo.getRequired(a.key, map) };
    case 'getOptional': return { value: echo.getOptional(a.key, map) };
    case 'getOptional3': return { value: echo.getOptional(a.key, map, a.default ?? null) };
    case 'getSkipCorrectedReference': return { value: echo.getSkipCorrectedReference([...a.tokenPositions], a.ref) };
    case 'matches': {
      const t = tokens(l, a);
      const b = echo.matches(map, t, a.first, [...a.tokenPositions]);
      return { value: b, seen: echo.seen };
    }
    case 'getPosition':
    case 'isMatchAtSentenceStart': {
      const t = tokens(l, a);
      const rule = a.src !== undefined ? resolve(a.src, a) : new FakeRule();
      const m = new RuleMatch(rule, null, a.from, a.to !== undefined ? a.to : a.from + 1, 'msg');
      if (a.method === 'getPosition') return { value: echo.getPosition(a.str, t, m) };
      return { value: echo.isMatchAtSentenceStart(t, m) };
    }
    case 'getLanguageFromRuleMatch': {
      const rule = a.src !== undefined ? resolve(a.src, a) : new FakeRule();
      const m = new RuleMatch(rule, null, 0, 1, 'msg');
      if (a.setLang !== undefined) echo.setLanguage(a.setLang === null ? null : lang(a.setLang));
      const r = echo.getLanguageFromRuleMatch(m);
      return { value: r === null ? null : r.getShortCodeWithCountryAndVariant(), getLanguage: echo.getLanguage() === null ? null : echo.getLanguage().getShortCodeWithCountryAndVariant() };
    }
    default: throw new IllegalArgumentException(`unknown helper ${a.method}`);
  }
}
