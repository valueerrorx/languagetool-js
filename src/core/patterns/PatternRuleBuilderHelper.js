// org.languagetool.rules.patterns.PatternRuleBuilderHelper (static shortcuts for PatternTokenBuilder)
import { PatternTokenBuilder } from './PatternTokenBuilder.js';

// Java: PatternRuleBuilderHelper#tokenRegex(String)
export function tokenRegex(s) {
  return new PatternTokenBuilder().tokenRegex(s).build();
}

// Java: PatternRuleBuilderHelper#posRegex(String)
export function posRegex(s) {
  return new PatternTokenBuilder().posRegex(s).build();
}

// Java: PatternRuleBuilderHelper#csToken(String)
export function csToken(s) {
  return new PatternTokenBuilder().csToken(s).build();
}

// Java: PatternRuleBuilderHelper#pos(String)
export function pos(s) {
  return new PatternTokenBuilder().pos(s).build();
}

// Java: PatternRuleBuilderHelper#token(String)
export function token(s) {
  return new PatternTokenBuilder().token(s).build();
}

// Java: PatternRuleBuilderHelper#regex(String)
export function regex(regexp) {
  return new PatternTokenBuilder().tokenRegex(regexp).build();
}

// Java: PatternRuleBuilderHelper#csRegex(String)
export function csRegex(regexp) {
  return new PatternTokenBuilder().csTokenRegex(regexp).build();
}

export const PatternRuleBuilderHelper = { tokenRegex, posRegex, csToken, pos, token, regex, csRegex };
