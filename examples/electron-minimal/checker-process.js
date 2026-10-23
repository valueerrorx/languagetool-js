// Utility process: loads @valueerror/ltjs-core once, warms it up and answers check/ping requests from the main process.
import { check, listLanguages } from '@valueerror/ltjs-core';

const port = process.parentPort;

port.on('message', async ({ data }) => {
  if (data.type === 'ping') {
    port.postMessage({ type: 'pong' });
    return;
  }
  try {
    port.postMessage({ id: data.id, result: await check(data.text, data.options) });
  } catch (e) {
    port.postMessage({ id: data.id, error: String(e?.message ?? e) });
  }
});

// one dummy check per language (LTJS_WARMUP=de-DE,en-US) so the first real check is fast
for (const language of (process.env.LTJS_WARMUP ?? '').split(',').filter(Boolean)) {
  try {
    await check('Warm up.', { language });
  } catch (e) {
    console.error(`warm-up for ${language} failed:`, e?.message ?? e);
  }
}

port.postMessage({ type: 'ready', languages: [...new Set(listLanguages().map((l) => l.longCode))] });
