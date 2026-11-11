// Platform layer, Node side (package.json "imports" #platform, condition "node"): the Node built-ins the core needs.
// The browser side (browser.js) exports the same names; code that needs the file system checks IS_NODE first.
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export const IS_NODE = true;
export { fs, path, fileURLToPath, pathToFileURL, inflateRawSync };

// hex SHA-256 of bytes
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}
