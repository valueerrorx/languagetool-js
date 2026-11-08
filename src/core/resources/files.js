// Disk files of the ported Java File/Files/FileInputStream calls (user dictionaries, external rule files, CLI input, ...).
// Node: the real file system, exactly as before. Browsers/workers have no files: a path resolves through the resource
// broker (absolute path below a resource root, else the path itself as a class-path name), errors mimic fs (code ENOENT).
import { IS_NODE, fs } from '#platform';
import { getResource, getResourceAsStream, getResourceRoots } from './ResourceDataBroker.js';

// class-path name (leading slash) of a path in the browser
function resourceName(p) {
  const s = String(p);
  for (const root of getResourceRoots()) {
    const prefix = root.endsWith('/') ? root : `${root}/`;
    if (s.startsWith(prefix)) return `/${s.slice(prefix.length)}`;
  }
  return s.startsWith('/') ? s : `/${s}`;
}

function enoent(syscall, p) {
  const e = new Error(`ENOENT: no such file or directory, ${syscall} '${p}'`);
  e.code = 'ENOENT';
  e.syscall = syscall;
  e.path = String(p);
  return e;
}

export function existsSync(p) {
  if (IS_NODE) return fs.existsSync(p);
  return getResource(resourceName(p)) !== null;
}

export function readFileSync(p, encoding) {
  if (IS_NODE) return fs.readFileSync(p, encoding);
  const bytes = getResourceAsStream(resourceName(p));
  if (bytes === null) throw enoent('open', p);
  return encoding === undefined ? bytes : Buffer.from(bytes).toString(encoding);
}

export function statSync(p) {
  if (IS_NODE) return fs.statSync(p);
  if (getResource(resourceName(p)) === null) throw enoent('stat', p);
  return { isDirectory: () => false, isFile: () => true };
}
