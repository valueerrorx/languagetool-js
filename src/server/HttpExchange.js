// JS stand-in for com.sun.net.httpserver.HttpExchange over a Node request/response (D-044: framing is not byte-exact).
import { URI } from '../lib/java/net.js';

// Java: com.sun.net.httpserver.Headers (case-insensitive names, first value wins for getFirst)
export class Headers {
  constructor() {
    this.map = new Map(); // lower-case name -> {name, values}
  }

  // Java: Headers#set(String,String)
  set(name, value) {
    this.map.set(name.toLowerCase(), { name, values: [value] });
  }

  // Java: Headers#add(String,String)
  add(name, value) {
    const e = this.map.get(name.toLowerCase());
    if (e) e.values.push(value);
    else this.map.set(name.toLowerCase(), { name, values: [value] });
  }

  // Java: Headers#getFirst(String) (null when absent)
  getFirst(name) {
    const e = this.map.get(name.toLowerCase());
    return e && e.values.length > 0 ? e.values[0] : null;
  }

  // Java: Headers#get(String) (null when absent)
  get(name) {
    const e = this.map.get(name.toLowerCase());
    return e ? e.values : null;
  }

  // Java: Headers#containsKey(String)
  containsKey(name) {
    return this.map.has(name.toLowerCase());
  }
}

// Java: com.sun.net.httpserver.HttpExchange (request/response buffered; close() sends or, without response headers, drops the connection)
export class HttpExchange {
  // body: function returning (a promise of) the Buffer of the request body; remoteAddress: Java InetAddress.getHostAddress() text
  constructor(req, res, requestUri, body, remoteAddress, localPort) {
    this.req = req;
    this.res = res;
    this.requestUri = requestUri;
    this.requestBody = body;
    this.remoteAddress = remoteAddress;
    this.localPort = localPort;
    this.requestHeaders = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) this.requestHeaders.add(req.rawHeaders[i], req.rawHeaders[i + 1]);
    this.responseHeaders = new Headers();
    this.responseCode = -1;
    this.chunks = [];
    this.closed = false;
  }

  // Java: HttpExchange#getLocalAddress().toString() (InetSocketAddress without host name: "/addr:port")
  getLocalAddressText() {
    const addr = (this.req.socket.localAddress ?? '0.0.0.0').replace(/^::ffff:/i, '');
    return `/${addr}:${this.localPort}`;
  }

  // Java: HttpExchange#getRequestMethod()
  getRequestMethod() {
    return this.req.method;
  }

  // Java: HttpExchange#getRequestURI()
  getRequestURI() {
    return this.requestUri;
  }

  // Java: HttpExchange#getRequestHeaders()
  getRequestHeaders() {
    return this.requestHeaders;
  }

  // Java: HttpExchange#getResponseHeaders()
  getResponseHeaders() {
    return this.responseHeaders;
  }

  // Java: HttpExchange#getRequestBody() (raw bytes)
  async getRequestBody() {
    if (typeof this.requestBody === 'function') this.requestBody = await this.requestBody();
    return this.requestBody;
  }

  // Java: HttpExchange#getRemoteAddress().getAddress().getHostAddress()
  getRemoteHostAddress() {
    return this.remoteAddress;
  }

  // Java: HttpExchange#sendResponseHeaders(int,long)
  sendResponseHeaders(code, length = 0) {
    this.responseCode = code;
    this.responseLength = length;
  }

  // Java: HttpExchange#getResponseBody().write(byte[])
  write(bytes) {
    this.chunks.push(Buffer.from(bytes));
  }

  // Java: HttpExchange#getResponseCode()
  getResponseCode() {
    return this.responseCode;
  }

  // Java: HttpExchange#close()
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.responseCode < 0) {
      this.res.socket?.destroy(); // closed without response headers: the client sees a dropped connection
      return;
    }
    const headers = {};
    for (const { name, values } of this.responseHeaders.map.values()) headers[name] = values.length === 1 ? values[0] : values;
    if (this.responseLength > 0) headers['Content-length'] = String(this.responseLength); // Java: fixed length response
    this.res.writeHead(this.responseCode, headers);
    this.res.end(Buffer.concat(this.chunks));
  }
}
