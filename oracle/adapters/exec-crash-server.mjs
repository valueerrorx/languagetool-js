// JS twin of harness op "exec-crash-server" (LtjsBridge#crashServer, SRV-0139): a real HTTPServer whose pipeline creation fails; the real handler maps the exception.
import { AssertionError, IOException, IllegalArgumentException, NullPointerException, RuntimeException, StackOverflowError, TimeoutException } from '../../src/lib/java/errors.js';
import { ErrorRateTooHighException } from '../../src/core/check/ErrorRateTooHighException.js';
import { BadRequestException } from '../../src/server/BadRequestException.js';
import { AuthException, PathNotFoundException, TextTooLongException, UnavailableException } from '../../src/server/exceptions.js';
import { HTTPServer } from '../../src/server/HTTPServer.js';
import { PipelinePool } from '../../src/server/PipelinePool.js';
import { config, err } from './_exec-common.mjs';

// Java: LtjsBridge.FaultyPool: pipeline creation fails inside the check task (fault injection for the crash mapping)
class FaultyPool extends PipelinePool {
  constructor(cfg, fault, msg) {
    super(cfg, null, false);
    this.fault = fault;
    this.msg = msg;
    this.calls = 0;
  }

  // Java: FaultyPool#createPipeline(Language,Language,QueryParams,GlobalConfig,UserConfig,List)
  createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds) {
    this.calls++;
    const msg = this.msg;
    switch (this.fault) {
      case 'runtime': throw new RuntimeException(msg);
      case 'illegalArgument': throw new IllegalArgumentException(msg);
      case 'io': throw new IOException(msg);
      case 'npe': throw new NullPointerException();
      case 'error': throw new AssertionError(msg);
      case 'stackOverflow': throw new StackOverflowError();
      case 'badRequest': throw new BadRequestException(msg);
      case 'textTooLong': throw new TextTooLongException(msg);
      case 'auth': throw new AuthException(msg);
      case 'timeout': throw new TimeoutException(msg);
      case 'unavailable': throw new UnavailableException(msg);
      case 'pathNotFound': throw new PathNotFoundException(msg);
      case 'errorRate': throw new ErrorRateTooHighException(msg);
      case 'nestedBadRequest': throw new RuntimeException('outer', new BadRequestException(msg));
      case 'nestedErrorRate': throw new RuntimeException('outer', new ErrorRateTooHighException(msg));
      case 'nestedTimeout': throw new RuntimeException('outer', new TimeoutException(msg));
      case 'nestedAuth': throw new RuntimeException('outer', new AuthException(msg));
      case 'failOnce':
        if (this.calls === 1) throw new RuntimeException(msg);
        return super.createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds);
      default: return super.createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds);
    }
  }
}

// Java: LtjsBridge#crashServer(JsonNode)
export async function run(a) {
  const cfg = config(a.config);
  const previous = process.env.LTJS_CHECK_BACKEND;
  process.env.LTJS_CHECK_BACKEND = 'inline'; // the fault lives in the pipeline pool of this thread
  let server;
  try {
    server = await HTTPServer.create(cfg);
  } finally {
    if (previous === undefined) delete process.env.LTJS_CHECK_BACKEND; else process.env.LTJS_CHECK_BACKEND = previous;
  }
  const tc = server.httpHandler.textCheckerV2;
  tc.pipelinePool = new FaultyPool(cfg, a.fault, a.message ?? 'injected failure');
  server.run();
  const out = [];
  try {
    for (const r of a.requests) {
      const body = new URLSearchParams(Object.entries(r.params).map(([k, v]) => [k, String(v)])).toString();
      const res = {};
      try {
        const resp = await fetch(`http://127.0.0.1:${cfg.getPort()}${r.path ?? '/v2/check'}`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }, body,
        });
        res.status = resp.status;
        const b = await resp.text();
        if (b.startsWith('{')) res.json = JSON.parse(b); // formatting of the JSON text is free
        else res.body = b;
      } catch (t) {
        res.error = { class: t.constructor.name, message: t.message };
      }
      out.push(res);
    }
  } finally {
    await server.stop();
  }
  return out;
}
