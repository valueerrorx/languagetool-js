// Java: org.languagetool.server.RequestLimiter (maximum number of requests per IP address / fingerprint in a time range)
import { Mode } from '../core/JLanguageTool.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { d2i } from '../lib/java/casts.js';
import { fadd, fmul } from '../lib/java/float.js';
import { DatabaseAccess } from './DatabaseAccess.js';
import { LimitEnforcementMode } from './LimitEnforcementMode.js';
import { TooManyRequestsException } from './exceptions.js';
import { getMode } from './ServerTools.js';

// TODO (Java): this only works if the period covered is larger than requestLimitPeriodInSeconds
export const REQUEST_QUEUE_SIZE = 1000;

// Java: RequestLimiter.RequestEvent
export class RequestEvent {
  // Java: RequestEvent#RequestEvent(String,Date,int,String,Mode); date: epoch milliseconds
  constructor(ip, date, sizeInBytes, fingerprint, mode) {
    this.ip = ip;
    this.date = date;
    this.sizeInBytes = sizeInBytes;
    this.fingerprint = fingerprint;
    this.mode = mode;
  }

  // Java: RequestEvent#getDate()
  getDate() {
    return this.date;
  }

  // Java: RequestEvent#getSizeInBytes()
  getSizeInBytes() {
    return this.sizeInBytes;
  }
}

export class RequestLimiter {
  static FQCN = 'org.languagetool.server.RequestLimiter';

  requestEvents = [];

  // Java: RequestLimiter#RequestLimiter(int,int,int[,int[,List,int]])
  constructor(requestLimit, requestLimitInBytes, requestLimitPeriodInSeconds, ipFingerprintFactor = 1, whitelistUsers = null, whitelistLimit = 0) {
    this.requestLimit = requestLimit;
    this.requestLimitInBytes = requestLimitInBytes;
    this.requestLimitPeriodInSeconds = requestLimitPeriodInSeconds;
    this.ipFingerprintFactor = ipFingerprintFactor;
    this.whitelistUsers = whitelistUsers !== null && whitelistUsers !== undefined ? whitelistUsers : [];
    this.whitelistLimit = whitelistLimit;
    if (ipFingerprintFactor > 0) {
      this.ipRequestLimit = Math.imul(requestLimit, ipFingerprintFactor);
      this.ipRequestLimitInBytes = Math.imul(requestLimitInBytes, ipFingerprintFactor);
    } else {
      this.ipRequestLimit = requestLimit;
      this.ipRequestLimitInBytes = requestLimitInBytes;
    }
  }

  // Java: RequestLimiter#getRequestLimit()
  getRequestLimit() {
    return this.requestLimit;
  }

  // Java: RequestLimiter#getRequestLimitInBytes()
  getRequestLimitInBytes() {
    return this.requestLimitInBytes;
  }

  // Java: RequestLimiter#getRequestLimitPeriodInSeconds()
  getRequestLimitPeriodInSeconds() {
    return this.requestLimitPeriodInSeconds;
  }

  // Java: RequestLimiter#computeFingerprint(Map,Map)
  computeFingerprint(httpHeader, parameters) {
    const empty = [''];
    const separator = '|';
    const fields = [];
    fields.push((httpHeader.get('User-Agent') ?? empty).join(separator));
    fields.push((httpHeader.get('Accept-Language') ?? empty).join(separator));
    fields.push((httpHeader.get('Referer') ?? empty).join(separator));
    fields.push(parameters.has('textSessionId') ? parameters.get('textSessionId') : '');
    return fields.join(separator);
  }

  // Java: RequestLimiter#checkAccess(String,Map,Map,UserLimits)
  checkAccess(ipAddress, params, httpHeader, userLimits) {
    if (userLimits.getSkipLimits()) {
      // internal special case for e.g. nightly tests
      return;
    }
    const reqSize = this.getRequestSize(params);
    while (this.requestEvents.length > REQUEST_QUEUE_SIZE) {
      this.requestEvents.shift();
    }
    this.requestEvents.push(new RequestEvent(ipAddress, currentTimeMillis(), reqSize, this.computeFingerprint(httpHeader, params), getMode(params)));
    this.checkLimit(ipAddress, params, httpHeader);
  }

  // Java: RequestLimiter#getRequestSize(Map)
  getRequestSize(params) {
    const text = params.get('text');
    if (text !== undefined) {
      return text.length;
    }
    const data = params.get('data');
    if (data !== undefined) {
      return data.length;
    }
    return 0;
  }

  // Java: RequestLimiter#getClientId(Map): only with database logging
  getClientId() {
    return null;
  }

  // Java: RequestLimiter#getReferer(Map)
  getReferer(httpHeader) {
    const values = httpHeader.get('Referer');
    if (values === null || values === undefined || values.length === 0) {
      return null;
    }
    return values[0];
  }

  // Java: RequestLimiter#getUserAgent(Map)
  getUserAgent(httpHeader) {
    const values = httpHeader.get('User-Agent');
    if (values === null || values === undefined || values.length === 0) {
      return null;
    }
    return values[0];
  }

  // Java: RequestLimiter#checkUserLimit(String,String,UserLimits)
  static checkUserLimit(referer, userAgent, user) {
    const maxRequests = user.getRequestsPerDay();
    if (user.getPremiumUid() !== null
      && maxRequests !== null
      && user.getLimitEnforcementMode() !== LimitEnforcementMode.DISABLED) {
      if (user.getLimitEnforcementMode() === LimitEnforcementMode.PER_DAY) {
        const requestCount = DatabaseAccess.getInstance().getUserRequestCount(user.getPremiumUid());
        if (requestCount > maxRequests) {
          throw new TooManyRequestsException(`User request limit of ${maxRequests} per day exceeded. Try again after midnight UTC.`);
        }
      }
    }
  }

  // Java: RequestLimiter#checkLimit(String,Map,Map)
  checkLimit(ipAddress, parameters, httpHeader) {
    let requestsByIp = 0;
    let requestSizeByIp = 0;
    let requestsByFingerprint = 0;
    let requestSizeByFingerprint = 0;
    // all requests before this date are considered old:
    const thresholdDate = currentTimeMillis() - this.requestLimitPeriodInSeconds * 1000;
    const fingerprint = this.computeFingerprint(httpHeader, parameters);
    const user = parameters.has('username') ? parameters.get('username') : null;
    const whitelistedUser = user !== null && this.whitelistUsers.includes(user);
    // int += int * float: the sum is computed in float and truncated
    const addSize = (sum, size, factor) => d2i(fadd(Math.fround(sum), fmul(Math.fround(size), factor)));
    for (const event of this.requestEvents) {
      if (event.ip === ipAddress && event.date > thresholdDate) {
        // text level rules cause much less load, so count them accordingly
        const modeFactor = event.mode === Mode.TEXTLEVEL_ONLY ? Math.fround(0.1) : 1;
        requestsByIp++;
        requestSizeByIp = addSize(requestSizeByIp, event.getSizeInBytes(), modeFactor);
        if (whitelistedUser) {
          if (this.whitelistLimit <= 0 || requestsByIp < this.whitelistLimit) {
            continue;
          } else {
            throw new TooManyRequestsException(`Whitelist request limit of ${this.whitelistLimit} requests per ${this.requestLimitPeriodInSeconds} seconds exceeded`);
          }
        }
        if (event.fingerprint === fingerprint) {
          requestsByFingerprint++;
          requestSizeByFingerprint = addSize(requestSizeByFingerprint, event.getSizeInBytes(), modeFactor);
        }
        if (this.ipFingerprintFactor > 0 && this.requestLimit > 0 && requestsByFingerprint > this.requestLimit) {
          throw new TooManyRequestsException(`Client request limit of ${this.requestLimit} requests per ${this.requestLimitPeriodInSeconds} seconds exceeded`);
        }
        if (this.requestLimit > 0 && requestsByIp > this.ipRequestLimit) {
          throw new TooManyRequestsException(`IP request limit of ${this.ipRequestLimit} requests per ${this.requestLimitPeriodInSeconds} seconds exceeded`);
        }
        if (event.mode === Mode.TEXTLEVEL_ONLY) {
          if (this.ipFingerprintFactor > 0 && this.requestLimitInBytes > 0 && requestSizeByFingerprint > this.requestLimitInBytes) {
            throw new TooManyRequestsException(`Client request size limit of ${this.requestLimitInBytes} bytes per ${this.requestLimitPeriodInSeconds} seconds exceeded in text-level checks`);
          }
          if (this.requestLimitInBytes > 0 && requestSizeByIp > this.ipRequestLimitInBytes) {
            throw new TooManyRequestsException(`IP request size limit of ${this.ipRequestLimitInBytes} bytes per ${this.requestLimitPeriodInSeconds} seconds exceeded in text-level checks`);
          }
        } else {
          if (this.ipFingerprintFactor > 0 && this.requestLimitInBytes > 0 && requestSizeByFingerprint > this.requestLimitInBytes) {
            throw new TooManyRequestsException(`Client request size limit of ${this.requestLimitInBytes} bytes per ${this.requestLimitPeriodInSeconds} seconds exceeded`);
          }
          if (this.requestLimitInBytes > 0 && requestSizeByIp > this.ipRequestLimitInBytes) {
            throw new TooManyRequestsException(`IP request size limit of ${this.ipRequestLimitInBytes} bytes per ${this.requestLimitPeriodInSeconds} seconds exceeded`);
          }
        }
      }
    }
  }
}
