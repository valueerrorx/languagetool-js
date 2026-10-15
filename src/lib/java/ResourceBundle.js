// java.util.ResourceBundle subset: PropertyResourceBundle/ListResourceBundle, getBundle candidate-locale + default-locale fallback (JDK 17).
import { MissingResourceException, NullPointerException } from './errors.js';
import { Locale } from './Locale.js';
import { loadProperties, decodeBundleBytes } from './Properties.js';

// Java: java.util.ResourceBundle
export class ResourceBundle {
  static FQCN = 'java.util.ResourceBundle';

  constructor() {
    this.parent = null;
    this.locale = null;
  }

  // Java: ResourceBundle#getLocale()
  getLocale() {
    return this.locale;
  }

  // Java: ResourceBundle#getString(String)
  getString(key) {
    return this.getObject(key);
  }

  // Java: ResourceBundle#getObject(String)
  getObject(key) {
    let obj = this.handleGetObject(key);
    if (obj === null || obj === undefined) {
      if (this.parent !== null) obj = this.parent.getObject(key);
      if (obj === null || obj === undefined) {
        const cn = this.constructor.FQCN;
        throw new MissingResourceException(`Can't find resource for bundle ${cn}, key ${key}`, cn, key);
      }
    }
    return obj;
  }

  // Java: ResourceBundle#keySet()
  keySet() {
    const keys = new Set();
    for (let b = this; b !== null; b = b.parent) for (const k of b.handleKeySet()) keys.add(k);
    return keys;
  }

  // Java: ResourceBundle#containsKey(String)
  containsKey(key) {
    if (key === null || key === undefined) throw new NullPointerException();
    for (let b = this; b !== null; b = b.parent) if (b.handleKeySet().has(key)) return true;
    return false;
  }

  // Java: ResourceBundle#handleKeySet()
  handleKeySet() {
    const keys = new Set();
    for (const k of this.getKeys()) if (this.handleGetObject(k) !== null) keys.add(k);
    return keys;
  }

  // Java: ResourceBundle.getBundle(String,Locale) with the classpath resource loader `getResource(path) -> Buffer|null`
  static getBundle(baseName, locale, getResource) {
    if (baseName === null || baseName === undefined || locale === null || locale === undefined) throw new NullPointerException();
    let baseBundle = null;
    let bundle = null;
    const defaultLocale = Locale.getDefault();
    for (let target = locale; target !== null; target = target.equals(defaultLocale) ? null : defaultLocale) {
      const candidates = getCandidateLocales(target);
      bundle = findBundle(baseName, candidates, 0, getResource);
      if (bundle !== null) {
        const isBaseBundle = Locale.ROOT.equals(bundle.locale);
        if (!isBaseBundle || bundle.locale.equals(locale) || (candidates.length === 1 && bundle.locale.equals(candidates[0]))) break;
        if (isBaseBundle && baseBundle === null) baseBundle = bundle;
        bundle = null;
      }
    }
    if (bundle === null) {
      if (baseBundle === null) {
        throw new MissingResourceException(`Can't find bundle for base name ${baseName}, locale ${locale}`, `${baseName}_${locale}`, '');
      }
      bundle = baseBundle;
    }
    return bundle;
  }
}

// Java: ResourceBundle.Control#getCandidateLocales(String,Locale)
function getCandidateLocales(locale) {
  const list = [];
  const language = locale.getLanguage();
  const country = locale.getCountry();
  const variant = locale.getVariant();
  if (variant.length > 0) {
    const variants = variant.split('_');
    for (let n = variants.length; n > 0; n--) list.push(new Locale(language, country, variants.slice(0, n).join('_')));
  }
  if (country.length > 0) list.push(new Locale(language, country, ''));
  if (language.length > 0) list.push(new Locale(language, '', ''));
  list.push(Locale.ROOT);
  return list;
}

// Java: ResourceBundle.Control#toBundleName(String,Locale)
function toBundleName(baseName, locale) {
  const language = locale.getLanguage();
  const country = locale.getCountry();
  const variant = locale.getVariant();
  if (language === '' && country === '' && variant === '') return baseName;
  let sb = `${baseName}_`;
  if (variant !== '') sb += `${language}_${country}_${variant}`;
  else if (country !== '') sb += `${language}_${country}`;
  else sb += language;
  return sb;
}

const cache = new WeakMap(); // getResource -> Map(resource name -> bundle|null)

// Java: ResourceBundle#findBundle(...) (parent chain = next existing candidate)
function findBundle(baseName, candidates, index, getResource) {
  let perLoader = cache.get(getResource);
  if (!perLoader) {
    perLoader = new Map();
    cache.set(getResource, perLoader);
  }
  const loc = candidates[index];
  const name = `${toBundleName(baseName, loc).replaceAll('.', '/')}.properties`;
  let parent = null;
  if (index + 1 < candidates.length) parent = findBundle(baseName, candidates, index + 1, getResource);
  const key = `${name}\u0000${parent === null ? '' : parent.locale}`;
  if (perLoader.has(key)) return perLoader.get(key) ?? parent;
  const data = getResource(name);
  let bundle = null;
  if (data !== null && data !== undefined) {
    bundle = new PropertyResourceBundle(data);
    bundle.locale = loc;
    bundle.parent = parent;
  }
  perLoader.set(key, bundle);
  return bundle ?? parent;
}

// Java: java.util.PropertyResourceBundle
export class PropertyResourceBundle extends ResourceBundle {
  static FQCN = 'java.util.PropertyResourceBundle';

  // Java: PropertyResourceBundle#PropertyResourceBundle(InputStream)
  constructor(buf) {
    super();
    this.lookup = loadProperties(decodeBundleBytes(buf));
  }

  // Java: PropertyResourceBundle#handleGetObject(String)
  handleGetObject(key) {
    if (key === null || key === undefined) throw new NullPointerException();
    return this.lookup.has(key) ? this.lookup.get(key) : null;
  }

  // Java: PropertyResourceBundle#getKeys()
  getKeys() {
    const own = [...this.lookup.keys()];
    if (this.parent === null) return own;
    const set = new Set(own);
    for (const k of this.parent.getKeys()) if (!set.has(k)) own.push(k);
    return own;
  }

  // Java: PropertyResourceBundle#handleKeySet()
  handleKeySet() {
    return new Set(this.lookup.keys());
  }
}

// Java: java.util.ListResourceBundle (contents = [[key, value], ...])
export class ListResourceBundle extends ResourceBundle {
  static FQCN = 'java.util.ListResourceBundle';

  constructor(contents) {
    super();
    this.lookup = new Map(contents);
  }

  // Java: ListResourceBundle#handleGetObject(String)
  handleGetObject(key) {
    if (key === null || key === undefined) throw new NullPointerException();
    return this.lookup.has(key) ? this.lookup.get(key) : null;
  }

  // Java: ListResourceBundle#getKeys()
  getKeys() {
    const own = [...this.lookup.keys()];
    if (this.parent === null) return own;
    const set = new Set(own);
    for (const k of this.parent.getKeys()) if (!set.has(k)) own.push(k);
    return own;
  }

  // Java: ListResourceBundle#handleKeySet()
  handleKeySet() {
    return new Set(this.lookup.keys());
  }
}
