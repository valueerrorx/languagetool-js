// Static members of JLanguageTool for resources: data/class broker, password authenticator switch, temporary files, message bundles.
import { DefaultResourceDataBroker } from './ResourceDataBroker.js';
import { DefaultClassBroker } from './ClassBroker.js';
import { IS_NODE, fs } from '#platform';

let dataBroker = new DefaultResourceDataBroker();
let classBroker = new DefaultClassBroker();
let useCustomPasswordAuthenticator = true;
const temporaryFiles = [];

// Java: JLanguageTool#getDataBroker()
export function getDataBroker() {
  if (dataBroker === null) dataBroker = new DefaultResourceDataBroker();
  return dataBroker;
}

// Java: JLanguageTool#setDataBroker(ResourceDataBroker)
export function setDataBroker(broker) {
  dataBroker = broker;
}

// Java: JLanguageTool#getClassBroker()
export function getClassBroker() {
  if (classBroker === null) classBroker = new DefaultClassBroker();
  return classBroker;
}

// Java: JLanguageTool#setClassBrokerBroker(ClassBroker)
export function setClassBrokerBroker(broker) {
  classBroker = broker;
}

// Java: JLanguageTool#isCustomPasswordAuthenticatorUsed()
export function isCustomPasswordAuthenticatorUsed() {
  return useCustomPasswordAuthenticator;
}

// Java: JLanguageTool#useCustomPasswordAuthenticator(boolean)
export function setUseCustomPasswordAuthenticator(use) {
  useCustomPasswordAuthenticator = use;
}

// Java: JLanguageTool#addTemporaryFile(File)
export function addTemporaryFile(file) {
  temporaryFiles.push(file);
}

// Java: JLanguageTool#removeTemporaryFiles() (file = path string or object with delete())
export async function removeTemporaryFiles() {
  // temp-file cleanup only runs from the cli/server, never on the check() path; no files in the browser
  if (!IS_NODE) return;
  const { rmdirSync, unlinkSync } = fs;
  for (const file of temporaryFiles) {
    if (typeof file === 'string') {
      try { unlinkSync(file); } catch { try { rmdirSync(file); } catch { /* File.delete() returns false */ } }
    } else {
      file.delete();
    }
  }
}
