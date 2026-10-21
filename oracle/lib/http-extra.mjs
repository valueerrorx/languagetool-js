// Request kinds beyond plain fetch (F66/F67): source address (allow-list) and held-open request with parallel probes (work queue).
import http from 'node:http';
import net from 'node:net';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toRecord(res, text, req) {
  const ct = (res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  let body = text;
  if (ct === 'application/json') { try { body = JSON.parse(text); } catch { body = text; } }
  const out = { status: res.statusCode, contentType: ct, accessControlAllowOrigin: res.headers['access-control-allow-origin'] ?? null, body };
  if (req.recordHeaders) out.headers = Object.fromEntries(req.recordHeaders.map((h) => [h.toLowerCase(), res.headers[h.toLowerCase()] ?? null]));
  return out;
}

// req.localAddress: client socket bound to this source address (e.g. 127.0.0.2 -> not in the server's allow-list)
function viaLocalAddress(base, req) {
  const u = new URL(base + req.path);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.params ?? {})) for (const x of [].concat(v)) params.append(k, x);
  const method = req.method ?? 'GET';
  let pathq = u.pathname + u.search;
  let body = null;
  const headers = { ...(req.headers ?? {}), Connection: 'close' };
  if (method === 'GET') { if ([...params].length) pathq += (u.search ? '&' : '?') + params.toString(); } else {
    body = req.body ?? params.toString();
    headers['Content-Type'] = req.contentType ?? 'application/x-www-form-urlencoded; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve) => {
    const r = http.request({ host: u.hostname, port: u.port, method, path: pathq, headers, localAddress: req.localAddress, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(toRecord(res, Buffer.concat(chunks).toString('utf8'), req)));
    });
    r.on('error', () => resolve({ status: 0, contentType: '', accessControlAllowOrigin: null, body: '' }));
    if (body !== null) r.write(body);
    r.end();
  });
}

// req.hold = {path, contentLength, sent, restMs?, probes:[req], holdMs}: a POST whose body is incomplete occupies a worker thread
// while the probes run in parallel; then the body is completed. Result: one record whose body is [holder, ...probes sorted by status, body].
async function viaHold(base, req, doRequest) {
  const h = req.hold;
  const u = new URL(base);
  const sock = net.connect({ host: u.hostname, port: Number(u.port) });
  await new Promise((r, j) => { sock.once('connect', r); sock.once('error', j); });
  const total = h.contentLength;
  const first = 'x'.repeat(h.sent ?? 1);
  sock.write(`POST ${h.path} HTTP/1.1\r\nHost: ${u.host}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${total}\r\nConnection: close\r\n\r\n${first}`);
  const chunks = [];
  sock.on('data', (d) => chunks.push(d));
  const closed = new Promise((r) => { sock.on('close', r); sock.on('error', r); });
  await sleep(h.holdMs ?? 500);
  const pending = h.probes.map((p) => doRequest(base, p));
  await sleep(h.settleMs ?? 700); // probes are queued behind the held worker
  sock.write('y'.repeat(total - (h.sent ?? 1)));
  const probes = await Promise.all(pending);
  await Promise.race([closed, sleep(20000)]);
  sock.destroy();
  const raw = Buffer.concat(chunks).toString('utf8');
  const m = /^HTTP\/1\.1 (\d+)[^\r\n]*\r\n([\s\S]*?)\r\n\r\n([\s\S]*)$/.exec(raw);
  const holder = m ? { status: Number(m[1]), body: m[3] } : { status: 0, body: '' };
  probes.sort((a, b) => a.status - b.status || JSON.stringify(a.body).localeCompare(JSON.stringify(b.body)));
  return { status: 0, contentType: 'group', accessControlAllowOrigin: null, body: [holder, ...probes] };
}

export function doRequestExtra(base, req, doRequest) {
  return req.hold ? viaHold(base, req, doRequest) : viaLocalAddress(base, req);
}
