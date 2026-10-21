// F73: performance benchmark Java vs JS (CLI, server first/warm request, RSS). Usage: npm run bench [-- --paras N --passes N --out file]
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const LT = join(ROOT, 'oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT');
const JAVA = '/usr/lib/jvm/java-17-openjdk/bin/java';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const NPARA = Number(arg('paras', 20));
const PASSES = Number(arg('passes', 3));
const OUT = arg('out', join(ROOT, 'docs/review/F73-bench.md'));
const LANGS = [['de', 'de-DE'], ['en', 'en-US'], ['fr', 'fr']];
const JAVA_OPTS = ['-Duser.language=en', '-Duser.country=US', '-Dfile.encoding=UTF-8'];
const ENV = { PATH: '/usr/bin:/bin', HOME: tmpdir(), LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'Europe/Vienna' };
const work = mkdtempSync(join(tmpdir(), 'ltbench-'));

const paras = {};
for (const [s] of LANGS) {
  paras[s] = readFileSync(join(ROOT, `oracle/corpus/${s}/corpus.txt`), 'utf8').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40 && p.length < 1500).slice(0, NPARA);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

function cliCmd(impl, lang, file) {
  return impl === 'java'
    ? [JAVA, [...JAVA_OPTS, '-jar', join(LT, 'languagetool-commandline.jar'), '-l', lang, file]]
    : ['node', [join(ROOT, 'bin/lt-cli.mjs'), '-l', lang, file]];
}
function benchCli(impl, s, lang) {
  const file = join(work, `${s}.txt`);
  writeFileSync(file, paras[s].slice(0, 3).join('\n\n'));
  const times = [];
  for (let i = 0; i < 3; i++) {
    const [c, a] = cliCmd(impl, lang, file);
    const t = performance.now();
    const r = spawnSync(c, a, { env: ENV, cwd: LT, encoding: 'utf8', maxBuffer: 1 << 28 });
    times.push(performance.now() - t);
    if (r.status !== 0 && r.status !== 1) throw new Error(`cli ${impl} ${lang} exit ${r.status}: ${r.stderr}`);
  }
  return { median: med(times), runs: times.map(Math.round) };
}
function rssMb(pid) {
  const t = readFileSync(`/proc/${pid}/status`, 'utf8');
  const g = (k) => Number(new RegExp(`${k}:\\s+(\\d+)`).exec(t)[1]) / 1024;
  return { rss: Math.round(g('VmRSS')), hwm: Math.round(g('VmHWM')) };
}
async function post(port, lang, text) {
  const t = performance.now();
  const res = await fetch(`http://127.0.0.1:${port}/v2/check`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ language: lang, text }) });
  const body = await res.text();
  if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  return performance.now() - t;
}
async function benchServer(impl, port) {
  const t0 = performance.now();
  const [c, a] = impl === 'java'
    ? [JAVA, [...JAVA_OPTS, '-cp', 'languagetool-server.jar', 'org.languagetool.server.HTTPServer', '--port', String(port)]]
    : ['node', [join(ROOT, 'bin/lt-server.mjs'), '--port', String(port)]];
  const p = spawn(c, a, { env: ENV, cwd: LT, stdio: 'ignore' });
  try {
    for (let i = 0; ; i++) {
      try { const r = await fetch(`http://127.0.0.1:${port}/v2/languages`); if (r.ok) break; } catch { /* retry */ }
      if (i > 600) throw new Error('server start timeout');
      await sleep(100);
    }
    const res = { startup: performance.now() - t0, langs: {} };
    await sleep(1000);
    res.rssIdle = rssMb(p.pid);
    for (const [s, lang] of LANGS) {
      const L = { first: await post(port, lang, paras[s][0]) };
      for (const x of paras[s]) await post(port, lang, x); // warm-up pass
      const lat = []; let chars = 0; const t = performance.now();
      for (let i = 0; i < PASSES; i++) for (const x of paras[s]) { lat.push(await post(port, lang, x + ' '.repeat(i))); chars += x.length + i; }
      L.charsPerSec = chars / ((performance.now() - t) / 1000);
      L.p50 = med(lat); L.p95 = pct(lat, 0.95); L.n = lat.length;
      res.langs[s] = L;
    }
    res.rssWarm = rssMb(p.pid);
    return res;
  } finally { p.kill('SIGTERM'); await sleep(1500); }
}

const R = { date: new Date().toISOString(), cli: {}, server: {} };
for (const impl of ['java', 'js']) {
  R.cli[impl] = {};
  for (const [s, lang] of LANGS) { R.cli[impl][s] = benchCli(impl, s, lang); console.log('cli', impl, s, Math.round(R.cli[impl][s].median)); }
}
let port = 19000;
for (const impl of ['java', 'js']) { R.server[impl] = await benchServer(impl, port++); console.log('server', impl, JSON.stringify(R.server[impl])); }

const f = (x) => Math.round(x);
const ratio = (j, s) => (j / s).toFixed(2);
let md = `# F73 benchmark Java vs JS\n\nGenerated ${R.date} by \`npm run bench\` (oracle/bench/bench.mjs). Same machine, JDK 17 default heap, D-018 env, no fake clock. Inputs: first ${NPARA} paragraphs (40..1500 chars) of oracle/corpus/<lang>; ${PASSES} measured passes after 1 warm-up pass, sequential single client. Ratio = JS speed relative to Java (>1 = JS faster).\n\n`;
md += `## (a) CLI single check (3 paragraphs, wall ms, median of 3)\n\n| lang | Java | JS | JS speed vs Java |\n|---|---|---|---|\n`;
for (const [s] of LANGS) md += `| ${s} | ${f(R.cli.java[s].median)} | ${f(R.cli.js[s].median)} | ${ratio(R.cli.java[s].median, R.cli.js[s].median)}x |\n`;
md += `\n## (b) Server\n\nServer start to /v2/languages: Java ${f(R.server.java.startup)} ms, JS ${f(R.server.js.startup)} ms.\n\n| lang | first req Java | first req JS | warm p50 Java | warm p50 JS | p95 Java | p95 JS | chars/s Java | chars/s JS | JS speed |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const [s] of LANGS) { const j = R.server.java.langs[s], p = R.server.js.langs[s]; md += `| ${s} | ${f(j.first)} | ${f(p.first)} | ${f(j.p50)} | ${f(p.p50)} | ${f(j.p95)} | ${f(p.p95)} | ${f(j.charsPerSec)} | ${f(p.charsPerSec)} | ${ratio(p.charsPerSec, j.charsPerSec)}x |\n`; }
md += `\n## (c) Memory (RSS MB of server process; HWM = peak)\n\n| | Java | JS |\n|---|---|---|\n| idle RSS | ${R.server.java.rssIdle.rss} | ${R.server.js.rssIdle.rss} |\n| after warm-up RSS | ${R.server.java.rssWarm.rss} | ${R.server.js.rssWarm.rss} |\n| peak (HWM) | ${R.server.java.rssWarm.hwm} | ${R.server.js.rssWarm.hwm} |\n`;
md += `\nRaw JSON: \`\`\`${JSON.stringify(R)}\`\`\`\n`;
mkdirSync(join(ROOT, 'docs/review'), { recursive: true });
const MARK = '<!-- notes -->'; // hand-written section below the marker survives regeneration
if (existsSync(OUT) && readFileSync(OUT, 'utf8').includes(MARK)) md += `\n${readFileSync(OUT, 'utf8').slice(readFileSync(OUT, 'utf8').indexOf(MARK))}`;
writeFileSync(OUT, md);
console.log(md);
