// Pure helpers of scripts/update-resources.mjs: manifest diff, grouping by language, Java class reference scan.

// parses MANIFEST.sha256 text into Map(path -> sha256)
export function parseManifest(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const m = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (m) map.set(m[2], m[1]);
  }
  return map;
}

// compares two manifests: sorted lists of added, removed and changed paths
export function diffManifests(before, after) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const [p, h] of after) {
    if (!before.has(p)) added.push(p);
    else if (before.get(p) !== h) changed.push(p);
  }
  for (const p of before.keys()) if (!after.has(p)) removed.push(p);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

// language code of a resource path (org/languagetool/{rules,resource,...}/<lang>/...), 'other' for shared files
export function languageOf(rel) {
  const p = rel.replace(/^\.dup\/\d+\//, '');
  const m = /^org\/languagetool\/(?:rules|resource|language|tagging|synthesis|tokenizers)\/([a-z]{2,3})\//.exec(p) ?? /^(?:languages|org\/languagetool\/resource\/segment)\/([a-z]{2,3})\b/.exec(p);
  return m ? m[1] : 'other';
}

// groups paths by language code (sorted keys)
export function groupByLanguage(paths) {
  const groups = new Map();
  for (const p of paths) {
    const l = languageOf(p);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(p);
  }
  return new Map([...groups].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
}

// Java class names used as <filter class="..."> in a rule/disambiguation XML text (Set)
export function scanFilterClasses(xml) {
  const out = new Set();
  for (const m of xml.matchAll(/<filter\s[^>]*?\bclass\s*=\s*"([^"]+)"/g)) out.add(m[1]);
  return out;
}

