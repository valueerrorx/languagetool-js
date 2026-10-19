// Injectable wall clock (D-018): env LTJS_FIXED_TIME = ISO instant that the clock starts at and then ticks from; read lazily, a changed value restarts the clock.
let seenText;
let fixed = NaN;
let origin = performance.now();

// Java: System#currentTimeMillis()
export function currentTimeMillis() {
  const text = process.env.LTJS_FIXED_TIME;
  if (text !== seenText) {
    seenText = text;
    fixed = text ? Date.parse(text) : NaN;
    origin = performance.now();
  }
  if (Number.isNaN(fixed)) return Date.now();
  return Math.floor(fixed + (performance.now() - origin));
}
