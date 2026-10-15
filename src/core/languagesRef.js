// Late-bound access from Language to the Languages registry (breaks the module cycle Language <-> Languages).
export const ref = { Languages: null };

// returns the Languages class (set when Languages.js is loaded)
export function languages() {
  if (ref.Languages === null) throw new Error('org.languagetool.Languages is not loaded (import src/core/Languages.js)');
  return ref.Languages;
}
