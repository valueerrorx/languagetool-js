// JS twin of harness op "exec-user-limits" (LtjsBridge#userLimits, SRV-0160).
import { UserLimits } from '../../src/server/UserLimits.js';
import { getUserLimits } from '../../src/server/ServerTools.js';
import { config, err } from './_exec-common.mjs';

const num = (v) => (typeof v === 'bigint' ? Number(v) : v);

// Java: LtjsBridge#userLimits(JsonNode)
export function run(a) {
  const cfg = config(a.config);
  const out = [];
  for (const c of a.cases) {
    const params = new Map();
    for (const [k, v] of Object.entries(c.params)) params.set(k, String(v));
    const auth = c.authHeader !== undefined ? c.authHeader : null;
    const r = {};
    try {
      let l;
      if ((c.direct ?? '') === 'whitelist') {
        // private fallback of the DB lookups (unreachable over HTTP in the open-source build)
        l = UserLimits.getUserLimitsFromWhitelistOrDefault(cfg, params.get('username'));
      } else {
        l = getUserLimits(params, cfg, auth);
      }
      r.maxTextLength = l.getMaxTextLength();
      r.maxCheckTimeMillis = l.getMaxCheckTimeMillis();
      r.hasPremium = l.hasPremium();
      r.premiumUid = num(l.getPremiumUid());
      r.skipLimits = l.getSkipLimits();
      r.dictCacheSize = num(l.getDictCacheSize());
      r.requestsPerDay = num(l.getRequestsPerDay());
      r.limitEnforcementMode = l.getLimitEnforcementMode().name();
      r.toString = l.toString();
    } catch (t) {
      if (t === null || typeof t !== 'object' || typeof t.getMessage !== 'function') throw t;
      r.error = err(t);
    }
    out.push(r);
  }
  return out;
}
