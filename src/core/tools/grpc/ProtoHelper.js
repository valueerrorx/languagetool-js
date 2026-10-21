// org.languagetool.tools.grpc.ProtoHelper
// Java: ProtoHelper#nullAsEmpty(String)
export function nullAsEmpty(s) {
  return s !== null && s !== undefined ? s : '';
}

// Java: ProtoHelper#emptyAsNull(String)
export function emptyAsNull(s) {
  if (s !== null && s !== undefined && s === '') return null;
  return s ?? null;
}

// Java: ProtoHelper#getUrl(RuleMatch)
export function getUrl(m) {
  // URL can be attached to Rule or RuleMatch (or both); in Protobuf, only to RuleMatch
  // prefer URL from RuleMatch, default to empty string
  if (m.getUrl() !== null && m.getUrl() !== undefined) return m.getUrl().toString();
  if (m.getRule().getUrl() !== null && m.getRule().getUrl() !== undefined) return m.getRule().getUrl().toString();
  return '';
}
