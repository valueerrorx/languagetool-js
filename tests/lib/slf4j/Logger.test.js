import { afterEach, describe, expect, it } from 'vitest';
import { abbreviateLogger, configureLogging, formatMessage, LoggerFactory, setLogSink } from '../../../src/lib/slf4j/Logger.js';
import { IllegalStateException } from '../../../src/lib/java/errors.js';

describe('Logger (logback layouts)', () => {
  afterEach(() => { setLogSink(null); configureLogging('none'); delete process.env.LTJS_LOGBACK; });

  it('abbreviates logger names like %logger{36}', () => {
    expect(abbreviateLogger('org.languagetool.language.identifier.DefaultLanguageIdentifier', 36)).toBe('o.l.l.i.DefaultLanguageIdentifier');
    expect(abbreviateLogger('org.languagetool.server.TextChecker', 36)).toBe('org.languagetool.server.TextChecker');
    expect(abbreviateLogger('Main', 36)).toBe('Main');
  });

  it('formats {} placeholders and a trailing throwable', () => {
    expect(formatMessage('a {} b {}', [1, 'x']).text).toBe('a 1 b x');
    const t = new IllegalStateException('boom');
    const r = formatMessage('failed', [t]);
    expect(r.text).toBe('failed');
    expect(r.throwable).toBe(t);
    expect(formatMessage('failed {}', [t]).throwable).toBe(null);
    expect(formatMessage('a {}', [null]).text).toBe('a null');
  });

  it('writes the cli layout, the server layout and the stderr harness layout; filters below INFO', () => {
    const out = [];
    setLogSink((t) => out.push(t));
    const log = LoggerFactory.getLogger('org.languagetool.language.identifier.DefaultLanguageIdentifier');
    configureLogging('cli');
    log.warn('w {}', 1);
    log.debug('hidden');
    expect(out).toEqual(['WARN  o.l.l.i.DefaultLanguageIdentifier w 1\n']);
    out.length = 0;
    configureLogging('server');
    log.info('i');
    expect(out[0]).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} (GMT|GMT[+-]\d\d:\d\d) INFO  org\.languagetool\.language\.identifier\.DefaultLanguageIdentifier i\n$/);
    out.length = 0;
    process.env.LTJS_LOGBACK = 'stderr';
    log.error('e');
    expect(out[0]).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} ERROR o\.l\.l\.i\.DefaultLanguageIdentifier - e\n$/);
  });
});
