// Java: org.languagetool.tools.LoggingTools (slf4j markers: one instance per name, like MarkerFactory)
const MARKERS = new Map();

// Java: org.slf4j.MarkerFactory#getMarker(String)
export function getMarker(name) {
  if (!MARKERS.has(name)) MARKERS.set(name, Object.freeze({ getName: () => name, toString: () => name }));
  return MARKERS.get(name);
}

// Java: LoggingTools
export class LoggingTools {
  static FQCN = 'org.languagetool.tools.LoggingTools';
  static INIT = getMarker('INIT');
  static CHECK = getMarker('CHECK');
  static REQUEST = getMarker('REQUEST');
  static BAD_REQUEST = getMarker('BAD_REQUEST');
  static AUTH = getMarker('AUTH');
  static SYSTEM = getMarker('SYSTEM');
  static DB = getMarker('DB');
  static REDIS = getMarker('REDIS');
  static CACHE = getMarker('CACHE');
}
