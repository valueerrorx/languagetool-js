// Public API of @valueerror/ltjs-core: check(), startServer(), listLanguages().
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import './lang/register.js'; // registers the core classes and every installed language package (top-level await)
import { check, listLanguages, registerLanguage, setMemoryLimits } from './core/check.js';
import { VERSION } from './core/LtBuildInfo.js';
import { HTTPServer, DEFAULT_ALLOWED_IPS } from './server/HTTPServer.js';
import { HTTPServerConfig, DEFAULT_HOST } from './server/HTTPServerConfig.js';
import { DatabaseAccess } from './server/DatabaseAccess.js';

export { check, listLanguages, registerLanguage, setMemoryLimits, VERSION };

/**
 * Starts the HTTP API server. Returns {port, host, server, close()}.
 * options: port (default 8081), host (default 'localhost'; null binds all interfaces without the IP allow list),
 * config (object of LanguageTool server properties, e.g. {maxTextLength: 50000, cacheSize: 1000}), args (extra command line args).
 */
export async function startServer({ port = 8081, host = DEFAULT_HOST, config = {}, args = [] } = {}) {
  let tmp = null;
  const argv = ['--port', String(port), ...args];
  const entries = Object.entries(config ?? {});
  if (entries.length > 0) {
    tmp = mkdtempSync(path.join(tmpdir(), 'ltjs-'));
    const file = path.join(tmp, 'server.properties');
    writeFileSync(file, entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    argv.push('--config', file);
  }
  try {
    const cfg = new HTTPServerConfig(argv);
    DatabaseAccess.init(cfg);
    const server = host === null ? await HTTPServer.create(cfg, false, null, null) : await HTTPServer.create(cfg, false, host, DEFAULT_ALLOWED_IPS);
    server.run();
    return { port: server.port, host, server, close: () => server.stop() };
  } finally {
    if (tmp !== null) rmSync(tmp, { recursive: true, force: true });
  }
}
