// Java: org.languagetool.server.HTTPSServer (deprecated JKS/TLS server: startup, usage and configuration errors; TLS serving is SRV-0178, later)
import { readFileSync } from 'node:fs';
import { getMessageBundle } from '../core/resources/ResourceBundleTools.js';
import { i18n } from '../core/Tools.js';
import { notPortedYet } from '../core/language/components.js';
import { Exception, IOException, EOFException, FileNotFoundException, IllegalArgumentException, RuntimeException, isThrowable } from '../lib/java/errors.js';
import { DEFAULT_HOST, DEFAULT_PORT } from './HTTPServerConfig.js';
import { HTTPSServerConfig } from './HTTPSServerConfig.js';
import { openError } from './HTTPServerConfig.js';
import {
  DEFAULT_ALLOWED_IPS, HTTPServer, Server, checkForNonRootUser, printCommonConfigFileOptions, printCommonOptions, usageRequested,
} from './HTTPServer.js';
import { BindException, IllegalConfigurationException, PortBindingException } from './exceptions.js';

const out = (s) => process.stdout.write(`${s}\n`);

// Java: HTTPSServer
export class HTTPSServer extends Server {
  static FQCN = 'org.languagetool.server.HTTPSServer';

  // Java: HTTPSServer#HTTPSServer(HTTPSServerConfig,boolean,String,Set) - async: the socket is bound before this resolves
  static async create(config, runInternally = false, host = DEFAULT_HOST, allowedIps = DEFAULT_ALLOWED_IPS) {
    const s = new HTTPSServer();
    await s.init(config, runInternally, host, allowedIps);
    return s;
  }

  // Java: HTTPSServer#HTTPSServer(HTTPSServerConfig,boolean,String,Set)
  async init(config, runInternally, host, allowedIps) {
    this.port = config.getPort();
    this.host = host;
    try {
      if (this.port < 0 || this.port > 65535) { // Java: new InetSocketAddress(host, port)
        throw new IllegalArgumentException(`port out of range:${this.port}`);
      }
      this.server = await HTTPServer.prototype.bind.call(this, null, host); // HttpsServer.create(address, 0)
      try {
        this.getSslContext(config.getKeystore(), config.getKeyStorePassword());
      } finally {
        this.server.close();
      }
      throw notPortedYet('HTTPSServer TLS serving with a JKS keystore (SRV-0178)');
    } catch (e) {
      if (!isThrowable(e)) throw e;
      const messages = getMessageBundle();
      if (e instanceof BindException) {
        const message = i18n(messages, 'https_server_start_failed', host, String(this.port));
        throw new PortBindingException(message, e);
      }
      const message = i18n(messages, 'https_server_start_failed_unknown_reason', host, String(this.port));
      throw new RuntimeException(message, e);
    }
  }

  // Java: HTTPSServer#getSslContext(File,String) - loads the JKS keystore (format check only; building the TLS context follows with SRV-0178)
  getSslContext(keyStoreFile) {
    try {
      let buf;
      try {
        buf = readFileSync(keyStoreFile.toString());
      } catch {
        throw openError(keyStoreFile);
      }
      if (buf.length < 4) throw new EOFException();
      if (buf.readUInt32BE(0) !== 0xfeedfeed) throw new IOException('Invalid keystore format');
      return null;
    } catch (e) {
      if (e instanceof FileNotFoundException || e instanceof IOException) {
        throw new RuntimeException('Could not set up SSL context', e);
      }
      throw e;
    }
  }

  // Java: HTTPSServer#stop()
  async stop() {
    await super.stop();
  }

  // Java: HTTPSServer#getProtocol()
  getProtocol() {
    return 'https';
  }

  // Java: HTTPSServer#main(String[])
  static async main(args) {
    if (args.length === 0 || usageRequested(args)) {
      out('Usage: HTTPSServer --config propertyFile [--port|-p port] [--public]');
      out('  --config file  a Java property file (one key=value entry per line) with values for:');
      out("                 'keystore' - a Java keystore with an SSL certificate (deprecated, use a reverse proxy to handle SSL)");
      out("                 'password' - the keystore's password (deprecated, use a reverse proxy to handle SSL)");
      printCommonConfigFileOptions();
      printCommonOptions();
      process.exit(1);
    }
    try {
      const config = new HTTPSServerConfig(args);
      try {
        checkForNonRootUser();
        let server;
        if (config.isPublicAccess()) {
          out('WARNING: running in public mode, LanguageTool API can be accessed without restrictions!');
          server = await HTTPSServer.create(config, false, null, null);
        } else {
          server = await HTTPSServer.create(config, false, DEFAULT_HOST, DEFAULT_ALLOWED_IPS);
        }
        server.run();
        return server;
      } catch (e) {
        if (!isThrowable(e) || !(e instanceof Exception)) throw e;
        throw new RuntimeException(`Could not start LanguageTool HTTPS server on ${DEFAULT_HOST}, port ${config.getPort()}`, e);
      }
    } catch (e) {
      if (!(e instanceof IllegalConfigurationException)) throw e;
      out(e.getMessage());
      out('Note: this is the HTTPS server - if you want to use plain HTTP instead, please see https://dev.languagetool.org/http-server');
      process.exit(1);
    }
    return undefined;
  }
}

export { DEFAULT_PORT };
