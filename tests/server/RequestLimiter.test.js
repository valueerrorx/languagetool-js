// Port of RequestLimiterTest and ErrorRequestLimiterTest.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { RequestLimiter } from '../../src/server/RequestLimiter.js';
import { ErrorRequestLimiter } from '../../src/server/ErrorRequestLimiter.js';
import { TooManyRequestsException } from '../../src/server/exceptions.js';
import { UserLimits } from '../../src/server/UserLimits.js';
import { HTTPServerConfig } from '../../src/server/HTTPServerConfig.js';

const config = new HTTPServerConfig(8081);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const assertOkay = (limiter, ip, params, header) => {
  expect(() => limiter.checkAccess(ip, params, header, UserLimits.getDefaultLimits(config))).not.toThrow();
};
const assertOkayWithSkippingLimits = (limiter, ip, params, header) => {
  expect(() => limiter.checkAccess(ip, params, header, UserLimits.skipAll(true))).not.toThrow();
};
const assertException = (limiter, ip, params, header) => {
  expect(() => limiter.checkAccess(ip, params, header, UserLimits.getDefaultLimits(config))).toThrow(TooManyRequestsException);
};

const firstIp = '192.168.10.1';
const secondIp = '192.168.10.2';
const headers = () => ({ firstHeader: new Map(), secondHeader: new Map([['User-Agent', ['Test']]]) });

describe('RequestLimiter', () => {
  // Java: RequestLimiterTest#testIsAccessOkay
  it('testIsAccessOkay', async () => {
    const limiter = new RequestLimiter(3, 0, 1, 2);
    const { firstHeader, secondHeader } = headers();
    const params = new Map();
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertException(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertException(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
    await sleep(1050);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertException(limiter, secondIp, params, firstHeader);
  });

  // Java: RequestLimiterTest#testIsAccessOkayWithFingerprintDisabled
  it('testIsAccessOkayWithFingerprintDisabled', async () => {
    const limiter = new RequestLimiter(3, 0, 1, 0);
    const { firstHeader, secondHeader } = headers();
    const params = new Map();
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertException(limiter, firstIp, params, firstHeader);
    assertException(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
    await sleep(1050);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertException(limiter, secondIp, params, firstHeader);
  });

  // Java: RequestLimiterTest#testIsAccessOkayWithByteLimitNoFingerprint
  it('testIsAccessOkayWithByteLimitNoFingerprint', async () => {
    const limiter = new RequestLimiter(10, 35, 1, 0);
    const { firstHeader, secondHeader } = headers();
    const params = new Map([['text', '0123456789']]);
    assertOkay(limiter, firstIp, params, firstHeader); // 10 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 20 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 30 bytes
    assertException(limiter, firstIp, params, firstHeader); // 40 bytes!
    assertException(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
    await sleep(1050);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
  });

  // Java: RequestLimiterTest#testIsAccessOkayWithByteLimit
  it('testIsAccessOkayWithByteLimit', async () => {
    const limiter = new RequestLimiter(10, 35, 1, 2);
    const { firstHeader, secondHeader } = headers();
    const params = new Map([['text', '0123456789']]);
    assertOkay(limiter, firstIp, params, firstHeader); // 10 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 20 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 30 bytes
    assertException(limiter, firstIp, params, firstHeader); // 40 bytes!
    assertOkay(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertException(limiter, firstIp, params, secondHeader); // 80 bytes!
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
    await sleep(1050);
    assertOkay(limiter, firstIp, params, firstHeader);
    assertOkay(limiter, firstIp, params, secondHeader);
    assertOkay(limiter, secondIp, params, firstHeader);
    assertOkay(limiter, secondIp, params, secondHeader);
  });

  // Java: RequestLimiterTest#testTextLevelChecksCountLess
  it('testTextLevelChecksCountLess', () => {
    const limiter = new RequestLimiter(100, 35, 100, 2);
    const { firstHeader } = headers();
    const params = new Map([['text', '0123456789']]);
    assertOkay(limiter, firstIp, params, firstHeader); // 10 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 20 bytes
    assertOkay(limiter, firstIp, params, firstHeader); // 30 bytes
    params.set('mode', 'textLevelOnly');
    assertOkay(limiter, firstIp, params, firstHeader); // +10 bytes! but text level only, counts only a tenth of that, so okay (31 bytes)
    params.set('mode', 'all');
    assertException(limiter, firstIp, params, firstHeader); // 41 bytes!
    assertOkayWithSkippingLimits(limiter, firstIp, params, firstHeader);
  });

  // Java: ErrorRequestLimiterTest#testErrorLimiter
  it('testErrorLimiter', async () => {
    const limiter = new ErrorRequestLimiter(3, 1);
    const header = new Map(); // not relevant for test
    const params = new Map(); // not relevant for test
    const ip1 = '192.168.0.1';
    const ip2 = '192.168.0.2';
    expect(limiter.wouldAccessBeOkay(ip1, params, header)).toBe(true);
    expect(limiter.wouldAccessBeOkay(ip2, params, header)).toBe(true);
    limiter.logAccess(ip1, header, params);
    limiter.logAccess(ip1, header, params);
    limiter.logAccess(ip1, header, params);
    limiter.logAccess(ip1, header, params);
    expect(limiter.wouldAccessBeOkay(ip1, params, header)).toBe(false);
    expect(limiter.wouldAccessBeOkay(ip2, params, header)).toBe(true);
    await sleep(1050);
    expect(limiter.wouldAccessBeOkay(ip1, params, header)).toBe(true);
  });
});
