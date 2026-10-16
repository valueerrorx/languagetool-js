// System.out / System.err of the CLI (replaceable in tests); println appends "\n" (line.separator, S10)
let sinks = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

// JS: redirect stdout/stderr text (tests)
export function setSinks(out, err) {
  const old = sinks;
  sinks = { out: out ?? old.out, err: err ?? old.err };
  return old;
}

// Java: System.out.print(String)
export function outPrint(s) { sinks.out(String(s)); }

// Java: System.out.println(String)
export function outPrintln(s = '') { sinks.out(`${s}\n`); }

// Java: System.err.print(String)
export function errPrint(s) { sinks.err(String(s)); }

// Java: System.err.println(String)
export function errPrintln(s = '') { sinks.err(`${s}\n`); }

// Java: System.out / System.err as PrintStream-like objects with println
export const systemOut = { println: (s) => outPrintln(s) };
export const systemErr = { println: (s) => errPrintln(s) };
