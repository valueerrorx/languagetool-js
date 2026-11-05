// Static members of JLanguageTool for resources: data/class broker, password authenticator switch, temporary files, message bundles.
import { DefaultResourceDataBroker } from './ResourceDataBroker.js';
import { DefaultClassBroker } from './ClassBroker.js';

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
  // lazily docked: temp-file cleanup only runs from the cli/server, never on the check() path
  const { rmdirSync, unlinkSync } = await import('node:fs');
  for (const file of temporaryFiles) {
    if (typeof file === 'string') {
      try { unlinkSync(file); } catch { try { rmdirSync(file); } catch { /* File.delete() returns false */ } }
    } else {
      file.delete();
    }
  }
}
