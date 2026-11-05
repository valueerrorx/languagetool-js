// java.io.File (Unix path semantics: normalisation, name/parent, absolute path against user.dir).
import { getResource } from '../../../core/resources/ResourceDataBroker.js';
import { NullPointerException } from '../errors.js';

// Java: UnixFileSystem#normalize(String)
function normalize(p) {
  let out = '';
  let prev = '';
  for (const c of p) {
    if (c === '/' && prev === '/') continue;
    out += c;
    prev = c;
  }
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

// Java: java.io.File
export class File {
  static FQCN = 'java.io.File';

  // Java: File#File(String) / File(File,String) / File(String,String)
  constructor(a, b) {
    if (b === undefined) {
      if (a === null || a === undefined) throw new NullPointerException();
      this.path = normalize(a);
    } else {
      if (b === null) throw new NullPointerException();
      if (a === null) {
        this.path = normalize(b);
      } else {
        const parent = a instanceof File ? a.path : normalize(a);
        const child = normalize(b);
        if (parent === '') this.path = child === '' ? '' : `/${child.replace(/^\//, '')}`;
        else if (child === '') this.path = parent;
        else if (parent === '/') this.path = `/${child.replace(/^\//, '')}`;
        else this.path = `${parent}/${child.replace(/^\//, '')}`;
      }
    }
  }

  // Java: File#getName()
  getName() {
    const i = this.path.lastIndexOf('/');
    return i < 0 ? this.path : this.path.slice(i + 1);
  }

  // Java: File#getPath()
  getPath() {
    return this.path;
  }

  // Java: File#getParent()
  getParent() {
    const i = this.path.lastIndexOf('/');
    const prefixLength = this.path.startsWith('/') ? 1 : 0;
    if (i < prefixLength) return prefixLength > 0 && this.path.length > prefixLength ? this.path.slice(0, prefixLength) : null;
    return this.path.slice(0, i);
  }

  // Java: File#getParentFile()
  getParentFile() {
    const p = this.getParent();
    return p === null ? null : new File(p);
  }

  // Java: File#isAbsolute()
  isAbsolute() {
    return this.path.startsWith('/');
  }

  // Java: File#getAbsolutePath()
  getAbsolutePath() {
    if (this.isAbsolute()) return this.path;
    const userDir = process.cwd();
    if (this.path === '') return userDir;
    return userDir === '/' ? `/${this.path}` : `${userDir}/${this.path}`;
  }

  // Java: File#exists()
  exists() {
    if (this.path === '') return false; // java.io.File("") is the user dir, which is not a broker resource
    const name = this.path.startsWith('/') ? this.path : `/${this.path}`;
    return getResource(name) !== null;
  }

  // Java: File#toString()
  toString() {
    return this.path;
  }

  // Java: File#equals(Object)
  equals(o) {
    return o instanceof File && o.path === this.path;
  }

  // Java: File#hashCode() (UnixFileSystem: path hash ^ 1234321)
  hashCode() {
    let h = 0;
    for (let i = 0; i < this.path.length; i++) h = (Math.imul(31, h) + this.path.charCodeAt(i)) | 0;
    return h ^ 1234321;
  }
}
