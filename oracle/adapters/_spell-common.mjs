// Shared helpers of the X-SPELL adapters (F41): JS twins of SpellOps helpers (docs/review/F41-oracle.md).

// Java: SpellOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const e = { class: t.javaClass ?? `js:${t.constructor.name}`, message: t.message ?? null };
  const c = typeof t.getCause === 'function' ? t.getCause() : null;
  if (c !== null && c !== undefined) e.cause = err(c);
  return e;
}

// Java: SpellOps#ws(List<WeightedSuggestion>)
export const ws = (l) => l.map((w) => w.toString());

// Java: SpellOps#b(JsonNode,String)
export const b = (a, k) => a[k] !== undefined && a[k] !== null && a[k] === true;
