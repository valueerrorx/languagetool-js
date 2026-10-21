// Java: org.languagetool.server.LanguageToolHttpHandler (dispatch order, error mapping, parameter parsing)
import { decodeUtf8Java } from '../lib/java/charset.js';
import { decodeUrl, URI } from '../lib/java/net.js';
import { IllegalArgumentException, IOException, RuntimeException, TimeoutException, isThrowable } from '../lib/java/errors.js';
import { ErrorRateTooHighException } from '../core/check/ErrorRateTooHighException.js';
import { BadRequestException } from './BadRequestException.js';
import { ApiV2, API_DOC_URL } from './ApiV2.js';
import { AuthException, PathNotFoundException, TextTooLongException, TooManyRequestsException, UnavailableException } from './exceptions.js';
import { getRootCause, V2TextChecker } from './TextChecker.js';
import { getUserLimits, setAllowOrigin, siteMatches } from './ServerTools.js';
import { fdiv } from '../lib/java/float.js';
import { floatToString } from '../lib/java/toString.js';

const ENCODING = 'utf-8';
const HTTP_UNAVAILABLE = 503;
const REQUEST_LIMIT_ACCESS_TOKEN_HEADER = 'X-Request-Limit-Access-Token';
const ESCAPE_XML = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Java: RequestCounter
export class RequestCounter {
  reqCount = 0;
  handleCount = 0;

  // Java: RequestCounter#incrementRequestCount()
  incrementRequestCount() {
    return ++this.reqCount;
  }

  // Java: RequestCounter#incrementHandleCount(String,int)
  incrementHandleCount() {
    this.handleCount++;
  }

  // Java: RequestCounter#decrementHandleCount(int)
  decrementHandleCount() {
    this.handleCount--;
  }

  // Java: RequestCounter#getHandleCount()
  getHandleCount() {
    return this.handleCount;
  }

  // Java: RequestCounter#getRequestCount()
  getRequestCount() {
    return this.reqCount;
  }
}

// Java: ExceptionUtils#getThrowableList(Throwable).stream().anyMatch(class equals)
function hasCause(e, clazz) {
  const seen = new Set();
  for (let t = e; t !== null && t !== undefined && !seen.has(t); t = isThrowable(t) ? t.getCause() : null) {
    seen.add(t);
    if (t.constructor === clazz) return true;
  }
  return false;
}

export class LanguageToolHttpHandler {
  static FQCN = 'org.languagetool.server.LanguageToolHttpHandler';

  reqCounter = new RequestCounter();

  // Java: LanguageToolHttpHandler#LanguageToolHttpHandler(HTTPServerConfig,Set,boolean,RequestLimiter,ErrorRequestLimiter,BlockingQueue,Server)
  constructor(config, allowedIps, internal, requestLimiter, errorLimiter, workQueue, httpServer) {
    this.config = config;
    this.allowedIps = allowedIps;
    this.requestLimiter = requestLimiter;
    this.errorRequestLimiter = errorLimiter;
    this.workQueue = workQueue;
    this.httpServer = httpServer;
    this.textCheckerV2 = new V2TextChecker(config, internal, workQueue, this.reqCounter);
  }

  // Java: LanguageToolHttpHandler#shutdown()
  shutdown() {
    this.textCheckerV2.shutdownNow();
  }

  // Java: LanguageToolHttpHandler#handle(HttpExchange)
  async handle(httpExchange) {
    const config = this.config;
    let parameters = new Map();
    const reqId = this.reqCounter.incrementRequestCount();
    let incrementHandleCount = false;
    try {
      const requestedUri = httpExchange.getRequestURI();
      let path = requestedUri.getRawPath();
      if (config.getServerURL() !== null) {
        path = config.getServerURL().relativize(new URI(requestedUri.getPath())).getRawPath();
        if (!path.startsWith('/')) {
          path = `/${path}`;
        }
      }
      if (path.startsWith('/v2/stop') && config.isStoppable()) {
        await this.httpServer.stop();
        return;
      }
      if (path.startsWith('/v2/')) {
        // healthcheck should come before other limit checks (requests per time etc.), to be sure it works:
        const pathWithoutVersion = path.substring('/v2/'.length);
        if (pathWithoutVersion === 'healthcheck') {
          const message = 'Healthcheck failed: There are currently too many parallel requests.';
          if (this.workQueueFull(httpExchange, parameters, message) || this.textCheckerQueueFull(httpExchange, message)) {
            return;
          }
          httpExchange.getResponseHeaders().set('Content-Type', 'text/plain');
          const requestMethod = httpExchange.getRequestMethod();
          if (requestMethod.toLowerCase() === 'head') {
            // Send HTTP 200 without content
            httpExchange.sendResponseHeaders(200);
          } else {
            const ok = Buffer.from('OK', ENCODING);
            httpExchange.sendResponseHeaders(200);
            httpExchange.write(ok);
          }
          return;
        }
      }
      const referrer = httpExchange.getRequestHeaders().getFirst('Referer');
      const origin = httpExchange.getRequestHeaders().getFirst('Origin'); // Referer can be turned off with meta tags, so also check this
      for (const ref of config.getBlockedReferrers()) {
        let errorMessage = null;
        if (ref !== null && ref !== '') {
          if (referrer !== null && siteMatches(referrer, ref)) {
            errorMessage = `Error: Access with referrer ${referrer} denied.`;
          } else if (origin !== null && siteMatches(origin, ref)) {
            errorMessage = `Error: Access with origin ${origin} denied.`;
          }
        }
        if (errorMessage !== null) {
          this.sendError(httpExchange, 403, errorMessage);
          return;
        }
      }
      const origAddress = httpExchange.getRemoteHostAddress();
      const realAddressOrNull = LanguageToolHttpHandler.getRealRemoteAddressOrNull(httpExchange, config);
      const remoteAddress = realAddressOrNull !== null ? realAddressOrNull : origAddress;
      this.reqCounter.incrementHandleCount(remoteAddress, reqId);
      incrementHandleCount = true;
      // According to the Javadoc, "Closing an exchange without consuming all of the request body is
      // not an error but may make the underlying TCP connection unusable for following exchanges.",
      // so we consume the request now, even before checking for request limits:
      parameters = this.getRequestQuery(httpExchange, requestedUri);
      if (this.requestLimiter !== null && this.limitPath(path) && !this.allowSkipRequestLimit(httpExchange.getRequestHeaders())) {
        try {
          const userLimits = getUserLimits(parameters, config);
          this.requestLimiter.checkAccess(remoteAddress, parameters, httpExchange.getRequestHeaders(), userLimits);
        } catch (e) {
          if (!(e instanceof TooManyRequestsException)) throw e;
          const errorMessage = `Error: Access from ${remoteAddress} denied: ${e.getMessage()}`;
          this.sendError(httpExchange, 429, errorMessage); // too many requests
          return;
        }
      }
      if (this.errorRequestLimiter !== null
          && !this.allowSkipRequestLimit(httpExchange.getRequestHeaders())
          && !this.errorRequestLimiter.wouldAccessBeOkay(remoteAddress, parameters, httpExchange.getRequestHeaders())) {
        const textSizeMessage = this.getTextOrDataSizeMessage(parameters);
        const errorMessage = `Error: Access from ${remoteAddress} denied - too many recent timeouts. ${textSizeMessage}`
          + ` Allowed maximum timeouts: ${this.errorRequestLimiter.getRequestLimit()}`
          + ` per ${this.errorRequestLimiter.getRequestLimitPeriodInSeconds()} seconds`;
        this.sendError(httpExchange, 429, errorMessage); // too many requests
        return;
      }
      if (this.workQueueFull(httpExchange, parameters, 'Error: There are currently too many parallel requests. Please try again later.')) {
        return;
      }
      if (this.allowedIps === null || this.allowedIps.has(origAddress)) {
        if (path.startsWith('/v2/')) {
          const apiV2 = new ApiV2(this.textCheckerV2, config.getAllowOriginUrl());
          const pathWithoutVersion = path.substring('/v2/'.length);
          await apiV2.handleRequest(pathWithoutVersion, httpExchange, parameters, this.errorRequestLimiter, remoteAddress, config);
        } else if (path.endsWith('/Languages')) {
          throw new BadRequestException(`You're using an old version of our API that's not supported anymore. Please see ${API_DOC_URL}`);
        } else if (path === '/') {
          throw new BadRequestException(`Missing arguments for LanguageTool API. Please see ${API_DOC_URL}`);
        } else if (path.includes('/v2/')) {
          throw new BadRequestException("You have '/v2/' in your path, but not at the root. Try an URL like 'http://server/v2/...' ");
        } else if (path === '/favicon.ico') {
          this.sendError(httpExchange, 404, 'Not found');
        } else {
          throw new BadRequestException(`This is the LanguageTool API. You have not specified any parameters. Please see ${API_DOC_URL}`);
        }
      } else {
        const errorMessage = `Error: Access from ${ESCAPE_XML(origAddress)} denied`;
        this.sendError(httpExchange, 403, errorMessage);
        throw new RuntimeException(errorMessage);
      }
    } catch (e) {
      let response;
      let errorCode;
      const rootCause = getRootCause(e);
      const message = isThrowable(e) ? e.getMessage() : e?.message;
      if (e instanceof TextTooLongException || rootCause instanceof TextTooLongException) {
        errorCode = 413;
        response = message;
      } else if (e instanceof ErrorRateTooHighException || rootCause instanceof ErrorRateTooHighException) {
        errorCode = 400;
        response = getRootCause(e).getMessage();
      } else if (hasCause(e, AuthException)) {
        errorCode = 403;
        response = `${AuthException.FQCN}: ${message}`;
      } else if (e instanceof BadRequestException || rootCause instanceof BadRequestException) {
        errorCode = 400;
        response = message;
      } else if (e instanceof PathNotFoundException || rootCause instanceof PathNotFoundException) {
        errorCode = 404;
        response = message;
      } else if (e instanceof TimeoutException || rootCause instanceof TimeoutException) {
        errorCode = 500;
        if (message.includes('Checking took longer than')) {
          response = message; // more specific information already provided
        } else {
          response = `Checking took longer than ${floatToString(fdiv(config.getMaxCheckTimeMillisAnonymous(), 1000))} seconds, which is this server's limit. Please make sure you have selected the proper language or consider submitting a shorter text.`;
        }
      } else if (e instanceof UnavailableException) {
        errorCode = HTTP_UNAVAILABLE;
        response = message;
      } else {
        response = `Internal Error: ${message}`;
        errorCode = 500;
      }
      this.sendError(httpExchange, errorCode, `Error: ${response}`);
    } finally {
      httpExchange.close();
      if (incrementHandleCount) {
        this.reqCounter.decrementHandleCount(reqId);
      }
    }
  }

  // Java: LanguageToolHttpHandler#allowSkipRequestLimit(Headers)
  allowSkipRequestLimit(requestHeaders) {
    if (this.config.getRequestLimitAccessToken() === null) {
      return false;
    }
    if (!requestHeaders.containsKey(REQUEST_LIMIT_ACCESS_TOKEN_HEADER)) {
      return false;
    }
    return this.config.getRequestLimitAccessToken() === requestHeaders.getFirst(REQUEST_LIMIT_ACCESS_TOKEN_HEADER);
  }

  // Java: LanguageToolHttpHandler#limitPath(String): whitelist paths from request limiting
  limitPath(path) {
    return !path.endsWith('admin/refreshUser');
  }

  // Java: LanguageToolHttpHandler#getTextOrDataSizeMessage(Map)
  getTextOrDataSizeMessage(parameters) {
    const text = parameters.get('text');
    if (text !== undefined) {
      return `Text size: ${text.length}.`;
    }
    const data = parameters.get('data');
    if (data !== undefined) {
      return `Data size: ${data.length}.`;
    }
    return '';
  }

  // Java: LanguageToolHttpHandler#workQueueFull(HttpExchange,Map,String)
  workQueueFull(httpExchange, parameters, response) {
    if (this.config.getMaxWorkQueueSize() !== 0 && this.workQueue.size() > this.config.getMaxWorkQueueSize()) {
      this.sendError(httpExchange, HTTP_UNAVAILABLE, `Error: ${response}`);
      return true;
    }
    return false;
  }

  // Java: LanguageToolHttpHandler#textCheckerQueueFull(HttpExchange,String)
  textCheckerQueueFull(httpExchange, response) {
    if (this.textCheckerV2.checkerQueueAlmostFull()) {
      this.sendError(httpExchange, HTTP_UNAVAILABLE, `Error: ${response}`);
      return true;
    }
    return false;
  }

  // Java: LanguageToolHttpHandler#getRealRemoteAddressOrNull(HttpExchange,HTTPServerConfig)
  static getRealRemoteAddressOrNull(httpExchange, config) {
    if (config.getTrustXForwardForHeader()) {
      const forwardedIpsStr = httpExchange.getRequestHeaders().get('X-forwarded-for');
      if (forwardedIpsStr !== null && forwardedIpsStr.length > 0) {
        return forwardedIpsStr[0];
      }
    }
    return null;
  }

  // Java: LanguageToolHttpHandler#sendError(HttpExchange,int,String)
  sendError(httpExchange, httpReturnCode, response) {
    setAllowOrigin(httpExchange, this.config.getAllowOriginUrl());
    if (httpExchange.getResponseCode() >= 0) throw new IOException('headers already sent');
    const bytes = Buffer.from(response, ENCODING);
    httpExchange.sendResponseHeaders(httpReturnCode, bytes.length);
    httpExchange.write(bytes);
  }

  // Java: LanguageToolHttpHandler#getRequestQuery(HttpExchange,URI)
  getRequestQuery(httpExchange, requestedUri) {
    const params = new Map();
    if (httpExchange.getRequestMethod().toLowerCase() === 'post') {
      const body = this.readerToString(decodeUtf8Java(httpExchange.getRequestBody()), this.config.getMaxTextHardLength());
      for (const [k, v] of this.parseQuery(body, httpExchange)) params.set(k, v);
      for (const [k, v] of this.parseQuery(requestedUri.getRawQuery(), httpExchange)) params.set(k, v); // POST requests can have query parameters, too
      return params;
    }
    return this.parseQuery(requestedUri.getRawQuery(), httpExchange);
  }

  // Java: LanguageToolHttpHandler#readerToString(Reader,int) over the decoded body, read in chunks of 4000 chars
  readerToString(text, maxTextLength) {
    let sb = '';
    for (let pos = 0; pos < text.length; pos += 4000) {
      const chunk = text.substring(pos, pos + 4000);
      let generousMaxLength = Math.imul(maxTextLength, 10); // one character can be encoded as e.g. "%D8", plus estimated space for sending data (JSON)
      if (generousMaxLength < 0) { // might happen as it can overflow
        generousMaxLength = 2147483647;
      }
      if (sb.length > 0 && sb.length > generousMaxLength) {
        // don't stop at maxTextLength as that's the text length, but here also other parameters are included
        throw new TextTooLongException(`Your text's length exceeds this server's hard limit of ${generousMaxLength} characters.`);
      }
      sb += chunk;
    }
    return sb;
  }

  // Java: LanguageToolHttpHandler#parseQuery(String,HttpExchange)
  parseQuery(query, httpExchange) {
    const parameters = new Map();
    if (query !== null && query !== undefined) {
      for (const [k, v] of this.getParameterMap(query, httpExchange)) parameters.set(k, v);
    }
    return parameters;
  }

  // Java: LanguageToolHttpHandler#getParameterMap(String,HttpExchange)
  getParameterMap(query, httpExchange) {
    const pairs = query.split('&').filter((p) => p !== ''); // StringUtils.split(query, '&'): adjacent separators count as one, no empty tokens
    const parameters = new Map();
    for (const pair of pairs) {
      const delimPos = pair.indexOf('=');
      if (delimPos !== -1) {
        const param = pair.substring(0, delimPos);
        const key = decodeUrl(param, ENCODING);
        try {
          const value = decodeUrl(pair.substring(delimPos + 1), ENCODING);
          parameters.set(key, value);
        } catch (e) {
          if (e instanceof IllegalArgumentException) {
            throw new BadRequestException(`Could not decode query. Query length: ${query.length} Request method: ${httpExchange.getRequestMethod()}`);
          }
          throw e;
        }
      }
    }
    return parameters;
  }
}

