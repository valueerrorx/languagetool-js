// Java: org.languagetool.server.Server + HTTPServer (bind, start/stop, startup STDOUT lines, usage text)
import http from 'node:http';
import { userInfo } from 'node:os';
import express from 'express';
import { Buffer } from 'node:buffer';
import { VERSION, BUILD_DATE, GIT_SHORT_ID } from '../core/LtBuildInfo.js';
import { getMessageBundle } from '../core/resources/ResourceBundleTools.js';
import { i18n } from '../core/Tools.js';
import { Exception, IllegalArgumentException, IOException, RuntimeException, isThrowable } from '../lib/java/errors.js';
import { URI, URISyntaxException } from '../lib/java/net.js';
import { DatabaseAccess } from './DatabaseAccess.js';
import { LtThreadPoolFactory } from '../core/tools/LtThreadPoolFactory.js';
import { RequestLimiter } from './RequestLimiter.js';
import { ErrorRequestLimiter } from './ErrorRequestLimiter.js';
import { DEFAULT_HOST, DEFAULT_PORT, HTTPServerConfig } from './HTTPServerConfig.js';
import { BindException, PortBindingException } from './exceptions.js';
import { HttpExchange } from './HttpExchange.js';
import { LanguageToolHttpHandler } from './LanguageToolHttpHandler.js';
import { print } from './ServerTools.js';

// Java: Server.DEFAULT_ALLOWED_IPS
export const DEFAULT_ALLOWED_IPS = new Set(['0:0:0:0:0:0:0:1', '0:0:0:0:0:0:0:1%0', '127.0.0.1']);

// Java: InetAddress#getHostAddress() text of a Node socket address (IPv4-mapped IPv6 -> dotted, IPv6 -> 8 uncompressed groups)
export function javaHostAddress(addr) {
  if (addr === undefined || addr === null) return '0.0.0.0';
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(addr);
  if (mapped) return mapped[1];
  if (!addr.includes(':')) return addr;
  const [main, scope] = addr.split('%');
  const [head, tail] = main.includes('::') ? main.split('::') : [main, null];
  const h = head === '' ? [] : head.split(':');
  const t = tail === null ? [] : (tail === '' ? [] : tail.split(':'));
  const groups = tail === null ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
  const text = groups.map((g) => g.replace(/^0+(?=.)/, '').toLowerCase()).join(':');
  return scope !== undefined ? `${text}%${scope}` : text;
}

// Java: Server (abstract)
export class Server {
  static FQCN = 'org.languagetool.server.Server';

  isRunningFlag = false;

  // Java: Server#run()
  run() {
    const hostName = this.host !== null ? this.host : 'localhost';
    print(`Starting LanguageTool ${VERSION} (build date: ${BUILD_DATE}, ${GIT_SHORT_ID}) server on ${this.getProtocol()}://${hostName}:${this.port}...`);
    this.isRunningFlag = true;
    print('Server started');
  }

  // Java: Server#stop()
  async stop() {
    if (this.httpHandler) {
      this.httpHandler.shutdown();
    }
    if (this.server) {
      print('Stopping server...');
      await new Promise((resolve) => {
        this.server.close(() => resolve());
        this.server.closeAllConnections();
      });
      this.isRunningFlag = false;
      print('Server stopped');
      if (this.onStopped) this.onStopped();
    }
  }

  // Java: Server#isRunning()
  isRunning() {
    return this.isRunningFlag;
  }

  // Java: Server#getRequestLimiterOrNull(HTTPServerConfig)
  getRequestLimiterOrNull(config) {
    const requestLimit = config.getRequestLimit();
    const requestLimitInBytes = config.getRequestLimitInBytes();
    const requestLimitPeriodInSeconds = config.getRequestLimitPeriodInSeconds();
    const ipFingerprintFactor = config.ipFingerprintFactor; // can be <= 0, means fingerprinting is disabled
    const requestLimitWhitelistUsers = config.getRequestLimitWhitelistUsers();
    const requestLimitWhitelistLimit = config.requestLimitWhitelistLimit;
    if ((requestLimit > 0 || requestLimitInBytes > 0) && requestLimitPeriodInSeconds > 0) {
      return new RequestLimiter(requestLimit, requestLimitInBytes, requestLimitPeriodInSeconds, ipFingerprintFactor,
        requestLimitWhitelistUsers, requestLimitWhitelistLimit);
    }
    return null;
  }

  // Java: Server#getErrorRequestLimiterOrNull(HTTPServerConfig)
  getErrorRequestLimiterOrNull(config) {
    const requestLimit = config.getTimeoutRequestLimit();
    const requestLimitPeriodInSeconds = config.getRequestLimitPeriodInSeconds();
    if (requestLimit > 0 && requestLimitPeriodInSeconds > 0) {
      return new ErrorRequestLimiter(requestLimit, requestLimitPeriodInSeconds);
    }
    return null;
  }

  // Java: Server#getExecutorService(HTTPServerConfig); the pool that runs the HTTP request handlers
  getExecutorService(config) {
    const threadPoolSize = config.getMaxCheckThreads();
    print(`Setting up thread pool with ${threadPoolSize} threads`);

    // reuse = false -> this should only be called once in production, needs to be false for tests
    return LtThreadPoolFactory.createFixedThreadPoolExecutor(LtThreadPoolFactory.SERVER_POOL,
      threadPoolSize, threadPoolSize, 0, 0, false,
      () => {
        // log.error("Thread: " + thread.getName() + " failed with: " + throwable.getMessage()) (F71)
      }, false);
  }
}

// Java: Server#usageRequested(String[])
export function usageRequested(args) {
  return args.length === 1 && (args[0] === '-h' || args[0] === '--help');
}

const out = (s) => process.stdout.write(`${s}\n`);

// Java: Server#printCommonConfigFileOptions()
export function printCommonConfigFileOptions() {
  out('                 \'maxTextLength\' - maximum text length, longer texts will cause an error (optional)');
  out('                 \'maxTextHardLength\' - maximum text length, applies even to users with a special secret \'token\' parameter (optional)');
  out('                 \'maxCheckTimeMillis\' - maximum time in milliseconds allowed per check (optional)');
  out('                 \'maxErrorsPerWordRate\' - checking will stop with error if there are more rules matches per word (optional)');
  out('                 \'maxSpellingSuggestions\' - only this many spelling errors will have suggestions for performance reasons (optional,\n' + '                                            affects Hunspell-based languages only)');
  out('                 \'maxCheckThreads\' - maximum number of threads working in parallel (optional)');
  out('                 \'cacheSize\' - size of internal cache in number of sentences (optional, default: 0)');
  out('                 \'cacheTTLSeconds\' - how many seconds sentences are kept in cache (optional, default: 300 if \'cacheSize\' is set)');
  out('                 \'requestLimit\' - maximum number of requests per requestLimitPeriodInSeconds (optional)');
  out('                 \'requestLimitInBytes\' - maximum aggregated size of requests per requestLimitPeriodInSeconds (optional)');
  out('                 \'timeoutRequestLimit\' - maximum number of timeout request (optional)');
  out('                 \'requestLimitPeriodInSeconds\' - time period to which requestLimit and timeoutRequestLimit applies (optional)');
  out('                 \'languageModel\' - a directory with \'1grams\', \'2grams\', \'3grams\' sub directories per language which contain a Lucene index');
  out('                                   each with ngram occurrence counts; activates the confusion rule if supported (optional)');
  out('                 \'fasttextModel\' - a model file for better language detection (optional), see');
  out('                                   https://fasttext.cc/docs/en/language-identification.html');
  out('                 \'fasttextBinary\' - compiled fasttext executable for language detection (optional), see');
  out('                                    https://fasttext.cc/docs/en/support.html');
  out('                 \'maxWorkQueueSize\' - reject request if request queue gets larger than this (optional)');
  out('                 \'rulesFile\' - a file containing rules configuration, such as .languagetool.cfg (optional)');
  out('                 \'blockedReferrers\' - a comma-separated list of HTTP referrers (and \'Origin\' headers) that are blocked and will not be served (optional)');
  out('                 \'premiumOnly\' - activate only the premium rules (optional)');
  out('                 \'disabledRuleIds\' - a comma-separated list of rule ids that are turned off for this server (optional)');
  out('                 \'pipelineCaching\' - set to \'true\' to enable caching of internal pipelines to improve performance');
  out('                 \'maxPipelinePoolSize\' - cache size if \'pipelineCaching\' is set');
  out('                 \'pipelineExpireTimeInSeconds\' - time after which pipeline cache items expire');
  out('                 \'pipelinePrewarming\' - set to \'true\' to fill pipeline cache on start (can slow down start a lot)');
  out('                 \'trustXForwardForHeader\' - set this to \'true\' if you run the server behind a reverse proxy and want the');
  out('                                            request limit to work on the original IP addresses provided by the \'X-forwarded-for\' HTTP header,');
  out('                                            usually set by the proxy');
  out('                 Spellcheck-only languages: You can add simple spellcheck-only support for languages that LT doesn\'t');
  out('                                            support by defining two optional properties:');
  out('                   \'lang-xx\' - set name of the language, use language code instead of \'xx\', e.g. lang-tr=Turkish');
  out('                   \'lang-xx-dictPath\' - absolute path to the hunspell .dic file, use language code instead of \'xx\', e.g.');
  out('                                        lang-tr-dictPath=/path/to/tr.dic. Note that the same directory also needs to');
  out('                                        contain a common_words.txt file with the most common 10,000 words (used for better language detection)');
  out('                 \'suggestionsEnabled\' - if suggestions should be generated for spell check errors (optional, default: true)');
}

// Java: Server#printCommonOptions()
export function printCommonOptions() {
  out('  --port, -p PRT   port to bind to, defaults to ' + DEFAULT_PORT + ' if not specified');
  out('  --public         allow this server process to be connected from anywhere; if not set,');
  out('                   it can only be connected from the computer it was started on');
  out('  --allow-origin [ORIGIN] set the Access-Control-Allow-Origin header in the HTTP response,');
  out('                         used for direct (non-proxy) JavaScript-based access from browsers.');
  out('                         Example: --allow-origin "https://my-website.org"');
  out('                         Don\'t set a parameter for `*`, i.e. access from all websites.');
  out('  --verbose, -v    in case of exceptions, log the input text (up to 500 characters)');
  out('  --languageModel  a directory with \'1grams\', \'2grams\', \'3grams\' sub directories (per language)');
  out('                         which contain a Lucene index (optional, overwrites \'languageModel\'');
  out('                         parameter in properties files)');
  out('  --premiumAlways  activate the premium rules even when user has no username/password - useful for API servers');
}

// Java: Server#checkForNonRootUser()
export function checkForNonRootUser() {
  if (userInfo().username === 'root') { // Java: System.getProperty("user.name")
    print('****************************************************************************************************');
    print('*** WARNING: this process is running as root - please do not run it as root for security reasons ***');
    print('****************************************************************************************************');
  }
}

// Java: HTTPServer
export class HTTPServer extends Server {
  static FQCN = 'org.languagetool.server.HTTPServer';

  // Java: HTTPServer#HTTPServer(HTTPServerConfig,boolean,String,Set) - async: the socket is bound before this resolves
  static async create(config, runInternally = false, host = DEFAULT_HOST, allowedIps = DEFAULT_ALLOWED_IPS) {
    const s = new HTTPServer();
    await s.init(config, runInternally, host, allowedIps);
    return s;
  }

  // Java: HTTPServer#HTTPServer(HTTPServerConfig,boolean,String,Set)
  async init(config, runInternally, host, allowedIps) {
    this.port = config.getPort();
    this.host = host;
    try {
      const limiter = this.getRequestLimiterOrNull(config);
      const errorLimiter = this.getErrorRequestLimiterOrNull(config);
      this.executorService = this.getExecutorService(config);
      const workQueue = this.executorService.getQueue();
      this.httpHandler = new LanguageToolHttpHandler(config, allowedIps, runInternally, limiter, errorLimiter, workQueue, this);
      await this.httpHandler.textCheckerV2.prewarmDone; // Java: pipeline prewarming runs in the TextChecker constructor
      // check if port is 0 for get random port from range
      if (this.port === 0) {
        const minPort = config.getMinPort();
        const maxPort = config.getMaxPort();
        this.port = await this.getPortFromRange(minPort, maxPort);
      }
      if (this.port < 0 || this.port > 65535) { // Java: new InetSocketAddress(host, port)
        throw new IllegalArgumentException(`port out of range:${this.port}`);
      }
      this.server = await this.bind(this.createApp(), host);
    } catch (e) {
      if (!isThrowable(e)) throw e;
      const messages = getMessageBundle();
      const message = i18n(messages, 'http_server_start_failed', host, String(this.port));
      throw new PortBindingException(message, e);
    }
  }

  // Java: HTTPServer#getPortFromRange(int,int)
  async getPortFromRange(minPort, maxPort) {
    if (minPort > 0 && minPort < maxPort) {
      for (let p = minPort; p <= maxPort; p++) {
        if (await this.portFree(p)) return p;
      }
      throw new IOException(`No free port in range (${minPort} - ${maxPort}) found.`);
    }
    throw new IOException("Invalid port configuration found. "
      + "The value for '--port' need to be greater than 0 or if set to 0 you need to specify a minPort and maxPort in your properties file (minPort must be lower that maxPort).");
  }

  // Java: new ServerSocket(p) probe
  portFree(p) {
    return new Promise((resolve) => {
      const probe = http.createServer();
      probe.once('error', () => resolve(false));
      probe.listen(p, () => probe.close(() => resolve(true)));
    });
  }

  // Java: HttpServer.create(address, 0) + start(): listen on the loopback IPv4 address (Java prefers IPv4) or all interfaces
  bind(app, host) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') reject(new BindException('Address already in use'));
        else if (err.code === 'EACCES') reject(new BindException('Permission denied'));
        else reject(new IOException(err.message));
      });
      server.listen({ port: this.port, host: host === null ? undefined : (host === 'localhost' ? '127.0.0.1' : host) }, () => {
        server.removeAllListeners('error');
        server.on('error', () => {});
        resolve(server);
      });
    });
  }

  // Java: server.createContext("/", httpHandler)
  createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(async (req, res) => {
      let requestUri;
      try {
        requestUri = new URI(req.originalUrl);
      } catch (e) {
        if (!(e instanceof URISyntaxException)) throw e;
        // JDK HttpServer rejects the request line itself (DEV-005)
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>400 Bad Request</h1>Bad request URI');
        return;
      }
      let body = Buffer.alloc(0);
      if (req.method.toLowerCase() === 'post') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        body = Buffer.concat(chunks);
      } else {
        req.resume();
      }
      const exchange = new HttpExchange(req, res, requestUri, body, javaHostAddress(req.socket.remoteAddress), req.socket.localPort);
      // Java: server.setExecutor(executorService): the handler runs on a thread of the server pool (queued when all threads are busy)
      this.executorService.execute(async () => {
        try {
          await this.httpHandler.handle(exchange);
        } catch (e) {
          if (!res.writableEnded && !res.destroyed) res.destroy();
          if (!(e instanceof Exception)) process.stderr.write(`${e?.stack ?? e}\n`);
        }
      });
    });
    return app;
  }

  // Java: HTTPServer#stop()
  async stop() {
    await super.stop();
    if (this.executorService) {
      this.executorService.shutdownNow();
    }
  }

  // Java: HTTPServer#getProtocol()
  getProtocol() {
    return 'http';
  }

  // Java: HTTPServer#main(String[])
  static async main(args) {
    if (usageRequested(args)) {
      out(`Usage: HTTPServer [--config propertyFile] [--port|-p port] [--public]`);
      out('  --config FILE  a Java property file (one key=value entry per line) with values for:');
      printCommonConfigFileOptions();
      printCommonOptions();
      process.exit(1);
    }
    const config = new HTTPServerConfig(args);
    DatabaseAccess.init(config);
    try {
      checkForNonRootUser();
      let server;
      if (config.isPublicAccess()) {
        print('WARNING: running in HTTP mode, consider running LanguageTool behind a reverse proxy that takes care of encryption (HTTPS)');
        print('WARNING: running in public mode, LanguageTool API can be accessed without restrictions!');
        server = await HTTPServer.create(config, false, null, null);
      } else {
        server = await HTTPServer.create(config, false, DEFAULT_HOST, DEFAULT_ALLOWED_IPS);
      }
      server.onStopped = () => setImmediate(() => process.exit(0));
      server.run();
      return server;
    } catch (e) {
      if (!isThrowable(e) || !(e instanceof Exception)) throw e;
      throw new RuntimeException(`Could not start LanguageTool HTTP server on ${DEFAULT_HOST}, port ${config.getPort()}`, e);
    }
  }
}

export { DEFAULT_PORT };
