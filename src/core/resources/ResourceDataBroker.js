// Resource access on the classpath layout under resources/ (D: byte-exact copies, see scripts/resources.mjs).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RuntimeException, NullPointerException } from '../../lib/java/errors.js';
import { ResourceBundle } from '../../lib/java/ResourceBundle.js';
import { readerLines, decodeUtf8 } from '../../lib/java/io.js';

export const RESOURCE_DIR = '/org/languagetool/resource'; // Java: ResourceDataBroker#RESOURCE_DIR
export const RULES_DIR = '/org/languagetool/rules'; // Java: ResourceDataBroker#RULES_DIR

const HERE = path.dirname(fileURLToPath(import.meta.url));
// resource roots in classpath order: the dev repo has resources/ (or $LTJS_RESOURCES); the core package ships resources/ at the same relative place
// and every @valueerror/ltjs-lang-<code> package adds its own resources/ via addResourceRoot (first root wins, getResources collects all roots)
export const RESOURCES_ROOT = process.env.LTJS_RESOURCES ?? path.resolve(HERE, '../../../resources');
const resourceRoots = [RESOURCES_ROOT];

// registers an additional resource root (a directory in classpath layout); a no-op for a root that is already registered
export function addResourceRoot(dir) {
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
  if (statSync(file).isDirectory()) return Buffer.from(readdirSync(file).map((n) => `${n}\n`).join(''), 'utf8');
  return readFileSync(file);
}

// maps a classpath resource name (no leading slash) to a file below the resources root, or null
function locateIn(root, name, copy) {
  const base = copy === 0 ? root : path.join(root, '.dup', String(copy));
  const f = path.resolve(base, name);
  if (f !== base && !f.startsWith(base + path.sep)) return null;
  return existsSync(f) ? f : null;
}

// first root that holds the resource (copy 0)
function locate(name) {
  for (const root of resourceRoots) {
    const f = locateIn(root, name, 0);
    if (f !== null) return f;
  }
  return null;
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
  const f = locate(resolved);
  return f === null ? null : readResourceFile(f);
}

// Java: ResourceDataBroker.class.getResource(String)
export function getResource(name) {
  const f = locate(resolveName(name));
  return f === null ? null : new ResourceUrl(f);
}

// Java: ResourceDataBroker.class.getClassLoader().getResources(String)
export function getResources(name) {
  const out = [];
  for (const root of resourceRoots) {
    for (let copy = 0; ; copy++) {
      const f = locateIn(root, name, copy);
      if (f === null) break;
      out.push(new ResourceUrl(f));
    }
  }
  return out;
}

// classpath loader for ResourceBundle.getBundle (one function so the bundle cache is shared)
function bundleLoader(name) {
  const f = locate(name);
  return f === null ? null : readFileSync(f);
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
