// Resource access on the classpath layout under resources/ (D: byte-exact copies, see scripts/resources.mjs).
import { IS_NODE, fs, path, fileURLToPath, pathToFileURL } from '#platform';
import { RuntimeException, NullPointerException } from '../../lib/java/errors.js';
import { ResourceBundle } from '../../lib/java/ResourceBundle.js';
import { readerLines, decodeUtf8 } from '../../lib/java/io.js';

export const RESOURCE_DIR = '/org/languagetool/resource'; // Java: ResourceDataBroker#RESOURCE_DIR
export const RULES_DIR = '/org/languagetool/rules'; // Java: ResourceDataBroker#RULES_DIR

// resource roots in classpath order: the dev repo has resources/ (or $LTJS_RESOURCES); the core package ships resources/ at the same relative place
// and every @valueerror/ltjs-lang-<code> package adds its own resources/ via addResourceRoot (first root wins, getResources collects all roots).
// Browser: no file system, no roots; the resources come from preloadResources() (memory backend).
export const RESOURCES_ROOT = IS_NODE
  ? process.env.LTJS_RESOURCES ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../resources')
  : null;
const resourceRoots = IS_NODE ? [RESOURCES_ROOT] : [];

// registers an additional resource root (a directory in classpath layout); a no-op for a root that is already registered (and in the browser)
export function addResourceRoot(dir) {
  if (!IS_NODE) return;
  const root = path.resolve(dir instanceof URL ? fileURLToPath(dir) : dir);
  if (!resourceRoots.includes(root)) resourceRoots.push(root);
}

// the registered resource roots in lookup order
export function getResourceRoots() {
  return [...resourceRoots];
}

// java.net.URL of a classpath resource (file based)
export class ResourceUrl {
  constructor(file) {
    this.file = file;
  }

  // Java: URL#toString()
  toString() {
    return pathToFileURL(this.file).href;
  }

  // Java: URL#getPath()
  getPath() {
    return this.file;
  }

  // Java: URL#openStream()
  openStream() {
    return readResourceFile(this.file);
  }
}

// reads a file, or the listing of a directory (FileURLConnection)
function readResourceFile(file) {
  if (fs.statSync(file).isDirectory()) return Buffer.from(fs.readdirSync(file).map((n) => `${n}\n`).join(''), 'utf8');
  return fs.readFileSync(file);
}

// synchronous resource backend: reads by class-path resource name (relative, no leading slash) —
//   read(name) -> Buffer/Uint8Array or null, isDirectory(name) -> boolean, readDirectory(name) -> string[] or null.
// Node uses the FsResourceBackend below; the browser uses a MemoryResourceBackend filled eagerly by
// preloadResources() before any check, because the core reads resources synchronously.

// fs-backed sync resource backend (the default): locates class-path names below the resource roots
// (first root wins; copy N of a file lives below <root>/.dup/N) and reads bytes synchronously
export class FsResourceBackend {
  // maps a classpath resource name (no leading slash) to a file below the resources root, or null
  locateIn(root, name, copy) {
    const base = copy === 0 ? root : path.join(root, '.dup', String(copy));
    const f = path.resolve(base, name);
    if (f !== base && !f.startsWith(base + path.sep)) return null;
    return fs.existsSync(f) ? f : null;
  }

  // first root that holds the resource (copy 0)
  locate(name) {
    for (const root of resourceRoots) {
      const f = this.locateIn(root, name, 0);
      if (f !== null) return f;
    }
    return null;
  }

  // backend: reads a resource by class-path name (Buffer, or null when absent)
  read(name) {
    const f = this.locate(name);
    return f === null ? null : readResourceFile(f);
  }

  // backend: is the class-path name a directory below some root?
  isDirectory(name) {
    for (const root of resourceRoots) {
      const f = this.locateIn(root, name, 0);
      if (f !== null) return fs.statSync(f).isDirectory();
    }
    return false;
  }

  // backend: entry names of a class-path directory, or null
  readDirectory(name) {
    for (const root of resourceRoots) {
      const f = this.locateIn(root, name, 0);
      if (f !== null) return fs.statSync(f).isDirectory() ? fs.readdirSync(f) : null;
    }
    return null;
  }

  // Java: ClassLoader#getResource (file based)
  getUrl(name) {
    const f = this.locate(name);
    return f === null ? null : new ResourceUrl(f);
  }

  // Java: ClassLoader#getResources (all roots, byte-exact copies 0..n)
  getUrls(name) {
    const out = [];
    for (const root of resourceRoots) {
      for (let copy = 0; ; copy++) {
        const f = this.locateIn(root, name, copy);
        if (f === null) break;
        out.push(new ResourceUrl(f));
      }
    }
    return out;
  }
}

// resource URL of the memory store: identifier = class-path name, bytes served from the owning backend
class MemoryResourceUrl {
  constructor(name, backend) {
    this.name = name;
    this.backend = backend;
  }

  // Java: URL#toString()
  toString() {
    return `memory:${this.name}`;
  }

  // Java: URL#getPath()
  getPath() {
    return this.name;
  }

  // Java: URL#openStream()
  openStream() {
    return this.backend.read(this.name);
  }
}

// in-memory sync resource backend (the browser path): file bytes and explicit directory listings,
// keyed by class-path resource name; populate via set()/setDirectory() or preloadResources()
export class MemoryResourceBackend {
  constructor() {
    this.files = new Map(); // class-path name -> Uint8Array
    this.directoryEntries = new Map(); // class-path directory name -> entry names
  }

  // stores the bytes of a file under a class-path resource name
  set(name, bytes) {
    this.files.set(name, bytes);
  }

  // stores the explicit directory listing of a class-path directory (entry names as given)
  setDirectory(name, entries) {
    this.directoryEntries.set(name, entries);
  }

  // backend: reads a resource by class-path name (Buffer/Uint8Array, or null when absent)
  read(name) {
    if (this.files.has(name)) return this.files.get(name);
    const entries = this.directoryEntries.get(name);
    return entries === undefined ? null : Buffer.from(entries.map((n) => `${n}\n`).join(''), 'utf8');
  }

  // backend: is the class-path name a directory?
  isDirectory(name) {
    return this.directoryEntries.has(name);
  }

  // backend: entry names of a class-path directory, or null
  readDirectory(name) {
    return this.directoryEntries.get(name) ?? null;
  }

  // Java: ClassLoader#getResource
  getUrl(name) {
    return this.files.has(name) || this.directoryEntries.has(name) ? new MemoryResourceUrl(name, this) : null;
  }

  // Java: ClassLoader#getResources (copy N of a name is stored as .dup/N/<name>, as in the fs layout)
  getUrls(name) {
    const out = [];
    for (let copy = 0; ; copy++) {
      const key = copy === 0 ? name : `.dup/${copy}/${name}`;
      const url = this.getUrl(key);
      if (url === null) break;
      out.push(url);
    }
    return out;
  }
}

let fsBackend = null; // the shared default (file system) backend
let current = null; // the active sync resource backend (null = the default fs backend)

// the default fs backend; addResourceRoot always targets it, even while another backend is active
function defaultFsBackend() {
  if (fsBackend === null) fsBackend = new FsResourceBackend();
  return fsBackend;
}

// the active sync resource backend (defaults to the fs backend)
function currentBackend() {
  return current === null ? defaultFsBackend() : current;
}

// swaps the active sync resource backend (tests; the browser installs the preloaded memory store)
export function setResourceBackend(backend) {
  current = backend;
}

// restores the default fs backend as the active sync resource backend
export function resetToFsBackend() {
  current = null;
}

/**
 * Preloads the browser resource store: fetches every explicit manifest entry (class-path names, e.g.
 * 'org/languagetool/rules/de/grammar.xml') via the async fetchImpl(url) and activates a
 * MemoryResourceBackend with them as the current backend. The app must pass the full manifest
 * because fetch cannot enumerate directories (scripts/browser-manifest.mjs writes one).
 * entries: { url, name } (manifest of scripts/browser-manifest.mjs) or URL strings whose class-path key is the URL minus stripPrefix;
 * directories: { 'class/path/dir': [entry names] } for the listings the core reads;
 * fetchImpl: async (url) => Response|Uint8Array (default: globalThis.fetch); concurrency: parallel fetches.
 */
export async function preloadResources({ fetchImpl = globalThis.fetch, entries = [], stripPrefix, directories = {}, concurrency = 8 } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('preloadResources: fetchImpl is required (fetch cannot list directories; pass an explicit manifest of class-path entry names)');
  }
  const backend = new MemoryResourceBackend();
  let next = 0;
  const worker = async () => {
    while (next < entries.length) {
      const entry = entries[next++];
      const url = typeof entry === 'string' ? entry : entry.url;
      let data = await fetchImpl(url);
      if (!(data instanceof Uint8Array)) {
        if (data.ok === false) throw new Error(`preloadResources: ${url}: HTTP ${data.status}`);
        data = new Uint8Array(await data.arrayBuffer());
      }
      const key = typeof entry !== 'string' ? entry.name : stripPrefix && url.startsWith(stripPrefix) ? url.slice(stripPrefix.length) : url;
      backend.set(key, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); // the core reads resources with the Buffer API
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  for (const [dir, names] of Object.entries(directories)) backend.setDirectory(dir, names);
  setResourceBackend(backend);
}

// Java: Class#resolveName(String) for ResourceDataBroker.class
function resolveName(name) {
  if (name === null || name === undefined) throw new NullPointerException();
  return name.startsWith('/') ? name.slice(1) : `org/languagetool/broker/${name}`;
}

// Java: ResourceDataBroker.class.getResourceAsStream(String)
export function getResourceAsStream(name) {
  const resolved = resolveName(name);
  if (resolved === 'org/languagetool/broker/') return Buffer.alloc(0); // the package directory entry of the core jar: empty stream (name "")
  return currentBackend().read(resolved);
}

// Java: ResourceDataBroker.class.getResource(String)
export function getResource(name) {
  return currentBackend().getUrl(resolveName(name));
}

// Java: ResourceDataBroker.class.getClassLoader().getResources(String)
export function getResources(name) {
  return currentBackend().getUrls(name);
}

// classpath loader for ResourceBundle.getBundle (one function so the bundle cache is shared)
function bundleLoader(name) {
  return currentBackend().read(name);
}

// Java: org.languagetool.broker.DefaultResourceDataBroker
export class DefaultResourceDataBroker {
  static FQCN = 'org.languagetool.broker.DefaultResourceDataBroker';

  // Java: DefaultResourceDataBroker#DefaultResourceDataBroker() / (String,String)
  constructor(resourceDir = RESOURCE_DIR, rulesDir = RULES_DIR) {
    this.resourceDir = resourceDir === null || resourceDir === undefined ? '' : resourceDir;
    this.rulesDir = rulesDir === null || rulesDir === undefined ? '' : rulesDir;
  }

  // Java: DefaultResourceDataBroker#getFromResourceDirAsStream(String)
  getFromResourceDirAsStream(p) {
    const completePath = this.getCompleteResourceUrl(p);
    const resourceAsStream = this.getAsStream(completePath);
    this.assertNotNull(resourceAsStream, p, completePath);
    return resourceAsStream;
  }

  // Java: DefaultResourceDataBroker#getFromResourceDirAsLines(String)
  getFromResourceDirAsLines(p) {
    return readerLines(decodeUtf8(this.getFromResourceDirAsStream(p)));
  }

  // Java: DefaultResourceDataBroker#getAsStream(String)
  getAsStream(p) {
    return getResourceAsStream(p);
  }

  // Java: DefaultResourceDataBroker#getAsURL(String)
  getAsURL(p) {
    return getResource(p);
  }

  // Java: DefaultResourceDataBroker#getAsURLs(String)
  getAsURLs(p) {
    return getResources(p);
  }

  // Java: DefaultResourceDataBroker#getFromResourceDirAsUrl(String)
  getFromResourceDirAsUrl(p) {
    const completePath = this.getCompleteResourceUrl(p);
    const resource = this.getAsURL(completePath);
    this.assertNotNull(resource, p, completePath);
    return resource;
  }

  // Java: DefaultResourceDataBroker#getFromResourceDirAsUrls(String)
  getFromResourceDirAsUrls(p) {
    const completePath = this.getCompleteResourceUrl(p);
    const resources = this.getAsURLs(completePath.substring(1));
    this.assertNotNull(resources, p, completePath);
    return resources;
  }

  // Java: DefaultResourceDataBroker#getCompleteResourceUrl(String)
  getCompleteResourceUrl(p) {
    return this.appendPath(this.resourceDir, p);
  }

  // Java: DefaultResourceDataBroker#getFromRulesDirAsStream(String)
  getFromRulesDirAsStream(p) {
    const completePath = this.getCompleteRulesUrl(p);
    const resourceAsStream = this.getAsStream(completePath);
    this.assertNotNull(resourceAsStream, p, completePath);
    return resourceAsStream;
  }

  // Java: DefaultResourceDataBroker#getFromRulesDirAsUrl(String)
  getFromRulesDirAsUrl(p) {
    const completePath = this.getCompleteRulesUrl(p);
    const resource = this.getAsURL(completePath);
    this.assertNotNull(resource, p, completePath);
    return resource;
  }

  // Java: DefaultResourceDataBroker#assertNotNull(Object,String,String)
  assertNotNull(object, p, completePath) {
    if (object === null || object === undefined) {
      throw new RuntimeException(`Path ${p} not found in class path at ${completePath}`);
    }
  }

  // Java: DefaultResourceDataBroker#getCompleteRulesUrl(String)
  getCompleteRulesUrl(p) {
    return this.appendPath(this.rulesDir, p);
  }

  // Java: DefaultResourceDataBroker#appendPath(String,String) (tests this.rulesDir for both dirs, as Java does)
  appendPath(baseDir, p) {
    if (p === null || p === undefined) throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "path" is null');
    let completePath = baseDir;
    if (!this.rulesDir.endsWith('/') && !p.startsWith('/')) completePath += '/';
    if (this.rulesDir.endsWith('/') && p.startsWith('/') && p.length > 1) completePath += p.substring(1);
    else completePath += p;
    return completePath;
  }

  // Java: DefaultResourceDataBroker#resourceExists(String)
  resourceExists(p) {
    return this.getAsURL(this.getCompleteResourceUrl(p)) !== null;
  }

  // Java: DefaultResourceDataBroker#ruleFileExists(String)
  ruleFileExists(p) {
    return this.getAsURL(this.getCompleteRulesUrl(p)) !== null;
  }

  // Java: DefaultResourceDataBroker#getResourceDir()
  getResourceDir() {
    return this.resourceDir;
  }

  // Java: DefaultResourceDataBroker#getRulesDir()
  getRulesDir() {
    return this.rulesDir;
  }

  // Java: DefaultResourceDataBroker#getResourceBundle(String,Locale) -> ResourceBundle.getBundle(baseName, locale)
  getResourceBundle(baseName, locale) {
    return ResourceBundle.getBundle(baseName, locale, bundleLoader);
  }
}
