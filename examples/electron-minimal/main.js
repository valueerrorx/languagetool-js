// Electron main process: runs LanguageTool in a utilityProcess so the UI thread never blocks (startup and checks take seconds).
import { app, utilityProcess } from 'electron';
import { fileURLToPath } from 'node:url';

const child = utilityProcess.fork(fileURLToPath(new URL('./checker-process.js', import.meta.url)), [], { serviceName: 'ltjs' });
let nextId = 1;
const pending = new Map();

child.on('message', (msg) => {
  if (msg.type === 'ready') {
    console.log('LanguageTool ready, languages:', msg.languages.join(', '));
    run();
    return;
  }
  const done = pending.get(msg.id);
  if (done) {
    pending.delete(msg.id);
    if (msg.error) done.reject(new Error(msg.error));
    else done.resolve(msg.result);
  }
});

// sends a check request to the utility process and resolves with the LanguageTool result object
function check(text, options) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    child.postMessage({ id, text, options });
  });
}

async function run() {
  try {
    const result = await check('Das ist ein Fehlr.', { language: 'de-DE' });
    for (const m of result.matches) console.log(`${m.rule.id} at ${m.offset}: ${m.message}`, m.replacements.slice(0, 3).map((r) => r.value));
  } finally {
    child.kill();
    app.quit();
  }
}

app.whenReady().then(() => {
  console.log('waiting for the utility process (first start loads the language data)...');
});
