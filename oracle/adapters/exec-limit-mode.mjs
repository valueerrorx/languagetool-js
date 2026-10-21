// JS twin of harness op "exec-limit-mode" (LtjsBridge#limitMode, SRV-0161).
import { LimitEnforcementMode } from '../../src/server/LimitEnforcementMode.js';

// Java: LtjsBridge#limitMode(JsonNode); System.err is captured per value
export function run(a) {
  const out = [];
  const oldWrite = process.stderr.write;
  try {
    for (const value of a.values) {
      let captured = '';
      process.stderr.write = (chunk) => { captured += String(chunk); return true; };
      const m = LimitEnforcementMode.parse(value);
      process.stderr.write = oldWrite;
      out.push({ input: value, name: m.name(), id: m.getId(), stderr: captured });
    }
  } finally {
    process.stderr.write = oldWrite;
  }
  return out;
}
