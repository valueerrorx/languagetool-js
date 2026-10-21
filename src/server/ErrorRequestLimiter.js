// Java: org.languagetool.server.ErrorRequestLimiter (limits the number of requests that ended in a timeout per IP address)
import { Mode } from '../core/JLanguageTool.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { REQUEST_QUEUE_SIZE, RequestEvent, RequestLimiter } from './RequestLimiter.js';
import { TooManyRequestsException } from './exceptions.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';
import { valueOf } from '../lib/java/Objects.js';

const logger = LoggerFactory.getLogger('org.languagetool.server.ErrorRequestLimiter');

export class ErrorRequestLimiter extends RequestLimiter {
  static FQCN = 'org.languagetool.server.ErrorRequestLimiter';

  // Java: ErrorRequestLimiter#ErrorRequestLimiter(int,int)
  constructor(requestLimit, requestLimitPeriodInSeconds) {
    super(requestLimit, 0, requestLimitPeriodInSeconds);
  }

  // Java: ErrorRequestLimiter#wouldAccessBeOkay(String,Map,Map): true if access is allowed because the request limit is not reached yet
  wouldAccessBeOkay(ipAddress, parameters, httpHeader) {
    try {
      this.checkLimit(ipAddress, parameters, httpHeader);
      return true;
    } catch (e) {
      if (!(e instanceof TooManyRequestsException)) throw e;
      logger.info(`wouldAccessBeOkay -> false: ${valueOf(e.getMessage())}`);
      return false;
    }
  }

  // Java: ErrorRequestLimiter#logAccess(String,Map,Map)
  logAccess(ipAddress, httpHeader, params) {
    while (this.requestEvents.length > REQUEST_QUEUE_SIZE) {
      this.requestEvents.shift();
    }
    this.requestEvents.push(new RequestEvent(ipAddress, currentTimeMillis(), 0, this.computeFingerprint(httpHeader, params), Mode.ALL));
  }
}
