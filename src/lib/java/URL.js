// java.net.URL subset: construction check and toString (rule URLs).
import { IOException } from './errors.js';

// Java: java.net.MalformedURLException
export class MalformedURLException extends IOException {
  static FQCN = 'java.net.MalformedURLException';
}

const PROTOCOLS = new Set(['http', 'https', 'ftp', 'file', 'jar', 'mailto', 'jrt']);

// Java: java.net.URL
export class URL {
  static FQCN = 'java.net.URL';

  // Java: URL#URL(String)
  constructor(spec) {
    if (spec === null || spec === undefined) throw new MalformedURLException(null);
    const m = /^[ \t\n\r\f\u0000- ]*([A-Za-z][A-Za-z0-9+.-]*):/.exec(spec);
    if (m === null) throw new MalformedURLException(`no protocol: ${spec}`);
    if (!PROTOCOLS.has(m[1].toLowerCase())) throw new MalformedURLException(`unknown protocol: ${m[1].toLowerCase()}`);
    this.spec = spec;
  }

  // Java: URL#toString()
  toString() {
    return this.spec;
  }
}
