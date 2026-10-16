// Classpath access of the optimaize jar resources (languages/<code>, messages.properties); the host installs a loader.
let loader = null;

// installs `name -> Buffer|null` (classpath resource name without leading slash)
export function setResourceLoader(fn) {
  loader = fn;
}

// Java: ClassLoader#getResourceAsStream(String)
export function getResourceAsStream(name) {
  if (loader === null) throw new Error('optimaize resource loader not installed (setResourceLoader)');
  return loader(name);
}
