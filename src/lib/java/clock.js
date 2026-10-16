// Injectable wall clock (D-018): env LTJS_FIXED_TIME = ISO instant that the clock starts at and then ticks from.
const fixed = process.env.LTJS_FIXED_TIME ? Date.parse(process.env.LTJS_FIXED_TIME) : NaN;
const origin = performance.now();

// Java: System#currentTimeMillis()
export function currentTimeMillis() {
  if (Number.isNaN(fixed)) return Date.now();
  return Math.floor(fixed + (performance.now() - origin));
}
