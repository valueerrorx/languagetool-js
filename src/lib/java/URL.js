// java.net.URL subset (JDK 17.0.x, from javap of java.base): URL(String) with the built-in protocol handlers http, https, ftp, file, jar, jrt, jmod, mailto.
import { Exception, IOException, IllegalArgumentException, NullPointerException, NumberFormatException, RuntimeException } from './errors.js';
import { digit, isLetter, isLetterOrDigit, isWhitespace } from './Character.js';
import { Locale } from './Locale.js';
import { indexOf, lastIndexOf, regionMatches, toLowerCase } from './strings.js';

// Java: java.net.MalformedURLException
export class MalformedURLException extends IOException {
  static FQCN = 'java.net.MalformedURLException';
}

const npe = (msg) => new NullPointerException(msg);

// Java: IPAddressUtil#digit(char,int) (jdk.net.allowAmbiguousIPAddressLiterals=false: ASCII digits only)
function ipDigit(ch, radix) {
  const c = ch.charCodeAt(0);
  if (radix === 16) {
    const lc = c >= 0x41 && c <= 0x5a ? c + 32 : c;
    if (lc >= 0x61 && lc <= 0x66) return lc - 0x61 + 10;
  }
  const d = c - 0x30;
  return d < 0 || d >= (radix === 16 ? 10 : radix) ? -1 : d;
}

// Java: IPAddressUtil#textToNumericFormatV4(String) != null
function isNumericFormatV4(src) {
  let currByte = 0;
  let octets = 0;
  let newOctet = true;
  const len = src.length;
  if (len === 0 || len > 15) return false;
  for (let pos = 0; pos < len; pos++) {
    const c = src.charAt(pos);
    if (c === '.') {
      if (newOctet || currByte < 0 || currByte > 255 || octets === 3) return false;
      octets++;
      currByte = 0;
      newOctet = true;
    } else {
      const d = ipDigit(c, 10);
      if (d < 0) return false;
      currByte = currByte * 10 + d;
      newOctet = false;
    }
  }
  return !(newOctet || currByte < 0 || currByte >= 2 ** ((4 - octets) * 8));
}

// Java: IPAddressUtil#textToNumericFormatV6(String) != null
function isNumericFormatV6(src) {
  if (src.length < 2) return false;
  let srcbLength = src.length;
  const pc = src.indexOf('%');
  if (pc === srcbLength - 1) return false;
  if (pc !== -1) srcbLength = pc;
  let colonp = -1;
  let i = 0;
  let j = 0;
  if (src.charAt(i) === ':') {
    if (src.charAt(++i) !== ':') return false;
  }
  let curtok = i;
  let sawXdigit = false;
  let val = 0;
  while (i < srcbLength) {
    const ch = src.charAt(i++);
    const chval = ipDigit(ch, 16);
    if (chval !== -1) {
      val <<= 4;
      val |= chval;
      if (val > 0xffff) return false;
      sawXdigit = true;
      continue;
    }
    if (ch === ':') {
      curtok = i;
      if (!sawXdigit) {
        if (colonp !== -1) return false;
        colonp = j;
        continue;
      } else if (i === srcbLength) {
        return false;
      }
      if (j + 2 > 16) return false;
      j += 2;
      sawXdigit = false;
      val = 0;
      continue;
    }
    if (ch === '.' && j + 4 <= 16) {
      const ia4 = src.substring(curtok, srcbLength);
      let dotCount = 0;
      let index = 0;
      while ((index = ia4.indexOf('.', index)) !== -1) {
        dotCount++;
        index++;
      }
      if (dotCount !== 3) return false;
      if (!isNumericFormatV4(ia4)) return false;
      j += 4;
      sawXdigit = false;
      break;
    }
    return false;
  }
  if (sawXdigit) {
    if (j + 2 > 16) return false;
    j += 2;
  }
  if (colonp !== -1) {
    if (j === 16) return false;
    j = 16;
  }
  return j === 16;
}

// Java: IPAddressUtil#OTHERS (sorted)
const OTHERS = [8263, 8264, 8265, 8448, 8449, 8453, 8454, 10868, 65109, 65110, 65119, 65131, 65283, 65295, 65306, 65311, 65312];

// Java: IPAddressUtil#describeChar(char)
function describeChar(c) {
  const code = c.charCodeAt(0);
  if (code < 32 || code === 127) {
    if (code === 10) return 'LF';
    if (code === 13) return 'CR';
    return `control char (code=${code})`;
  }
  if (code === 92) return "'\\'";
  return `'${c}'`;
}

// Java: IPAddressUtil#checkHostString(String)
function checkHostString(host) {
  if (host === null) return null;
  for (let i = 0; i < host.length; i++) {
    const c = host.charCodeAt(i);
    if (c < 32 || c === 47 || c === 127 || OTHERS.includes(c)) return `Illegal character found in host: ${describeChar(host.charAt(i))}`;
  }
  return null;
}

// Java: Integer#parseInt(CharSequence,int,int,int) with radix 10
function parseIntRange(s, beginIndex, endIndex) {
  const err = (i) => new NumberFormatException(`Error at index ${i - beginIndex} in: "${s.substring(beginIndex, endIndex)}"`);
  let negative = false;
  let i = beginIndex;
  let limit = -2147483647;
  if (i < endIndex) {
    const firstChar = s.charCodeAt(i);
    if (firstChar < 0x30) {
      if (firstChar === 0x2d) {
        negative = true;
        limit = -2147483648;
      } else if (firstChar !== 0x2b) {
        throw err(i);
      }
      i++;
      if (i === endIndex) throw err(i);
    }
    const multmin = Math.trunc(limit / 10);
    let result = 0;
    while (i < endIndex) {
      const d = digit(s.charCodeAt(i), 10);
      if (d < 0 || result < multmin) throw err(i);
      result *= 10;
      if (result < limit + d) throw err(i);
      i++;
      result -= d;
    }
    return negative ? result : -result;
  }
  throw new NumberFormatException('');
}

// Java: URL#isValidProtocol(String)
function isValidProtocol(protocol) {
  const len = protocol.length;
  if (len < 1) return false;
  let c = protocol.charCodeAt(0);
  if (!isLetter(c)) return false;
  for (let i = 1; i < len; i++) {
    c = protocol.charCodeAt(i);
    if (!isLetterOrDigit(c) && c !== 0x2e && c !== 0x2b && c !== 0x2d) return false;
  }
  return true;
}

// Java: URLStreamHandler#setURL(URL,String,String,int,String,String,String,String,String)
function setURL9(u, protocol, host, port, authority, userInfo, path, query, ref) {
  if (host !== null) {
    const s = checkHostString(host); // the built-in handlers are all in sun.net.www.protocol
    if (s !== null) throw new IllegalArgumentException(s);
  }
  u.set(u.getProtocol(), host, port, authority, userInfo, path, query, ref);
}

// Java: URLStreamHandler#setURL(URL,String,String,int,String,String)
function setURL6(u, protocol, host, port, file, ref) {
  let authority = null;
  let userInfo = null;
  if (host !== null && host.length > 0) {
    authority = port === -1 ? host : `${host}:${port}`;
    const at = host.lastIndexOf('@');
    if (at !== -1) {
      userInfo = host.substring(0, at);
      host = host.substring(at + 1);
    }
  }
  let path = null;
  let query = null;
  if (file !== null) {
    const q = file.lastIndexOf('?');
    if (q !== -1) {
      query = file.substring(q + 1);
      path = file.substring(0, q);
    } else {
      path = file;
    }
  }
  setURL9(u, protocol, host, port, authority, userInfo, path, query, ref);
}

// Java: URLStreamHandler#parseURL(URL,String,int,int) (relative-path normalisation needs a context URL and cannot run here)
function parseURLDefault(u, spec, start, limit) {
  const protocol = u.getProtocol();
  let authority = u.getAuthority();
  let userInfo = u.getUserInfo();
  let host = u.getHost();
  let port = u.getPort();
  let path = u.getPath();
  let query = u.getQuery();
  const ref = u.getRef();
  let queryOnly = false;
  if (start < limit) {
    const queryStart = spec.indexOf('?');
    queryOnly = queryStart === start;
    if (queryStart !== -1 && queryStart < limit) {
      query = spec.substring(queryStart + 1, limit);
      if (limit > queryStart) limit = queryStart;
      spec = spec.substring(0, queryStart);
    }
  }
  let i = 0;
  const isUNCName = start <= limit - 4 && spec.charAt(start) === '/' && spec.charAt(start + 1) === '/'
    && spec.charAt(start + 2) === '/' && spec.charAt(start + 3) === '/';
  if (!isUNCName && start <= limit - 2 && spec.charAt(start) === '/' && spec.charAt(start + 1) === '/') {
    start += 2;
    i = spec.indexOf('/', start);
    if (i < 0 || i > limit) {
      i = spec.indexOf('?', start);
      if (i < 0 || i > limit) i = limit;
    }
    host = authority = spec.substring(start, i);
    let ind = authority.indexOf('@');
    if (ind !== -1) {
      if (ind !== authority.lastIndexOf('@')) {
        // more than one '@' in authority. This is not server based
        userInfo = null;
        host = null;
      } else {
        userInfo = authority.substring(0, ind);
        host = authority.substring(ind + 1);
      }
    } else {
      userInfo = null;
    }
    if (host !== null) {
      // If the host is surrounded by [ and ] then its an IPv6 literal address as specified in RFC2732
      if (host.length > 0 && host.charAt(0) === '[') {
        if ((ind = host.indexOf(']')) > 2) {
          const nhost = host;
          host = nhost.substring(0, ind + 1);
          if (!isNumericFormatV6(host.substring(1, ind))) throw new IllegalArgumentException(`Invalid host: ${host}`);
          port = -1;
          if (nhost.length > ind + 1) {
            if (nhost.charAt(ind + 1) === ':') {
              ++ind;
              // port can be null according to RFC2396
              if (nhost.length > ind + 1) port = parseIntRange(nhost, ind + 1, nhost.length);
            } else {
              throw new IllegalArgumentException(`Invalid authority field: ${authority}`);
            }
          }
        } else {
          throw new IllegalArgumentException(`Invalid authority field: ${authority}`);
        }
      } else {
        ind = host.indexOf(':');
        port = -1;
        if (ind >= 0) {
          // port can be null according to RFC2396
          if (host.length > ind + 1) port = parseIntRange(host, ind + 1, host.length);
          host = host.substring(0, ind);
        }
      }
    } else {
      host = '';
    }
    if (port < -1) throw new IllegalArgumentException(`Invalid port number :${port}`);
    start = i;
    // If the authority is defined then the path is defined by the spec only; See RFC 2396 Section 5.2.4.
    if (authority !== null && authority.length > 0) path = '';
  }
  if (host === null) host = '';
  // Parse the file path if any
  if (start < limit) {
    if (spec.charAt(start) === '/') {
      path = spec.substring(start, limit);
    } else if (path !== null && path.length > 0) {
      // unreachable without a context URL: path is null or empty here
      const ind = path.lastIndexOf('/');
      const separator = ind === -1 && authority !== null ? '/' : '';
      path = path.substring(0, ind + 1) + separator + spec.substring(start, limit);
    } else {
      path = spec.substring(start, limit);
      path = authority !== null ? `/${path}` : path;
    }
  } else if (queryOnly && path !== null) {
    let ind = path.lastIndexOf('/');
    if (ind < 0) ind = 0;
    path = `${path.substring(0, ind)}/`;
  }
  if (path === null) path = '';
  setURL9(u, protocol, host, port, authority, userInfo, path, query, ref);
}

// Java: sun.net.www.protocol.mailto.Handler#parseURL(URL,String,int,int)
function parseURLMailto(u, spec, start, limit) {
  const protocol = u.getProtocol();
  const host = '';
  const port = u.getPort();
  let file = '';
  if (start < limit) file = spec.substring(start, limit);
  let invalid = false;
  if (file === null || file.length === 0) {
    invalid = true;
  } else {
    let allWhitespace = true;
    for (let k = 0; k < file.length; k++) {
      if (!isWhitespace(file.charCodeAt(k))) allWhitespace = false;
    }
    if (allWhitespace) invalid = true;
  }
  if (invalid) throw new RuntimeException('No email address');
  setURL6(u, protocol, host, port, file, null);
}

// Java: sun.net.www.protocol.jar.Handler#indexOfBangSlash(String)
function indexOfBangSlash(spec) {
  if (spec === null) throw npe('Cannot invoke "String.length()" because "spec" is null');
  let i = spec.length;
  while ((i = lastIndexOf(spec, '!', i)) !== -1) {
    if (i !== spec.length - 1 && spec.charAt(i + 1) === '/') return i + 1;
    i--;
  }
  return -1;
}

// Java: sun.net.www.protocol.jar.Handler#parseAbsoluteSpec(String)
function jarParseAbsoluteSpec(spec) {
  const index = indexOfBangSlash(spec);
  if (index === -1) throw npe('no !/ in spec');
  try {
    const innerSpec = spec.substring(0, index - 1);
    new URL(innerSpec);
  } catch (e) {
    if (e instanceof MalformedURLException) throw npe(`invalid url: ${spec} (${e})`);
    throw e;
  }
  return spec;
}

// Java: sun.net.www.protocol.jar.Handler#parseContextSpec(URL,String) (a URL without context has no file)
function jarParseContextSpec(url, spec) {
  let ctxFile = url.getFile();
  if (spec.startsWith('/')) {
    const bangSlash = indexOfBangSlash(ctxFile);
    if (bangSlash === -1) throw npe(`malformed context url:${url}: no !/`);
    ctxFile = ctxFile.substring(0, bangSlash);
  } else {
    if (ctxFile === null) throw npe('Cannot invoke "String.lastIndexOf(int)" because "ctxFile" is null');
  }
  return ctxFile + spec; // unreachable: ctxFile is always null here
}

// Java: sun.net.www.protocol.jar.Handler#parseURL(URL,String,int,int)
function parseURLJar(url, spec, start, limit) {
  let file = null;
  let ref = null;
  const refPos = indexOf(spec, '#', limit);
  const refOnly = refPos === start;
  if (refPos > -1) {
    ref = spec.substring(refPos + 1, spec.length);
    if (refOnly) file = url.getFile();
  }
  const absoluteSpec = spec.length >= 4 ? regionMatches(spec, true, 0, 'jar:', 0, 4) : false;
  spec = spec.substring(start, limit);
  const nestedProtocolError = regionMatches(spec, true, 0, 'jar:', 0, 4) ? 'Nested JAR URLs are not supported' : null; // Handler#checkNestedProtocol
  if (nestedProtocolError !== null) throw new NullPointerException(nestedProtocolError);
  if (absoluteSpec) {
    file = jarParseAbsoluteSpec(spec);
  } else if (!refOnly) {
    file = jarParseContextSpec(url, spec); // always throws without a context URL
  }
  setURL6(url, 'jar', '', -1, file, ref);
}

const DEFAULT_HANDLER = { parseURL: parseURLDefault };
const HANDLERS = {
  http: DEFAULT_HANDLER,
  https: DEFAULT_HANDLER,
  ftp: DEFAULT_HANDLER,
  file: DEFAULT_HANDLER, // file.Handler#parseURL replaces File.separatorChar '/' by '/'
  jrt: DEFAULT_HANDLER,
  jmod: DEFAULT_HANDLER,
  mailto: { parseURL: parseURLMailto },
  jar: { parseURL: parseURLJar },
};

// Java: URL#getURLStreamHandler(String) (no factory, no providers, no java.protocol.handler.pkgs; sun.net.www.protocol.<protocol>.Handler classes of java.base)
function getURLStreamHandler(protocol) {
  return Object.hasOwn(HANDLERS, protocol) ? HANDLERS[protocol] : null;
}

// Java: java.net.URL
export class URL {
  static FQCN = 'java.net.URL';

  // Java: URL#URL(String) -> URL(URL,String,URLStreamHandler) with a null context and handler
  constructor(spec) {
    this.protocol = null;
    this.host = null;
    this.port = -1;
    this.file = null;
    this.query = null;
    this.authority = null;
    this.path = null;
    this.userInfo = null;
    this.ref = null;
    const original = spec;
    try {
      if (spec === null || spec === undefined) throw npe('Cannot invoke "String.length()" because "spec" is null');
      let limit = spec.length;
      let start = 0;
      let newProtocol = null;
      let aRef = false;
      while (limit > 0 && spec.charCodeAt(limit - 1) <= 0x20) limit--; // eliminate trailing whitespace
      while (start < limit && spec.charCodeAt(start) <= 0x20) start++; // eliminate leading whitespace
      if (regionMatches(spec, true, start, 'url:', 0, 4)) start += 4;
      if (start < spec.length && spec.charAt(start) === '#') {
        // we're assuming this is a ref relative to the context URL
        aRef = true;
      }
      for (let i = start; !aRef && i < limit && spec.charAt(i) !== '/'; i++) {
        if (spec.charAt(i) === ':') {
          const s = toLowerCase(spec.substring(start, i), Locale.ROOT);
          if (isValidProtocol(s)) {
            newProtocol = s;
            start = i + 1;
          }
          break;
        }
      }
      this.protocol = newProtocol;
      if (this.protocol === null) throw new MalformedURLException(`no protocol: ${original}`);
      const handler = getURLStreamHandler(this.protocol);
      if (handler === null) throw new MalformedURLException(`unknown protocol: ${this.protocol}`);
      const i = spec.indexOf('#', start);
      if (i >= 0) {
        this.ref = spec.substring(i + 1, limit);
        limit = i;
      }
      handler.parseURL(this, spec, start, limit);
    } catch (e) {
      if (e instanceof MalformedURLException) throw e;
      if (!(e instanceof Exception)) throw e; // catch (Exception e): Errors and JS failures pass
      const exception = new MalformedURLException(e.getMessage());
      exception.initCause(e);
      throw exception;
    }
  }

  // Java: URL#set(String,String,int,String,String,String,String,String)
  set(protocol, host, port, authority, userInfo, path, query, ref) {
    this.protocol = protocol;
    this.host = host;
    this.port = port;
    this.file = query === null ? path : `${path}?${query}`;
    this.userInfo = userInfo;
    this.path = path;
    this.ref = ref;
    this.query = query;
    this.authority = authority;
  }

  // Java: URL#getProtocol()
  getProtocol() { return this.protocol; }

  // Java: URL#getHost()
  getHost() { return this.host; }

  // Java: URL#getPort()
  getPort() { return this.port; }

  // Java: URL#getAuthority()
  getAuthority() { return this.authority; }

  // Java: URL#getUserInfo()
  getUserInfo() { return this.userInfo; }

  // Java: URL#getPath()
  getPath() { return this.path; }

  // Java: URL#getQuery()
  getQuery() { return this.query; }

  // Java: URL#getRef()
  getRef() { return this.ref; }

  // Java: URL#getFile()
  getFile() { return this.file; }

  // Java: URL#toExternalForm() / toString() (URLStreamHandler#toExternalForm)
  toString() {
    let s;
    return this.protocol + ':'
      + ((s = this.authority) !== null && s.length > 0 ? `//${s}` : '')
      + ((s = this.path) !== null ? s : '')
      + ((s = this.query) !== null ? `?${s}` : '')
      + ((s = this.ref) !== null ? `#${s}` : '');
  }
}
